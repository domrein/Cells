"use strict";

let _tean = require("tean");

// add routes
let routes = {GET: {}, PUT: {}, DELETE: {}, POST: {}};
module.exports = {
  addRoute(route) {
    let pieces = route.url.split("/");
    pieces.shift();
    let staticPositions = [];
    let variablePositions = [];
    pieces.forEach(function(element, index) {
      if (element[0] !== ":") {
        pieces[index] = pieces[index].toLowerCase();
        staticPositions.push(index);
      }
      else {
        variablePositions.push(index);
      }
    });
    routes[route.method][route.url.toLowerCase()] = {
      handler: route.handler,
      pieces: pieces,
      staticPositions: staticPositions,
      variablePositions: variablePositions,
      paramMap: route.paramMap,
    };
  },
  handleRequest(req, res, params) {
    params = params || {};
    console.log(req.url);
    console.log(req.method);

    let reqRoutePieces = req.url.toLowerCase().split("/");
    reqRoutePieces.shift();
    // loop over routes and find match
    let routeUrls = Object.keys(routes[req.method]);
    for (let i = 0; i < routeUrls.length; i ++) {
      let routeUrl = routeUrls[i];
      let route = routes[req.method][routeUrl];
      if (reqRoutePieces.length === route.pieces.length) {
        let matched = true;
        route.staticPositions.forEach(function(staticPosition) {
          if (reqRoutePieces[staticPosition] !== route.pieces[staticPosition]) {
            matched = false;
          }
        });
        if (matched) {
          route.variablePositions.forEach(function(variablePosition) {
            params[route.pieces[variablePosition].substr(1)] = reqRoutePieces[variablePosition];
          });

          console.log(params);

          _tean.object(route.paramMap, params, function(validationPassed, safeData) {
            if (validationPassed) {
              let handlerArgs = Object.keys(route.paramMap).map(function(key) {
                return safeData[key];
              });
              handlerArgs.push(function(err, data) {
                console.log(err);
                let success = true;
                if (err) {
                  res.writeHead(err.code || 500, {"Content-Type": "text/plain"});
                  success = false;
                }
                else {
                  res.writeHead(200, {"Content-Type": "text/plain"});
                }
                if (data) {
                  res.write(JSON.stringify({success: success, data: data}));
                }
                res.end();
              });
              route.handler.apply(this, handlerArgs);
            }
            else {
              res.writeHead(400, {"Content-Type": "text/plain"});
              res.write(JSON.stringify({success: false, err: "Invalid parameters."}));
              res.end();
            }
          });
          return;
        }
      }
    }

    // 404 :(
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.end();
  }
};
