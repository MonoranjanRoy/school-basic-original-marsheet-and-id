import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, errorMessage } from '../api';
import { IdCard } from '../components/IdCard';
import { PageTitle } from '../components/ui';
import { classesOf, compareClasses, sectionsOf, type Student } from '../students';

/** Nine cards fit on one A4 sheet (3 × 3). */
const PER_PAGE = 9;

/** Head teacher: print ID cards for a class, a section or one student. */
export default function IdCards() {
  const [params, setParams] = useSearchParams();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState('');
  const only = params.get('student') ?? '';
  const cls = params.get('class') ?? '';
  const section = params.get('section') ?? '';

  useEffect(() => {
    api<{ students: Student[] }>('/students')
      .then((r) => setStudents(r.students.filter((s) => s.active)))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const classes = useMemo(() => classesOf(students ?? []), [students]);
  const sections = useMemo(() => sectionsOf(students ?? [], cls), [students, cls]);
  const shown = useMemo(
    () =>
      (students ?? [])
        .filter((s) => (only ? s.id === only : (!cls || s.className === cls) && (!section || s.section === section)))
        .sort((a, b) => compareClasses(a.className, b.className)),
    [students, only, cls, section],
  );
  const pages = useMemo(() => {
    const out: Student[][] = [];
    for (let i = 0; i < shown.length; i += PER_PAGE) out.push(shown.slice(i, i + PER_PAGE));
    return out;
  }, [shown]);
  const noPhoto = shown.filter((s) => !s.photoMediaId).length;

  const setFilter = (next: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    setParams(p, { replace: true });
  };

  return (
    <>
      <div className="no-print">
        <PageTitle
          title="ID cards"
          intro="Made automatically from each student’s details. Print on A4 (9 cards per sheet, real card size), cut along the dashed lines and laminate."
          actions={
            shown.length > 0 && (
              <button type="button" className="pbtn pbtn--primary" onClick={() => window.print()}>
                Print {shown.length} card{shown.length === 1 ? '' : 's'}
              </button>
            )
          }
        />
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        {only ? (
          <p>
            <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setFilter({})}>
              ← All students
            </button>
          </p>
        ) : (
          <div className="filter-bar">
            <div className="pfield">
              <label htmlFor="ic-class">Class</label>
              <select id="ic-class" value={cls} onChange={(e) => setFilter({ class: e.target.value })}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {sections.length > 0 && (
              <div className="pfield">
                <label htmlFor="ic-section">Section</label>
                <select id="ic-section" value={section} onChange={(e) => setFilter({ class: cls, section: e.target.value })}>
                  <option value="">All</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {noPhoto > 0 && (
          <p className="palert palert--warning">
            {noPhoto} of these student{noPhoto === 1 ? ' has' : 's have'} no photo yet (initials are shown instead). Add photos under{' '}
            <Link to="/portal/students">Students</Link>.
          </p>
        )}
        <p className="hint">Tip: in the print window choose “Actual size” / Scale 100% and turn on “Background graphics” so the colours print.</p>
        {!students && !error && <p className="muted">Loading…</p>}
        {students && shown.length === 0 && <p className="muted">No students match. Add students and their details under Students first.</p>}
      </div>

      {pages.map((page, i) => (
        <div key={i} className="idcard-sheet">
          {page.map((s) => (
            <IdCard key={s.id} student={s} />
          ))}
        </div>
      ))}
    </>
  );
}
