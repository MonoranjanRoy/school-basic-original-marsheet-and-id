import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth, type Role } from './auth';
import { PortalLayout } from './PortalLayout';
import Account from './pages/Account';
import Activity from './pages/Activity';
import ContentEditor from './pages/ContentEditor';
import Dashboard from './pages/Dashboard';
import FacultyAdmin from './pages/FacultyAdmin';
import GalleryAdmin from './pages/GalleryAdmin';
import Login from './pages/Login';
import MediaLibrary from './pages/MediaLibrary';
import MyProfile from './pages/MyProfile';
import MyResults from './pages/MyResults';
import NoticesAdmin from './pages/NoticesAdmin';
import Results from './pages/Results';
import StudentLogin from './pages/StudentLogin';
import Users from './pages/Users';
import './portal.css';

/** Signed-in area. Guards each page by role. */
function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading, signInPath } = useAuth();
  const location = useLocation();
  if (loading) return <p className="portal-loading">Loading…</p>;
  if (!user) return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  // A temporary password must be changed before anything else.
  if (user.mustChangePassword && location.pathname !== '/portal/account') return <Navigate to="/portal/account" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/portal" replace />;
  return <PortalLayout>{children}</PortalLayout>;
}

const HT: Role[] = ['head_teacher'];
const STAFF: Role[] = ['head_teacher', 'faculty'];

export default function Portal() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="student-login" element={<StudentLogin />} />
        <Route index element={<Guard><Dashboard /></Guard>} />
        <Route path="account" element={<Guard><Account /></Guard>} />
        <Route path="notices" element={<Guard><NoticesAdmin /></Guard>} />
        <Route path="gallery" element={<Guard roles={STAFF}><GalleryAdmin /></Guard>} />
        <Route path="profile" element={<Guard roles={STAFF}><MyProfile /></Guard>} />
        <Route path="faculty" element={<Guard roles={HT}><FacultyAdmin /></Guard>} />
        <Route path="website" element={<Guard roles={HT}><ContentEditor /></Guard>} />
        <Route path="website/:section" element={<Guard roles={HT}><ContentEditor /></Guard>} />
        <Route path="media" element={<Guard roles={HT}><MediaLibrary /></Guard>} />
        <Route path="users" element={<Guard roles={HT}><Users /></Guard>} />
        <Route path="results" element={<Guard roles={HT}><Results /></Guard>} />
        <Route path="my-results" element={<Guard roles={['student']}><MyResults /></Guard>} />
        <Route path="activity" element={<Guard roles={HT}><Activity /></Guard>} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </AuthProvider>
  );
}
