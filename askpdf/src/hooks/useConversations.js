import { useCallback } from 'react';
import { conversationsApi } from '../services/api';
import { useResource } from './useResource';

/**
 * useConversations — conversation list (shared, cached across pages),
 * optionally filtered by documentId.
 */
export function useConversations(documentId) {
  const { data, loading, error, refetch, mutate } = useResource(
    `conversations:${documentId ?? 'all'}`,
    () => conversationsApi.list(documentId ?? undefined),
  );

  const deleteConv = useCallback(async (id) => {
    mutate(prev => (prev ?? []).filter(c => c.id !== id));
    try {
      await conversationsApi.delete(id);
    } catch {
      refetch();
    }
  }, [mutate, refetch]);

  return { conversations: data ?? [], loading, error, refetch, deleteConv };
}
