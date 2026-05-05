/**
 * Desktop app (Electron) bridge.
 * When running inside the Electron wrapper, window.mitsheDesktop is available.
 * In browser mode, all functions gracefully return null/false.
 */

interface MitsheDesktopAPI {
  selectFolder: () => Promise<string | null>;
  getVersion: () => Promise<string>;
  isDesktop: () => Promise<boolean>;
  changeServer: () => void;
}

declare global {
  interface Window {
    mitsheDesktop?: MitsheDesktopAPI;
  }
}

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && !!window.mitsheDesktop;
}

export async function selectLocalFolder(): Promise<string | null> {
  if (!window.mitsheDesktop) return null;
  return window.mitsheDesktop.selectFolder();
}

export async function getDesktopVersion(): Promise<string | null> {
  if (!window.mitsheDesktop) return null;
  return window.mitsheDesktop.getVersion();
}
