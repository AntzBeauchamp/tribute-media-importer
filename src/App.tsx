import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { OutputFolderPicker } from './components/OutputFolderPicker';
import { LogPanel } from './components/LogPanel';
import { useSettings } from './hooks/useSettings';
import { useLog } from './hooks/useLog';
import { buildOutputFilename } from './lib/nameTemplate';
import type { ConvertProgress, OutputFormat } from './types';

type Stage = 'idle' | 'checking' | 'downloading' | 'converting' | 'done' | 'error';

export default function App() {
  const { settings, update, loaded } = useSettings();
  const { lines, append } = useLog();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<OutputFormat>('mp4');
  const [stage, setStage] = useState<Stage>('idle');
  const [dlProgress, setDlProgress] = useState(0);
  const [cvProgress, setCvProgress] = useState(0);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const activeJobRef = useRef<string>('');

  // Sync format from persisted settings once loaded
  useEffect(() => {
    if (loaded && settings.outputFormat) setFormat(settings.outputFormat);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert progress listener
  useEffect(() => {
    const off = window.api.onConvertProgress((p: ConvertProgress) => {
      if (!activeJobRef.current || activeJobRef.current === p.jobId) {
        setCvProgress(p.percent);
      }
    });
    return off;
  }, []);

  const chooseFolder = async () => {
    const f = await window.api.openFolder();
    if (f) await update({ outputFolder: f });
  };

  const openOutputFolder = () => {
    if (settings.outputFolder) window.api.openPath(settings.outputFolder);
  };

  const busy = stage !== 'idle' && stage !== 'done' && stage !== 'error';
  const canDownload = loaded && !!settings.outputFolder && !!url.trim() && !busy;

  const handleDownload = async () => {
    if (!canDownload) return;

    setStage('checking');
    setErrorMsg(null);
    setResultPath(null);
    setDlProgress(0);
    setCvProgress(0);
    activeJobRef.current = '';

    try {
      append(`Checking: ${url.trim()}`);
      const check = await window.api.checkLink(url.trim());

      if (!check.ok || check.kind === 'blocked') {
        throw new Error(check.reason);
      }
      if (check.kind === 'platform' && !settings.acknowledgedOwnership) {
        throw new Error('Please tick the ownership confirmation before downloading from a streaming platform.');
      }

      // Download
      setStage('downloading');
      append('Downloading…');
      let localPath: string;

      if (check.kind === 'platform') {
        const offProgress = window.api.onPlatformProgress((p) => setDlProgress(p.percent));
        try {
          localPath = await window.api.downloadPlatformLink(url.trim());
        } finally {
          offProgress();
        }
      } else {
        localPath = await window.api.downloadLink(check.directUrl!, check.suggestedFilename!);
      }
      append(`Downloaded: ${localPath}`);

      // Convert
      setStage('converting');
      const srcFilename = localPath.split(/[/\\]/).pop()!;
      const outFilename = buildOutputFilename(srcFilename, format);
      append(`Converting to ${format.toUpperCase()}…`);

      const { jobId, outputPath } = await window.api.convert({
        inputPath: localPath,
        outputDir: settings.outputFolder!,
        outputFilename: outFilename,
        format,
      });
      activeJobRef.current = jobId;
      setResultPath(outputPath);
      append(`Done: ${outputPath}`);
      setStage('done');
      setUrl('');
    } catch (e: any) {
      const msg = e?.message || 'Something went wrong.';
      setErrorMsg(msg);
      append(`Error: ${msg}`);
      setStage('error');
    }
  };

  const reset = () => {
    setStage('idle');
    setErrorMsg(null);
    setResultPath(null);
    setDlProgress(0);
    setCvProgress(0);
  };

  const changeFormat = (f: OutputFormat) => {
    setFormat(f);
    update({ outputFormat: f });
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 p-6 space-y-4 max-w-2xl w-full mx-auto">

        {/* URL input */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Video link</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canDownload && handleDownload()}
            placeholder="YouTube, Vimeo, Facebook, Instagram, TikTok, Dropbox, Drive, or direct .mp4 URL"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            disabled={busy}
          />
        </div>

        {/* Format selector */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Output format</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'mp4' as OutputFormat, label: 'MP4 video', desc: 'H.264 / AAC up to 1080p' },
              { value: 'mp3' as OutputFormat, label: 'MP3 audio', desc: 'Audio only, 192 kbps' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeFormat(opt.value)}
                disabled={busy}
                className={`text-left rounded border px-3 py-2 transition-colors ${
                  format === opt.value
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-slate-300 hover:border-brand-400'
                }`}
              >
                <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Output folder */}
        <OutputFolderPicker
          outputFolder={settings.outputFolder}
          onChoose={chooseFolder}
          onOpen={openOutputFolder}
        />

        {/* Ownership acknowledgment */}
        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!settings.acknowledgedOwnership}
            onChange={(e) => update({ acknowledgedOwnership: e.target.checked })}
            className="mt-0.5 accent-brand-600 w-4 h-4 flex-shrink-0"
          />
          I confirm the family owns or has rights to this video
        </label>

        {/* Download button */}
        {!busy && stage !== 'done' && (
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className="w-full rounded bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-colors"
          >
            Download
          </button>
        )}

        {/* Progress */}
        {busy && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            {stage === 'checking' && (
              <p className="text-sm text-slate-500">Checking link…</p>
            )}
            {stage === 'downloading' && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Downloading</span>
                  <span>{dlProgress > 0 ? `${Math.round(dlProgress)}%` : '…'}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded">
                  <div className="h-2 bg-brand-500 rounded transition-all" style={{ width: `${dlProgress}%` }} />
                </div>
              </div>
            )}
            {stage === 'converting' && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Converting to {format.toUpperCase()}</span>
                  <span>{cvProgress > 0 ? `${Math.round(cvProgress)}%` : '…'}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded">
                  <div className="h-2 bg-brand-500 rounded transition-all" style={{ width: `${cvProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {stage === 'done' && resultPath && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-emerald-800">Download complete</div>
                <div className="text-xs text-emerald-600 mt-0.5 truncate">{resultPath.split(/[/\\]/).pop()}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => window.api.showItemInFolder(resultPath)}
                  className="text-xs rounded border border-emerald-400 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100"
                >
                  Show in folder
                </button>
                <button
                  onClick={reset}
                  className="text-xs rounded bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5"
                >
                  Download another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="text-sm text-red-700 flex-1">{errorMsg}</div>
            <button
              onClick={reset}
              className="text-xs rounded border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-100 flex-shrink-0"
            >
              Try again
            </button>
          </div>
        )}

        <LogPanel lines={lines} />
      </main>
    </div>
  );
}
