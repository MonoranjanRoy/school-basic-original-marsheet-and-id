/** Environment configuration. See README → "Environment variables". */
// Railway deployments always count as production, even if NODE_ENV was not set.
const isProd =
  process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_ENVIRONMENT;

function required(name: string, devDefault?: string): string {
  const v = process.env[name];
  if (v) return v;
  if (!isProd && devDefault !== undefined) return devDefault;
  throw new Error(`Missing required environment variable ${name}`);
}

export const env = {
  isProd,
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5433/postgres'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  poolMax: Number(process.env.PG_POOL_MAX || 20),
  /** Requests handled at once before new ones get "busy, try again" (load shedding). */
  maxInFlight: Number(process.env.MAX_IN_FLIGHT || 4000),
  /** Redis is required in production for sessions and login rate limiting. */
  redisUrl: isProd ? required('REDIS_URL') : process.env.REDIS_URL || '',
  sessionSecret: required('SESSION_SECRET', 'dev-only-session-secret-change-me'),
  /** First head-teacher account, created only when no head teacher exists yet. */
  headTeacherUsername: process.env.HEAD_TEACHER_USERNAME || '',
  headTeacherPassword: process.env.HEAD_TEACHER_PASSWORD || '',
};

if (isProd && env.sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long.');
}
