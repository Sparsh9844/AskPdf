/**
 * session.js — the signed-in session, saved locally in the browser.
 *
 * { token, user } is kept in localStorage so a refresh or a new tab stays
 * signed in until the token expires or the user signs out. Storage access is
 * wrapped because it can throw (private mode, blocked site data).
 */

const KEY = 'insight.session';
const UNAUTHORIZED_EVENT = 'insight:unauthorized';

let memory = null;   // fallback when localStorage is unavailable

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : memory;
  } catch {
    return memory;
  }
}

export function saveSession(session) {
  memory = session;
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* memory only */ }
}

export function clearSession() {
  memory = null;
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}

export const getToken = () => loadSession()?.token ?? null;

/** Called by the API client when the server rejects the token. */
export function notifyUnauthorized() {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export function onUnauthorized(handler) {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}
