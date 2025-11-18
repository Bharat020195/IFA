// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expose nothing by default — add safe methods you need
contextBridge.exposeInMainWorld("electronAPI", {
  // example: invoke method
  send: (channel, data) => {
    // whitelist channels:
    const valid = ["toMain"];
    if (valid.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, cb) => {
    const valid = ["fromMain"];
    if (valid.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => cb(...args));
    }
  },
});
