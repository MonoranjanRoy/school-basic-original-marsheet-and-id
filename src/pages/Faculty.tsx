import { PageHeader } from '../components/PageHeader';
import { PersonCard } from '../components/PersonCard';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function Faculty() {
  const config = useSite();
  usePageMeta('faculty');
  const { s, t } = useLanguage();
  const { faculty } = config;

  return (
    <>
      <PageHeader title={s.nav.faculty} intro={s.pageIntro.faculty} />
      <Section>
        <p className="lead">{t(faculty.intro)}</p>
        <ul className="card-grid card-grid--4">
          {faculty.members.map((m, i) => (
            <li key={i}>
              <PersonCard person={m} />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
