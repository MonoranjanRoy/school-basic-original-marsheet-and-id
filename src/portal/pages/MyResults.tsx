import { useEffect, useState } from 'react';
import { Marksheet } from '../../components/Marksheet';
import type { Marksheet as MarksheetData } from '../../lib/marksheet';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { PageTitle } from '../components/ui';

/** A student's own published marksheets. */
export default function MyResults() {
  const { user } = useAuth();
  const [marksheets, setMarksheets] = useState<MarksheetData[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ marksheets: MarksheetData[] }>('/my-results')
      .then((r) => setMarksheets(r.marksheets))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <div className="no-print">
        <PageTitle
          title="My results"
          intro={user ? `${user.displayName} · Student ID ${user.studentId}` : undefined}
          actions={
            marksheets && marksheets.length > 0 ? (
              <button type="button" className="pbtn pbtn--secondary" onClick={() => window.print()}>
                Print / save as PDF
              </button>
            ) : undefined
          }
        />
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        {!marksheets && !error && <p className="muted">Loading…</p>}
        {marksheets && marksheets.length === 0 && <p className="palert palert--info">No results have been published for you yet.</p>}
      </div>
      {marksheets?.map((m) => (
        <Marksheet key={m.examId} sheet={m} />
      ))}
    </>
  );
}
