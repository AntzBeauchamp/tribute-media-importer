import type { FileEntry } from '../types';
import { formatBytes, formatDuration } from '../lib/format';

interface Props {
  files: FileEntry[];
  onRemove: (id: string) => void;
  onOpen: (path: string) => void;
}

const statusColor: Record<FileEntry['status'], string> = {
  queued: 'bg-slate-200 text-slate-700',
  processing: 'bg-amber-200 text-amber-800',
  complete: 'bg-emerald-200 text-emerald-800',
  failed: 'bg-rose-200 text-rose-800'
};

export function FileList({ files, onRemove, onOpen }: Props) {
  if (files.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-left">
          <tr>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Resolution</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">Codec</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="px-3 py-2 max-w-[260px] truncate" title={f.meta.path}>{f.meta.filename}</td>
              <td className="px-3 py-2">{formatDuration(f.meta.durationSec)}</td>
              <td className="px-3 py-2">{f.meta.width}×{f.meta.height}</td>
              <td className="px-3 py-2">{formatBytes(f.meta.sizeBytes)}</td>
              <td className="px-3 py-2">{f.meta.videoCodec}/{f.meta.audioCodec}</td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColor[f.status]}`}>
                  {f.status}{f.status === 'processing' ? ` ${Math.round(f.percent)}%` : ''}
                </span>
                {f.message && <div className="text-xs text-rose-600 mt-1">{f.message}</div>}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {f.status === 'complete' && f.outputPath && (
                  <button
                    onClick={() => onOpen(f.outputPath!)}
                    className="text-brand-600 hover:underline text-xs mr-3"
                  >Show in folder</button>
                )}
                <button
                  onClick={() => onRemove(f.id)}
                  className="text-slate-500 hover:text-rose-600 text-xs"
                >Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
