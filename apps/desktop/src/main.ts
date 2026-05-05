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

// mitshe Docker container exposes these ports
const MITSHE_URL = process.env.MITSHE_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createMainWindow() {
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

  mainWindow.loadURL(MITSHE_URL);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle load failure (mitshe not running)
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow?.loadFile(path.join(__dirname, '..', 'src', 'not-running.html'));
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let icon: Electron.NativeImage;
  try { icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }); }
  catch { icon = nativeImage.createEmpty(); }

  tray = new Tray(icon);
  tray.setToolTip('mitshe');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open mitshe', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createMainWindow(); } },
    { type: 'separator' },
    { label: 'Sessions', click: () => { mainWindow?.loadURL(`${MITSHE_URL}/sessions`); mainWindow?.show(); } },
    { label: 'Chat', click: () => { mainWindow?.loadURL(`${MITSHE_URL}/chat`); mainWindow?.show(); } },
    { label: 'Workflows', click: () => { mainWindow?.loadURL(`${MITSHE_URL}/workflows`); mainWindow?.show(); } },
    { type: 'separator' },
    { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
  ]));

  tray.on('click', () => {
    if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); }
    else createMainWindow();
  });
}

function setupIPC() {
  // Native file picker for local project mounting
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

  // Retry connection (from not-running page)
  ipcMain.on('retry-connection', () => {
    mainWindow?.loadURL(MITSHE_URL);
  });
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });

app.whenReady().then(() => {
  setupIPC();
  createMainWindow();
  createTray();

  autoUpdater.autoDownload = false;
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
});
