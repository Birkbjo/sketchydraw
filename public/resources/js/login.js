var socket;
printerr(getUrlParameter('err'));
window.onload = function () { //firefox scoketio bug fix
    $.getJSON('../resources/js/setup.json', function (data) {
        establish(data.port);
        refreshLive();
    });
}

var myCookie = document.cookie.replace(/(?:(?:^|.*;\s*)name\s*\=\s*([^;]*).*$)|^.*$/, "$1");


function establish(port) {
    var url = window.location.hostname + ":" + port + "/login";
    socket = io.connect(url);
    listenEvents(socket);
}

function createRoom() {
    var name = $('#inputName').val();
    var room = $('#roomID').val();
    var pass = $('#roomPassword').val();
    //$

    if (name.length > 0 && room.length > 0) {
        connectRoom(name, room, pass);

        return true;
    }
    return false;
}

function connectRoom(name, room, pass) {
    var form = $('<form action="/login" method="post">' +
        '<input type="hidden" name="username" value="' + name + '" />' +
        '<input type="hidden" name="room" value="' + room + '" />' +
        '</form>');
    $('body').append(form);
    form.submit();

}

function connectFromList(ele) {
    var name = prompt("Desired username");
    if (name != null) {
        connectRoom(name, ele.id);
    }

}
function listenEvents(socket) {

    socket.on('updatesessionlist', function (data) {
        $("#sessionlist tbody").empty();
        for (var i = 0; i < data.length; i++) {
            var btn = $('<button class="btn btn-sm btn-primary btn-block">Join</button>');
            //id="'+data[i].name]+'">
            btn.attr('id')
            $("#sessionlist > tbody:last").append('<tr><td>' + data[i].name + '</td><td>' + data[i].clientsnr + '</td><td>' + data[i].password +
                '</td><td><button class="btn btn-xs btn-primary btn-block" id="' + data[i].name + '" onclick="connectFromList(this)">Join</button></td></tr>')
        }
    });
}
function refreshLive() {
    socket.emit('refreshsessionlist');
}



