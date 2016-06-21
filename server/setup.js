
var express = require('express');

var app = express();

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var server = require('http').Server(app);
var sio = require('socket.io').listen(server);
exports.io = sio;
var util = require('util');


//Port to listen to
var port = require('../public/resources/js/setup.json').port;
var sessionMiddleware = session({
    secret: 'abcd',
    resave: 'false',
    saveUninitialized: 'false'
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(sessionMiddleware);
sio.use(function(socket,next) {
    sessionMiddleware(socket.request,socket.request.res,next);
});

//Load routes
require('./routes.js')(app);
app.use(express.static('../public'));

//Start listening
server.listen(port);
console.log("Listening on port: "+port);



	
	



