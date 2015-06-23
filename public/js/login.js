establish();
function createRoom(){
		var name=document.getElementById('inputName').value;

		$('#errmsg').html('<div class="alert alert-warning"> <strong>Warning!</strong> Indicates a warning that might need attention.</div>');
		
		if (name.length>0) {
			document.cookie ="name=" + encodeURIComponent(name);
			location.href="index.html";
			return true;
		}else{
			
		}
		return false;
	}
	var socket;
function establish() {
	var url = 'localhost:8881';
	socket = io.connect(url);
	listenEvents(socket);
}
function connectRoom(this) {
	alert(this.id);
}
function listenEvents(socket) {
	
	socket.on('updatesessionlist',function(data) {
		$("#sessionlist tbody").empty();
		for(var i=0;i<data.length;i++) {
			var btn = $('<button class="btn btn-sm btn-primary btn-block">Join</button>');
			//id="'+data[i].name]+'">
			btn.attr('id')
			$("#sessionlist > tbody:last").append('<tr><td>'+data[i].name +'</td><td>'+data[i].clientsnr+'</td><td>'+data[i].password+
				'</td><td><button class="btn btn-xs btn-primary btn-block" id="'+data[i].name+'" onclick="connectRoom(this)">Join</button></td></tr>')
		}
	});
}
function refreshLive() {
	socket.emit('refreshsessionlist');
}