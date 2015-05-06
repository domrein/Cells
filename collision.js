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
  // for (i = 0; i < cruds.length; i ++) {
  //   var crud = cruds[i];
  //   tree.addChild(crud);
  // }

  // tree.collideChildren();
  for (i = 0; i < leafs.length; i ++) {
    leafs[i].collideChildren();
  }

  // childCount = 0;
  // tree.countChildren();
  // console.log("child count: " + childCount);
  // leafCount = 0;
  // tree.countLeafs();
  // console.log("leaf count: " + leafCount);
}
var leafs = [];
var splitSize = 2000;

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
        }
      }

      // if (cell.energy > 0) {
      //   for (j = cruds.length - 1; j >= 0; j --) {
      //     var crud = cruds[j];
      //     if (Math.sqrt(Math.pow(cell.rect.x - crud.rect.x, 2) + Math.pow(cell.rect.y - crud.rect.y, 2)) < cell.size / 2) {
      //       cell.energy += crudEnergy;
      //       cruds.splice(j, 1);
      //     }
      //   }
      // }
      // for (j = i - 1; j >= 0; j --) {
      //   var otherCell = cells[j];
      //   if (cell.energy <= 0 && otherCell.energy <= 0) {
      //     continue;
      //   }
      //   if (Math.sqrt(Math.pow(cell.rect.x - otherCell.rect.x, 2) + Math.pow(cell.rect.y - otherCell.rect.y, 2)) < cell.size / 2 + otherCell.size / 2) {
      //     if (cell.energy > 0 && cell.size * 0.7 > otherCell.size) {
      //       cell.energy += otherCell.size * energyToSizeRatio + otherCell.energy * energyConsumptionEfficiency;
      //       cells.splice(j, 1);
      //       i --;
      //     }
      //     if (otherCell.energy > 0 && otherCell.size * 0.7 > cell.size) {
      //       otherCell.energy += cell.size * energyToSizeRatio + cell.energy * energyConsumptionEfficiency;
      //       cells.splice(i, 1);
      //     }
      //   }
      // }
    }
  }
  else {
    this.children.forEach(function(child) {
      child.collideChildren();
    });
  }
};

// Branch.prototype.countChildren = function() {
//   if (this.isLeaf) {
//     childCount += this.children.length;
//   }
//   else {
//     this.children.forEach(function(child) {
//       child.countChildren();
//     });
//   }
// }

// Branch.prototype.countLeafs = function() {
//   if (this.isLeaf) {
//     leafCount++;
//   }
//   else {
//     this.children.forEach(function(child) {
//       child.countLeafs();
//     });
//   }
// }

var tree = new Branch(0, 0, world.width, world.height);
