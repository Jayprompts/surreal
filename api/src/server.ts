import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './db/client.js';
import { startKeyExpiry } from './jobs/expireKeys.js';

const server = http.createServer(app);
let stopJobs: (() => void) | undefined;

async function start() {
  try {
    await connectDB();
    stopJobs = startKeyExpiry();
    server.listen(env.PORT, () => {
      console.log(`🚀 Surreal API on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  stopJobs?.();
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force-quit if it hangs
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();
