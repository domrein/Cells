"use strict";

let _async = require("async");

let _redis = require("../common/redis");

// worlds:worldId:state
module.exports = {
  get(worldId, callback) {
    _redis.get(`worlds:${worldId}:state`, function(err, reply) {
      let state = null;
      try {
        state = JSON.parse(reply);
      }
      catch (err) {
      }
      callback(err, state);
    });
  },
  put(worldId, state, token, callback) {
    _async.series([
      function(series) {
        _redis.get(`worlds:${worldId}:token`, function(err, reply) {
          if (reply !== token) {
            err = "Invalid token";
          }
          series(err);
        });
      },
      function(series) {
        _redis.set(`worlds:${worldId}:state`, state, function(err, reply) {
          series(err, reply);
        });
      }
    ], function(err) {
      callback(err);
    });
  },
};
