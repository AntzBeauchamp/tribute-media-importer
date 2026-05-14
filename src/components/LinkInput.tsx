import { useEffect, useState } from 'react';

interface Props {
  onImported: (path: string) => void;
  onLog: (line: string) => void;
  acknowledgedOwnership: boolean;
  onAckChange: (v: boolean) => void;
}

export function LinkInput({ onImported, onLog, acknowledgedOwnership, onAckChange }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'info' | 'warn' | 'ok'>('info');
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const off = window.api.onPlatformProgress((p) => {
      setProgress(p.percent);
    });
    return off;
  }, []);

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setMessage(null);
    setProgress(null);
    try {
      onLog(`Checking link: ${url}`);
      const check = await window.api.checkLink(url.trim());

      if (check.kind === 'blocked' || !check.ok) {
        setMessage(check.reason);
        setMessageKind('warn');
        onLog(`Link rejected: ${check.reason}`);
        return;
      }

      let localPath: string;
      if (check.kind === 'platform') {
        if (!acknowledgedOwnership) {
          setMessage('You must confirm the family owns this video before downloading from streaming platforms.');
          setMessageKind('warn');
          return;
        }
        onLog(`Downloading from ${check.platform} via yt-dlp…`);
        setProgress(0);
        localPath = await window.api.downloadPlatformLink(url.trim());
      } else {
        onLog(`Downloading direct file: ${check.directUrl}`);
        localPath = await window.api.downloadLink(check.directUrl!, check.suggestedFilename!);
      }

      onLog(`Downloaded to: ${localPath}`);
      onImported(localPath);
      setMessage('Video downloaded and added to the list.');
      setMessageKind('ok');
      setUrl('');
    } catch (e: any) {
      const msg = e?.message || 'Failed to import link.';
      setMessage(msg);
      setMessageKind('warn');
      onLog(`Link import failed: ${msg}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const color = messageKind === 'ok'
    ? 'text-emerald-700'
    : messageKind === 'warn' ? 'text-amber-800' : 'text-slate-600';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-slate-700 mb-2">Paste a video link</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube, Vimeo, Facebook, Instagram, TikTok, Dropbox, Drive, or direct .mp4 URL"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          disabled={busy}
        />
        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="rounded bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 text-sm font-medium"
        >
          {busy ? 'Working…' : 'Import link'}
        </button>
      </div>

      {progress !== null && (
        <div className="mt-2">
          <div className="h-2 w-full bg-slate-200 rounded">
            <div
              className="h-2 bg-brand-500 rounded transition-all"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">Downloading… {Math.round(progress)}%</div>
        </div>
      )}

      {message && <p className={`mt-2 text-xs ${color}`}>{message}</p>}

      <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={acknowledgedOwnership}
          onChange={(e) => onAckChange(e.target.checked)}
        />
        <span>
          I confirm the family owns or has the legal right to use any video downloaded from YouTube,
          Vimeo, Facebook, Instagram, or TikTok using this app. Without this confirmation, streaming-platform
          downloads are disabled.
        </span>
      </label>

      <p className="mt-2 text-xs text-slate-400">
        First-time platform downloads will fetch the yt-dlp helper binary to your user data folder.
      </p>
    </div>
  );
}
