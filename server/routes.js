module.exports = routes;
var path = require("path");

var serv = require('./serv.js');
function routes(app) {
    app.get("/", function (req, res) {
//	res.send("../");
    });
    app.get("/main", function (req,res) {
        res.sendFile(path.join(__dirname,"../public/main/index.html"));
    });

    app.get("/room/:id", function (req, res) {
        var roomid = req.params.id;
        var rooms = serv.rooms;
        console.log(roomid);
        console.log(rooms);
        if (roomid in rooms) {
            console.log("success");
            //res.sendFile(path.join(__dirname,"../public/main/index.html"));
            res.cookie('room', roomid);
            res.redirect("/main");
        } else {
            console.log("fail");
            res.redirect("/login?err=6");
        }
    });
}
