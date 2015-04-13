var Cell = function() {
  this.location = {x: Math.random() * world.width, y: Math.random() * world.height};
  this.velocity = {x: 0, y: 0};
  this.heading = Math.random() * 360;
  this.size = 100;
  this.energy = this.size * energyToSizeRatio;
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
};

Cell.prototype.syncProps = function() {
  this.props[0] = Math.round(this.location.x);
  this.props[1] = Math.round(this.location.y);
  this.props[2] = Math.round(this.velocity.x);
  this.props[3] = Math.round(this.velocity.y);
  this.props[4] = Math.round(this.heading);
  this.props[5] = Math.round(this.size);
  this.props[6] = Math.round(this.energy);
  this.props[7] = Math.round(this.color);
};

Cell.prototype.update = function() {
  // move and slow down
  this.location.x += this.velocity.x;
  this.location.y += this.velocity.y;
  this.velocity.x *= 0.9;
  this.velocity.y *= 0.9;

  if (this.energy > 0) {
    this.energy -= Math.pow(this.size, 2) / 1000;
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
      case "jump":
        for (var j = 0; j < this.program.length; j ++) {
          if (this.program[j][0] === "label" && this.program[j][1] === currentCommand[1]) {
            this.cursor = j;
            break;
          }
        }
        break;
      case "jumpIf":
        if (this.register[currentCommand[1] % registerSize]) {
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
        this.register[currentCommand[1] % registerSize] = currentCommand[2];
        break;
      case "copy":
        var resource = null;
        switch (currentCommand[1] % 4) {
          case 0: resource = this.register; break;
          case 1: resource = this.props; break;
          case 2: resource = flatCells; break;
          case 3: resource = flatCruds; break;
        }
        this.register[currentCommand[3] % registerSize] = resource[currentCommand[2] % resource.length];
        break;
      case "+":
        this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] + this.register[currentCommand[2] % registerSize];
        break;
      case "-":
        this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] - this.register[currentCommand[2] % registerSize];
        break;
      case "*":
        this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] * this.register[currentCommand[2] % registerSize];
        break;
      case "/":
        if (this.register[currentCommand[2] % registerSize] !== 0) {
          this.register[currentCommand[3] % registerSize] = Math.round(this.register[currentCommand[1] % registerSize] / this.register[currentCommand[2] % registerSize]);
        }
        break;
      case "%":
        if (this.register[currentCommand[2] % registerSize] !== 0) {
          this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] % this.register[currentCommand[2] % registerSize];
        }
        break;
      case "==":
        if (this.register[currentCommand[1] % registerSize] === this.register[currentCommand[2] % registerSize]) {
          this.register[currentCommand[3] % registerSize] = 1;
        }
        else {
          this.register[currentCommand[3] % registerSize] = 0;
        }
        break;
      case "!=":
        if (this.register[currentCommand[1] % registerSize] !== this.register[currentCommand[2] % registerSize]) {
          this.register[currentCommand[3] % registerSize] = 1;
        }
        else {
          this.register[currentCommand[3] % registerSize] = 0;
        }
        break;
      case ">":
        if (this.register[currentCommand[1] % registerSize] > this.register[currentCommand[2] % registerSize]) {
          this.register[currentCommand[3] % registerSize] = 1;
        }
        else {
          this.register[currentCommand[3] % registerSize] = 0;
        }
        break;
      case "noop":
        break;
      case "swim":
        actionTaken = true;
        this.energy -= Math.pow(this.size, 2) / 10000;
        this.velocity.x += Math.cos(this.heading * Math.PI / 180) * this.size / 50;
        this.velocity.y += Math.sin(this.heading * Math.PI / 180) * this.size / 50;
        break;
      case "turnLeft":
        actionTaken = true;
        this.energy -= Math.pow(this.size, 2) / 10000;
        this.heading -= this.size / 100;
        while (this.heading < 0) {
          this.heading += 360;
        }
        break;
      case "turnRight":
        this.energy -= Math.pow(this.size, 2) / 10000;
        actionTaken = true;
        this.heading += this.size / 100;
        if (this.heading > 360) {
          this.heading %= 360;
        }
        break;
      case "split":
        this.energy -= Math.pow(this.size, 2) / 1000;
        if (this.size > minimumCellSplitSize) {
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
        break;
    }
    if (this.cursor >= this.program.length) {
      this.cursor = 0;
    }
  }
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
