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

const IS_DEV = process.env.NODE_ENV === 'development';
const WEB_URL = process.env.MITSHE_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'mitshe',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#1a1a2e',
  });

  mainWindow.loadURL(WEB_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open mitshe',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sessions',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/sessions`);
        mainWindow?.show();
      },
    },
    {
      label: 'Workflows',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/workflows`);
        mainWindow?.show();
      },
    },
    {
      label: 'Chat',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/chat`);
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: `v${app.getVersion()}`,
      enabled: false,
    },
    {
      label: 'Check for Updates',
      click: () => autoUpdater.checkForUpdatesAndNotify(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('mitshe');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      createWindow();
    }
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
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Get app version
  ipcMain.handle('get-version', () => app.getVersion());

  // Check if running in desktop app
  ipcMain.handle('is-desktop', () => true);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info.version);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  // Check for updates every 4 hours
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);

  // Check on startup (after 10 seconds)
  setTimeout(() => autoUpdater.checkForUpdates(), 10000);
}

// macOS: keep app running when window closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIPC();

  if (!IS_DEV) {
    setupAutoUpdater();
  }
});
