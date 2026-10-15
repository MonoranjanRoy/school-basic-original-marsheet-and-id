import type { NextFunction, Request, Response } from 'express';
import { query } from './db.js';
import { redis } from './session.js';

export type Role = 'head_teacher' | 'faculty' | 'student';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  /** Students only. */
  studentId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Loads the signed-in user for every request; drops sessions of disabled or reset accounts. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const id = req.session?.userId;
  if (!id) return next();
  try {
    const rows = await query<{
      id: string;
      username: string;
      display_name: string;
      role: Role;
      must_change_password: boolean;
      active: boolean;
      session_version: number;
      student_id: string | null;
    }>(
      'SELECT id, username, display_name, role, must_change_password, active, session_version, student_id FROM users WHERE id = $1',
      [id],
    );
    const u = rows[0];
    if (!u || !u.active || u.session_version !== req.session.sessionVersion) {
      req.session.destroy(() => next());
      return;
    }
    req.user = {
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      mustChangePassword: u.must_change_password,
      studentId: u.student_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Please sign in.'));
  // Until the temporary password is changed, only the /api/auth endpoints work.
  if (req.user.mustChangePassword) {
    return next(new HttpError(403, 'Please change your temporary password first.'));
  }
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Please sign in.'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do that.'));
    next();
  };

/**
 * CSRF protection: state-changing API requests must come from this site.
 * Combined with SameSite=Lax cookies this blocks cross-site form posts.
 */
export function sameOriginOnly(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin') || req.get('referer');
  // Behind a hosting proxy the public host may arrive as X-Forwarded-Host.
  const hosts = [req.get('host'), ...(req.get('x-forwarded-host') || '').split(',')].map((h) => h?.trim()).filter(Boolean);
  if (!origin || hosts.length === 0) return next(new HttpError(403, 'Request blocked.'));
  try {
    if (!hosts.includes(new URL(origin).host)) return next(new HttpError(403, 'Request blocked.'));
  } catch {
    return next(new HttpError(403, 'Request blocked.'));
  }
  next();
}

// ---------- Rate limiting (Redis, or memory in development) ----------
const memoryHits = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the key has exceeded `limit` hits within `windowSec`. */
export async function rateLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (redis?.isReady) {
    try {
      const k = `rl:${key}`;
      const count = await redis.incr(k);
      if (count === 1) await redis.expire(k, windowSec);
      return count > limit;
    } catch (err) {
      // If Redis has a problem, keep counting in memory rather than failing every sign-in.
      console.error('Rate limit (Redis) failed; using memory', err);
    }
  }
  if (memoryHits.size > 100_000) memoryHits.clear();
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt < now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export async function clearRateLimit(key: string): Promise<void> {
  memoryHits.delete(key);
  if (redis?.isReady) await redis.del(`rl:${key}`).catch(() => {});
}

/**
 * Load shedding: when too many requests are already being handled, answer new
 * ones at once with "busy, try again" instead of letting them pile up until
 * the server runs out of memory. Visitors retry; the server keeps running.
 */
export function overloadGuard(maxInFlight: number) {
  let inFlight = 0;
  return (_req: Request, res: Response, next: NextFunction) => {
    if (inFlight >= maxInFlight) {
      res.set('Retry-After', '5');
      res.status(503).type('text').send('The school website is very busy right now. Please try again in a few seconds.');
      return;
    }
    inFlight++;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        inFlight--;
      }
    };
    res.on('finish', finish);
    res.on('close', finish);
    next();
  };
}
