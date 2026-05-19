import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { MockMeterApiServer } from './mockMeterApiServer.js';

if (started) {
  app.quit();
}

const mockServer = new MockMeterApiServer();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

function registerIpc() {
  ipcMain.handle('mock-meter-api:start-server', async (_event, config) => {
    return mockServer.start(config);
  });

  ipcMain.handle('mock-meter-api:stop-server', async () => {
    return mockServer.stop();
  });

  ipcMain.handle('mock-meter-api:restart-server', async (_event, config) => {
    return mockServer.restart(config);
  });

  ipcMain.handle('mock-meter-api:get-server-status', async () => {
    return mockServer.getStatus();
  });

  ipcMain.handle('mock-meter-api:set-scenario', async (_event, scenario) => {
    return mockServer.setScenario(scenario);
  });

  ipcMain.handle('mock-meter-api:set-custom-payload-text', async (_event, customPayloadText) => {
    return mockServer.setCustomPayloadText(customPayloadText);
  });

  ipcMain.handle('mock-meter-api:get-custom-payload-text', async () => {
    return mockServer.getCustomPayloadText();
  });

  ipcMain.handle('mock-meter-api:get-scenario', async () => {
    return mockServer.getStatus().config.scenario;
  });

  ipcMain.handle('mock-meter-api:get-logs', async () => {
    return mockServer.getLogs();
  });

  ipcMain.handle('mock-meter-api:clear-logs', async () => {
    mockServer.clearLogs();
    return mockServer.getLogs();
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  try {
    await mockServer.stop();
  } catch (error) {
    console.error('Failed to stop mock server:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});