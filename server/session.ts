import { RedisStore } from 'connect-redis';
import session from 'express-session';
import { createClient } from 'redis';
import { env } from './env.js';

export type Redis = ReturnType<typeof createClient>;

export let redis: Redis | null = null;

export async function connectRedis(): Promise<void> {
  if (!env.redisUrl) {
    console.warn('REDIS_URL not set — using in-memory sessions (development only).');
    return;
  }
  redis = createClient({ url: env.redisUrl });
  redis.on('error', (err) => console.error('Redis error', err));
  await redis.connect();
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
    sessionVersion: number;
  }
}

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export function sessionMiddleware() {
  return session({
    name: 'school.sid',
    secret: env.sessionSecret,
    store: redis ? new RedisStore({ client: redis, prefix: 'sess:' }) : undefined,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: EIGHT_HOURS,
    },
  });
}
