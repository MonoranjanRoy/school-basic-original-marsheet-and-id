import defaultConfig from '../src/config/school.config';
import type { LocalizedText, Notice, Person, SchoolConfig } from '../src/config/types';
import { json, query, transaction } from './db.js';
import { env } from './env.js';
import { hashPassword } from './passwords.js';
import { siteSettingsSchema, type SiteSettings } from './schema.js';

/** Default settings = the bundled school.config.ts minus the parts kept in their own tables. */
function defaultSettings(): SiteSettings {
  const { notices: _n, ...rest } = defaultConfig;
  return siteSettingsSchema.parse({
    ...rest,
    gallery: { intro: defaultConfig.gallery.intro },
    faculty: { intro: defaultConfig.faculty.intro },
  });
}

export async function getSettings(): Promise<SiteSettings> {
  const rows = await query<{ data: SiteSettings }>('SELECT data FROM site_settings WHERE id = 1');
  // Fill in any fields added in later versions of the website.
  return rows[0] ? { ...defaultSettings(), ...rows[0].data } : defaultSettings();
}

export const mediaSrc = (id: string) => `/media/${id}`;

export interface NoticeRow {
  id: string;
  date: string;
  title: LocalizedText;
  body: LocalizedText;
  category: LocalizedText | null;
  pinned: boolean;
  audience: 'public' | 'students' | 'staff';
  attachment_media_id: string | null;
  attachment_label: LocalizedText | null;
  published: boolean;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export function toNotice(r: NoticeRow): Notice {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    body: r.body,
    category: r.category ?? undefined,
    pinned: r.pinned,
    attachment: r.attachment_media_id
      ? { label: r.attachment_label ?? 'Download', href: mediaSrc(r.attachment_media_id) }
      : undefined,
  };
}

interface FacultyRow {
  id: string;
  name: LocalizedText;
  role: LocalizedText;
  qualification: LocalizedText | null;
  subjects: LocalizedText | null;
  photo_media_id: string | null;
}

function toPerson(r: FacultyRow): Person {
  return {
    name: r.name,
    role: r.role,
    qualification: r.qualification ?? undefined,
    subjects: r.subjects ?? undefined,
    photo: r.photo_media_id ? { src: mediaSrc(r.photo_media_id), alt: r.name } : undefined,
  };
}

// ---------- Cached public site data ----------
let cache: { at: number; data: SchoolConfig } | null = null;
/** Survives invalidation, so the site stays up even if the database fails right after a save. */
let lastGood: SchoolConfig | null = null;
let refreshing: Promise<SchoolConfig> | null = null;
let generation = 0;
const CACHE_MS = 30_000;

export function invalidateSite() {
  cache = null;
  refreshing = null;
  generation++;
}

/**
 * Everything the public website shows (public, published content only).
 * Cached for 30 seconds; while it refreshes, all visitors share one database
 * read, and if the database is unreachable the last good copy keeps the site up.
 */
export async function getPublicSite(): Promise<SchoolConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!refreshing) {
    const gen = generation;
    const p: Promise<SchoolConfig> = loadPublicSite()
      .then((data) => {
        lastGood = data;
        if (gen === generation) cache = { at: Date.now(), data };
        return data;
      })
      .catch((err) => {
        if (!lastGood) throw err;
        console.error('Could not refresh website content; showing the last saved copy', err);
        cache = { at: Date.now() - CACHE_MS + 5_000, data: lastGood }; // try again in 5 seconds
        return lastGood;
      })
      .finally(() => {
        if (refreshing === p) refreshing = null;
      });
    refreshing = p;
  }
  return refreshing;
}

async function loadPublicSite(): Promise<SchoolConfig> {
  const [settings, notices, gallery, faculty] = await Promise.all([
    getSettings(),
    query<NoticeRow>(
      "SELECT * FROM notices WHERE audience = 'public' AND published ORDER BY pinned DESC, date DESC, created_at DESC LIMIT 200",
    ),
    query<{ src: string; alt: LocalizedText; caption: LocalizedText | null; category: LocalizedText | null; width: number | null; height: number | null }>(
      'SELECT src, alt, caption, category, width, height FROM gallery_items WHERE published ORDER BY sort, created_at DESC',
    ),
    query<FacultyRow>('SELECT id, name, role, qualification, subjects, photo_media_id FROM faculty_members ORDER BY sort, created_at'),
  ]);
  const data: SchoolConfig = {
    ...settings,
    gallery: {
      intro: settings.gallery.intro,
      items: gallery.map((g) => ({
        src: g.src,
        alt: g.alt,
        caption: g.caption ?? undefined,
        category: g.category ?? undefined,
        width: g.width ?? undefined,
        height: g.height ?? undefined,
      })),
    },
    faculty: { intro: settings.faculty.intro, members: faculty.map(toPerson) },
    notices: notices.map(toNotice),
  } as SchoolConfig;
  return data;
}

/** First start: seed starter content and the first head-teacher account. */
export async function bootstrap(): Promise<void> {
  const hasSettings = (await query('SELECT 1 FROM site_settings WHERE id = 1')).length > 0;
  if (!hasSettings) {
    await transaction(async (c) => {
      await c.query('INSERT INTO site_settings (id, data) VALUES (1, $1)', [json(defaultSettings())]);
      for (const [i, m] of defaultConfig.faculty.members.entries()) {
        await c.query('INSERT INTO faculty_members (name, role, qualification, subjects, sort) VALUES ($1, $2, $3, $4, $5)', [
          json(m.name),
          json(m.role),
          json(m.qualification),
          json(m.subjects),
          i,
        ]);
      }
      for (const [i, g] of defaultConfig.gallery.items.entries()) {
        await c.query(
          'INSERT INTO gallery_items (src, alt, caption, category, width, height, sort) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [g.src, json(g.alt), json(g.caption), json(g.category), g.width ?? null, g.height ?? null, i],
        );
      }
      for (const n of defaultConfig.notices) {
        await c.query('INSERT INTO notices (date, title, body, category, pinned) VALUES ($1, $2, $3, $4, $5)', [
          n.date,
          json(n.title),
          json(n.body),
          json(n.category),
          !!n.pinned,
        ]);
      }
    });
    console.log('Seeded starter website content.');
  }

  const heads = await query("SELECT 1 FROM users WHERE role = 'head_teacher' AND active");
  if (heads.length === 0) {
    if (!env.headTeacherUsername || !env.headTeacherPassword) {
      console.warn(
        'No head-teacher account exists. Set HEAD_TEACHER_USERNAME and HEAD_TEACHER_PASSWORD and restart to create one.',
      );
      return;
    }
    if (env.headTeacherPassword.length < 10) throw new Error('HEAD_TEACHER_PASSWORD must be at least 10 characters.');
    await query(
      `INSERT INTO users (username, display_name, role, password_hash, must_change_password)
       VALUES ($1, 'Head Teacher', 'head_teacher', $2, true)
       ON CONFLICT (username) DO UPDATE SET role = 'head_teacher', active = true, password_hash = EXCLUDED.password_hash,
         must_change_password = true, session_version = users.session_version + 1`,
      [env.headTeacherUsername.toLowerCase(), await hashPassword(env.headTeacherPassword)],
    );
    console.log(`Created head-teacher account "${env.headTeacherUsername.toLowerCase()}" (must change password at first sign-in).`);
  }
}
