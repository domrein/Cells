"use strict";

var Crud = function() {
  this.rect = new Rectangle(Math.random() * world.width, Math.random() * world.height, 50, 50);
  this.type = "crud";
  this.alive = true;
};

Crud.prototype.serialize = function() {
  return JSON.stringify({x: this.rect.x, y: this.rect.y});
};
