import type { BrowserWindow, IpcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getFfmpegPath, getFfprobePath } from '../services/ffmpeg';
import { logger } from '../services/logger';
import type { ConvertOptions, ConvertProgress } from '../types';

const jobs = new Map<string, ChildProcess>();

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(getFfprobePath(), [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('close', () => resolve(parseFloat(out.trim()) || 0));
    child.on('error', () => resolve(0));
  });
}

function buildArgs(opts: ConvertOptions, outputPath: string): string[] {
  const args: string[] = ['-y', '-hide_banner'];
  if (opts.trimStartSec && opts.trimStartSec > 0) {
    args.push('-ss', opts.trimStartSec.toString());
  }
  args.push('-i', opts.inputPath);
  if (opts.trimEndSec && opts.trimEndSec > (opts.trimStartSec || 0)) {
    args.push('-to', opts.trimEndSec.toString());
  }

  const vf = [
    "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black",
    "setsar=1",
    "fps=30",
    "format=yuv420p"
  ].join(',');

  args.push(
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-profile:v', 'high',
    '-level', '4.1',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function humanizeFfmpegError(stderr: string): string {
  const s = stderr.toLowerCase();
  if (s.includes('no such file')) return 'The input file could not be found.';
  if (s.includes('permission denied')) return 'Permission denied. Try choosing a different output folder.';
  if (s.includes('invalid data') || s.includes('moov atom not found')) {
    return 'The video file appears to be corrupted or incomplete.';
  }
  if (s.includes('disk') && s.includes('full')) return 'Not enough disk space to complete conversion.';
  return 'Conversion failed. See the log panel for details.';
}

export function registerConvertIpc(ipcMain: IpcMain, getWindow: () => BrowserWindow | null) {
  ipcMain.handle('convert:start', async (_e, opts: ConvertOptions) => {
    const jobId = randomUUID();
    fs.mkdirSync(opts.outputDir, { recursive: true });
    const outputPath = path.join(opts.outputDir, opts.outputFilename);
    const totalDuration = await probeDuration(opts.inputPath);
    const args = buildArgs(opts, outputPath);

    const ffmpegPath = getFfmpegPath();
    logger.info(`Starting job ${jobId}: ${ffmpegPath} ${args.join(' ')}`);

    const send = (p: ConvertProgress) => {
      getWindow()?.webContents.send('convert:progress', p);
    };

    return new Promise<{ jobId: string; outputPath: string }>((resolve, reject) => {
      const child = spawn(ffmpegPath, args, { windowsHide: true });
      jobs.set(jobId, child);

      send({ jobId, percent: 0, status: 'processing' });

      let stderrBuf = '';
      let lastPercent = 0;

      child.stdout.on('data', (d) => {
        const text = d.toString();
        // ffmpeg -progress emits key=value lines including out_time_ms=...
        const match = text.match(/out_time_ms=(\d+)/g);
        if (match && totalDuration > 0) {
          const last = match[match.length - 1];
          const us = parseInt(last.split('=')[1], 10);
          const sec = us / 1_000_000;
          const span = (opts.trimEndSec || totalDuration) - (opts.trimStartSec || 0);
          const pct = Math.min(99, Math.max(0, (sec / Math.max(span, 0.001)) * 100));
          if (pct - lastPercent >= 1) {
            lastPercent = pct;
            send({ jobId, percent: pct, status: 'processing' });
          }
        }
      });

      child.stderr.on('data', (d) => {
        stderrBuf += d.toString();
        // Only log a tail to avoid spam
        const line = d.toString().trim();
        if (line) logger.info(`[ffmpeg ${jobId.slice(0, 8)}] ${line.split('\n').pop()}`);
      });

      child.on('error', (err) => {
        jobs.delete(jobId);
        logger.error(`Job ${jobId} spawn error: ${err.message}`);
        send({ jobId, percent: lastPercent, status: 'failed', message: err.message });
        reject(err);
      });

      child.on('close', (code) => {
        jobs.delete(jobId);
        if (code === 0) {
          send({ jobId, percent: 100, status: 'complete' });
          logger.info(`Job ${jobId} complete -> ${outputPath}`);
          resolve({ jobId, outputPath });
        } else {
          const msg = humanizeFfmpegError(stderrBuf);
          logger.error(`Job ${jobId} failed (${code}): ${msg}`);
          send({ jobId, percent: lastPercent, status: 'failed', message: msg });
          reject(new Error(msg));
        }
      });
    });
  });

  ipcMain.handle('convert:cancel', (_e, jobId: string) => {
    const c = jobs.get(jobId);
    if (c) {
      c.kill('SIGKILL');
      jobs.delete(jobId);
      return true;
    }
    return false;
  });
}
