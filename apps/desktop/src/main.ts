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
import { startBackend, stopBackend, checkDocker, WEB_PORT } from './backend';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let appConfig: AppConfig;
let backendStarted = false;

function getWebUrl(): string {
  if (appConfig.mode === 'remote') return appConfig.remoteUrl.replace(/\/$/, '');
  return `http://localhost:${WEB_PORT}`;
}

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

  mainWindow.loadURL(getWebUrl());
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createSmallWindow(htmlFile: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 500,
    height: 380,
    resizable: false,
    titleBarStyle: 'default',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: '#2a2a35',
  });
  win.loadFile(path.join(__dirname, '..', 'src', htmlFile));
  return win;
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let icon: Electron.NativeImage;
  try { icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }); }
  catch { icon = nativeImage.createEmpty(); }

  tray = new Tray(icon);
  const webUrl = getWebUrl();
  tray.setToolTip('mitshe');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open mitshe', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createMainWindow(); } },
    { type: 'separator' },
    { label: 'Sessions', click: () => { mainWindow?.loadURL(`${webUrl}/sessions`); mainWindow?.show(); } },
    { label: 'Chat', click: () => { mainWindow?.loadURL(`${webUrl}/chat`); mainWindow?.show(); } },
    { type: 'separator' },
    { label: appConfig.mode === 'local' ? 'Local (Docker)' : `Remote: ${appConfig.remoteUrl}`, enabled: false },
    { label: 'Change mode...', click: () => { saveConfig({ mode: null, remoteUrl: '' }); app.relaunch(); app.quit(); } },
    { type: 'separator' },
    { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
  ]));
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
  ipcMain.handle('get-mode', () => appConfig.mode);
}

async function startLocal() {
  const splash = createSmallWindow('splash.html');

  const result = await startBackend();
  backendStarted = result.success;

  if (!result.success) {
    const messages: Record<string, string> = {
      'docker-not-installed': '<h2>Docker Desktop Required</h2><p>Install <a href="https://docker.com/products/docker-desktop" style="color:#6B6EF4">Docker Desktop</a> to run mitshe locally.</p>',
      'docker-not-running': '<h2>Docker is Not Running</h2><p>Start Docker Desktop and try again.</p>',
      'pull-failed': '<h2>Download Failed</h2><p>Could not download mitshe image. Check your internet connection.</p>',
      'container-start-failed': '<h2>Container Failed</h2><p>Could not start mitshe container. Ports 13000/13001 may be in use.</p>',
      'unhealthy': '<h2>Start Timeout</h2><p>mitshe started but did not become healthy. Try restarting.</p>',
    };
    const msg = messages[result.error || ''] || '<h2>Unknown Error</h2>';
    splash.webContents.on('did-finish-load', () => {
      splash.webContents.executeJavaScript(
        `document.getElementById('content').innerHTML = '${msg.replace(/'/g, "\\'")}';`
      ).catch(() => {});
    });
    return;
  }

  splash.close();
  createMainWindow();
  createTray();
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && appConfig.mode) createMainWindow(); });

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
      else { createMainWindow(); createTray(); }
    });
    return;
  }

  if (appConfig.mode === 'local') await startLocal();
  else { createMainWindow(); createTray(); }

  autoUpdater.autoDownload = false;
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
});

app.on('before-quit', () => {
  if (backendStarted) stopBackend();
});
