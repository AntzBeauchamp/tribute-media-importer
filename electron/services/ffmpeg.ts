import * as path from 'path';
import { app } from 'electron';

function resolveBinary(modulePath: string, binaryName: string): string {
  // ffmpeg-static exports the path string as default; ffprobe-static exports { path }
  // When packaged with asarUnpack, the path lives under app.asar.unpacked
  let p = modulePath;
  if (app?.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  if (!p.endsWith(binaryName) && !p.toLowerCase().endsWith('.exe')) {
    p = path.join(p, binaryName);
  }
  return p;
}

export function getFfmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw: string = require('ffmpeg-static');
  return resolveBinary(raw, 'ffmpeg.exe');
}

export function getFfprobePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ff = require('ffprobe-static');
  const raw: string = typeof ff === 'string' ? ff : ff.path;
  return resolveBinary(raw, 'ffprobe.exe');
}
