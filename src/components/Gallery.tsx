import { useEffect, useRef, useState } from 'react';
import type { SchoolConfig } from '../config/types';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { asset } from '../lib/content';
import { Icon } from './Icon';
import { Img } from './Img';

type GalleryItem = SchoolConfig['gallery']['items'][number];

interface GalleryProps {
  /** Show only the first N photos without filters (used on the home page). */
  limit?: number;
}

export function Gallery({ limit }: GalleryProps) {
  const config = useSite();
  const { s, t } = useLanguage();
  const allItems = config.gallery.items;
  const categories = Array.from(new Set(allItems.map((i) => t(i.category)).filter(Boolean)));
  const [category, setCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const filtered = category ? allItems.filter((i) => t(i.category) === category) : allItems;
  const items = limit ? filtered.slice(0, limit) : filtered;
  const showFilters = !limit && categories.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  const close = () => {
    setOpenIndex(null);
    triggerRef.current?.focus();
  };
  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? null : (i + delta + items.length) % items.length));

  if (allItems.length === 0) return <p className="empty-state">{s.gallery.empty}</p>;

  const current: GalleryItem | null = openIndex !== null ? items[openIndex] ?? null : null;

  return (
    <div className="gallery">
      {showFilters && (
        <div className="chip-group" role="group" aria-label={s.gallery.filterLabel}>
          {[null, ...categories].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c ?? s.gallery.all}
            </button>
          ))}
        </div>
      )}

      <ul className="gallery__grid">
        {items.map((item, i) => (
          <li key={`${item.src}-${i}`}>
            <figure className="gallery__item">
              <button
                type="button"
                className="gallery__button"
                onClick={(e) => {
                  triggerRef.current = e.currentTarget;
                  setOpenIndex(i);
                }}
              >
                <Img image={item} className="gallery__img" sizes="(min-width: 960px) 33vw, (min-width: 600px) 50vw, 100vw" />
                <span className="visually-hidden">{s.gallery.openPhoto}</span>
              </button>
              {item.caption && <figcaption>{t(item.caption)}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={current ? t(current.caption) || t(current.alt) : s.gallery.openPhoto}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {current && (
          <div className="lightbox__inner">
            <button type="button" className="lightbox__close" onClick={close} autoFocus>
              <Icon name="close" size={24} />
              <span className="visually-hidden">{s.gallery.close}</span>
            </button>
            <img className="lightbox__img" src={asset(current.src)} alt={t(current.alt)} />
            <div className="lightbox__bar">
              {items.length > 1 && (
                <button type="button" className="lightbox__nav" onClick={() => step(-1)}>
                  <Icon name="chevronLeft" size={24} />
                  <span className="visually-hidden">{s.gallery.previous}</span>
                </button>
              )}
              <p className="lightbox__caption" aria-live="polite">
                {current.caption && <span>{t(current.caption)}</span>}
                <span className="lightbox__count">
                  {s.gallery.photoOf.replace('{n}', String(openIndex! + 1)).replace('{total}', String(items.length))}
                </span>
              </p>
              {items.length > 1 && (
                <button type="button" className="lightbox__nav" onClick={() => step(1)}>
                  <Icon name="chevronRight" size={24} />
                  <span className="visually-hidden">{s.gallery.next}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
