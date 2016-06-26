var wordList = require('./words.js');
var serv = require('./serv.js');
var io = serv.io;
var ROUNDTIMER = 60000;
var MAXCON = 20;
var wordArr = wordList.words;

module.exports = Room;

function Room(data) {
    this.users = {};
    this.turn = 0;
    this.turnQueue = []; //stores id's of users
    this.currWord = null;
    this.currDrawer = null;
    this.roundTimeout;
    this.hintInterval = -1;
    this.nrUsersGuessed = 0;
    this.password = null;
    this.clientUid = 0;
    if (data.roompass) {
        console.log("password: " + data.roompass);
        this.password = data.roompass;
    }

}

function User(socket, data,room) {
    this.name = data.name;
    this.score = 0;
    this.id = room.clientUid++; //Id for the client to identify scores etc - not sensitive
    this.usock = socket.id;
    this.correct = false;
    this.room = data.wantedRoom;

}

User.prototype.secureUserObject = function () {
    return {
        'id' : this.id,
        'name': this.name,
        'room': this.room,
        'correct': this.correct,
        'score': this.score
    }
}

User.prototype.send = function(event,data) {
    if(typeof event != 'string') {
        return false;
    }
    io.to(this.usock).emit(event,data);
}

//Used to strip out sensitive user info before sending.
Room.prototype.secureUsers = function () {
    var payload = {};
    var i = 0;
    for (var key in this.users) {
        payload[i++] = this.users[key].secureUserObject();
    }
    return payload;
}

Room.prototype.addUser = function (socket, data) {
    var user;
    if (this.password) {
        console.log("Has password");
        if (this.password != socket.request.session.user.roomPassword) {
            io.to(socket.id).emit('disconnect', 2);
            return false;
        }
    } else if (this.nrOfUsers() > MAXCON) {
        console.log("Full room: " + data.room);

        io.to(socket.id).emit('disconnect', 3);
        return false;
    }
    if (!(this.getUserByName(data.name))) {
        socket.join(data.wantedRoom);
        socket.roomid = data.wantedRoom;
        this.turnQueue.push(socket.id);
        user = new User(socket, data,this);
        console.log(user.id);
        this.users[user.usock] = user;
        //Store room in session
        socket.request.session.joinedRoom = data.wantedRoom;
        user.send('connected',user.secureUserObject());
        io.to(socket.roomid).emit('updateusers', this.secureUsers());

    } else { //name in use
        console.log("disconnect user name in user");
        io.to(socket.id).emit('disconnect', 4);
        return false;
    }
    return user;
}

Room.prototype.getUser = function (id) {
    return this.users[id] || null;
}

Room.prototype.getThisTurnUser = function() {
    return this.users[this.turnQueue[this.turn]];
}

Room.prototype.getUserByName = function (name) {
    for (var id in this.users) {
        if (this.users[id].name === name) {
            return this.users[id];
        }
    }
    return false;
}

Room.prototype.nrOfUsers = function (name) {
    return Object.keys(this.users).length;
}

Room.prototype.getLeader = function () {
    return this.users[this.turnQueue[0]] || null;
}

Room.prototype.getDrawer = function () {
    return this.currDrawer;
}

Room.prototype.isDrawer = function (socket) {
    if(this.currDrawer) {
        return socket.id === this.currDrawer.usock;
    }
    return false;
}


Room.prototype.endGame = function (socket) {
    clearTimeout(this.roundTimeout);
    clearInterval(this.hintInterval);
    this.currDrawer = null;
    this.currWord = null;
    this.nrUsersGuessed = 0;
    this.turn = -1;
    io.to(socket.roomid).emit('endround');
    for (var key in this.users) {
        this.users[key].correct = false;
        this.users[key].score = 0;
        io.to(socket.roomid).emit('updatescore', this.users[key].secureUserObject());
    }

}

Room.prototype.prepareRound = function(socket) {
    var user = this.getThisTurnUser();
    if (user) {
        var msg = {'uname': "Next round", 'msg': user.name + " is drawing!"};
        io.to(socket.roomid).emit('chat', msg);
        //io.sockets.emit('chat',msg);
        var sock = io.to(user.usock);
        this.startRound(socket);
    }
}

Room.prototype.startRound = function (socket) {
//	currWord = "test";
    var wordRound = getRandomWords();

    this.currDrawer = this.getThisTurnUser();
    var data = {'drawer': this.currDrawer.secureUserObject(), 'time:': ROUNDTIMER, 'words': wordRound};
    console.log(socket.roomid + ": " + " turn " + this.turn);
    if (this.currDrawer) {
        this.currDrawer.correct = true; //mark as guessed so that no points are given
        io.to(this.currDrawer.usock).emit('yourturn', data);
    } else {
        console.log("test turn = 0");
        this.turn = 0;
    }
}

Room.prototype.endRound = function(socket) {
    //console.log(this.hintInterval);
    clearInterval(this.hintInterval);
    this.turn = this.turn == this.turnQueue.length -1 ? 0 : this.turn+1;

    var msg = {'uname': "Round ended", 'msg': "The word was: " + this.currWord};
    io.to(socket.roomid).emit("chat", msg);
    this.currWord = null;
    for (var key in this.users) {
        console.log(this.users[key].name + " score: " + this.users[key].score);
        this.users[key].correct = false;
    }
    io.to(socket.roomid).emit('endround');
    setTimeout(this.prepareRound(socket), 1000);
}

//Called when a user has selected a word, enables guessing.
Room.prototype.startGuess = function (socket, word) {
    this.currWord = word;
    this.nrUsersGuessed = 0;
    io.to(socket.roomid).emit('startgame', {
        'drawer': this.getThisTurnUser().secureUserObject(),
        'time': ROUNDTIMER
    });
    this.giveHints(this.currWord, socket);
    var room = this;
    this.roundTimeout = setTimeout(function () {
        room.endRound(socket);
    }, ROUNDTIMER);
}

//Socket is the socket of the currently drawing user.
Room.prototype.giveHints = function (word, socket) {
    var chars = word.split("");
    var len = chars.length;
    var times = Math.floor(chars.length / 2);
    var spIndex = findSpaces(word);
    chars = chars.map(function(val,ind) {
        var obj = {};
        obj.val = val
        obj.orgIndex = ind;
        return obj;
    });

    for (var i = 0; i < spIndex.length; i++) {
        chars.splice(spIndex[i],1);
    }
    var data = {'leng': len, 'spaceInd': spIndex};
    socket.broadcast.to(socket.roomid).emit('hintlength', data);
    var interval = (ROUNDTIMER) / len;
    var count = 0;
    console.log("interval: " + interval + " word length" + len + " times: " + times);
//ar hintInterval = this.hintInterval;
    this.hintInterval = setInterval(function () {
        if (count >= times) {
            clearInterval(this.hintInterval);
            return;
        }
        var hint = (function() {
            var ind = Math.floor(Math.random() * chars.length);
            var char = chars[ind].val;
            var orgInd = chars[ind].orgIndex;
            chars.splice(ind,1);
            return {'char': char, 'index': orgInd};
        })();
        console.log("Hint is " + hint.char + " index " + hint.index);
        socket.broadcast.to(socket.roomid).emit('hint',hint);
        count++;
    }, interval);
}

Room.prototype.disconnectUser = function (socket) {
    var i = this.turnQueue.indexOf(socket.id);
    if (i >= 0) {
        var user = this.getUser(socket.id);
        delete this.users[socket.id];
        this.turnQueue.splice(i, 1);
        io.to(socket.roomid).emit('updateusers', this.secureUsers());
        //io.sockets.emit('updateusers',users);
        io.to(socket.roomid).emit('chat', {
            'uname': user.name,
            'msg': 'Has disconnected'
        });
        if (user == this.currDrawer) {
            this.allGuessedCorrectly(socket);
        }
        if (this.turnQueue.length == 0) {
            this.endGame(socket);
            serv.tearDownRoom(socket);
        }
    }
}


Room.prototype.updateScores = function () {

}

Room.prototype.guessedCorrectly = function(socket, msg) {
    var user = this.getUser(socket.id);
    if (!user.correct) {
        this.nrUsersGuessed++;

        console.log(msg.uname + " got it right! ");
        socket.emit('chat', msg); //Todo own event for guessed
        msg.uname = "Congratulations, you got it right";
        msg.msg = " the word was " + this.currWord;
        socket.emit('chat', msg);
        msg.uname = socket.user.name + " guessed correctly!"
        msg.msg = "";
        socket.broadcast.to(socket.roomid).emit('chat', msg);
        user.score += 10;
        user.correct = true;
        this.currDrawer.score += 5;

        io.to(socket.roomid).emit('updatescore', user.secureUserObject());
        io.to(socket.roomid).emit('updatescore', this.currDrawer.secureUserObject());
    }
    if (this.nrUsersGuessed == this.nrOfUsers()-1) {
        console.log("All guessed, new round");
        this.allGuessedCorrectly(socket);
    }
}

Room.prototype.allGuessedCorrectly = function(socket) {
    clearTimeout(this.roundTimeout);
    this.endRound(socket);
}

function getRandomWords() {
    var high = wordArr.length;
    var rindex = Math.floor(Math.random() * (high));
    var rindex2 = Math.floor(Math.random() * (high));
    var rindex3 = Math.floor(Math.random() * (high));
    var arr = [wordArr[rindex], wordArr[rindex2], wordArr[rindex3]];
    return arr;
}

function findSpaces(word) {
    var spaces = [];
    for (var i = 0; i < word.length; i++) {
        if (word[i] === ' ') spaces.push(i);
    }
    return spaces;
}