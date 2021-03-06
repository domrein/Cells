/* global stats */

"use strict";

var apiUrl = "cellsapi.paulmilham.com";
// var apiUrl = "localhost:3000";

var renderCell = function(x, y, size, color, rotation, pulseAngle) {
  x /= camera.zoom;
  y /= camera.zoom;
  size /= camera.zoom;
  // only draw onscreen cells
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

var worldWidth = 150000;
var worldHeight = 150000;
var numWorkers = 4;

var cyclesPerSecond = 60;
// render/controls loop
setInterval(function() {
  stats.begin();

  // call update on simulations
  var updating = simulations.reduce(function(prev, curr) {
    return prev || curr.updating;
  }, false);
  if (!updating) {
    simulations.forEach(function(simulation) {
      simulation.updating = true;
      simulation.worker.postMessage({command: "update"});
    });
  }

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
    if (camera.x + canvas.width > worldWidth * 4 / camera.zoom) {
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
    if (camera.zoom > 1000) {
      camera.zoom = 1000;
    }
  }
  if (controls.up || controls.down || controls.left || controls.right || controls.zoomIn || controls.zoomOut) {
    renderScene = true;
  }
  if (renderScene) {
    context.fillStyle = "rgba(20, 20, 20, 0.8)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    simulations.forEach(function(simulation, index) {
      var numCruds = (simulation.crudBuffer.byteLength - 4) / 4 / 2;
      for (var i = 0; i < numCruds; i ++) {
        renderCrud(
          simulation.crudView[i * 2] + worldWidth * (index % layoutWidth),
          simulation.crudView[i * 2 + 1] + worldHeight * Math.floor(index / layoutWidth)
        );
      }
      var numCellProps = 6;
      var numCells = (simulation.cellBuffer.byteLength - 4) / 4 / numCellProps;
      for (i = 0; i < numCells; i ++) {
        renderCell(
          // TEMP: just line up all simulations horizontally
          simulation.cellView[i * numCellProps] + worldWidth * (index % layoutWidth),
          simulation.cellView[i * numCellProps + 1] + worldHeight * Math.floor(index / layoutWidth),
          simulation.cellView[i * numCellProps + 2],
          simulation.cellView[i * numCellProps + 3],
          simulation.cellView[i * numCellProps + 4],
          simulation.cellView[i * numCellProps + 5]
        );
      }
    });
    renderScene = false;
  }
  stats.end();
}, 1000 / cyclesPerSecond);

var renderCrud = function(x, y) {
  // TODO: skip crud render if crud is offscreen
  x /= camera.zoom;
  y /= camera.zoom;
  var size = 200 / camera.zoom;

  context.fillStyle = "#BBBBBB";
  context.fillRect(x - size / 2 - camera.x, y - size / 2 - camera.y, size, size);
};

function request(method, url, body, callback) {
  if (callback === undefined) {
    callback = body;
    body = undefined;
  }

  var req = new XMLHttpRequest();
  req.open(method, url, true);
  req.onreadystatechange = function() {
    if (req.readyState !== 4 || req.status !== 200) {
      return;
    }
    // save off id and token for saving state
    var response = JSON.parse(req.responseText);
    callback(response);
  };
  req.send(body);
}

function saveState() {
  setTimeout(function() {
    simulations.forEach(function(simulation) {
      simulation.worker.postMessage({command: "saveState"});
    });
  }, 1000 * 60 * 0.5);
}

var id = localStorage.getItem("id");
var token = localStorage.getItem("token");

// TEMP: ignore saved state
// id = null;
// token = null;

if (id && token) {
  request("GET", "http://" + apiUrl + "/v1/worlds/" + id + "/state", function(response) {
    if (response.data.states) {
      if (response.data.states.length !== numWorkers) {
        numWorkers = response.data.states.length;
      }
      while (simulations.length < numWorkers) {
        createSimulation();
      }
      response.data.states.forEach(function(state, index) {
        simulations[index].worker.postMessage({command: "loadState", state: state});
      });
    }
    saveState();
  });
}
else {
  request("POST", "http://" + apiUrl + "/v1/worlds", function(response) {
    id = response.data.id;
    token = response.data.token;
    localStorage.setItem("id", id);
    localStorage.setItem("token", token);
    saveState();
  });
}


// spin up several simulations
// TODO: add settings to control number of workers
var simulations = [];
for (i = 0; i < numWorkers; i ++) {
  createSimulation();
}

function createSimulation() {
  var simulation = new Worker("simulation.js");

  simulation.onmessage = function(event) {
    // console.log(event);
    // console.log("after send:  " + Date.now());

    var simData = null;
    var simIndex = 0;
    // TODO: find a better way of finding this without looping over all sims
    for (i = 0; i < simulations.length; i ++) {
      if (simulations[i].worker === event.target) {
        simData = simulations[i];
        simIndex = i;
      }
    }
    // // render scene
    // // render
    // cells = event.data.cells;
    // cruds = event.data.cruds;
    if (event.data instanceof ArrayBuffer) {
      var buffer = event.data;
      var typeView = new Int32Array(buffer);
      if (typeView[0] === 0) {
        simData.crudBuffer = buffer;
        simData.crudView = new Int32Array(simData.crudBuffer, 4);
      }
      else if (typeView[0] === 1) {
        simData.cellBuffer = buffer;
        simData.cellView = new Int32Array(simData.cellBuffer, 4);
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
    }
    else {
      switch (event.data.command) {
        case "stateSaved":
          simData.savedState = event.data.state;
          // send off saved state to server if all states have been saved
          var stateReady = simulations.reduce(function(prev, curr) {
            return prev && curr.savedState;
          }, true);
          if (stateReady) {
            var states = simulations.map(function(simulation) {
              // TODO: don't serialize the data then parse it here just to encode it again when the request is sent
              return JSON.parse(simulation.savedState);
            });

            var req = new XMLHttpRequest();
            req.open("PUT", "http://" + apiUrl + "/v1/worlds/" + id + "/state", true);
            req.onreadystatechange = function() {
              if (req.readyState !== 4 || req.status !== 200) {
                // TODO: find out why the save failed
                return;
              }
              // save off id and token for saving state
              var response = JSON.parse(req.responseText);
              saveState();
            };
            req.send(JSON.stringify({version: 1, states: JSON.stringify(states), token: token}));

            // clear out savedState data
            simulations.forEach(function(simulation) {
              simulation.savedState = null;
            });
          }
          break;
        case "updateCompleted":
          simData.updating = false;
          break;
        case "migrateCell":
          // figure out where this cell needs to go
          // TODO: cells move, then the migrators are puled out of simulations, then collision runs, then migrators are put back in
          // this means that migrators skip a cycle of collision. Think of a fix for that.

          // TODO: cell could migrate diagonally if it's moving fast. That should be handled now anyways, it'll just take an extra cycle for another migration
          var targetSim = null;
          switch (event.data.direction) {
            case "left":
              if (simIndex % layoutWidth === 0) {
                targetSim = simulations[simIndex + layoutWidth - 1];
              }
              else {
                targetSim = simulations[simIndex -1];
              }
              break;
            case "right":
              if (simIndex % layoutWidth === layoutWidth - 1) {
                targetSim = simulations[simIndex - layoutWidth + 1];
              }
              else {
                targetSim = simulations[simIndex + 1];
              }
              break;
            case "up":
              if (simIndex < layoutWidth) {
                targetSim = simulations[simulations.length - layoutWidth + simIndex];
              }
              else {
                targetSim = simulations[simIndex - layoutWidth];
              }
              break;
            case "down":
              if (simIndex >= simulations.length - layoutWidth) {
                targetSim = simulations[simIndex % layoutWidth];
              }
              else {
                targetSim = simulations[simIndex + layoutWidth];
              }
              break;
            default:
              // Invalid migration. Kill cell and log warning.
              console.log("Invalid migration");
          }
          if (targetSim) {
            targetSim.worker.postMessage({command: "migrateCell", cell: event.data.cell});
          }
          break;
      }
    }
    // console.log("MESSAGE");
  };

  simulations.push({
    worker: simulation,
    updating: false,
    crudBuffer: new ArrayBuffer(),
    crudView: new Int32Array(),
    cellBuffer: new ArrayBuffer(),
    cellView: new Int32Array(),
    savedState: null,
  });
}

var layoutWidth = 0;
var layoutHeight = 0;
// calc layout using factors (for world wrapping)
// layout is rectangle with smallest possible sides, width is larger if the sides aren't even
function calcLayout() {
  var high = simulations.length;
  var i = 1;
  var low = i;
  while (i < high) {
    if (simulations.length % i === 0) {
      low = i;
      high = simulations.length / low;
    }
    i ++;
  }

  layoutWidth = high;
  layoutHeight = low;
}
calcLayout();

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

var camera = {x: 0, y: 0, zoom: 100, scrollSpeed: 5, zoomSpeed: 1};
