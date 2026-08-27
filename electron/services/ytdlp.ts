import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YTDlpWrap = require('yt-dlp-wrap').default;
import { logger } from './logger';
import { getFfmpegPath } from './ffmpeg';

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

const VIDEO_EXTS = ['.mp4', '.mkv', '.webm', '.m4v', '.mov', '.avi'];

export async function downloadWithYtDlp(
  url: string,
  outputDir: string,
  onProgress?: (p: YtDlpProgress) => void
): Promise<string> {
  const wrap = await ensureBinary();

  // Use a unique subdirectory per download so the fallback scan is unambiguous
  const downloadDir = path.join(outputDir, `dl-${Date.now()}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const outputTemplate = path.join(downloadDir, '%(title).80s-%(id)s.%(ext)s');

  const args = [
    url,
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
    '--ffmpeg-location', getFfmpegPath(),
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
    ev.on('ytDlpEvent', (_eventType: string, eventData: string) => {
      const m = /Merging formats into "(.+?)"/.exec(eventData)
        || /\[Merger\] Merging formats into "(.+?)"/.exec(eventData)
        || /\[download\] Destination: (.+)$/.exec(eventData);
      if (m) finalPath = m[1].trim();
      const done = /\[download\] (.+) has already been downloaded/.exec(eventData);
      if (done) finalPath = done[1].trim();
    });
    ev.on('error', (err: Error) => reject(err));
    ev.on('close', () => {
      if (!finalPath || !fs.existsSync(finalPath)) {
        // Fallback: pick the newest video file in the unique download dir
        try {
          const files = fs.readdirSync(downloadDir)
            .filter((f) => VIDEO_EXTS.some((ext) => f.toLowerCase().endsWith(ext)))
            .map((f) => ({ f, t: fs.statSync(path.join(downloadDir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
          if (files[0]) finalPath = path.join(downloadDir, files[0].f);
        } catch { /* ignore */ }
      }
      if (!finalPath || !fs.existsSync(finalPath)) {
        return reject(new Error('yt-dlp finished but no output file was found.'));
      }
      resolve(finalPath);
    });
  });
}
