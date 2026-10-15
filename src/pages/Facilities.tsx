import { Img } from '../components/Img';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function Facilities() {
  const config = useSite();
  usePageMeta('facilities');
  const { s, t } = useLanguage();
  const { facilities } = config;

  return (
    <>
      <PageHeader title={s.nav.facilities} intro={s.pageIntro.facilities} />
      <Section>
        <p className="lead">{t(facilities.intro)}</p>
        <ul className="card-grid card-grid--3">
          {facilities.items.map((f, i) => (
            <li key={i} className="card card--media">
              {f.image && <Img image={f.image} className="card__img" sizes="(min-width: 960px) 33vw, (min-width: 600px) 50vw, 100vw" />}
              <div className="card__body">
                <h2 className="card__title">{t(f.name)}</h2>
                <p>{t(f.description)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
