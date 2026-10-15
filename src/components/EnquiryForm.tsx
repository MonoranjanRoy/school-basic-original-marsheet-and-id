import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { SchoolConfig } from '../config/types';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { isSet } from '../lib/content';
import { mailtoHref, whatsappHref } from '../lib/contact';
import { PAGE_PATHS } from '../lib/seo';
import { ContactDetails } from './ContactDetails';
import { Icon } from './Icon';

/**
 * Admission enquiry form.
 *
 * Delivery, in order of preference:
 *  1. `enquiryForm.endpoint` in school.config.ts (a form service such as
 *     Formspree / Web3Forms, or an existing school endpoint).
 *  2. No endpoint → the visitor's email or WhatsApp app opens with the
 *     enquiry pre-filled; the page clearly says it has NOT been sent yet.
 *  3. No email or WhatsApp either → contact details are shown instead.
 *
 * Success is only shown after the endpoint confirms receipt. No data is
 * stored by this website.
 */

type FieldName = 'parentName' | 'studentName' | 'classOfInterest' | 'phone' | 'email' | 'message';
type Values = Record<FieldName, string> & { consent: boolean };
type Errors = Partial<Record<FieldName | 'consent', string>>;
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; offline?: boolean }
  | { kind: 'handedOff'; app: string };

const EMPTY: Values = {
  parentName: '',
  studentName: '',
  classOfInterest: '',
  phone: '',
  email: '',
  message: '',
  consent: false,
};

const MAX_MESSAGE = 1000;
const TIMEOUT_MS = 20000;

/** Convert Bengali digits (০-৯) to ASCII and strip spacing characters. */
function normalisePhone(raw: string): string {
  return raw
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[\s\-().]/g, '');
}

function endpointUrl(config: SchoolConfig): string | null {
  const ep = config.enquiryForm.endpoint.trim();
  return isSet(ep) && /^https:\/\//.test(ep) ? ep : null;
}

export function EnquiryForm() {
  const config = useSite();
  const { s, t, lang } = useLanguage();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<'email' | 'whatsapp'>('email');
  const honeypotRef = useRef<HTMLInputElement>(null);

  const endpoint = endpointUrl(config);
  const canEmail = mailtoHref(config) !== null;
  const canWhatsApp = whatsappHref(config) !== null;
  const mode: 'service' | 'fallback' | 'none' = endpoint ? 'service' : canEmail || canWhatsApp ? 'fallback' : 'none';

  if (mode === 'none') {
    return (
      <div className="form-card">
        <p className="callout callout--info">{s.form.fallbackNone}</p>
        <ContactDetails />
      </div>
    );
  }

  const classLabel = (value: string) => {
    const match = config.admissions.classes.find((c) => c.value === value);
    return match ? t(match.label) : value;
  };

  function validate(v: Values): Errors {
    const e: Errors = {};
    if (!v.parentName.trim()) e.parentName = s.form.errors.parentName;
    if (!v.studentName.trim()) e.studentName = s.form.errors.studentName;
    if (!v.classOfInterest) e.classOfInterest = s.form.errors.classOfInterest;
    if (!/^\+?\d{7,15}$/.test(normalisePhone(v.phone))) e.phone = s.form.errors.phone;
    if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = s.form.errors.email;
    if (v.message.length > MAX_MESSAGE) e.message = s.form.errors.message;
    if (!v.consent) e.consent = s.form.errors.consent;
    return e;
  }

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const next = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setValues((prev) => ({ ...prev, [name]: next }));
    if (errors[name as keyof Errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  /** Plain-text version of the enquiry for email / WhatsApp. */
  function enquiryText(v: Values): string {
    const lines = [
      `${s.cta.enquire}`,
      '',
      `${s.form.parentName}: ${v.parentName.trim()}`,
      `${s.form.studentName}: ${v.studentName.trim()}`,
      `${s.form.classOfInterest}: ${classLabel(v.classOfInterest)}`,
      `${s.form.phone}: ${v.phone.trim()}`,
    ];
    if (v.email.trim()) lines.push(`${s.form.email}: ${v.email.trim()}`);
    if (v.message.trim()) lines.push('', `${s.form.message}:`, v.message.trim());
    return lines.join('\n');
  }

  function focusStatus() {
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  async function submitToService(v: Values) {
    if (!navigator.onLine) {
      setStatus({ kind: 'error', offline: true });
      focusStatus();
      return;
    }
    setStatus({ kind: 'submitting' });
    const data = new FormData();
    for (const [k, val] of Object.entries(config.enquiryForm.extraFields)) data.append(k, val);
    data.append('subject', config.enquiryForm.emailSubject);
    data.append('parent_name', v.parentName.trim());
    data.append('student_name', v.studentName.trim());
    data.append('class_of_interest', classLabel(v.classOfInterest));
    data.append('phone', v.phone.trim());
    if (v.email.trim()) data.append('email', v.email.trim());
    data.append('message', v.message.trim());
    data.append('language', lang);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint!, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Some services reply 200 with { success: false } — treat that as a failure.
      const body: unknown = await res.json().catch(() => null);
      if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (b.success === false || b.ok === false || b.error || b.errors) throw new Error('Rejected by form service');
      }
      setStatus({ kind: 'success' });
      setValues(EMPTY);
    } catch {
      setStatus({ kind: 'error' });
    } finally {
      window.clearTimeout(timer);
      focusStatus();
    }
  }

  function handOff(v: Values) {
    const text = enquiryText(v);
    const useWhatsApp = canWhatsApp && (channelRef.current === 'whatsapp' || !canEmail);
    if (useWhatsApp) {
      const href = whatsappHref(config, text);
      if (!href) return;
      window.open(href, '_blank', 'noopener,noreferrer');
      setStatus({ kind: 'handedOff', app: 'WhatsApp' });
    } else {
      const href = mailtoHref(config, config.enquiryForm.emailSubject, text);
      if (!href) return;
      window.location.href = href;
      setStatus({ kind: 'handedOff', app: lang === 'bn' ? 'ইমেল' : 'email' });
    }
    focusStatus();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === 'submitting') return;

    // Spam trap: real visitors never see or fill this field. Nothing is sent.
    if (honeypotRef.current?.value) {
      setStatus({ kind: 'error' });
      return;
    }

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: 'idle' });
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (mode === 'service') void submitToService(values);
    else handOff(values);
  }

  if (status.kind === 'success') {
    return (
      <div className="form-card">
        <div ref={statusRef} tabIndex={-1} className="callout callout--success" role="status">
          <Icon name="check" />
          <p>{s.form.success}</p>
        </div>
        <button type="button" className="btn btn--outline" onClick={() => setStatus({ kind: 'idle' })}>
          {s.form.sendAnother}
        </button>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, msg]) => msg) as [FieldName | 'consent', string][];
  const describedBy = (name: FieldName | 'consent', hint?: string) =>
    [hint, errors[name] ? id(`${name}-error`) : null].filter(Boolean).join(' ') || undefined;

  const fieldError = (name: FieldName | 'consent') =>
    errors[name] ? (
      <p id={id(`${name}-error`)} className="field__error">
        {errors[name]}
      </p>
    ) : null;

  const required = (
    <span className="field__req">
      <span aria-hidden="true"> *</span>
      <span className="visually-hidden"> ({s.form.required})</span>
    </span>
  );
  const optional = <span className="field__opt"> ({s.form.optional})</span>;

  return (
    <div className="form-card">
      {mode === 'fallback' && <p className="callout callout--info">{s.form.fallbackIntro}</p>}

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="callout callout--error" role="alert">
          <p>
            <strong>{s.form.errorsHeading}</strong>
          </p>
          <ul>
            {errorList.map(([name, msg]) => (
              <li key={name}>
                <a href={`#${id(name)}`}>{msg}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.kind === 'error' && (
        <div ref={statusRef} tabIndex={-1} className="callout callout--error" role="alert">
          <Icon name="alert" />
          <div>
            <p>{status.offline ? s.form.offline : s.form.failure}</p>
            {!status.offline && <ContactDetails showHours={false} compact />}
          </div>
        </div>
      )}

      {status.kind === 'handedOff' && (
        <div ref={statusRef} tabIndex={-1} className="callout callout--warning" role="status">
          <Icon name="alert" />
          <p>{s.form.fallbackOpened.replace('{app}', status.app)}</p>
        </div>
      )}

      <form className="form" noValidate onSubmit={onSubmit} aria-busy={status.kind === 'submitting'}>
        <div className="form__grid">
          <div className="field">
            <label htmlFor={id('parentName')}>
              {s.form.parentName}
              {required}
            </label>
            <input
              id={id('parentName')}
              name="parentName"
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              value={values.parentName}
              onChange={onChange}
              aria-invalid={!!errors.parentName}
              aria-describedby={describedBy('parentName')}
            />
            {fieldError('parentName')}
          </div>

          <div className="field">
            <label htmlFor={id('studentName')}>
              {s.form.studentName}
              {required}
            </label>
            <input
              id={id('studentName')}
              name="studentName"
              type="text"
              autoComplete="off"
              maxLength={100}
              required
              value={values.studentName}
              onChange={onChange}
              aria-invalid={!!errors.studentName}
              aria-describedby={describedBy('studentName')}
            />
            {fieldError('studentName')}
          </div>

          <div className="field">
            <label htmlFor={id('classOfInterest')}>
              {s.form.classOfInterest}
              {required}
            </label>
            <select
              id={id('classOfInterest')}
              name="classOfInterest"
              required
              value={values.classOfInterest}
              onChange={onChange}
              aria-invalid={!!errors.classOfInterest}
              aria-describedby={describedBy('classOfInterest')}
            >
              <option value="">{s.form.selectClass}</option>
              {config.admissions.classes.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(c.label)}
                </option>
              ))}
            </select>
            {fieldError('classOfInterest')}
          </div>

          <div className="field">
            <label htmlFor={id('phone')}>
              {s.form.phone}
              {required}
            </label>
            <input
              id={id('phone')}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              required
              value={values.phone}
              onChange={onChange}
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy('phone', id('phone-hint'))}
            />
            <p id={id('phone-hint')} className="field__hint">
              {s.form.phoneHint}
            </p>
            {fieldError('phone')}
          </div>

          <div className="field field--full">
            <label htmlFor={id('email')}>
              {s.form.email}
              {optional}
            </label>
            <input
              id={id('email')}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={150}
              value={values.email}
              onChange={onChange}
              aria-invalid={!!errors.email}
              aria-describedby={describedBy('email')}
            />
            {fieldError('email')}
          </div>

          <div className="field field--full">
            <label htmlFor={id('message')}>
              {s.form.message}
              {optional}
            </label>
            <textarea
              id={id('message')}
              name="message"
              rows={5}
              maxLength={MAX_MESSAGE}
              value={values.message}
              onChange={onChange}
              aria-invalid={!!errors.message}
              aria-describedby={describedBy('message', id('message-count'))}
            />
            <p id={id('message-count')} className="field__hint field__hint--end">
              {values.message.length} / {MAX_MESSAGE}
            </p>
            {fieldError('message')}
          </div>

          {/* Spam trap — hidden from people and assistive technology. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor={id('website')}>Leave this field empty</label>
            <input ref={honeypotRef} id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="field field--full field--check">
            <input
              id={id('consent')}
              name="consent"
              type="checkbox"
              checked={values.consent}
              onChange={onChange}
              aria-invalid={!!errors.consent}
              aria-describedby={describedBy('consent')}
            />
            <label htmlFor={id('consent')}>
              {s.form.consent} <Link to={PAGE_PATHS.privacy}>{s.nav.privacy}</Link>.{required}
            </label>
            {fieldError('consent')}
          </div>
        </div>

        <div className="form__actions">
          {mode === 'service' && (
            <button type="submit" className="btn btn--primary btn--lg" disabled={status.kind === 'submitting'}>
              {status.kind === 'submitting' ? s.form.submitting : s.form.submit}
            </button>
          )}
          {mode === 'fallback' && canEmail && (
            <button
              type="submit"
              className="btn btn--primary btn--lg"
              onClick={() => {
                channelRef.current = 'email';
              }}
            >
              <Icon name="mail" />
              {s.form.fallbackEmail}
            </button>
          )}
          {mode === 'fallback' && canWhatsApp && (
            <button
              type="submit"
              className="btn btn--whatsapp btn--lg"
              onClick={() => {
                channelRef.current = 'whatsapp';
              }}
            >
              <Icon name="whatsapp" />
              {s.form.fallbackWhatsApp}
            </button>
          )}
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {status.kind === 'submitting' ? s.form.submitting : ''}
        </p>
      </form>
    </div>
  );
}
