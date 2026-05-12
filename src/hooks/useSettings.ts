import { useEffect, useState } from 'react';
import type { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({ outputFolder: null, deceasedName: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const s = await window.api.setSettings(patch);
    setSettings(s);
  };

  return { settings, update, loaded };
}
