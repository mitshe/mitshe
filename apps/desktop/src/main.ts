import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  shell,
} from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { loadConfig, saveConfig, AppConfig } from './config';
import { startAPI, startWeb, stopBackend, waitForHealth, WEB_PORT } from './backend';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let appConfig: AppConfig;

function getWebUrl(): string {
  if (appConfig.mode === 'remote') {
    return appConfig.remoteUrl.replace(/\/$/, '');
  }
  return `http://localhost:${WEB_PORT}`;
}

function createMainWindow() {
  const url = getWebUrl();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'mitshe',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#2a2a35',
  });

  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createSmallWindow(htmlFile: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 400,
    resizable: false,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#2a2a35',
  });
  win.loadFile(path.join(__dirname, '..', 'src', htmlFile));
  return win;
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  const webUrl = getWebUrl();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open mitshe',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createMainWindow();
      },
    },
    { type: 'separator' },
    { label: 'Sessions', click: () => { mainWindow?.loadURL(`${webUrl}/sessions`); mainWindow?.show(); } },
    { label: 'Chat', click: () => { mainWindow?.loadURL(`${webUrl}/chat`); mainWindow?.show(); } },
    { type: 'separator' },
    { label: appConfig.mode === 'local' ? 'Local mode' : `Remote: ${appConfig.remoteUrl}`, enabled: false },
    { label: 'Change mode...', click: () => { saveConfig({ mode: null, remoteUrl: '' }); app.relaunch(); app.quit(); } },
    { type: 'separator' },
    { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
  ]);

  tray.setToolTip('mitshe');
  tray.setContextMenu(contextMenu);
}

function setupIPC() {
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select project folder',
      buttonLabel: 'Open in Session',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('is-desktop', () => true);
  ipcMain.handle('get-mode', () => appConfig.mode);
}

async function startLocal() {
  const splash = createSmallWindow('splash.html');

  // Start API
  splash.webContents.on('did-finish-load', () => {
    splash.webContents.executeJavaScript(
      `document.getElementById('status').textContent = 'Starting API server...'`
    ).catch(() => {});
  });

  const apiStarted = await startAPI();
  if (!apiStarted) {
    const healthy = await waitForHealth();
    if (!healthy) {
      splash.webContents.executeJavaScript(`
        document.getElementById('content').innerHTML = '<h2 style="color:#f87171">Failed to Start</h2><p>API server could not start. Check the logs.</p>';
      `).catch(() => {});
      return;
    }
  }

  // Start Web
  splash.webContents.executeJavaScript(
    `document.getElementById('status').textContent = 'Starting web interface...'`
  ).catch(() => {});

  const webStarted = await startWeb();
  if (!webStarted) {
    splash.webContents.executeJavaScript(`
      document.getElementById('content').innerHTML = '<h2 style="color:#f87171">Failed to Start</h2><p>Web server could not start.</p>';
    `).catch(() => {});
    return;
  }

  splash.close();
  createMainWindow();
  createTray();
}

function startRemote() {
  createMainWindow();
  createTray();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && appConfig.mode) {
    createMainWindow();
  }
});

app.whenReady().then(async () => {
  setupIPC();
  appConfig = loadConfig();

  if (!appConfig.mode) {
    const setupWin = createSmallWindow('setup.html');

    ipcMain.once('setup-mode', (_event, mode: string, remoteUrl?: string) => {
      appConfig = { mode: mode as 'local' | 'remote', remoteUrl: remoteUrl || '' };
      saveConfig(appConfig);
      setupWin.close();

      if (appConfig.mode === 'local') startLocal();
      else startRemote();
    });
    return;
  }

  if (appConfig.mode === 'local') await startLocal();
  else startRemote();

  autoUpdater.autoDownload = false;
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
});

app.on('before-quit', () => {
  stopBackend();
});
