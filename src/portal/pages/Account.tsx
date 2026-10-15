import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { ROLE_LABELS, useAuth, type PortalUser } from '../auth';
import { PageTitle } from '../components/ui';

export default function Account() {
  const { user, setUser } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next.length < 10) return setError('The new password must be at least 10 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    setBusy(true);
    try {
      const r = await api<{ user: PortalUser }>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      setUser(r.user);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="My account" />
      <dl className="pdl">
        <div>
          <dt>Name</dt>
          <dd>{user.displayName}</dd>
        </div>
        {user.role === 'student' ? (
          <div>
            <dt>Student ID</dt>
            <dd>{user.studentId}</dd>
          </div>
        ) : (
          <div>
            <dt>Username</dt>
            <dd>{user.username}</dd>
          </div>
        )}
        <div>
          <dt>Role</dt>
          <dd>{ROLE_LABELS[user.role]}</dd>
        </div>
      </dl>

      {user.role === 'student' ? (
        <p className="palert palert--info">
          You sign in with your student ID and date of birth. If either is wrong, please tell the school office.
        </p>
      ) : (
      <section className="pcard" aria-labelledby="pw-heading">
        <h2 id="pw-heading">Change password</h2>
        {user.mustChangePassword && (
          <p className="palert palert--warning">You are using a temporary password. Choose your own password to continue.</p>
        )}
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="palert palert--success" role="status">
            Password changed. You have been signed out on other devices.
          </p>
        )}
        <form onSubmit={onSubmit} className="pform" noValidate>
          <div className="pfield">
            <label htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="pfield">
            <label htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-hint" />
            <p id="pw-hint" className="hint">
              At least 10 characters. A short sentence is easy to remember and hard to guess.
            </p>
          </div>
          <div className="pfield">
            <label htmlFor="pw-confirm">Repeat new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button type="submit" className="pbtn pbtn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
      )}
    </>
  );
}
