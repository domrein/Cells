"use strict";

let _gulp = require("gulp");
let _nodemon = require("gulp-nodemon");

_gulp.task("nodemon", function () {
  _nodemon({script: "src/index.js"});
});

_gulp.task("default", ["nodemon"]);
