/*
$("#btnJoin").on("click",function() {
    var name = $('#username').val();
    if(name.length != 0) {
        $('#overlay').remove();
      connect(name);
    }else {
        var $errP = $("<p>You have to type a name</p>")
        $("#user").append($errP);
      }
    
  }); */
window.onload = function() { //firefox scoketio bug fix

};
$(function() {
    //  $('#overlay').remove();
    setUp();

});

// Get The URL and portof your web server (the port is set in setup.json)
function setUp() {
    $.getJSON('../resources/js/setup.json',function(data) {
        connect(getCookie('name'),getCookie('room'),getCookie('roompass'),window.location.hostname+":"+data.port+"/rooms");
    });
}
var user, drawer = -1;
function connect(name,room,pass,url) {
    var timer = -1;
//$(function(){
    if(!('getContext' in document.createElement('canvas'))){
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }

    var doc = $(document),
        win = $(window),
        canvas = $('#paper'),
        btnClear = $('#clearPaper'),
        ctx = canvas[0].getContext('2d');
    

    // A flag for drawing activity
    var drawing = false;
    var allowed = false;
    var clients = {};
    var cursors = {};

    var socket = io.connect(url);

    socket.on('connect',function() {

    });
    socket.on('connected',function(data) {

        user = data;
        console.dir(user);
    });
    socket.on('updateusers',function(users) { //todo use append only, no need to empty.
        console.log(users);
        $('#connectedUsers').empty();
        var first,count = 0;
        for(ident in users) {
             if(count == 0) {
                first = users[ident].name;
            }  
            var litem = $('<li class="list-icon" id='+users[ident].id+'>'+users[ident].name+'<span>0</span>').appendTo('#connectedUsers');
            console.log(litem);
            if(users[ident].id == drawer.id) {
               litem.toggleClass('icon-draw');
            } else if(users[ident.correct]) {
               litem.toggleClass('icon-success');
            }
            count++;
        }
        if(user.name == first && timer < 0) {
            $('#btnStart').attr("disabled",false);
        } else {
            $('#btnStart').attr("disabled",true);
        }
    });


    socket.on('moving', function (data) {

        if(! (data.id in clients)){
            // a new user has come online. create a cursor for them
            cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
        }

        // Move the mouse pointer
        cursors[data.id].css({
            'left' : data.x,
            'top' : data.y
        });

        // Is the user drawing?
        if(data.drawing && clients[data.id]){

            // Draw a line on the canvas. clients[data.id] holds
            // the previous position of this user's mouse pointer
            drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y,data.pickedcolor,data.pickedsize);
        }

        // Saving the current client state
        clients[data.id] = data;
        clients[data.id].updated = $.now();
    });

    var prev = {};
    $('form').submit(function() {

        var msg = $('#inputChat').val().trim();
        if(msg === '') return false;
        socket.emit('chatmessage',{
            'uname':user.name,
            'msg':msg
        });
        $('#inputChat').val('');
        return false;
    });

    $('#btnStart').on("click",function() {
        $('#btnStop').attr("disabled",false);
        $('#btnStart').attr("disabled",true);
        socket.emit('startgame');
    });

    $('#btnStop').on('click',function() {
        $('#btnStop').attr("disabled",true);
        $('#btnStart').attr("disabled",false);
        socket.emit('stopgame');
    });

    socket.on('startgame',function(turn) {
        
     /*   if(turn.drawer == name) {
            allowed = true;
            clearCanvas();
        }*/
        setDrawer(turn.drawer);
        clearCanvas();
        timer = turn.time/1000;
        $('#timeRound').text(timer);
        var timerid = setInterval(function() {
            timer--;
            if(timer < 0) clearInterval(timerid);
            else {
                var t = timer.toString();
                $('#timeRound').text(t);
            }
        },1000);
    /*    setTimeout(function() {
            allowed = false;
        },turn.time); */
    });

    socket.on('endround',function() {
       endRound();
    });

    socket.on('yourturn',function(data) {
     //   allowed = true;
        selectWord(data);
        
    });
    socket.on('updatescore',function(data) {
        var userindex = data.index+1;
        $('#connectedUsers #'+data.id+' span').text(data.score);
    });
    
    socket.on('chat',function(msg) {
        var uname = "<b>"+msg.uname+"</b>";
        var msg = msg.msg;
        $msgli = $('<li>');
        $msgli.html(uname+": ");
        $msgli.append($('<span>').text(msg));
        $('#chatbox').append($msgli);//html(uname));
   //     $('chatbox')
        $('#chatbox').animate({
    scrollTop: $('#chatbox').get(0).scrollHeight
}, 200);
    });

    $('#clearPaper').on('click',function(e) {
        clearCanvas();
    });

    socket.on('clear',function(data) {
        ctx.clearRect ( 0 , 0 , 700, 700 );
        ctx.beginPath();
    });
    socket.on('hintlength',function(data) {
        console.log("len " + data.leng + "sp "+data.spaceInd.toString());
        $('#hintwords').empty();
        for(var i = 0;i<data.leng;i++) {
            if(data.spaceInd.indexOf(i) >= 0) {
                $('#hintwords').append("  ");
                data.spaceInd.splice(i,1);
            } else {
                $('#hintwords').append("_");
            } 
            //$('#hintwords').text(hints);       
        }
    });

    socket.on('hint',function(data) {
        var hints = $('#hintwords').text();
        console.log("replace " + data.index + " with " + data.char);
        hints = hints.replaceAt(data.index,data.char);
            
        $('#hintwords').text(hints);

    });

    //current user's store from values
    canvas.on('mousedown',function(e){
        e.preventDefault();
        drawing = true;

        prev.x = e.pageX-$('#paper').offset().left;
        prev.y = e.pageY-$('#paper').offset().top;
    });

    canvas.on('touchstart',function(e) {
        e = e.originalEvent;
        drawing = true;
        prev.x = e.changedTouches[0].pageX-$('#paper').offset().left;
        prev.y = e.changedTouches[0].pageY-$('#paper').offset().top;
    });
    
    canvas.bind('mouseup',function(){
        drawing = false;
    });
    canvas.bind('touchend',function() {
     //   alert("end");
        drawing = false;
    });
    socket.on('disconnect',function(err) {
        logout(err);
    });

    var lastEmit = $.now();
    canvas.on('touchmove',function(e) {
        e.preventDefault();
        e = e.originalEvent;
        if(allowed != true) return;

        if($.now() - lastEmit > 1){
            socket.emit('mousemove',{
                'x': e.changedTouches[0].pageX-$('#paper').offset().left,
                'y': e.changedTouches[0].pageY-$('#paper').offset().top,
                'drawing': drawing,
                'id': id,
                'name':name,
                'pickedcolor':'#'+pickedcolor,
                'pickedsize':pickedsize
            });
            lastEmit = $.now();
        }
        
        // Draw a line for the current user's movement, as it is
        // not received in the socket.on('moving') event above
        if(drawing){
            drawLine(prev.x, prev.y,e.changedTouches[0].pageX-$('#paper').offset().left, e.changedTouches[0].pageY-$('#paper').offset().top,'#'+pickedcolor,pickedsize);

            prev.x = e.changedTouches[0].pageX-$('#paper').offset().left;
            prev.y = e.changedTouches[0].pageY-$('#paper').offset().top;
    
        }
    });
    //current users is moving mouse, send info
    canvas.on('mousemove',function(e){
        if(allowed != true) return;
        if($.now() - lastEmit > 10){
            socket.emit('mousemove',{
                'x': e.pageX-$('#paper').offset().left,
                'y': e.pageY-$('#paper').offset().top,
                'drawing': drawing,
                'pickedcolor':'#'+pickedcolor,
                'pickedsize':pickedsize
            });
            lastEmit = $.now();
        }

        // Draw a line for the current user's movement, as it is
        // not received in the socket.on('moving') event above
        if(drawing){
         //   alert(e.pageX + " y: " + e.pageY)
          //   drawLine(prev.x, prev.y, e.pageX, e.pageY,'#'+pickedcolor,pickedsize);
        drawLine(prev.x, prev.y, e.pageX-$('#paper').offset().left, e.pageY-$('#paper').offset().top,'#'+pickedcolor,pickedsize);

            prev.x = e.pageX-$('#paper').offset().left;
            prev.y = e.pageY-$('#paper').offset().top;
        }
    });


    function endRound() {
        allowed = false;
        $('#paper').css('cursor',"auto");
        timer = -1;
        $('#timeRound').text(0);
        $('hintwords').empty();
        $('#connectedUsers li').removeClass("icon-draw","icon-success");
        var $overlay = $('#turnoverlay');
        $overlay.hide(400);
            $('#paper').fadeTo("slow",1);
            $('#words').empty();
    }

    function drawLine(fromx, fromy, tox, toy,picked,pickedsize){
        /*fromy= fromy+0.5;
        toy = toy+0.5
        fromx = fromx+0.5;
        tox = tox+0.5; */
    //    ctx.fillRect(fromx,fromy,pickedsize,pickedsize);
        console.log(fromx + " " +fromy + " " +tox + " " + toy);
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        
        ctx.lineWidth=pickedsize;
        ctx.strokeStyle=picked;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();
   /*     ctx.moveTo(0,0);
        ctx.lineTo(700,700);
        ctx.stroke(); */
    }
    function clearCanvas() {
        if(!allowed) return;
       ctx.clearRect ( 0 , 0 , 700, 700 );
        ctx.beginPath();
        socket.emit('clear');
    }

    function selectWord(data) {
        $('#paper').fadeTo("slow",0.2);
        $('#paper').css('cursor',"url('http://www.rw-designer.com/cursor-extern.php?id=77946'),auto");
        var words = data.words;
        var $overlay = $('#turnoverlay');
        //$overlay.css('display','block');
        $overlay.show('slow');
        for(var i = 0;i<words.length;i++) {
            $('#words').append($('<li>').html(words[i]));
        }
        var index;
        var wordslist = $('#words li').click(function() {
            index = wordslist.index(this);
            $('#hintwords').text(words[index]);
            socket.emit('selectedword',words[index]);
            allowed = true;
          $overlay.hide(400);
            $('#paper').fadeTo("slow",1);
            $('#words').empty();
        });

    }
 
}

function setDrawer(user) {
    drawer = user;
    $('#connectedUsers #'+user.id).toggleClass('icon-draw');

}

function userGuessed(user) { //todo implement user-guessed event

}

String.prototype.replaceAt=function(index, char) {
    return this.substr(0, index) + char + this.substr(index+char.length);
}  