import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { PageTitle } from '../components/ui';

interface Entry {
  id: number;
  username: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  login: 'Signed in',
  'login.failed': 'Failed sign-in attempt',
  'password.changed': 'Changed own password',
  'user.created': 'Created account',
  'user.updated': 'Changed account',
  'user.password_reset': 'Reset password',
  'user.deleted': 'Deleted account',
  'settings.updated': 'Edited website content',
  'notice.created': 'Posted notice',
  'notice.updated': 'Edited notice',
  'notice.deleted': 'Deleted notice',
  'notice.approved': 'Approved notice',
  'notice.unpublished': 'Hid notice',
  'gallery.added': 'Added photo',
  'gallery.updated': 'Edited photo',
  'gallery.deleted': 'Deleted photo',
  'gallery.approved': 'Approved photo',
  'gallery.unpublished': 'Hid photo',
  'faculty.created': 'Added faculty profile',
  'faculty.updated': 'Edited faculty profile',
  'faculty.deleted': 'Deleted faculty profile',
  'faculty.own_profile_updated': 'Updated own profile',
  'media.uploaded': 'Uploaded file',
  'media.deleted': 'Deleted file',
  'exam.created': 'Created exam',
  'exam.updated': 'Edited exam',
  'exam.deleted': 'Deleted exam and its results',
  'exam.results_imported': 'Uploaded results',
  'exam.published': 'Published results',
  'exam.unpublished': 'Hid results',
};

export default function Activity() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ entries: Entry[] }>('/activity')
      .then((r) => setEntries(r.entries))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <PageTitle title="Activity log" intro="The latest 300 actions in the portal, newest first." />
      {error && (
        <p className="palert palert--error" role="alert">
          {error}
        </p>
      )}
      {!entries && !error && <p className="muted">Loading…</p>}
      <div className="table-wrap">
        <table className="ptable">
          <caption className="visually-hidden">Activity log</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">What</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id}>
                <td className="small">{new Date(e.createdAt).toLocaleString()}</td>
                <td>{e.username ?? '—'}</td>
                <td>{LABELS[e.action] ?? e.action}</td>
                <td className="small muted">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
