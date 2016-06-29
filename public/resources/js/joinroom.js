/**
 * Created by Birk on 29.06.2016.
 */

window.onload = function() { //firefox scoketio bug fix
    printerr(getUrlParameter('err'));
    initHtml();
};

function initHtml() {
    var room = getAfterSlash();
    $('#heading').text("Joining \"" + room +"\"");
    $('#roomID').val(room);
}