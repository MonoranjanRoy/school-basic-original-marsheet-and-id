/**
 * Local development launcher.
 *
 *   npm run dev          → API server (auto-restart) + Vite dev server
 *   npm run api          → only the database + API (when Vite is already running)
 *   npm run start:local  → the built production server (after `npm run build`)
 *
 * If DATABASE_URL is not set, a local Postgres-compatible database (PGlite)
 * is started automatically and stored in .local-db/. Redis is optional
 * locally: without REDIS_URL, sessions are kept in memory.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = process.argv.includes('--built');
const apiOnly = process.argv.includes('--api-only');

if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const env = { ...process.env };
env.HEAD_TEACHER_USERNAME ||= 'headteacher';
env.HEAD_TEACHER_PASSWORD ||= 'change-me-please';
// 3100 avoids clashing with other local projects that commonly use port 3000.
env.PORT ||= built ? '4000' : '3100';
env.API_PORT = env.PORT;

if (!env.DATABASE_URL) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const db = await PGlite.create(path.join(root, '.local-db'));
  const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5433, maxConnections: 20 });
  await server.start();
  env.DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5433/postgres';
  env.PG_POOL_MAX = '5';
  console.log('Local database (PGlite) running on 127.0.0.1:5433, stored in .local-db/');
}

const children = [];
/** Runs a Node script (no shell, so arguments are never re-interpreted). */
function run(script, args = [], extraEnv = {}) {
  const child = spawn(process.execPath, [script, ...args], { cwd: root, env: { ...env, ...extraEnv }, stdio: 'inherit' });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`${script} exited with code ${code}`);
  });
  return child;
}

if (built) {
  run('build/server/index.js');
  console.log(`\nOpen http://localhost:${env.PORT}  (portal: /portal/login)`);
} else {
  run('node_modules/tsx/dist/cli.mjs', ['watch', 'server/index.ts'], { VITE_DEV: '1' });
  if (apiOnly) {
    console.log(`\nAPI running on http://127.0.0.1:${env.PORT}. Open the website through your Vite server (e.g. http://localhost:5173).`);
  } else {
    run('node_modules/vite/bin/vite.js');
    console.log('\nWebsite: the Vite address shown below (usually http://localhost:5173). Portal: /portal/login');
  }
}
console.log(`First sign-in: username "${env.HEAD_TEACHER_USERNAME}", password "${env.HEAD_TEACHER_PASSWORD}" (you will be asked to change it).\n`);

const stop = () => {
  for (const c of children) c.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
