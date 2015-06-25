"use strict";

let _async = require("async");

let _redis = require("../common/redis");

module.exports = {
  post(callback) {
    let worldId = -1;
    let token = "";
    _async.series([
      function(series) {
        _redis.incr(`worlds:counter`, function(err, reply) {
          worldId = reply;
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
    ], function(err) {
      callback(err, {id: worldId, token: token});
    });
  },
};
