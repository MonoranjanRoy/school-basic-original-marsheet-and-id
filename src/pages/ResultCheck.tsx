import { useRef, useState, type FormEvent } from 'react';
import { Marksheet } from '../components/Marksheet';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useLanguage } from '../i18n/LanguageContext';
import type { Marksheet as MarksheetData } from '../lib/marksheet';
import { usePageMeta } from '../lib/seo';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; marksheets: MarksheetData[] };

/** Public: families see published marksheets with the ID card number and date of birth. */
export default function ResultCheck() {
  usePageMeta('results');
  const { s } = useLanguage();
  const [studentId, setStudentId] = useState('');
  const [dob, setDob] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!studentId.trim() || !dob) {
      setState({ kind: 'error', message: s.resultCheck.missing });
      return;
    }
    setState({ kind: 'busy' });
    try {
      const res = await fetch('/api/result-lookup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim(), dateOfBirth: dob }),
      });
      const data = (await res.json().catch(() => ({}))) as { marksheets?: MarksheetData[]; error?: string };
      if (!res.ok) throw new Error(data.error || (res.status === 503 ? 'The website is very busy. Please try again in a minute.' : `Something went wrong (${res.status}).`));
      setState({ kind: 'done', marksheets: data.marksheets ?? [] });
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (err) {
      const message = err instanceof TypeError ? 'Could not reach the school website. Check your internet connection and try again.' : (err as Error).message;
      setState({ kind: 'error', message });
    }
  }

  const reset = () => {
    setState({ kind: 'idle' });
    setStudentId('');
    setDob('');
  };

  return (
    <div className="print-docs">
      <PageHeader title={s.nav.results} intro={s.pageIntro.results} />
      <Section>
        {state.kind !== 'done' ? (
          <div className="form-card result-form">
            {state.kind === 'error' && (
              <p className="callout callout--error" role="alert">
                {state.message}
              </p>
            )}
            <form className="form" noValidate onSubmit={onSubmit} aria-busy={state.kind === 'busy'}>
              <div className="form__grid">
                <div className="field">
                  <label htmlFor="rc-id">{s.resultCheck.studentId}</label>
                  <input
                    id="rc-id"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={40}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    aria-describedby="rc-id-hint"
                    required
                  />
                  <p id="rc-id-hint" className="field__hint">
                    {s.resultCheck.studentIdHint}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="rc-dob">{s.resultCheck.dob}</label>
                  <input id="rc-dob" type="date" min="1950-01-01" max={today} value={dob} onChange={(e) => setDob(e.target.value)} required />
                </div>
              </div>
              <div className="form__actions">
                <button type="submit" className="btn btn--primary btn--lg" disabled={state.kind === 'busy'}>
                  {state.kind === 'busy' ? s.resultCheck.checking : s.resultCheck.submit}
                </button>
              </div>
            </form>
            <p className="field__hint">{s.resultCheck.privacy}</p>
          </div>
        ) : (
          <div ref={resultRef} tabIndex={-1} className="result-out">
            <div className="form__actions no-print result-out__actions">
              {state.marksheets.length > 0 && (
                <button type="button" className="btn btn--primary" onClick={() => window.print()}>
                  {s.resultCheck.print}
                </button>
              )}
              <button type="button" className="btn btn--outline" onClick={reset}>
                {s.resultCheck.another}
              </button>
            </div>
            {state.marksheets.length === 0 && <p className="callout callout--info">{s.resultCheck.none}</p>}
            {state.marksheets.map((m) => (
              <Marksheet key={m.examId} sheet={m} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
