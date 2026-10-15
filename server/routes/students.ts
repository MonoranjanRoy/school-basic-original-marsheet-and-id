import { Router } from 'express';
import type pg from 'pg';
import { z } from 'zod';
import { audit } from '../audit.js';
import { parseCsv } from '../csv.js';
import { query, transaction } from '../db.js';
import { studentInput, studentProfileInput, type StudentInput } from '../schema.js';
import { HttpError, requireRole } from '../security.js';
import { uuidParam, validate } from '../validate.js';
import { invalidateResults } from './results.js';
import { assertStudentIdFree, studentUsername } from './users.js';

/** Head teacher only: student details used on marksheets and ID cards. */
export const studentsRouter = Router();
studentsRouter.use(requireRole('head_teacher'));

type Profile = z.infer<typeof studentProfileInput>;

const PROFILE_COLUMNS: [keyof Profile, string][] = [
  ['className', 'class_name'],
  ['section', 'section'],
  ['rollNo', 'roll_no'],
  ['admissionNo', 'admission_no'],
  ['gender', 'gender'],
  ['bloodGroup', 'blood_group'],
  ['pen', 'pen'],
  ['aadhaar', 'aadhaar'],
  ['fatherName', 'father_name'],
  ['motherName', 'mother_name'],
  ['guardianPhone', 'guardian_phone'],
  ['address', 'address'],
  ['photoMediaId', 'photo_media_id'],
];

const SELECT_STUDENTS = `
  SELECT u.id, u.display_name AS "displayName", u.student_id AS "studentId", u.date_of_birth AS "dateOfBirth", u.active,
         ${PROFILE_COLUMNS.map(([key, col]) => (key === 'photoMediaId' ? `p.${col} AS "${key}"` : `coalesce(p.${col}, '') AS "${key}"`)).join(', ')}
  FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id
  WHERE u.role = 'student'`;

/** Saves the given profile fields (insert or update). Fields not given are left as they are. */
async function saveProfile(c: pg.PoolClient, userId: string, fields: Partial<Profile>) {
  const entries = PROFILE_COLUMNS.filter(([key]) => fields[key] !== undefined);
  const cols = entries.map(([, col]) => col);
  const values = entries.map(([key]) => fields[key]);
  const placeholders = values.map((_, i) => `$${i + 2}`);
  const updates = cols.map((col) => `${col} = EXCLUDED.${col}`);
  await c.query(
    `INSERT INTO student_profiles (user_id${cols.map((c) => `, ${c}`).join('')}) VALUES ($1${placeholders.map((p) => `, ${p}`).join('')})
     ON CONFLICT (user_id) DO UPDATE SET ${[...updates, 'updated_at = now()'].join(', ')}`,
    [userId, ...values],
  );
}

async function createStudent(c: pg.PoolClient, s: StudentInput): Promise<string> {
  const { rows } = await c.query<{ id: string }>(
    `INSERT INTO users (username, display_name, role, password_hash, must_change_password, student_id, date_of_birth)
     VALUES ($1, $2, 'student', NULL, false, $3, $4) RETURNING id`,
    [studentUsername(s.studentId), s.displayName, s.studentId, s.dateOfBirth],
  );
  await saveProfile(c, rows[0].id, s);
  return rows[0].id;
}

/** Updates the account; changing the student ID or date of birth signs the student out. */
async function updateAccount(c: pg.PoolClient, id: string, s: Pick<StudentInput, 'displayName' | 'studentId' | 'dateOfBirth'>) {
  await c.query(
    `UPDATE users SET display_name = $2, student_id = $3, username = $4, date_of_birth = $5,
       session_version = session_version + CASE WHEN lower(student_id) <> lower($3) OR date_of_birth <> $5::date THEN 1 ELSE 0 END
     WHERE id = $1 AND role = 'student'`,
    [id, s.displayName, s.studentId, studentUsername(s.studentId), s.dateOfBirth],
  );
}

studentsRouter.get('/', async (_req, res) => {
  const students = await query(
    `${SELECT_STUDENTS} ORDER BY lower(coalesce(p.class_name, '')), lower(coalesce(p.section, '')),
       length(coalesce(p.roll_no, '')), coalesce(p.roll_no, ''), u.display_name`,
  );
  res.json({ students });
});

studentsRouter.post('/', async (req, res) => {
  const input = validate(studentInput, req.body);
  await assertStudentIdFree(input.studentId, null);
  const id = await transaction((c) => createStudent(c, input));
  invalidateResults();
  await audit(req.user!, 'student.created', `${input.displayName} (${input.studentId})`);
  res.status(201).json({ id });
});

studentsRouter.put('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const input = validate(studentInput, req.body);
  const [target] = await query("SELECT 1 FROM users WHERE id = $1 AND role = 'student'", [id]);
  if (!target) throw new HttpError(404, 'Student not found.');
  await assertStudentIdFree(input.studentId, id);
  await transaction(async (c) => {
    await updateAccount(c, id, input);
    await saveProfile(c, id, input);
  });
  invalidateResults();
  // Field names only: these details are personal data.
  await audit(req.user!, 'student.updated', input.studentId);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Spreadsheet import: add new students and update existing ones in one go.
// ---------------------------------------------------------------------------
const IMPORT_COLUMNS: Record<string, keyof StudentInput> = {
  'student id': 'studentId',
  'student name': 'displayName',
  name: 'displayName',
  'date of birth': 'dateOfBirth',
  dob: 'dateOfBirth',
  class: 'className',
  section: 'section',
  'roll no': 'rollNo',
  roll: 'rollNo',
  'admission no': 'admissionNo',
  gender: 'gender',
  'blood group': 'bloodGroup',
  pen: 'pen',
  aadhaar: 'aadhaar',
  'aadhaar no': 'aadhaar',
  'father name': 'fatherName',
  "father's name": 'fatherName',
  'mother name': 'motherName',
  "mother's name": 'motherName',
  phone: 'guardianPhone',
  'guardian phone': 'guardianPhone',
  address: 'address',
};

const header = (h: string) => h.trim().toLowerCase().replace(/[\s_.-]+/g, ' ').trim();

/** Accepts 2014-03-09 and the Indian 09/03/2014 (also 9-3-2014, 09.03.2014). */
function normaliseDate(v: string): string {
  const dmy = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : v.trim();
}

const normaliseGender = (v: string) => ({ m: 'Male', male: 'Male', boy: 'Male', f: 'Female', female: 'Female', girl: 'Female', other: 'Other' })[v.trim().toLowerCase()] ?? v.trim();
const normaliseBlood = (v: string) => v.toUpperCase().replace(/\s+/g, '').replace(/VE$/, '');

studentsRouter.post('/import', async (req, res) => {
  const { csv } = validate(z.object({ csv: z.string().min(1, 'The file is empty').max(5_000_000) }), req.body);
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new HttpError(400, 'The file has no student rows.');
  if (rows.length > 5001) throw new HttpError(400, 'Too many rows (maximum 5000 students per upload).');

  const columns = rows[0].map((h) => IMPORT_COLUMNS[header(h)]);
  const unknown = rows[0].filter((h, i) => h.trim() && !columns[i]);
  if (unknown.length) {
    throw new HttpError(400, `Unknown column${unknown.length > 1 ? 's' : ''}: ${unknown.map((h) => `“${h.trim()}”`).join(', ')}. Use the downloaded template.`);
  }
  for (const required of ['studentId', 'displayName', 'dateOfBirth'] as const) {
    if (!columns.includes(required)) throw new HttpError(400, 'The first row must include student_id, student_name and date_of_birth columns. Use the downloaded template.');
  }

  const existing = await query<{ id: string; sid: string }>("SELECT id, lower(student_id) AS sid FROM users WHERE role = 'student' AND student_id IS NOT NULL");
  const idBySid = new Map(existing.map((s) => [s.sid, s.id]));
  const seen = new Set<string>();
  const errors: string[] = [];
  const toSave: { id: string | null; input: StudentInput; given: Partial<StudentInput> }[] = [];

  rows.slice(1).forEach((r, index) => {
    const line = index + 2;
    const given: Record<string, string> = {};
    columns.forEach((key, i) => {
      if (key) given[key] = (r[i] ?? '').trim();
    });
    const mangled = (['aadhaar', 'pen', 'guardianPhone'] as const).find((k) => /^\d+(\.\d+)?E\+?\d+$/i.test(given[k] ?? ''));
    if (mangled) {
      errors.push(`Row ${line}: ${mangled} “${given[mangled]}” was changed by Excel into a short number. Format that column as Text in Excel (or use Google Sheets) and type the full number again.`);
      return;
    }
    if (given.dateOfBirth) given.dateOfBirth = normaliseDate(given.dateOfBirth);
    if (given.gender) given.gender = normaliseGender(given.gender);
    if (given.bloodGroup) given.bloodGroup = normaliseBlood(given.bloodGroup);
    const parsed = studentInput.safeParse(given);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(`Row ${line}${given.studentId ? ` (${given.studentId})` : ''}: ${issue.path.length ? `${issue.path.join('.')} – ` : ''}${issue.message}.`);
      return;
    }
    const sid = parsed.data.studentId.toLowerCase();
    if (seen.has(sid)) return void errors.push(`Row ${line}: student ID “${parsed.data.studentId}” appears more than once.`);
    seen.add(sid);
    // Only the columns present in the file are changed for existing students.
    const present = Object.fromEntries(Object.keys(given).map((k) => [k, parsed.data[k as keyof StudentInput]])) as Partial<StudentInput>;
    toSave.push({ id: idBySid.get(sid) ?? null, input: parsed.data, given: present });
  });

  if (errors.length) {
    const shown = errors.slice(0, 50);
    if (errors.length > 50) shown.push(`…and ${errors.length - 50} more problems.`);
    throw new HttpError(400, `Nothing was saved. Please fix these problems and upload again:\n${shown.join('\n')}`);
  }

  let created = 0;
  let updated = 0;
  await transaction(async (c) => {
    for (const s of toSave) {
      if (s.id) {
        await updateAccount(c, s.id, s.input);
        await saveProfile(c, s.id, s.given);
        updated++;
      } else {
        await createStudent(c, s.input);
        created++;
      }
    }
  });
  invalidateResults();
  await audit(req.user!, 'student.imported', `${created} added, ${updated} updated`);
  res.json({ created, updated });
});
