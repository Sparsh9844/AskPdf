import { useState, useCallback } from 'react';
import { documentsApi } from '../services/api';
import { useResource, mutateResource, usePolling } from './useResource';
import { isProcessing } from '../utils/helpers';

/**
 * useDocument — a single document (cached), with brief (re)generation.
 * Refreshes itself while the document is still processing.
 */
export function useDocument(id) {
  const { data, loading, error: loadError, refetch, mutate } = useResource(
    id ? `document:${id}` : null,
    () => documentsApi.get(id),
  );
  usePolling(isProcessing(data?.status), refetch);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);

  const generateBrief = useCallback(async () => {
    try {
      setGenerating(true);
      setError(null);
      const fresh = await documentsApi.generateBrief(id);
      mutate(fresh);
      // keep the shared list (cards, dashboard) in sync
      mutateResource('documents', prev => prev?.map(d => (d.id === id ? fresh : d)));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [id, mutate]);

  return { doc: data ?? null, loading, error: error ?? loadError, generating, refetch, generateBrief };
}
