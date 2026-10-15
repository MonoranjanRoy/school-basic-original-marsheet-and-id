import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { privacySections, termsSections } from '../content/legal';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const config = useSite();
  usePageMeta(kind);
  const { s, lang, formatDate } = useLanguage();
  const sections = kind === 'privacy' ? privacySections(lang, config) : termsSections(lang, config);

  return (
    <>
      <PageHeader title={s.nav[kind]} intro={s.pageIntro[kind]}>
        <p className="page-header__meta">
          {s.legal.lastUpdated}: <time dateTime={config.legal.lastUpdated}>{formatDate(config.legal.lastUpdated)}</time>
        </p>
      </PageHeader>
      <Section>
        <div className="prose prose--legal">
          {sections.map((sec) => (
            <section key={sec.heading}>
              <h2>{sec.heading}</h2>
              {sec.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}

export function Privacy() {
  return <LegalPage kind="privacy" />;
}

export function Terms() {
  return <LegalPage kind="terms" />;
}
