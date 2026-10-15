import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { LocalizedText } from '../../config/types';
import { asset } from '../../lib/content';
import { api, errorMessage } from '../api';
import { ImagePicker } from '../components/ImagePicker';
import { ConfirmButton, enText, LocalizedInput, PageTitle, StatusMessage, type Status } from '../components/ui';

export interface FacultyMember {
  id: string;
  name: LocalizedText;
  role: LocalizedText;
  qualification: LocalizedText | null;
  subjects: LocalizedText | null;
  photoMediaId: string | null;
  photoSrc: string | null;
  userId: string | null;
  username: string | null;
  sort: number;
}

interface Account {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

type Draft = Omit<FacultyMember, 'id' | 'username' | 'qualification' | 'subjects'> & {
  id?: string;
  qualification: LocalizedText;
  subjects: LocalizedText;
};

const empty = (sort: number): Draft => ({ name: '', role: '', qualification: '', subjects: '', photoMediaId: null, photoSrc: null, userId: null, sort });

export default function FacultyAdmin() {
  const [members, setMembers] = useState<FacultyMember[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const load = useCallback(() => {
    api<{ members: FacultyMember[] }>('/faculty')
      .then((r) => setMembers(r.members))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
    api<{ users: Account[] }>('/users')
      .then((r) => setAccounts(r.users.filter((u) => u.role !== 'student')))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!enText(draft.name).trim() || !enText(draft.role).trim()) return setStatus({ kind: 'error', message: 'Enter a name and designation.' });
    setStatus({ kind: 'busy' });
    const body = {
      name: draft.name,
      role: draft.role,
      qualification: enText(draft.qualification) ? draft.qualification : undefined,
      subjects: enText(draft.subjects) ? draft.subjects : undefined,
      photoMediaId: draft.photoMediaId,
      userId: draft.userId,
      sort: draft.sort,
    };
    try {
      if (draft.id) await api(`/faculty/${draft.id}`, { method: 'PUT', body });
      else await api('/faculty', { method: 'POST', body });
      setStatus({ kind: 'ok', message: 'Profile saved.' });
      setDraft(null);
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <>
      <PageTitle
        title="Faculty profiles"
        intro="Who appears on the Faculty page. Link a profile to a teacher’s account so they can update their own photo and details. Publish names and photos only with each person’s consent."
        actions={
          !draft && (
            <button type="button" className="pbtn pbtn--primary" onClick={() => setDraft(empty((members?.length ?? 0) + 1))}>
              Add profile
            </button>
          )
        }
      />
      <StatusMessage status={status} />

      {draft && (
        <form className="pcard pform" onSubmit={save}>
          <h2>{draft.id ? 'Edit profile' : 'New profile'}</h2>
          <LocalizedInput label="Name" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <LocalizedInput label="Designation" required value={draft.role} onChange={(role) => setDraft({ ...draft, role })} help="e.g. Assistant Teacher, Principal" />
          <LocalizedInput label="Qualification (optional)" value={draft.qualification} onChange={(qualification) => setDraft({ ...draft, qualification })} />
          <LocalizedInput label="Subjects (optional)" value={draft.subjects} onChange={(subjects) => setDraft({ ...draft, subjects })} />
          <ImagePicker
            label="Photo (optional)"
            src={draft.photoSrc}
            onPick={(img) => setDraft({ ...draft, photoMediaId: img.id, photoSrc: img.src })}
            onRemove={() => setDraft({ ...draft, photoMediaId: null, photoSrc: null })}
          />
          <div className="pfield">
            <label htmlFor="f-user">Linked account</label>
            <select id="f-user" value={draft.userId ?? ''} onChange={(e) => setDraft({ ...draft, userId: e.target.value || null })} aria-describedby="f-user-h">
              <option value="">Not linked</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.username})
                </option>
              ))}
            </select>
            <p id="f-user-h" className="hint">
              The linked teacher can edit this profile’s name, qualification, subjects and photo.
            </p>
          </div>
          <div className="pfield">
            <label htmlFor="f-sort">Order</label>
            <input id="f-sort" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) || 0 })} />
          </div>
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              {status.kind === 'busy' ? 'Saving…' : 'Save profile'}
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!members && <p className="muted">Loading…</p>}
      <ul className="item-list">
        {members?.map((m) => (
          <li key={m.id} className="item">
            {m.photoSrc ? <img className="item__avatar" src={asset(m.photoSrc)} alt="" /> : <span className="item__avatar item__avatar--empty" aria-hidden="true" />}
            <div className="item__main">
              <h3>{enText(m.name)}</h3>
              <p className="muted">
                {enText(m.role)}
                {m.username && ` · account: ${m.username}`}
              </p>
            </div>
            <div className="item__actions">
              <button
                type="button"
                className="pbtn pbtn--secondary pbtn--sm"
                onClick={() =>
                  setDraft({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    qualification: m.qualification ?? '',
                    subjects: m.subjects ?? '',
                    photoMediaId: m.photoMediaId,
                    photoSrc: m.photoSrc,
                    userId: m.userId,
                    sort: m.sort,
                  })
                }
              >
                Edit
              </button>
              <ConfirmButton
                label="Delete"
                onConfirm={() =>
                  api(`/faculty/${m.id}`, { method: 'DELETE' })
                    .then(() => {
                      setStatus({ kind: 'ok', message: 'Profile removed.' });
                      load();
                    })
                    .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }))
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
