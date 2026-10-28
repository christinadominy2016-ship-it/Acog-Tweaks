const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("acog", {
  call: (action, payload) => ipcRenderer.invoke("acog", action, payload),
});
