import type { IpcMain } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getFfprobePath } from '../services/ffmpeg';
import { logger } from '../services/logger';
import type { MediaMetadata } from '../types';

function runFfprobe(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = getFfprobePath();
    const args = [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];
    const child = spawn(ffprobe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed (${code}): ${stderr.trim()}`));
      }
      try {
        const json = JSON.parse(stdout);
        const streams = json.streams || [];
        const video = streams.find((s: any) => s.codec_type === 'video') || {};
        const audio = streams.find((s: any) => s.codec_type === 'audio') || {};
        const fmt = json.format || {};

        let rotation = 0;
        const tagRotate = video.tags?.rotate;
        if (tagRotate) rotation = parseInt(tagRotate, 10) || 0;
        const sd = (video.side_data_list || []).find((s: any) => typeof s.rotation === 'number');
        if (sd) rotation = sd.rotation;

        const meta: MediaMetadata = {
          filename: path.basename(filePath),
          path: filePath,
          durationSec: parseFloat(fmt.duration) || 0,
          width: video.width || 0,
          height: video.height || 0,
          videoCodec: video.codec_name || 'unknown',
          audioCodec: audio.codec_name || 'none',
          sizeBytes: fs.statSync(filePath).size,
          rotation
        };
        resolve(meta);
      } catch (e: any) {
        reject(new Error('Failed to parse ffprobe output: ' + e.message));
      }
    });
  });
}

export function registerProbeIpc(ipcMain: IpcMain) {
  ipcMain.handle('probe:file', async (_e, filePath: string) => {
    try {
      logger.info(`Probing: ${filePath}`);
      return await runFfprobe(filePath);
    } catch (e: any) {
      logger.error(`Probe failed: ${e.message}`);
      throw e;
    }
  });
}
