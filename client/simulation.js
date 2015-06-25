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

// save off coords for crud
// if crud.x <

"use strict";

var world = {width: 25000, height: 25000};

if (this.importScripts) {
  importScripts("Cell.js", "Crud.js", "collision.js");

  var programOpLimit = 32;
  var registerSize = 256;
  var cyclesPerSecond = 60;
  var crudSpawnRate = 0.0001;
  // var crudSpawnRate = 0;
  // var cellSpawnRate = 0.00001;
  var cellSpawnRate = 0.0001;
  // var cellSpawnRate = 0;
  var programMutationRate = 0.01;
  var maxCellSize = 200;
  var minimumCellSplitSize = 20;
  var crudEnergy = 500;
  var energyToSizeRatio = 50;
  var energyConsumptionEfficiency = 0.7; // amount of energy preserved when a cell is consumed

  var crudSpawnCount = 0;
  var cellSpawnCount = 0;

  setInterval(function() {
    // spawn crud and cells
    crudSpawnCount += crudSpawnRate * world.width / 500 * world.height / 500;
    while (crudSpawnCount > 1) {
      createCrud();
      crudSpawnCount --;
    }
    cellSpawnCount += cellSpawnRate * world.width / 500 * world.height / 500;
    while (cellSpawnCount > 1) {
      cells.push(createCell("random"));
      cellSpawnCount --;
    }

    // block cells from leaving world
    cells.forEach(function(cell) {
      cell.update();
      if (cell.rect.x < 0) {
        cell.rect.x = 0;
      }
      else if (cell.rect.x > world.width) {
        cell.rect.x = world.width;
      }
      if (cell.rect.y < 0) {
        cell.rect.y = 0;
      }
      else if (cell.rect.y > world.height) {
        cell.rect.y = world.height;
      }
    });

    runCollision();
    // remove dead entities
    for (var i = cells.length - 1; i >= 0; i --) {
      if (!cells[i].alive) {
        cells.splice(i, 1);
      }
    }
    for (i = cruds.length - 1; i >= 0; i --) {
      var crud = cruds[i];
      if (!crud.alive) {
        cruds.splice(i, 1);
        tree.removeChild(crud);
      }
    }

    syncFlatArrays();

    // transfer typed array
    var crudBuffer = new ArrayBuffer(4 + 4 * 2 * cruds.length);
    var crudView = new Int32Array(crudBuffer);
    crudView[0] = 0;
    cruds.forEach(function(crud, index) {
      crudView[index * 2 + 1] = crud.rect.x;
      crudView[index * 2 + 1 + 1] = crud.rect.y;
    });
    postMessage(crudBuffer, [crudBuffer]);

    var numCellProps = 6;
    var cellBuffer = new ArrayBuffer(4 + 4 * numCellProps * cells.length);
    var cellView = new Int32Array(cellBuffer);
    cellView[0] = 1;
    cells.forEach(function(cell, index) {
      cellView[index * numCellProps + 0 + 1] = Math.round(cell.rect.x);
      cellView[index * numCellProps + 1 + 1] = Math.round(cell.rect.y);
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

  var mutateValue = function(value, variance) {
    var adjustAmount = Math.floor(Math.random() * variance);
    if (Math.random() > 0.5) {
      adjustAmount = -adjustAmount;
    }
    value += adjustAmount;

    return value;
  };

  var createCrud = function() {
    var crud = new Crud();
    cruds.push(crud);
    tree.addChild(crud);
  }

  var splitCell = function(parent) {
    var childOne = cloneCell(parent);
    var childTwo = cloneCell(parent);
    childOne.size /= 2;
    childTwo.size /= 2;

    childOne.energy /= 2;
    childTwo.energy /= 2;

    childOne.velocity.x /= 2;
    childOne.velocity.y /= 2;
    childOne.updateHeading();
    childTwo.velocity.x = -childOne.velocity.x;
    childTwo.velocity.y = -childOne.velocity.y;
    childTwo.updateHeading();

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
    clone.rect.x = cell.rect.x;
    clone.rect.y = cell.rect.y;
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

  var createCell = function(type) {
    var cell =  new Cell();
    if (type === "random") {
      var programLength = rand(512);
      // var programLength = 8;
      for (var i = 0; i < programLength; i ++) {
        cell.program.push(generateRandomCommand());
      }
    }
    else if (type === "vegetable") {
      cell.program = [
        ["noop"],
      ];
    }
    else if (type === "seeker") {
      cell.program = [
        // register 0 is 0
        // init code
        ["label", 6],
        ["set", 0, 0],
        ["set", 1, 90],
        ["set", 2, 180],
        ["set", 3, 270],
        ["set", 4, 100], // split target
        ["set", 5, 5000], // grow target

        ["label", 4], // beginning of main loop

        // copy crud x,y at 0
        ["copy", 3, 0, 10], // copy crud's x into register 10
        ["copy", 3, 1, 11], // copy crud's y in to register 11

        ["copy", 1, 0, 12], // copy cell's x in to register 12
        ["copy", 1, 1, 13], // copy cell's y in to register 13
        ["copy", 1, 4, 14], // copy cell's heading in to register 14

        ["-", 12, 10, 20], // calc x dist
        ["-", 13, 11, 21], // calc y dist
        [">", 20, 0, 22], // x dist is greater than 0
        [">", 21, 0, 23], // y dist is greater than 0

        ["jumpIf", 22, 0], // if crud is to the left
        ["swim", 0], // swim right
        ["jump", 1],

        ["label", 0],
        ["swim", 2], // swim left
        ["label", 1], // end swim left/right

        ["jumpIf", 23, 2], // if crud is up
        ["swim", 1], // swim up
        ["jump", 3],

        ["label", 2],
        ["swim", 3], // swim down
        ["label", 3], // end swim left/right

        // split if large enough
        // ["breakPoint"],
        ["copy", 1, 5, 15],
        [">", 4, 15, 24], // size target is greater than size
        ["jumpIf", 24, 5],
        ["split"],

        ["label", 5],
        // // grow if enough energy
        ["copy", 1, 6, 16],
        [">", 5, 16, 25], // y dist is greater than 0
        ["jumpIf", 25, 4],
        ["grow"],
        ["jump", 4], // go back to top of main loop
      ];
    }
    cell.updateColor();

    return cell;
  };

  var generateRandomCommand = function() {
    switch (rand(21)) {
      case 0:
        return ["jump", rand(16)];
      case 1:
        return ["jumpIf", rand(registerSize), rand(16)];
      case 2:
        return ["label", rand(8)];
      case 3:
        return ["set", rand(registerSize), rand(32)];
      case 4:
        return ["copy", rand(4), rand(32), rand(registerSize)];
      case 5:
        return ["+", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 6:
        return ["-", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 7:
        return ["*", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 8:
        return ["/", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 9:
        return ["%", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 10:
        return ["==", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 11:
        return ["!=", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 12:
        return [">", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 13:
        return ["&", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 14:
        return ["|", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 15:
        return ["^", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 16:
        return ["~", rand(registerSize), rand(registerSize), rand(registerSize)];
      case 17:
        return ["noop"];
      case 18:
        return ["swim", rand(360)];
      case 19:
        return ["split"];
      case 20:
        return ["grow"];
    }
  };

  var mutateCommand = function(command) {
    var mutationParams = null;
    switch (command[0]) {
      case "jump":
        mutationParams = [8];
        break;
      case "jumpIf":
        mutationParams = [8, 8];
        break;
      case "label":
        mutationParams = [8];
        break;
      case "set":
        mutationParams = [32, 32];
        break;
      case "copy":
        mutationParams = [2, 8, 32];
        break;
      case "*":
        mutationParams = [32, 32, 32];
        break;
      case "+":
        mutationParams = [32, 32, 32];
        break;
      case "-":
        mutationParams = [32, 32, 32];
        break;
      case "/":
        mutationParams = [32, 32, 32];
        break;
      case "%":
        mutationParams = [32, 32, 32];
        break;
      case "==":
        mutationParams = [32, 32, 32];
        break;
      case "!=":
        mutationParams = [32, 32, 32];
        break;
      case ">":
        mutationParams = [32, 32, 32];
        break;
      case "&":
        mutationParams = [32, 32, 32];
        break;
      case "|":
        mutationParams = [32, 32, 32];
        break;
      case "^":
        mutationParams = [32, 32, 32];
        break;
      case "~":
        mutationParams = [32, 32, 32];
        break;
      case "swim":
        mutationParams = [32];
        break;
    }

    if (mutationParams) {
      var mutationTarget = rand(mutationParams.length);
      command[mutationTarget + 1] = mutateValue(command[mutationTarget + 1], mutationParams[mutationTarget]);
    }
  };

  var syncFlatArrays = function() {
    flatCruds = [];
    cruds.forEach(function(crud) {
      flatCruds.push(crud.rect.x, crud.rect.y);
    });
    flatCells = [];
    cells.forEach(function(cell) {
      flatCells.push(cell.rect.x, cell.rect.y, cell.size, cell.color);
    });
  };

  var deserialize = function(state) {
    world.width = state.settings.width;
    world.height = state.settings.height;
    programOpLimit = state.settings.programOpLimit;
    registerSize = state.settings.registerSize;
    cyclesPerSecond = state.settings.cyclesPerSecond;
    crudSpawnRate = state.settings.crudSpawnRate;
    cellSpawnRate = state.settings.cellSpawnRate;
    programMutationRate = state.settings.programMutationRate;
    maxCellSize = state.settings.maxCellSize;
    minimumCellSplitSize = state.settings.minimumCellSplitSize;
    crudEnergy = state.settings.crudEnergy;
    energyToSizeRatio = state.settings.energyToSizeRatio;
    energyConsumptionEfficiency = state.settings.energyConsumptionEfficiency;
    crudSpawnCount = state.settings.crudSpawnCount;
    cellSpawnCount = state.settings.cellSpawnCount;
    cells = state.cells.map(function(cellData) {
      var cell = new Cell();
      newCell.deserialize(cellData)
      return cell;
    });
    cruds = [];
  };

  var serialize = function() {
    return JSON.stringify({
      settings: {
        width: world.width,
        height: world.height,
        programOpLimit: programOpLimit,
        registerSize: registerSize,
        cyclesPerSecond: cyclesPerSecond,
        crudSpawnRate: crudSpawnRate,
        cellSpawnRate: cellSpawnRate,
        programMutationRate: programMutationRate,
        maxCellSize: maxCellSize,
        minimumCellSplitSize: minimumCellSplitSize,
        crudEnergy: crudEnergy,
        energyToSizeRatio: energyToSizeRatio,
        energyConsumptionEfficiency: energyConsumptionEfficiency,
        crudSpawnCount: crudSpawnCount,
        cellSpawnCount: cellSpawnCount,
      },
      cells: cells.map(function(cell) {
        return cell.serialize();
      }),
      cruds: cruds.map(function(crud) {
        return crud.serialize();
      }),
    });
  };

  // sim init
  var cells = [];
  var cruds = [];
  var flatCruds = []; // resource for cell programs
  var flatCells = []; // resource for cell programs

  // cells.push(createCell("vegetable"));
  // cells.push(createCell("seeker"));
  var i;
  for (i = 0; i < 100; i ++) {
    cells.push(createCell("random"));
  }
  for (i = 0; i < 2000; i ++) {
    createCrud();
  }
  syncFlatArrays();
}
