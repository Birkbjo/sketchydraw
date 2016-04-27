/* Setup the http-server, and start listen on port*/

//var app = require('http').createServer(handler),static = require('node-static');
var express = require('express');
//var login = require('../public/resources/js/login.js');
var app = express();
var serv = require('./serv.js');
var cookieParser = require('cookie-parser');
var server = require('http').Server(app);
exports.io = require('socket.io').listen(server);
var util = require('util');
var path = require("path");

//Port to listen to
var port = require('../public/resources/js/setup.json').port;
// This will make all the files in the folder "public"
// accessible from the web
//var fileServer = new static.Server('../public',{cache:0});

//Start listening
app.use(cookieParser());
app.use(express.static('../public'));

server.listen(port);
console.log("Listening on port: "+port);
// If the URL of the socket server is opened in a browser

app.get("/",function (req,res) {
//	res.send("../");
}); 

app.get("/room/:id",function (req,res) {
	var roomid = req.params.id;
	var rooms = serv.rooms;
	console.log(roomid);
	console.log(rooms);
	if(roomid in rooms) {
		console.log("success");
		//res.sendFile(path.join(__dirname,"../public/main/index.html"));
		res.cookie('room',roomid);
		res.redirect("/main");
	} else {
		console.log("fail");
		res.redirect("/login?err=6");
	}
	
	
}); 


