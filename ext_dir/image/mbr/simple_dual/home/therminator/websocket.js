const express = require("express");
const multer = require("multer");
const http = require("http");
const { WebSocketServer } = require("ws");
const os = require("os");
const normalizeMatrix = require("./utils/normalizeMatrix.js");
const path = require("path");

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Or set to 'http://localhost:3000'
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use("/downloads", express.static(path.join(__dirname, "downloads")));
const upload = multer({ dest: "/tmp/therminator/" });

// Display IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "127.0.0.1"; // Fallback to localhost if no IP found
}

const localIP = getLocalIPAddress();
const PORT = 8080;
let timestampStarted;
let status = "power_off";

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

// WebSocket logic
let isSimulating = false;
let simulationInterval;
const connectedClients = new Set();
let data;
let normalizedData = [];
let cellmapData;
let cellmapDimensions;

wss.on("connection", (ws) => {
  console.log("Client connected");
  connectedClients.add(ws);

  if (status === "power_on" || status === "simulation_running") {
    startSimulation(ws);
  }

  ws.on("message", (message) => {
    // console.log(`Received message: ${message}`);
    handleMessage(message, ws);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    connectedClients.delete(ws);
  });
});
let currentFrame = null; // Store persistent current frame

function startSimulation(ws) {
  if (simulationInterval) return;

  const rowsPowermap = normalizedData.length;
  const colsPowermap = normalizedData[0].length;
  const baseMin = 25;
  const baseMax = 60;
  const variation = 1;
  const transitionRate = 0.05; // smaller = slower heat buildup

  // Initialize current frame if not already
  if (!currentFrame) {
    currentFrame = Array.from({ length: rowsPowermap }, () =>
      Array.from({ length: colsPowermap }, () => baseMin)
    );
  }

  simulationInterval = setInterval(() => {
    let min = Infinity,
      max = -Infinity,
      sum = 0,
      total = 0;
    const series = [];

    for (let y = 0; y < rowsPowermap; y++) {
      const rowData = [];
      for (let x = 0; x < colsPowermap; x++) {
        const normVal = normalizedData[y][x];

        // Calculate target temp with small jitter
        const scaledTarget = baseMin + normVal * (baseMax - baseMin);
        const jitter = (Math.random() * 2 - 1) * variation; // ±variation
        const targetTemp = Math.min(
          baseMax,
          Math.max(baseMin, scaledTarget + jitter)
        );

        // Smooth transition: move a fraction toward target
        const prevTemp = currentFrame[y][x];
        const updatedTemp = prevTemp + (targetTemp - prevTemp) * transitionRate;

        currentFrame[y][x] = updatedTemp; // Update frame state

        rowData.push(updatedTemp.toFixed(1));
        sum += updatedTemp;
        total++;

        if (updatedTemp < min) min = updatedTemp;
        if (updatedTemp > max) max = updatedTemp;
      }
      series.push({ data: rowData });
    }

    const average = sum / total;

    data = {
      powerState: status === "power_on" ? true : false,
      heatmapData: {
        series,
        rows: cellmapDimensions.rows,
        cols: cellmapDimensions.cols,
        min_val: min,
        max_val: max,
      },
      powermapData: {
        rows: rowsPowermap,
        cols: colsPowermap,
        unit_cell_dim: [0.001, 0.003],
        total_power: 755.659,
        peak_heat_flux: max / 10000,
        surface_area: 8.32,
        average_heat_flux: average / 10000,
      },
    };

    sendDataToAll({ status, data, timestampStarted });
  }, 500);
}

function sendData(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendDataToAll(data) {
  connectedClients.forEach((ws) => {
    sendData(ws, data);
  });
}

const stopSimulation = () => {
  isSimulating = false;
  clearInterval(simulationInterval);
  simulationInterval = null;
  timestampStarted = null;
  currentFrame = null;
};

function handleMessage(message, ws) {
  try {
    const data = JSON.parse(message);
    const { command } = data;

    console.log("Received command:", command);

    switch (command) {
      case "start_simulation":
        if (!isSimulating) {
          isSimulating = true;
          status = "simulation_running";
          timestampStarted = new Date().toISOString();
          console.log("Response to client: ", { status: "simulation_running" });
          sendDataToAll({ status: "simulation_running" });
          startSimulation(ws);
        } else {
          status = "simulation_running";
          console.log("Response to client: ", { status: "simulation_running" });
          sendData(ws, { status: "simulation_running" });
        }
        break;

      case "stop_simulation":
        if (isSimulating) {
          stopSimulation();
          status = "simulation_stopped";
          console.log("Response to client: ", {
            status: "simulation_stopped",
            download_file: "/downloads/mock_data.csv",
          });
          sendDataToAll({
            status: "simulation_stopped",
            download_file: "/downloads/mock_data.csv",
          });
        } else {
          status = "simulation_stopped";
          sendData(ws, { status: "simulation_stopped" });
        }
        break;
      case "power_on":
        if (!isSimulating) {
          isSimulating = true;
          status = "power_on";
          timestampStarted = new Date().toISOString();
          console.log("Response to client: ", { status: "power_on" });
          sendDataToAll({ status: "power_on" });
          startSimulation(ws);
        } else {
          status = "power_on";
          sendData(ws, { status: "power_on" });
        }
        break;

      case "power_off":
        if (isSimulating && status !== "simulation_running") {
          stopSimulation();
          status = "power_off";
          console.log("Response to client: ", { status: "power_off" });
          sendDataToAll({ status: "power_off" });
        } else {
          if (status !== "simulation_running") {
            status = "power_off";
            sendData(ws, { status: "power_off" });
          } else {
            sendData(ws, { status });
          }
        }
        break;
      case "power_map":
        console.log("Received power map:", data);
        normalizedData = normalizeMatrix(data.powermap.series);
        // console.log('Normalized data:', normalizedData);
        break;
      default:
        sendData(ws, { error: "Invalid command" });
        console.warn("Invalid command:", command);
        break;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendData(ws, { error: "Error handling message" });
  }
}

// Express Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Express Routes
app.get("/status", (req, res) => {
  res.json({
    status: "mock_status",
    averaging: true,
    "sample-rate": 1000,
    "sample-rate-unit": "ms",
    vdc: 3.3,
    "ttv-max-dimensions": [26, 32],
    "num-modules": 1,
    "max-cell-num": 832,
    "cell-status": "ok",
    "power-state": true,
    firmware_version: "1.0.0-mock",
    userspace_version: "unknown",
    webserver_version: "mock-version",
    description: "Firmware version information",
  });
});

app.put("/config", (req, res) => {
  const config = req.body;
  console.log("Received config update:", config);
  res.json({
    status: "ok",
    averaging: config.averaging ?? true,
    "sample-rate": config["sample-rate"] ?? 1000,
    "sample-rate-unit": "ms",
  });
});

app.post("/dfu", upload.single("file"), (req, res) => {
  console.log("DFU file uploaded:", req.file?.path);
  res.status(200).send("DFU upload successful");
});

app.post("/webserver-update", upload.single("file"), (req, res) => {
  console.log("Webserver binary uploaded:", req.file?.path);
  res.status(200).send("Webserver update successful");
});

app.post("/cell_map", (req, res) => {
  console.log("Cell map uploaded:", req.body);
  cellmapData = req.body;

  const parsedData = cellmapData.adc;
  // const validationError = validateCellMap(parsedData);
  // if (validationError) {
  //   handleError(validationError);
  //   return;
  // }

  // Convert the object data into an array format
  const processedData = Object.entries(parsedData).map(([key, value]) => ({
    id: parseInt(key),
    x: value.x,
    y: value.y,
  }));

  // Sort by id to ensure correct order
  processedData.sort((a, b) => a.id - b.id);

  // Calculate actual dimensions based on the data
  const maxX = Math.max(...processedData.map((cell) => cell.x));
  const minX = Math.min(...processedData.map((cell) => cell.x));
  const maxY = Math.max(...processedData.map((cell) => cell.y));
  const minY = Math.min(...processedData.map((cell) => cell.y));

  // Calculate grid dimensions
  cellmapDimensions = {
    cols: maxX - minX + 1, // Number of columns
    rows: maxY - minY + 1, // Number of rows
    totalCells: processedData.length,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
    },
  };
  console.log("Cell map dimensions:", cellmapDimensions);

  res.status(200).send("Cell map upload successful");
});

app.post("/calibration_file", upload.single("file"), (req, res) => {
  console.log("Calibration file uploaded:", req.file?.path);
  res.status(200).send("Calibration file upload successful");
});

// Start both servers on same port
server.listen(PORT, localIP, () => {
  console.log(`HTTP + WebSocket server running on http://${localIP}:${PORT}`);
});

console.log("WebSocket server started");
