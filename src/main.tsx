import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import type { SchoolConfig } from './config/types';
import { contentStatus } from './lib/offline';
import './styles/global.css';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
const container = document.getElementById('root')!;

/**
 * Website content: embedded in the page by the server, or fetched from the API.
 * If the API cannot be reached, fall back to the bundled starter content so
 * the site still works (the portal needs the server and will say so).
 */
async function loadSite(): Promise<SchoolConfig> {
  const embedded = document.getElementById('site-data');
  if (embedded?.textContent) return JSON.parse(embedded.textContent) as SchoolConfig;
  try {
    const res = await fetch('/api/public/site');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SchoolConfig;
  } catch (err) {
    console.warn('Could not load live website content — showing starter content instead.', err);
    contentStatus.usingStarterContent = true;
    return (await import('./config/school.config')).default;
  }
}

loadSite().then(
  (site) => {
    const app = (
      <StrictMode>
        <BrowserRouter basename={basename}>
          <App site={site} />
        </BrowserRouter>
      </StrictMode>
    );
    // Public pages arrive rendered from the server; attach to that markup when
    // it was rendered for this URL, otherwise render from scratch.
    const current = ('/' + location.pathname.slice(import.meta.env.BASE_URL.length)).replace(/\/?$/, '/');
    if (container.firstElementChild && container.dataset.rendered === current) {
      hydrateRoot(container, app);
    } else {
      container.textContent = '';
      createRoot(container).render(app);
    }
  },
  (err) => {
    console.error(err);
    if (!container.firstElementChild) {
      container.innerHTML = '<p style="padding:24px;font-family:sans-serif">The website could not be loaded. Please try again shortly.</p>';
    }
  },
);
