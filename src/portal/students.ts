/** Student records as the head teacher sees them (GET /api/students). */
export interface Student {
  id: string;
  displayName: string;
  studentId: string;
  dateOfBirth: string | null;
  active: boolean;
  className: string;
  section: string;
  rollNo: string;
  admissionNo: string;
  gender: string;
  bloodGroup: string;
  pen: string;
  aadhaar: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  address: string;
  photoMediaId: string | null;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = ['Male', 'Female', 'Other'];

export const photoSrc = (s: Pick<Student, 'photoMediaId'>) => (s.photoMediaId ? `/media/${s.photoMediaId}` : null);

/** "Class 5 · A · Roll 12" */
export function classLine(s: Pick<Student, 'className' | 'section' | 'rollNo'>): string {
  return [s.className && `Class ${s.className}`, s.section && `Sec ${s.section}`, s.rollNo && `Roll ${s.rollNo}`].filter(Boolean).join(' · ');
}

/** Pre-primary classes, youngest first. */
export const PRE_PRIMARY_CLASSES = ['Nursery', 'LKG', 'UKG'];

const PRE_PRIMARY_RANK: Record<string, number> = {
  playgroup: 0,
  prenursery: 1,
  nursery: 2,
  lkg: 3,
  kg: 3,
  kg1: 3,
  kgi: 3,
  ukg: 4,
  kg2: 4,
  kgii: 4,
};
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

/** Where a class sorts: Nursery, LKG, UKG, then 1 (or I), 2… 12, then anything else. */
function classRank(name: string): number {
  const key = name.toLowerCase().replace(/^class\s*/, '').replace(/[^a-z0-9]/g, '');
  if (key in PRE_PRIMARY_RANK) return PRE_PRIMARY_RANK[key];
  if (/^\d+$/.test(key)) return 10 + Number(key);
  if (key in ROMAN) return 10 + ROMAN[key];
  return 1000;
}

export const compareClasses = (a: string, b: string) => classRank(a) - classRank(b) || a.localeCompare(b, undefined, { numeric: true });

/** Distinct classes in school order: Nursery, LKG, UKG, then Class 2 before Class 10. */
export function classesOf(students: Pick<Student, 'className'>[]): string[] {
  return [...new Set(students.map((s) => s.className).filter(Boolean))].sort(compareClasses);
}

/** Classes to suggest when typing one: those in use, plus pre-primary (and 1–10 when there are none yet). */
export function classSuggestions(inUse: string[]): string[] {
  const extra = [...PRE_PRIMARY_CLASSES, ...(inUse.length ? [] : Array.from({ length: 10 }, (_, i) => String(i + 1)))];
  const seen = new Set(inUse.map((c) => c.toLowerCase()));
  return [...inUse, ...extra.filter((c) => !seen.has(c.toLowerCase()))].sort(compareClasses);
}

export function sectionsOf(students: Pick<Student, 'className' | 'section'>[], className: string): string[] {
  return [...new Set(students.filter((s) => !className || s.className === className).map((s) => s.section).filter(Boolean))].sort();
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
