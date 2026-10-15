import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from './api';

export type Role = 'head_teacher' | 'faculty' | 'student';

export interface PortalUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  /** Students only. */
  studentId: string | null;
}

interface AuthValue {
  user: PortalUser | null;
  loading: boolean;
  setUser: (u: PortalUser | null) => void;
  login: (username: string, password: string) => Promise<PortalUser>;
  studentLogin: (studentId: string, dateOfBirth: string) => Promise<PortalUser>;
  logout: () => Promise<void>;
  /** Where a signed-out visitor should sign in again (students have their own page). */
  signInPath: string;
}

const AuthContext = createContext<AuthValue | null>(null);

export const ROLE_LABELS: Record<Role, string> = {
  head_teacher: 'Head teacher',
  faculty: 'Faculty',
  student: 'Student',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: PortalUser | null }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ user: PortalUser }>('/auth/login', { method: 'POST', body: { username, password } });
    setUser(r.user);
    return r.user;
  }, []);

  const [signInPath, setSignInPath] = useState('/portal/login');

  const userRef = useRef(user);
  userRef.current = user;

  const logout = useCallback(async () => {
    const wasStudent = userRef.current?.role === 'student';
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    // Both updates land in the same render, so the page guard redirects to the right sign-in page.
    setSignInPath(wasStudent ? '/portal/student-login' : '/portal/login');
    setUser(null);
  }, []);

  const studentLogin = useCallback(async (studentId: string, dateOfBirth: string) => {
    const r = await api<{ user: PortalUser }>('/auth/student-login', { method: 'POST', body: { studentId, dateOfBirth } });
    setUser(r.user);
    return r.user;
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser, login, studentLogin, logout, signInPath }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
