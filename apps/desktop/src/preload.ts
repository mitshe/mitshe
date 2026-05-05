import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mitsheDesktop', {
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-version'),

  isDesktop: (): Promise<boolean> =>
    ipcRenderer.invoke('is-desktop'),

  onUpdateAvailable: (callback: (version: string) => void) => {
    ipcRenderer.on('update-available', (_event, version) => callback(version));
  },

  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
});
