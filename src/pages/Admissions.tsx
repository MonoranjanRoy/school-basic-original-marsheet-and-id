import { EnquiryForm } from '../components/EnquiryForm';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function Admissions() {
  const config = useSite();
  usePageMeta('admissions');
  const { s, t } = useLanguage();
  const { admissions } = config;

  return (
    <>
      <PageHeader title={s.nav.admissions} intro={s.pageIntro.admissions}>
        <dl className="status-pills">
          <div>
            <dt>{s.admissions.session}</dt>
            <dd>{t(admissions.session)}</dd>
          </div>
          <div>
            <dt>{s.admissions.status}</dt>
            <dd className={admissions.open ? 'is-open' : 'is-closed'}>
              {admissions.open ? s.admissions.open : s.admissions.closed}
            </dd>
          </div>
        </dl>
      </PageHeader>

      <Section>
        <p className="lead">{t(admissions.intro)}</p>
        {!admissions.open && <p className="callout callout--info">{s.admissions.closedNote}</p>}
      </Section>

      {admissions.process.length > 0 && (
        <Section id="process" title={s.admissions.process} tone="muted">
          <ol className="steps">
            {admissions.process.map((step, i) => (
              <li key={i} className="step">
                <span className="step__num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{t(step.title)}</h3>
                  <p>{t(step.text)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section>
        <div className="card-grid card-grid--2">
          {admissions.documents.length > 0 && (
            <div className="card">
              <h2 className="card__title">{s.admissions.documents}</h2>
              <ul className="check-list">
                {admissions.documents.map((d, i) => (
                  <li key={i}>{t(d)}</li>
                ))}
              </ul>
            </div>
          )}
          {admissions.eligibility.length > 0 && (
            <div className="card">
              <h2 className="card__title">{s.admissions.eligibility}</h2>
              <dl className="def-list">
                {admissions.eligibility.map((row, i) => (
                  <div key={i}>
                    <dt>{t(row.label)}</dt>
                    <dd>{t(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {admissions.importantDates.length > 0 && (
            <div className="card">
              <h2 className="card__title">{s.admissions.dates}</h2>
              <dl className="def-list">
                {admissions.importantDates.map((row, i) => (
                  <div key={i}>
                    <dt>{t(row.label)}</dt>
                    <dd>{t(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="card">
            <h2 className="card__title">{s.admissions.fees}</h2>
            <p>{t(admissions.feesNote)}</p>
          </div>
        </div>
      </Section>

      <Section id="enquiry" title={s.admissions.enquiryHeading} tone="muted">
        <p className="lead">{s.admissions.enquiryIntro}</p>
        <EnquiryForm />
      </Section>
    </>
  );
}
