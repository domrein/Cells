"use strict";

var Cell = function() {
  this.size = 100;
  this.energy = this.size * energyToSizeRatio;
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

Cell.prototype.update = function() {
  // move and slow down
  this.rect.x += this.velocity.x;
  this.rect.y += this.velocity.y;
  this.velocity.x *= 0.9;
  this.velocity.y *= 0.9;

  if (this.energy > 0) {
    this.energy -= Math.pow(this.size, 2) / 1000000;
    this.pulseAngle += this.energy / (this.size * energyToSizeRatio) * 8;
  }
  this.syncProps();

  // run over program until an action occurs or we hit max operations
  var actionTaken = false;
  for (var i = 0; i < programOpLimit && !actionTaken && this.energy > 0; i ++) {
    if (!this.program.length) {
      break;
    }
    var currentCommand = this.program[this.cursor];
    // console.log(currentCommand);
    this.cursor ++;
    switch (currentCommand[0]) {
      case "breakPoint":
        var foo = 1;
        break;
      case "jump":
        for (var j = 0; j < this.program.length; j ++) {
          if (this.program[j][0] === "label" && this.program[j][1] === currentCommand[1]) {
            this.cursor = j;
            break;
          }
        }
        break;
      case "jumpIf":
        if (this.register[Math.abs(currentCommand[1]) % registerSize]) {
          for (j = 0; j < this.program.length; j ++) {
            if (this.program[j][0] === "label" && this.program[j][1] === currentCommand[2]) {
              this.cursor = j;
              break;
            }
          }
        }
        break;
      case "label":
        break;
      case "set":
        this.register[Math.abs(currentCommand[1]) % registerSize] = currentCommand[2];
        break;
      case "copy":
        var resource = null;
        switch (Math.abs(currentCommand[1]) % 4) {
          case 0: resource = this.register; break;
          case 1: resource = this.props; break;
          case 2: resource = flatCells; break;
          case 3: resource = flatCruds; break;
        }
        this.register[Math.abs(currentCommand[3]) % registerSize] = Math.round(resource[Math.abs(currentCommand[2]) % resource.length]) || 0;
        break;
      case "+":
        this.register[Math.abs(currentCommand[3]) % registerSize] = this.register[Math.abs(currentCommand[1]) % registerSize] + this.register[Math.abs(currentCommand[2]) % registerSize];
        break;
      case "-":
        this.register[Math.abs(currentCommand[3]) % registerSize] = this.register[Math.abs(currentCommand[1]) % registerSize] - this.register[Math.abs(currentCommand[2]) % registerSize];
        break;
      case "*":
        this.register[Math.abs(currentCommand[3]) % registerSize] = this.register[Math.abs(currentCommand[1]) % registerSize] * this.register[Math.abs(currentCommand[2]) % registerSize];
        break;
      case "/":
        if (this.register[Math.abs(currentCommand[2]) % registerSize] !== 0) {
          this.register[Math.abs(currentCommand[3]) % registerSize] = Math.round(this.register[Math.abs(currentCommand[1]) % registerSize] / this.register[Math.abs(currentCommand[2]) % registerSize]);
        }
        break;
      case "%":
        if (this.register[Math.abs(currentCommand[2]) % registerSize] !== 0) {
          this.register[Math.abs(currentCommand[3]) % registerSize] = this.register[Math.abs(currentCommand[1]) % registerSize] % this.register[Math.abs(currentCommand[2]) % registerSize];
        }
        break;
      case "==":
        if (this.register[Math.abs(currentCommand[1]) % registerSize] === this.register[Math.abs(currentCommand[2]) % registerSize]) {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 1;
        }
        else {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 0;
        }
        break;
      case "!=":
        if (this.register[Math.abs(currentCommand[1]) % registerSize] !== this.register[Math.abs(currentCommand[2]) % registerSize]) {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 1;
        }
        else {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 0;
        }
        break;
      case ">":
        if (this.register[Math.abs(currentCommand[1]) % registerSize] > this.register[Math.abs(currentCommand[2]) % registerSize]) {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 1;
        }
        else {
          this.register[Math.abs(currentCommand[3]) % registerSize] = 0;
        }
        break;
      case "noop":
        break;
      case "swim":
        actionTaken = true;
        this.energy -= Math.pow(this.size, 2) / 1000000;
        this.velocity.x += Math.cos((this.register[Math.abs(currentCommand[1]) % registerSize] % 360) * Math.PI / 180) * this.size / 50;
        this.velocity.y += Math.sin((this.register[Math.abs(currentCommand[1]) % registerSize] % 360) * Math.PI / 180) * this.size / 50;
        break;
      case "split":
        if (this.size > minimumCellSplitSize) {
          this.energy -= Math.pow(this.size, 2) / 10000;
          actionTaken = true;
          splitCell(this);
        }
        break;
      case "grow":
        if (this.size < maxCellSize) {
          actionTaken = true;
          this.energy -= energyToSizeRatio;
          this.size ++;
        }
        else {
          // copy of split logic
          if (this.size > minimumCellSplitSize) {
            this.energy -= Math.pow(this.size, 2) / 10000;
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

  this.updateColor();
};
