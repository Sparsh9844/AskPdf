'use strict';

/**
 * sseManager.js
 *
 * In-process Server-Sent Events broker.
 * Keeps a registry of active SSE response objects keyed by docId.
 * The pipeline calls sseManager.emit() to push progress to connected clients.
 *
 * Works for single-process deployments (dev + small prod).
 * For multi-process: swap the registry for a Redis pub/sub channel.
 */

const { SSE_HEARTBEAT_MS } = require('../config/constants');

// Map<docId, Set<res>>
const _clients = new Map();

// res → cleanup, so terminal events can close the stream server-side
const _cleanups = new WeakMap();
const TERMINAL_EVENTS = new Set(['done', 'error']);

/**
 * Register an SSE client.
 * Sends the SSE headers and starts a heartbeat comment to keep the connection alive.
 *
 * @param {string} docId
 * @param {import('express').Response} res
 * @returns {() => void}  cleanup function — call on client disconnect
 */
function addClient(docId, res) {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',   // disable nginx buffering
  });
  res.flushHeaders?.();

  // Initial comment to establish stream
  res.write(': connected\n\n');

  // Heartbeat — prevents proxy / browser timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, SSE_HEARTBEAT_MS);

  // Register
  if (!_clients.has(docId)) _clients.set(docId, new Set());
  _clients.get(docId).add(res);

  // Return cleanup
  const cleanup = () => {
    clearInterval(heartbeat);
    _clients.get(docId)?.delete(res);
    if (_clients.get(docId)?.size === 0) _clients.delete(docId);
  };
  _cleanups.set(res, cleanup);
  return cleanup;
}

/**
 * Emit an SSE event to all clients watching a document.
 *
 * @param {string} docId
 * @param {string} event   event name  (e.g. 'progress', 'done', 'error')
 * @param {object} data    JSON-serialisable payload
 */
function emit(docId, event, data) {
  const clients = _clients.get(docId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try {
      res.write(payload);
      // Nothing follows a terminal event — close the stream instead of
      // holding the connection open with heartbeats
      if (TERMINAL_EVENTS.has(event)) {
        _cleanups.get(res)?.();
        res.end();
      }
    } catch {
      // client already disconnected — will be cleaned up by its close handler
    }
  }
}

/**
 * Check whether any client is currently watching a document.
 * @param {string} docId
 * @returns {boolean}
 */
function hasClients(docId) {
  return (_clients.get(docId)?.size ?? 0) > 0;
}

module.exports = { addClient, emit, hasClients };
