import { Router } from 'express';
import { audit } from '../audit.js';
import { query, transaction } from '../db.js';
import { hashPassword, temporaryPassword } from '../passwords.js';
import { userCreateInput, userUpdateInput } from '../schema.js';
import { HttpError, requireRole } from '../security.js';
import { uuidParam, validate } from '../validate.js';

/** Head teacher only: create and manage accounts. */
export const usersRouter = Router();
usersRouter.use(requireRole('head_teacher'));

const ROLE_NAMES = { head_teacher: 'head teacher', faculty: 'faculty', student: 'student' };

/** Internal username for a student account. Staff usernames cannot contain ":", so these never clash. */
const studentUsername = (id: string) => `student:${id.toLowerCase()}`;

usersRouter.get('/', async (_req, res) => {
  const users = await query(
    `SELECT u.id, u.username, u.display_name AS "displayName", u.role, u.active,
            u.must_change_password AS "mustChangePassword", u.created_at AS "createdAt", u.last_login_at AS "lastLoginAt",
            u.student_id AS "studentId", u.date_of_birth AS "dateOfBirth", f.id AS "facultyMemberId"
     FROM users u LEFT JOIN faculty_members f ON f.user_id = u.id
     ORDER BY CASE u.role WHEN 'head_teacher' THEN 0 WHEN 'faculty' THEN 1 ELSE 2 END, u.display_name`,
  );
  res.json({ users });
});

async function assertStudentIdFree(id: string, exceptUserId: string | null) {
  const taken = await query('SELECT 1 FROM users WHERE lower(student_id) = lower($1) AND id IS DISTINCT FROM $2', [id, exceptUserId]);
  if (taken.length) throw new HttpError(409, 'Another student already has that student ID.');
}

usersRouter.post('/', async (req, res) => {
  const input = validate(userCreateInput, req.body);

  if (input.role === 'student') {
    await assertStudentIdFree(input.studentId, null);
    const [user] = await query<{ id: string }>(
      `INSERT INTO users (username, display_name, role, password_hash, must_change_password, student_id, date_of_birth)
       VALUES ($1, $2, 'student', NULL, false, $3, $4) RETURNING id`,
      [studentUsername(input.studentId), input.displayName, input.studentId, input.dateOfBirth],
    );
    await audit(req.user!, 'user.created', `${input.displayName} (student ${input.studentId})`);
    res.status(201).json({ id: user.id, studentId: input.studentId });
    return;
  }

  const exists = await query('SELECT 1 FROM users WHERE username = $1', [input.username]);
  if (exists.length) throw new HttpError(409, 'That username is already taken.');
  const password = temporaryPassword();
  const [user] = await query<{ id: string }>(
    `INSERT INTO users (username, display_name, role, password_hash, must_change_password)
     VALUES ($1, $2, $3, $4, true) RETURNING id`,
    [input.username, input.displayName, input.role, await hashPassword(password)],
  );
  await audit(req.user!, 'user.created', `${input.username} (${ROLE_NAMES[input.role]})`);
  // The temporary password is shown once to the head teacher and never stored in plain text.
  res.status(201).json({ id: user.id, username: input.username, temporaryPassword: password });
});

/** Refuse changes that would leave the school with no active head teacher. */
async function ensureAnotherHeadTeacher(excludingId: string) {
  const others = await query("SELECT 1 FROM users WHERE role = 'head_teacher' AND active AND id <> $1", [excludingId]);
  if (others.length === 0) throw new HttpError(400, 'At least one active head-teacher account must remain.');
}

usersRouter.patch('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const input = validate(userUpdateInput, req.body);
  const [target] = await query<{ role: string; username: string; student_id: string | null; date_of_birth: string | null }>(
    'SELECT role, username, student_id, date_of_birth FROM users WHERE id = $1',
    [id],
  );
  if (!target) throw new HttpError(404, 'Account not found.');
  const isStudent = target.role === 'student';

  if (isStudent && input.role) throw new HttpError(400, 'Student accounts cannot be changed into staff accounts. Create a staff account instead.');
  if (!isStudent && (input.studentId || input.dateOfBirth)) throw new HttpError(400, 'Only student accounts have a student ID and date of birth.');
  if (id === req.user!.id && (input.active === false || (input.role && input.role !== 'head_teacher'))) {
    throw new HttpError(400, 'You cannot deactivate or demote your own account.');
  }
  if (target.role === 'head_teacher' && (input.active === false || (input.role && input.role !== 'head_teacher'))) {
    await ensureAnotherHeadTeacher(id);
  }
  if (input.studentId) await assertStudentIdFree(input.studentId, id);

  // Sign the user out everywhere when their access or sign-in details change.
  const signOut =
    input.active === false ||
    (input.role !== undefined && input.role !== target.role) ||
    (input.studentId !== undefined && input.studentId.toLowerCase() !== target.student_id?.toLowerCase()) ||
    (input.dateOfBirth !== undefined && input.dateOfBirth !== target.date_of_birth);

  await query(
    `UPDATE users SET
       display_name = COALESCE($2, display_name),
       role = COALESCE($3, role),
       active = COALESCE($4, active),
       student_id = COALESCE($5, student_id),
       username = COALESCE($6, username),
       date_of_birth = COALESCE($7::date, date_of_birth),
       session_version = session_version + $8
     WHERE id = $1`,
    [
      id,
      input.displayName ?? null,
      input.role ?? null,
      input.active ?? null,
      input.studentId ?? null,
      input.studentId ? studentUsername(input.studentId) : null,
      input.dateOfBirth ?? null,
      signOut ? 1 : 0,
    ],
  );
  // Log which fields changed, not their values (a date of birth is personal data).
  await audit(req.user!, 'user.updated', `${isStudent ? `student ${target.student_id}` : target.username}: ${Object.keys(input).join(', ')}`);
  res.json({ ok: true });
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const id = uuidParam(req.params.id);
  const [target] = await query<{ username: string; role: string }>('SELECT username, role FROM users WHERE id = $1', [id]);
  if (!target) throw new HttpError(404, 'Account not found.');
  if (target.role === 'student') throw new HttpError(400, 'Students sign in with their student ID and date of birth — edit those instead.');
  if (id === req.user!.id) throw new HttpError(400, 'Use “My account” to change your own password.');
  const password = temporaryPassword();
  await query(
    'UPDATE users SET password_hash = $2, must_change_password = true, session_version = session_version + 1 WHERE id = $1',
    [id, await hashPassword(password)],
  );
  await audit(req.user!, 'user.password_reset', target.username);
  res.json({ username: target.username, temporaryPassword: password });
});

usersRouter.delete('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  if (id === req.user!.id) throw new HttpError(400, 'You cannot delete your own account.');
  const [target] = await query<{ role: string; username: string; student_id: string | null }>(
    'SELECT role, username, student_id FROM users WHERE id = $1',
    [id],
  );
  if (!target) throw new HttpError(404, 'Account not found.');
  if (target.role === 'head_teacher') await ensureAnotherHeadTeacher(id);
  await transaction(async (c) => {
    await c.query('UPDATE faculty_members SET user_id = NULL WHERE user_id = $1', [id]);
    await c.query('DELETE FROM users WHERE id = $1', [id]);
  });
  await audit(req.user!, 'user.deleted', target.role === 'student' ? `student ${target.student_id}` : target.username);
  res.json({ ok: true });
});
