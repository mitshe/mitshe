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
import { checkDocker, ensureContainer, stopContainer } from './docker';

const IS_DEV = process.env.NODE_ENV === 'development';
const WEB_URL = process.env.MITSHE_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let containerManaged = false;

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

  // Docker status
  ipcMain.handle('docker-status', () => checkDocker());
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

app.whenReady().then(async () => {
  createTray();
  setupIPC();

  if (!IS_DEV) {
    // Start mitshe container automatically
    const status = checkDocker();

    if (!status.dockerInstalled || !status.dockerRunning) {
      createWindow();
      mainWindow?.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888;text-align:center;padding:2rem"><div><h2 style="margin-bottom:1rem">Docker is required</h2><p>Please install and start <a href="https://docker.com/products/docker-desktop" style="color:#6B6EF4">Docker Desktop</a> to use mitshe.</p></div></div>';
        `);
      });
      return;
    }

    createWindow();
    mainWindow?.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888"><div style="text-align:center"><div style="width:32px;height:32px;border:3px solid #333;border-top-color:#6B6EF4;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem"></div><p>Starting mitshe...</p></div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
      `);
    });

    const ready = await ensureContainer();
    containerManaged = true;

    if (ready) {
      mainWindow?.loadURL(WEB_URL);
    } else {
      mainWindow?.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888;text-align:center;padding:2rem"><div><h2 style="margin-bottom:1rem">Failed to start</h2><p>mitshe container could not start. Check Docker Desktop is running.</p></div></div>';
      `);
    }

    setupAutoUpdater();
  } else {
    createWindow();
  }
});

// Stop container when quitting (only if we started it)
app.on('before-quit', () => {
  if (containerManaged) {
    stopContainer();
  }
});
