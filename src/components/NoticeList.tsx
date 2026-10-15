import { Link } from 'react-router';
import { useSite } from '../lib/site';
import type { Notice } from '../config/types';
import { useLanguage } from '../i18n/LanguageContext';
import { asset } from '../lib/content';
import { PAGE_PATHS } from '../lib/seo';
import { Icon } from './Icon';

/** Pinned notices first, then newest first. */
export function sortedNotices(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}

export const noticeAnchor = (id: string) => `notice-${id}`;

interface NoticeListProps {
  /** Show only the first N notices as short summaries linking to the Notices page. */
  limit?: number;
}

export function NoticeList({ limit }: NoticeListProps) {
  const config = useSite();
  const { s, t, formatDate } = useLanguage();
  const all = sortedNotices(config.notices);
  const notices = limit ? all.slice(0, limit) : all;
  const summary = limit !== undefined;

  if (notices.length === 0) return <p className="empty-state">{s.notices.none}</p>;

  return (
    <ul className={`notice-list${summary ? ' notice-list--summary' : ''}`}>
      {notices.map((n) => (
        <li key={n.id}>
          <article
            id={summary ? undefined : noticeAnchor(n.id)}
            className={`notice${n.pinned ? ' notice--pinned' : ''}`}
            aria-labelledby={`${summary ? 'sum' : 'full'}-${n.id}-title`}
          >
            <div className="notice__meta">
              <span className="notice__date">
                <Icon name="calendar" size={16} />
                <span className="visually-hidden">{s.notices.postedOn}: </span>
                <time dateTime={n.date}>{formatDate(n.date)}</time>
              </span>
              {n.pinned && <span className="badge badge--accent">{s.notices.pinned}</span>}
              {n.category && <span className="badge">{t(n.category)}</span>}
            </div>
            <h3 id={`${summary ? 'sum' : 'full'}-${n.id}-title`} className="notice__title">
              {summary ? <Link to={`${PAGE_PATHS.notices}#${noticeAnchor(n.id)}`}>{t(n.title)}</Link> : t(n.title)}
            </h3>
            {!summary && (
              <>
                <p className="notice__body">{t(n.body)}</p>
                {n.attachment && (
                  <a className="btn btn--outline btn--sm" href={asset(n.attachment.href)} download>
                    <Icon name="file" size={18} />
                    {t(n.attachment.label) || s.notices.download}
                  </a>
                )}
              </>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
