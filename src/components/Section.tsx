import type { ReactNode } from 'react';

interface SectionProps {
  id?: string;
  title?: string;
  /** Visually hide the heading (still announced to screen readers). */
  hideTitle?: boolean;
  tone?: 'default' | 'muted';
  className?: string;
  children: ReactNode;
}

export function Section({ id, title, hideTitle, tone = 'default', className, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      className={`section section--${tone}${className ? ` ${className}` : ''}`}
      aria-labelledby={title ? headingId : undefined}
    >
      <div className="container">
        {title && (
          <h2 id={headingId} className={hideTitle ? 'visually-hidden' : 'section__title'}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}
