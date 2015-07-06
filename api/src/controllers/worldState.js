"use strict";

let _async = require("async");

let _redis = require("../common/redis");

// worlds:worldId:state
module.exports = {
  get(worldId, callback) {
    _redis.hget(`worlds:${worldId}`, "state", function(err, reply) {
      let state = null;
      try {
        state = JSON.parse(reply);
      }
      catch (err) {
      }
      callback(err, {state: state});
    });
  },
  put(worldId, state, token, callback) {
    _async.series([
      function(series) {
        _redis.hget(`worlds:${worldId}`, "token", function(err, reply) {
          console.log("token: " + reply);
          if (reply !== token) {
            err = {code: 400, safeMsg: "Invalid token."};
          }
          series(err);
        });
      },
      function(series) {
        _redis.hset(`worlds:${worldId}`, "state", state, function(err, reply) {
          series(err, reply);
        });
      }
    ], function(err) {
      callback(err);
    });
  },
};
