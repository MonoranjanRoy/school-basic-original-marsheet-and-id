import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router';
import { api, errorMessage } from '../api';
import { FieldEditor } from '../components/FieldEditor';
import { PageTitle, StatusMessage, type Status } from '../components/ui';
import { getPath, SECTIONS, setPath } from '../contentSchema';

type Settings = Record<string, unknown>;

/** Removes empty keys from the form-service extra fields before saving. */
function clean(settings: Settings): Settings {
  const extra = getPath(settings, 'enquiryForm.extraFields') as Record<string, string> | undefined;
  if (!extra) return settings;
  return setPath(settings, 'enquiryForm.extraFields', Object.fromEntries(Object.entries(extra).filter(([k]) => k.trim())));
}

export default function ContentEditor() {
  const { section: sectionId } = useParams();
  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    api<{ settings: Settings; placeholders: string[] }>('/settings')
      .then((r) => {
        setSaved(r.settings);
        setDraft(r.settings);
        setPlaceholders(r.placeholders);
      })
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err) }));
  }, []);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function save() {
    if (!draft) return;
    setStatus({ kind: 'busy' });
    try {
      const r = await api<{ settings: Settings; placeholders: string[] }>('/settings', { method: 'PUT', body: clean(draft) });
      setSaved(r.settings);
      setDraft(r.settings);
      setPlaceholders(r.placeholders);
      setStatus({ kind: 'ok', message: 'Saved. The website now shows your changes.' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  }

  const sectionPlaceholders = placeholders.filter((p) => section.fields.some((f) => p === f.key || p.startsWith(`${f.key}.`) || p.startsWith(`${f.key}[`)));

  return (
    <>
      <PageTitle title="Website content" intro="Edit the text and photos on every page. Text in [square brackets] is a placeholder to replace with real information." />

      <nav className="section-tabs" aria-label="Content sections">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <NavLink to={`/portal/website/${s.id}`} className={() => (s.id === section.id ? 'active' : '')} aria-current={s.id === section.id ? 'page' : undefined}>
                {s.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section className="pcard pform" aria-labelledby="section-heading">
        <h2 id="section-heading">{section.title}</h2>
        <p className="muted">{section.intro}</p>
        {sectionPlaceholders.length > 0 && (
          <p className="palert palert--warning">
            {sectionPlaceholders.length} placeholder{sectionPlaceholders.length > 1 ? 's' : ''} in this section still need real information.
          </p>
        )}
        {!draft && status.kind !== 'error' && <p className="muted">Loading…</p>}
        {draft &&
          section.fields.map((f) => (
            <FieldEditor key={`${section.id}-${f.key}`} field={f} value={getPath(draft, f.key)} onChange={(v) => setDraft((d) => setPath(d, f.key, v))} />
          ))}
      </section>

      <div className="save-bar" data-dirty={dirty}>
        <StatusMessage status={status} />
        <span className="muted small">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        <button type="button" className="pbtn pbtn--ghost" disabled={!dirty || status.kind === 'busy'} onClick={() => setDraft(saved)}>
          Undo changes
        </button>
        <button type="button" className="pbtn pbtn--primary" disabled={!dirty || status.kind === 'busy'} onClick={save}>
          {status.kind === 'busy' ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </>
  );
}
