import { useId, useRef, useState } from 'react';
import { asset } from '../../lib/content';
import { api, errorMessage, uploadFile, type UploadResult } from '../api';
import { useAuth } from '../auth';

interface LibraryItem {
  id: string;
  src: string;
  mime: string;
  name: string | null;
  width: number | null;
  height: number | null;
}

interface ImagePickerProps {
  label: string;
  src: string | null | undefined;
  onPick: (img: UploadResult) => void;
  onRemove?: () => void;
  help?: string;
  /** A file attachment (image or PDF) rather than a picture to display. */
  acceptPdf?: boolean;
}

/** Upload a new image or (head teacher) choose one already uploaded. */
export function ImagePicker({ label, src, onPick, onRemove, help, acceptPdf }: ImagePickerProps) {
  const { user } = useAuth();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onPick(await uploadFile(file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function openLibrary() {
    setError('');
    try {
      const r = await api<{ items: LibraryItem[] }>('/media');
      setLibrary(r.items.filter((i) => i.mime.startsWith('image/') || (acceptPdf && i.mime === 'application/pdf')));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="pfield image-picker">
      <span className="pfield__label" id={`${id}-label`}>
        {label}
      </span>
      {help && <p className="hint">{help}</p>}
      <div className="image-picker__row">
        <div className="image-picker__preview">
          {src ? (
            acceptPdf ? (
              <a href={src} target="_blank" rel="noopener">
                View file
              </a>
            ) : (
              <img src={asset(src)} alt="" />
            )
          ) : (
            <span className="muted">None</span>
          )}
        </div>
        <div className="image-picker__actions">
          <input
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept={acceptPdf ? 'image/*,application/pdf' : 'image/*'}
            className="visually-hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label htmlFor={`${id}-file`} className="pbtn pbtn--secondary pbtn--sm" aria-describedby={`${id}-label`}>
            {busy ? 'Uploading…' : src ? 'Upload a different file' : 'Upload'}
          </label>
          {user?.role === 'head_teacher' && (
            <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={openLibrary}>
              Choose from uploads
            </button>
          )}
          {src && onRemove && (
            <button type="button" className="pbtn pbtn--danger-ghost pbtn--sm" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="palert palert--error" role="alert">
          {error}
        </p>
      )}
      {library && (
        <div className="library" role="group" aria-label="Uploaded files">
          <div className="library__head">
            <strong>Choose a file</strong>
            <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setLibrary(null)}>
              Close
            </button>
          </div>
          {library.length === 0 && <p className="muted">Nothing uploaded yet.</p>}
          <ul className="library__grid">
            {library.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick({ id: item.id, src: item.src, mime: item.mime, width: item.width ?? undefined, height: item.height ?? undefined });
                    setLibrary(null);
                  }}
                >
                  {item.mime.startsWith('image/') ? <img src={item.src} alt="" /> : <span>PDF</span>}
                  <span className="library__name">{item.name || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
