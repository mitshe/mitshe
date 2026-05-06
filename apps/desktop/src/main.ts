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
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';

app.name = 'mitshe';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverUrl: string | null = null;

function configPath(): string {
  return path.join(app.getPath('userData'), 'server.txt');
}

function loadServerUrl(): string | null {
  try {
    if (fs.existsSync(configPath())) {
      return fs.readFileSync(configPath(), 'utf-8').trim() || null;
    }
  } catch { /* ignore */ }
  return null;
}

function saveServerUrl(url: string): void {
  fs.writeFileSync(configPath(), url);
}

function clearServerUrl(): void {
  try { fs.unlinkSync(configPath()); } catch { /* ignore */ }
}

function createMainWindow(url: string) {
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
      webSecurity: false, // allow noVNC iframe from different port
    },
    show: false,
    backgroundColor: '#2a2a35',
  });

  const appIcon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png'));
  if (!appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
    if (process.platform === 'darwin') app.dock.setIcon(appIcon);
  }

  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Reload page after system wake from sleep to restore connection
  const { powerMonitor } = require('electron');
  powerMonitor.on('resume', () => {
    console.log('[mitshe] System resumed from sleep, reloading...');
    setTimeout(() => {
      mainWindow?.webContents.reload();
    }, 2000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return; // ignore iframe failures (noVNC etc.)
    console.log(`[mitshe] Connection failed: ${errorCode} ${errorDescription} ${validatedURL}`);
    // Retry after 3 seconds instead of showing error page
    setTimeout(() => {
      if (mainWindow && serverUrl) mainWindow.loadURL(serverUrl);
    }, 3000);
  });
}

function showConnectScreen() {
  const win = new BrowserWindow({
    width: 440,
    height: 340,
    resizable: false,
    titleBarStyle: 'default',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: '#2a2a35',
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'connect.html'));

  ipcMain.once('connect', (_event, url: string) => {
    serverUrl = url;
    saveServerUrl(url);
    win.close();
    createMainWindow(serverUrl);
    createTray();
  });
}

function createTray() {
  if (tray || !serverUrl) return;

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let icon: Electron.NativeImage;
  try { icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }); }
  catch { icon = nativeImage.createEmpty(); }

  tray = new Tray(icon);
  tray.setToolTip('mitshe');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open mitshe', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else if (serverUrl) createMainWindow(serverUrl); } },
    { type: 'separator' },
    { label: 'Sessions', click: () => { mainWindow?.loadURL(`${serverUrl}/sessions`); mainWindow?.show(); } },
    { label: 'Chat', click: () => { mainWindow?.loadURL(`${serverUrl}/chat`); mainWindow?.show(); } },
    { label: 'Workflows', click: () => { mainWindow?.loadURL(`${serverUrl}/workflows`); mainWindow?.show(); } },
    { type: 'separator' },
    { label: serverUrl || '', enabled: false },
    { label: 'Disconnect', click: () => { clearServerUrl(); app.relaunch(); app.quit(); } },
    { type: 'separator' },
    { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
  ]));

  tray.on('click', () => {
    if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); }
    else if (serverUrl) createMainWindow(serverUrl);
  });
}

function setupIPC() {
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select project folder',
      buttonLabel: 'Open in Session',
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('is-desktop', () => true);

  ipcMain.on('retry-connection', () => {
    if (serverUrl) mainWindow?.loadURL(serverUrl);
  });

  ipcMain.on('change-server', () => {
    clearServerUrl();
    app.relaunch();
    app.quit();
  });
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { if (serverUrl) createMainWindow(serverUrl); else showConnectScreen(); } });

app.whenReady().then(() => {
  setupIPC();
  serverUrl = loadServerUrl();

  if (serverUrl) {
    createMainWindow(serverUrl);
    createTray();
  } else {
    showConnectScreen();
  }

  autoUpdater.autoDownload = false;
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
});
