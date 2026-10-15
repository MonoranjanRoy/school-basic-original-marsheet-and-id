import { resolveText } from '../../i18n/LanguageContext';
import { asset, isSet } from '../../lib/content';
import { formatDate } from '../../lib/marksheet';
import { useSite } from '../../lib/site';
import { initials, photoSrc, type Student } from '../students';
import '../../styles/documents.css';

/** A student ID card at real size (54 × 85.6 mm), filled in from the student's details. */
export function IdCard({ student: s }: { student: Student }) {
  const site = useSite();
  const docs = site.documents;
  const school = resolveText(site.school.name, 'en');
  const address = site.contact.address.map((l) => resolveText(l, 'en')).filter(isSet).join(', ');
  const phone = site.contact.phones.map((p) => p.number).find(isSet);
  const photo = photoSrc(s);
  const classText = [s.className && `Class ${s.className}`, s.section && `Section ${s.section}`].filter(Boolean).join(' · ');

  const rows: [string, string, string?][] = [
    ['Student ID', s.studentId],
    ['Roll no.', s.rollNo],
    ['Date of birth', formatDate(s.dateOfBirth)],
    ['Blood group', s.bloodGroup],
    ['Father', s.fatherName],
    ['Mother', s.motherName],
    ['Phone', s.guardianPhone],
    ['Address', s.address, 'idcard__address'],
  ];

  return (
    <article className="idcard" aria-label={`ID card: ${s.displayName}`}>
      <header className="idcard__head">
        <img src={asset(site.school.logo.src)} alt="" className="idcard__logo" />
        <div>
          <p className="idcard__school">{school}</p>
          <p className="idcard__addr">{[address, phone && `Ph: ${phone}`].filter(Boolean).join(' · ')}</p>
        </div>
      </header>
      <p className="idcard__band">
        Student identity card{isSet(docs?.session) && ` · ${docs.session}`}
      </p>
      {photo ? (
        <img src={photo} alt="" className="idcard__photo" />
      ) : (
        <span className="idcard__photo idcard__photo--empty" aria-hidden="true">
          {initials(s.displayName)}
        </span>
      )}
      <p className="idcard__name">{s.displayName}</p>
      {classText && <p className="idcard__class">{classText}</p>}
      <dl className="idcard__rows">
        {rows
          .filter(([, v]) => isSet(v))
          .map(([k, v, cls]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{k}</dt>
              <dd className={cls}>{v}</dd>
            </div>
          ))}
      </dl>
      <footer className="idcard__foot">
        <p className="idcard__note">
          {isSet(docs?.udiseCode) && <>UDISE {docs.udiseCode}. </>}
          {docs?.idCardNote}
        </p>
        <span className="idcard__sign">{docs?.headTeacherLabel || 'Head Teacher'}</span>
      </footer>
    </article>
  );
}
