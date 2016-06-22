//Setup server
var exports = module.exports = {};

var setup = require('./setup.js');
var Room = require('./Room.js');
var wordList = require('./words.js');

var io = setup.io;
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
    data.roompass = socket.request.session.roomPassword || null;
    rooms[room] = new Room(data);
    return true;
}

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

    var clientIp = socket.request.connection.remoteAddress
    console.log("Connected: " + clientIp);

    socket.on('mousemove', function (data) {
        if (rooms[socket.roomid].isDrawer(socket)) {
            socket.broadcast.to(socket.roomid).emit('moving', data);
        }
    });

    socket.on('adduser', function (data) {

        socket.name = data.name;
        socket.uid = data.id;
        //Prevent existing users to add users
        if (socket.request.session.room) {
            io.to(socket.id).emit('disconnect', -1);
        }
        if (!(data.room in rooms)) {
            if (!createRoom(data.room, data, socket)) {
                return;
            }

            console.log("Created room " + data.room);
        }
        var ret = rooms[data.room].addUser(socket, data);
        if(ret) { //addUser was successfull
            console.log(data.name + " connected " + "id: " + data.id + " joined " + data.room);
            updatesessionlist();
        } else {
            console.log("Failed to connect");
        }


    });

    socket.on('clear', function (data) {
        if(rooms[socket.roomid].isDrawer(socket)) {
            socket.broadcast.to(socket.roomid).emit('clear', data);
        }
    });

    socket.on('startgame', function (data) {
        console.log("Leader of " + socket.roomid + " " + rooms[socket.roomid].getLeader().name);
        if (!(socket.id === rooms[socket.roomid].getLeader().usock && rooms[socket.roomid].currWord == null)) return;
        rooms[socket.roomid].turn = 0;
        rooms[socket.roomid].startRound(socket);
    });

    socket.on('chatmessage', function (msg) {
        console.log(msg.uname + " : " + msg.msg + "--- to " + socket.roomid);
        console.log(rooms[socket.roomid].getLeader());
        var currWord = rooms[socket.roomid].currWord;
        if (currWord != null && msg.msg.toLowerCase() == currWord.toLowerCase()) {
            rooms[socket.roomid].
    guessedCorrectly(socket, msg);
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
        io.to(socket.id).emit('updatesessionlist', list);
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
    io.emit('updatesessionlist', list);
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
            var user = cmds[2];
            console.log(room + " " + user + ".")
            if (rooms[room]) {
                if (rooms[room].users[user]) {
                    console.log("kicking user");
                    io.to(rooms[room].users[user].usock).emit('disconnect', 1);
                }
            }
        }
    }
}

function cmdStatus(cmds) {
    for (ident in rooms) {
        console.log("### Room " + ident + " ###");
        console.log(" Turn " + rooms[ident].turn);
        console.log(" currWord: " + rooms[ident].currWord);
        console.log(" currDrawer: " + rooms[ident].currDrawer);
        console.log(" nrUsersGuessed " + rooms[ident].nrUsersGuessed);
        console.log(" Users: (" + rooms[ident].turnQueue.length + ")");
        for (uident in rooms[ident].users) {
            var userOut = rooms[ident].users[uident];
            console.log("  " + uident + ": id " + userOut.id + ", usock " + userOut.usock + ", score " + userOut.score + ", correct " + userOut.correct);
        }
    }
}

exports.tearDownRoom = tearDownRoom;