import { useCallback, useState } from 'react';

interface Props {
  onFiles: (paths: string[]) => void;
}

const VIDEO_EXTS = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'];

export function DropZone({ onFiles }: Props) {
  const [over, setOver] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const paths: string[] = [];
    for (const f of Array.from(e.dataTransfer.files)) {
      // Electron extends File with a .path property
      const p = (f as unknown as { path?: string }).path;
      if (p && VIDEO_EXTS.some((ext) => p.toLowerCase().endsWith(ext))) {
        paths.push(p);
      }
    }
    if (paths.length > 0) onFiles(paths);
  }, [onFiles]);

  const handlePick = async () => {
    const paths = await window.api.openFiles();
    if (paths.length > 0) onFiles(paths);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        over ? 'border-brand-500 bg-brand-100' : 'border-slate-300 bg-white'
      }`}
    >
      <p className="text-slate-600 mb-3">Drag and drop video files here</p>
      <p className="text-xs text-slate-400 mb-4">MP4, MOV, M4V, AVI, MKV, WEBM</p>
      <button
        onClick={handlePick}
        className="rounded bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-medium"
      >
        Import local file
      </button>
    </div>
  );
}
