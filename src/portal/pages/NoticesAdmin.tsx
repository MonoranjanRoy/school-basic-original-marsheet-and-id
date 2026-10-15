import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { LocalizedText } from '../../config/types';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { ImagePicker } from '../components/ImagePicker';
import { Badge, Checkbox, ConfirmButton, enText, LocalizedInput, PageTitle, StatusMessage, today, type Status } from '../components/ui';

export interface PortalNotice {
  id: string;
  date: string;
  title: LocalizedText;
  body: LocalizedText;
  category: LocalizedText | null;
  pinned: boolean;
  audience: 'public' | 'students' | 'staff';
  published: boolean;
  attachmentMediaId: string | null;
  attachmentSrc: string | null;
  attachmentLabel: LocalizedText | null;
  createdByName?: string | null;
  canEdit: boolean;
}

interface Draft {
  id?: string;
  date: string;
  title: LocalizedText;
  body: LocalizedText;
  category: LocalizedText;
  pinned: boolean;
  audience: PortalNotice['audience'];
  attachmentMediaId: string | null;
  attachmentSrc: string | null;
  attachmentLabel: LocalizedText;
}

const AUDIENCES: { value: PortalNotice['audience']; label: string; help: string }[] = [
  { value: 'public', label: 'Everyone (public website)', help: 'Shown on the Notices page of the website.' },
  { value: 'students', label: 'Students only', help: 'Visible to signed-in students and staff.' },
  { value: 'staff', label: 'Staff only', help: 'Visible to faculty and the head teacher.' },
];

const empty = (): Draft => ({
  date: today(),
  title: '',
  body: '',
  category: '',
  pinned: false,
  audience: 'public',
  attachmentMediaId: null,
  attachmentSrc: null,
  attachmentLabel: '',
});

export default function NoticesAdmin() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<PortalNotice[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const isStaff = user?.role !== 'student';
  const isHead = user?.role === 'head_teacher';

  const load = useCallback(() => {
    api<{ notices: PortalNotice[] }>('/notices')
      .then((r) => setNotices(r.notices))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!enText(draft.title).trim() || !enText(draft.body).trim()) {
      setStatus({ kind: 'error', message: 'Enter a title and the notice text (in English at least).' });
      return;
    }
    setStatus({ kind: 'busy' });
    const body = {
      date: draft.date,
      title: draft.title,
      body: draft.body,
      category: enText(draft.category) ? draft.category : undefined,
      pinned: draft.pinned,
      audience: draft.audience,
      attachmentMediaId: draft.attachmentMediaId,
      attachmentLabel: enText(draft.attachmentLabel) ? draft.attachmentLabel : undefined,
    };
    try {
      const r = draft.id
        ? await api<{ published?: boolean }>(`/notices/${draft.id}`, { method: 'PUT', body })
        : await api<{ published: boolean }>('/notices', { method: 'POST', body });
      const pendingNote = r.published === false || (!isHead && draft.id) ? ' It will appear once the head teacher approves it (if approval is required).' : '';
      setStatus({ kind: 'ok', message: `Notice saved.${pendingNote}` });
      setDraft(null);
      load();
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

  const edit = (n: PortalNotice) =>
    setDraft({
      id: n.id,
      date: n.date,
      title: n.title,
      body: n.body,
      category: n.category ?? '',
      pinned: n.pinned,
      audience: n.audience,
      attachmentMediaId: n.attachmentMediaId,
      attachmentSrc: n.attachmentSrc,
      attachmentLabel: n.attachmentLabel ?? '',
    });

  return (
    <>
      <PageTitle
        title="Notices"
        intro={isStaff ? 'Post announcements for the website, for students, or for staff.' : 'Notices for students and the public.'}
        actions={
          isStaff &&
          !draft && (
            <button type="button" className="pbtn pbtn--primary" onClick={() => setDraft(empty())}>
              New notice
            </button>
          )
        }
      />
      <StatusMessage status={status} />

      {draft && (
        <form className="pcard pform" onSubmit={save}>
          <h2>{draft.id ? 'Edit notice' : 'New notice'}</h2>
          <div className="pfield">
            <label htmlFor="n-date">Date</label>
            <input id="n-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required />
          </div>
          <LocalizedInput label="Title" required value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
          <LocalizedInput label="Notice text" required multiline value={draft.body} onChange={(body) => setDraft({ ...draft, body })} />
          <LocalizedInput label="Category (optional)" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} help="e.g. Holiday, Exam, Event" />
          <fieldset className="pfield">
            <legend>Who can see it</legend>
            {AUDIENCES.map((a) => (
              <div key={a.value} className="pfield--check">
                <input
                  type="radio"
                  id={`aud-${a.value}`}
                  name="audience"
                  checked={draft.audience === a.value}
                  onChange={() => setDraft({ ...draft, audience: a.value })}
                />
                <label htmlFor={`aud-${a.value}`}>
                  {a.label} <span className="hint">— {a.help}</span>
                </label>
              </div>
            ))}
          </fieldset>
          <Checkbox label="Mark as important (shown first)" checked={draft.pinned} onChange={(pinned) => setDraft({ ...draft, pinned })} />
          <ImagePicker
            label="Attachment (optional PDF or image)"
            acceptPdf
            src={draft.attachmentSrc}
            onPick={(f) => setDraft({ ...draft, attachmentMediaId: f.id, attachmentSrc: f.src })}
            onRemove={() => setDraft({ ...draft, attachmentMediaId: null, attachmentSrc: null })}
          />
          {draft.attachmentMediaId && (
            <LocalizedInput
              label="Attachment button text"
              value={draft.attachmentLabel}
              onChange={(attachmentLabel) => setDraft({ ...draft, attachmentLabel })}
              help="e.g. Download circular (PDF)"
            />
          )}
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              {status.kind === 'busy' ? 'Saving…' : 'Save notice'}
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!notices && <p className="muted">Loading…</p>}
      {notices && notices.length === 0 && <p className="muted">No notices yet.</p>}
      <ul className="item-list">
        {notices?.map((n) => (
          <li key={n.id} className="item">
            <div className="item__main">
              <div className="item__meta">
                <span>{n.date}</span>
                {!n.published && <Badge tone="warning">Waiting for approval</Badge>}
                {n.pinned && <Badge tone="info">Important</Badge>}
                {isStaff && <Badge>{AUDIENCES.find((a) => a.value === n.audience)?.label}</Badge>}
                {n.createdByName && <span className="muted">by {n.createdByName}</span>}
              </div>
              <h3>{enText(n.title)}</h3>
              <p className="item__body">{enText(n.body)}</p>
              {n.attachmentSrc && (
                <a href={n.attachmentSrc} target="_blank" rel="noopener">
                  {enText(n.attachmentLabel) || 'Attachment'}
                </a>
              )}
            </div>
            {isStaff && (
              <div className="item__actions">
                {isHead && !n.published && (
                  <button type="button" className="pbtn pbtn--primary pbtn--sm" onClick={() => act(() => api(`/notices/${n.id}/publish`, { method: 'POST', body: { published: true } }), 'Notice approved and published.')}>
                    Approve
                  </button>
                )}
                {isHead && n.published && (
                  <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => act(() => api(`/notices/${n.id}/publish`, { method: 'POST', body: { published: false } }), 'Notice hidden.')}>
                    Hide
                  </button>
                )}
                {n.canEdit && (
                  <>
                    <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => edit(n)}>
                      Edit
                    </button>
                    <ConfirmButton label="Delete" onConfirm={() => act(() => api(`/notices/${n.id}`, { method: 'DELETE' }), 'Notice deleted.')} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
