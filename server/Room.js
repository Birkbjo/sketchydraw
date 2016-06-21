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
    var room = rooms[socket.roomid];
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
function endRound(socket) {
    //console.log(rooms[socket.roomid].hintInterval);
    clearInterval(rooms[socket.roomid].hintInterval);
    rooms[socket.roomid].turn++;
    var turn = rooms[socket.roomid].turn;
    var currWord = rooms[socket.roomid].currWord;
    var usernames = rooms[socket.roomid].usernames;
    var users = rooms[socket.roomid].users;
    if(turn >= usernames.length) {
        rooms[socket.roomid].turn=0;
    }
    var msg = {'uname':"Round ended",'msg':"The word was: "+currWord};
    io.to(socket.roomid).emit("chat",msg);
    rooms[socket.roomid].currWord = null;
    for(ident in users) {
        console.log(users[ident].name + " score: "+users[ident].score);
        users[ident].correct = false;
    }
    io.to(socket.roomid).emit('endround');
    setTimeout(newRound(socket),1000);
}

//Called when a user has selected a word, enables guessing.
function startGuess(socket,word) {
    rooms[socket.roomid].currWord = word;
    rooms[socket.roomid].nrUsersGuessed = 0;
    var turn = rooms[socket.roomid].turn;
    var usernames = rooms[socket.roomid].usernames;
    io.to(socket.roomid).emit('startgame',{
        'drawer':usernames[turn],
        'time':ROUNDTIMER
    });
    giveHint(rooms[socket.roomid].currWord,socket);
    rooms[socket.roomid].roundTimeout = setTimeout(function() {
        endRound(socket);
    },ROUNDTIMER);
}

function giveHint(word,socket) {
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
//ar hintInterval = rooms[socket.roomid].hintInterval;
    rooms[socket.roomid].hintInterval = setInterval(function() {
        if(count >= times) {
            clearInterval(rooms[socket.roomid].hintInterval);
            return;
        }
        var hint = randomHint(wordsGiven,words);
        console.log("Hint is " + hint.char + " index " + hint.index);
        shareHint(hint.char,hint.index,socket);
        count++;
    },interval);
}