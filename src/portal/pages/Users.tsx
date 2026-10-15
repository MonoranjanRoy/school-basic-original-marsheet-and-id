import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { ROLE_LABELS, useAuth, type Role } from '../auth';
import { Badge, ConfirmButton, PageTitle, StatusMessage, type Status } from '../components/ui';

interface Account {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  studentId: string | null;
  dateOfBirth: string | null;
}

interface Credentials {
  username: string;
  temporaryPassword: string;
}

type StaffRole = Exclude<Role, 'student'>;

const STAFF_ROLE_HELP: Record<StaffRole, string> = {
  head_teacher: 'Full control of the website, accounts and all posts.',
  faculty: 'Can post notices and photos and edit their own Faculty profile.',
};

const today = () => new Date().toISOString().slice(0, 10);

const suggestUsername = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 30);

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<Account[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [adding, setAdding] = useState<'staff' | 'student'>('staff');
  const [staff, setStaff] = useState<{ displayName: string; username: string; role: StaffRole }>({ displayName: '', username: '', role: 'faculty' });
  const [student, setStudent] = useState({ displayName: '', studentId: '', dateOfBirth: '' });
  const [editing, setEditing] = useState<{ id: string; displayName: string; studentId: string; dateOfBirth: string; isStudent: boolean } | null>(null);
  const [filter, setFilter] = useState<Role | 'all'>('all');

  const load = useCallback(() => {
    api<{ users: Account[] }>('/users')
      .then((r) => setUsers(r.users))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, message: string) {
    setCreds(null);
    setStatus({ kind: 'busy' });
    try {
      await fn();
      setStatus({ kind: 'ok', message });
      load();
      return true;
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
      return false;
    }
  }

  async function createStaff(e: FormEvent) {
    e.preventDefault();
    setCreds(null);
    setStatus({ kind: 'busy' });
    try {
      const r = await api<Credentials>('/users', { method: 'POST', body: staff });
      setCreds(r);
      setStatus({ kind: 'ok', message: `Account “${r.username}” created.` });
      setStaff({ displayName: '', username: '', role: staff.role });
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  async function createStudent(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => api('/users', { method: 'POST', body: { role: 'student', ...student, studentId: student.studentId.trim() } }),
      `Student account created. ${student.displayName} can now sign in on the student sign-in page with student ID “${student.studentId.trim()}” and their date of birth.`,
    );
    if (ok) setStudent({ displayName: '', studentId: '', dateOfBirth: '' });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body = editing.isStudent
      ? { displayName: editing.displayName, studentId: editing.studentId.trim(), dateOfBirth: editing.dateOfBirth }
      : { displayName: editing.displayName };
    if (await run(() => api(`/users/${editing.id}`, { method: 'PATCH', body }), 'Details saved.')) setEditing(null);
  }

  async function resetPassword(u: Account) {
    try {
      const r = await api<Credentials>(`/users/${u.id}/reset-password`, { method: 'POST' });
      setCreds(r);
      setStatus({ kind: 'ok', message: `New temporary password created for “${u.username}”. They have been signed out.` });
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  const shown = users?.filter((u) => filter === 'all' || u.role === filter);

  return (
    <>
      <PageTitle
        title="Accounts"
        intro="Staff sign in with a username and password. Students sign in with their student ID and date of birth."
      />
      <StatusMessage status={status} />

      {creds && (
        <div className="pcard creds" role="status">
          <h2>Give these details to the staff member</h2>
          <dl className="pdl">
            <div>
              <dt>Username</dt>
              <dd>
                <code>{creds.username}</code>
              </dd>
            </div>
            <div>
              <dt>Temporary password</dt>
              <dd>
                <code>{creds.temporaryPassword}</code>
              </dd>
            </div>
          </dl>
          <p className="hint">This password is shown only once. They must choose a new password when they first sign in at /portal/login.</p>
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            onClick={() => navigator.clipboard?.writeText(`Username: ${creds.username}\nTemporary password: ${creds.temporaryPassword}`)}
          >
            Copy
          </button>
        </div>
      )}

      {editing && (
        <form className="pcard pform" onSubmit={saveEdit}>
          <h2>Edit {editing.isStudent ? 'student' : 'account'}</h2>
          <div className="pform__row">
            <div className="pfield">
              <label htmlFor="e-name">Full name</label>
              <input id="e-name" value={editing.displayName} onChange={(e) => setEditing({ ...editing, displayName: e.target.value })} required />
            </div>
            {editing.isStudent && (
              <>
                <div className="pfield">
                  <label htmlFor="e-sid">Student ID</label>
                  <input id="e-sid" value={editing.studentId} spellCheck={false} onChange={(e) => setEditing({ ...editing, studentId: e.target.value })} required />
                </div>
                <div className="pfield">
                  <label htmlFor="e-dob">Date of birth</label>
                  <input id="e-dob" type="date" max={today()} value={editing.dateOfBirth} onChange={(e) => setEditing({ ...editing, dateOfBirth: e.target.value })} required />
                </div>
              </>
            )}
          </div>
          {editing.isStudent && <p className="hint">Changing the student ID or date of birth signs the student out.</p>}
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              Save
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="pcard">
        <div className="chip-row" role="group" aria-label="Type of account to add">
          <button type="button" className="pchip" aria-pressed={adding === 'staff'} onClick={() => setAdding('staff')}>
            Add staff / head teacher
          </button>
          <button type="button" className="pchip" aria-pressed={adding === 'student'} onClick={() => setAdding('student')}>
            Add student
          </button>
        </div>

        {adding === 'staff' ? (
          <form className="pform" onSubmit={createStaff}>
            <div className="pform__row">
              <div className="pfield">
                <label htmlFor="u-name">Full name</label>
                <input
                  id="u-name"
                  value={staff.displayName}
                  onChange={(e) => {
                    const displayName = e.target.value;
                    const auto = !staff.username || staff.username === suggestUsername(staff.displayName);
                    setStaff({ ...staff, displayName, username: auto ? suggestUsername(displayName) : staff.username });
                  }}
                  required
                />
              </div>
              <div className="pfield">
                <label htmlFor="u-username">Username</label>
                <input
                  id="u-username"
                  value={staff.username}
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(e) => setStaff({ ...staff, username: e.target.value })}
                  aria-describedby="u-username-h"
                  required
                />
                <p id="u-username-h" className="hint">
                  Letters, numbers, dots, dashes. Used to sign in.
                </p>
              </div>
              <div className="pfield">
                <label htmlFor="u-role">Role</label>
                <select id="u-role" value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value as StaffRole })} aria-describedby="u-role-h">
                  <option value="faculty">Faculty / staff</option>
                  <option value="head_teacher">Head teacher</option>
                </select>
                <p id="u-role-h" className="hint">
                  {STAFF_ROLE_HELP[staff.role]}
                </p>
              </div>
            </div>
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              Create staff account
            </button>
          </form>
        ) : (
          <form className="pform" onSubmit={createStudent}>
            <div className="pform__row">
              <div className="pfield">
                <label htmlFor="s-name">Student’s full name</label>
                <input id="s-name" value={student.displayName} onChange={(e) => setStudent({ ...student, displayName: e.target.value })} required />
              </div>
              <div className="pfield">
                <label htmlFor="s-id">Student ID</label>
                <input
                  id="s-id"
                  value={student.studentId}
                  spellCheck={false}
                  onChange={(e) => setStudent({ ...student, studentId: e.target.value })}
                  aria-describedby="s-id-h"
                  required
                />
                <p id="s-id-h" className="hint">
                  The school’s ID for this student, e.g. 2026-045. Must be unique.
                </p>
              </div>
              <div className="pfield">
                <label htmlFor="s-dob">Date of birth</label>
                <input
                  id="s-dob"
                  type="date"
                  max={today()}
                  value={student.dateOfBirth}
                  onChange={(e) => setStudent({ ...student, dateOfBirth: e.target.value })}
                  aria-describedby="s-dob-h"
                  required
                />
                <p id="s-dob-h" className="hint">
                  The student signs in with their ID and this date.
                </p>
              </div>
            </div>
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              Create student account
            </button>
          </form>
        )}
      </div>

      <div className="chip-row" role="group" aria-label="Show accounts">
        {(['all', 'head_teacher', 'faculty', 'student'] as const).map((r) => (
          <button key={r} type="button" className="pchip" aria-pressed={filter === r} onClick={() => setFilter(r)}>
            {r === 'all' ? 'All' : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {!users && <p className="muted">Loading…</p>}
      <div className="table-wrap">
        <table className="ptable">
          <caption className="visually-hidden">Accounts</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Signs in with</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown?.map((u) => {
              const isStudent = u.role === 'student';
              const isMe = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td>{u.displayName}</td>
                  <td>
                    {isStudent ? (
                      u.studentId ? (
                        <>
                          ID <code>{u.studentId}</code> + date of birth
                        </>
                      ) : (
                        <Badge tone="warning">Needs student ID and date of birth</Badge>
                      )
                    ) : (
                      <code>{u.username}</code>
                    )}
                  </td>
                  <td>
                    {isStudent || isMe ? (
                      ROLE_LABELS[u.role]
                    ) : (
                      <select
                        aria-label={`Role for ${u.displayName}`}
                        value={u.role}
                        onChange={(e) => run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role: e.target.value } }), 'Role changed. They have been signed out.')}
                      >
                        <option value="faculty">Faculty</option>
                        <option value="head_teacher">Head teacher</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {!u.active ? (
                      <Badge tone="warning">Disabled</Badge>
                    ) : u.mustChangePassword ? (
                      <Badge tone="info">Temporary password</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </td>
                  <td className="small">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                  <td className="ptable__actions">
                    <button
                      type="button"
                      className="pbtn pbtn--secondary pbtn--sm"
                      onClick={() =>
                        setEditing({ id: u.id, displayName: u.displayName, studentId: u.studentId ?? '', dateOfBirth: u.dateOfBirth ?? '', isStudent })
                      }
                    >
                      Edit
                    </button>
                    {!isMe && (
                      <>
                        {!isStudent && (
                          <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => resetPassword(u)}>
                            Reset password
                          </button>
                        )}
                        <button
                          type="button"
                          className="pbtn pbtn--ghost pbtn--sm"
                          onClick={() => run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }), u.active ? 'Account disabled.' : 'Account enabled.')}
                        >
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                        <ConfirmButton label="Delete" onConfirm={() => run(() => api(`/users/${u.id}`, { method: 'DELETE' }), 'Account deleted.')} />
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
