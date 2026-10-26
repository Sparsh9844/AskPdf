import { useCallback } from 'react';
import { documentsApi } from '../services/api';
import { useResource, usePolling } from './useResource';
import { isProcessing } from '../utils/helpers';

const fetchDocuments = () => documentsApi.list();

/**
 * useDocuments — the document list (shared, cached across pages).
 * Exposes helpers for delete and reprocess that update local state optimistically.
 * Refreshes itself while any document is still processing.
 */
export function useDocuments() {
  const { data, loading, error, refetch, mutate } = useResource('documents', fetchDocuments);
  const documents = data ?? [];

  usePolling(documents.some(d => isProcessing(d.status)), refetch);

  const deleteDoc = useCallback(async (id) => {
    mutate(prev => (prev ?? []).filter(d => d.id !== id));
    try {
      await documentsApi.delete(id);
    } catch {
      refetch(); // rollback by re-fetching
    }
  }, [mutate, refetch]);

  const reprocessDoc = useCallback(async (id) => {
    mutate(prev => (prev ?? []).map(d =>
      d.id === id ? { ...d, status: 'uploading', chunks: 0, embeddings: 0, brief: null } : d
    ));
    try {
      const updated = await documentsApi.reprocess(id);
      mutate(prev => (prev ?? []).map(d => (d.id === id ? updated : d)));
    } catch {
      refetch();
    }
  }, [mutate, refetch]);

  return { documents, setDocuments: mutate, loading, error, refetch, deleteDoc, reprocessDoc };
}
