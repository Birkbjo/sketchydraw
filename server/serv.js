//Setup server
var setup = require('./setup.js');
var io = setup.io;
//Get wordlist
var wordList = require('./words.js');
var wordArr = wordList.words;
console.log("Word count: "+wordArr.length);
//Listen to console-input
var stdin = process.openStdin();
stdin.on("data",function(d) {
	consoleInput(d);
});

var ROUNDTIMER = 60000;
var MAXCON = 20;
var rooms = {};
	
function createRoom(room,data,socket) {
	if(room == null) {
		console.log("Room name is null, abort");
		io.to(socket.id).emit('disconnect',5);
		return false;
	}
	rooms[room] = {};
	rooms[room].users = {};
	rooms[room].turn =0;
	rooms[room].usernames = [];
	rooms[room].currWord = null;
	rooms[room].currDrawer;
	rooms[room].roundTimeout;
	rooms[room].hintInterval = -1;
	rooms[room].nrUsersGuessed = 0;
	if(data.roompass != false) {
		console.log("password: "+ data.roompass);
		rooms[room].password = data.roompass;
	}
	return true;
}

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

     var clientIp = socket.request.connection.remoteAddress
    console.log("Connected: " + clientIp);

    socket.on('mousemove', function (data) {
        socket.broadcast.to(socket.roomid).emit('moving',data);
    });
    
  socket.on('adduser',function(data) {
    	socket.name = data.name;
    	socket.uid = data.id;
    	
    	if(!(data.room in rooms)) {
    		if(!createRoom(data.room,data,socket)) {
    			return;
    		};
    		console.log("Created room " + data.room);
    	} else if(rooms[data.room].password) {
    		console.log("Has password");
    		if(rooms[data.room].password != data.roompass) {
    			io.to(socket.id).emit('disconnect',2);
    			return;
    		}
    	} else if(rooms[data.room].usernames > MAXCON) {
    		console.log("Full room: " + data.room);
    		io.to(socket.id).emit('disconnect',3);
    	}
    	if(!(data.name in rooms[data.room].users)) {
    		var usernames = rooms[data.room].usernames;
    		var users = rooms[data.room].users;
    		socket.join(data.room);
    		socket.roomid = data.room;
    		usernames.push(data.name);
    		users[data.name] = data;
    		users[data.name].usock = socket.id;
    		users[data.name].score = 0;
    		users[data.name].correct = false;
    		io.to(data.room).emit('updateusers',users);
    	//	io.sockets.emit('updateusers',users);
    	} else {
    		var msg = {'uname':"Fail",'msg':"Name already in use"};
    		io.to(socket.id).emit('disconnect',4);
    	}
    	
    	console.log(data.name + " connected " + "id: " +data.id + " joined " + data.room);
    	
    //	var uconnect = data.name + " conncted!";
    //	socket.broadcast.emit('chat',)
    });

    socket.on('clear',function(data) {
    //	socket.broadcast.emit('clear',data);
    	socket.broadcast.to(socket.roomid).emit('clear',data);
    });

    socket.on('startgame',function(data) {
    	if(!(socket.name == rooms[socket.roomid].usernames[0])) return;
    	rooms[socket.roomid].turn = 0;
    	startRound(socket);
    });

    socket.on('chatmessage',function(msg) {
    	console.log(msg.uname +" : " +msg.msg + "--- to " + socket.roomid);
    	var currWord = rooms[socket.roomid].currWord;
    	if(currWord != null && msg.msg.toLowerCase() == currWord.toLowerCase()) {
    		guessedCorrectly(socket,msg);
    	}
    	else {
    		io.to(socket.roomid).emit('chat',msg);
    		//io.sockets.emit('chat',msg);
    	}
    	
    });

    socket.on('stopgame',function(data){
    	/*	console.log('stopping');
    		clearInterval(hintInterval);
    		clearTimeout(roundTimeout);
    		turn = 0;
    		io.sockets.emit('endround'); */
    		endGame(socket);
    });

    socket.on('disconnect',function() {
    	if(!(socket.roomid)) {
    		//socket.emit('disconnect');
    		return;
    	}
    	var users = rooms[socket.roomid].users;

    	var usernames = rooms[socket.roomid].usernames;
    	var currDrawer = rooms[socket.roomid].currDrawer;
    	var i = usernames.indexOf(socket.name);
    	if(i >=0) {
    		var name = usernames[i];
    		if(users[name].usock === socket.id) { //be sure the user is the same, and not same user joining
    			console.log(socket.name + " disconnected");
    		
    			delete users[name];
    			usernames.splice(i,1);
    			io.to(socket.roomid).emit('updateusers',users);
    		//io.sockets.emit('updateusers',users);
    			io.to(socket.roomid).emit('chat', {
    			'uname':name,
    			'msg':'Has disconnected'
    			});
    /*		io.sockets.emit('chat',{
    			'uname':name,
    			'msg':'Has disconnected'
    		}); */
    			if(name == currDrawer) {
    				allGuessedCorrectly(socket);
    			}
    			if(usernames.length == 0) {
    				endGame(socket);
    				tearDownRoom(socket);
    			}
    		}
    	
    	}
    	
    	
    });

    socket.on('selectedword',function(word) {
    	console.log("Selected word is " + word);
    	if(word == null) {
    		newRound(socket);
    	} else {
    		startGuess(socket,word);
    	}
    	
    });

    socket.on('refreshsessionlist',function() {
    	var list =  [];
    	for(id in rooms) {

    		list.push({
    			'name':id,
    			'clientsnr':rooms[id].usernames.length,
    			'password':(rooms[id].password) ? 'Yes': 'No'
    		});//end push
   		 };
   		 io.to(socket.id).emit('updatesessionlist',list);
	});
});


function updatesessionlist(socket) {
    	var list =  [];
    	for(id in rooms) {

    		list.push({
    			'name':id,
    			'clientsnr':rooms[id].usernames.length,
    			'password':(rooms[id].password) ? 'Yes': 'No'
    		});//end push
   		 };
   		 io.emit('updatesessionlist',list);
}

function tearDownRoom(socket) {
	delete rooms[socket.roomid];
	updatesessionlist();
}

function endGame(socket) {
	clearTimeout(rooms[socket.roomid].roundTimeout);
	clearInterval(rooms[socket.roomid].hintInterval);
	var room = rooms[socket.roomid];
	room.currDrawer = null;
	room.currWord = 0;
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

function findSpaces(word) {
	var spaces = [];
	for(var i=0;i<word.length;i++) {
		if(word[i] === ' ') spaces.push(i);
	}
	return spaces;
}

function randomHint(charGiven,words) {
	var rindex = Math.floor(Math.random()*(words.length));
	while(charGiven.indexOf(rindex) >=0) {
		//randomHint(charGiven,words);
		rindex = Math.floor(Math.random()*(words.length));
	}
	charGiven.push(rindex);
	return {'char':words[rindex],'index':rindex};
}
function shareHint(char,index,socket) {
	var data = {'char':char,'index':index};
	console.log("Giving hint: " + char);
	socket.broadcast.to(socket.roomid).emit('hint',data);
}

/*Gives the next user option to choose word etc*/
function startRound(socket) {
//	currWord = "test";
	var room = socket.roomid;
	var wordRound = getRandomWords();
	var turn = rooms[room].turn;
	var thisTurnDrawer = rooms[room].usernames[turn];
	rooms[room].currDrawer = thisTurnDrawer;
	var data = {'drawer':thisTurnDrawer,'time:':ROUNDTIMER,'words':wordRound};
	console.log(room + ": " + " turn " + turn);
	if(rooms[room].users[thisTurnDrawer]) {
		rooms[room].users[thisTurnDrawer].correct = true;
		var sid = rooms[room].users[thisTurnDrawer].usock;
		io.to(sid).emit('yourturn',data);
		//io.sockets.socket(sid).emit('yourturn',data);
	} else {
		console.log("test turn = 0");
		turn = 0;
	}
  //  console.log(turn);
   	
}
/*Prepare a new round, check if user exists, call startRound() to 
send selectable words to next drawer.*/
function newRound(socket) {

	var users = rooms[socket.roomid].users;
	var usernames = rooms[socket.roomid].usernames;
	var turn = rooms[socket.roomid].turn;
	if(users[usernames[turn]]) {
		var msg = {'uname':"Next round",'msg':usernames[turn] +" is drawing!"};
		io.to(socket.roomid).emit('chat',msg);
		//io.sockets.emit('chat',msg);
		var sock = io.to(users[usernames[turn].usock]);
		//var sock = io.sockets.socket(users[usernames[turn].usock]);
		startRound(socket);
		//startRound(users[usernames[turn].usock]);
	}
}

function getRandomWords() {
	var high = wordArr.length;
	var rindex = Math.floor(Math.random()*(high));
	var rindex2 = Math.floor(Math.random()*(high));
	var rindex3 = Math.floor(Math.random()*(high));
	var arr = [wordArr[rindex],wordArr[rindex2],wordArr[rindex3]];
	return arr;
}

function guessedCorrectly(socket,msg) {
	var users = rooms[socket.roomid].users;
	var nrUsersGuessed = rooms[socket.roomid].nrUsersGuessed;
	var currWord = rooms[socket.roomid].currWord;
	var currDrawer = rooms[socket.roomid].currDrawer;
	var usernames = rooms[socket.roomid].usernames;
	if(users[socket.name].correct != true) {
		nrUsersGuessed++;
		rooms[socket.roomid].nrUsersGuessed = nrUsersGuessed;
		console.log(msg.uname + " got it right! ");
  		socket.emit('chat',msg);
  		msg.uname = "Congratulations, you got it right";
  		msg.msg = " the word was "+currWord;
  		socket.emit('chat',msg);
  		msg.uname = socket.name + " guessed correctly!"
 		msg.msg = "";
  		socket.broadcast.to(socket.roomid).emit('chat',msg);
  	//	var users = rooms[socket.roomid].users;
  		users[socket.name].score += 10;
  		users[socket.name].correct = true;
  		users[currDrawer].score += 5;
  		users[currDrawer].index = usernames.indexOf(currDrawer);
  		users[socket.name].index = usernames.indexOf(socket.name);
  		var user = users[socket.name];
  		var userDraw = users[currDrawer];
  		io.to(socket.roomid).emit('updatescore',user);
  		io.to(socket.roomid).emit('updatescore',userDraw);
	}
	if(nrUsersGuessed == rooms[socket.roomid].usernames.length-1) {
		console.log("All guessed, new round");
		allGuessedCorrectly(socket);
	}
}

function allGuessedCorrectly(socket) {
	clearTimeout(rooms[socket.roomid].roundTimeout);
	endRound(socket);
//	io.sockets.emit('endround');
	//setTimeout(newRound,2000);
}

function consoleInput(d) {
	var input = d.toString().substring(0,d.length-2);
	var cmds = input.split(" ");
	if(cmds[0] === "kick") {
		cmdKickUser(cmds);
	} else if(cmds[0] === "status") {
		cmdStatus(cmds);
	}
}

function cmdKickUser(cmds) {
	if(cmds[1]) {
		var room = cmds[1];
		if(cmds[2]) {
			var user = cmds[2];
			console.log(room + " "+user+".")
			if(rooms[room]) {
				if(rooms[room].users[user]) {
					console.log("kicking user");
					io.to(rooms[room].users[user].usock).emit('disconnect',1);
				}
			}		
		}
	}
}

function cmdStatus(cmds) {
	for(ident in rooms) {
		console.log("### Room " + ident + " ###");
		console.log(" Turn " + rooms[ident].turn);
		console.log(" currWord: " + rooms[ident].currWord);
		console.log(" currDrawer: " + rooms[ident].currDrawer);
		console.log(" nrUsersGuessed " + rooms[ident].nrUsersGuessed);
		console.log(" Users: ("+rooms[ident].usernames.length+")");
		for(uident in rooms[ident].users) {
			var userOut = rooms[ident].users[uident];
				console.log("  "+uident + ": id " + userOut.id + ", usock " + userOut.usock + ", score " + userOut.score+ ", correct " + userOut.correct);
		}
	}
}