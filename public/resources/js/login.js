var socket;
printerr(getUrlParameter('err'));
$.getJSON('../resources/js/setup.json',function(data) {
	establish(data.port);
	refreshLive();
});
var myCookie = document.cookie.replace(/(?:(?:^|.*;\s*)name\s*\=\s*([^;]*).*$)|^.*$/, "$1");
if(myCookie.length>0){
	location.href="/main/";
}

function establish(port) {
	var url = window.location.hostname+":"+port;
	console.log("Connecting to "+url);
	socket = io.connect(url);
	listenEvents(socket);	
}

function createRoom(){
		var name = $('#inputName').val();
		var room = $('#roomID').val();
		var pass = $('#roomPassword').val();
		//$

		if (name.length>0 && room.length > 0) {
			connectRoom(name,room,pass);
	
			return true;
		}
		return false;
	}

function connectRoom(name,room,pass) {
	if (name.length>0 && room.length > 0) {
		document.cookie ="name=" + encodeURIComponent(name)+'; path=/';
		document.cookie = "room="+encodeURIComponent(room)+'; path=/';
		if(pass && pass.length > 0) {
			document.cookie = "roompass="+encodeURIComponent(pass)+'; path=/';
		}
			
		location.href="/main/";
	}
}
function connectFromList(ele) {
	var name = prompt("Desired username");
	if(name!= null) {
		connectRoom(name,ele.id);
	}
	
}
function listenEvents(socket) {
	
	socket.on('updatesessionlist',function(data) {
		$("#sessionlist tbody").empty();
		for(var i=0;i<data.length;i++) {
			var btn = $('<button class="btn btn-sm btn-primary btn-block">Join</button>');
			//id="'+data[i].name]+'">
			btn.attr('id')
			$("#sessionlist > tbody:last").append('<tr><td>'+data[i].name +'</td><td>'+data[i].clientsnr+'</td><td>'+data[i].password+
				'</td><td><button class="btn btn-xs btn-primary btn-block" id="'+data[i].name+'" onclick="connectFromList(this)">Join</button></td></tr>')
		}
	});
}
function refreshLive() {
	socket.emit('refreshsessionlist');
}

function printerr(err) {
	if(err) {
		var msg;
		switch(parseInt(err)) {
			case 0: 
				msg = "You were timed out."; 
				break;
			case 1:
				msg = "You were kicked";
				break;
			case 2:
				msg = "The password you entered did not match with the room's password."
				break;
			case 3: 
				msg = "The room you tried to join is full."
				break;
			case 4:
				msg = "That name is already in use in this room. Try another.";
				break;
			case 5:
				msg = "Room name not allowed";
				break;
			default: 
				msg = "An error occured."
				break;
		}
		$('#errmsg').html('<div class="alert alert-danger">'+msg+'</div>');
	}
}
function getUrlParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
} 
