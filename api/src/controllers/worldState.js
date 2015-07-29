"use strict";

let _async = require("async");

let _redis = require("../common/redis");

// worlds:worldId:state
module.exports = {
  get(worldId, callback) {
    _redis.hget(`worlds:${worldId}`, "states", function(err, reply) {
      let states = null;
      try {
        states = JSON.parse(reply);
      }
      catch (err) {
      }
      callback(err, {states: states});
    });
  },
  update(worldId, states, version, token, callback) {
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
        _redis.hmset(`worlds:${worldId}`, "states", states, "version", version, function(err, reply) {
          series(err, reply);
        });
      }
    ], function(err) {
      callback(err);
    });
  },
};
