import { statsApi } from '../services/api';
import { useResource } from './useResource';

/**
 * useStats — dashboard KPIs (cached; refreshed in the background on revisit).
 * Shows zeros on the very first load rather than made-up numbers.
 */
const EMPTY = {
  totalDocuments: 0, processedDocuments: 0, totalConversations: 0, totalChunks: 0,
  storageUsedMB: 0, avgResponseTimeMs: 0, totalQuestions: 0, groundedRate: null, totalNotes: 0,
};

const fetchStats = () => statsApi.get();

export function useStats() {
  const { data, loading, error } = useResource('stats', fetchStats, { staleMs: 5_000 });
  return { stats: data ?? EMPTY, loading, error };
}
