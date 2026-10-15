import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function Academics() {
  const config = useSite();
  usePageMeta('academics');
  const { s, t } = useLanguage();
  const { academics } = config;

  return (
    <>
      <PageHeader title={s.nav.academics} intro={s.pageIntro.academics} />

      <Section>
        <div className="prose">
          <p className="lead">{t(academics.intro)}</p>
        </div>
        <div className="info-box">
          <h2 className="info-box__title">{s.academics.curriculum}</h2>
          <p>{t(academics.curriculum)}</p>
        </div>
      </Section>

      {academics.stages.length > 0 && (
        <Section id="stages" title={s.academics.stages} tone="muted">
          <ul className="card-grid card-grid--3">
            {academics.stages.map((st, i) => (
              <li key={i} className="card stage-card">
                <h3>{t(st.name)}</h3>
                <p className="stage-card__classes">{t(st.classes)}</p>
                <p>{t(st.description)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section>
        <div className="card-grid card-grid--2">
          {academics.subjects.length > 0 && (
            <div>
              <h2 className="section__title">{s.academics.subjects}</h2>
              <ul className="tag-list">
                {academics.subjects.map((sub, i) => (
                  <li key={i}>{t(sub)}</li>
                ))}
              </ul>
            </div>
          )}
          {academics.coCurricular.length > 0 && (
            <div>
              <h2 className="section__title">{s.academics.coCurricular}</h2>
              <ul className="tag-list">
                {academics.coCurricular.map((a, i) => (
                  <li key={i}>{t(a)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Section tone="muted">
        <div className="card-grid card-grid--2">
          {academics.timings.length > 0 && (
            <div className="card">
              <h2 className="card__title">{s.academics.timings}</h2>
              <dl className="def-list">
                {academics.timings.map((row, i) => (
                  <div key={i}>
                    <dt>{t(row.label)}</dt>
                    <dd>{t(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="card">
            <h2 className="card__title">{s.academics.calendar}</h2>
            <p>{t(academics.calendarNote)}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
