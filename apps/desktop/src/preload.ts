import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mitsheDesktop', {
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-version'),

  isDesktop: (): Promise<boolean> =>
    ipcRenderer.invoke('is-desktop'),
});
