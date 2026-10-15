import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  DEFAULT_GRADE_SCALE,
  GRADE_SCALE_PRESETS,
  markColumns,
  parseGradeScale,
  partNames,
  type ExamRules,
  type ExamSubject as Subject,
} from '../../lib/marksheet';
import { useSite } from '../../lib/site';
import { api, errorMessage } from '../api';
import { Badge, Checkbox, ConfirmButton, PageTitle, StatusMessage, type Status } from '../components/ui';
import { downloadCsv, safeFilename } from '../csv';
import { classesOf, classSuggestions, type Student } from '../students';

interface Exam extends ExamRules {
  id: string;
  name: string;
  subjects: Subject[];
  published: boolean;
  className: string;
  session: string;
  resultCount: number;
  updatedAt: string;
}

interface ResultRow {
  studentId: string;
  displayName: string;
  marks: Record<string, string>;
  grade: string | null;
  remarks: string | null;
}

interface DraftMarks {
  maxMarks: string;
  passMarks: string;
}

interface DraftSubject extends DraftMarks {
  name: string;
  /** Keyed by DraftPart.id; a part with no full marks is one this subject doesn't have. */
  parts: Record<number, DraftMarks>;
}

interface DraftPart {
  id: number;
  name: string;
}

interface Draft {
  id?: string;
  name: string;
  className: string;
  session: string;
  parts: DraftPart[];
  subjects: DraftSubject[];
  customScale: boolean;
  gradeRows: { min: string; grade: string }[];
  passPercentage: string;
  subjectGrades: boolean;
}

const PART_SUGGESTIONS = ['Term 1', 'Term 2', 'Term 3', 'Unit test', 'Half-yearly', 'Annual', 'Written', 'Viva', 'Oral', 'Practical', 'Project', 'Internal assessment'];
const PART_PRESETS = [['Term 1', 'Term 2'], ['Term 1', 'Term 2', 'Viva'], ['Written', 'Oral'], ['Theory', 'Practical']];

let nextPartId = 1;
const newSubject = (): DraftSubject => ({ name: '', maxMarks: '100', passMarks: '', parts: {} });
const scaleRows = (scale: string) => parseGradeScale(scale).map((r) => ({ min: String(r.min), grade: r.grade }));
const num = (v: string) => (v.trim() ? Number(v) : null);

/** A form draft from an exam (to edit or copy it), or a blank one. */
function draftFrom(x?: Exam): Draft {
  const parts = partNames(x?.subjects ?? []).map((name) => ({ id: nextPartId++, name }));
  const idOf = new Map(parts.map((p) => [p.name, p.id]));
  return {
    id: x?.id,
    name: x?.name ?? '',
    className: x?.className ?? '',
    session: x?.session ?? '',
    parts,
    subjects: x
      ? x.subjects.map((s) => ({
          name: s.name,
          maxMarks: s.parts?.length ? '' : s.maxMarks?.toString() ?? '',
          passMarks: s.passMarks?.toString() ?? '',
          parts: Object.fromEntries((s.parts ?? []).map((p) => [idOf.get(p.name)!, { maxMarks: String(p.maxMarks), passMarks: p.passMarks?.toString() ?? '' }])),
        }))
      : [newSubject()],
    customScale: !!x?.gradeScale,
    gradeRows: scaleRows(x?.gradeScale || DEFAULT_GRADE_SCALE),
    passPercentage: x?.passPercentage?.toString() ?? '',
    subjectGrades: x ? x.subjectGrades : true,
  };
}

/** The parts a draft subject actually has (full marks filled in). */
const subjectParts = (d: Draft, s: DraftSubject) => d.parts.filter((p) => p.name.trim() && s.parts[p.id]?.maxMarks.trim());

function draftBody(d: Draft) {
  return {
    name: d.name,
    className: d.className.trim(),
    session: d.session.trim(),
    subjects: d.subjects
      .filter((s) => s.name.trim())
      .map((s) => {
        const parts = subjectParts(d, s).map((p) => ({ name: p.name.trim(), maxMarks: Number(s.parts[p.id].maxMarks), passMarks: num(s.parts[p.id].passMarks) }));
        return { name: s.name.trim(), maxMarks: parts.length ? parts.reduce((sum, p) => sum + p.maxMarks, 0) : num(s.maxMarks), passMarks: num(s.passMarks), parts };
      }),
    gradeScale: d.customScale
      ? d.gradeRows
          .filter((r) => r.min.trim() && r.grade.trim())
          .map((r) => `${Number(r.min)}:${r.grade.trim()}`)
          .join(', ')
      : '',
    passPercentage: num(d.passPercentage),
    subjectGrades: d.subjectGrades,
  };
}

const columnHeader = (c: { label: string; maxMarks: number | null }) => (c.maxMarks != null ? `${c.label} (${c.maxMarks})` : c.label);

/** "English (Term 1 40 + Term 2 40 + Viva 20 = 100), pass 33" */
function describeSubject(s: Subject): string {
  const marks = s.parts?.length
    ? ` (${s.parts.map((p) => `${p.name} ${p.maxMarks}${p.passMarks != null ? ` pass ${p.passMarks}` : ''}`).join(' + ')} = ${s.maxMarks})`
    : s.maxMarks != null
      ? ` (${s.maxMarks})`
      : ' (graded)';
  return `${s.name}${marks}${s.passMarks != null ? `, pass ${s.passMarks}` : ''}`;
}

export default function Results() {
  const site = useSite();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const uploadFor = useRef<Exam | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ exams: Exam[] }>('/exams')
      .then((r) => setExams(r.exams))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api<{ students: Student[] }>('/students')
      .then((r) => setStudents(r.students))
      .catch(() => {});
  }, []);
  const classes = useMemo(() => classesOf(students), [students]);

  async function saveExam(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setStatus({ kind: 'busy' });
    try {
      const body = draftBody(draft);
      if (draft.id) await api(`/exams/${draft.id}`, { method: 'PUT', body });
      else await api('/exams', { method: 'POST', body });
      setStatus({ kind: 'ok', message: 'Exam saved. Next, press “Enter marks” (or use a spreadsheet), then Publish.' });
      setDraft(null);
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  async function downloadTemplate(exam: Exam) {
    try {
      const { results } = await api<{ results: ResultRow[] }>(`/exams/${exam.id}/results`);
      const existing = new Map(results.map((r) => [r.studentId.toLowerCase(), r]));
      const columns = markColumns(exam.subjects);
      const list = students
        .filter((s) => s.active && (!exam.className || s.className.toLowerCase() === exam.className.toLowerCase() || existing.has(s.studentId.toLowerCase())))
        .sort((a, b) => a.section.localeCompare(b.section) || a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }) || a.displayName.localeCompare(b.displayName));
      const rows = [
        ['student_id', 'student_name', 'section', 'roll_no', ...columns.map(columnHeader), 'grade', 'remarks'],
        ...list.map((s) => {
          const r = existing.get(s.studentId.toLowerCase());
          return [s.studentId, s.displayName, s.section, s.rollNo, ...columns.map((c) => r?.marks[c.key] ?? ''), r?.grade ?? '', r?.remarks ?? ''];
        }),
      ];
      downloadCsv(`${safeFilename(exam.name)}.csv`, rows);
      setStatus({
        kind: 'ok',
        message: `Spreadsheet downloaded with ${list.length} students${results.length ? ' and the marks already entered' : ''}. Fill in the marks, save as CSV, then upload it.`,
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

  async function act(fn: () => Promise<unknown>, message: string) {
    try {
      await fn();
      setStatus({ kind: 'ok', message });
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });
  const setSubject = (i: number, patch: Partial<DraftSubject>) =>
    draft && setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setSubjectPart = (i: number, partId: number, patch: Partial<DraftMarks>) =>
    draft &&
    setSubject(i, { parts: { ...draft.subjects[i].parts, [partId]: { ...(draft.subjects[i].parts[partId] ?? { maxMarks: '', passMarks: '' }), ...patch } } });
  const addParts = (names: string[]) => {
    if (!draft) return;
    const have = new Set(draft.parts.map((p) => p.name.trim().toLowerCase()));
    set({ parts: [...draft.parts, ...names.filter((n) => !have.has(n.toLowerCase())).map((name) => ({ id: nextPartId++, name }))] });
  };
  const setGradeRow = (i: number, patch: Partial<Draft['gradeRows'][number]>) =>
    draft && set({ gradeRows: draft.gradeRows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const hasParts = !!draft?.parts.length;

  return (
    <>
      <PageTitle
        title="Results"
        intro="Steps: create the exam → enter marks → check the marksheets → publish. After publishing, families see the marksheet on the website’s “Check result” page with the ID card number and date of birth."
        actions={
          !draft && (
            <button type="button" className="pbtn pbtn--primary" onClick={() => setDraft(draftFrom())}>
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
          {!!exams?.find((x) => x.id === draft.id)?.resultCount && (
            <p className="palert palert--warning">
              Marks are already entered. They are kept under each subject and part name, so if you rename a subject or part, type its marks again.
            </p>
          )}
          {!draft.id && !!exams?.length && (
            <div className="pfield">
              <label htmlFor="x-copy">Copy the setup of an earlier exam</label>
              <select
                id="x-copy"
                value=""
                onChange={(e) => {
                  const from = exams.find((x) => x.id === e.target.value);
                  if (from) setDraft({ ...draftFrom(from), id: undefined, name: '' });
                }}
                aria-describedby="x-copy-h"
              >
                <option value="">Choose an exam…</option>
                {exams.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {x.className ? ` · Class ${x.className}` : ''}
                    {x.session ? ` · ${x.session}` : ''}
                  </option>
                ))}
              </select>
              <p id="x-copy-h" className="hint">
                Copies the class, subjects, parts, pass marks and grading. Marks are not copied.
              </p>
            </div>
          )}
          <div className="pform__row">
            <div className="pfield">
              <label htmlFor="x-name">Exam name</label>
              <input id="x-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Annual Examination 2026" required />
            </div>
            <div className="pfield">
              <label htmlFor="x-class">Class</label>
              <input id="x-class" list="x-classes" value={draft.className} onChange={(e) => set({ className: e.target.value })} aria-describedby="x-class-h" />
              <datalist id="x-classes">
                {classSuggestions(classes).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p id="x-class-h" className="hint">
                e.g. LKG, UKG or 5. The marks sheet lists the students of this class. Leave empty for all students.
              </p>
            </div>
            <div className="pfield">
              <label htmlFor="x-session">Session</label>
              <input id="x-session" value={draft.session} onChange={(e) => set({ session: e.target.value })} placeholder="e.g. 2026–27" aria-describedby="x-session-h" />
              <p id="x-session-h" className="hint">
                Printed on the marksheet. Empty: the current session from Website content.
              </p>
            </div>
          </div>

          <fieldset className="plist-field">
            <legend>Mark parts (optional)</legend>
            <p className="hint">
              Split each subject’s marks into parts such as Term 1, Term 2 and Viva. Each subject then has its own full marks and pass marks for each part, and its total is the
              parts added up.
            </p>
            {hasParts && (
              <ol className="part-list">
                {draft.parts.map((p, i) => (
                  <li key={p.id} className="part-list__item">
                    <label htmlFor={`x-part-${p.id}`} className="visually-hidden">
                      Part {i + 1} name
                    </label>
                    <input
                      id={`x-part-${p.id}`}
                      list="x-part-names"
                      value={p.name}
                      placeholder={`Part ${i + 1}`}
                      onChange={(e) => set({ parts: draft.parts.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) })}
                    />
                    <button
                      type="button"
                      className="pbtn pbtn--danger-ghost pbtn--xs"
                      aria-label={`Remove part ${p.name || i + 1}`}
                      onClick={() => set({ parts: draft.parts.filter((x) => x.id !== p.id) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <datalist id="x-part-names">
              {PART_SUGGESTIONS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="pform__actions">
              <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => set({ parts: [...draft.parts, { id: nextPartId++, name: '' }] })}>
                + Add part
              </button>
              {PART_PRESETS.map((names) => (
                <button key={names.join()} type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => addParts(names)}>
                  {names.join(' + ')}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="plist-field">
            <legend>Subjects</legend>
            {hasParts ? (
              <>
                <p className="hint">
                  For each part, type the full marks and (optional) pass marks. Leave a part empty if the subject doesn’t have it, e.g. no Viva in Maths. A subject with no full
                  marks at all is graded only (e.g. Drawing: A+) and is not added to the total.
                </p>
                <div className="table-wrap">
                  <table className="ptable exam-matrix">
                    <caption className="visually-hidden">Full marks and pass marks for each subject and part</caption>
                    <thead>
                      <tr>
                        <th scope="col">Subject</th>
                        {draft.parts.map((p, i) => (
                          <th key={p.id} scope="col">
                            {p.name || `Part ${i + 1}`}
                            <span className="exam-matrix__sub">Full · Pass</span>
                          </th>
                        ))}
                        <th scope="col">Full marks</th>
                        <th scope="col">
                          Pass marks
                          <span className="exam-matrix__sub">on the total</span>
                        </th>
                        <th scope="col">
                          <span className="visually-hidden">Remove</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.subjects.map((s, i) => {
                        const label = s.name || `Subject ${i + 1}`;
                        const own = subjectParts(draft, s);
                        const total = own.reduce((sum, p) => sum + Number(s.parts[p.id].maxMarks || 0), 0);
                        return (
                          <tr key={i}>
                            <td>
                              <input className="exam-matrix__name" aria-label={`Subject ${i + 1} name`} value={s.name} onChange={(e) => setSubject(i, { name: e.target.value })} />
                            </td>
                            {draft.parts.map((p) => (
                              <td key={p.id}>
                                <div className="exam-matrix__pair">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={1000}
                                    aria-label={`${label}, ${p.name || 'part'}: full marks`}
                                    placeholder="—"
                                    value={s.parts[p.id]?.maxMarks ?? ''}
                                    onChange={(e) => setSubjectPart(i, p.id, { maxMarks: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={1000}
                                    step="any"
                                    aria-label={`${label}, ${p.name || 'part'}: pass marks`}
                                    placeholder="pass"
                                    value={s.parts[p.id]?.passMarks ?? ''}
                                    onChange={(e) => setSubjectPart(i, p.id, { passMarks: e.target.value })}
                                  />
                                </div>
                              </td>
                            ))}
                            <td>
                              {own.length ? (
                                <strong>{total}</strong>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={1000}
                                  aria-label={`${label}: full marks (no parts)`}
                                  placeholder="graded"
                                  value={s.maxMarks}
                                  onChange={(e) => setSubject(i, { maxMarks: e.target.value })}
                                />
                              )}
                            </td>
                            <td>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={1000}
                                step="any"
                                aria-label={`${label}: pass marks on the total`}
                                value={s.passMarks}
                                onChange={(e) => setSubject(i, { passMarks: e.target.value })}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="pbtn pbtn--danger-ghost pbtn--xs"
                                aria-label={`Remove ${label}`}
                                disabled={draft.subjects.length === 1}
                                onClick={() => set({ subjects: draft.subjects.filter((_, j) => j !== i) })}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <p className="hint">
                  Full marks give totals, percentage and grade. Leave them empty for a subject that is graded only (e.g. Drawing: A+). Pass marks (optional) show Passed / Not
                  passed on the marksheet.
                </p>
                <ol>
                  {draft.subjects.map((s, i) => (
                    <li key={i} className="subject-row">
                      <div className="pfield">
                        <label htmlFor={`x-sub-${i}`}>Subject {i + 1}</label>
                        <input id={`x-sub-${i}`} value={s.name} onChange={(e) => setSubject(i, { name: e.target.value })} />
                      </div>
                      <div className="pfield">
                        <label htmlFor={`x-max-${i}`}>Full marks</label>
                        <input
                          id={`x-max-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={1000}
                          value={s.maxMarks}
                          onChange={(e) => setSubject(i, { maxMarks: e.target.value })}
                        />
                      </div>
                      <div className="pfield">
                        <label htmlFor={`x-pass-${i}`}>Pass marks</label>
                        <input
                          id={`x-pass-${i}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={1000}
                          step="any"
                          value={s.passMarks}
                          onChange={(e) => setSubject(i, { passMarks: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="pbtn pbtn--danger-ghost pbtn--xs"
                        aria-label={`Remove subject ${i + 1}`}
                        disabled={draft.subjects.length === 1}
                        onClick={() => set({ subjects: draft.subjects.filter((_, j) => j !== i) })}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="pform__actions">
              <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => set({ subjects: [...draft.subjects, newSubject()] })}>
                + Add subject
              </button>
              <button
                type="button"
                className="pbtn pbtn--ghost pbtn--sm"
                onClick={() => {
                  const { maxMarks, passMarks, parts } = draft.subjects[0];
                  set({ subjects: draft.subjects.map((x) => ({ ...x, maxMarks, passMarks, parts: structuredClone(parts) })) });
                }}
              >
                Use subject 1’s marks for all
              </button>
            </div>
          </fieldset>

          <fieldset className="plist-field">
            <legend>Grades and passing</legend>
            <div className="pfield pfield--check">
              <input id="x-scale-school" type="radio" name="x-scale" checked={!draft.customScale} onChange={() => set({ customScale: false })} />
              <label htmlFor="x-scale-school">
                The school’s grade scale <span className="hint">{site.documents?.gradeScale || DEFAULT_GRADE_SCALE} (change it in Website content → Marksheet &amp; ID card)</span>
              </label>
            </div>
            <div className="pfield pfield--check">
              <input id="x-scale-own" type="radio" name="x-scale" checked={draft.customScale} onChange={() => set({ customScale: true })} />
              <label htmlFor="x-scale-own">A different grade scale for this exam (e.g. for LKG and UKG)</label>
            </div>
            {draft.customScale && (
              <div className="grade-scale">
                <div className="pform__actions">
                  <span className="muted small">Start from:</span>
                  {GRADE_SCALE_PRESETS.map((p) => (
                    <button key={p.label} type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => set({ gradeRows: scaleRows(p.scale) })}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <table className="ptable grade-scale__table">
                  <caption className="visually-hidden">Grade scale</caption>
                  <thead>
                    <tr>
                      <th scope="col">Grade</th>
                      <th scope="col">From % (lowest)</th>
                      <th scope="col">
                        <span className="visually-hidden">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.gradeRows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <input aria-label={`Grade ${i + 1}`} maxLength={12} value={r.grade} onChange={(e) => setGradeRow(i, { grade: e.target.value })} />
                        </td>
                        <td>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="any"
                            aria-label={`Lowest percentage for grade ${r.grade || i + 1}`}
                            value={r.min}
                            onChange={(e) => setGradeRow(i, { min: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pbtn pbtn--danger-ghost pbtn--xs"
                            aria-label={`Remove grade ${r.grade || i + 1}`}
                            disabled={draft.gradeRows.length === 1}
                            onClick={() => set({ gradeRows: draft.gradeRows.filter((_, j) => j !== i) })}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="hint">Give the lowest grade “0” so every student gets a grade.</p>
                <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => set({ gradeRows: [...draft.gradeRows, { min: '', grade: '' }] })}>
                  + Add grade
                </button>
              </div>
            )}
            <Checkbox
              label="Print a grade for each subject"
              help="As well as the overall grade, worked out from each subject’s percentage."
              checked={draft.subjectGrades}
              onChange={(v) => set({ subjectGrades: v })}
            />
            <div className="pfield">
              <label htmlFor="x-passpct">Pass percentage overall (optional)</label>
              <input
                id="x-passpct"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={draft.passPercentage}
                onChange={(e) => set({ passPercentage: e.target.value })}
                aria-describedby="x-passpct-h"
              />
              <p id="x-passpct-h" className="hint">
                e.g. 33. A student below this is “Not passed”, even with every subject passed.
              </p>
            </div>
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
                {x.published ? <Badge tone="success">Published: families can see</Badge> : <Badge tone="warning">Not published</Badge>}
                {x.className && <Badge tone="info">Class {x.className}</Badge>}
                {x.gradeScale && <Badge tone="info">Own grade scale</Badge>}
                {x.passPercentage != null && <Badge tone="info">Pass {x.passPercentage}% overall</Badge>}
                <span className="muted">
                  {x.resultCount} student{x.resultCount === 1 ? '' : 's'} with marks
                </span>
              </div>
              <h3>
                {x.name}
                {x.session && <span className="muted"> · {x.session}</span>}
              </h3>
              <p className="muted small">{x.subjects.map(describeSubject).join(' · ')}</p>
            </div>
            <div className="item__actions">
              <Link to={`/portal/results/${x.id}/marks`} className="pbtn pbtn--primary pbtn--sm">
                1. Enter marks
              </Link>
              <Link to={`/portal/results/${x.id}/marksheets`} className="pbtn pbtn--secondary pbtn--sm">
                2. Marksheets
              </Link>
              {x.published ? (
                <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => act(() => api(`/exams/${x.id}/publish`, { method: 'POST', body: { published: false } }), 'Results hidden from students and families.')}>
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="pbtn pbtn--primary pbtn--sm"
                  disabled={x.resultCount === 0}
                  onClick={() =>
                    act(
                      () => api(`/exams/${x.id}/publish`, { method: 'POST', body: { published: true } }),
                      `“${x.name}” published. Families can now see each marksheet on the “Check result” page.`,
                    )
                  }
                >
                  3. Publish
                </button>
              )}
              <details className="more-actions">
                <summary className="pbtn pbtn--ghost pbtn--sm">More</summary>
                <div className="more-actions__menu">
                  <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => downloadTemplate(x)}>
                    Download spreadsheet
                  </button>
                  <button
                    type="button"
                    className="pbtn pbtn--ghost pbtn--sm"
                    onClick={() => {
                      uploadFor.current = x;
                      fileRef.current?.click();
                    }}
                  >
                    Upload marks (CSV)
                  </button>
                  <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setDraft(draftFrom(x))}>
                    Edit exam
                  </button>
                  <ConfirmButton label="Delete" confirmLabel="Yes, delete exam and all its marks" onConfirm={() => act(() => api(`/exams/${x.id}`, { method: 'DELETE' }), 'Exam deleted.')} />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
