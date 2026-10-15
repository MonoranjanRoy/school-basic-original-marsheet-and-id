import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Img } from '../../components/Img';
import { resolveText } from '../../i18n/LanguageContext';
import { useSite } from '../../lib/site';
import { errorMessage } from '../api';
import { useAuth } from '../auth';

export default function Login() {
  const { user, login, loading } = useAuth();
  const site = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    document.title = `Staff sign in | ${resolveText(site.school.name, 'en')}`;
  }, [site]);

  useEffect(() => {
    if (!loading && user) navigate(from && from.startsWith('/portal') ? from : '/portal', { replace: true });
  }, [user, loading, navigate, from]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Img image={site.school.logo} className="login-card__logo" decorative />
        <h1>Staff sign in</h1>
        <p className="muted">{resolveText(site.school.name, 'en')} — for the head teacher, teachers and staff</p>
        <p className="login-switch">
          Are you a student? <Link to="/portal/student-login">Sign in with your student ID →</Link>
        </p>
        {error && (
          <p className="palert palert--error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="pfield">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="pfield">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="pbtn pbtn--primary pbtn--block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted">Forgotten your password? Ask the head teacher to reset it.</p>
        <p className="small">
          <Link to="/">← Back to the website</Link>
        </p>
      </div>
    </main>
  );
}
