import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { audit } from '../audit.js';
import { query } from '../db.js';
import { HttpError, rateLimited, requireRole } from '../security.js';
import { mediaSrc } from '../siteData.js';
import { uuidParam } from '../validate.js';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

/**
 * Images are re-encoded (resized, rotated upright, all metadata such as GPS
 * location removed). SVG is not accepted because it can contain scripts.
 * PDFs are accepted as notice attachments.
 */
async function processUpload(buf: Buffer, name: string): Promise<{ mime: string; data: Buffer; width?: number; height?: number }> {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') {
    return { mime: 'application/pdf', data: buf };
  }
  let image: ReturnType<typeof sharp>;
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    image = sharp(buf, { failOn: 'error', limitInputPixels: 80_000_000 });
    meta = await image.metadata();
  } catch {
    throw new HttpError(400, `“${name}” is not a supported image. Use JPG, PNG, WebP or GIF (or PDF for attachments).`);
  }
  if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'heif', 'avif', 'tiff'].includes(meta.format)) {
    throw new HttpError(400, 'Unsupported file type. Use JPG, PNG, WebP or GIF (or PDF for attachments).');
  }
  const out = await image
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { mime: 'image/webp', data: out.data, width: out.info.width, height: out.info.height };
}

export const mediaApiRouter = Router();

mediaApiRouter.post('/', requireRole('head_teacher', 'faculty'), upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a file to upload.');
  if (await rateLimited(`upload:${req.user!.id}`, 100, 60 * 60)) {
    throw new HttpError(429, 'Upload limit reached. Please try again in an hour.');
  }
  const name = req.file.originalname.slice(0, 200);
  const processed = await processUpload(req.file.buffer, name);
  const [row] = await query<{ id: string }>(
    `INSERT INTO media (mime, data, bytes, width, height, original_name, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [processed.mime, processed.data, processed.data.length, processed.width ?? null, processed.height ?? null, name, req.user!.id],
  );
  await audit(req.user!, 'media.uploaded', name);
  res.status(201).json({
    id: row.id,
    src: mediaSrc(row.id),
    mime: processed.mime,
    width: processed.width,
    height: processed.height,
  });
});

/** Where a media item is used; empty when it can be deleted safely. */
async function mediaUsage(id: string): Promise<string[]> {
  const src = mediaSrc(id);
  const [settings] = await query<{ used: boolean }>('SELECT position($1 in data::text) > 0 AS used FROM site_settings WHERE id = 1', [src]);
  const uses: string[] = [];
  if (settings?.used) uses.push('website content');
  if ((await query('SELECT 1 FROM gallery_items WHERE media_id = $1 OR src = $2', [id, src])).length) uses.push('gallery');
  if ((await query('SELECT 1 FROM faculty_members WHERE photo_media_id = $1', [id])).length) uses.push('faculty profile');
  if ((await query('SELECT 1 FROM notices WHERE attachment_media_id = $1', [id])).length) uses.push('notice attachment');
  return uses;
}

mediaApiRouter.get('/', requireRole('head_teacher'), async (_req, res) => {
  const rows = await query<{ id: string }>(
    `SELECT m.id, m.mime, m.bytes, m.width, m.height, m.original_name AS "name", m.created_at AS "createdAt",
            u.display_name AS "uploadedBy"
     FROM media m LEFT JOIN users u ON u.id = m.uploaded_by ORDER BY m.created_at DESC LIMIT 500`,
  );
  const items = await Promise.all(rows.map(async (r) => ({ ...r, src: mediaSrc(r.id), usedIn: await mediaUsage(r.id) })));
  res.json({ items });
});

mediaApiRouter.delete('/:id', requireRole('head_teacher'), async (req, res) => {
  const id = uuidParam(req.params.id);
  const uses = await mediaUsage(id);
  if (uses.length) throw new HttpError(409, `This file is still used in: ${uses.join(', ')}. Remove it there first.`);
  const [row] = await query<{ original_name: string }>('DELETE FROM media WHERE id = $1 RETURNING original_name', [id]);
  if (!row) throw new HttpError(404, 'File not found.');
  await audit(req.user!, 'media.deleted', row.original_name);
  res.json({ ok: true });
});

/** Public file serving: /media/:id */
export const mediaFileRouter = Router();

mediaFileRouter.get('/:id', async (req, res) => {
  const id = uuidParam(req.params.id);
  const [row] = await query<{ mime: string; data: Buffer; original_name: string | null }>(
    'SELECT mime, data, original_name FROM media WHERE id = $1',
    [id],
  );
  if (!row) throw new HttpError(404, 'File not found.');
  res.set({
    'Content-Type': row.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
  });
  if (row.mime === 'application/pdf') {
    const safeName = (row.original_name || 'document.pdf').replace(/[^\w.-]+/g, '_');
    res.set('Content-Disposition', `inline; filename="${safeName}"`);
  }
  res.send(row.data);
});
