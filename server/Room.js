var ROUNDTIMER = 60000;
var MAXCON = 20;
var wordList = require('./words.js');
var wordArr = wordList.words;

function Room(data) {
    this.users =  {};
    this.turn = 0;
    this.usernames = [];
    this.currWord = null;
    this.currDrawer = null;
    this.roundTimeout;
    this.hintInterval = -1;
    this.nrUsersGuessed = 0;
    if(data.roompass) {
        console.log("password: "+ data.roompass);
        this.password = data.roompass;
    }
}


Room.prototype.endGame = function(socket) {
    clearTimeout(this.roundTimeout);
    clearInterval(this.hintInterval);
    var room = this;
    room.currDrawer = null;
    room.currWord = null;
    room.nrUsersGuessed = 0;
    room.turn = -1;
    io.to(socket.roomid).emit('endround');
    for(ident in room.users) {
        room.users[ident].correct = false;
        room.users[ident].score = 0;
        io.to(socket.roomid).emit('updatescore',room.users[ident]);
    }

}
Room.prototype.endRound = function(socket) {
    //console.log(this.hintInterval);
    clearInterval(this.hintInterval);
    this.turn++;
    var turn = this.turn;
    var currWord = this.currWord;
    var usernames = this.usernames;
    var users = this.users;
    if(turn >= usernames.length) {
        this.turn=0;
    }
    var msg = {'uname':"Round ended",'msg':"The word was: "+currWord};
    io.to(socket.roomid).emit("chat",msg);
    this.currWord = null;
    for(ident in users) {
        console.log(users[ident].name + " score: "+users[ident].score);
        users[ident].correct = false;
    }
    io.to(socket.roomid).emit('endround');
    setTimeout(newRound(socket),1000);
}

//Called when a user has selected a word, enables guessing.
Room.prototype.startGuess = function(socket,word) {
    this.currWord = word;
    this.nrUsersGuessed = 0;
    var turn = this.turn;
    var usernames = this.usernames;
    io.to(socket.roomid).emit('startgame',{
        'drawer':usernames[turn],
        'time':ROUNDTIMER
    });
    giveHint(this.currWord,socket);
    this.roundTimeout = setTimeout(function() {
        endRound(socket);
    },ROUNDTIMER);
}

Room.prototype.giveHint = function(word,socket) {
    var words = word.split("");
    var wordsGiven = [];
    var times = Math.floor(words.length/2);
    var spIndex = findSpaces(word);
    console.log(spIndex.toString());
    for(var i = 0;i<spIndex.length;i++) {
        wordsGiven.push(spIndex[i]);
    }
    var data = {'leng':words.length,'spaceInd':spIndex};
    socket.broadcast.to(socket.roomid).emit('hintlength',data);
    var interval = (ROUNDTIMER)/words.length;
    var count = 0;
    console.log("interval: " + interval + " word length" + words.length + " times: "+times );
//ar hintInterval = this.hintInterval;
    this.hintInterval = setInterval(function() {
        if(count >= times) {
            clearInterval(this.hintInterval);
            return;
        }
        var hint = randomHint(wordsGiven,words);
        console.log("Hint is " + hint.char + " index " + hint.index);
        shareHint(hint.char,hint.index,socket);
        count++;
    },interval);
}