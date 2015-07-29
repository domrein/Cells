"use strict";

let _async = require("async");

let _redis = require("../common/redis");

module.exports = {
  create(callback) {
    let worldId = -1;
    let token = "";
    _async.series([
      function(series) {
        _redis.incr(`worldCounter`, function(err, reply) {
          worldId = parseInt(reply).toString(36);
          series(err);
        });
      },
      function(series) {
        let chars = "abcdefghijklmnopqrstuvwxyz1234567890";
        while (token.length < 128) {
          token += chars[Math.floor(Math.random() * chars.length)];
        }
        series(null);
      },
      function(series) {
        _redis.hset(`worlds:${worldId}`, "token", token, function(err, reply) {
          series(err);
        });
      },
    ], function(err) {
      callback(err, {id: worldId, token: token});
    });
  },
};
