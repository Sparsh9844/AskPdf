/**
 * api.js — Centralised HTTP client for the Insight backend.
 *
 * All components import from here, never calling fetch() directly.
 * Every request carries the signed-in user's token; a 401 from the server
 * signs the user out (see services/session.js).
 *
 * Base URL is picked up from the Vite env variable VITE_API_URL,
 * falling back to localhost:5000 for local dev.
 */

import { getToken, notifyUnauthorized } from './session';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** A 401 on anything but the sign-in calls means the session is gone. */
function handleUnauthorized(status, path) {
  if (status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
    notifyUnauthorized();
  }
}

// ── Internal fetch wrapper ────────────────────────────────────────────────────

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}  parsed JSON or throws { message, status }
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      // Only set Content-Type for JSON bodies — multipart must omit it
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...authHeader(),
      ...options.headers,
    },
  });

  handleUnauthorized(res.status, path);

  // 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const err = new Error(data?.error ?? data?.message ?? 'Request failed');
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
}

// ── Convenience helpers ───────────────────────────────────────────────────────
const get    = (path, opts)   => request(path, { method: 'GET',    ...opts });
const post   = (path, body, opts) => request(path, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body), ...opts });
const patch  = (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) });
const del    = (path)         => request(path, { method: 'DELETE' });

/**
 * Download an authenticated file (the token can't ride on a plain <a href>).
 * Uses the server's Content-Disposition filename when present.
 */
async function downloadFile(path, fallbackName) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeader() });
  handleUnauthorized(res.status, path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? 'Download failed');
  }
  const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url  = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /api/auth/register → { token, user } */
  register(name, email, password) {
    return post('/api/auth/register', { name, email, password });
  },

  /** POST /api/auth/login → { token, user } */
  login(email, password) {
    return post('/api/auth/login', { email, password });
  },

  /** GET /api/auth/me */
  me() {
    return get('/api/auth/me');
  },

  /** PATCH /api/auth/me { name } */
  updateProfile(fields) {
    return patch('/api/auth/me', fields);
  },

  /** POST /api/auth/password */
  changePassword(currentPassword, newPassword) {
    return post('/api/auth/password', { currentPassword, newPassword });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const documentsApi = {
  /** GET /api/documents?status= */
  list(status) {
    const qs = status ? `?status=${status}` : '';
    return get(`/api/documents${qs}`);
  },

  /** GET /api/documents/:id */
  get(id) {
    return get(`/api/documents/${id}`);
  },

  /**
   * POST /api/documents/upload   (multipart/form-data)
   * @param {File} file
   * @param {(pct: number) => void} [onProgress]  upload progress callback
   * @param {AbortSignal} [signal]
   * @returns {Promise<Document>}
   */
  upload(file, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/api/documents/upload`);
      const { Authorization } = authHeader();
      if (Authorization) xhr.setRequestHeader('Authorization', Authorization);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { resolve({}); }
        } else {
          handleUnauthorized(xhr.status, '/api/documents/upload');
          let message = 'Upload failed';
          try { message = JSON.parse(xhr.responseText)?.error ?? message; } catch { /* non-JSON body */ }
          const err = new Error(message);
          err.status = xhr.status;
          reject(err);
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(form);
    });
  },

  /** DELETE /api/documents/:id */
  delete(id) {
    return del(`/api/documents/${id}`);
  },

  /** POST /api/documents/:id/reprocess */
  reprocess(id) {
    return post(`/api/documents/${id}/reprocess`);
  },

  /** POST /api/documents/:id/brief — (re)generate the intelligence brief */
  generateBrief(id) {
    return post(`/api/documents/${id}/brief`);
  },

  /** POST /api/documents/:id/quiz — { count, difficulty, focus } → { questions } */
  quiz(id, opts) {
    return post(`/api/documents/${id}/quiz`, opts);
  },

  /**
   * Stream document processing progress (SSE).
   * Event types: progress ({ stage, pct }), done, error.
   * (fetch-based rather than EventSource so the auth header can be sent)
   *
   * @param {string} docId
   * @param {AbortSignal} [signal]
   */
  streamProgress(docId, signal) {
    return streamSSE(`/api/documents/${docId}/stream`, null, signal, 'GET');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

export const statsApi = {
  /** GET /api/stats */
  get() {
    return get('/api/stats');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const conversationsApi = {
  /** GET /api/conversations?documentId= */
  list(documentId) {
    const qs = documentId ? `?documentId=${documentId}` : '';
    return get(`/api/conversations${qs}`);
  },

  /** POST /api/conversations  { documentIds, title? } */
  create(documentIds, title) {
    return post('/api/conversations', { documentIds, title });
  },

  /** PATCH /api/conversations/:id  { title } */
  rename(id, title) {
    return patch(`/api/conversations/${id}`, { title });
  },

  /** PATCH /api/conversations/:id  { documentIds } — change research scope */
  updateScope(id, documentIds) {
    return patch(`/api/conversations/${id}`, { documentIds });
  },

  /** Download the conversation as a cited Markdown report */
  export(id) {
    return downloadFile(`/api/conversations/${id}/export`, 'insight-conversation.md');
  },

  /** DELETE /api/conversations/:id */
  delete(id) {
    return del(`/api/conversations/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SSE over POST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request a Server-Sent Events stream and parse it.
 * (fetch + ReadableStream rather than EventSource, which can't POST or send headers.)
 *
 * @param {string} path
 * @param {object|null} body
 * @param {AbortSignal} [signal]
 * @param {'GET'|'POST'} [method]
 * @returns {AsyncGenerator<{ type: string, data: any }>}
 */
async function* streamSSE(path, body, signal, method = 'POST') {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  handleUnauthorized(res.status, path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? 'Stream request failed');
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';
  // Kept across reads — an event can be split over several network chunks
  let eventType = '';
  let dataLine  = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLine = line.slice(5).trim();
        } else if (line === '') {
          // Dispatch event
          if (eventType && dataLine) {
            let data;
            try { data = JSON.parse(dataLine); } catch { data = undefined; /* skip malformed */ }
            if (data !== undefined) yield { type: eventType, data };
          }
          eventType = '';
          dataLine  = '';
        }
      }
    }
  } finally {
    // Runs when the caller stops early (break/throw) too — release the
    // connection instead of leaving it open in the browser's pool
    reader.cancel().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export const messagesApi = {
  /** GET /api/conversations/:convId/messages */
  list(convId) {
    return get(`/api/conversations/${convId}/messages`);
  },

  /** POST /api/conversations/:convId/messages  { content, mode } */
  send(convId, content, mode = 'quick') {
    return post(`/api/conversations/${convId}/messages`, { content, mode });
  },

  /**
   * Stream a research answer.
   * Event types: step (research trace), sources, token, done, error.
   *
   *   for await (const event of messagesApi.stream(convId, text, 'deep', signal)) { … }
   */
  stream(convId, content, mode = 'quick', signal) {
    return streamSSE(`/api/conversations/${convId}/messages/stream`, { content, mode }, signal);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FACT-CHECK
// ─────────────────────────────────────────────────────────────────────────────

export const verifyApi = {
  /**
   * Check text against documents.
   * Event types: claims (string[]), verdict (one claim result), done ({ claims, summary }), error.
   */
  stream(documentIds, text, signal) {
    return streamSSE('/api/verify/stream', { documentIds, text }, signal);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTEBOOK
// ─────────────────────────────────────────────────────────────────────────────

export const notesApi = {
  /** GET /api/notes */
  list() {
    return get('/api/notes');
  },

  /** POST /api/notes */
  create(note) {
    return post('/api/notes', note);
  },

  /** PATCH /api/notes/:id  { title?, content? } */
  update(id, fields) {
    return patch(`/api/notes/${id}`, fields);
  },

  /** DELETE /api/notes/:id */
  delete(id) {
    return del(`/api/notes/${id}`);
  },

  /** Download the notebook as a Markdown report (optionally some notes only) */
  export(ids) {
    return downloadFile(`/api/notes/export${ids?.length ? `?ids=${ids.join(',')}` : ''}`, 'insight-notebook.md');
  },
};
