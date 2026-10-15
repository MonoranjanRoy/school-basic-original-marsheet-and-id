import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { PageTitle } from '../components/ui';

interface ExamResult {
  examId: string;
  examName: string;
  subjects: { name: string; maxMarks: number | null; marks: string }[];
  grade: string | null;
  remarks: string | null;
  total: number | null;
  maxTotal: number | null;
  percentage: number | null;
}

/** A student's own published results. */
export default function MyResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ results: ExamResult[] }>('/my-results')
      .then((r) => setResults(r.results))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <PageTitle
        title="My results"
        intro={user ? `${user.displayName} · Student ID ${user.studentId}` : undefined}
        actions={
          results && results.length > 0 ? (
            <button type="button" className="pbtn pbtn--secondary no-print" onClick={() => window.print()}>
              Print
            </button>
          ) : undefined
        }
      />
      {error && (
        <p className="palert palert--error" role="alert">
          {error}
        </p>
      )}
      {!results && !error && <p className="muted">Loading…</p>}
      {results && results.length === 0 && <p className="palert palert--info">No results have been published for you yet.</p>}

      {results?.map((r) => (
        <section key={r.examId} className="pcard result-card" aria-labelledby={`exam-${r.examId}`}>
          <h2 id={`exam-${r.examId}`}>{r.examName}</h2>
          <div className="table-wrap">
            <table className="ptable">
              <caption className="visually-hidden">Marks for {r.examName}</caption>
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Marks</th>
                  <th scope="col">Out of</th>
                </tr>
              </thead>
              <tbody>
                {r.subjects.map((s) => (
                  <tr key={s.name}>
                    <th scope="row">{s.name}</th>
                    <td>{s.marks || '—'}</td>
                    <td>{s.maxMarks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {r.total !== null && (
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>
                      <strong>{r.total}</strong>
                    </td>
                    <td>{r.maxTotal ?? '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <dl className="pdl result-summary">
            {r.percentage !== null && (
              <div>
                <dt>Percentage</dt>
                <dd>{r.percentage}%</dd>
              </div>
            )}
            {r.grade && (
              <div>
                <dt>Grade</dt>
                <dd>{r.grade}</dd>
              </div>
            )}
            {r.remarks && (
              <div>
                <dt>Remarks</dt>
                <dd>{r.remarks}</dd>
              </div>
            )}
          </dl>
        </section>
      ))}
    </>
  );
}
