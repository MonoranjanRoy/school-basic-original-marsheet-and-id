/**
 * Marksheet data shared by the server (which builds it) and the browser
 * (which prints it). Kept free of React and Node imports.
 */

/** One part of a subject's marks, e.g. Term 1, Term 2 or Viva. */
export interface ExamPart {
  name: string;
  maxMarks: number;
  /** Minimum marks to pass this part. Optional. */
  passMarks?: number | null;
}

export interface ExamSubject {
  name: string;
  /**
   * Full marks. For a subject with parts, the parts' full marks added up.
   * null: a graded subject (e.g. Drawing: A+), not added to the total.
   */
  maxMarks: number | null;
  /** Minimum marks to pass this subject (its total, when it has parts). Optional. */
  passMarks?: number | null;
  /** The subject's marks split into parts. Each subject can have its own combination. */
  parts?: ExamPart[];
}

/** How an exam turns marks into grades and a result. */
export interface ExamRules {
  /** "90:A++, 80:A+, …" for this exam only; empty uses the school's grade scale. */
  gradeScale: string;
  /** Minimum overall percentage to pass. Optional. */
  passPercentage: number | null;
  /** Print a grade for each subject as well as the overall grade. */
  subjectGrades: boolean;
}

export interface MarksheetStudent {
  studentId: string;
  name: string;
  dateOfBirth: string | null;
  className: string;
  section: string;
  rollNo: string;
  admissionNo: string;
  pen: string;
  /** Masked (XXXX XXXX 1234) unless the head teacher asked for the full number. */
  aadhaar: string;
  fatherName: string;
  motherName: string;
  gender: string;
}

export interface MarksheetPart extends ExamPart {
  passMarks: number | null;
  marks: string;
  /** null when the part has no pass mark. */
  passed: boolean | null;
}

export interface MarksheetSubject extends Omit<ExamSubject, 'parts'> {
  /** The total, for a subject with parts. */
  marks: string;
  /** null when neither the subject nor its parts have a pass mark. */
  passed: boolean | null;
  /** Only when the exam prints subject grades. */
  grade: string | null;
  parts?: MarksheetPart[];
}

export interface Marksheet {
  examId: string;
  examName: string;
  session: string;
  student: MarksheetStudent;
  subjects: MarksheetSubject[];
  total: number | null;
  maxTotal: number | null;
  percentage: number | null;
  grade: string | null;
  /** Only when the exam has a pass mark (subject, part or overall percentage). */
  result: 'Pass' | 'Fail' | null;
  remarks: string | null;
}

/** "78", "78.5" — anything else (AB, Absent, A+…) is a code, not a number. */
export const MARK_NUMBER = /^\d{1,4}(\.\d{1,2})?$/;
export const MARK_CODE = /^[A-Za-z][A-Za-z .+-]{0,11}$/;

/** Subject and part names cannot contain these (they would break spreadsheets and mark keys). */
export const NAME_PATTERN = /^[^,;"|\t\r\n]+$/;

/** Where a part's mark is stored: marks["English|Term 1"]. */
export const partKey = (subject: string, part: string) => `${subject}|${part}`;

/** One box to type a mark into: a subject without parts, or one part of a subject. */
export interface MarkColumn {
  key: string;
  subject: string;
  part: string | null;
  maxMarks: number | null;
  passMarks: number | null;
  /** "English - Term 1": used for spreadsheet headings and messages. */
  label: string;
}

export function markColumns(subjects: ExamSubject[]): MarkColumn[] {
  return subjects.flatMap((s): MarkColumn[] =>
    s.parts?.length
      ? s.parts.map((p) => ({
          key: partKey(s.name, p.name),
          subject: s.name,
          part: p.name,
          maxMarks: p.maxMarks,
          passMarks: p.passMarks ?? null,
          label: `${s.name} - ${p.name}`,
        }))
      : [{ key: s.name, subject: s.name, part: null, maxMarks: s.maxMarks, passMarks: s.passMarks ?? null, label: s.name }],
  );
}

/** Every part name used in an exam (Term 1, Term 2, Viva…), in order of first use. */
export const partNames = (subjects: { parts?: { name: string }[] }[]) => [...new Set(subjects.flatMap((s) => s.parts?.map((p) => p.name) ?? []))];

/** Why a typed mark can't be saved, or '' if it can. */
export function markProblem(maxMarks: number | null, value: string): string {
  const m = value.trim();
  if (!m) return '';
  if (MARK_NUMBER.test(m)) return maxMarks != null && Number(m) > maxMarks ? `More than ${maxMarks}` : '';
  return MARK_CODE.test(m) ? '' : 'Use a number or a code such as AB';
}

export const DEFAULT_GRADE_SCALE = '90:A++, 80:A+, 70:A, 60:B+, 50:B, 40:C+, 33:C, 0:D';
export const GRADE_SCALE_PATTERN = /^\s*\d{1,3}(\.\d+)?\s*:\s*[^,:]{1,12}\s*(,\s*\d{1,3}(\.\d+)?\s*:\s*[^,:]{1,12}\s*)*$/;

/** Ready-made scales the head teacher can start from. */
export const GRADE_SCALE_PRESETS = [
  { label: 'A++ to D', scale: DEFAULT_GRADE_SCALE },
  { label: 'A+ to E', scale: '90:A+, 80:A, 70:B+, 60:B, 50:C+, 40:C, 33:D, 0:E' },
  { label: 'Pre-primary (LKG, UKG)', scale: '90:A+, 75:A, 60:B, 45:C, 0:D' },
];

export type GradeScale = { min: number; grade: string }[];

/** "90:A+, 80:A" → [{ min: 90, grade: 'A+' }, { min: 80, grade: 'A' }], highest first. */
export function parseGradeScale(text: string | undefined): GradeScale {
  const src = text && GRADE_SCALE_PATTERN.test(text) ? text : DEFAULT_GRADE_SCALE;
  return src
    .split(',')
    .map((part) => {
      const [min, grade] = part.split(':');
      return { min: Number(min), grade: grade.trim() };
    })
    .sort((a, b) => b.min - a.min);
}

/** The exam's own scale if it has one, otherwise the school's. */
export const examGradeScale = (rules: Pick<ExamRules, 'gradeScale'> | undefined, schoolScale: string | undefined) =>
  parseGradeScale(rules?.gradeScale || schoolScale);

export function gradeFor(percentage: number | null, scale: GradeScale): string | null {
  if (percentage === null) return null;
  return scale.find((s) => percentage >= s.min)?.grade ?? null;
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Totals, percentage, grades and pass/fail for one student in one exam. */
export function summarise(
  subjects: ExamSubject[],
  marks: Record<string, string>,
  scale: GradeScale,
  manualGrade?: string | null,
  rules: Partial<Pick<ExamRules, 'passPercentage' | 'subjectGrades'>> = {},
) {
  // Graded subjects (no full marks) are left out of the total, unless no subject has full marks.
  const anyMax = subjects.some((s) => s.maxMarks != null);
  let total = 0;
  let maxTotal = 0;
  let numeric = 0;
  let anyPassMark = rules.passPercentage != null;
  let failed = false;

  // Absent (or no mark) where there is a pass mark counts as not passed.
  const passes = (m: string | number | null, min: number | null | undefined) =>
    min == null ? null : typeof m === 'number' ? m >= min : m !== null && MARK_NUMBER.test(m) && Number(m) >= min;

  const rows: MarksheetSubject[] = subjects.map((s) => {
    let obtained: number | null = null;
    let code = '';
    const add = (m: string) => {
      if (MARK_NUMBER.test(m)) obtained = (obtained ?? 0) + Number(m);
      else if (m && !code) code = m;
    };

    const parts = s.parts?.length
      ? s.parts.map((p): MarksheetPart => {
          const m = (marks[partKey(s.name, p.name)] ?? '').trim();
          add(m);
          return { ...p, passMarks: p.passMarks ?? null, marks: m, passed: passes(m, p.passMarks) };
        })
      : undefined;
    if (!parts) add((marks[s.name] ?? '').trim());

    const checks = [...(parts ?? []).map((p) => p.passed), passes(obtained, s.passMarks)].filter((c) => c !== null);
    const passed = checks.length ? checks.every(Boolean) : null;
    if (passed !== null) anyPassMark = true;
    if (passed === false) failed = true;

    if (!anyMax || s.maxMarks != null) {
      if (s.maxMarks != null) maxTotal += s.maxMarks;
      if (obtained !== null) {
        total += obtained;
        numeric++;
      }
    }
    const subjectPct = obtained !== null && s.maxMarks ? (obtained / s.maxMarks) * 100 : null;
    return {
      name: s.name,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks ?? null,
      ...(parts && { parts }),
      marks: obtained !== null ? String(round(obtained, 2)) : code,
      passed,
      grade: rules.subjectGrades ? gradeFor(subjectPct, scale) : null,
    };
  });

  const percentage = numeric && anyMax && maxTotal ? round((total / maxTotal) * 100, 1) : null;
  if (rules.passPercentage != null && (percentage === null || percentage < rules.passPercentage)) failed = true;
  return {
    subjects: rows,
    total: numeric ? round(total, 2) : null,
    maxTotal: anyMax ? maxTotal : null,
    percentage,
    grade: manualGrade || gradeFor(percentage, scale),
    result: anyPassMark && numeric ? (failed ? 'Fail' : 'Pass') : null,
  } as const;
}

/** Aadhaar shown as XXXX XXXX 1234 (UIDAI guidance: don't display the full number). */
export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  return digits.length === 12 ? `XXXX XXXX ${digits.slice(8)}` : '';
}

export const formatAadhaar = (aadhaar: string) => aadhaar.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

/** 2014-03-09 → 09/03/2014 (the order used on Indian school documents). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- Aadhaar check digit (Verhoeff) ----------
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]];
  return c === 0;
}

/** 12 digits, not starting with 0 or 1, with a valid check digit — catches most typing mistakes. */
export const isValidAadhaar = (v: string) => /^[2-9]\d{11}$/.test(v) && verhoeffValid(v);
