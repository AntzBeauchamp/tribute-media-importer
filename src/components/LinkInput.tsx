import { useState } from 'react';

interface Props {
  onImported: (path: string) => void;
  onLog: (line: string) => void;
}

export function LinkInput({ onImported, onLog }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'info' | 'warn' | 'ok'>('info');

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      onLog(`Checking link: ${url}`);
      const check = await window.api.checkLink(url.trim());
      if (!check.ok || !check.directUrl || !check.suggestedFilename) {
        setMessage(check.reason);
        setMessageKind('warn');
        onLog(`Link rejected: ${check.reason}`);
        return;
      }
      onLog(`Downloading: ${check.directUrl}`);
      const localPath = await window.api.downloadLink(check.directUrl, check.suggestedFilename);
      onLog(`Downloaded to: ${localPath}`);
      onImported(localPath);
      setMessage('Video downloaded and added to the list.');
      setMessageKind('ok');
      setUrl('');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to import link.');
      setMessageKind('warn');
      onLog(`Link import failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
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
          placeholder="https://www.dropbox.com/... or direct .mp4 URL"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          disabled={busy}
        />
        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="rounded bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 text-sm font-medium"
        >
          {busy ? 'Checking…' : 'Import link'}
        </button>
      </div>
      {message && <p className={`mt-2 text-xs ${color}`}>{message}</p>}
      <p className="mt-2 text-xs text-slate-400">
        YouTube, Vimeo, Facebook, Instagram and TikTok links cannot be imported directly. Please ask the family to upload the original file.
      </p>
    </div>
  );
}
