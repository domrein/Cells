/* global cells */
/* global crudEnergy */
/* global world */
/* global energyToSizeRatio */
/* global energyConsumptionEfficiency */

"use strict";

// var childCount = 0;
// var leafCount = 0;
// run collision checks
var runCollision = function() {
  tree.clean();
  for (var i = 0; i < cells.length; i ++) {
    var cell = cells[i];
    tree.addChild(cell);
  }

  for (i = 0; i < leafs.length; i ++) {
    leafs[i].collideChildren();
  }

}
var leafs = [];
var splitSize = 1000;

// let's make a quad tree, but it isn't rebuilt each frame?
var Rectangle = function(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
};

Rectangle.prototype.collide = function(otherRect) {
  // if it's on the left
  if (otherRect.x + otherRect.width < this.x) {
    return false;
  }
  // if it's on the right
  else if (otherRect.x > this.x + this.width) {
    return false;
  }
  // if it's above
  else if (otherRect.y + otherRect.height < this.y) {
    return false;
  }
  // if it's below
  else if (otherRect.y > this.y + this.height) {
    return false;
  }
  return true;
};

var Branch = function(x, y, width, height) {
  this.rect = new Rectangle(x, y, width, height);
  this.children = [];
  this.isLeaf = false;
  if (width >= splitSize && height >= splitSize) {
    this.children.push(new Branch(x, y, width / 2, height / 2));
    this.children.push(new Branch(x + width / 2, y, width / 2, height / 2));
    this.children.push(new Branch(x, y + height / 2, width / 2, height / 2));
    this.children.push(new Branch(x + width / 2, y + height / 2, width / 2, height / 2));
  }
  else {
    this.isLeaf = true;
    leafs.push(this);
  }
};

Branch.prototype.clean = function() {
  if (this.isLeaf) {
    // this.children = [];
    for (var i = this.children.length - 1; i >= 0; i --) {
      var child = this.children[i];
      if (child.type === "cell") {
        this.children.splice(i, 1);
      }
    }
  }
  else {
    this.children.forEach(function(child) {
      child.clean();
    });
  }
};

Branch.prototype.addChild = function(newChild) {
  if (this.isLeaf) {
    this.children.push(newChild);
  }
  else {
    this.children.forEach(function(child) {
      if (child.rect.collide(newChild.rect)) {
        child.addChild(newChild);
      }
    });
  }
};

Branch.prototype.removeChild = function(childToRemove) {
  if (this.isLeaf) {
    for (var i = this.children.length; i >= 0; i --) {
      if (this.children[i] === childToRemove) {
        this.children.splice(i, 1);
      }
    }
  }
  else {
    this.children.forEach(function(child) {
      child.removeChild(childToRemove);
    });
  }
};

Branch.prototype.collideChildren = function() {
  if (this.isLeaf) {
    for (var i = this.children.length - 1; i >= 0; i --) {
      var child = this.children[i];
      if (!child.alive) {
        continue;
      }
      for (var j = i - 1; j >= 0; j --) {
        var otherChild = this.children[j];
        if (!otherChild.alive) {
          continue;
        }
        if (child.type === "crud" && otherChild.type === "crud") {
          continue;
        }
        if (child.rect.collide(otherChild.rect)) {
          if (child.type === "crud") {
            child.alive = false;
            otherChild.energy += crudEnergy;
          }
          else if (otherChild.type === "crud") {
            otherChild.alive = false;
            child.energy += crudEnergy;
          }
          else {
            if (otherChild.size * 0.5 > child.size) {
              otherChild.energy += child.size * energyToSizeRatio + child.energy * energyConsumptionEfficiency;
              child.alive = false;
            }
            else if (child.size * 0.5 > otherChild.size) {
              child.energy += otherChild.size * energyToSizeRatio + otherChild.energy * energyConsumptionEfficiency;
              otherChild.alive = false;
            }
          }
        }
      }
    }
  }
  else {
    this.children.forEach(function(child) {
      child.collideChildren();
    });
  }
};

var tree = new Branch(0, 0, world.width, world.height);
