/**
 * Created by Birk on 28.06.2016.
 */

$(function () {
    //Terminate if canvas is not supported
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }
    drawColorPalette();
    $.getJSON('../resources/js/setup.json', function (data) {
        new Game(window.location.hostname + ":" + data.port + "/rooms");
    });

});
function Game(url) {
    var self = this;
    this.socket = io.connect(url);
    this.user = -1; //current user
    this.drawer = -1; //remote drawer user
    this.timer = -1;

    console.log('canvas init')
    this.canvas = new fabric.Canvas('paper', {
        isDrawingMode: true,
        selection: false
    });
    this.drawHistory = [];
    this.remotePen = new fabric.PencilBrush(this.canvas);


    function init() {
        self.disableDrawing();
        self.initSocketListeners();
        self.initHtmlListeners();
    }

    this.initSocketListeners = function () {
        self.socket.on('connect', function () {
        });

        self.socket.on('connected', this._connected);
        self.socket.on('updateusers', this._updateUsers);
        self.socket.on('updatescore', this._updateUserScore);
        self.socket.on('moving', this._remoteMove);
        self.socket.on('canvas:added',this._remotePathAdded);
        self.socket.on('canvas:undo',this._remoteUndo);
        self.socket.on('canvas:sync', this._remoteSync);
        self.socket.on('startgame', this._startGame);
        self.socket.on('endround', this._endRound);
        self.socket.on('yourturn', this._selectWord);
        self.socket.on('chat', this._chatMessage);
        self.socket.on('clear', this._clearCanvas);
        self.socket.on('hintlength', this._initHint);
        self.socket.on('hint', this._hintGiven);
        self.socket.on('disconnect', this._disconnectUser);
    }


    this.enableDrawing = function () {
        self.canvas.removeListeners(); //be sure that we remove listeners before we add them again.
        self.canvas.isDrawingMode = true;
        self._clearCanvas();
        self.canvas.freeDrawingBrush.color = $("#color_picker").val() || '#000';
        self.canvas.freeDrawingBrush.width = $('#rangesize').val() || 5;
        self.canvas._initEventListeners();
        self.canvas.on('mouse:move', self._onLocalMouseMove);
        self.canvas.on('mouse:down', self._onLocalMouseDown);
    }
    this.disableDrawing = function () {
        self.canvas.isDrawingMode = false;
        self.canvas.removeListeners();
        self.canvas.on('path:created', self._onLocalPathAdded);
    }

    //Fired after user joined a room. Data is the user object
    this._connected = function (data) {
        self.user = data.user;
        self.user.lastEmit = $.now();
        self.drawer = data.drawer;
        console.dir(self.user);
    };

    this._updateUsers = function (users) {
        console.log(users);
        $('#connectedUsers').empty();
        var leader;
        for (var key in users) {
            if (users[key].isLeader) {
                leader = users[key];
            }
            var litem = $('<li class="list-icon" id=' + users[key].id + '>' + users[key].name + '<span>' + users[key].score + '</span>').appendTo('#connectedUsers');
            console.log(litem);
            if (users[key].id == self.drawer.id) {
                litem.toggleClass('icon-draw');
            } else if (users[key.correct]) {
                litem.toggleClass('icon-success');
            }
        }
        if (leader && self.user.id == leader.id && self.timer < 0) {
            $('#btnStart').attr("disabled", false);
        } else {
            $('#btnStart').attr("disabled", true);
        }

    }

    this.setDrawer = function (user) {
        self.drawer = user;
        $('#connectedUsers #' + user.id).addClass('icon-draw');
    };

    this._startGame = function (data) {
        $('#connectedUsers li').removeClass("icon-draw icon-success");
        self.setDrawer(data.drawer);
        self._clearCanvas();
        self.timer = data.time / 1000;
        $('#timeRound').text(self.timer);
        var timerid = setInterval(function () {
            self.timer--;
            if (self.timer < 0) clearInterval(timerid);
            else {
                var t = self.timer.toString();
                $('#timeRound').text(t);
            }
        }, 1000);
    };

    this._endRound = function (data) {
        self.disableDrawing();
        self.timer = -1;
        $('#timeRound').text(0);
        $('hintwords').empty();

        var $overlay = $('#turnoverlay');
        $overlay.hide(400);
        $('#paper').fadeTo("slow", 1);
        $('#words').empty();
    };

    this._selectWord = function (data) {
        $('#paper').fadeTo("slow", 0.2);
        //   $('#paper').css('cursor',"url('http://www.rw-designer.com/cursor-extern.php?id=77946'),auto");
        var words = data.words;
        var $overlay = $('#turnoverlay');
        //$overlay.css('display','block');
        $overlay.show('slow');
        for (var i = 0; i < words.length; i++) {
            $('#words').append($('<li>').html(words[i]));
        }
        var index;
        var wordslist = $('#words li').click(function () {
            index = wordslist.index(this);
            $('#hintwords').text(words[index]);
            self.socket.emit('selectedword', words[index]);
            self.enableDrawing();
            $overlay.hide(400);
            $('#paper').fadeTo("slow", 1);
            $('#words').empty();
        });
    };

    this._updateUserScore = function (data) {
        $('#connectedUsers #' + data.id + ' span').text(data.score);
        if (data.id != self.drawer.id) {
            $('#connectedUsers #' + data.id).addClass('icon-success');
        }
    };

    this._chatMessage = function (data) { //todo sanitize output
        var uname = "<b>" + data.uname + "</b>";
        var msg = data.msg;
        $msgli = $('<li>');
        $msgli.html(uname + ": ");
        $msgli.append($('<span>').text(msg));
        $('#chatbox').append($msgli);//html(uname));
        //     $('chatbox')
        $('#chatbox').animate({
            scrollTop: $('#chatbox').get(0).scrollHeight
        }, 200);
    };

    this._clearCanvas = function (data) {
        self.canvas.clear();
        self.drawHistory.length = 0;
    }

    this._onLocalClearCanvas = function () {
        if (self.drawer.id == self.user.id) {
            self._clearCanvas();
            self.socket.emit('clear');
        }
    };

    this._initHint = function (data) {
        console.log("len " + data.leng + "sp " + data.spaceInd.toString());
        $('#hintwords').empty();
        for (var i = 0; i < data.leng; i++) {
            if (data.spaceInd.indexOf(i) >= 0) {
                $('#hintwords').append("  ");
                data.spaceInd.splice(i, 1);
            } else {
                $('#hintwords').append("_");
            }
        }
    };

    this._hintGiven = function (data) {
        var hints = $('#hintwords').text();
        console.log("replace " + data.index + " with " + data.char);
        hints = hints.replaceAt(data.index, data.char);

        $('#hintwords').text(hints);
    };

    this._disconnectUser = function (err) {
        logout(err);
    };

    this._remoteSync = function (data) {
        //    console.log("MOUSE UP");
        self.drawer.isDrawing = false;
        self.remotePen.onMouseUp();
        // self.canvas.loadFromJSON(data.canvas, self.canvas.renderAll.bind(self.canvas));
    };

    this._remoteMove = function (data) {
        //     console.log("moving remote x:" + data.x + " y:"+ data.y);
        self.remotePen.color = data.color;
        self.remotePen.width = data.size;

        if (data.isDrawing && !self.drawer.isDrawing) {
            console.log("REMOTE MOUSE DOWN");
            self.drawer.isDrawing = true;
            self.remotePen.onMouseDown(data.pointer);
        }
        self.remotePen.onMouseMove(data.pointer);
    };

    this._remotePathAdded = function() {
        console.log("REMOTE MOUSE UP");

        self.remotePen.onMouseUp(); //fire localpathadded
        self.drawer.isDrawing = false;
   //     self._addPathToHistory(e.target);
    }

    this._remoteUndo = function() {
        console.log("REMOTE UNDO");
        self._removePathFromHistory();
    }

    this._onLocalMouseMove = function (e) {
        var pointer = self.canvas.getPointer(e.e);

        if (self.user.isDrawing && ($.now() - self.user.lastEmit > 10)) {
            self.socket.emit('mousemove', {
                'pointer': pointer,
                'isDrawing': self.user.isDrawing,
                'color': self.canvas.freeDrawingBrush.color,
                'size': self.canvas.freeDrawingBrush.width
            });
            self.user.lastEmit = $.now();
        }
    };

    this._onLocalMouseDown = function (e) {
        var pointer = self.canvas.getPointer(e.e);
        self.user.isDrawing = true;
        self.socket.emit('mousemove', {
            'pointer': pointer,
            'isDrawing': self.user.isDrawing,
            'color': self.canvas.freeDrawingBrush.color,
            'size': self.canvas.freeDrawingBrush.width
        });
    };
    this._addPathToHistory = function(path) {
        console.log("adding " + path)
        self.drawHistory.push(path);
    }

    this._removePathFromHistory = function() {
        var his = self.drawHistory;
        console.log(his.length);
        if (his.length <= 0) return;
        var ret = self.canvas.remove(his[his.length-1]);
        console.log(ret + " ret");
        console.log(his.length);
        his.pop();
    };

    this._onLocalPathAdded = function (e) {
        console.log("object added");
        console.log(e);
        self.user.isDrawing = false;
        self._addPathToHistory(e.path);
        if (self.user.id == self.drawer.id) {
            console.log("emit canvas added")
            self.socket.emit('canvas:added');
        }


    };

    this._onLocalUndo = function (e) {
        this._removePathFromHistory();
        self.socket.emit('canvas:undo');
    };


    this.initHtmlListeners = function () {
        $("#color_picker").change(function () {
            self.canvas.freeDrawingBrush.color = $(this).val();
        });
        $('#rangesize').change(function () {
            self.canvas.freeDrawingBrush.width = $(this).val();
        });

        $('form').submit(function () {

            var msg = $('#inputChat').val().trim();
            if (msg === '') return false;
            self.socket.emit('chatmessage', {
                'uname': user.name,
                'msg': msg
            });
            $('#inputChat').val('');
            return false;
        });

        $('#btnStart').on("click", function () {
            $('#btnStop').attr("disabled", false);
            $('#btnStart').attr("disabled", true);
            self.socket.emit('startgame');
        });

        $('#btnStop').on('click', function () {
            $('#btnStop').attr("disabled", true);
            $('#btnStart').attr("disabled", false);
            self.socket.emit('stopgame');
        });

        $('#clearPaper').on('click', function (e) {
            self._onLocalClearCanvas();
            self.socket.emit('clear');
        });
        $('#undoBtn').on('click',function (e) {
           self._onLocalUndo(e);
        });

    };

    init();
}




