import Store from 'electron-store';
import type { AppSettings } from '../types';

const defaults: AppSettings = {
  outputFolder: null,
  deceasedName: ''
};

const store = new Store<AppSettings>({
  name: 'settings',
  defaults
});

export function getSettings(): AppSettings {
  return {
    outputFolder: store.get('outputFolder'),
    deceasedName: store.get('deceasedName')
  };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    store.set(k as keyof AppSettings, v as never);
  }
  return getSettings();
}
