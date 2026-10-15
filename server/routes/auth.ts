import { Router, type Request } from 'express';
import { z } from 'zod';
import { audit } from '../audit.js';
import { query } from '../db.js';
import { DUMMY_HASH, hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../passwords.js';
import { dateOfBirth, studentId } from '../schema.js';
import { clearRateLimit, HttpError, rateLimited, type Role, type SessionUser } from '../security.js';
import { validate } from '../validate.js';

export const authRouter = Router();

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  password_hash: string | null;
  must_change_password: boolean;
  active: boolean;
  session_version: number;
  student_id: string | null;
  date_of_birth: string | null;
}

const toSessionUser = (u: UserRow): SessionUser => ({
  id: u.id,
  username: u.username,
  displayName: u.display_name,
  role: u.role,
  mustChangePassword: u.must_change_password,
  studentId: u.student_id,
});

/** Starts a fresh session for the user (new session id prevents session fixation). */
async function signIn(req: Request, u: UserRow): Promise<SessionUser> {
  await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
  req.session.userId = u.id;
  req.session.sessionVersion = u.session_version;
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [u.id]);
  const user = toSessionUser(u);
  await audit(user, 'login');
  return user;
}

// ---------------------------------------------------------------------------
// Staff and head teacher: username + password
// ---------------------------------------------------------------------------
const loginInput = z.object({
  username: z.string().trim().toLowerCase().min(1).max(40),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = validate(loginInput, req.body);
  const ip = req.ip ?? 'unknown';
  const userKey = `login:${username}`;
  if ((await rateLimited(`login-ip:${ip}`, 50, 15 * 60)) || (await rateLimited(userKey, 10, 15 * 60))) {
    throw new HttpError(429, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
  }

  const [u] = await query<UserRow>('SELECT * FROM users WHERE username = $1', [username]);
  // Always run one bcrypt comparison so timing doesn't reveal which usernames exist.
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok || !u.active || u.role === 'student' || !u.password_hash) {
    await audit(null, 'login.failed', username);
    throw new HttpError(401, 'Incorrect username or password.');
  }

  await clearRateLimit(userKey);
  res.json({ user: await signIn(req, u) });
});

// ---------------------------------------------------------------------------
// Students: student ID + date of birth
// ---------------------------------------------------------------------------
const studentLoginInput = z.object({ studentId, dateOfBirth });

authRouter.post('/student-login', async (req, res) => {
  const input = validate(studentLoginInput, req.body);
  const ip = req.ip ?? 'unknown';
  const idKey = `student-login:${input.studentId.toLowerCase()}`;
  // A date of birth is easy to guess, so attempts are limited tightly.
  if ((await rateLimited(`student-login-ip:${ip}`, 30, 15 * 60)) || (await rateLimited(idKey, 5, 60 * 60))) {
    throw new HttpError(429, 'Too many sign-in attempts. Please wait an hour or ask the school office for help.');
  }

  const [u] = await query<UserRow>(
    // date_of_birth comes back as 'YYYY-MM-DD' (see the DATE type parser in db.ts).
    "SELECT * FROM users WHERE role = 'student' AND lower(student_id) = lower($1)",
    [input.studentId],
  );
  if (!u || !u.active || u.date_of_birth !== input.dateOfBirth) {
    await audit(null, 'login.failed', `student ${input.studentId}`);
    throw new HttpError(401, 'The student ID and date of birth do not match our records.');
  }

  await clearRateLimit(idKey);
  res.json({ user: await signIn(req, u) });
});

// ---------------------------------------------------------------------------
// Everyone
// ---------------------------------------------------------------------------
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('school.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

const changeInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`).max(200),
});

authRouter.post('/change-password', async (req, res) => {
  if (!req.user) throw new HttpError(401, 'Please sign in.');
  if (req.user.role === 'student') throw new HttpError(400, 'Students sign in with their student ID and date of birth, so there is no password to change.');
  const { currentPassword, newPassword } = validate(changeInput, req.body);
  if (currentPassword === newPassword) throw new HttpError(400, 'Choose a password different from the current one.');
  if (newPassword.toLowerCase().includes(req.user.username)) throw new HttpError(400, 'The password must not contain your username.');

  const [row] = await query<{ password_hash: string | null }>('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!row?.password_hash || !(await verifyPassword(currentPassword, row.password_hash))) {
    throw new HttpError(400, 'Your current password is incorrect.');
  }
  // Bump the session version: other devices are signed out, this one stays signed in.
  const [updated] = await query<{ session_version: number }>(
    `UPDATE users SET password_hash = $1, must_change_password = false, session_version = session_version + 1
     WHERE id = $2 RETURNING session_version`,
    [await hashPassword(newPassword), req.user.id],
  );
  req.session.sessionVersion = updated.session_version;
  await audit(req.user, 'password.changed');
  res.json({ user: { ...req.user, mustChangePassword: false } });
});
