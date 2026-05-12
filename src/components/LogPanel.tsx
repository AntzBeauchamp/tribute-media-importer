import { useEffect, useRef } from 'react';

interface Props {
  lines: string[];
}

export function LogPanel({ lines }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs">
      <div className="text-slate-400 mb-1">Log</div>
      <div ref={ref} className="h-40 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
        {lines.length === 0 ? <span className="text-slate-500">No activity yet.</span> : lines.join('\n')}
      </div>
    </div>
  );
}
