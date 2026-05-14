import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

class Logger {
  private logPath: string;
  private listeners: Array<(line: string) => void> = [];

  constructor() {
    const dir = app?.getPath ? app.getPath('userData') : process.cwd();
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    this.logPath = path.join(dir, 'bf-downloader.log');
  }

  subscribe(cb: (line: string) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private write(level: string, msg: string) {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    try { fs.appendFileSync(this.logPath, line + '\n'); } catch { /* ignore */ }
    for (const l of this.listeners) l(line);
    // eslint-disable-next-line no-console
    console.log(line);
  }

  info(msg: string) { this.write('INFO', msg); }
  warn(msg: string) { this.write('WARN', msg); }
  error(msg: string) { this.write('ERROR', msg); }
}

export const logger = new Logger();
