import type { ImageRef } from '../config/types';
import { useLanguage } from '../i18n/LanguageContext';
import { asset } from '../lib/content';

interface ImgProps {
  image: ImageRef;
  className?: string;
  /** Load immediately (use for the first large image on a page). */
  priority?: boolean;
  sizes?: string;
  /** Decorative images (e.g. a logo next to the school name) get empty alt text. */
  decorative?: boolean;
}

export function Img({ image, className, priority = false, sizes, decorative = false }: ImgProps) {
  const { t } = useLanguage();
  return (
    <img
      className={className}
      src={asset(image.src)}
      alt={decorative ? '' : t(image.alt)}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
    />
  );
}
