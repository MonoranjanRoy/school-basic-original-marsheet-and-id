import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  intro?: string;
  children?: ReactNode;
}

export function PageHeader({ title, intro, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="container">
        <h1 id="page-title">{title}</h1>
        {intro && <p className="page-header__intro">{intro}</p>}
        {children}
      </div>
    </header>
  );
}
