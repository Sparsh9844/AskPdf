'use strict';

const { connectDB }        = require('./config/db');
const { getRedis }         = require('./config/redis');
const { initVectorStore, backfill } = require('./services/vectorStore');
const { embedText }        = require('./services/embedder');
const { PORT, NODE_ENV }   = require('./config/env');
const app = require('./app');

async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Pick the vector backend (Qdrant if reachable, else MongoDB)
    const vectorBackend = await initVectorStore();

    // Warm up Redis connection (optional — only if REDIS_URL is set)
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      if (NODE_ENV !== 'test') console.log('[Redis] Ping OK');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀  Insight server running`);
      console.log(`   ENV  : ${NODE_ENV}`);
      console.log(`   PORT : ${PORT}`);
      console.log(`   VECTORS : ${vectorBackend}`);
      console.log(`   URL  : http://localhost:${PORT}\n`);
    });

    // Load the embedding model now so the first question doesn't wait for it,
    // then re-index any documents missing from the active vector backend
    embedText('warm-up')
      .then(() => backfill())
      .catch(err => console.error('[startup] Warm-up/backfill failed:', err.message));

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n[server] ${signal} received — shutting down gracefully…`);
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        const redis = getRedis();
        if (redis) redis.disconnect();
        console.log('[server] Closed. Goodbye.\n');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();
