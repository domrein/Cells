var Cell = function() {
  this.location = {x: Math.random() * world.width, y: Math.random() * world.height};
  this.velocity = {x: 0, y: 0};
  this.heading = Math.random() * 360;
  this.size = 100;
  this.energy = this.size * energyToSizeRatio;

  this.register = [];
  for (var i = 0; i < registerSize; i ++) {
    this.register.push(0);
  }
  this.program = [];
  this.cursor = 0; // the current location in the program
  this.pulseAngle = 0;
};

Cell.prototype.update = function() {
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
        switch (currentCommand[1] % 3) {
          case 0: resource = this.register; break;
          case 1: resource = cells; break;
          case 2: resource = cruds; break;
        }
        this.register[currentCommand[3] % registerSize] = resource[currentCommand[2] % resource.length];
        break;
      case "multiply":
        this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] * this.register[currentCommand[2] % registerSize];
        break;
      case "divide":
        if (this.register[currentCommand[2] % registerSize] !== 0) {
          this.register[currentCommand[3] % registerSize] = Math.round(this.register[currentCommand[1] % registerSize] / this.register[currentCommand[2] % registerSize]);
        }
        break;
      case "mod":
        if (this.register[currentCommand[2] % registerSize] !== 0) {
          this.register[currentCommand[3] % registerSize] = this.register[currentCommand[1] % registerSize] % this.register[currentCommand[2] % registerSize];
        }
        break;
      case "noop":
        break;
      case "swim":
        actionTaken = true;
        this.energy -= this.size / 100;
        this.velocity.x += Math.cos(this.heading * Math.PI / 180) * this.size / 50;
        this.velocity.y += Math.sin(this.heading * Math.PI / 180) * this.size / 50;
        break;
      case "turnLeft":
        actionTaken = true;
        this.energy -= this.size / 100;
        this.heading -= this.size / 100;
        while (this.heading < 0) {
          this.heading += 360;
        }
        break;
      case "turnRight":
        this.energy -= this.size / 100;
        actionTaken = true;
        this.heading += this.size / 100;
        if (this.heading > 360) {
          this.heading %= 360;
        }
        break;
      case "split":
        this.energy -= this.size / 10;
        if (this.size > minimumCellSplitSize) {
          actionTaken = true;
          splitCell(this);
        }
        break;
      case "grow":
        actionTaken = true;
        this.energy -= energyToSizeRatio;
        this.size ++;
        break;
    }
    if (this.cursor >= this.program.length) {
      this.cursor = 0;
    }
  }

  // move and slow down
  this.location.x += this.velocity.x;
  this.location.y += this.velocity.y;
  this.velocity.x *= 0.9;
  this.velocity.y *= 0.9;

  if (this.energy > 0) {
    this.energy -= this.size / 1000;
    this.pulseAngle += 1;
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
