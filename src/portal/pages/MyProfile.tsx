import { useEffect, useState, type FormEvent } from 'react';
import type { LocalizedText } from '../../config/types';
import { api, errorMessage } from '../api';
import { ImagePicker } from '../components/ImagePicker';
import { enText, LocalizedInput, PageTitle, StatusMessage, type Status } from '../components/ui';
import type { FacultyMember } from './FacultyAdmin';

/** A teacher edits the Faculty-page profile linked to their account. */
export default function MyProfile() {
  const [profile, setProfile] = useState<FacultyMember | null | undefined>(undefined);
  const [name, setName] = useState<LocalizedText>('');
  const [qualification, setQualification] = useState<LocalizedText>('');
  const [subjects, setSubjects] = useState<LocalizedText>('');
  const [photo, setPhoto] = useState<{ id: string | null; src: string | null }>({ id: null, src: null });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    api<{ profile: FacultyMember | null }>('/faculty/me')
      .then(({ profile: p }) => {
        setProfile(p);
        if (p) {
          setName(p.name);
          setQualification(p.qualification ?? '');
          setSubjects(p.subjects ?? '');
          setPhoto({ id: p.photoMediaId, src: p.photoSrc });
        }
      })
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!enText(name).trim()) return setStatus({ kind: 'error', message: 'Enter your name.' });
    setStatus({ kind: 'busy' });
    try {
      await api('/faculty/me', {
        method: 'PUT',
        body: {
          name,
          qualification: enText(qualification) ? qualification : undefined,
          subjects: enText(subjects) ? subjects : undefined,
          photoMediaId: photo.id,
        },
      });
      setStatus({ kind: 'ok', message: 'Your profile has been updated on the Faculty page.' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <>
      <PageTitle title="My profile" intro="How you appear on the website’s Faculty page." />
      <StatusMessage status={status} />
      {profile === undefined && <p className="muted">Loading…</p>}
      {profile === null && (
        <p className="palert palert--info">No Faculty-page profile is linked to your account yet. Ask the head teacher to link one in “Faculty profiles”.</p>
      )}
      {profile && (
        <form className="pcard pform" onSubmit={save}>
          <p className="muted">Designation: {enText(profile.role)} (changed by the head teacher)</p>
          <LocalizedInput label="Name" required value={name} onChange={setName} />
          <LocalizedInput label="Qualification" value={qualification} onChange={setQualification} />
          <LocalizedInput label="Subjects" value={subjects} onChange={setSubjects} />
          <ImagePicker
            label="Photo"
            help="A clear head-and-shoulders photo works best."
            src={photo.src}
            onPick={(img) => setPhoto({ id: img.id, src: img.src })}
            onRemove={() => setPhoto({ id: null, src: null })}
          />
          <div className="pform__actions">
            <button type="submit" className="pbtn pbtn--primary" disabled={status.kind === 'busy'}>
              {status.kind === 'busy' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
