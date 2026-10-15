import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../audit.js';
import { parseCsv } from '../csv.js';
import { json, query, transaction } from '../db.js';
import { HttpError, requireRole } from '../security.js';
import { uuidParam, validate } from '../validate.js';

interface Subject {
  name: string;
  maxMarks: number | null;
}

interface ExamRow {
  id: string;
  name: string;
  subjects: Subject[];
  published: boolean;
}

const subjectName = z
  .string()
  .trim()
  .min(1, 'Subject name is required')
  .max(60)
  .regex(/^[^,;"\t\r\n]+$/, 'Subject names cannot contain commas, semicolons or quotes');

const examInput = z.object({
  name: z.string().trim().min(1, 'Enter the exam name').max(150),
  subjects: z
    .array(z.object({ name: subjectName, maxMarks: z.number().int().min(1).max(1000).nullable() }))
    .min(1, 'Add at least one subject')
    .max(30)
    .refine((s) => new Set(s.map((x) => x.name.toLowerCase())).size === s.length, 'Each subject name must be different'),
});

/** "78", "78.5" or a short code such as "AB", "Absent", "Exempt". */
const MARK_NUMBER = /^\d{1,4}(\.\d{1,2})?$/;
const MARK_CODE = /^[A-Za-z][A-Za-z .-]{0,11}$/;

const normaliseHeader = (h: string) => h.replace(/\(.*\)$/, '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

function summarise(subjects: Subject[], marks: Record<string, string>) {
  let total = 0;
  let maxTotal = 0;
  let numeric = 0;
  let allHaveMax = true;
  for (const s of subjects) {
    const m = marks[s.name];
    if (s.maxMarks == null) allHaveMax = false;
    else maxTotal += s.maxMarks;
    if (m !== undefined && MARK_NUMBER.test(m)) {
      total += Number(m);
      numeric++;
    }
  }
  return {
    total: numeric ? Math.round(total * 100) / 100 : null,
    maxTotal: allHaveMax ? maxTotal : null,
    percentage: numeric && allHaveMax && maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : null,
  };
}

// ---------------------------------------------------------------------------
// Student: own published results only
// ---------------------------------------------------------------------------
export const myResultsRouter = Router();

myResultsRouter.get('/', requireRole('student'), async (req, res) => {
  const rows = await query<ExamRow & { marks: Record<string, string>; grade: string | null; remarks: string | null }>(
    `SELECT e.id, e.name, e.subjects, e.published, r.marks, r.grade, r.remarks
     FROM exam_results r JOIN exams e ON e.id = r.exam_id
     WHERE r.student_user_id = $1 AND e.published
     ORDER BY e.created_at DESC`,
    [req.user!.id],
  );
  res.json({
    results: rows.map((r) => ({
      examId: r.id,
      examName: r.name,
      subjects: r.subjects.map((s) => ({ ...s, marks: r.marks[s.name] ?? '' })),
      grade: r.grade,
      remarks: r.remarks,
      ...summarise(r.subjects, r.marks),
    })),
  });
});

// ---------------------------------------------------------------------------
// Head teacher: exams, uploads, publishing
// ---------------------------------------------------------------------------
export const examsRouter = Router();
examsRouter.use(requireRole('head_teacher'));

examsRouter.get('/', async (_req, res) => {
  const exams = await query(
    `SELECT e.id, e.name, e.subjects, e.published, e.created_at AS "createdAt", e.updated_at AS "updatedAt",
            (SELECT count(*)::int FROM exam_results r WHERE r.exam_id = e.id) AS "resultCount"
     FROM exams e ORDER BY e.created_at DESC`,
  );
  res.json({ exams });
});

examsRouter.post('/', async (req, res) => {
  const input = validate(examInput, req.body);
  const [row] = await query<{ id: string }>('INSERT INTO exams (name, subjects, created_by) VALUES ($1, $2, $3) RETURNING id', [
    input.name,
    json(input.subjects),
    req.user!.id,
  ]);
  await audit(req.user!, 'exam.created', input.name);
  res.status(201).json({ id: row.id });
});

examsRouter.put('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const input = validate(examInput, req.body);
  const [row] = await query<{ id: string }>('UPDATE exams SET name = $2, subjects = $3, updated_at = now() WHERE id = $1 RETURNING id', [
    id,
    input.name,
    json(input.subjects),
  ]);
  if (!row) throw new HttpError(404, 'Exam not found.');
  await audit(req.user!, 'exam.updated', input.name);
  res.json({ ok: true });
});

examsRouter.post('/:id/publish', async (req, res) => {
  const id = uuidParam(req.params.id);
  const publish = req.body?.published === true;
  const [row] = await query<{ name: string }>('UPDATE exams SET published = $2, updated_at = now() WHERE id = $1 RETURNING name', [id, publish]);
  if (!row) throw new HttpError(404, 'Exam not found.');
  await audit(req.user!, publish ? 'exam.published' : 'exam.unpublished', row.name);
  res.json({ ok: true });
});

examsRouter.delete('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const [row] = await query<{ name: string }>('DELETE FROM exams WHERE id = $1 RETURNING name', [id]);
  if (!row) throw new HttpError(404, 'Exam not found.');
  await audit(req.user!, 'exam.deleted', row.name);
  res.json({ ok: true });
});

examsRouter.get('/:id/results', async (req, res) => {
  const id = uuidParam(req.params.id);
  const [exam] = await query<ExamRow>('SELECT id, name, subjects, published FROM exams WHERE id = $1', [id]);
  if (!exam) throw new HttpError(404, 'Exam not found.');
  const rows = await query<{ studentId: string; displayName: string; marks: Record<string, string>; grade: string | null; remarks: string | null }>(
    `SELECT u.student_id AS "studentId", u.display_name AS "displayName", r.marks, r.grade, r.remarks
     FROM exam_results r JOIN users u ON u.id = r.student_user_id
     WHERE r.exam_id = $1 ORDER BY lower(u.student_id)`,
    [id],
  );
  res.json({ exam, results: rows.map((r) => ({ ...r, ...summarise(exam.subjects, r.marks) })) });
});

/**
 * Upload a CSV: one row per student, columns student_id, (student_name),
 * one column per subject, (grade), (remarks). All-or-nothing: if any row has
 * a problem nothing is saved and every problem is reported.
 */
examsRouter.post('/:id/import', async (req, res) => {
  const id = uuidParam(req.params.id);
  const { csv } = validate(z.object({ csv: z.string().min(1, 'The file is empty').max(3_000_000) }), req.body);
  const [exam] = await query<ExamRow>('SELECT id, name, subjects, published FROM exams WHERE id = $1', [id]);
  if (!exam) throw new HttpError(404, 'Exam not found.');

  const rows = parseCsv(csv);
  if (rows.length < 2) throw new HttpError(400, 'The file has no student rows. Use the downloaded template.');
  if (rows.length > 5001) throw new HttpError(400, 'Too many rows (maximum 5000 students per upload).');

  const headers = rows[0].map(normaliseHeader);
  const col = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const idCol = col('student id', 'studentid', 'id', 'roll no', 'roll number');
  if (idCol < 0) throw new HttpError(400, 'The first row must include a “student_id” column. Use the downloaded template.');
  const gradeCol = col('grade');
  const remarksCol = col('remarks', 'remark', 'comments');
  const nameCols = new Set([col('student name', 'name'), idCol, gradeCol, remarksCol].filter((i) => i >= 0));

  const subjectCols = new Map<string, number>();
  const errors: string[] = [];
  for (const s of exam.subjects) {
    const i = headers.indexOf(normaliseHeader(s.name));
    if (i < 0) errors.push(`Missing column for subject “${s.name}”.`);
    else subjectCols.set(s.name, i);
  }
  headers.forEach((h, i) => {
    if (h && !nameCols.has(i) && ![...subjectCols.values()].includes(i)) {
      errors.push(`Column “${rows[0][i].trim()}” is not a subject of this exam. Fix the heading or add the subject to the exam.`);
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

    const marks: Record<string, string> = {};
    for (const s of exam.subjects) {
      const v = (r[subjectCols.get(s.name)!] ?? '').trim();
      if (v === '') continue;
      if (MARK_NUMBER.test(v)) {
        if (s.maxMarks != null && Number(v) > s.maxMarks) {
          errors.push(`Row ${line} (${sid}): ${s.name} mark ${v} is more than the maximum ${s.maxMarks}.`);
          continue;
        }
      } else if (!MARK_CODE.test(v)) {
        errors.push(`Row ${line} (${sid}): ${s.name} “${v.slice(0, 20)}” is not a mark. Use a number, or a code such as AB.`);
        continue;
      }
      marks[s.name] = v;
    }
    const grade = gradeCol >= 0 ? (r[gradeCol] ?? '').trim() : '';
    const remarks = remarksCol >= 0 ? (r[remarksCol] ?? '').trim() : '';
    if (grade.length > 10) errors.push(`Row ${line} (${sid}): grade is too long (maximum 10 characters).`);
    if (remarks.length > 300) errors.push(`Row ${line} (${sid}): remarks are too long (maximum 300 characters).`);
    // Rows left blank (e.g. students in another class) are skipped, not saved as empty results.
    if (Object.keys(marks).length === 0 && !grade && !remarks) {
      skipped++;
      return;
    }
    parsed.push({ userId, marks, grade: grade || null, remarks: remarks || null });
  });

  if (errors.length) {
    const shown = errors.slice(0, 50);
    if (errors.length > 50) shown.push(`…and ${errors.length - 50} more problems.`);
    throw new HttpError(400, `Nothing was saved. Please fix these problems and upload again:\n${shown.join('\n')}`);
  }
  if (parsed.length === 0) throw new HttpError(400, 'Nothing was saved: every student row is blank. Fill in some marks first.');

  await transaction(async (c) => {
    for (const p of parsed) {
      await c.query(
        `INSERT INTO exam_results (exam_id, student_user_id, marks, grade, remarks) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (exam_id, student_user_id) DO UPDATE SET marks = EXCLUDED.marks, grade = EXCLUDED.grade,
           remarks = EXCLUDED.remarks, updated_at = now()`,
        [id, p.userId, json(p.marks), p.grade, p.remarks],
      );
    }
    await c.query('UPDATE exams SET updated_at = now() WHERE id = $1', [id]);
  });
  await audit(req.user!, 'exam.results_imported', `${exam.name}: ${parsed.length} students`);
  res.json({ imported: parsed.length, skipped, published: exam.published });
});
