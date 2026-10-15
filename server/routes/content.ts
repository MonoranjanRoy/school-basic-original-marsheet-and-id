import { Router, type Request } from 'express';
import { audit } from '../audit.js';
import { json, query } from '../db.js';
import { facultyInput, galleryInput, noticeInput, ownProfileInput, siteSettingsSchema } from '../schema.js';
import { HttpError, requireRole } from '../security.js';
import { getPublicSite, getSettings, invalidateSite, mediaSrc, type NoticeRow } from '../siteData.js';
import { uuidParam, validate } from '../validate.js';

const PLACEHOLDER = /\[[^\]]+\]/;
function findPlaceholders(node: unknown, path = ''): string[] {
  if (typeof node === 'string') return PLACEHOLDER.test(node) ? [path] : [];
  if (Array.isArray(node)) return node.flatMap((v, i) => findPlaceholders(v, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => findPlaceholders(v, path ? `${path}.${k}` : k));
  }
  return [];
}

/** Public data for the website (used by the browser in development and by the portal preview). */
export const publicRouter = Router();
publicRouter.get('/site', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getPublicSite());
});

// ---------------------------------------------------------------------------
// Website settings — head teacher only
// ---------------------------------------------------------------------------
export const settingsRouter = Router();
settingsRouter.use(requireRole('head_teacher'));

settingsRouter.get('/', async (_req, res) => {
  const settings = await getSettings();
  res.json({ settings, placeholders: findPlaceholders(settings) });
});

settingsRouter.put('/', async (req, res) => {
  const settings = validate(siteSettingsSchema, req.body);
  await query('UPDATE site_settings SET data = $1, updated_at = now(), updated_by = $2 WHERE id = 1', [json(settings), req.user!.id]);
  invalidateSite();
  await audit(req.user!, 'settings.updated');
  res.json({ settings, placeholders: findPlaceholders(settings) });
});

/** Faculty posts go live immediately unless the head teacher requires approval. */
async function publishedOnCreate(req: Request): Promise<boolean> {
  if (req.user!.role === 'head_teacher') return true;
  return !(await getSettings()).moderation.facultyPostsNeedApproval;
}

/** Faculty may only change their own items; the head teacher may change any. */
async function assertCanEdit(req: Request, table: 'notices' | 'gallery_items', id: string) {
  const [row] = await query<{ created_by: string | null }>(`SELECT created_by FROM ${table} WHERE id = $1`, [id]);
  if (!row) throw new HttpError(404, 'Not found.');
  if (req.user!.role !== 'head_teacher' && row.created_by !== req.user!.id) {
    throw new HttpError(403, 'You can only change items you created.');
  }
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------
export const noticesRouter = Router();

noticesRouter.get('/', async (req, res) => {
  const role = req.user!.role;
  const rows =
    role === 'student'
      ? await query<NoticeRow>(
          "SELECT n.* FROM notices n WHERE n.published AND n.audience IN ('public', 'students') ORDER BY n.pinned DESC, n.date DESC, n.created_at DESC LIMIT 300",
        )
      : await query<NoticeRow>(
          `SELECT n.*, u.display_name AS created_by_name FROM notices n LEFT JOIN users u ON u.id = n.created_by
           ORDER BY n.published, n.pinned DESC, n.date DESC, n.created_at DESC LIMIT 500`,
        );
  res.json({
    notices: rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      body: r.body,
      category: r.category,
      pinned: r.pinned,
      audience: r.audience,
      published: r.published,
      attachmentMediaId: r.attachment_media_id,
      attachmentSrc: r.attachment_media_id ? mediaSrc(r.attachment_media_id) : null,
      attachmentLabel: r.attachment_label,
      createdBy: r.created_by,
      createdByName: role === 'student' ? undefined : r.created_by_name,
      canEdit: role === 'head_teacher' || (role === 'faculty' && r.created_by === req.user!.id),
    })),
  });
});

noticesRouter.post('/', requireRole('head_teacher', 'faculty'), async (req, res) => {
  const n = validate(noticeInput, req.body);
  const published = await publishedOnCreate(req);
  const [row] = await query<{ id: string }>(
    `INSERT INTO notices (date, title, body, category, pinned, audience, attachment_media_id, attachment_label, published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [n.date, json(n.title), json(n.body), json(n.category), n.pinned, n.audience, n.attachmentMediaId ?? null, json(n.attachmentLabel), published, req.user!.id],
  );
  invalidateSite();
  await audit(req.user!, 'notice.created', `${JSON.stringify(n.title).slice(0, 120)}${published ? '' : ' (awaiting approval)'}`);
  res.status(201).json({ id: row.id, published });
});

noticesRouter.put('/:id', requireRole('head_teacher', 'faculty'), async (req, res) => {
  const id = uuidParam(req.params.id);
  await assertCanEdit(req, 'notices', id);
  const n = validate(noticeInput, req.body);
  // A teacher's edit goes back for approval when approval is required.
  const published = await publishedOnCreate(req);
  await query(
    `UPDATE notices SET date = $2, title = $3, body = $4, category = $5, pinned = $6, audience = $7,
       attachment_media_id = $8, attachment_label = $9, updated_at = now(),
       published = CASE WHEN $10 THEN published ELSE false END
     WHERE id = $1`,
    [id, n.date, json(n.title), json(n.body), json(n.category), n.pinned, n.audience, n.attachmentMediaId ?? null, json(n.attachmentLabel), published],
  );
  invalidateSite();
  await audit(req.user!, 'notice.updated', JSON.stringify(n.title).slice(0, 120));
  res.json({ ok: true });
});

noticesRouter.post('/:id/publish', requireRole('head_teacher'), async (req, res) => {
  const id = uuidParam(req.params.id);
  const publish = req.body?.published !== false;
  await query('UPDATE notices SET published = $2 WHERE id = $1', [id, publish]);
  invalidateSite();
  await audit(req.user!, publish ? 'notice.approved' : 'notice.unpublished', id);
  res.json({ ok: true });
});

noticesRouter.delete('/:id', requireRole('head_teacher', 'faculty'), async (req, res) => {
  const id = uuidParam(req.params.id);
  await assertCanEdit(req, 'notices', id);
  await query('DELETE FROM notices WHERE id = $1', [id]);
  invalidateSite();
  await audit(req.user!, 'notice.deleted', id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export const galleryRouter = Router();
galleryRouter.use(requireRole('head_teacher', 'faculty'));

galleryRouter.get('/', async (req, res) => {
  const items = await query(
    `SELECT g.id, g.src, g.alt, g.caption, g.category, g.sort, g.published, g.created_by AS "createdBy",
            u.display_name AS "createdByName", g.created_at AS "createdAt"
     FROM gallery_items g LEFT JOIN users u ON u.id = g.created_by
     ORDER BY g.published, g.sort, g.created_at DESC`,
  );
  res.json({
    items: items.map((i) => ({
      ...i,
      canEdit: req.user!.role === 'head_teacher' || i.createdBy === req.user!.id,
    })),
  });
});

galleryRouter.post('/', async (req, res) => {
  const g = validate(galleryInput, req.body);
  const [media] = await query<{ width: number | null; height: number | null; mime: string }>(
    'SELECT width, height, mime FROM media WHERE id = $1',
    [g.mediaId],
  );
  if (!media || !media.mime.startsWith('image/')) throw new HttpError(400, 'Upload an image first.');
  const published = await publishedOnCreate(req);
  const [row] = await query<{ id: string }>(
    `INSERT INTO gallery_items (src, media_id, width, height, alt, caption, category, sort, published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [mediaSrc(g.mediaId), g.mediaId, media.width, media.height, json(g.alt), json(g.caption), json(g.category), g.sort, published, req.user!.id],
  );
  invalidateSite();
  await audit(req.user!, 'gallery.added', `${JSON.stringify(g.caption ?? g.alt).slice(0, 120)}${published ? '' : ' (awaiting approval)'}`);
  res.status(201).json({ id: row.id, published });
});

galleryRouter.put('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  await assertCanEdit(req, 'gallery_items', id);
  const g = validate(galleryInput.omit({ mediaId: true }), req.body);
  const published = await publishedOnCreate(req);
  await query(
    `UPDATE gallery_items SET alt = $2, caption = $3, category = $4, sort = $5,
       published = CASE WHEN $6 THEN published ELSE false END WHERE id = $1`,
    [id, json(g.alt), json(g.caption), json(g.category), g.sort, published],
  );
  invalidateSite();
  await audit(req.user!, 'gallery.updated', id);
  res.json({ ok: true });
});

galleryRouter.post('/:id/publish', requireRole('head_teacher'), async (req, res) => {
  const id = uuidParam(req.params.id);
  const publish = req.body?.published !== false;
  await query('UPDATE gallery_items SET published = $2 WHERE id = $1', [id, publish]);
  invalidateSite();
  await audit(req.user!, publish ? 'gallery.approved' : 'gallery.unpublished', id);
  res.json({ ok: true });
});

galleryRouter.delete('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  await assertCanEdit(req, 'gallery_items', id);
  await query('DELETE FROM gallery_items WHERE id = $1', [id]);
  invalidateSite();
  await audit(req.user!, 'gallery.deleted', id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Faculty profiles
// ---------------------------------------------------------------------------
export const facultyRouter = Router();

const facultySelect = `SELECT f.id, f.name, f.role, f.qualification, f.subjects, f.photo_media_id AS "photoMediaId",
  f.user_id AS "userId", f.sort, u.username FROM faculty_members f LEFT JOIN users u ON u.id = f.user_id`;

const withPhoto = <T extends { photoMediaId: string | null }>(r: T) => ({ ...r, photoSrc: r.photoMediaId ? mediaSrc(r.photoMediaId) : null });

/** A teacher's own profile. */
facultyRouter.get('/me', requireRole('faculty', 'head_teacher'), async (req, res) => {
  const [row] = await query<{ photoMediaId: string | null }>(`${facultySelect} WHERE f.user_id = $1`, [req.user!.id]);
  res.json({ profile: row ? withPhoto(row) : null });
});

facultyRouter.put('/me', requireRole('faculty', 'head_teacher'), async (req, res) => {
  const p = validate(ownProfileInput, req.body);
  const [row] = await query<{ id: string }>(
    `UPDATE faculty_members SET name = $2, qualification = $3, subjects = $4, photo_media_id = $5, updated_at = now()
     WHERE user_id = $1 RETURNING id`,
    [req.user!.id, json(p.name), json(p.qualification), json(p.subjects), p.photoMediaId ?? null],
  );
  if (!row) throw new HttpError(404, 'No faculty profile is linked to your account yet. Ask the head teacher to link one.');
  invalidateSite();
  await audit(req.user!, 'faculty.own_profile_updated');
  res.json({ ok: true });
});

facultyRouter.get('/', requireRole('head_teacher'), async (_req, res) => {
  const rows = await query<{ photoMediaId: string | null }>(`${facultySelect} ORDER BY f.sort, f.created_at`);
  res.json({ members: rows.map(withPhoto) });
});

async function assertFacultyUser(userId: string | null | undefined, memberId: string | null) {
  if (!userId) return;
  const [u] = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId]);
  if (!u || u.role === 'student') throw new HttpError(400, 'Only faculty or head-teacher accounts can be linked to a profile.');
  const taken = await query('SELECT 1 FROM faculty_members WHERE user_id = $1 AND id IS DISTINCT FROM $2', [userId, memberId]);
  if (taken.length) throw new HttpError(409, 'That account is already linked to another profile.');
}

facultyRouter.post('/', requireRole('head_teacher'), async (req, res) => {
  const f = validate(facultyInput, req.body);
  await assertFacultyUser(f.userId, null);
  const [row] = await query<{ id: string }>(
    `INSERT INTO faculty_members (name, role, qualification, subjects, photo_media_id, user_id, sort)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [json(f.name), json(f.role), json(f.qualification), json(f.subjects), f.photoMediaId ?? null, f.userId ?? null, f.sort],
  );
  invalidateSite();
  await audit(req.user!, 'faculty.created', JSON.stringify(f.name).slice(0, 120));
  res.status(201).json({ id: row.id });
});

facultyRouter.put('/:id', requireRole('head_teacher'), async (req, res) => {
  const id = uuidParam(req.params.id);
  const f = validate(facultyInput, req.body);
  await assertFacultyUser(f.userId, id);
  const [row] = await query<{ id: string }>(
    `UPDATE faculty_members SET name = $2, role = $3, qualification = $4, subjects = $5, photo_media_id = $6,
       user_id = $7, sort = $8, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, json(f.name), json(f.role), json(f.qualification), json(f.subjects), f.photoMediaId ?? null, f.userId ?? null, f.sort],
  );
  if (!row) throw new HttpError(404, 'Profile not found.');
  invalidateSite();
  await audit(req.user!, 'faculty.updated', JSON.stringify(f.name).slice(0, 120));
  res.json({ ok: true });
});

facultyRouter.delete('/:id', requireRole('head_teacher'), async (req, res) => {
  const id = uuidParam(req.params.id);
  await query('DELETE FROM faculty_members WHERE id = $1', [id]);
  invalidateSite();
  await audit(req.user!, 'faculty.deleted', id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Activity log — head teacher only
// ---------------------------------------------------------------------------
export const activityRouter = Router();
activityRouter.get('/', requireRole('head_teacher'), async (_req, res) => {
  const entries = await query(
    'SELECT id, username, action, detail, created_at AS "createdAt" FROM audit_log ORDER BY created_at DESC LIMIT 300',
  );
  res.json({ entries });
});
