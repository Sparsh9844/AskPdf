import { useEffect, useCallback, useSyncExternalStore } from 'react';

/**
 * useResource — tiny shared, stale-while-revalidate cache for API data.
 *
 * Every component using the same key shares one entry: navigating between
 * pages shows cached data instantly while a background refresh runs, and
 * concurrent requests for a key are merged into one.
 *
 *   const { data, error, loading, refetch, mutate } = useResource('documents', documentsApi.list);
 */

const entries = new Map();   // key → { data, error, loading, promise, fetchedAt, subs:Set }
let generation = 0;          // bumped by clearResources — late responses from before are ignored

function entry(key) {
  if (!entries.has(key)) {
    entries.set(key, { data: undefined, error: null, loading: false, promise: null, fetchedAt: 0, subs: new Set(), snapshot: null });
  }
  return entries.get(key);
}

function notify(e) {
  e.snapshot = null;
  e.subs.forEach(fn => fn());
}

function snapshot(e) {
  // useSyncExternalStore needs a stable object between changes
  e.snapshot ??= { data: e.data, error: e.error, loading: e.loading };
  return e.snapshot;
}

/** Fetch (deduplicated) and store the result. */
function revalidate(key, fetcher) {
  const e = entry(key);
  if (e.promise) return e.promise;
  e.loading = true;
  notify(e);
  const gen = generation;
  const promise = fetcher()
    .then(data => { if (gen === generation) { e.data = data; e.error = null; e.fetchedAt = Date.now(); } })
    .catch(err => { if (gen === generation) e.error = err.message ?? String(err); })
    .finally(() => {
      if (e.promise === promise) { e.loading = false; e.promise = null; }
      notify(e);
    });
  e.promise = promise;
  return promise;
}

/** Update cached data locally (optimistic updates). */
export function mutateResource(key, updater) {
  const e = entry(key);
  e.data = typeof updater === 'function' ? updater(e.data) : updater;
  notify(e);
}

/** Drop all cached data (on sign-in / sign-out); pages refetch when they mount. */
export function clearResources() {
  generation++;
  for (const e of entries.values()) {
    e.promise = null;
    e.loading = false;
    e.data = undefined;
    e.error = null;
    e.fetchedAt = 0;
    notify(e);
  }
}

/** Mark every key starting with `prefix` stale and refresh the ones in use. */
export function invalidateResources(prefix, fetchers = {}) {
  for (const [key, e] of entries) {
    if (!key.startsWith(prefix)) continue;
    e.fetchedAt = 0;
    if (e.subs.size && fetchers[key]) revalidate(key, fetchers[key]);
  }
}

/**
 * @param {string|null} key        cache key (null = disabled)
 * @param {() => Promise<any>} fetcher
 * @param {{ staleMs?: number }} [opts]  refresh on mount if older than this
 */
export function useResource(key, fetcher, { staleMs = 15_000 } = {}) {
  const subscribe = useCallback((fn) => {
    if (!key) return () => {};
    const e = entry(key);
    e.subs.add(fn);
    return () => e.subs.delete(fn);
  }, [key]);

  const state = useSyncExternalStore(
    subscribe,
    () => (key ? snapshot(entry(key)) : EMPTY),
  );

  useEffect(() => {
    if (!key) return;
    const e = entry(key);
    if (Date.now() - e.fetchedAt > staleMs) revalidate(key, fetcher);
    // fetcher identity is irrelevant — the key defines the resource
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs]);

  const refetch = useCallback(() => (key ? revalidate(key, fetcher) : Promise.resolve()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]);
  const mutate  = useCallback((updater) => key && mutateResource(key, updater), [key]);

  return {
    data:    state.data,
    error:   state.error,
    // "loading" only when there is nothing to show yet
    loading: state.data === undefined && (state.loading || !state.error),
    refreshing: state.loading,
    refetch,
    mutate,
  };
}

const EMPTY = { data: undefined, error: null, loading: false };

/** Re-run `refetch` every `ms` while `active` is true (e.g. a document is processing). */
export function usePolling(active, refetch, ms = 4_000) {
  useEffect(() => {
    if (!active) return;
    const t = setInterval(refetch, ms);
    return () => clearInterval(t);
  }, [active, refetch, ms]);
}
