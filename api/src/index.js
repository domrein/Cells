"use strict";

let _config = require("../config.json");

let _http = require("http");
require("tean").addBaseTypes();

// add routes
let _router = require("./common/router.js");
[
  "world",
  "worldState",
].forEach(function(routeName) {
  require(`./routes/${routeName}Routes.js`).routes.forEach(function(route) {
    _router.addRoute(route);
  });
});

// create server
_http.createServer(function(req, res) {
  if (req.method === "POST" || req.method === "PUT") {
    let rawBody = "";
    req.on("data", function (data) {
      rawBody += data;
      // kill request if size exceeds 10MB
      if (rawBody.length > 10e6) {
        req.connection.destroy();
      }
    });
    req.on("end", function () {
      console.log("-----------------");
      console.log(rawBody);
      console.log("-----------------");
      let body = null;
      try {
        body = JSON.parse(rawBody);
      }
      catch (err) {
      }
      _router.handleRequest(req, res, body);
    });
  }
  else {
    _router.handleRequest(req, res);
  }
}).listen(_config.port);

console.log(`Server running on port ${_config.port}`);
