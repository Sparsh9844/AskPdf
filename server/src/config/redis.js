'use strict';

/**
 * redis.js
 *
 * Redis is now OPTIONAL — it is only used by sseManager for heartbeats.
 * Vector search has moved entirely to MongoDB Atlas.
 *
 * If REDIS_URL is not set, getRedis() returns null and callers must
 * handle the null case gracefully.
 */

const { REDIS_URL, NODE_ENV } = require('./env');

let client = null;
let attempted = false;

function getRedis() {
  if (attempted) return client;
  attempted = true;

  if (!REDIS_URL) {
    if (NODE_ENV !== 'test') {
      console.warn('[Redis] REDIS_URL not set — Redis disabled. SSE will use in-process broker only.');
    }
    return null;
  }

  const Redis = require('ioredis');

  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => {
    if (NODE_ENV !== 'test') console.log('[Redis] Connected');
  });

  client.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
  });

  return client;
}

module.exports = { getRedis };
