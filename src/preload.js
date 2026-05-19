const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mockMeterApi', {
  startServer: (config) => ipcRenderer.invoke('mock-meter-api:start-server', config),
  stopServer: () => ipcRenderer.invoke('mock-meter-api:stop-server'),
  restartServer: (config) => ipcRenderer.invoke('mock-meter-api:restart-server', config),
  getServerStatus: () => ipcRenderer.invoke('mock-meter-api:get-server-status'),
  setScenario: (scenario) => ipcRenderer.invoke('mock-meter-api:set-scenario', scenario),
  getScenario: () => ipcRenderer.invoke('mock-meter-api:get-scenario'),
  setCustomPayloadText: (customPayloadText) =>
    ipcRenderer.invoke('mock-meter-api:set-custom-payload-text', customPayloadText),
  getCustomPayloadText: () => ipcRenderer.invoke('mock-meter-api:get-custom-payload-text'),
  getLogs: () => ipcRenderer.invoke('mock-meter-api:get-logs'),
  clearLogs: () => ipcRenderer.invoke('mock-meter-api:clear-logs'),
});