/* global Rectangle */
/* global world */

"use strict";

var Crud = function() {
  this.rect = new Rectangle(Math.round(Math.random() * world.width), Math.round(Math.random() * world.height), 50, 50);
  this.type = "crud";
  this.alive = true;
};

Crud.prototype.deserialize = function(data) {
  if (typeof data === "string") {
    data = JSON.parse(data);
  }

  this.rect.x = data.x;
  this.rect.y = data.y;
};

Crud.prototype.serialize = function() {
  return JSON.stringify({x: this.rect.x, y: this.rect.y});
};
