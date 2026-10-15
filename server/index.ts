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

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
