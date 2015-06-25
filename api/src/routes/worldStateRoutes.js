"use strict";

exports.routes = [
  {
    method: "GET",
    url: "/v1/worlds/:worldId/state",
    paramMap: {
      worldId: "int(1)",
    },
    handler: require("../controllers/worldState.js").get,
  },
  // curl -i 0.0.0.0:3000/v1/worlds/1/state
  {
    method: "PUT",
    url: "/v1/worlds/:worldId/state",
    paramMap: {
      worldId: "int(1)",
      state: "json",
      token: "string",
    },
    handler: require("../controllers/worldState.js").put,
  },
  // curl -i -X PUT --data '{"state": "{\"cells\": [], \"cruds\": []}"}' 0.0.0.0:3000/v1/worlds/1/state
];
