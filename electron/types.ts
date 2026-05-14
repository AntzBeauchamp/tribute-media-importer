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

export type OutputFormat = 'mp4' | 'mp3';

export interface ConvertOptions {
  inputPath: string;
  outputDir: string;
  outputFilename: string;
  format: OutputFormat;
}

export interface ConvertProgress {
  jobId: string;
  percent: number;
  status: JobStatus;
  message?: string;
}

export interface AppSettings {
  outputFolder: string | null;
  acknowledgedOwnership: boolean;
  outputFormat: OutputFormat;
}

export type LinkKind = 'direct' | 'platform' | 'blocked';

export interface LinkCheckResult {
  ok: boolean;
  kind: LinkKind;
  reason: string;
  directUrl?: string;
  suggestedFilename?: string;
  platform?: string;
  requiresOwnershipAck?: boolean;
}
