import { Router } from 'express';
import { z } from 'zod';
import {
  examGradeScale,
  GRADE_SCALE_PATTERN,
  markColumns,
  MARK_CODE,
  MARK_NUMBER,
  maskAadhaar,
  NAME_PATTERN,
  summarise,
  type ExamRules,
  type ExamSubject,
  type Marksheet,
} from '../../src/lib/marksheet';
import { audit } from '../audit.js';
import { parseCsv } from '../csv.js';
import { json, query, transaction } from '../db.js';
import { dateOfBirth, studentId } from '../schema.js';
import { clearRateLimit, HttpError, rateLimited, requireRole } from '../security.js';
import { getPublicSite } from '../siteData.js';
import { uuidParam, validate } from '../validate.js';

interface ExamRow {
  id: string;
  name: string;
  subjects: ExamSubject[];
  published: boolean;
  class_name: string;
  session: string;
  grade_scale: string;
  pass_percentage: number | null;
  subject_grades: boolean;
}

const EXAM_COLUMNS = 'id, name, subjects, published, class_name, session, grade_scale, pass_percentage, subject_grades';

const rulesOf = (e: Pick<ExamRow, 'grade_scale' | 'pass_percentage' | 'subject_grades'>): ExamRules => ({
  gradeScale: e.grade_scale,
  passPercentage: e.pass_percentage,
  subjectGrades: e.subject_grades,
});

const itemName = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} name is required`)
    .max(60)
    .regex(NAME_PATTERN, `${what} names cannot contain commas, semicolons, quotes or |`);

const passMarks = z.number().min(0).max(1000).nullable().default(null);

const examInput = z.object({
  name: z.string().trim().min(1, 'Enter the exam name').max(150),
  className: z.string().trim().max(30).default(''),
  session: z.string().trim().max(30).default(''),
  subjects: z
    .array(
      z.object({
        name: itemName('Subject'),
        maxMarks: z.number().int().min(1).max(1000).nullable(),
        passMarks,
        parts: z
          .array(z.object({ name: itemName('Part'), maxMarks: z.number().int().min(1).max(1000), passMarks }))
          .max(10)
          .default([]),
      }),
    )
    .min(1, 'Add at least one subject')
    .max(30),
  gradeScale: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || GRADE_SCALE_PATTERN.test(v), 'Grade scale: give each grade a lowest percentage, e.g. 90 for A++')
    .default(''),
  passPercentage: z.number().min(0).max(100).nullable().default(null),
  subjectGrades: z.boolean().default(false),
});

const normaliseHeader = (h: string) => h.replace(/\(.*\)$/, '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/** Checks an exam's subjects and parts, and works out each subject's full marks from its parts. */
function examSubjects(input: z.infer<typeof examInput>): ExamSubject[] {
  const errors: string[] = [];
  const subjects = input.subjects.map((s): ExamSubject => {
    for (const p of s.parts) {
      if (p.passMarks != null && p.passMarks > p.maxMarks) errors.push(`${s.name} - ${p.name}: pass marks cannot be more than the full marks.`);
    }
    if (new Set(s.parts.map((p) => p.name.toLowerCase())).size !== s.parts.length) errors.push(`${s.name}: each part name must be different.`);
    const maxMarks = s.parts.length ? s.parts.reduce((sum, p) => sum + p.maxMarks, 0) : s.maxMarks;
    if (s.passMarks != null && maxMarks != null && s.passMarks > maxMarks) errors.push(`${s.name}: pass marks cannot be more than the full marks (${maxMarks}).`);
    return { name: s.name, maxMarks, passMarks: s.passMarks, ...(s.parts.length && { parts: s.parts }) };
  });
  if (new Set(subjects.map((s) => s.name.toLowerCase())).size !== subjects.length) errors.push('Each subject name must be different.');
  // Spreadsheet headings must not clash, e.g. subject "English Term" + part "1" vs. "English" + "Term 1".
  const headings = markColumns(subjects).map((c) => normaliseHeader(c.label));
  const clash = headings.find((h, i) => headings.indexOf(h) !== i);
  if (clash) errors.push(`Two mark columns would have the same spreadsheet heading (“${clash}”). Rename a subject or part.`);
  if (errors.length) throw new HttpError(400, errors.join('\n'));
  return subjects;
}

/** Checks one student's marks; problems are added to `errors`. */
function checkMarks(exam: ExamRow, raw: Record<string, string>, label: string, errors: string[]): Record<string, string> {
  const marks: Record<string, string> = {};
  for (const c of markColumns(exam.subjects)) {
    const v = (raw[c.key] ?? '').trim();
    if (v === '') continue;
    if (MARK_NUMBER.test(v)) {
      if (c.maxMarks != null && Number(v) > c.maxMarks) {
        errors.push(`${label}: ${c.label} mark ${v} is more than the full marks ${c.maxMarks}.`);
        continue;
      }
    } else if (!MARK_CODE.test(v)) {
      errors.push(`${label}: ${c.label} “${v.slice(0, 20)}” is not a mark. Use a number, or a code such as AB.`);
      continue;
    }
    marks[c.key] = v;
  }
  return marks;
}

function failWith(errors: string[]): never {
  const shown = errors.slice(0, 50);
  if (errors.length > 50) shown.push(`…and ${errors.length - 50} more problems.`);
  throw new HttpError(400, `Nothing was saved. Please fix these problems and try again:\n${shown.join('\n')}`);
}

// ---------------------------------------------------------------------------
// Marksheets
// ---------------------------------------------------------------------------
interface MarksheetRow {
  exam_id: string;
  exam_name: string;
  exam_session: string;
  subjects: ExamSubject[];
  grade_scale: string;
  pass_percentage: number | null;
  subject_grades: boolean;
  marks: Record<string, string>;
  grade: string | null;
  remarks: string | null;
  student_id: string;
  display_name: string;
  date_of_birth: string | null;
  class_name: string | null;
  section: string | null;
  roll_no: string | null;
  admission_no: string | null;
  pen: string | null;
  aadhaar: string | null;
  father_name: string | null;
  mother_name: string | null;
  gender: string | null;
}

async function loadMarksheets(opts: { examId?: string; userId?: string; publishedOnly: boolean; fullAadhaar?: boolean }): Promise<Marksheet[]> {
  const rows = await query<MarksheetRow>(
    `SELECT e.id AS exam_id, e.name AS exam_name, e.session AS exam_session, e.subjects, e.grade_scale, e.pass_percentage,
            e.subject_grades, r.marks, r.grade, r.remarks,
            u.student_id, u.display_name, u.date_of_birth, p.class_name, p.section, p.roll_no, p.admission_no,
            p.pen, p.aadhaar, p.father_name, p.mother_name, p.gender
     FROM exam_results r
     JOIN exams e ON e.id = r.exam_id
     JOIN users u ON u.id = r.student_user_id
     LEFT JOIN student_profiles p ON p.user_id = u.id
     WHERE ($1::uuid IS NULL OR r.exam_id = $1) AND ($2::uuid IS NULL OR r.student_user_id = $2) AND (e.published OR NOT $3)
     ORDER BY e.created_at DESC, lower(coalesce(p.class_name, '')), lower(coalesce(p.section, '')),
              length(coalesce(p.roll_no, '')), coalesce(p.roll_no, ''), u.display_name`,
    [opts.examId ?? null, opts.userId ?? null, opts.publishedOnly],
  );
  const site = await getPublicSite();
  return rows.map((r) => ({
    examId: r.exam_id,
    examName: r.exam_name,
    session: r.exam_session || site.documents?.session || '',
    student: {
      studentId: r.student_id,
      name: r.display_name,
      dateOfBirth: r.date_of_birth,
      className: r.class_name ?? '',
      section: r.section ?? '',
      rollNo: r.roll_no ?? '',
      admissionNo: r.admission_no ?? '',
      pen: r.pen ?? '',
      aadhaar: opts.fullAadhaar ? r.aadhaar ?? '' : maskAadhaar(r.aadhaar ?? ''),
      fatherName: r.father_name ?? '',
      motherName: r.mother_name ?? '',
      gender: r.gender ?? '',
    },
    remarks: r.remarks,
    ...summarise(r.subjects, r.marks, examGradeScale(rulesOf(r), site.documents?.gradeScale), r.grade, rulesOf(r)),
  }));
}

/**
 * Published results per student, cached briefly: on result day thousands of
 * families look up (and refresh) at once. Any change to exams, marks or
 * student details clears the cache.
 */
const published = new Map<string, { at: number; data: Marksheet[] }>();
const PUBLISHED_CACHE_MS = 60_000;

export function invalidateResults() {
  published.clear();
}

async function publishedMarksheets(userId: string): Promise<Marksheet[]> {
  const hit = published.get(userId);
  if (hit && Date.now() - hit.at < PUBLISHED_CACHE_MS) return hit.data;
  const data = await loadMarksheets({ userId, publishedOnly: true });
  if (published.size > 20_000) published.clear();
  published.set(userId, { at: Date.now(), data });
  return data;
}

// ---------------------------------------------------------------------------
// Student (signed in): own published results only
// ---------------------------------------------------------------------------
export const myResultsRouter = Router();

myResultsRouter.get('/', requireRole('student'), async (req, res) => {
  res.json({ marksheets: await publishedMarksheets(req.user!.id) });
});

// ---------------------------------------------------------------------------
// Anyone: look up published results with student ID + date of birth
// ---------------------------------------------------------------------------
export const resultLookupRouter = Router();

resultLookupRouter.post('/', async (req, res) => {
  const input = validate(z.object({ studentId, dateOfBirth }), req.body);
  const idKey = `result-lookup:${input.studentId.toLowerCase()}`;
  // Generous per network (many families share one mobile-network address), strict per student ID.
  if ((await rateLimited(`result-lookup-ip:${req.ip ?? 'unknown'}`, 200, 15 * 60)) || (await rateLimited(idKey, 10, 60 * 60))) {
    throw new HttpError(429, 'Too many attempts. Please wait an hour, or contact the school office.');
  }
  const [u] = await query<{ id: string; date_of_birth: string | null; active: boolean }>(
    "SELECT id, date_of_birth, active FROM users WHERE role = 'student' AND lower(student_id) = lower($1)",
    [input.studentId],
  );
  if (!u || !u.active || u.date_of_birth !== input.dateOfBirth) {
    throw new HttpError(404, 'No student found with this ID card number and date of birth. Please check both and try again.');
  }
  await clearRateLimit(idKey);
  res.json({ marksheets: await publishedMarksheets(u.id) });
});

// ---------------------------------------------------------------------------
// Head teacher: exams, marks, marksheets, publishing
// ---------------------------------------------------------------------------
export const examsRouter = Router();
examsRouter.use(requireRole('head_teacher'));

async function getExam(id: string): Promise<ExamRow> {
  const [exam] = await query<ExamRow>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE id = $1`, [id]);
  if (!exam) throw new HttpError(404, 'Exam not found.');
  return exam;
}

/** The exam as the portal sees it. */
const examJson = (e: ExamRow) => ({
  id: e.id,
  name: e.name,
  subjects: e.subjects,
  published: e.published,
  className: e.class_name,
  session: e.session,
  ...rulesOf(e),
});

examsRouter.get('/', async (_req, res) => {
  const exams = await query(
    `SELECT e.id, e.name, e.subjects, e.published, e.class_name AS "className", e.session,
            e.grade_scale AS "gradeScale", e.pass_percentage AS "passPercentage", e.subject_grades AS "subjectGrades",
            e.created_at AS "createdAt", e.updated_at AS "updatedAt",
            (SELECT count(*)::int FROM exam_results r WHERE r.exam_id = e.id) AS "resultCount"
     FROM exams e ORDER BY e.created_at DESC`,
  );
  res.json({ exams });
});

examsRouter.post('/', async (req, res) => {
  const input = validate(examInput, req.body);
  const subjects = examSubjects(input);
  const [row] = await query<{ id: string }>(
    `INSERT INTO exams (name, subjects, class_name, session, grade_scale, pass_percentage, subject_grades, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [input.name, json(subjects), input.className, input.session, input.gradeScale, input.passPercentage, input.subjectGrades, req.user!.id],
  );
  await audit(req.user!, 'exam.created', input.name);
  res.status(201).json({ id: row.id });
});

examsRouter.put('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const input = validate(examInput, req.body);
  const subjects = examSubjects(input);
  const [row] = await query<{ id: string }>(
    `UPDATE exams SET name = $2, subjects = $3, class_name = $4, session = $5, grade_scale = $6, pass_percentage = $7,
       subject_grades = $8, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [id, input.name, json(subjects), input.className, input.session, input.gradeScale, input.passPercentage, input.subjectGrades],
  );
  if (!row) throw new HttpError(404, 'Exam not found.');
  invalidateResults();
  await audit(req.user!, 'exam.updated', input.name);
  res.json({ ok: true });
});

examsRouter.post('/:id/publish', async (req, res) => {
  const id = uuidParam(req.params.id);
  const publish = req.body?.published === true;
  const [row] = await query<{ name: string }>('UPDATE exams SET published = $2, updated_at = now() WHERE id = $1 RETURNING name', [id, publish]);
  if (!row) throw new HttpError(404, 'Exam not found.');
  invalidateResults();
  await audit(req.user!, publish ? 'exam.published' : 'exam.unpublished', row.name);
  res.json({ ok: true });
});

examsRouter.delete('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const [row] = await query<{ name: string }>('DELETE FROM exams WHERE id = $1 RETURNING name', [id]);
  if (!row) throw new HttpError(404, 'Exam not found.');
  invalidateResults();
  await audit(req.user!, 'exam.deleted', row.name);
  res.json({ ok: true });
});

examsRouter.get('/:id/results', async (req, res) => {
  const exam = await getExam(uuidParam(req.params.id));
  const scale = examGradeScale(rulesOf(exam), (await getPublicSite()).documents?.gradeScale);
  const rows = await query<{ studentId: string; displayName: string; marks: Record<string, string>; grade: string | null; remarks: string | null }>(
    `SELECT u.student_id AS "studentId", u.display_name AS "displayName", r.marks, r.grade, r.remarks
     FROM exam_results r JOIN users u ON u.id = r.student_user_id
     WHERE r.exam_id = $1 ORDER BY lower(u.student_id)`,
    [exam.id],
  );
  res.json({
    exam: examJson(exam),
    results: rows.map((r) => {
      const { total, maxTotal, percentage, grade, result } = summarise(exam.subjects, r.marks, scale, r.grade, rulesOf(exam));
      return { ...r, total, maxTotal, percentage, finalGrade: grade, result };
    }),
  });
});

/** The marks-entry sheet: students of the exam's class (plus anyone who already has marks). */
examsRouter.get('/:id/sheet', async (req, res) => {
  const exam = await getExam(uuidParam(req.params.id));
  const students = await query(
    `SELECT u.id AS "userId", u.student_id AS "studentId", u.display_name AS "displayName",
            coalesce(p.class_name, '') AS "className", coalesce(p.section, '') AS "section", coalesce(p.roll_no, '') AS "rollNo",
            coalesce(r.marks, '{}'::jsonb) AS marks, coalesce(r.grade, '') AS grade, coalesce(r.remarks, '') AS remarks
     FROM users u
     LEFT JOIN student_profiles p ON p.user_id = u.id
     LEFT JOIN exam_results r ON r.student_user_id = u.id AND r.exam_id = $1
     WHERE u.role = 'student' AND u.student_id IS NOT NULL
       AND (r.exam_id IS NOT NULL OR (u.active AND ($2 = '' OR lower(coalesce(p.class_name, '')) = lower($2))))
     ORDER BY lower(coalesce(p.class_name, '')), lower(coalesce(p.section, '')),
              length(coalesce(p.roll_no, '')), coalesce(p.roll_no, ''), u.display_name`,
    [exam.id, exam.class_name],
  );
  res.json({ exam: examJson(exam), students });
});

const sheetInput = z.object({
  rows: z
    .array(
      z.object({
        userId: z.uuid(),
        marks: z.record(z.string().max(130), z.string().max(20)),
        grade: z.string().trim().max(12, 'Grade: maximum 12 characters').default(''),
        remarks: z.string().trim().max(300, 'Remarks: maximum 300 characters').default(''),
      }),
    )
    .max(5000),
});

/** Saves marks typed into the marks-entry sheet. All-or-nothing. A row left empty removes that student's result. */
examsRouter.put('/:id/results', async (req, res) => {
  const exam = await getExam(uuidParam(req.params.id));
  const { rows } = validate(sheetInput, req.body);
  const students = await query<{ id: string; student_id: string; display_name: string }>(
    "SELECT id, student_id, display_name FROM users WHERE role = 'student' AND id = ANY($1::uuid[])",
    [rows.map((r) => r.userId)],
  );
  const byId = new Map(students.map((s) => [s.id, s]));
  const errors: string[] = [];
  const parsed = rows.map((r) => {
    const s = byId.get(r.userId);
    if (!s) {
      errors.push('A student in the sheet no longer exists. Reload the page and try again.');
      return null;
    }
    const marks = checkMarks(exam, r.marks, `${s.display_name} (${s.student_id})`, errors);
    return { userId: r.userId, marks, grade: r.grade, remarks: r.remarks };
  });
  if (errors.length) failWith([...new Set(errors)]);

  let saved = 0;
  let cleared = 0;
  await transaction(async (c) => {
    for (const p of parsed) {
      if (!p) continue;
      if (Object.keys(p.marks).length === 0 && !p.grade && !p.remarks) {
        const { rowCount } = await c.query('DELETE FROM exam_results WHERE exam_id = $1 AND student_user_id = $2', [exam.id, p.userId]);
        cleared += rowCount ?? 0;
        continue;
      }
      await c.query(
        `INSERT INTO exam_results (exam_id, student_user_id, marks, grade, remarks) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (exam_id, student_user_id) DO UPDATE SET marks = EXCLUDED.marks, grade = EXCLUDED.grade,
           remarks = EXCLUDED.remarks, updated_at = now()`,
        [exam.id, p.userId, json(p.marks), p.grade || null, p.remarks || null],
      );
      saved++;
    }
    await c.query('UPDATE exams SET updated_at = now() WHERE id = $1', [exam.id]);
  });
  invalidateResults();
  await audit(req.user!, 'exam.marks_saved', `${exam.name}: ${saved} students`);
  res.json({ saved, cleared, published: exam.published });
});

/** Printable marksheets for every student in the exam, or one (?student=<id>). */
examsRouter.get('/:id/marksheets', async (req, res) => {
  const exam = await getExam(uuidParam(req.params.id));
  const student = typeof req.query.student === 'string' && req.query.student ? uuidParam(req.query.student) : undefined;
  const fullAadhaar = req.query.fullAadhaar === '1';
  const marksheets = await loadMarksheets({ examId: exam.id, userId: student, publishedOnly: false, fullAadhaar });
  if (fullAadhaar) await audit(req.user!, 'exam.marksheets_full_aadhaar', exam.name);
  res.json({ exam: { id: exam.id, name: exam.name, published: exam.published }, marksheets });
});

/**
 * Upload a CSV: one row per student, columns student_id, (student_name),
 * one column per subject or subject part ("English - Term 1"), (grade),
 * (remarks). All-or-nothing: if any row has
 * a problem nothing is saved and every problem is reported.
 */
examsRouter.post('/:id/import', async (req, res) => {
  const exam = await getExam(uuidParam(req.params.id));
  const { csv } = validate(z.object({ csv: z.string().min(1, 'The file is empty').max(3_000_000) }), req.body);

  const rows = parseCsv(csv);
  if (rows.length < 2) throw new HttpError(400, 'The file has no student rows. Use the downloaded template.');
  if (rows.length > 5001) throw new HttpError(400, 'Too many rows (maximum 5000 students per upload).');

  const headers = rows[0].map(normaliseHeader);
  const col = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const idCol = col('student id', 'studentid', 'id', 'roll no', 'roll number');
  if (idCol < 0) throw new HttpError(400, 'The first row must include a “student_id” column. Use the downloaded template.');
  const gradeCol = col('grade');
  const remarksCol = col('remarks', 'remark', 'comments');
  const otherCols = new Set(
    [col('student name', 'name'), col('class'), col('section'), col('roll no', 'roll'), idCol, gradeCol, remarksCol].filter((i) => i >= 0),
  );

  const columns = markColumns(exam.subjects);
  const markCols = new Map<string, number>();
  const errors: string[] = [];
  for (const c of columns) {
    const i = headers.indexOf(normaliseHeader(c.label));
    if (i < 0) errors.push(`Missing column for “${c.label}”.`);
    else markCols.set(c.key, i);
  }
  headers.forEach((h, i) => {
    if (h && !otherCols.has(i) && ![...markCols.values()].includes(i)) {
      errors.push(`Column “${rows[0][i].trim()}” is not a subject or part of this exam. Fix the heading, or download a new spreadsheet.`);
    }
  });
  if (errors.length) throw new HttpError(400, errors.join('\n'));

  const students = await query<{ id: string; sid: string }>("SELECT id, lower(student_id) AS sid FROM users WHERE role = 'student' AND student_id IS NOT NULL");
  const byStudentId = new Map(students.map((s) => [s.sid, s.id]));
  const seen = new Set<string>();
  const parsed: { userId: string; marks: Record<string, string>; grade: string | null; remarks: string | null }[] = [];
  let skipped = 0;

  rows.slice(1).forEach((r, index) => {
    const line = index + 2; // spreadsheet row number
    const sid = (r[idCol] ?? '').trim();
    if (!sid) return void errors.push(`Row ${line}: student ID is empty.`);
    const userId = byStudentId.get(sid.toLowerCase());
    if (!userId) return void errors.push(`Row ${line}: no student account has the ID “${sid}”.`);
    if (seen.has(sid.toLowerCase())) return void errors.push(`Row ${line}: student ID “${sid}” appears more than once.`);
    seen.add(sid.toLowerCase());

    const raw = Object.fromEntries(columns.map((c) => [c.key, r[markCols.get(c.key)!] ?? '']));
    const marks = checkMarks(exam, raw, `Row ${line} (${sid})`, errors);
    const grade = gradeCol >= 0 ? (r[gradeCol] ?? '').trim() : '';
    const remarks = remarksCol >= 0 ? (r[remarksCol] ?? '').trim() : '';
    if (grade.length > 12) errors.push(`Row ${line} (${sid}): grade is too long (maximum 12 characters).`);
    if (remarks.length > 300) errors.push(`Row ${line} (${sid}): remarks are too long (maximum 300 characters).`);
    // Rows left blank (e.g. students in another class) are skipped, not saved as empty results.
    if (Object.keys(marks).length === 0 && !grade && !remarks) {
      skipped++;
      return;
    }
    parsed.push({ userId, marks, grade: grade || null, remarks: remarks || null });
  });

  if (errors.length) failWith(errors);
  if (parsed.length === 0) throw new HttpError(400, 'Nothing was saved: every student row is blank. Fill in some marks first.');

  await transaction(async (c) => {
    for (const p of parsed) {
      await c.query(
        `INSERT INTO exam_results (exam_id, student_user_id, marks, grade, remarks) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (exam_id, student_user_id) DO UPDATE SET marks = EXCLUDED.marks, grade = EXCLUDED.grade,
           remarks = EXCLUDED.remarks, updated_at = now()`,
        [exam.id, p.userId, json(p.marks), p.grade, p.remarks],
      );
    }
    await c.query('UPDATE exams SET updated_at = now() WHERE id = $1', [exam.id]);
  });
  invalidateResults();
  await audit(req.user!, 'exam.results_imported', `${exam.name}: ${parsed.length} students`);
  res.json({ imported: parsed.length, skipped, published: exam.published });
});
