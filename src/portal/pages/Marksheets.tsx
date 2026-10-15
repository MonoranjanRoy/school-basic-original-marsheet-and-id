import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Marksheet } from '../../components/Marksheet';
import type { Marksheet as MarksheetData } from '../../lib/marksheet';
import { api, errorMessage } from '../api';
import { Badge, Checkbox, PageTitle } from '../components/ui';

/** Head teacher: print marksheets for a whole exam (one per A4 page) or one student. */
export default function Marksheets() {
  const { id } = useParams();
  const [data, setData] = useState<{ exam: { id: string; name: string; published: boolean }; marksheets: MarksheetData[] } | null>(null);
  const [error, setError] = useState('');
  const [fullAadhaar, setFullAadhaar] = useState(false);
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setError('');
    api<NonNullable<typeof data>>(`/exams/${id}/marksheets${fullAadhaar ? '?fullAadhaar=1' : ''}`)
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, [id, fullAadhaar]);

  const sections = useMemo(() => [...new Set((data?.marksheets ?? []).map((m) => m.student.section).filter(Boolean))].sort(), [data]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.marksheets ?? []).filter(
      (m) => (!section || m.student.section === section) && (!q || [m.student.name, m.student.studentId, m.student.rollNo].some((v) => v.toLowerCase().includes(q))),
    );
  }, [data, section, search]);

  return (
    <>
      <div className="no-print">
        <PageTitle
          title={data ? `Marksheets: ${data.exam.name}` : 'Marksheets'}
          intro="Made automatically from the marks and each student’s details. Each marksheet prints on its own A4 page."
          actions={
            <>
              <Link to="/portal/results" className="pbtn pbtn--ghost">
                ← Exams
              </Link>
              {data && (
                <Link to={`/portal/results/${data.exam.id}/marks`} className="pbtn pbtn--secondary">
                  Edit marks
                </Link>
              )}
              {shown.length > 0 && (
                <button type="button" className="pbtn pbtn--primary" onClick={() => window.print()}>
                  Print {shown.length}
                </button>
              )}
            </>
          }
        />
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        {data && <p>{data.exam.published ? <Badge tone="success">Published: families can see these</Badge> : <Badge tone="warning">Not published: only you can see these</Badge>}</p>}
        <div className="filter-bar">
          {sections.length > 1 && (
            <div className="pfield">
              <label htmlFor="ms-section">Section</label>
              <select id="ms-section" value={section} onChange={(e) => setSection(e.target.value)}>
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
            <label htmlFor="ms-search">Find a student</label>
            <input id="ms-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, student ID or roll no." />
          </div>
        </div>
        <Checkbox
          label="Print the full Aadhaar number"
          help="Off: printed as XXXX XXXX 1234 (recommended by UIDAI). Turning it on is recorded in the activity log."
          checked={fullAadhaar}
          onChange={setFullAadhaar}
        />
        <p className="hint">Tip: in the print window turn on “Background graphics” so the coloured headings print.</p>
        {!data && !error && <p className="muted">Loading…</p>}
        {data && data.marksheets.length === 0 && (
          <p className="palert palert--info">
            No marks entered for this exam yet. <Link to={`/portal/results/${data.exam.id}/marks`}>Enter marks</Link>.
          </p>
        )}
      </div>

      {shown.map((m) => (
        <Marksheet key={`${m.examId}-${m.student.studentId}`} sheet={m} />
      ))}
    </>
  );
}
