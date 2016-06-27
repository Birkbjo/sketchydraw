
var express = require('express');

var app = express();

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var server = require('http').Server(app);

var sio = exports.io = require('socket.io').listen(server);
var util = require('util');

//Port to listen to
var port = require('../public/resources/js/setup.json').port;
var SESSION_SECRET;

try { //try to load a secret from env or from json file in root dir
    SESSION_SECRET = process.env.SESSION_SECRET || require('../secret.json').secret;
} catch(e) { //fallback to a default value
    SESSION_SECRET = 'very_secret_string';
}

var sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: 'false',
    saveUninitialized: 'false',
    cookie: {maxAge: 24 * 60 * 60 * 1000 }
});

//app.use(cookieParser());
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



	
	



