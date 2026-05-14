import Store from 'electron-store';
import type { AppSettings } from '../types';

const defaults: AppSettings = {
  outputFolder: null,
  acknowledgedOwnership: false,
  outputFormat: 'mp4'
};

const store = new Store<AppSettings>({
  name: 'settings',
  defaults
});

export function getSettings(): AppSettings {
  return {
    outputFolder: store.get('outputFolder') ?? defaults.outputFolder,
    acknowledgedOwnership: store.get('acknowledgedOwnership') ?? defaults.acknowledgedOwnership,
    outputFormat: store.get('outputFormat') ?? defaults.outputFormat
  };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    store.set(k as keyof AppSettings, v as never);
  }
  return getSettings();
}
