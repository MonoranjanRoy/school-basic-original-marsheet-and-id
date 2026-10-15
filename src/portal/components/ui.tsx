import { useEffect, useId, useState, type ReactNode } from 'react';
import type { LocalizedText } from '../../config/types';
import { resolveText } from '../../i18n/LanguageContext';
import { useSite } from '../../lib/site';

export function PageTitle({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  const site = useSite();
  useEffect(() => {
    document.title = `${title} | Portal | ${resolveText(site.school.name, 'en')}`;
  }, [title, site]);
  return (
    <div className="ptitle">
      <div>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
      </div>
      {actions && <div className="ptitle__actions">{actions}</div>}
    </div>
  );
}

export const enText = (v: LocalizedText | null | undefined) => resolveText(v ?? '', 'en');
export const bnText = (v: LocalizedText | null | undefined) => (v && typeof v === 'object' ? v.bn ?? '' : '');

/** Stored as a plain string when there is no Bengali version. */
export function toLocalized(en: string, bn: string): LocalizedText {
  return bn.trim() ? { en, bn } : en;
}

interface LocalizedInputProps {
  label: string;
  value: LocalizedText | null | undefined;
  onChange: (v: LocalizedText) => void;
  multiline?: boolean;
  help?: string;
  required?: boolean;
}

/** English + optional Bengali text for one field. */
export function LocalizedInput({ label, value, onChange, multiline, help, required }: LocalizedInputProps) {
  const id = useId();
  const en = enText(value);
  const bn = bnText(value);
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <fieldset className="pfield pfield--loc">
      <legend>
        {label}
        {required && <span className="req"> *</span>}
      </legend>
      {help && <p className="hint">{help}</p>}
      <div className="loc-grid">
        <div>
          <label htmlFor={`${id}-en`} className="loc-label">
            English
          </label>
          <Tag id={`${id}-en`} value={en} rows={multiline ? 4 : undefined} onChange={(e) => onChange(toLocalized(e.target.value, bn))} />
        </div>
        <div>
          <label htmlFor={`${id}-bn`} className="loc-label">
            বাংলা <span className="muted">(optional)</span>
          </label>
          <Tag id={`${id}-bn`} lang="bn" value={bn} rows={multiline ? 4 : undefined} onChange={(e) => onChange(toLocalized(en, e.target.value))} />
        </div>
      </div>
    </fieldset>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  help,
  type = 'text',
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="pfield">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={help ? `${id}-h` : undefined} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={help ? `${id}-h` : undefined} />
      )}
      {help && (
        <p id={`${id}-h`} className="hint">
          {help}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const id = useId();
  return (
    <div className="pfield pfield--check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        {label}
        {help && <span className="hint"> {help}</span>}
      </label>
    </div>
  );
}

export type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string };

export function StatusMessage({ status }: { status: Status }) {
  if (status.kind === 'ok')
    return (
      <p className="palert palert--success" role="status">
        {status.message}
      </p>
    );
  if (status.kind === 'error')
    return (
      <p className="palert palert--error" role="alert">
        {status.message}
      </p>
    );
  return null;
}

/** A delete button that asks for confirmation inline. */
export function ConfirmButton({ label, confirmLabel = 'Yes, delete', onConfirm }: { label: string; confirmLabel?: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="pbtn pbtn--danger-ghost pbtn--sm" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <span className="confirm">
      <button
        type="button"
        className="pbtn pbtn--danger pbtn--sm"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'warning' | 'success' | 'info'; children: ReactNode }) {
  return <span className={`pbadge pbadge--${tone}`}>{children}</span>;
}

export const today = () => new Date().toISOString().slice(0, 10);
