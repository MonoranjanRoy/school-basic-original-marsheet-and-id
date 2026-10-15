import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, uploadFile } from '../api';
import { Badge, ConfirmButton, PageTitle, StatusMessage, type Status } from '../components/ui';

interface MediaItem {
  id: string;
  src: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  name: string | null;
  uploadedBy: string | null;
  createdAt: string;
  usedIn: string[];
}

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const load = useCallback(() => {
    api<{ items: MediaItem[] }>('/media')
      .then((r) => setItems(r.items))
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setStatus({ kind: 'busy' });
    try {
      for (const f of Array.from(files)) await uploadFile(f);
      setStatus({ kind: 'ok', message: `${files.length} file${files.length > 1 ? 's' : ''} uploaded. Choose them with “Choose from uploads” anywhere a photo is needed.` });
      load();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <>
      <PageTitle
        title="Photos & files"
        intro="Everything uploaded to the website. Photos are resized automatically and hidden data such as GPS location is removed."
        actions={
          <>
            <input id="lib-upload" type="file" accept="image/*,application/pdf" multiple className="visually-hidden" onChange={(e) => onFiles(e.target.files)} />
            <label htmlFor="lib-upload" className="pbtn pbtn--primary">
              {status.kind === 'busy' ? 'Uploading…' : 'Upload'}
            </label>
          </>
        }
      />
      <StatusMessage status={status} />
      {!items && <p className="muted">Loading…</p>}
      {items && items.length === 0 && <p className="muted">Nothing uploaded yet.</p>}
      <ul className="photo-grid">
        {items?.map((m) => (
          <li key={m.id} className="photo">
            {m.mime.startsWith('image/') ? (
              <img src={m.src} alt="" loading="lazy" />
            ) : (
              <a className="photo__file" href={m.src} target="_blank" rel="noopener">
                PDF
              </a>
            )}
            <div className="photo__body">
              <p className="small">
                <strong>{m.name || 'Untitled'}</strong>
              </p>
              <p className="muted small">
                {size(m.bytes)}
                {m.width && ` · ${m.width}×${m.height}`}
                {m.uploadedBy && ` · ${m.uploadedBy}`}
              </p>
              <div className="item__meta">{m.usedIn.length ? m.usedIn.map((u) => <Badge key={u} tone="info">{u}</Badge>) : <Badge>Not used</Badge>}</div>
              {m.usedIn.length === 0 && (
                <ConfirmButton
                  label="Delete"
                  onConfirm={() =>
                    api(`/media/${m.id}`, { method: 'DELETE' })
                      .then(() => {
                        setStatus({ kind: 'ok', message: 'File deleted.' });
                        load();
                      })
                      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }))
                  }
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
