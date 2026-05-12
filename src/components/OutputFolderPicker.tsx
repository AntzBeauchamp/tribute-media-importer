interface Props {
  outputFolder: string | null;
  onChoose: () => void;
  onOpen: () => void;
}

export function OutputFolderPicker({ outputFolder, onChoose, onOpen }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-slate-700 mb-2">Output folder</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm truncate">
          {outputFolder || <span className="text-slate-400">No folder selected</span>}
        </div>
        <button onClick={onChoose} className="rounded bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 text-sm">
          Choose…
        </button>
        {outputFolder && (
          <button onClick={onOpen} className="rounded border border-slate-300 hover:bg-slate-100 px-3 py-2 text-sm">
            Open
          </button>
        )}
      </div>
    </div>
  );
}
