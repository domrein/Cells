/*
Rules:
can only perform one action per cycle
can perform up to 128 logics per cycle
if collide with crud, it is consumed
if collide with cell less than 2/3 size, it is consumed

---CELL---
Data:
register
  array of 256 integers
  should init to 0
cells
  array of x, y, size of all cells
crud
  array of x, y of all crud

Logic:
jump(labelName:int)
  jumps to first label with name of int, no op otherwise
jumpIf(location:int, labelName:int)
  if value at location is nonzero, execute jump command
  wrap location on register size
label(name:int)
  declares the label with name of int
set(location:int, value:int)
  sets the value at location in register with value
  wrap location on register size
copy(resource:int, location:int, location:int)
  read a resource and store the value in the register at a location
multiply(location:int, location:int, location:int)
  take value at first location and multiply it by value at second location, then store result at third location
divide(location:int, location:int, location:int)
  take value at first location and divide it by value at second location, then store result at third location
  no op if value 2 is 0
mod(location:int, location:int, location:int)
  take value at first location and mod it by value at second location, then store result at third location
noop()
  no op

Actions:
swim
  makes cell swim forward
turn left
  makes cell turn to the left
turn right
  makes cell turn to the right
split
  cell splits in two
  cannot split (no op) if size is less 10
grow
  increases cell size (convert energy to size)
  no op if not enough energy to grow
*/

if (this.importScripts) {
  importScripts("Cell.js", "Crud.js");

  var programOpLimit = 16;
  var registerSize = 256;
  var cyclesPerSecond = 60;
  var crudSpawnRate = 0.0001;
  // var crudSpawnRate = 0;
  var cellSpawnRate = 0.00001;
  // var cellSpawnRate = 0;
  var programMutationRate = 0.01;
  var minimumCellSplitSize = 20;
  var crudEnergy = 500;
  var energyToSizeRatio = 50;

  var world = {width: 1440 * 10, height: 900 * 10};

  var crudSpawnCount = 0;
  var cellSpawnCount = 0;

  setInterval(function() {
    // spawn crud and cells
    crudSpawnCount += crudSpawnRate * world.width / 500 * world.height / 500;
    while (crudSpawnCount > 1) {
      cruds.push(new Crud());
      crudSpawnCount --;
    }
    cellSpawnCount += cellSpawnRate * world.width / 500 * world.height / 500;
    while (cellSpawnCount > 1) {
      cells.push(createCell());
      cellSpawnCount --;
    }

    // block cells from leaving world
    cells.forEach(function(cell) {
      cell.update();
      if (cell.location.x < 0) {
        cell.location.x = 0;
      }
      else if (cell.location.x > world.width) {
        cell.location.x = world.width;
      }
      if (cell.location.y < 0) {
        cell.location.y = 0;
      }
      else if (cell.location.y > world.height) {
        cell.location.y = world.height;
      }
    });

    // run collision checks
    for (var i = cells.length - 1; i >= 0; i --) {
      var cell = cells[i];
      for (var j = cruds.length - 1; j >= 0; j --) {
        var crud = cruds[j];
        if (cell.energy > 0 && Math.sqrt(Math.pow(cell.location.x - crud.location.x, 2) + Math.pow(cell.location.y - crud.location.y, 2)) < cell.size) {
          cell.energy += crudEnergy;
          cruds.splice(j, 1);
        }
      }
      for (j = i - 1; j >= 0; j --) {
        var otherCell = cells[j];
        if (Math.sqrt(Math.pow(cell.location.x - otherCell.location.x, 2) + Math.pow(cell.location.y - otherCell.location.y, 2)) < cell.size + otherCell.size) {
          if (cell.energy > 0 && cell.size * 0.7 > otherCell.size) {
            cell.energy += otherCell.size * energyToSizeRatio + otherCell.energy;
            cells.splice(j, 1);
            i --;
          }
          if (otherCell.energy > 0 && otherCell.size * 0.7 > cell.size) {
            otherCell.energy += cell.size * energyToSizeRatio + cell.energy;
            cells.splice(i, 1);
          }
        }
      }
    }

    // transfer typed array
    // console.log("length: " + cruds.length);
    // console.log("before send: " + Date.now());
    var crudBuffer = new ArrayBuffer(4 + 4 * 2 * cruds.length);
    var crudView = new Int32Array(crudBuffer);
    crudView[0] = 0;
    cruds.forEach(function(crud, index) {
      crudView[index * 2 + 1] = crud.location.x;
      crudView[index * 2 + 1 + 1] = crud.location.y;
    });
    postMessage(crudBuffer, [crudBuffer]);

    var numCellProps = 6;
    var cellBuffer = new ArrayBuffer(4 + 4 * numCellProps * cells.length);
    var cellView = new Int32Array(cellBuffer);
    cellView[0] = 1;
    cells.forEach(function(cell, index) {
      cellView[index * numCellProps + 0 + 1] = Math.round(cell.location.x);
      cellView[index * numCellProps + 1 + 1] = Math.round(cell.location.y);
      cellView[index * numCellProps + 2 + 1] = Math.round(cell.size);
      cellView[index * numCellProps + 3 + 1] = cell.energy > 0 ? parseInt(cell.color, 16) : 0x777777;
      cellView[index * numCellProps + 4 + 1] = Math.round(cell.heading);
      cellView[index * numCellProps + 5 + 1] = Math.round(cell.pulseAngle);
    });
    postMessage(cellBuffer, [cellBuffer]);
  }, 1000 / cyclesPerSecond);

  // limit not included
  var rand = function(limit) {
    return Math.floor(Math.random() * limit);
  };

  var randFlip = function(limit) {
    if (Math.random() > 0.5) {
      return rand(limit);
    }
    else {
      return -rand(limit);
    }
  };

  var mutateValue = function(value, limit, max) {
    var adjustAmount = Math.floor(Math.random() * limit);
    if (Math.random() > 0.5) {
      adjustAmount = -adjustAmount;
    }
    value += adjustAmount;
    while (value < 0) {
      if (max === -1) {
        value = 0;
      }
      else {
        value += max;
      }
    }
    if (max !== -1 && value > max) {
      value = value % max;
    }

    return value;
  };

  var splitCell = function(parent) {
    var childOne = cloneCell(parent);
    var childTwo = cloneCell(parent);
    childOne.size /= 2;
    childTwo.size /= 2;

    childOne.energy /= 2;
    childTwo.energy /= 2;

    childOne.velocity.x /= 2;
    childOne.velocity.y /= 2;
    childTwo.velocity.x = -childOne.velocity.x;
    childTwo.velocity.y = -childOne.velocity.y;

    childOne.heading += randFlip(45);
    childTwo.heading = childTwo.heading + 180 + randFlip(45);

    childOne.mutateProgram();
    childTwo.mutateProgram();

    for (var i = cells.length - 1; i >= 0; i --) {
      if (cells[i] === parent) {
        cells.splice(i, 1);
        break;
      }
    }
    cells.push(childOne);
    cells.push(childTwo);
  };

  var cloneCell = function(cell) {
    var clone = new Cell();
    clone.location.x = cell.location.x;
    clone.location.y = cell.location.y;
    clone.velocity = {x: cell.velocity.x, y: cell.velocity.y};
    clone.heading = cell.heading;
    clone.size = cell.size;
    clone.energy = cell.energy;

    cell.program.forEach(function(command) {
      var cloneCommand = [];
      command.forEach(function(commandEntry) {
        cloneCommand.push(commandEntry);
      });
      clone.program.push(cloneCommand);
    });
    clone.updateColor();

    return clone;
  };

  var createCell = function() {
    var cell =  new Cell();
    var programLength = rand(512);
    // var programLength = 8;
    for (var i = 0; i < programLength; i ++) {
      cell.program.push(generateRandomCommand());
    }
    // cell.register[0] = 1;
    // cell.program.push(["swim"]);
    // cell.program.push(["turnRight"]);
    // cell.program.push(["split"]);
    // cell.program.push(["jump", 0]);
    // cell.program.push(["label", 1]);
    // cell.program.push(["jumpIf", 0, 1]);
    // cell.program.push(["multiply", 0, 1]);
    cell.updateColor();

    return cell;
  };

  var generateRandomCommand = function() {
    switch (rand(14)) {
      case 0:
        return ["jump", rand(16)];
      case 1:
        return ["jumpIf", rand(registerSize), rand(16)];
      case 2:
        return ["label", rand(8)];
      case 3:
        return ["set", rand(registerSize), rand(32)];
      case 4:
        return ["copy", rand(3), rand(32), rand(registerSize)];
      case 5:
        return ["multiply", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 6:
        return ["divide", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 7:
        return ["mod", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 8:
        return ["noop"];
      case 9:
        return ["swim"];
      case 10:
        return ["turnLeft"];
      case 11:
        return ["turnRight"];
      case 12:
        return ["split"];
      case 13:
        return ["grow"];
    }
  };

  var mutateCommand = function(command) {
    var mutationParams = null;
    switch (command[0]) {
      case "jump":
        mutationParams = [1, 8, -1];
        break;
      case "jumpIf":
        mutationParams = [2, 8, registerSize - 1, 8, -1];
        break;
      case "label":
        mutationParams = [1, 8, -1];
        break;
      case "set":
        mutationParams = [2, 32, registerSize - 1, 32, -1];
        break;
      case "copy":
        mutationParams = [3, 2, 2, 8, -1, 32, registerSize - 1];
        break;
      case "multiply":
        mutationParams = [3, 32, registerSize - 1, 32, registerSize - 1, 32, registerSize - 1];
        break;
      case "divide":
        mutationParams = [3, 32, registerSize - 1, 32, registerSize - 1, 32, registerSize - 1];
        break;
      case "mod":
        mutationParams = [3, 32, registerSize - 1, 32, registerSize - 1, 32, registerSize - 1];
        break;
    }

    if (mutationParams) {
      var mutationTarget = rand(mutationParams[0]);
      command[mutationTarget] = mutateValue(command[mutationTarget], mutationParams[mutationTarget * 2 + 1], mutationParams[mutationTarget * 2 + 2]);
    }
  };

  // sim init
  var cells = [];
  var cruds = [];

  for (var i = 0; i < 100; i ++) {
    cells.push(createCell());
  }
  for (i = 0; i < 1000; i ++) {
    cruds.push(new Crud());
  }
}
