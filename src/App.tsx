import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import type { SchoolConfig } from './config/types';
import { LanguageProvider } from './i18n/LanguageContext';
import { isPageVisible } from './lib/pages';
import { PAGE_PATHS, type PageKey } from './lib/seo';
import { SiteProvider } from './lib/site';
import About from './pages/About';
import Academics from './pages/Academics';
import Admissions from './pages/Admissions';
import Contact from './pages/Contact';
import Facilities from './pages/Facilities';
import Faculty from './pages/Faculty';
import GalleryPage from './pages/GalleryPage';
import Home from './pages/Home';
import { Privacy, Terms } from './pages/Legal';
import NotFound from './pages/NotFound';
import Notices from './pages/Notices';

// The staff/student portal is loaded only when someone opens /portal.
const Portal = lazy(() => import('./portal/Portal'));

const PAGES: [Exclude<PageKey, 'home' | 'notFound'>, ComponentType][] = [
  ['about', About],
  ['academics', Academics],
  ['facilities', Facilities],
  ['faculty', Faculty],
  ['gallery', GalleryPage],
  ['notices', Notices],
  ['admissions', Admissions],
  ['contact', Contact],
  ['privacy', Privacy],
  ['terms', Terms],
];

const p = (path: string) => path.replace(/^\/|\/$/g, '');

export default function App({ site }: { site: SchoolConfig }) {
  return (
    <SiteProvider site={site}>
      <LanguageProvider>
        <Routes>
          <Route
            path="portal/*"
            element={
              <Suspense fallback={<p className="portal-loading">Loading…</p>}>
                <Portal />
              </Suspense>
            }
          />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            {PAGES.filter(([key]) => isPageVisible(site, key)).map(([key, Page]) => (
              <Route key={key} path={p(PAGE_PATHS[key])} element={<Page />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </LanguageProvider>
    </SiteProvider>
  );
}
