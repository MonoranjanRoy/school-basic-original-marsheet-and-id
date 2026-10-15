import compression from 'compression';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { isDatabaseBusy } from './db.js';
import { env } from './env.js';
import { distDir, loadFrontend, renderPage, robots, sitemap } from './render.js';
import { authRouter } from './routes/auth.js';
import { activityRouter, facultyRouter, galleryRouter, noticesRouter, publicRouter, settingsRouter } from './routes/content.js';
import { mediaApiRouter, mediaFileRouter } from './routes/media.js';
import { examsRouter, myResultsRouter, resultLookupRouter } from './routes/results.js';
import { studentsRouter } from './routes/students.js';
import { usersRouter } from './routes/users.js';
import { HttpError, loadUser, overloadGuard, requireAuth, sameOriginOnly } from './security.js';
import { sessionMiddleware } from './session.js';

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Railway sits behind a proxy (needed for secure cookies and client IPs)
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          // https: lets the enquiry form reach a third-party form service.
          connectSrc: ["'self'", 'https:'],
          frameSrc: ['https://www.google.com', 'https://maps.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: env.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: env.isProd,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(overloadGuard(env.maxInFlight));
  // Smaller pages for phones on slow connections (photos are already compressed).
  app.use(compression());

  app.use('/media', mediaFileRouter);

  // ---------- API ----------
  const api = express.Router();
  // 3 MB allows spreadsheet uploads of results for a whole school.
  api.use(express.json({ limit: '3mb' }));
  api.use(sessionMiddleware());
  api.use(loadUser);
  api.use(sameOriginOnly);
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use('/auth', authRouter);
  api.use('/public', publicRouter);
  api.use('/result-lookup', resultLookupRouter);
  api.use('/students', requireAuth, studentsRouter);
  api.use('/settings', requireAuth, settingsRouter);
  api.use('/users', requireAuth, usersRouter);
  api.use('/notices', requireAuth, noticesRouter);
  api.use('/gallery', requireAuth, galleryRouter);
  api.use('/faculty', requireAuth, facultyRouter);
  api.use('/media', requireAuth, mediaApiRouter);
  api.use('/activity', requireAuth, activityRouter);
  api.use('/exams', requireAuth, examsRouter);
  api.use('/my-results', requireAuth, myResultsRouter);
  api.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));
  app.use('/api', api);

  // ---------- Website ----------
  const hasFrontend = process.env.VITE_DEV !== '1' && (await loadFrontend());
  if (hasFrontend) {
    app.use('/assets', express.static(`${distDir}/assets`, { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('/sitemap.xml', sitemap);
    app.get('/robots.txt', robots);
    app.get('/{*path}', renderPage);
  } else {
    console.log('Frontend not built — serving the API only (use `npm run dev` for the website).');
  }

  // ---------- Errors ----------
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    let status = 500;
    let message = 'Something went wrong. Please try again.';
    if (err instanceof HttpError) {
      status = err.status;
      message = err.message;
    } else if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'That file is too large (maximum 10 MB).';
    } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
      status = 413;
      message = 'That upload is too large.';
    } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
      status = 400;
      message = 'Invalid request.';
    } else if (isDatabaseBusy(err)) {
      status = 503;
      message = 'The school website is very busy right now. Please try again in a minute.';
      res.set('Retry-After', '30');
      console.error('Database busy:', err instanceof Error ? err.message : err);
    } else {
      console.error(err);
    }
    if (req.path.startsWith('/api/') || req.path.startsWith('/media/')) {
      res.status(status).json({ error: message });
    } else {
      res.status(status).type('text').send(message);
    }
  });

  return app;
}
