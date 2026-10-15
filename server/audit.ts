import { query } from './db.js';
import type { SessionUser } from './security.js';

export async function audit(user: SessionUser | null, action: string, detail = ''): Promise<void> {
  try {
    await query('INSERT INTO audit_log (user_id, username, action, detail) VALUES ($1, $2, $3, $4)', [
      user?.id ?? null,
      user?.username ?? null,
      action,
      detail.slice(0, 500),
    ]);
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}
