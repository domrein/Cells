"use strict";

exports.routes = [
  {
    method: "POST",
    url: "/v1/worlds",
    paramMap: {
    },
    handler: require("../controllers/world.js").create,
  },
  // curl -i --data '{}' 0.0.0.0:3000/v1/worlds
];
