import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router';
import { examGradeScale, markColumns, markProblem, summarise, type ExamRules, type ExamSubject } from '../../lib/marksheet';
import { useSite } from '../../lib/site';
import { api, errorMessage } from '../api';
import { Badge, PageTitle, StatusMessage, type Status } from '../components/ui';
import { compareClasses } from '../students';

interface SheetRow {
  userId: string;
  studentId: string;
  displayName: string;
  className: string;
  section: string;
  rollNo: string;
  marks: Record<string, string>;
  grade: string;
  remarks: string;
}

interface Sheet {
  exam: ExamRules & { id: string; name: string; subjects: ExamSubject[]; published: boolean; className: string };
  students: SheetRow[];
}

/** Head teacher: type or correct marks for every student in an exam. */
export default function MarksEntry() {
  const { id } = useParams();
  const site = useSite();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<string[]>([]);
  const [section, setSection] = useState('');

  const load = useCallback(() => {
    api<Sheet>(`/exams/${id}/sheet`)
      .then((r) => {
        setSheet(r);
        // Stable sort: keeps the server's section and roll-no. order within each class.
        setRows([...r.students].sort((a, b) => compareClasses(a.className, b.className)));
        setDirty(new Set());
      })
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, [id]);
  useEffect(load, [load]);

  // Warn before leaving with unsaved marks.
  useEffect(() => {
    if (dirty.size === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sections = useMemo(() => [...new Set(rows.map((r) => r.section).filter(Boolean))].sort(), [rows]);
  const shown = rows.filter((r) => !section || r.section === section);
  const subjects = useMemo(() => sheet?.exam.subjects ?? [], [sheet]);
  const columns = useMemo(() => markColumns(subjects), [subjects]);
  const hasParts = subjects.some((s) => s.parts?.length);
  const scale = useMemo(() => examGradeScale(sheet?.exam, site.documents?.gradeScale), [sheet, site]);
  const problems = rows.reduce((n, r) => n + columns.filter((c) => markProblem(c.maxMarks, r.marks[c.key] ?? '')).length, 0);
  const sum = (r: SheetRow) => summarise(subjects, r.marks, scale, r.grade, sheet?.exam);
  const showResult = rows.some((r) => sum(r).result !== null);

  function update(userId: string, patch: Partial<SheetRow>) {
    setRows((rs) => rs.map((r) => (r.userId === userId ? { ...r, ...patch } : r)));
    setDirty((d) => new Set(d).add(userId));
  }

  async function save() {
    if (!sheet) return;
    setErrors([]);
    setStatus({ kind: 'busy' });
    try {
      const body = { rows: rows.filter((r) => dirty.has(r.userId)).map(({ userId, marks, grade, remarks }) => ({ userId, marks, grade, remarks })) };
      const r = await api<{ saved: number; cleared: number; published: boolean }>(`/exams/${sheet.exam.id}/results`, { method: 'PUT', body });
      setDirty(new Set());
      setStatus({
        kind: 'ok',
        message: `Saved marks for ${r.saved} student${r.saved === 1 ? '' : 's'}${r.cleared ? `, removed ${r.cleared} emptied row${r.cleared === 1 ? '' : 's'}` : ''}. ${
          r.published ? 'Results are published, so families see the change straight away.' : 'Students cannot see them until you publish the exam.'
        }`,
      });
    } catch (err) {
      const lines = errorMessage(err).split('\n');
      setStatus({ kind: 'error', message: lines[0] });
      setErrors(lines.slice(1));
    }
  }

  /** Enter moves down to the same subject for the next student, like a spreadsheet. */
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const { row, col } = e.currentTarget.dataset;
    const next = document.querySelector<HTMLInputElement>(`[data-row="${Number(row) + (e.shiftKey ? -1 : 1)}"][data-col="${col}"]`);
    next?.focus();
    next?.select();
  }

  if (!sheet) {
    return (
      <>
        <PageTitle title="Enter marks" />
        <StatusMessage status={status} />
        {status.kind !== 'error' && <p className="muted">Loading…</p>}
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={`Marks: ${sheet.exam.name}`}
        intro={
          <>
            {sheet.exam.className ? `Students of class ${sheet.exam.className}. ` : 'All students. '}
            Type a number, or a code such as <strong>AB</strong> (absent). Press Enter to move down. Leave a whole row empty to remove that student’s result.
          </>
        }
        actions={
          <>
            <Link to="/portal/results" className="pbtn pbtn--ghost">
              ← Exams
            </Link>
            <Link to={`/portal/results/${sheet.exam.id}/marksheets`} className="pbtn pbtn--secondary">
              Marksheets
            </Link>
          </>
        }
      />
      <StatusMessage status={status} />
      {errors.length > 0 && (
        <div className="palert palert--error">
          <ul className="import-errors">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <p>{sheet.exam.published ? <Badge tone="success">Published: families can see results</Badge> : <Badge tone="warning">Not published yet</Badge>}</p>

      {sections.length > 1 && (
        <div className="chip-row" role="group" aria-label="Section">
          <button type="button" className="pchip" aria-pressed={!section} onClick={() => setSection('')}>
            All sections
          </button>
          {sections.map((s) => (
            <button key={s} type="button" className="pchip" aria-pressed={section === s} onClick={() => setSection(s)}>
              Section {s}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="palert palert--info">
          No students found{sheet.exam.className ? ` in class “${sheet.exam.className}”` : ''}. Check the class name on the exam and on the students (
          <Link to="/portal/students">Students</Link>).
        </p>
      ) : (
        <div className="table-wrap marks-grid">
          <table className="ptable">
            <caption className="visually-hidden">Marks for {sheet.exam.name}</caption>
            <thead>
              <tr>
                <th scope="col" rowSpan={hasParts ? 2 : 1} className="marks-grid__sticky">
                  Student
                </th>
                {subjects.map((s) =>
                  s.parts?.length ? (
                    <th key={s.name} scope="colgroup" colSpan={s.parts.length} className="marks-grid__group">
                      {s.name}
                      <span className="marks-grid__max"> /{s.maxMarks}</span>
                    </th>
                  ) : (
                    <th key={s.name} scope="col" rowSpan={hasParts ? 2 : 1}>
                      {s.name}
                      {s.maxMarks != null && <span className="marks-grid__max"> /{s.maxMarks}</span>}
                    </th>
                  ),
                )}
                {['Total', '%', 'Grade', ...(showResult ? ['Result'] : []), 'Remarks'].map((h) => (
                  <th key={h} scope="col" rowSpan={hasParts ? 2 : 1}>
                    {h}
                  </th>
                ))}
              </tr>
              {hasParts && (
                <tr>
                  {columns
                    .filter((c) => c.part !== null)
                    .map((c) => (
                      <th key={c.key} scope="col" className="marks-grid__part">
                        {c.part}
                        <span className="marks-grid__max"> /{c.maxMarks}</span>
                      </th>
                    ))}
                </tr>
              )}
            </thead>
            <tbody>
              {shown.map((r, ri) => {
                const calc = sum(r);
                return (
                  <tr key={r.userId} className={dirty.has(r.userId) ? 'is-dirty' : undefined}>
                    <th scope="row" className="marks-grid__sticky">
                      <span className="marks-grid__name">{r.displayName}</span>
                      <span className="marks-grid__sub">
                        {[r.rollNo && `Roll ${r.rollNo}`, r.section && `Sec ${r.section}`, r.studentId].filter(Boolean).join(' · ')}
                      </span>
                    </th>
                    {columns.map((c, ci) => {
                      const v = r.marks[c.key] ?? '';
                      const problem = markProblem(c.maxMarks, v);
                      return (
                        <td key={c.key}>
                          <input
                            className="marks-grid__input"
                            aria-label={`${c.label} marks for ${r.displayName}`}
                            aria-invalid={!!problem}
                            title={problem || undefined}
                            maxLength={12}
                            autoComplete="off"
                            data-row={ri}
                            data-col={ci}
                            value={v}
                            onKeyDown={onKeyDown}
                            onChange={(e) => update(r.userId, { marks: { ...r.marks, [c.key]: e.target.value } })}
                          />
                        </td>
                      );
                    })}
                    <td className="marks-grid__calc">{calc.total ?? '—'}</td>
                    <td className="marks-grid__calc">{calc.percentage ?? '—'}</td>
                    <td>
                      <input
                        className="marks-grid__input marks-grid__input--grade"
                        aria-label={`Grade for ${r.displayName}`}
                        placeholder={calc.grade && !r.grade ? calc.grade : 'auto'}
                        maxLength={12}
                        data-row={ri}
                        data-col={columns.length}
                        value={r.grade}
                        onKeyDown={onKeyDown}
                        onChange={(e) => update(r.userId, { grade: e.target.value })}
                      />
                    </td>
                    {showResult && (
                      <td className={calc.result === 'Fail' ? 'marks-grid__calc marks-grid__fail' : 'marks-grid__calc'}>
                        {calc.result === 'Pass' ? 'Passed' : calc.result === 'Fail' ? 'Not passed' : '—'}
                      </td>
                    )}
                    <td>
                      <input
                        className="marks-grid__input marks-grid__input--remarks"
                        aria-label={`Remarks for ${r.displayName}`}
                        maxLength={300}
                        data-row={ri}
                        data-col={columns.length + 1}
                        value={r.remarks}
                        onKeyDown={onKeyDown}
                        onChange={(e) => update(r.userId, { remarks: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">
        Leave Grade empty to calculate it from the percentage using{' '}
        {sheet.exam.gradeScale ? 'this exam’s own grade scale' : 'the school’s grade scale (Website content → Marksheet & ID card)'}. For a graded-only subject, type the
        grade itself, e.g. A+.
      </p>

      <div className="save-bar" data-dirty={dirty.size > 0}>
        {problems > 0 && <span className="hint hint--error">{problems} mark{problems === 1 ? ' needs' : 's need'} fixing (shown in red).</span>}
        <span className="muted small">{dirty.size ? `${dirty.size} student${dirty.size === 1 ? '' : 's'} changed` : 'No unsaved changes'}</span>
        <button type="button" className="pbtn pbtn--primary" onClick={save} disabled={dirty.size === 0 || problems > 0 || status.kind === 'busy'}>
          {status.kind === 'busy' ? 'Saving…' : 'Save marks'}
        </button>
      </div>
    </>
  );
}
