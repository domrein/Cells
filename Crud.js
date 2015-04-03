var Crud = function() {
  this.location = {x: Math.random() * world.width, y: Math.random() * world.height};
};

Crud.prototype.render = function() {
  context.fillStyle = "#BBBBBB";
  context.fillRect(this.location.x - 1 - camera.x, this.location.y - 1 - camera.y, 2, 2);
};
