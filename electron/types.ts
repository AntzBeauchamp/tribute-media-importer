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
