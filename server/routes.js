module.exports = routes;
var SESSION_TIME = 24 * 60 * 60 * 1000;
var path = require("path");

var serv = require('./serv.js');
function routes(app) {
    app.get("/", function (req, res) {
        console.log(req.cookies);
        res.redirect("/login");
    });
    app.get("/main", function (req,res) {
        if(!req.session.username) {
            res.redirect("/");
        }
        res.sendFile(path.join(__dirname,"../public/main/index.html"));
    });

    app.get("/login", function(req,res) {
        if(req.session.username) {
            res.redirect("/main");
        }
        res.sendFile(path.join(__dirname,"../public/login/index.html"));
      // req.session.views++;
     //  console.log(req.session);
    });

    app.get("/logout",function(req,res) {
        req.session.destroy(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.clearCookie('name');
                res.clearCookie('room');
                res.redirect("/");
            }
        });
    });

    app.post("/login", function (req, res) {
        //   authenticate()

        console.log(req.body);
        req.session.regenerate(function () {
            req.session.username = req.body.username;
            res.cookie('name', req.body.username, {maxAge: SESSION_TIME, path: '/'});
            res.cookie('room', req.body.room, {maxAge: SESSION_TIME, path: '/'});
            res.redirect('/main');
        });

    });

    app.get("/room/:id", function (req, res) {
        var roomid = req.params.id;
        var rooms = serv.rooms;
        console.log(roomid);
        console.log(rooms);
        if (roomid in rooms) {
            console.log("success");
            //res.sendFile(path.join(__dirname,"../public/main/index.html"));
            res.cookie('room', roomid, {maxAge: SESSION_TIME});
            res.redirect("/main");
        } else {
            console.log("fail");
            res.redirect("/login?err=6");
        }
    });
}
