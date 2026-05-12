import type { IpcMain } from 'electron';
import { getSettings, setSettings } from '../services/settingsStore';

export function registerSettingsIpc(ipcMain: IpcMain) {
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_e, patch) => setSettings(patch));
}
