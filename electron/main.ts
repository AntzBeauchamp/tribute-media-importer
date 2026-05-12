import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { registerSettingsIpc } from './ipc/settings';
import { registerProbeIpc } from './ipc/probe';
import { registerConvertIpc } from './ipc/convert';
import { registerLinkIpc } from './ipc/link';
import { logger } from './services/logger';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f5f7fb',
    title: 'Tribute Media Importer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  logger.info('App ready');

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video files', extensions: ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'] },
        { name: 'All files', extensions: ['*'] }
      ]
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('shell:openPath', async (_e, p: string) => {
    return shell.openPath(p);
  });

  ipcMain.handle('shell:showItemInFolder', async (_e, p: string) => {
    shell.showItemInFolder(p);
    return true;
  });

  registerSettingsIpc(ipcMain);
  registerProbeIpc(ipcMain);
  registerConvertIpc(ipcMain, () => mainWindow);
  registerLinkIpc(ipcMain);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: ' + (err?.stack || String(err)));
});
