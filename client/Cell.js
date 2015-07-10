/* global Crud */
/* global Rectangle */
/* global energyToSizeRatio */
/* global world */
/* global registerSize */
/* global programOpLimit */
/* global flatCells */
/* global flatCruds */
/* global minimumCellSplitSize */
/* global splitCell */
/* global maxCellSize */
/* global programMutationRate */
/* global generateRandomCommand */
/* global mutateCommand */

"use strict";

var Cell = function() {
  this.size = 1000;
  this._energy = this.size * energyToSizeRatio;
  this.rect = new Rectangle(Math.random() * world.width, Math.random() * world.height, this.size, this.size);
  this.velocity = {x: 0, y: 0};
  this.heading = Math.random() * 360;
  this.color = 0;
  this.props = [0, 0, 0, 0, 0, 0, 0, 0];
  this.syncProps();

  this.register = [];
  for (var i = 0; i < registerSize; i ++) {
    this.register.push(0);
  }
  this.program = [];
  this.optimizedProgram = [];
  this.cursor = 0; // the current location in the program
  this.pulseAngle = 0;
  this.type = "cell";
  this.alive = true;
};

Cell.prototype.syncProps = function() {
  this.props[0] = Math.round(this.rect.x);
  this.props[1] = Math.round(this.rect.y);
  this.props[2] = Math.round(this.velocity.x);
  this.props[3] = Math.round(this.velocity.y);
  this.props[4] = Math.round(this.heading);
  this.props[5] = Math.round(this.size);
  this.props[6] = Math.round(this.energy);
  this.props[7] = parseInt(this.color, 16);
};

Object.defineProperty(Cell.prototype, "energy", {
  get: function() {
    return this._energy;
  },
  // TODO: handle excess energy (spawn crud?)
  set: function(value) {
    this._energy = value;
    // force cell to grow if it's over max energy
    while (this._energy > this.size * energyToSizeRatio) {
      this.grow();
      // this._energy = this.size * energyToSizeRatio;
    }
  },
});

Cell.prototype.optimizeProgram = function() {
  this.optimizedProgram = [];
  for (var i = 0; i < this.program.length; i ++) {
    var command = this.program[i];
    var optimizedCommand = [];
    optimizedCommand.push(command[0]);
    switch (command[0]) {
      case "breakPoint": break;
      case "jump":
        var labelLocation = -1;
        for (var j = 0; j < this.program.length; j ++) {
          if (this.program[j][0] === "label" && this.program[j][1] === command[1]) {
            labelLocation = j;
            break;
          }
        }
        optimizedCommand.push(labelLocation);
        break;
      case "jumpIf":
        optimizedCommand.push(Math.abs(command[1]) % registerSize);
        labelLocation = -1;
        for (j = 0; j < this.program.length; j ++) {
          if (this.program[j][0] === "label" && this.program[j][1] === command[2]) {
            labelLocation = j;
            break;
          }
        }
        optimizedCommand.push(labelLocation);
        break;
      case "label": break; // TODO: can we optimize these out? (just jump to the correct location instead of having these)
      case "set":
        optimizedCommand.push(command[1]);
        optimizedCommand.push(Math.abs(command[2]) % registerSize);
        break;
      case "copy":
        // NOTE: we have to look up the resource in the program because flatCruds/Cells are recreated every frame
        optimizedCommand.push(Math.abs(command[1]) % 4);
        optimizedCommand.push(Math.abs(command[2]));
        optimizedCommand.push(Math.abs(command[3]) % registerSize);
        break;
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
      case "==":
      case "!=":
      case ">":
        optimizedCommand.push(Math.abs(command[1]) % registerSize);
        optimizedCommand.push(Math.abs(command[2]) % registerSize);
        optimizedCommand.push(Math.abs(command[3]) % registerSize);
        break;
      case "noop": break;
      case "swim":
        optimizedCommand.push(Math.abs(command[1]) % registerSize);
        break;
      case "split": break;
      case "grow": break;
    }
    this.optimizedProgram.push(optimizedCommand);
  }
};

// TODO: add in unit tests for the language so we know every command is acting as expected (this is especially important because of optimization)
Cell.prototype.update = function() {
  // TODO: figure out a better way to make sure size and width/height are the same
  if (this.rect.width != this.size) {
    this.rect.width = this.size;
  }
  if (this.rect.height != this.size) {
    this.rect.height = this.size;
  }
  // move and slow down
  this.rect.x += this.velocity.x;
  this.rect.y += this.velocity.y;
  this.velocity.x *= 0.95;
  this.velocity.y *= 0.95;

  if (this.energy > 0) {
    this.energy -= Math.pow(this.size, 1.1) / 50;
    this.pulseAngle += this.energy / (this.size * energyToSizeRatio) * 15;
  }
  this.syncProps();

  // run over program until an action occurs or we hit max operations
  var actionTaken = false;
  for (var i = 0; i < programOpLimit && !actionTaken && this.energy > 0; i ++) {
    if (!this.optimizedProgram.length) {
      break;
    }
    var currentCommand = this.optimizedProgram[this.cursor];
    // console.log(currentCommand);
    this.cursor ++;
    switch (currentCommand[0]) {
      case "breakPoint":
        var foo = 1;
        break;
      case "jump":
        if (currentCommand[1] !== -1) {
          this.cursor = currentCommand[1];
        }
        break;
      case "jumpIf":
        if (currentCommand[2] !== -1 && this.register[currentCommand[1]]) {
          this.cursor = currentCommand[2];
        }
        break;
      case "label":
        break;
      case "set":
        this.register[currentCommand[2]] = currentCommand[1];
        break;
      case "copy":
        var resource = null;
        switch (currentCommand[1]) {
          case 0: resource = this.register; break;
          case 1: resource = this.props; break;
          case 2: resource = flatCells; break;
          case 3: resource = flatCruds; break;
        }
        this.register[currentCommand[3]] = Math.round(resource[currentCommand[2] % resource.length]) || 0;
        break;
      case "+":
        this.register[currentCommand[3]] = this.register[currentCommand[1]] + this.register[currentCommand[2]];
        break;
      case "-":
        this.register[currentCommand[3]] = this.register[currentCommand[1]] - this.register[currentCommand[2]];
        break;
      case "*":
        this.register[currentCommand[3]] = this.register[currentCommand[1]] * this.register[currentCommand[2]];
        break;
      case "/":
        if (this.register[currentCommand[2]] !== 0) {
          this.register[currentCommand[3]] = Math.round(this.register[currentCommand[1]] / this.register[currentCommand[2]]);
        }
        break;
      case "%":
        if (this.register[currentCommand[2]] !== 0) {
          this.register[currentCommand[3]] = this.register[currentCommand[1]] % this.register[currentCommand[2]];
        }
        break;
      case "==":
        if (this.register[currentCommand[1]] === this.register[currentCommand[2]]) {
          this.register[currentCommand[3]] = 1;
        }
        else {
          this.register[currentCommand[3]] = 0;
        }
        break;
      case "!=":
        if (this.register[currentCommand[1]] !== this.register[currentCommand[2]]) {
          this.register[currentCommand[3]] = 1;
        }
        else {
          this.register[currentCommand[3]] = 0;
        }
        break;
      case ">":
        if (this.register[currentCommand[1]] > this.register[currentCommand[2]]) {
          this.register[currentCommand[3]] = 1;
        }
        else {
          this.register[currentCommand[3]] = 0;
        }
        break;
      case "noop":
        break;
      case "swim":
        actionTaken = true;
        this.energy -= Math.pow(this.size, 1.5) / 10;
        this.velocity.x += Math.cos((this.register[currentCommand[1]] % 360) * Math.PI / 180) * this.size / 50;
        this.velocity.y += Math.sin((this.register[currentCommand[1]] % 360) * Math.PI / 180) * this.size / 50;
        break;
      case "split":
        if (this.size > minimumCellSplitSize) {
          this.energy -= Math.pow(this.size, 2);
          actionTaken = true;
          splitCell(this);
        }
        break;
      case "grow":
        if (this.size < maxCellSize) {
          // TODO: make growing more expensive as size increases
          if (this.energy > energyToSizeRatio) {
            actionTaken = true;
            this.energy -= energyToSizeRatio;
            this.size ++;
          }
        }
        else {
          // copy of split logic
          if (this.size > minimumCellSplitSize) {
            this.energy -= Math.pow(this.size, 2);
            actionTaken = true;
            splitCell(this);
          }
        }
        break;
    }
    if (this.cursor >= this.program.length) {
      this.cursor = 0;
    }
  }
  // TODO: this makes the cells disappear when they die. Having the corpses is really cool.
  if (this.energy <= 0) {
    this.alive = false;
  }
  this.updateHeading();
};

Cell.prototype.updateHeading = function() {
  this.heading = Math.atan2(this.velocity.y, this.velocity.x) * 180 / Math.PI + 90;
};

Cell.prototype.updateColor = function() {
  var rTotal = 0;
  var gTotal = 0;
  var bTotal = 0;
  this.program.forEach(function(command) {
    rTotal += command[0].length;
    if (command[1]) {
      gTotal += command[1];
    }
    if (command[2]) {
      bTotal += command[2];
    }
  });
  rTotal %= 200;
  gTotal %= 200;
  bTotal %= 200;
  rTotal += 56;
  gTotal += 56;
  bTotal += 56;
  var rTotalHex = rTotal.toString(16);
  while (rTotalHex.length < 2) {
    rTotalHex = "0" + rTotalHex;
  }
  var gTotalHex = gTotal.toString(16);
  while (gTotalHex.length < 2) {
    gTotalHex = "0" + gTotalHex;
  }
  var bTotalHex = bTotal.toString(16);
  while (bTotalHex.length < 2) {
    bTotalHex = "0" + bTotalHex;
  }

  this.color = rTotalHex + gTotalHex + bTotalHex;
};

Cell.prototype.mutateProgram = function() {
  for (var i = 0; i < this.program.length; i ++) {
    if (Math.random() < programMutationRate) {
      if (Math.random() > 0.5) {
        this.program[i] = generateRandomCommand();
      }
      else {
        mutateCommand(this.program[i]);
      }
    }
  }
  this.optimizeProgram();

  this.updateColor();
};

Cell.prototype.deserialize = function(data) {
  if (typeof data === "string") {
    data = JSON.parse(data);
  }

  this.size = data.size;
  this.energy = data.energy;
  this.velocity.x = data.velocity.x;
  this.velocity.y = data.velocity.y;
  this.rect.x = data.location.x;
  this.rect.y = data.location.y;
  this.rect.width = this.size;
  this.rect.height = this.size;
  this.cursor = data.cursor;
  this.program = data.program;
  this.registers = data.registers;

  this.updateColor();
};

Cell.prototype.serialize = function() {
  // size, energy, velocity, cursor, program, registers, location
  return JSON.stringify({
    size: this.size,
    energy: this.energy,
    velocity: {x: this.velocity.x, y:this.velocity.y},
    location: {x: this.rect.x, y:this.rect.y},
    cursor: this.cursor,
    program: this.program,
    registers: this.registers,
  });
};
