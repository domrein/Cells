"use strict";

let _tean = require("tean");

// add routes
let routes = {GET: {}, PUT: {}, DELETE: {}, POST: {}};
let headers = {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, DELETE, PUT"};
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


    if (req.method === "OPTIONS") {
      res.writeHead(200, headers);
      res.end();
      return;
    }
    if (!routes[req.method]) {
      // unsupported method
      res.writeHead(400, headers);
      res.write(JSON.stringify({success: false, err: "Invalid method."}));
      res.end();
      return;
    }

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

          // console.log(params);

          _tean.object(route.paramMap, params, function(validationPassed, safeData) {
            if (validationPassed) {
              let handlerArgs = Object.keys(route.paramMap).map(function(key) {
                return safeData[key];
              });
              handlerArgs.push(function(err, data) {
                let responseData = {};
                console.log(err);
                let success = true;
                if (err) {
                  res.writeHead(err.code || 500, headers);
                  if (err.safeMsg) {
                    responseData.err = err.safeMsg;
                  }
                  success = false;
                }
                else {
                  res.writeHead(200, headers);
                }
                responseData.success = success;
                if (data) {
                  responseData.data = data;
                }
                res.write(JSON.stringify(responseData));
                res.end();
              });
              route.handler.apply(this, handlerArgs);
            }
            else {
              res.writeHead(400, headers);
              res.write(JSON.stringify({success: false, err: "Invalid parameters."}));
              res.end();
            }
          });
          return;
        }
      }
    }

    // 404 :(
    res.writeHead(404, headers);
    res.end();
  }
};
