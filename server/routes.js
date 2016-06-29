module.exports = routes;
var SESSION_TIME = 24 * 60 * 60 * 1000;
var path = require("path");

var serv = require('./serv.js');
function routes(app) {

    app.get("/admin", function(req,res) {
        console.log("admin");
        res.sendFile(path.join(__dirname,"../public/login/admin.html"));
    });

    app.get("/", function (req, res) {
        if(!req.session.user) {
            res.redirect("/login");
        }
        res.sendFile(path.join(__dirname,"../public/main/index.html"));
    });

    app.get("/login", function(req,res) {
        if(req.session.username) {
            res.redirect("/");
        }
        res.sendFile(path.join(__dirname,"../public/login/index.html"));
    });

    app.get("/logout",function(req,res) {
        req.session.destroy(function (err) {
            if (err) {
                console.log(err);
            } else {
                if(req.query.err) {
                    res.redirect("/login?err="+req.query.err);
                } else {
                    res.redirect("/login");
                }

            }
        });
    });

    app.post("/login", function (req, res) {
        if(req.body.username.length < 1 || req.body.room.length < 1) {
            res.redirect("/login?err=7");
        }
        req.session.regenerate(function () {
            req.session.user = {
                'name': req.body.username.substring(0,14),
                'roomPassword': req.body.roomPassword,
                'wantedRoom': req.body.room,
                'joinedRoom': null
            };
            res.redirect('/');
        });

    });

    app.get("/:id", function (req, res) {
        var roomid = req.params.id;
        var rooms = serv.rooms;
        console.log(roomid);
        console.log(rooms);
        if (roomid in rooms) {
            console.log("success");
            //res.sendFile(path.join(__dirname,"../public/main/index.html"));
         //   res.cookie('room', roomid, {maxAge: SESSION_TIME});
            res.redirect("/");
        } else {
            console.log("fail");
            res.redirect("/login?err=6");
        }
    });

}
