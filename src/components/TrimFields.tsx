interface Props {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  deceasedName: string;
  onDeceasedName: (v: string) => void;
}

export function TrimFields({ start, end, onStart, onEnd, deceasedName, onDeceasedName }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Deceased name (for filename)</label>
        <input
          type="text"
          value={deceasedName}
          onChange={(e) => onDeceasedName(e.target.value)}
          placeholder="e.g. John Smith"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Trim start (optional)</label>
        <input
          type="text"
          value={start}
          onChange={(e) => onStart(e.target.value)}
          placeholder="0:00"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Trim end (optional)</label>
        <input
          type="text"
          value={end}
          onChange={(e) => onEnd(e.target.value)}
          placeholder="e.g. 1:30"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>
      <p className="md:col-span-3 text-xs text-slate-400">
        Trim values use H:MM:SS or seconds. Applied to all queued files. Leave blank to keep the full clip.
      </p>
    </div>
  );
}
