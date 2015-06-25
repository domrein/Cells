"use strict";

exports.routes = [
  {
    method: "POST",
    url: "/v1/worlds",
    paramMap: {
    },
    handler: require("../controllers/world.js").post,
  },
  // curl -i --data '{}' 0.0.0.0:3000/v1/worlds
];
