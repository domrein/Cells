"use strict";

var renderCell = function(x, y, size, color, rotation, pulseAngle) {
  x /= camera.zoom;
  y /= camera.zoom;
  size /= camera.zoom;
  // TODO: see if this check is really an optimization
  if (x + size > camera.x || x - size < camera.x + worldWidth / camera.zoom || y + size > camera.y || y - size < camera.y + worldHeight / camera.zoom) {
    size += size / 10 * Math.sin(pulseAngle * Math.PI / 180);
    var hexColor = color.toString(16);
    hexColor = "#" + "000000".substr(0, 6 - hexColor.length) + hexColor;

    // draw box
    // context.fillStyle = hexColor;
    // context.fillRect(x - size / 2 - camera.x, y - size / 2 - camera.y, size, size);

    // draw oval
    context.save();
    context.translate(x - camera.x, y - camera.y);
    context.rotate((rotation + 90) * Math.PI / 180);
    context.beginPath();
    context.moveTo(-size / 2, 0);
    context.bezierCurveTo(-size / 2, size / 3, size / 2, size / 3, size / 2, 0);
    context.bezierCurveTo(size / 2, -size / 3, -size / 2, -size / 3, -size / 2, 0);
    context.lineWidth = 2;
    context.strokeStyle = hexColor;
    context.stroke();
    context.closePath();
    context.restore();
  }
};

var crudBuffer = new ArrayBuffer();
var crudView = new Int32Array();
var cellBuffer = new ArrayBuffer();
var cellView = new Int32Array();
var renderScene = false;

var worldWidth = 25000;
var worldHeight = 25000;
setInterval(function() {
  stats.begin();

  // move camera
  if (controls.up) {
    camera.y -= camera.scrollSpeed;
    if (camera.y < 0) {
      camera.y = 0;
    }
  }
  if (controls.down) {
    camera.y += camera.scrollSpeed;
    // TODO: read world.width from simulation
    if (camera.y + canvas.height > worldHeight / camera.zoom) {
      camera.y = worldHeight / camera.zoom - canvas.height;
    }
  }
  if (controls.right) {
    camera.x += camera.scrollSpeed;
    // TODO: read world.width from simulation
    if (camera.x + canvas.width > worldWidth / camera.zoom) {
      camera.x = worldWidth / camera.zoom - canvas.width;
    }
  }
  if (controls.left) {
    camera.x -= camera.scrollSpeed;
    if (camera.x < 0) {
      camera.x = 0;
    }
  }
  if (controls.zoomIn) {
    camera.zoom -= camera.zoomSpeed;
    if (camera.zoom < 1) {
      camera.zoom = 1;
    }
  }
  if (controls.zoomOut) {
    camera.zoom += camera.zoomSpeed;
    if (camera.zoom > 100) {
      camera.zoom = 100;
    }
  }
  if (renderScene) {
    context.fillStyle = "rgba(20, 20, 20, 0.8)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var numCruds = (crudBuffer.byteLength - 4) / 4 / 2;
    for (var i = 0; i < numCruds; i ++) {
      renderCrud(crudView[i * 2], crudView[i * 2 + 1]);
    }
    var numCellProps = 6;
    var numCells = (cellBuffer.byteLength - 4) / 4 / numCellProps;
    for (i = 0; i < numCells; i ++) {
      renderCell(
        cellView[i * numCellProps],
        cellView[i * numCellProps + 1],
        cellView[i * numCellProps + 2],
        cellView[i * numCellProps + 3],
        cellView[i * numCellProps + 4],
        cellView[i * numCellProps + 5]
      );
    }
    renderScene = false;
  }
  stats.end();
}, 1000 / 60);

var renderCrud = function(x, y) {
  x /= camera.zoom;
  y /= camera.zoom;
  var size = 20 / camera.zoom;

  context.fillStyle = "#BBBBBB";
  context.fillRect(x - size / 2 - camera.x, y - size / 2 - camera.y, size, size);
};

var simulation = new Worker("simulation.js");

simulation.onmessage = function(event) {
  // console.log(event);
  // console.log("after send:  " + Date.now());

  // // render scene
  // // render
  // cells = event.data.cells;
  // cruds = event.data.cruds;
  var buffer = event.data;
  var typeView = new Int32Array(buffer);
  if (typeView[0] === 0) {
    crudBuffer = buffer;
    crudView = new Int32Array(crudBuffer, 4);
  }
  else if (typeView[0] === 1) {
    cellBuffer = buffer;
    cellView = new Int32Array(cellBuffer, 4);
  }
  // else if (typeView[0] === 1) {
  //   cellBuffer = buffer;
  //   cellLocationView = new Uint32Array(cellBuffer);
  //
  //   var buffer = new ArrayBuffer(24);
  //
  //   // ... read the data into the buffer ...
  //
  //   var idView = new Uint32Array(buffer, 0, 1);
  //   var usernameView = new Uint8Array(buffer, 4, 16);
  //   var amountDueView = new Float32Array(buffer, 20, 1);
  // }
  renderScene = true;
  // console.log("MESSAGE");
};

// test if transferables are supported in browser
// var ab = new ArrayBuffer(1);
// simulation.postMessage(ab, [ab]);
// if (ab.byteLength) {
//   alert('Transferables are not supported in your browser!');
// } else {
//   alert("supported! :)");
// }
//


// function send() {
//   console.log(Date.now());
//   simulation.postMessage("hello!");
// }

// Camera controls
var controls = {
  up: false,
  down: false,
  left: false,
  right: false,
  zoomOut: false,
  zoomIn: false,
};
var onKeyDown = function(event) {
  if (event.keyCode === 38) {
    controls.up = true;
  }
  else if (event.keyCode === 40) {
    controls.down = true;
  }
  else if (event.keyCode === 39) {
    controls.right = true;
  }
  else if (event.keyCode == 37) {
    controls.left = true;
  }
  else if (event.keyCode == 189) {
    controls.zoomOut = true;
  }
  else if (event.keyCode == 187) {
    controls.zoomIn = true;
  }
};

var onKeyUp = function(event) {
  if (event.keyCode === 38) {
    controls.up = false;
  }
  else if (event.keyCode === 40) {
    controls.down = false;
  }
  else if (event.keyCode === 39) {
    controls.right = false;
  }
  else if (event.keyCode == 37) {
    controls.left = false;
  }
  else if (event.keyCode == 189) {
    controls.zoomOut = false;
  }
  else if (event.keyCode == 187) {
    controls.zoomIn = false;
  }
};

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

var resize = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.onresize = resize;
resize();

var camera = {x: 0, y: 0, zoom: 10, scrollSpeed: 5, zoomSpeed: 0.1};
