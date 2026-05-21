const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mockMeterApi', {
  startServer: (config) => ipcRenderer.invoke('mock-meter-api:start-server', config),
  stopServer: () => ipcRenderer.invoke('mock-meter-api:stop-server'),
  restartServer: (config) => ipcRenderer.invoke('mock-meter-api:restart-server', config),
  getServerStatus: () => ipcRenderer.invoke('mock-meter-api:get-server-status'),
  setScenario: (scenario) => ipcRenderer.invoke('mock-meter-api:set-scenario', scenario),
  getScenario: () => ipcRenderer.invoke('mock-meter-api:get-scenario'),
  getResponseSourceMode: () => ipcRenderer.invoke('api:get-response-source-mode'),
  setResponseSourceMode: (mode) => ipcRenderer.invoke('api:set-response-source-mode', mode),
  setCustomPayloadText: (customPayloadText) =>
    ipcRenderer.invoke('mock-meter-api:set-custom-payload-text', customPayloadText),
  getCustomPayloadText: () => ipcRenderer.invoke('mock-meter-api:get-custom-payload-text'),
  getLogs: () => ipcRenderer.invoke('mock-meter-api:get-logs'),
  clearLogs: () => ipcRenderer.invoke('mock-meter-api:clear-logs'),
});

contextBridge.exposeInMainWorld('modbusSimulator', {
  startServer: (config) => ipcRenderer.invoke('modbus:start-server', config),
  stopServer: () => ipcRenderer.invoke('modbus:stop-server'),
  restartServer: (config) => ipcRenderer.invoke('modbus:restart-server', config),
  getStatus: () => ipcRenderer.invoke('modbus:get-status'),
  generateRegisters: (config) => ipcRenderer.invoke('modbus:generate-registers', config),
  updatePoint: (point) => ipcRenderer.invoke('modbus:update-point', point),
  getPoints: () => ipcRenderer.invoke('modbus:get-points'),
  getLogs: () => ipcRenderer.invoke('modbus:get-logs'),
  clearLogs: () => ipcRenderer.invoke('modbus:clear-logs'),
});

contextBridge.exposeInMainWorld('bridgeSimulator', {
  startServer: (config) => ipcRenderer.invoke('bridge:start-server', config),
  stopServer: () => ipcRenderer.invoke('bridge:stop-server'),
  restartServer: (config) => ipcRenderer.invoke('bridge:restart-server', config),
  getStatus: () => ipcRenderer.invoke('bridge:get-status'),
  getPreview: (mappings) => ipcRenderer.invoke('bridge:get-preview', mappings),
  getMappings: () => ipcRenderer.invoke('bridge:get-mappings'),
  setMappings: (mappings) => ipcRenderer.invoke('bridge:set-mappings', mappings),
  getDefaultMappings: () => ipcRenderer.invoke('bridge:get-default-mappings'),
  getLogs: () => ipcRenderer.invoke('bridge:get-logs'),
  clearLogs: () => ipcRenderer.invoke('bridge:clear-logs'),
});
