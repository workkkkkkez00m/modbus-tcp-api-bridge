import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { MockMeterApiServer } from './mockMeterApiServer.js';
import { MockModbusTcpServer } from './mockModbusTcpServer.js';

if (started) {
  app.quit();
}

const mockServer = new MockMeterApiServer();
const modbusServer = new MockModbusTcpServer();

function resolveAppIconPath() {
  const iconFileName =
    process.platform === 'darwin' ? 'mac-icon.icns' : 'meter-icon.ico';

  const devPath = path.join(process.cwd(), 'src', 'public', iconFileName);
  if (!app.isPackaged && fs.existsSync(devPath)) {
    return devPath;
  }

  const appPath = path.join(app.getAppPath(), 'src', 'public', iconFileName);
  if (fs.existsSync(appPath)) {
    return appPath;
  }

  const resourcesPath = path.join(process.resourcesPath, iconFileName);
  if (fs.existsSync(resourcesPath)) {
    return resourcesPath;
  }

  return undefined;
}

function setDockIconIfNeeded() {
  if (process.platform !== 'darwin') {
    return;
  }

  const iconPath = resolveAppIconPath();
  if (!iconPath) {
    return;
  }

  const dockIcon = nativeImage.createFromPath(iconPath);
  if (!dockIcon.isEmpty() && app.dock) {
    app.dock.setIcon(dockIcon);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    icon: resolveAppIconPath(),
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

  ipcMain.handle('modbus:start-server', async (_event, config) => {
    return modbusServer.start(config);
  });

  ipcMain.handle('modbus:stop-server', async () => {
    return modbusServer.stop();
  });

  ipcMain.handle('modbus:restart-server', async (_event, config) => {
    return modbusServer.restart(config);
  });

  ipcMain.handle('modbus:get-status', async () => {
    return modbusServer.getStatus();
  });

  ipcMain.handle('modbus:generate-registers', async (_event, config) => {
    return modbusServer.generateRegisters(config);
  });

  ipcMain.handle('modbus:update-point', async (_event, point) => {
    return modbusServer.updatePoint(point);
  });

  ipcMain.handle('modbus:get-points', async () => {
    return modbusServer.getPoints();
  });

  ipcMain.handle('modbus:get-logs', async () => {
    return modbusServer.getLogs();
  });

  ipcMain.handle('modbus:clear-logs', async () => {
    return modbusServer.clearLogs();
  });
}

app.whenReady().then(() => {
  registerIpc();
  setDockIconIfNeeded();
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

  try {
    await modbusServer.stop();
  } catch (error) {
    console.error('Failed to stop Modbus server:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
