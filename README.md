# Tribute Media Importer

A simple desktop app for funeral home staff to import, validate, convert, trim, and prepare family-provided videos into clean, tribute-ready MP4 files.

## Features

- Drag-and-drop or browse to import local video files (MP4, MOV, M4V, AVI, MKV, WEBM)
- Paste direct video links (Dropbox, Google Drive, direct file URLs)
- Import from YouTube, Vimeo, Facebook, Instagram, and TikTok via yt-dlp, gated behind a one-time ownership confirmation (staff must check a box affirming the family owns the video). yt-dlp binary is auto-downloaded to the app's user-data folder on first use.
- Read video metadata (duration, resolution, codec, size, rotation) with ffprobe
- Convert to tribute-ready MP4:
  - H.264 video, AAC audio
  - Max 1920×1080 with letterbox to preserve aspect ratio
  - 30 fps, 48 kHz stereo, `yuv420p`
  - Phone rotation handled automatically
  - `+faststart` for fast playback
- Optional trim (start / end)
- Remembers last output folder and deceased name
- Per-job progress, status, and plain-English error messages
- Persistent log panel + log file under `%APPDATA%\Tribute Media Importer\`

## Requirements

- Windows 10 or 11
- Node.js 20+ (for development only)

## Development

```powershell
npm install
npm run dev
```

This launches Vite (port 5173) and Electron in development mode.

## Building a Windows installer

```powershell
npm run dist
```

The `.exe` installer will be written to `release/`. FFmpeg and ffprobe are bundled via `ffmpeg-static` / `ffprobe-static` and unpacked from the asar at install time.

## Project layout

```
electron/      Main process (Node), IPC handlers, services
src/           Renderer (React + TS + Tailwind)
resources/     Installer icons
```

## Output filenames

`{deceased-name}-{original-filename}-tribute-ready.mp4`, e.g. `john-smith-birthday-2019-tribute-ready.mp4`.

## Notes on link import

Direct file URLs and share-to-download links (Dropbox `?dl=1`, Google Drive `uc?export=download`) are imported with a plain HTTPS GET.

Streaming-platform links (YouTube, Vimeo, Facebook, Instagram, TikTok) are imported with [yt-dlp](https://github.com/yt-dlp/yt-dlp). To enable this, staff must tick the ownership-confirmation checkbox in the app, affirming the family owns or has rights to the video. The yt-dlp binary is downloaded automatically on first use to `%APPDATA%\Tribute Media Importer\bin\yt-dlp.exe` — no manual install required.
