import { useEffect, useState } from 'react';

export function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const off = window.api.onLog((line) => {
      setLines((prev) => [...prev.slice(-499), line]);
    });
    return off;
  }, []);
  const append = (line: string) => setLines((prev) => [...prev.slice(-499), `[ui] ${line}`]);
  return { lines, append };
}
