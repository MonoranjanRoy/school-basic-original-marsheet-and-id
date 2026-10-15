import { createApp } from './app.js';
import { migrate, pool } from './db.js';
import { env } from './env.js';
import { connectRedis, redis } from './session.js';
import { bootstrap } from './siteData.js';

async function main() {
  await migrate();
  await bootstrap();
  await connectRedis();
  const app = await createApp();
  const server = app.listen(env.port, () => {
    console.log(`School website listening on http://localhost:${env.port}`);
  });
  // Keep connections from Railway's proxy open longer than the proxy does (avoids random 502s),
  // and drop clients that send requests too slowly.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 60_000;

  const shutdown = () => {
    server.close(async () => {
      await pool.end().catch(() => {});
      await redis?.quit().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// A stray rejected promise is logged, not fatal. A truly unexpected exception
// leaves the process in an unknown state, so it exits and Railway restarts it.
process.on('unhandledRejection', (err) => console.error('Unhandled promise rejection', err));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — restarting', err);
  process.exit(1);
});

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
