export type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';

export interface MediaMetadata {
  filename: string;
  path: string;
  durationSec: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  sizeBytes: number;
  rotation: number;
}

export interface ConvertOptions {
  inputPath: string;
  outputDir: string;
  outputFilename: string;
  trimStartSec?: number;
  trimEndSec?: number;
}

export interface ConvertProgress {
  jobId: string;
  percent: number;
  status: JobStatus;
  message?: string;
}

export interface AppSettings {
  outputFolder: string | null;
  deceasedName: string;
}

export interface LinkCheckResult {
  ok: boolean;
  reason: string;
  directUrl?: string;
  suggestedFilename?: string;
}

export interface FileEntry {
  id: string;
  meta: MediaMetadata;
  status: JobStatus;
  percent: number;
  message?: string;
  outputPath?: string;
}

declare global {
  interface Window {
    api: {
      openFiles: () => Promise<string[]>;
      openFolder: () => Promise<string | null>;
      openPath: (p: string) => Promise<string>;
      showItemInFolder: (p: string) => Promise<boolean>;
      probe: (filePath: string) => Promise<MediaMetadata>;
      convert: (opts: ConvertOptions) => Promise<{ jobId: string; outputPath: string }>;
      cancelConvert: (jobId: string) => Promise<boolean>;
      onConvertProgress: (cb: (p: ConvertProgress) => void) => () => void;
      getSettings: () => Promise<AppSettings>;
      setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
      checkLink: (url: string) => Promise<LinkCheckResult>;
      downloadLink: (url: string, suggestedFilename: string) => Promise<string>;
      onLog: (cb: (line: string) => void) => () => void;
    };
  }
}
