var renderCell = function(x, y, size, color, rotation, pulseAngle) {
  // context.fillStyle = "#FF0000";
  // context.fillRect(this.location.x - 1, this.location.y - 1, 2, 2);
  context.save();
  context.translate(x - camera.x, y - camera.y);
  context.rotate((rotation + 90) * Math.PI / 180);
  var centerX, centerY, controlRectWidth, growth, height, heightGrowth, width, widthGrowth;
  growth = size / 100 * Math.sin(pulseAngle * Math.PI / 180);
  // growth = size / 100 * Math.sin(Math.PI);
  height = size / 10 / 2 + growth;
  width = size / 20 / 2 + growth / 2;
  controlRectWidth = width * 1.33;
  centerX = 0;
  centerY = 0;
  context.beginPath();
  context.moveTo(centerX, centerY - height / 2);
  context.bezierCurveTo(centerX - controlRectWidth / 2, centerY - height / 2, centerX - controlRectWidth / 2, centerY + height / 2, centerX, centerY + height / 2);
  context.bezierCurveTo(centerX + controlRectWidth / 2, centerY + height / 2, centerX + controlRectWidth / 2, centerY - height / 2, centerX, centerY - height / 2);
  context.lineWidth = 2;
  var hexColor = color.toString(16);
  hexColor = "#" + "000000".substr(0, 6 - hexColor.length) + hexColor;
  context.strokeStyle = hexColor;
  context.stroke();
  context.closePath();
  context.restore();
};

var crudBuffer = new ArrayBuffer();
var crudView = new Int32Array();
var cellBuffer = new ArrayBuffer();
var cellView = new Int32Array();
var renderScene = false;
setInterval(function() {
  // TODO: update camera
  // mark "renderScene as true if camera updated"
  // move camera
  // if (rightDown) {
  //   camera.x += cameraScrollSpeed;
  //   if (camera.x + canvas.width > world.width) {
  //     camera.x = world.width - canvas.width;
  //   }
  // }
  // if (leftDown) {
  //   camera.x -= cameraScrollSpeed;
  //   if (camera.x < 0) {
  //     camera.x = 0;
  //   }
  // }
  if (renderScene) {
    context.fillStyle = "rgba(20, 20, 20, 0.8)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // cruds.forEach(function(crud) {
    //   renderCrud(crud);
    // });
    // cells.forEach(function(cell) {
    //   renderCell(cell);
    // });
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
}, 1000 / 60);

// var renderCrud = function(crud) {
//   context.fillStyle = "#BBBBBB";
//   context.fillRect(crud.x - 1 - camera.x, crud.y - 1 - camera.y, 2, 2);
// };

var renderCrud = function(x, y) {
  context.fillStyle = "#BBBBBB";
  context.fillRect(x - 1 - camera.x, y - 1 - camera.y, 2, 2);
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

// TODO: camera controls
// var rightDown = false;
// var leftDown = false;
// var onKeyDown = function(event) {
//   if (event.keyCode === 39) {
//     rightDown = true;
//   }
//   else if (event.keyCode == 37) {
//     leftDown = true;
//   }
// };
//
// var onKeyUp = function(event) {
//   if (event.keyCode === 39) {
//     rightDown = false;
//   }
//   else if (event.keyCode == 37) {
//     leftDown = false;
//   }
// };

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

var resize = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.onresize = resize;
resize();

var camera = {x: 0, y: 0};
var cameraScrollSpeed = 5;
