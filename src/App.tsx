import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { LinkInput } from './components/LinkInput';
import { OutputFolderPicker } from './components/OutputFolderPicker';
import { TrimFields } from './components/TrimFields';
import { LogPanel } from './components/LogPanel';
import { useSettings } from './hooks/useSettings';
import { useLog } from './hooks/useLog';
import { parseTime } from './lib/format';
import { buildOutputFilename } from './lib/nameTemplate';
import type { ConvertProgress, FileEntry } from './types';

export default function App() {
  const { settings, update, loaded } = useSettings();
  const { lines, append } = useLog();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');
  const [running, setRunning] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Record<string, string>>({}); // jobId -> fileId

  useEffect(() => {
    const off = window.api.onConvertProgress((p: ConvertProgress) => {
      setFiles((prev) => prev.map((f) => {
        if (activeJobs[p.jobId] !== f.id) return f;
        return { ...f, status: p.status, percent: p.percent, message: p.message };
      }));
    });
    return off;
  }, [activeJobs]);

  const importPaths = useCallback(async (paths: string[]) => {
    for (const p of paths) {
      try {
        append(`Probing ${p}`);
        const meta = await window.api.probe(p);
        setFiles((prev) => [
          ...prev,
          { id: crypto.randomUUID(), meta, status: 'queued', percent: 0 }
        ]);
      } catch (e: any) {
        append(`Probe failed for ${p}: ${e?.message || e}`);
      }
    }
  }, [append]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const chooseFolder = async () => {
    const f = await window.api.openFolder();
    if (f) await update({ outputFolder: f });
  };

  const openOutputFolder = () => {
    if (settings.outputFolder) window.api.openPath(settings.outputFolder);
  };

  const convertAll = async () => {
    if (!settings.outputFolder) {
      append('Please choose an output folder first.');
      return;
    }
    const start = parseTime(trimStart);
    const end = parseTime(trimEnd);
    if (start !== undefined && end !== undefined && end <= start) {
      append('Trim end must be greater than trim start.');
      return;
    }

    setRunning(true);
    const queue = files.filter((f) => f.status === 'queued' || f.status === 'failed');
    for (const file of queue) {
      const filename = buildOutputFilename(settings.deceasedName, file.meta.filename);
      try {
        append(`Converting ${file.meta.filename} -> ${filename}`);
        // Mark as processing immediately
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'processing', percent: 0, message: undefined } : f));
        // Kick off conversion
        const startedPromise = window.api.convert({
          inputPath: file.meta.path,
          outputDir: settings.outputFolder!,
          outputFilename: filename,
          trimStartSec: start,
          trimEndSec: end
        });
        // Track jobId via progress events; we don't get jobId synchronously, so listen via wrapper
        const { jobId, outputPath } = await startedPromise;
        setActiveJobs((m) => ({ ...m, [jobId]: file.id }));
        setFiles((prev) => prev.map((f) => f.id === file.id
          ? { ...f, status: 'complete', percent: 100, outputPath }
          : f));
        append(`Done: ${outputPath}`);
      } catch (e: any) {
        const msg = e?.message || 'Conversion failed.';
        setFiles((prev) => prev.map((f) => f.id === file.id
          ? { ...f, status: 'failed', message: msg }
          : f));
        append(`Failed ${file.meta.filename}: ${msg}`);
      }
    }
    setRunning(false);
  };

  const canConvert = useMemo(
    () => !running && loaded && !!settings.outputFolder && files.some((f) => f.status === 'queued' || f.status === 'failed'),
    [running, loaded, settings.outputFolder, files]
  );

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 p-6 space-y-4 max-w-5xl w-full mx-auto">
        <DropZone onFiles={importPaths} />
        <LinkInput
          onImported={(p) => importPaths([p])}
          onLog={append}
          acknowledgedOwnership={settings.acknowledgedOwnership}
          onAckChange={(v) => update({ acknowledgedOwnership: v })}
        />
        <TrimFields
          start={trimStart}
          end={trimEnd}
          onStart={setTrimStart}
          onEnd={setTrimEnd}
          deceasedName={settings.deceasedName}
          onDeceasedName={(v) => update({ deceasedName: v })}
        />
        <OutputFolderPicker
          outputFolder={settings.outputFolder}
          onChoose={chooseFolder}
          onOpen={openOutputFolder}
        />
        <FileList files={files} onRemove={removeFile} onOpen={(p) => window.api.showItemInFolder(p)} />
        <div className="flex items-center gap-3">
          <button
            onClick={convertAll}
            disabled={!canConvert}
            className="rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-2.5 text-sm font-medium"
          >
            {running ? 'Converting…' : 'Convert all'}
          </button>
          <span className="text-xs text-slate-500">
            {files.filter((f) => f.status === 'complete').length} of {files.length} complete
          </span>
        </div>
        <LogPanel lines={lines} />
      </main>
    </div>
  );
}
