import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YTDlpWrap = require('yt-dlp-wrap').default;
import { logger } from './logger';

let cachedWrapper: any = null;
let initPromise: Promise<any> | null = null;

function getBinaryPath(): string {
  const dir = path.join(app.getPath('userData'), 'bin');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
}

async function ensureBinary(): Promise<any> {
  if (cachedWrapper) return cachedWrapper;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const binPath = getBinaryPath();
    if (!fs.existsSync(binPath)) {
      logger.info('Downloading yt-dlp binary…');
      await YTDlpWrap.downloadFromGithub(binPath);
      logger.info(`yt-dlp downloaded to ${binPath}`);
    }
    cachedWrapper = new YTDlpWrap(binPath);
    return cachedWrapper;
  })();
  return initPromise;
}

export interface YtDlpProgress {
  percent: number;
  status: string;
}

export async function downloadWithYtDlp(
  url: string,
  outputDir: string,
  onProgress?: (p: YtDlpProgress) => void
): Promise<string> {
  const wrap = await ensureBinary();
  fs.mkdirSync(outputDir, { recursive: true });
  const outputTemplate = path.join(outputDir, '%(title).80s-%(id)s.%(ext)s');

  const args = [
    url,
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-warnings',
    '-o', outputTemplate
  ];

  logger.info(`yt-dlp ${args.join(' ')}`);

  return new Promise<string>((resolve, reject) => {
    let finalPath = '';
    const ev = wrap.exec(args);
    ev.on('progress', (p: any) => {
      if (onProgress) onProgress({ percent: p.percent || 0, status: 'downloading' });
    });
    ev.on('ytDlpEvent', (eventType: string, eventData: string) => {
      // Capture final merged filename if reported
      const m = /Merging formats into "(.+?)"/.exec(eventData) || /\[download\] Destination: (.+)$/.exec(eventData);
      if (m) finalPath = m[1].trim();
      const done = /\[download\] (.+) has already been downloaded/.exec(eventData);
      if (done) finalPath = done[1].trim();
    });
    ev.on('error', (err: Error) => reject(err));
    ev.on('close', () => {
      if (!finalPath) {
        // Fallback: pick newest .mp4 in outputDir
        try {
          const files = fs.readdirSync(outputDir)
            .filter((f) => f.toLowerCase().endsWith('.mp4'))
            .map((f) => ({ f, t: fs.statSync(path.join(outputDir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
          if (files[0]) finalPath = path.join(outputDir, files[0].f);
        } catch { /* ignore */ }
      }
      if (!finalPath || !fs.existsSync(finalPath)) {
        return reject(new Error('yt-dlp finished but no output file was found.'));
      }
      resolve(finalPath);
    });
  });
}
