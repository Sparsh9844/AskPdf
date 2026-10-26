import { useRef, useState } from 'react';
import {
  Upload, FileText, FileSpreadsheet, File,
  X, CheckCircle2, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { formatBytes } from '../../utils/helpers';
import ProcessingStatus from './ProcessingStatus';
import Button from '../ui/Button';
import { useUpload } from '../../hooks/useUpload';

// Pick an icon based on file extension
function FileIcon({ name = '', className }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return <FileSpreadsheet className={clsx('text-emerald-500', className)} strokeWidth={1.75} />;
  if (['docx', 'doc'].includes(ext))
    return <FileText className={clsx('text-blue-500', className)} strokeWidth={1.75} />;
  if (['txt', 'md', 'markdown'].includes(ext))
    return <File className={clsx('text-gray-500', className)} strokeWidth={1.75} />;
  // PDF
  return <FileText className={clsx('text-red-500', className)} strokeWidth={1.75} />;
}

// Background colour for the file icon box
function fileIconBg(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bg-emerald-50';
  if (['docx', 'doc'].includes(ext))         return 'bg-blue-50';
  if (['txt', 'md', 'markdown'].includes(ext)) return 'bg-gray-100';
  return 'bg-red-50';
}

export default function UploadDropzone({ onUploadComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const {
    file, status, progress, stageIdx, errorMsg,
    upload, reset, STAGES,
  } = useUpload(onUploadComplete);

  const handleFile = (f) => { if (f) upload(f); };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ── Done ──────────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6 flex flex-col items-center gap-3 animate-slide-up">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-emerald-800 text-sm">{file?.name}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Indexed and analysed — your brief is ready</p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>Upload Another</Button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-6 flex flex-col items-center gap-3 animate-slide-up">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-red-800 text-sm">{file?.name ?? 'Upload failed'}</p>
          <p className="text-xs text-red-600 mt-0.5">{errorMsg || 'Something went wrong.'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>Try Again</Button>
      </div>
    );
  }

  // ── Uploading / Processing ─────────────────────────────────────────────────
  if (status === 'uploading') {
    return (
      <div className="border border-gray-200 bg-white rounded-xl p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            fileIconBg(file?.name)
          )}>
            <FileIcon name={file?.name} className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file?.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(file?.size ?? 0)}</p>
          </div>
          <button onClick={reset} className="p-1 rounded-md hover:bg-gray-100 text-gray-400" aria-label="Stop watching this upload">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-700 capitalize">
              {stageIdx >= 0 ? STAGES[stageIdx] : 'Preparing'}…
            </span>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ProcessingStatus stages={STAGES} currentIdx={stageIdx} />
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a document here or click to browse"
        onClick={() => fileRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors duration-200 group',
          dragOver
            ? 'border-gray-900 bg-gray-50'
            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
        )}
      >
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200',
          dragOver ? 'bg-gray-900' : 'bg-gray-100 group-hover:bg-gray-200'
        )}>
          <Upload
            className={clsx('w-5 h-5 transition-colors duration-200', dragOver ? 'text-white' : 'text-gray-500')}
            strokeWidth={1.75}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">Drop your document here</p>
          <p className="text-xs text-gray-500 mt-1">
            or <span className="text-gray-900 font-medium underline underline-offset-2">browse files</span>
            {' '}· max 50 MB
          </p>
        </div>

        {/* Supported format pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'CSV', 'TXT', 'MD'].map(fmt => (
            <span
              key={fmt}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.markdown"
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
