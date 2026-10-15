import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { LocalizedText } from '../../config/types';
import { asset } from '../../lib/content';
import { api, errorMessage, type UploadResult } from '../api';
import { useAuth } from '../auth';
import { ImagePicker } from '../components/ImagePicker';
import { Badge, ConfirmButton, enText, LocalizedInput, PageTitle, StatusMessage, type Status } from '../components/ui';

interface Item {
  id: string;
  src: string;
  alt: LocalizedText;
  caption: LocalizedText | null;
  category: LocalizedText | null;
  sort: number;
  published: boolean;
  createdByName: string | null;
  canEdit: boolean;
}

interface Draft {
  id?: string;
  upload: UploadResult | null;
  src: string | null;
  alt: LocalizedText;
  caption: LocalizedText;
  category: LocalizedText;
  sort: number;
}

export default function GalleryAdmin() {
  const { user } = useAuth();
  const isHead = user?.role === 'head_teacher';
  const [items, setItems] = useState<Item[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const load = useCallback(() => {
    api<{ items: Item[] }>('/gallery')
      .then((r) => setItems(r.items))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.id && !draft.upload) return setStatus({ kind: 'error', message: 'Upload a photo first.' });
    if (!enText(draft.alt).trim()) return setStatus({ kind: 'error', message: 'Describe the photo (needed for visitors who use screen readers).' });
    setStatus({ kind: 'busy' });
    const body = {
      alt: draft.alt,
      caption: enText(draft.caption) ? draft.caption : undefined,
      category: enText(draft.category) ? draft.category : undefined,
      sort: draft.sort,
    };
    try {
      const r = draft.id
        ? await api<{ published?: boolean }>(`/gallery/${draft.id}`, { method: 'PUT', body })
        : await api<{ published: boolean }>('/gallery', { method: 'POST', body: { ...body, mediaId: draft.upload!.id } });
      setStatus({
        kind: 'ok',
        message: r.published === false ? 'Photo saved. It will appear on the website after the head teacher approves it.' : 'Photo saved.',
      });
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

  return (
    <>
      <PageTitle
        title="Gallery"
        intro="Photos shown on the Gallery page. Upload only photos the school may publish, following its consent policy for students."
        actions={
          !draft && (
            <button type="button" className="pbtn pbtn--primary" onClick={() => setDraft({ upload: null, src: null, alt: '', caption: '', category: '', sort: 0 })}>
              Add photo
            </button>
          )
        }
      />
      <StatusMessage status={status} />

      {draft && (
        <form className="pcard pform" onSubmit={save}>
          <h2>{draft.id ? 'Edit photo details' : 'Add a photo'}</h2>
          {draft.id ? (
            draft.src && <img className="pform__preview" src={asset(draft.src)} alt="" />
          ) : (
            <ImagePicker label="Photo" src={draft.upload?.src} onPick={(upload) => setDraft({ ...draft, upload })} />
          )}
          <LocalizedInput label="Description for screen readers" required value={draft.alt} onChange={(alt) => setDraft({ ...draft, alt })} help="Say what the photo shows, e.g. “Students planting trees on Environment Day”." />
          <LocalizedInput label="Caption (optional)" value={draft.caption} onChange={(caption) => setDraft({ ...draft, caption })} />
          <LocalizedInput label="Category (optional)" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} help="Photos with the same category can be filtered together, e.g. Events, Sports, Campus." />
          <div className="pfield">
            <label htmlFor="g-sort">Order</label>
            <input id="g-sort" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) || 0 })} aria-describedby="g-sort-h" />
            <p id="g-sort-h" className="hint">
              Lower numbers appear first.
            </p>
          </div>
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              {status.kind === 'busy' ? 'Saving…' : 'Save photo'}
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!items && <p className="muted">Loading…</p>}
      {items && items.length === 0 && <p className="muted">No photos yet.</p>}
      <ul className="photo-grid">
        {items?.map((g) => (
          <li key={g.id} className="photo">
            <img src={asset(g.src)} alt={enText(g.alt)} loading="lazy" />
            <div className="photo__body">
              <div className="item__meta">
                {!g.published && <Badge tone="warning">Waiting for approval</Badge>}
                {g.category && <Badge>{enText(g.category)}</Badge>}
              </div>
              <p>{enText(g.caption) || enText(g.alt)}</p>
              {g.createdByName && <p className="muted small">by {g.createdByName}</p>}
              <div className="item__actions">
                {isHead && !g.published && (
                  <button type="button" className="pbtn pbtn--primary pbtn--sm" onClick={() => act(() => api(`/gallery/${g.id}/publish`, { method: 'POST', body: { published: true } }), 'Photo approved.')}>
                    Approve
                  </button>
                )}
                {isHead && g.published && (
                  <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => act(() => api(`/gallery/${g.id}/publish`, { method: 'POST', body: { published: false } }), 'Photo hidden from the website.')}>
                    Hide
                  </button>
                )}
                {g.canEdit && (
                  <>
                    <button
                      type="button"
                      className="pbtn pbtn--secondary pbtn--sm"
                      onClick={() => setDraft({ id: g.id, upload: null, src: g.src, alt: g.alt, caption: g.caption ?? '', category: g.category ?? '', sort: g.sort })}
                    >
                      Edit
                    </button>
                    <ConfirmButton label="Delete" onConfirm={() => act(() => api(`/gallery/${g.id}`, { method: 'DELETE' }), 'Photo removed.')} />
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
