var wordList = require('./words.js');
var io = require('./setup.js').io;
var serv = require('./serv.js');
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
    if (data.roompass) {
        console.log("password: " + data.roompass);
        this.password = data.roompass;
    }

}

function User(socket, data) {
    this.name = data.name;
    this.score = 0;
    var uid= (function() {         //Id for the client to identify scores etc - not sensitive
        var id = 0;
        return function() {return id++};
    })();
    this.id = uid();
    this.usock = socket.id;
    this.correct = false;
}

User.prototype.secureUserObject = function () {
    return {
        'id' : this.id,
        'name': this.name,
        'correct': this.correct,
        'score': this.score
    }
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
    if (this.password) {
        console.log("Has password");
        if (this.password != socket.request.session.roomPassword) {
            io.to(socket.id).emit('disconnect', 2);
            return false;
        }
    } else if (this.nrOfUsers() > MAXCON) {
        console.log("Full room: " + data.room);
        io.to(socket.id).emit('disconnect', 3);
        return false;
    }
    if (!(this.getUserByName(data.name))) {
        socket.join(data.room);
        socket.roomid = data.room;
        this.turnQueue.push(socket.id);
        var user = new User(socket, data);
        this.users[user.usock] = user;
        //Store room in session
        socket.request.session.room = data.room;
        io.to(socket.roomid).emit('updateusers', this.secureUsers());

    } else { //name in use
        io.to(socket.id).emit('disconnect', 4);
        return false;
    }
    return true;
}

Room.prototype.getUser = function (id) {
    return this.users[id] || null;
}

Room.prototype.getUserByName = function (name) {
    for (id in this.users) {
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
    return socket.id === this.currDrawer.usock;
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

Room.prototype.startRound = function (socket) {
//	currWord = "test";
    var wordRound = getRandomWords();

    var thisTurnDrawer = this.turnQueue[this.turn];
    this.currDrawer = this.getUser(thisTurnDrawer);
    var data = {'drawer': thisTurnDrawer, 'time:': ROUNDTIMER, 'words': wordRound};
    console.log(room + ": " + " turn " + turn);
    if (this.currDrawer) {
        this.currDrawer.correct = true; //mark as guessed so that no points are given
        io.to(this.currDrawer.usock).emit('yourturn', data);
        //io.sockets.socket(sid).emit('yourturn',data);
    } else {
        console.log("test turn = 0");
        this.turn = 0;
    }
}

Room.prototype.endRound = function (socket) {
    //console.log(this.hintInterval);
    clearInterval(this.hintInterval);
    this.turn++;
    var turn = this.turn;
    var currWord = this.currWord;
    var usernames = this.turnQueue;
    var users = this.users;
    if (turn >= usernames.length) {
        this.turn = 0;
    }
    var msg = {'uname': "Round ended", 'msg': "The word was: " + currWord};
    io.to(socket.roomid).emit("chat", msg);
    this.currWord = null;
    for (ident in users) {
        console.log(users[ident].name + " score: " + users[ident].score);
        users[ident].correct = false;
    }
    io.to(socket.roomid).emit('endround');
    setTimeout(newRound(socket), 1000);
}

//Called when a user has selected a word, enables guessing.
Room.prototype.startGuess = function (socket, word) {
    this.currWord = word;
    this.nrUsersGuessed = 0;
    var turn = this.turn;
    var usernames = this.turnQueue;
    io.to(socket.roomid).emit('startgame', {
        'drawer': usernames[turn],
        'time': ROUNDTIMER
    });
    giveHint(this.currWord, socket);
    this.roundTimeout = setTimeout(function () {
        endRound(socket);
    }, ROUNDTIMER);
}

Room.prototype.giveHint = function (word, socket) {
    var words = word.split("");
    var wordsGiven = [];
    var times = Math.floor(words.length / 2);
    var spIndex = findSpaces(word);
    console.log(spIndex.toString());
    for (var i = 0; i < spIndex.length; i++) {
        wordsGiven.push(spIndex[i]);
    }
    var data = {'leng': words.length, 'spaceInd': spIndex};
    socket.broadcast.to(socket.roomid).emit('hintlength', data);
    var interval = (ROUNDTIMER) / words.length;
    var count = 0;
    console.log("interval: " + interval + " word length" + words.length + " times: " + times);
//ar hintInterval = this.hintInterval;
    this.hintInterval = setInterval(function () {
        if (count >= times) {
            clearInterval(this.hintInterval);
            return;
        }
        var hint = randomHint(wordsGiven, words);
        console.log("Hint is " + hint.char + " index " + hint.index);
        shareHint(hint.char, hint.index, socket);
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
    var user = this.getUser();
    if (users.correct != true) {
        this.nrUsersGuessed++;

        console.log(msg.uname + " got it right! ");
        socket.emit('chat', msg);
        msg.uname = "Congratulations, you got it right";
        msg.msg = " the word was " + this.currWord;
        socket.emit('chat', msg);
        msg.uname = socket.name + " guessed correctly!"
        msg.msg = "";
        socket.broadcast.to(socket.roomid).emit('chat', msg);
        user.score += 10;
        user.correct = true;
        this.currDrawer.score += 5;

        io.to(socket.roomid).emit('updatescore', user.secureUserObject());
        io.to(socket.roomid).emit('updatescore', this.currDrawer.secureUserObject());
    }
    if (nrUsersGuessed == this.nrOfUsers()) {
        console.log("All guessed, new round");
        allGuessedCorrectly(socket);
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