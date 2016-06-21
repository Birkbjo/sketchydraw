
var express = require('express');

var app = express();

var cookieParser = require('cookie-parser');
var server = require('http').Server(app);
exports.io = require('socket.io').listen(server);
var util = require('util');


//Port to listen to
var port = require('../public/resources/js/setup.json').port;


app.use(cookieParser());
app.use(express.static('../public'));

//Start listening
server.listen(port);
console.log("Listening on port: "+port);

//Load routes
require('./routes.js')(app);
	
	



