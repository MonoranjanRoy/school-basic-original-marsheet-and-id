import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useLanguage } from '../i18n/LanguageContext';
import { PAGE_PATHS, usePageMeta } from '../lib/seo';

export default function NotFound() {
  usePageMeta('notFound');
  const { s } = useLanguage();
  return (
    <>
      <PageHeader title={s.notFound.title} intro={s.notFound.text} />
      <Section>
        <div className="button-row">
          <Link to={PAGE_PATHS.home} className="btn btn--primary">
            {s.cta.backHome}
          </Link>
          <Link to={PAGE_PATHS.contact} className="btn btn--outline">
            {s.cta.contactUs}
          </Link>
        </div>
      </Section>
    </>
  );
}
