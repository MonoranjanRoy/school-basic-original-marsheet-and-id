import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { enText, PageTitle } from '../components/ui';
import type { PortalNotice } from './NoticesAdmin';

interface Summary {
  placeholders?: number;
  pendingNotices: number;
  pendingPhotos: number;
  accounts?: number;
  latest: PortalNotice[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!user) return;
    const isHead = user.role === 'head_teacher';
    const isStaff = user.role !== 'student';
    Promise.all([
      api<{ notices: PortalNotice[] }>('/notices'),
      isStaff ? api<{ items: { published: boolean; canEdit: boolean }[] }>('/gallery') : Promise.resolve({ items: [] }),
      isHead ? api<{ placeholders: string[] }>('/settings') : Promise.resolve(null),
      isHead ? api<{ users: unknown[] }>('/users') : Promise.resolve(null),
    ])
      .then(([n, g, s, u]) =>
        setSummary({
          latest: n.notices.filter((x) => x.published).slice(0, 5),
          pendingNotices: n.notices.filter((x) => !x.published && (isHead || x.canEdit)).length,
          pendingPhotos: g.items.filter((x) => !x.published && (isHead || x.canEdit)).length,
          placeholders: s?.placeholders.length,
          accounts: u?.users.length,
        }),
      )
      .catch(() => setSummary({ latest: [], pendingNotices: 0, pendingPhotos: 0 }));
  }, [user]);

  if (!user) return null;
  const pending = (summary?.pendingNotices ?? 0) + (summary?.pendingPhotos ?? 0);

  return (
    <>
      <PageTitle title={`Welcome, ${user.displayName}`} />

      {user.role === 'head_teacher' && summary && (
        <div className="stat-grid">
          {summary.placeholders !== undefined && summary.placeholders > 0 && (
            <Link to="/portal/website" className="stat stat--warning">
              <span className="stat__num">{summary.placeholders}</span>
              <span>placeholder texts still to replace on the website</span>
            </Link>
          )}
          <Link to={summary.pendingNotices ? '/portal/notices' : '/portal/gallery'} className={`stat${pending ? ' stat--info' : ''}`}>
            <span className="stat__num">{pending}</span>
            <span>teacher posts waiting for your approval</span>
          </Link>
          <Link to="/portal/users" className="stat">
            <span className="stat__num">{summary.accounts ?? '–'}</span>
            <span>accounts</span>
          </Link>
        </div>
      )}

      {user.role === 'faculty' && summary && pending > 0 && (
        <p className="palert palert--info">
          {pending} of your posts {pending === 1 ? 'is' : 'are'} waiting for the head teacher’s approval.
        </p>
      )}

      <div className="quick-grid">
        {user.role === 'head_teacher' && (
          <>
            <QuickLink to="/portal/students" title="Students" text="Class, roll no., PEN, Aadhaar, parents, photo." />
            <QuickLink to="/portal/results" title="Results & marksheets" text="Enter marks, print marksheets, publish results." />
            <QuickLink to="/portal/id-cards" title="ID cards" text="Print ID cards for a whole class." />
            <QuickLink to="/portal/website" title="Edit website content" text="Text, photos and which pages are shown." />
            <QuickLink to="/portal/users" title="Manage accounts" text="Add teachers and students, reset passwords." />
            <QuickLink to="/portal/faculty" title="Faculty profiles" text="Who appears on the Faculty page." />
          </>
        )}
        {user.role !== 'student' && (
          <>
            <QuickLink to="/portal/notices" title="Post a notice" text="Public, students-only or staff-only." />
            <QuickLink to="/portal/gallery" title="Add photos" text="Upload photos to the gallery." />
          </>
        )}
        {user.role === 'faculty' && <QuickLink to="/portal/profile" title="My profile" text="Your photo and details on the Faculty page." />}
        {user.role === 'student' && (
          <>
            <QuickLink to="/portal/my-results" title="My results" text="Your exam results, once published." />
            <QuickLink to="/portal/notices" title="Notices" text="Notices for students and the public." />
          </>
        )}
      </div>

      <section className="pcard" aria-labelledby="latest-heading">
        <h2 id="latest-heading">Latest notices</h2>
        {!summary && <p className="muted">Loading…</p>}
        {summary && summary.latest.length === 0 && <p className="muted">No notices yet.</p>}
        <ul className="plist">
          {summary?.latest.map((n) => (
            <li key={n.id}>
              <span className="muted small">{n.date}</span> {enText(n.title)}
            </li>
          ))}
        </ul>
        <Link to="/portal/notices">All notices →</Link>
      </section>
    </>
  );
}

function QuickLink({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="quick">
      <span className="quick__title">{title}</span>
      <span className="quick__text">{text}</span>
    </Link>
  );
}
