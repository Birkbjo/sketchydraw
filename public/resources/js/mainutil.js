//check();
var pickedcolor = 'black';
var pickedsize = 3;
window.onload = function () {
    var username = getCookie('name');
    var room = getCookie('room');
    if (username == false && room) {
        username = promptUsername();
    }
    check();
    //	document.getElementById('rangesize').value = pickedsize;
}

function check(err) {
    //alert(getCookie('name'))
    if (getCookie('name') == false || getCookie('room') == false || getCookie('name') == "") {
        delete_cookie('name');
        delete_cookie('room');
        delete_cookie('roompass');
        if (err) {
            location.href = "/login/?err=" + err;
        } else {
            location.href = "/login/";
        }

    }
    //
}
function promptUsername() {
    var name = prompt("Desired username");
    if (name != null) {
        document.cookie = "name=" + encodeURIComponent(name) + '; path=/';
    }
}
function changename() {
    var name = document.getElementById('username');
    name.innerHTML = 'You are logged in as:' + getCookie('name');
}

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
    else return false;

}

function logout(err) {
    //firefox is closing socket with error message "transport close" before
    //router gets a chance to redirect to login, prevent this by checking for this error
    if (!err) {
        location.href = "/logout/";
    } else if (err != "transport close"){
        location.href = "/logout?err=" + err;
    }

}
function delete_cookie(name) {
   // document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
    console.log(document.cookie);
    return;
}

function changeSize(val) {
    pickedsize = val;
    $('#rangesize').val(val);
    //document.getElementById('rangesize').value = val;
    $('#nrSize').val(val);
}