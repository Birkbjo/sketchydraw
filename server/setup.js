/* Setup the http-server, and start listen on port*/

var app = require('http').createServer(handler),static = require('node-static');
exports.io = require('socket.io').listen(app);
var util = require('util');
var sys = require("sys");

//Port to listen to
var port = require('./public/resources/js/setup.json').port;

// This will make all the files in the folder "public"
// accessible from the web
var fileServer = new static.Server('./public',{cache:0});

//Start listening
app.listen(port);
console.log("Listening on port: "+port);
// If the URL of the socket server is opened in a browser
function handler (request, response) {
	
    request.addListener('end', function () {
        fileServer.serve(request, response); // this will return the correct file
    }).resume();
}
