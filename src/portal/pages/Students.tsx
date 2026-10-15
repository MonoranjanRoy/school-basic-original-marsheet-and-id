import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { formatAadhaar, isValidAadhaar } from '../../lib/marksheet';
import { api, errorMessage } from '../api';
import { ImagePicker } from '../components/ImagePicker';
import { Badge, PageTitle, StatusMessage, today, type Status } from '../components/ui';
import { downloadCsv } from '../csv';
import { BLOOD_GROUPS, classesOf, classLine, classSuggestions, compareClasses, GENDERS, initials, photoSrc, sectionsOf, type Student } from '../students';

type Draft = Omit<Student, 'id' | 'active' | 'dateOfBirth'> & { id?: string; dateOfBirth: string };

const EMPTY: Draft = {
  displayName: '',
  studentId: '',
  dateOfBirth: '',
  className: '',
  section: '',
  rollNo: '',
  admissionNo: '',
  gender: '',
  bloodGroup: '',
  pen: '',
  aadhaar: '',
  fatherName: '',
  motherName: '',
  guardianPhone: '',
  address: '',
  photoMediaId: null,
};

const CSV_HEADERS = [
  'student_id',
  'student_name',
  'date_of_birth',
  'class',
  'section',
  'roll_no',
  'admission_no',
  'gender',
  'blood_group',
  'pen',
  'aadhaar',
  'father_name',
  'mother_name',
  'guardian_phone',
  'address',
];

/** Head teacher: every student's details for marksheets and ID cards. */
export default function Students() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(() => {
    api<{ students: Student[] }>('/students')
      .then((r) => setStudents(r.students))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  const classes = useMemo(() => classesOf(students ?? []), [students]);
  const sections = useMemo(() => sectionsOf(students ?? [], cls), [students, cls]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students ?? []).filter(
      (s) =>
        (!cls || s.className === cls) &&
        (!section || s.section === section) &&
        (!q || [s.displayName, s.studentId, s.fatherName, s.motherName, s.rollNo].some((v) => v.toLowerCase().includes(q))),
    ).sort((a, b) => compareClasses(a.className, b.className));
  }, [students, cls, section, search]);

  function edit(d: Draft) {
    setDraft(d);
    setImportErrors([]);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const { id, ...body } = draft;
    setStatus({ kind: 'busy' });
    try {
      if (id) await api(`/students/${id}`, { method: 'PUT', body });
      else await api('/students', { method: 'POST', body });
      setStatus({ kind: 'ok', message: `Saved ${draft.displayName}. Their marksheets and ID card now use these details.` });
      setDraft(null);
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  function exportCsv(template: boolean) {
    const rows = template
      ? [CSV_HEADERS]
      : [
          CSV_HEADERS,
          ...shown.map((s) => [
            s.studentId,
            s.displayName,
            s.dateOfBirth ?? '',
            s.className,
            s.section,
            s.rollNo,
            s.admissionNo,
            s.gender,
            s.bloodGroup,
            s.pen,
            // Spaces stop Excel turning the 12 digits into 2.34E+11.
            formatAadhaar(s.aadhaar),
            s.fatherName,
            s.motherName,
            s.guardianPhone,
            s.address,
          ]),
        ];
    downloadCsv(template ? 'students_template.csv' : `students${cls ? `_class_${cls}` : ''}.csv`, rows);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImportErrors([]);
    setStatus({ kind: 'busy' });
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('Please upload a .csv file. In Excel use File → Save As → “CSV UTF-8”.');
      const r = await api<{ created: number; updated: number }>('/students/import', { method: 'POST', body: { csv: await file.text() } });
      setStatus({ kind: 'ok', message: `Done: ${r.created} student${r.created === 1 ? '' : 's'} added, ${r.updated} updated.` });
      load();
    } catch (err) {
      const lines = errorMessage(err).split('\n');
      setStatus({ kind: 'error', message: lines[0] });
      setImportErrors(lines.slice(1));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const aadhaarDigits = draft?.aadhaar.replace(/\D/g, '') ?? '';
  const aadhaarProblem = aadhaarDigits && !isValidAadhaar(aadhaarDigits) ? 'This is not a valid Aadhaar number. Check the 12 digits.' : '';
  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });

  return (
    <>
      <PageTitle
        title="Students"
        intro="Details printed on marksheets and ID cards. Students check results with their student ID (the ID card number) and date of birth."
        actions={
          !draft && (
            <>
              <button type="button" className="pbtn pbtn--primary" onClick={() => edit({ ...EMPTY, className: cls, section })}>
                Add student
              </button>
              <Link to={`/portal/id-cards${cls ? `?class=${encodeURIComponent(cls)}` : ''}`} className="pbtn pbtn--secondary">
                Print ID cards
              </Link>
            </>
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

      {draft && (
        <form ref={formRef} className="pcard pform" onSubmit={save}>
          <h2>{draft.id ? `Edit ${draft.displayName}` : 'Add student'}</h2>

          <fieldset className="pgroup">
            <legend>Student</legend>
            <div className="pform__row">
              <Field label="Full name" required value={draft.displayName} onChange={(v) => set({ displayName: v })} />
              <Field label="Student ID (ID card number)" required value={draft.studentId} onChange={(v) => set({ studentId: v })} help="Unique. Used with the date of birth to check results." />
              <div className="pfield">
                <label htmlFor="st-dob">
                  Date of birth<span className="req"> *</span>
                </label>
                <input id="st-dob" type="date" min="1950-01-01" max={today()} value={draft.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} required />
              </div>
              <Select label="Gender" value={draft.gender} options={GENDERS} onChange={(v) => set({ gender: v })} />
              <Select label="Blood group" value={draft.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => set({ bloodGroup: v })} />
            </div>
          </fieldset>

          <fieldset className="pgroup">
            <legend>Class</legend>
            <div className="pform__row">
              <Field label="Class" value={draft.className} onChange={(v) => set({ className: v })} list="st-classes" help="e.g. LKG, UKG, 5 or V. Use the same spelling for every student in a class." />
              <Field label="Section" value={draft.section} onChange={(v) => set({ section: v })} />
              <Field label="Roll no." value={draft.rollNo} onChange={(v) => set({ rollNo: v })} />
              <Field label="Admission no." value={draft.admissionNo} onChange={(v) => set({ admissionNo: v })} />
            </div>
            <datalist id="st-classes">
              {classSuggestions(classes).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </fieldset>

          <fieldset className="pgroup">
            <legend>Government IDs</legend>
            <div className="pform__row">
              <Field label="PEN (Permanent Education Number)" value={draft.pen} onChange={(v) => set({ pen: v.trim() })} inputMode="numeric" help="From UDISE+, usually 11 digits." />
              <div className="pfield">
                <label htmlFor="st-aadhaar">Aadhaar number</label>
                <input
                  id="st-aadhaar"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  value={draft.aadhaar}
                  onChange={(e) => set({ aadhaar: formatAadhaar(e.target.value).slice(0, 14) })}
                  aria-invalid={!!aadhaarProblem}
                  aria-describedby="st-aadhaar-h"
                />
                <p id="st-aadhaar-h" className={aadhaarProblem ? 'hint hint--error' : 'hint'}>
                  {aadhaarProblem || 'Printed as XXXX XXXX 1234 on marksheets. Only you can see the full number.'}
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="pgroup">
            <legend>Parents and contact</legend>
            <div className="pform__row">
              <Field label="Father’s name" value={draft.fatherName} onChange={(v) => set({ fatherName: v })} />
              <Field label="Mother’s name" value={draft.motherName} onChange={(v) => set({ motherName: v })} />
              <Field label="Guardian’s phone" value={draft.guardianPhone} onChange={(v) => set({ guardianPhone: v })} type="tel" inputMode="tel" />
            </div>
            <div className="pfield">
              <label htmlFor="st-address">Address</label>
              <textarea id="st-address" rows={2} maxLength={300} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
          </fieldset>

          <ImagePicker
            label="Photo for the ID card"
            src={draft.photoMediaId ? `/media/${draft.photoMediaId}` : null}
            onPick={(img) => set({ photoMediaId: img.id })}
            onRemove={() => set({ photoMediaId: null })}
            help="A passport-size photo, face clearly visible. It is cropped to fit the card."
          />

          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy' || !!aadhaarProblem}>
              Save student
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <details className="pcard">
        <summary>
          <strong>Add or update many students from a spreadsheet</strong>
        </summary>
        <ol className="steps">
          <li>
            Download the{' '}
            <button type="button" className="linkish" onClick={() => exportCsv(true)}>
              blank template
            </button>
            , or{' '}
            <button type="button" className="linkish" onClick={() => exportCsv(false)} disabled={!students?.length}>
              the current list
            </button>{' '}
            to correct it.
          </li>
          <li>
            Fill it in with Excel or Google Sheets. Dates as DD/MM/YYYY. <strong>In Excel, format the Aadhaar and PEN columns as Text</strong>, or Excel
            changes long numbers.
          </li>
          <li>Save as “CSV UTF-8” and upload it. Students already in the list (same student ID) are updated; new ones are added.</li>
        </ol>
        <button type="button" className="pbtn pbtn--secondary" onClick={() => fileRef.current?.click()} disabled={status.kind === 'busy'}>
          Upload students (CSV)
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
      </details>

      <div className="filter-bar">
        <div className="pfield">
          <label htmlFor="f-class">Class</label>
          <select
            id="f-class"
            value={cls}
            onChange={(e) => {
              setCls(e.target.value);
              setSection('');
            }}
          >
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
            <label htmlFor="f-section">Section</label>
            <select id="f-section" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">All</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="pfield filter-bar__grow">
          <label htmlFor="f-search">Search</label>
          <input id="f-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, student ID, parent, roll no." />
        </div>
      </div>

      {!students && <p className="muted">Loading…</p>}
      {students && students.length === 0 && <p className="muted">No students yet. Use “Add student” or upload a spreadsheet.</p>}
      {students && students.length > 0 && (
        <p className="muted small">
          Showing {shown.length} of {students.length} students
        </p>
      )}
      <ul className="student-list">
        {shown.map((s) => {
          const missing = [!s.photoMediaId && 'photo', !s.className && 'class', !s.fatherName && !s.motherName && 'parents', !s.guardianPhone && 'phone'].filter(Boolean);
          return (
            <li key={s.id} className="student-row">
              {photoSrc(s) ? (
                <img src={photoSrc(s)!} alt="" className="student-row__photo" loading="lazy" />
              ) : (
                <span className="student-row__photo student-row__photo--empty" aria-hidden="true">
                  {initials(s.displayName)}
                </span>
              )}
              <div className="student-row__main">
                <p className="student-row__name">
                  {s.displayName} {!s.active && <Badge tone="warning">Disabled</Badge>}
                </p>
                <p className="small">
                  <code>{s.studentId}</code>
                  {classLine(s) && ` · ${classLine(s)}`}
                </p>
                {(s.fatherName || s.guardianPhone) && (
                  <p className="small muted">{[s.fatherName && `Father: ${s.fatherName}`, s.guardianPhone].filter(Boolean).join(' · ')}</p>
                )}
                {missing.length > 0 && <p className="small hint">Missing: {missing.join(', ')}</p>}
              </div>
              <div className="student-row__actions">
                <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => edit({ ...s, dateOfBirth: s.dateOfBirth ?? '' })}>
                  Edit
                </button>
                <Link to={`/portal/id-cards?student=${s.id}`} className="pbtn pbtn--ghost pbtn--sm">
                  ID card
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="small muted">To disable or delete a student, use Accounts.</p>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  help,
  required,
  type = 'text',
  inputMode,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  required?: boolean;
  type?: string;
  inputMode?: 'numeric' | 'tel' | 'text';
  list?: string;
}) {
  const id = `st-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="pfield">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      <input id={id} type={type} inputMode={inputMode} list={list} value={value} onChange={(e) => onChange(e.target.value)} required={required} aria-describedby={help ? `${id}-h` : undefined} />
      {help && (
        <p id={`${id}-h`} className="hint">
          {help}
        </p>
      )}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const id = `st-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="pfield">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
