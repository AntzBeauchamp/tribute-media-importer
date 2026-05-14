import type { BrowserWindow, IpcMain } from 'electron';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { logger } from '../services/logger';
import { downloadWithYtDlp } from '../services/ytdlp';
import { getSettings } from '../services/settingsStore';
import type { LinkCheckResult } from '../types';

const PLATFORM_HOSTS: Array<{ match: RegExp; name: string }> = [
  { match: /(^|\.)youtube\.com$/i, name: 'YouTube' },
  { match: /(^|\.)youtu\.be$/i, name: 'YouTube' },
  { match: /(^|\.)vimeo\.com$/i, name: 'Vimeo' },
  { match: /(^|\.)facebook\.com$/i, name: 'Facebook' },
  { match: /(^|\.)fb\.watch$/i, name: 'Facebook' },
  { match: /(^|\.)instagram\.com$/i, name: 'Instagram' },
  { match: /(^|\.)tiktok\.com$/i, name: 'TikTok' }
];

const ALLOWED_MIME_PREFIXES = ['video/', 'application/octet-stream'];

function detectPlatform(host: string): string | null {
  for (const p of PLATFORM_HOSTS) {
    if (p.match.test(host)) return p.name;
  }
  return null;
}

function normalizeShareUrl(input: string): string {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase();
    if (host.includes('dropbox.com')) {
      u.searchParams.set('dl', '1');
      return u.toString();
    }
    if (host.includes('drive.google.com')) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    }
    return input;
  } catch {
    return input;
  }
}

function headRequest(urlStr: string, redirectsLeft = 5): Promise<{ status: number; headers: http.IncomingHttpHeaders; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try { u = new URL(urlStr); } catch (e: any) { return reject(e); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request({
      method: 'HEAD',
      hostname: u.hostname,
      port: u.port || undefined,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'TributeMediaImporter/1.0' }
    }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.resume();
        headRequest(next, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      res.resume();
      resolve({ status, headers: res.headers, finalUrl: urlStr });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

function getRequest(urlStr: string, dest: fs.WriteStream, redirectsLeft = 5): Promise<void> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try { u = new URL(urlStr); } catch (e: any) { return reject(e); }
    const mod = u.protocol === 'http:' ? http : https;
    mod.get(urlStr, { headers: { 'User-Agent': 'TributeMediaImporter/1.0' } }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.resume();
        getRequest(next, dest, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        return reject(new Error(`Download failed with HTTP ${status}`));
      }
      res.pipe(dest);
      dest.on('finish', () => dest.close(() => resolve()));
      dest.on('error', reject);
    }).on('error', reject);
  });
}

function tempDir(): string {
  const d = path.join(app.getPath('temp'), 'tribute-media-importer');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function registerLinkIpc(ipcMain: IpcMain, getWindow: () => BrowserWindow | null) {
  ipcMain.handle('link:check', async (_e, url: string): Promise<LinkCheckResult> => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const platform = detectPlatform(host);
      if (platform) {
        return {
          ok: true,
          kind: 'platform',
          platform,
          reason: `${platform} link detected. The family must own this video; download uses yt-dlp.`,
          requiresOwnershipAck: true
        };
      }

      const directUrl = normalizeShareUrl(url);
      const head = await headRequest(directUrl);
      const ct = (head.headers['content-type'] || '').toString().toLowerCase();
      const cd = (head.headers['content-disposition'] || '').toString().toLowerCase();
      const looksLikeFile = ALLOWED_MIME_PREFIXES.some((p) => ct.startsWith(p)) || cd.includes('attachment');

      if (!looksLikeFile) {
        return {
          ok: false,
          kind: 'blocked',
          reason: 'This link does not appear to be a direct video file. Please ask the family to upload or send the original video file.'
        };
      }

      let suggested = path.basename(parsed.pathname) || 'downloaded-video';
      const cdMatch = cd.match(/filename\*?=([^;]+)/);
      if (cdMatch) suggested = decodeURIComponent(cdMatch[1].replace(/utf-8''/i, '').replace(/"/g, '').trim());
      if (!/\.(mp4|mov|m4v|avi|mkv|webm)$/i.test(suggested)) suggested += '.mp4';

      return { ok: true, kind: 'direct', reason: 'Direct download available.', directUrl, suggestedFilename: suggested };
    } catch (e: any) {
      logger.warn('link:check failed ' + e.message);
      return { ok: false, kind: 'blocked', reason: 'Could not verify this link. Please ask the family to upload or send the original video file.' };
    }
  });

  ipcMain.handle('link:download', async (_e, url: string, suggestedFilename: string): Promise<string> => {
    const safeName = suggestedFilename.replace(/[\\/:*?"<>|]/g, '_');
    const dest = path.join(tempDir(), `${Date.now()}-${safeName}`);
    const ws = fs.createWriteStream(dest);
    logger.info(`Downloading direct link to ${dest}`);
    await getRequest(url, ws);
    logger.info(`Download complete: ${dest}`);
    return dest;
  });

  ipcMain.handle('link:downloadPlatform', async (_e, url: string): Promise<string> => {
    const settings = getSettings();
    if (!settings.acknowledgedOwnership) {
      throw new Error('Ownership acknowledgment is required before downloading from streaming platforms.');
    }
    logger.info(`yt-dlp download requested for ${url}`);
    const dest = await downloadWithYtDlp(url, tempDir(), (p) => {
      getWindow()?.webContents.send('link:platformProgress', p);
    });
    logger.info(`yt-dlp download complete: ${dest}`);
    return dest;
  });
}
