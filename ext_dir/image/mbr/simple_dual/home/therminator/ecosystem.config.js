module.exports = {
    apps: [
      {
        name: "kiosk-app",
        script: "server.js",
        cwd: "/home/therminator",
        env: {
          PORT: 3000
        }
      },
      {
        name: "therminator-server",
        script: "sudo",
        args: "./therminator_server",
        cwd: "/home/therminator",
        exec_mode: "fork",
        interpreter: "none"
      }
    ]
  };
  