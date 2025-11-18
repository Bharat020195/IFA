// electron/main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const NEXT_PORT = process.env.NEXT_PORT || 3000;
const NEXT_START_CMD = process.env.NEXT_START_CMD || "npx next start -p " + NEXT_PORT;

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = `http://localhost:${NEXT_PORT}`;
  mainWindow.loadURL(url);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

function startNext() {
  console.log("Starting Next production server...");
  // spawn next start - we run in production mode later; for dev you might use next dev.
  // Use shell true to let "npx next start" run in packaged environment.
  nextProcess = spawn(NEXT_START_CMD, {
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  });

  nextProcess.on("error", (err) => {
    console.error("Failed to start Next:", err);
  });

  nextProcess.on("exit", (code, signal) => {
    console.log("Next process exited:", code, signal);
    // optionally quit electron if next exits
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

app.on("ready", () => {
  startNext();
  createWindow();
});

app.on("window-all-closed", () => {
  // On Windows & Linux quit cleanly
  if (nextProcess) {
    try { nextProcess.kill(); } catch (e) {}
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
