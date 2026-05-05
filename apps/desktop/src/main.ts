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
import { loadConfig, saveConfig, getWebUrl, AppConfig } from './config';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let containerManaged = false;
let appConfig: AppConfig;

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
    },
    show: false,
    backgroundColor: '#2a2a35',
  });

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
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

function createTray(webUrl: string) {
  if (tray) return;

  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open mitshe',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow(webUrl);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sessions',
      click: () => { mainWindow?.loadURL(`${webUrl}/sessions`); mainWindow?.show(); },
    },
    {
      label: 'Chat',
      click: () => { mainWindow?.loadURL(`${webUrl}/chat`); mainWindow?.show(); },
    },
    { type: 'separator' },
    {
      label: appConfig.mode === 'local' ? 'Local mode' : `Remote: ${appConfig.remoteUrl}`,
      enabled: false,
    },
    {
      label: 'Change mode...',
      click: () => {
        saveConfig({ mode: null, remoteUrl: '' });
        app.relaunch();
        app.quit();
      },
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
  ipcMain.handle('docker-status', () => checkDocker());
  ipcMain.handle('get-mode', () => appConfig.mode);
}

async function startLocal() {
  const splash = createSmallWindow('splash.html');

  const status = checkDocker();
  if (!status.dockerInstalled || !status.dockerRunning) {
    splash.webContents.on('did-finish-load', () => {
      splash.webContents.executeJavaScript(`
        document.getElementById('content').innerHTML = '<h2>Docker Desktop Required</h2><p>mitshe needs Docker to run locally.</p><p style="margin-top:1rem"><a href="https://docker.com/products/docker-desktop" style="color:#6B6EF4">Download Docker Desktop</a></p>';
      `);
    });
    return;
  }

  const ready = await ensureContainer();
  containerManaged = true;

  splash.close();

  if (ready) {
    const webUrl = getWebUrl(appConfig);
    createMainWindow(webUrl);
    createTray(webUrl);
  } else {
    const errWin = createSmallWindow('splash.html');
    errWin.webContents.on('did-finish-load', () => {
      errWin.webContents.executeJavaScript(`
        document.getElementById('content').innerHTML = '<h2 style="color:#f87171">Failed to Start</h2><p>Could not start mitshe container. Make sure Docker Desktop is running.</p>';
      `);
    });
  }
}

function startRemote() {
  const webUrl = getWebUrl(appConfig);
  createMainWindow(webUrl);
  createTray(webUrl);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && appConfig.mode) {
    createMainWindow(getWebUrl(appConfig));
  }
});

app.whenReady().then(async () => {
  setupIPC();
  appConfig = loadConfig();

  // First launch — show setup screen
  if (!appConfig.mode) {
    const setupWin = createSmallWindow('setup.html');

    ipcMain.once('setup-mode', (_event, mode: string, remoteUrl?: string) => {
      appConfig = {
        mode: mode as 'local' | 'remote',
        remoteUrl: remoteUrl || '',
      };
      saveConfig(appConfig);
      setupWin.close();

      if (appConfig.mode === 'local') {
        startLocal();
      } else {
        startRemote();
      }
    });

    return;
  }

  if (appConfig.mode === 'local') {
    await startLocal();
  } else {
    startRemote();
  }

  autoUpdater.autoDownload = false;
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
});

app.on('before-quit', () => {
  if (containerManaged) {
    stopContainer();
  }
});
