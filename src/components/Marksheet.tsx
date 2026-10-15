import { resolveText } from '../i18n/LanguageContext';
import { asset, isSet } from '../lib/content';
import { formatDate, partNames, type Marksheet as MarksheetData } from '../lib/marksheet';
import { useSite } from '../lib/site';
import '../styles/documents.css';

/** The school's letterhead, shared by marksheets. */
export function SchoolLetterhead() {
  const site = useSite();
  const en = (v: Parameters<typeof resolveText>[0] | undefined) => (v ? resolveText(v, 'en') : '');
  const affiliation = [en(site.school.affiliation), site.school.affiliationNumber].filter(isSet).join(' · ');
  const address = site.contact.address.map((l) => en(l)).filter(isSet).join(', ');
  const phone = site.contact.phones.map((p) => p.number).filter(isSet)[0];
  const contact = [phone && `Phone: ${phone}`, isSet(site.contact.email) && `Email: ${site.contact.email}`].filter(Boolean).join(' · ');
  return (
    <header className="ms__head">
      {/* Not lazy-loaded: every page of a printed batch needs the logo. */}
      <img src={asset(site.school.logo.src)} className="ms__logo" alt="" />
      <div>
        <p className="ms__school">{en(site.school.name)}</p>
        {affiliation && <p className="ms__line">{affiliation}</p>}
        {isSet(site.documents?.udiseCode) && <p className="ms__line">UDISE code: {site.documents.udiseCode}</p>}
        {address && <p className="ms__line">{address}</p>}
        {contact && <p className="ms__line">{contact}</p>}
      </div>
    </header>
  );
}

/** One printable marksheet (A4). On screens it reflows to fit phones. */
export function Marksheet({ sheet }: { sheet: MarksheetData }) {
  const site = useSite();
  const docs = site.documents;
  const st = sheet.student;
  const parts = partNames(sheet.subjects);
  const hasMax = sheet.subjects.some((s) => s.maxMarks != null);
  const hasPass = sheet.subjects.some((s) => s.passMarks != null);
  const hasGrades = sheet.subjects.some((s) => s.grade);

  const details: [string, string][] = [
    ['Student’s name', st.name],
    ['Student ID', st.studentId],
    ['Father’s name', st.fatherName],
    ['Mother’s name', st.motherName],
    ['Class', [st.className, st.section && `Section ${st.section}`].filter(Boolean).join(' · ')],
    ['Roll no.', st.rollNo],
    ['Date of birth', formatDate(st.dateOfBirth)],
    ['Admission no.', st.admissionNo],
    ['PEN', st.pen],
    ['Aadhaar no.', st.aadhaar],
  ];

  return (
    <article className="ms" aria-label={`Marksheet: ${sheet.examName}, ${st.name}`}>
      <SchoolLetterhead />
      <div className="ms__title">
        <h2>Marksheet</h2>
        <p>
          {sheet.examName}
          {sheet.session && ` · Session ${sheet.session}`}
        </p>
      </div>

      <dl className="ms__details">
        {details
          .filter(([, v]) => isSet(v))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      <div className="ms__table-wrap">
        <table className="ms__table">
          <caption className="visually-hidden">Marks in {sheet.examName}</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Subject</th>
              {parts.map((p) => (
                <th key={p} scope="col">
                  {p}
                </th>
              ))}
              {hasMax && <th scope="col">Full marks</th>}
              {hasPass && <th scope="col">Pass marks</th>}
              <th scope="col">{parts.length ? 'Total obtained' : 'Marks obtained'}</th>
              {hasGrades && <th scope="col">Grade</th>}
            </tr>
          </thead>
          <tbody>
            {sheet.subjects.map((s, i) => (
              <tr key={s.name} className={s.passed === false ? 'is-fail' : undefined}>
                <td>{i + 1}</td>
                <th scope="row">{s.name}</th>
                {parts.map((name) => {
                  const p = s.parts?.find((x) => x.name === name);
                  if (!p) return <td key={name} className="ms__na">—</td>;
                  return (
                    <td key={name} className={p.passed === false ? 'is-fail' : undefined}>
                      {p.marks || '—'}
                      <span className="ms__of">/{p.maxMarks}</span>
                      {p.passed === false && <span className="visually-hidden"> (below pass marks of {p.passMarks})</span>}
                    </td>
                  );
                })}
                {hasMax && <td>{s.maxMarks ?? '—'}</td>}
                {hasPass && <td>{s.passMarks ?? '—'}</td>}
                <td className="ms__mark">
                  {s.marks || '—'}
                  {s.passed === false && <span className="ms__flag"> (below pass marks)</span>}
                </td>
                {hasGrades && <td className="ms__mark">{s.grade ?? '—'}</td>}
              </tr>
            ))}
          </tbody>
          {sheet.total !== null && (
            <tfoot>
              <tr>
                <td />
                <th scope="row">Total</th>
                {parts.map((p) => (
                  <td key={p} />
                ))}
                {hasMax && <td>{sheet.maxTotal ?? '—'}</td>}
                {hasPass && <td />}
                <td className="ms__mark">{sheet.total}</td>
                {hasGrades && <td className="ms__mark">{sheet.grade ?? '—'}</td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <dl className="ms__summary">
        {sheet.percentage !== null && (
          <div>
            <dt>Percentage</dt>
            <dd>{sheet.percentage}%</dd>
          </div>
        )}
        {sheet.grade && (
          <div>
            <dt>Grade</dt>
            <dd>{sheet.grade}</dd>
          </div>
        )}
        {sheet.result && (
          <div className={sheet.result === 'Pass' ? 'is-pass' : 'is-fail'}>
            <dt>Result</dt>
            <dd>{sheet.result === 'Pass' ? 'Passed' : 'Not passed'}</dd>
          </div>
        )}
      </dl>
      {sheet.remarks && (
        <p className="ms__remarks">
          <strong>Remarks:</strong> {sheet.remarks}
        </p>
      )}

      <div className="ms__signs">
        {isSet(docs?.classTeacherLabel) && <span>{docs.classTeacherLabel}</span>}
        <span>Guardian</span>
        <span>{docs?.headTeacherLabel || 'Head Teacher'}</span>
      </div>
      {isSet(docs?.marksheetNote) && <p className="ms__note">{docs.marksheetNote}</p>}
    </article>
  );
}
