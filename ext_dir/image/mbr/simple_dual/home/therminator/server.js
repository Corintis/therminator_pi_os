const express = require("express");
const path = require("path");
const os = require("os");
const fs = require("fs");
const app = express();

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, "build")));

// Handles any requests that don't match the ones above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Find and set the local IP address
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

process.env.LOCAL_IP = getLocalIPAddress();
console.log(`Local IP is set to ${process.env.LOCAL_IP}`);

// Write the local IP to a .env file
const envFilePath = path.join(__dirname, ".env");
fs.writeFileSync(envFilePath, `REACT_APP_LOCAL_IP=${process.env.LOCAL_IP}\n`, { flag: "w" });

console.log(`.env file created with LOCAL_IP=${process.env.LOCAL_IP}`);

const port = process.env.PORT || 3000;
app.listen(port, process.env.LOCAL_IP, () => {
  console.log(`Server is running on ${process.env.LOCAL_IP}:${port}`);
});
