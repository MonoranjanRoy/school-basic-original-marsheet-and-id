import { Img } from '../components/Img';
import { PageHeader } from '../components/PageHeader';
import { Signatory } from '../components/PersonCard';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function About() {
  const config = useSite();
  usePageMeta('about');
  const { s, t } = useLanguage();
  const { about } = config;

  return (
    <>
      <PageHeader title={s.nav.about} intro={s.pageIntro.about} />

      <Section>
        <div className={about.image ? 'split split--media' : ''}>
          <div className="prose">
            {about.intro.map((p, i) => (
              <p key={i}>{t(p)}</p>
            ))}
          </div>
          {about.image && <Img image={about.image} className="rounded-img" sizes="(min-width: 960px) 45vw, 100vw" />}
        </div>
      </Section>

      <Section tone="muted">
        <div className="card-grid card-grid--2">
          <article className="card statement">
            <h2>{s.about.vision}</h2>
            <p>{t(about.vision)}</p>
          </article>
          <article className="card statement">
            <h2>{s.about.mission}</h2>
            <p>{t(about.mission)}</p>
          </article>
        </div>
      </Section>

      {about.values.length > 0 && (
        <Section id="values" title={s.about.values}>
          <ul className="card-grid card-grid--3">
            {about.values.map((v, i) => (
              <li key={i} className="card value-card">
                <h3>{t(v.title)}</h3>
                <p>{t(v.text)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {about.history.length > 0 && (
        <Section id="history" title={s.about.history} tone="muted">
          <div className="prose">
            {about.history.map((p, i) => (
              <p key={i}>{t(p)}</p>
            ))}
          </div>
        </Section>
      )}

      {about.leadershipMessage && (
        <Section id="message" title={t(about.leadershipMessage.heading)}>
          <div className="prose">
            {about.leadershipMessage.paragraphs.map((p, i) => (
              <p key={i}>{t(p)}</p>
            ))}
          </div>
          <Signatory person={about.leadershipMessage.person} />
        </Section>
      )}
    </>
  );
}
