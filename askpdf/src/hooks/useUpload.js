import { useState, useCallback, useRef, useEffect } from 'react';
import { documentsApi } from '../services/api';

const STAGES = ['uploading', 'parsing', 'chunking', 'embedding', 'indexing', 'analyzing', 'completed'];

// All file types the backend accepts
const ALLOWED_EXTS  = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.markdown'];
const ALLOWED_LABEL = 'PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, MD';

function isAllowed(file) {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTS.some(ext => name.endsWith(ext));
}

export function useUpload(onComplete) {
  const [file,     setFile]     = useState(null);
  const [status,   setStatus]   = useState('idle');
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(-1);
  const [errorMsg, setErrorMsg] = useState('');
  const [docId,    setDocId]    = useState(null);
  const abortRef = useRef(null);

  const stageIndex = (s) => STAGES.indexOf(s);

  // Stop watching progress if the uploader goes away
  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    abortRef.current?.abort();

    if (!isAllowed(selectedFile)) {
      setFile(selectedFile);
      setStatus('error');
      setErrorMsg(`Unsupported file type. Allowed: ${ALLOWED_LABEL}`);
      return;
    }

    setFile(selectedFile);
    setStatus('uploading');
    setProgress(5);
    setStageIdx(0);
    setErrorMsg('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── 1. XHR upload with progress ────────────────────────────────────────
      const doc = await documentsApi.upload(selectedFile, (pct) => {
        setProgress(Math.min(20, Math.round(pct * 0.2)));
      }, controller.signal);

      setDocId(doc.id);
      setStageIdx(1);
      setProgress(20);

      // ── 2. SSE pipeline progress ───────────────────────────────────────────
      let finished = false;
      for await (const ev of documentsApi.streamProgress(doc.id, controller.signal)) {
        if (ev.type === 'progress') {
          const idx = stageIndex(ev.data.stage);
          if (idx !== -1)  setStageIdx(idx);
          if (ev.data.pct) setProgress(ev.data.pct);
        } else if (ev.type === 'done') {
          setProgress(100);
          setStageIdx(STAGES.length - 1);
          finished = true;
          break;
        } else if (ev.type === 'error') {
          throw new Error(ev.data?.message ?? 'Processing failed.');
        }
      }
      if (!finished) throw new Error('Lost connection while processing. Refresh to check the document status.');

      setStatus('done');
      if (onComplete) onComplete({ ...doc, status: 'completed' });

    } catch (err) {
      if (controller.signal.aborted) return;   // cancelled — reset() already cleared the UI
      setStatus('error');
      setErrorMsg(err.message ?? 'Upload failed.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [onComplete]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setStageIdx(-1);
    setErrorMsg('');
    setDocId(null);
  }, []);

  return { file, status, progress, stageIdx, errorMsg, docId, upload, reset, STAGES, ALLOWED_LABEL, ALLOWED_EXTS };
}
