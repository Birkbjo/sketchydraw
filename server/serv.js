//Setup server
var exports = module.exports = {};
var setup = require('./setup.js');

var sio = setup.io;
var io = sio.of('/rooms');
exports.io = io;

var Room = require('./Room.js');
var wordList = require('./words.js');


//Get wordlist
var wordArr = wordList.words;
console.log("Word count: " + wordArr.length);

//Listen to console-input
var stdin = process.openStdin();
stdin.on("data", function (d) {
    consoleInput(d);
});
var ROUNDTIMER = 60000;
var MAXCON = 20;
var rooms = {};
exports.rooms = rooms;

function createRoom(room, data, socket) {
    if (room == null) {
        console.log("Room name is null, abort");
        io.to(socket.id).emit('disconnect', 5);
        return false;
    }
    rooms[room] = new Room(data);
    return true;
}

function connectUser(socket) {
    var data = socket.request.session.user;
    socket.user = data;
    //Prevent existing users to add users
    if (typeof data == 'undefined' ||data.joinedRoom) {
        io.to(socket.id).emit('disconnect', -1);
        return;
    }
    if (!(data.wantedRoom in rooms)) {
        if (!createRoom(data.wantedRoom, data, socket)) {
            return;
        }
        console.log("Created room " + data.wantedRoom);
    }
    var user = rooms[data.wantedRoom].addUser(socket, data);
    if (user) { //addUser was successful
        console.log(data.name + " connected - joined " + data.wantedRoom);
        updatesessionlist();
    } else {
        console.log("Failed to connect");
    }
}

// Listen for incoming connections from clients
io.on('connection', function (socket) {

    var clientIp = socket.request.connection.remoteAddress;
    console.log("Connected: " + clientIp);
    connectUser(socket);

    socket.on('mousemove', function (data) {
        if (rooms[socket.roomid].isDrawer(socket)) {
            socket.broadcast.to(socket.roomid).emit('moving', data);
        }
    });

    socket.on('clear', function (data) {
        if (rooms[socket.roomid].isDrawer(socket)) {
            socket.broadcast.to(socket.roomid).emit('clear', data);
        }
    });

    socket.on('startgame', function (data) {
        console.log("Leader of " + socket.roomid + " " + rooms[socket.roomid].getLeader().name);
        if (!(socket.id === rooms[socket.roomid].getLeader().usock && rooms[socket.roomid].currWord == null)) return;
        rooms[socket.roomid].turn = 0;
        rooms[socket.roomid].startRound(socket);
    });

    socket.on('chatmessage', function (msg) { //todo user injection
        msg.uname = socket.user.name;
        console.log(msg.uname + " : " + msg.msg + "--- to " + socket.roomid);
        var currWord = rooms[socket.roomid].currWord;
        var guessed = msg.msg.trim().toLowerCase();
        if (currWord != null && guessed == currWord.toLowerCase()) {
            rooms[socket.roomid].guessedCorrectly(socket, msg);
        }
        else {
            io.to(socket.roomid).emit('chat', msg);
        }

    });

    socket.on('stopgame', function (data) {
        var room = rooms[socket.roomid];
        if (socket.id === room.getLeader().usock) {
            rooms[socket.roomid].endGame(socket);
        }
    });
    socket.on('disconnect', function () {
        if (!(socket.roomid)) {
            //socket.emit('disconnect');
            return;
        }
        rooms[socket.roomid].disconnectUser(socket);


    });

    socket.on('selectedword', function (word) {
        console.log("Selected word is " + word);
        if (word == null) {
            rooms[socket.roomid].prepareRound(socket);
        } else {
            rooms[socket.roomid].startGuess(socket, word);
        }

    });


});

var loginIo = sio.of('/login');
loginIo.on('connection',function(socket) {
    socket.on('refreshsessionlist', function () {
        var list = [];
        for (var id in rooms) {

            list.push({
                'name': id,
                'clientsnr': rooms[id].turnQueue.length,
                'password': (rooms[id].password) ? 'Yes' : 'No'
            });//end push
        }
        ;
        loginIo.to(socket.id).emit('updatesessionlist', list);
    });
});

function updatesessionlist(socket) {
    var list = [];
    for (var id in rooms) {

        list.push({
            'name': id,
            'clientsnr': rooms[id].turnQueue.length,
            'password': (rooms[id].password) ? 'Yes' : 'No'
        });//end push
    }
    ;
    loginIo.emit('updatesessionlist', list);
}

var tearDownRoom = function (socket) {
    delete rooms[socket.roomid];
}


function consoleInput(d) {
    var input = d.toString().substring(0, d.length - 2);
    var cmds = input.split(" ");
    if (cmds[0] === "kick") {
        cmdKickUser(cmds);
    } else if (cmds[0] === "status") {
        cmdStatus(cmds);
    }
}

function cmdKickUser(cmds) {
    if (cmds[1]) {
        var room = cmds[1];
        if (cmds[2]) {
            var userName = cmds[2];
            console.log("kick in " + room + " user " + userName + ".");
            if (rooms[room]) {
                var user = rooms[room].getUserByName(userName);
                if (user) {
                    console.log("kicking user: " + user.name);
                    io.to(user.usock).emit('disconnect', 1);
                }
            }
        }
    }
}

function cmdStatus(cmds) {
    for (var ident in rooms) {
        console.log("### Room " + ident + " ###");
        console.log(" Turn " + rooms[ident].turn);
        console.log(" currWord: " + rooms[ident].currWord);
        console.log(" currDrawer: " + rooms[ident].currDrawer);
        console.log(" nrUsersGuessed " + rooms[ident].nrUsersGuessed);
        console.log(" Users: (" + rooms[ident].turnQueue.length + ")");
        for (var uident in rooms[ident].users) {
            var userOut = rooms[ident].users[uident];
            console.log("  " + userOut.name + ": id " + userOut.id + ", usock " + userOut.usock + ", score " + userOut.score + ", correct " + userOut.correct);
        }
    }
}

exports.tearDownRoom = tearDownRoom;