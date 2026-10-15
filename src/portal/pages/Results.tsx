import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { Badge, ConfirmButton, PageTitle, StatusMessage, type Status } from '../components/ui';

interface Subject {
  name: string;
  maxMarks: number | null;
}

interface Exam {
  id: string;
  name: string;
  subjects: Subject[];
  published: boolean;
  resultCount: number;
  updatedAt: string;
}

interface ResultRow {
  studentId: string;
  displayName: string;
  marks: Record<string, string>;
  grade: string | null;
  remarks: string | null;
  total: number | null;
  maxTotal: number | null;
  percentage: number | null;
}

interface Student {
  role: string;
  active: boolean;
  studentId: string | null;
  displayName: string;
}

interface Draft {
  id?: string;
  name: string;
  subjects: { name: string; maxMarks: string }[];
}

/** Quote a CSV cell; neutralise values a spreadsheet might run as a formula. */
function cell(v: string): string {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  // The BOM makes Excel read Bengali names correctly.
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const subjectHeader = (s: Subject) => (s.maxMarks != null ? `${s.name} (${s.maxMarks})` : s.name);

export default function Results() {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ exam: Exam; results: ResultRow[] } | null>(null);
  const uploadFor = useRef<Exam | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ exams: Exam[] }>('/exams')
      .then((r) => setExams(r.exams))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  async function saveExam(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const body = {
      name: draft.name,
      subjects: draft.subjects
        .filter((s) => s.name.trim())
        .map((s) => ({ name: s.name.trim(), maxMarks: s.maxMarks.trim() ? Number(s.maxMarks) : null })),
    };
    setStatus({ kind: 'busy' });
    try {
      if (draft.id) await api(`/exams/${draft.id}`, { method: 'PUT', body });
      else await api('/exams', { method: 'POST', body });
      setStatus({ kind: 'ok', message: 'Exam saved. Next, download the template, fill in the marks and upload it.' });
      setDraft(null);
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  async function downloadTemplate(exam: Exam) {
    try {
      const [{ users }, { results }] = await Promise.all([
        api<{ users: Student[] }>('/users'),
        api<{ results: ResultRow[] }>(`/exams/${exam.id}/results`),
      ]);
      const existing = new Map(results.map((r) => [r.studentId.toLowerCase(), r]));
      const students = users
        .filter((u) => u.role === 'student' && u.active && u.studentId)
        .sort((a, b) => a.studentId!.localeCompare(b.studentId!, undefined, { numeric: true }));
      const rows = [
        ['student_id', 'student_name', ...exam.subjects.map(subjectHeader), 'grade', 'remarks'],
        ...students.map((s) => {
          const r = existing.get(s.studentId!.toLowerCase());
          return [s.studentId!, s.displayName, ...exam.subjects.map((sub) => r?.marks[sub.name] ?? ''), r?.grade ?? '', r?.remarks ?? ''];
        }),
      ];
      downloadCsv(`${exam.name.replace(/[^\w-]+/g, '_')}.csv`, rows);
      setStatus({
        kind: 'ok',
        message: `Template downloaded with ${students.length} students${results.length ? ' and the marks already uploaded' : ''}. Fill in the marks, save as CSV, then upload it.`,
      });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  async function onFile(file: File | undefined) {
    const exam = uploadFor.current;
    if (!file || !exam) return;
    setImportErrors([]);
    setStatus({ kind: 'busy' });
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('Please upload a .csv file. In Excel use File → Save As → “CSV UTF-8”.');
      const csv = await file.text();
      const r = await api<{ imported: number; skipped: number; published: boolean }>(`/exams/${exam.id}/import`, { method: 'POST', body: { csv } });
      const skippedNote = r.skipped ? ` ${r.skipped} blank rows were skipped.` : '';
      setStatus({
        kind: 'ok',
        message: `Saved results for ${r.imported} student${r.imported === 1 ? '' : 's'} in “${exam.name}”.${skippedNote}${r.published ? ' Students can see them now.' : ' Students cannot see them until you press Publish.'}`,
      });
      load();
    } catch (err) {
      const lines = errorMessage(err).split('\n');
      setStatus({ kind: 'error', message: lines[0] });
      setImportErrors(lines.slice(1));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function view(exam: Exam) {
    try {
      const r = await api<{ results: ResultRow[] }>(`/exams/${exam.id}/results`);
      setViewing({ exam, results: r.results });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  async function act(fn: () => Promise<unknown>, message: string) {
    try {
      await fn();
      setStatus({ kind: 'ok', message });
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <>
      <PageTitle
        title="Results"
        intro="Each student sees only their own results, after you publish them. Steps: create the exam → download the template → fill in marks → upload → publish."
        actions={
          !draft && (
            <button type="button" className="pbtn pbtn--primary" onClick={() => setDraft({ name: '', subjects: [{ name: '', maxMarks: '100' }] })}>
              New exam
            </button>
          )
        }
      />
      <StatusMessage status={status} />
      {importErrors.length > 0 && (
        <div className="palert palert--error">
          <ul className="import-errors">
            {importErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {draft && (
        <form className="pcard pform" onSubmit={saveExam}>
          <h2>{draft.id ? 'Edit exam' : 'New exam'}</h2>
          <div className="pfield">
            <label htmlFor="x-name">Exam name</label>
            <input id="x-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Annual Examination 2026 – Class 5" required />
          </div>
          <fieldset className="plist-field">
            <legend>Subjects</legend>
            <p className="hint">Maximum marks are optional; with them, totals and percentages are calculated.</p>
            <ol>
              {draft.subjects.map((s, i) => (
                <li key={i} className="subject-row">
                  <div className="pfield">
                    <label htmlFor={`x-sub-${i}`}>Subject {i + 1}</label>
                    <input
                      id={`x-sub-${i}`}
                      value={s.name}
                      onChange={(e) => setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                    />
                  </div>
                  <div className="pfield">
                    <label htmlFor={`x-max-${i}`}>Max marks</label>
                    <input
                      id={`x-max-${i}`}
                      type="number"
                      min={1}
                      max={1000}
                      value={s.maxMarks}
                      onChange={(e) => setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, maxMarks: e.target.value } : x)) })}
                    />
                  </div>
                  <button
                    type="button"
                    className="pbtn pbtn--danger-ghost pbtn--xs"
                    aria-label={`Remove subject ${i + 1}`}
                    disabled={draft.subjects.length === 1}
                    onClick={() => setDraft({ ...draft, subjects: draft.subjects.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => setDraft({ ...draft, subjects: [...draft.subjects, { name: '', maxMarks: '100' }] })}>
              + Add subject
            </button>
          </fieldset>
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              Save exam
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!exams && <p className="muted">Loading…</p>}
      {exams && exams.length === 0 && !draft && <p className="muted">No exams yet. Press “New exam” to start.</p>}
      <ul className="item-list">
        {exams?.map((x) => (
          <li key={x.id} className="item">
            <div className="item__main">
              <div className="item__meta">
                {x.published ? <Badge tone="success">Published — students can see</Badge> : <Badge tone="warning">Not published</Badge>}
                <span className="muted">
                  {x.resultCount} student{x.resultCount === 1 ? '' : 's'} uploaded
                </span>
              </div>
              <h3>{x.name}</h3>
              <p className="muted small">{x.subjects.map(subjectHeader).join(' · ')}</p>
            </div>
            <div className="item__actions">
              <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => downloadTemplate(x)}>
                1. Download template
              </button>
              <button
                type="button"
                className="pbtn pbtn--secondary pbtn--sm"
                onClick={() => {
                  uploadFor.current = x;
                  fileRef.current?.click();
                }}
              >
                2. Upload marks (CSV)
              </button>
              <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => view(x)} disabled={x.resultCount === 0}>
                View
              </button>
              {x.published ? (
                <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => act(() => api(`/exams/${x.id}/publish`, { method: 'POST', body: { published: false } }), 'Results hidden from students.')}>
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="pbtn pbtn--primary pbtn--sm"
                  disabled={x.resultCount === 0}
                  onClick={() => act(() => api(`/exams/${x.id}/publish`, { method: 'POST', body: { published: true } }), `“${x.name}” published. Each student can now see their own results.`)}
                >
                  3. Publish
                </button>
              )}
              <button
                type="button"
                className="pbtn pbtn--ghost pbtn--sm"
                onClick={() => setDraft({ id: x.id, name: x.name, subjects: x.subjects.map((s) => ({ name: s.name, maxMarks: s.maxMarks?.toString() ?? '' })) })}
              >
                Edit
              </button>
              <ConfirmButton label="Delete" confirmLabel="Yes, delete exam and all its results" onConfirm={() => act(() => api(`/exams/${x.id}`, { method: 'DELETE' }), 'Exam deleted.')} />
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <section className="pcard results-view" aria-labelledby="view-heading">
          <div className="ptitle">
            <h2 id="view-heading">{viewing.exam.name}</h2>
            <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setViewing(null)}>
              Close
            </button>
          </div>
          <div className="table-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th scope="col">Student ID</th>
                  <th scope="col">Name</th>
                  {viewing.exam.subjects.map((s) => (
                    <th key={s.name} scope="col">
                      {subjectHeader(s)}
                    </th>
                  ))}
                  <th scope="col">Total</th>
                  <th scope="col">%</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {viewing.results.map((r) => (
                  <tr key={r.studentId}>
                    <td>
                      <code>{r.studentId}</code>
                    </td>
                    <td>{r.displayName}</td>
                    {viewing.exam.subjects.map((s) => (
                      <td key={s.name}>{r.marks[s.name] ?? '—'}</td>
                    ))}
                    <td>{r.total ?? '—'}{r.maxTotal ? ` / ${r.maxTotal}` : ''}</td>
                    <td>{r.percentage ?? '—'}</td>
                    <td>{r.grade ?? ''}</td>
                    <td className="small">{r.remarks ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
