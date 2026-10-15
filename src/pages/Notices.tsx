import { NoticeList } from '../components/NoticeList';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function Notices() {
  usePageMeta('notices');
  const { s } = useLanguage();

  return (
    <>
      <PageHeader title={s.nav.notices} intro={s.pageIntro.notices} />
      <Section>
        <NoticeList />
      </Section>
    </>
  );
}
