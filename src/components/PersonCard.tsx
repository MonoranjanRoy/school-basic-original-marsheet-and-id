import type { Person } from '../config/types';
import { useLanguage } from '../i18n/LanguageContext';
import { initials } from '../lib/content';
import { Img } from './Img';

export function Avatar({ person, size = 'md' }: { person: Person; size?: 'md' | 'lg' }) {
  const { t } = useLanguage();
  if (person.photo) {
    return <Img image={person.photo} className={`avatar avatar--${size}`} />;
  }
  return (
    <span className={`avatar avatar--${size} avatar--initials`} aria-hidden="true">
      {initials(t(person.name))}
    </span>
  );
}

export function PersonCard({ person }: { person: Person }) {
  const { t, s } = useLanguage();
  const qualification = t(person.qualification);
  const subjects = t(person.subjects);
  return (
    <article className="card person-card">
      <Avatar person={person} />
      <h3 className="person-card__name">{t(person.name)}</h3>
      <p className="person-card__role">{t(person.role)}</p>
      {(qualification || subjects) && (
        <dl className="person-card__details">
          {qualification && (
            <div>
              <dt>{s.faculty.qualification}</dt>
              <dd>{qualification}</dd>
            </div>
          )}
          {subjects && (
            <div>
              <dt>{s.faculty.subjects}</dt>
              <dd>{subjects}</dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}

/** Signature line under a message ("— Name, Principal"). */
export function Signatory({ person }: { person: Person }) {
  const { t } = useLanguage();
  const name = t(person.name);
  return (
    <div className="signatory">
      <Avatar person={person} />
      <div>
        <p className="signatory__name">{name}</p>
        {t(person.role) && <p className="signatory__role">{t(person.role)}</p>}
      </div>
    </div>
  );
}
