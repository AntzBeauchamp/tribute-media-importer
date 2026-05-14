import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, ConvertOptions, ConvertProgress, LinkCheckResult, MediaMetadata } from './types';

const api = {
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  openPath: (p: string) => ipcRenderer.invoke('shell:openPath', p),
  showItemInFolder: (p: string) => ipcRenderer.invoke('shell:showItemInFolder', p),

  probe: (filePath: string): Promise<MediaMetadata> => ipcRenderer.invoke('probe:file', filePath),

  convert: (opts: ConvertOptions): Promise<{ jobId: string; outputPath: string }> =>
    ipcRenderer.invoke('convert:start', opts),
  cancelConvert: (jobId: string) => ipcRenderer.invoke('convert:cancel', jobId),
  onConvertProgress: (cb: (p: ConvertProgress) => void) => {
    const listener = (_: unknown, p: ConvertProgress) => cb(p);
    ipcRenderer.on('convert:progress', listener);
    return () => ipcRenderer.removeListener('convert:progress', listener);
  },

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', patch),

  checkLink: (url: string): Promise<LinkCheckResult> => ipcRenderer.invoke('link:check', url),
  downloadLink: (url: string, suggestedFilename: string): Promise<string> =>
    ipcRenderer.invoke('link:download', url, suggestedFilename),
  downloadPlatformLink: (url: string): Promise<string> =>
    ipcRenderer.invoke('link:downloadPlatform', url),
  onPlatformProgress: (cb: (p: { percent: number; status: string }) => void) => {
    const listener = (_: unknown, p: { percent: number; status: string }) => cb(p);
    ipcRenderer.on('link:platformProgress', listener);
    return () => ipcRenderer.removeListener('link:platformProgress', listener);
  },

  onLog: (cb: (line: string) => void) => {
    const listener = (_: unknown, line: string) => cb(line);
    ipcRenderer.on('log:line', listener);
    return () => ipcRenderer.removeListener('log:line', listener);
  }
};

contextBridge.exposeInMainWorld('api', api);

export type TributeApi = typeof api;
