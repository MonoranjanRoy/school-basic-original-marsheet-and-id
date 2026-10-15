import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Img } from '../../components/Img';
import { resolveText } from '../../i18n/LanguageContext';
import { useSite } from '../../lib/site';
import { errorMessage } from '../api';
import { useAuth } from '../auth';

/** Students sign in with the student ID given by the school and their date of birth. */
export default function StudentLogin() {
  const { user, studentLogin, loading } = useAuth();
  const site = useSite();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    document.title = `Student sign in | ${resolveText(site.school.name, 'en')}`;
  }, [site]);

  useEffect(() => {
    if (!loading && user) navigate('/portal', { replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!studentId.trim() || !dob) {
      setError('Enter your student ID and date of birth.');
      return;
    }
    setBusy(true);
    try {
      await studentLogin(studentId.trim(), dob);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Img image={site.school.logo} className="login-card__logo" decorative />
        <h1>
          Student sign in <span lang="bn" className="login-card__bn">ছাত্রছাত্রী লগইন</span>
        </h1>
        <p className="muted">{resolveText(site.school.name, 'en')}</p>
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="pfield">
            <label htmlFor="student-id">
              Student ID <span lang="bn">/ ছাত্র/ছাত্রীর আইডি</span>
            </label>
            <input
              id="student-id"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              aria-describedby="student-id-hint"
              required
            />
            <p id="student-id-hint" className="hint">
              As given by the school office.
            </p>
          </div>
          <div className="pfield">
            <label htmlFor="student-dob">
              Date of birth <span lang="bn">/ জন্ম তারিখ</span>
            </label>
            <input id="student-dob" type="date" min="1950-01-01" max={today} value={dob} onChange={(e) => setDob(e.target.value)} required />
          </div>
          <button type="submit" className="pbtn pbtn--primary pbtn--block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted">Problems signing in? Please contact the school office.</p>
        <p className="small">
          <Link to="/portal/login">Staff sign in</Link> · <Link to="/">Back to the website</Link>
        </p>
      </div>
    </main>
  );
}
