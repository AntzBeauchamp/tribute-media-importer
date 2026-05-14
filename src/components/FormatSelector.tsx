import type { OutputFormat } from '../types';

interface Props {
  value: OutputFormat;
  onChange: (v: OutputFormat) => void;
}

const options: Array<{ value: OutputFormat; label: string; desc: string }> = [
  { value: 'mp4', label: 'MP4 video', desc: 'H.264 / AAC up to 1080p — for tribute slideshows' },
  { value: 'mp3', label: 'MP3 audio', desc: 'Audio only, 192 kbps stereo — for music or voice tracks' }
];

export function FormatSelector({ value, onChange }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-sm font-medium text-slate-700 mb-2">Output format</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`text-left rounded border px-3 py-2 transition-colors ${
                active
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-slate-300 hover:border-brand-400'
              }`}
            >
              <div className="text-sm font-medium text-slate-800">{opt.label}</div>
              <div className="text-xs text-slate-500">{opt.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
