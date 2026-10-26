'use strict';

const dns      = require('dns');
const mongoose = require('mongoose');
const { MONGO_URI, NODE_ENV, DNS_FALLBACK_SERVERS } = require('./env');

const CONNECT_ATTEMPTS = 5;
const SRV_CHECK_MS     = 5000;

let isConnected = false;

const log = (...args) => { if (NODE_ENV !== 'test') console.log('[MongoDB]', ...args); };

function withTimeout(promise, ms) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, reject) => { t = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: 'ETIMEOUT' })), ms); }),
  ]).finally(() => clearTimeout(t));
}

/**
 * mongodb+srv:// URIs need a DNS SRV lookup. Many home routers answer normal
 * lookups but fail SRV ones (querySrv ECONNREFUSED / ETIMEOUT) — they only
 * work after another app (e.g. Compass) has resolved the name and the router
 * has cached it. If the system resolver can't answer, switch Node's resolver
 * to public DNS so the server can connect on its own.
 */
async function ensureSrvResolvable(uri) {
  if (!uri.startsWith('mongodb+srv://')) return;
  const host = new URL(uri).hostname;
  const srv  = `_mongodb._tcp.${host}`;

  try {
    await withTimeout(dns.promises.resolveSrv(srv), SRV_CHECK_MS);
    return;
  } catch (err) {
    const fallback = [...DNS_FALLBACK_SERVERS, ...dns.getServers().filter(s => !DNS_FALLBACK_SERVERS.includes(s))];
    console.warn(
      `[MongoDB] System DNS (${dns.getServers().join(', ')}) could not resolve ${srv} (${err.code ?? err.message}).\n` +
      `          Using public DNS for lookups: ${DNS_FALLBACK_SERVERS.join(', ')}`
    );
    dns.setServers(fallback);
  }
}

async function connectDB() {
  if (isConnected) return;

  await ensureSrvResolvable(MONGO_URI);

  const opts = {
    serverSelectionTimeoutMS: 8000,
  };

  // Retry with backoff so a brief network hiccup at startup doesn't kill the server
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, opts);
      break;
    } catch (err) {
      if (attempt >= CONNECT_ATTEMPTS) throw err;
      const wait = Math.min(2000 * attempt, 10_000);
      console.warn(`[MongoDB] Connection attempt ${attempt}/${CONNECT_ATTEMPTS} failed (${err.message}). Retrying in ${wait / 1000}s…`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  isConnected = true;

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] Disconnected');
  });

  log('Connected to', mongoose.connection.host);
}

module.exports = { connectDB };
