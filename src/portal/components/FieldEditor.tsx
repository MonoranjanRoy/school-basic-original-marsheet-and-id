import { useId } from 'react';
import type { ImageRef, LocalizedText } from '../../config/types';
import { emptyValue, getPath, setPath, type Field } from '../contentSchema';
import { ImagePicker } from './ImagePicker';
import { Checkbox, enText, LocalizedInput, TextInput } from './ui';

interface Props {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}

/** Renders one field from contentSchema.ts. */
export function FieldEditor({ field, value, onChange }: Props) {
  const id = useId();
  switch (field.type) {
    case 'text':
      return <TextInput label={field.label} help={field.help} multiline={field.multiline} value={(value as string) ?? ''} onChange={onChange} />;

    case 'ltext':
      return <LocalizedInput label={field.label} help={field.help} multiline={field.multiline} value={value as LocalizedText} onChange={onChange} />;

    case 'bool':
      return <Checkbox label={field.label} help={field.help} checked={!!value} onChange={onChange} />;

    case 'date':
      return <TextInput label={field.label} help={field.help} type="date" value={(value as string) ?? ''} onChange={onChange} />;

    case 'color':
      return (
        <div className="pfield pfield--color">
          <label htmlFor={id}>{field.label}</label>
          <div className="color-row">
            <input id={id} type="color" value={(value as string) || '#000000'} onChange={(e) => onChange(e.target.value)} />
            <code>{value as string}</code>
          </div>
          {field.help && <p className="hint">{field.help}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="pfield">
          <label htmlFor={id}>{field.label}</label>
          <select id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.help && <p className="hint">{field.help}</p>}
        </div>
      );

    case 'image': {
      const img = value as ImageRef | undefined;
      return (
        <div className="image-field">
          <ImagePicker
            label={field.label}
            help={field.help}
            src={img?.src}
            onPick={(up) => onChange({ src: up.src, alt: img?.alt ?? '', width: up.width, height: up.height })}
            onRemove={field.optional ? () => onChange(undefined) : undefined}
          />
          {img?.src && (
            <LocalizedInput
              label={`${field.label}: description for screen readers`}
              value={img.alt}
              onChange={(alt) => onChange({ ...img, alt })}
              help="Say what the image shows."
            />
          )}
        </div>
      );
    }

    case 'group': {
      if (field.optional && value === undefined) {
        return (
          <div className="pfield">
            <span className="pfield__label">{field.label}</span>
            <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => onChange(emptyValue(field))}>
              Add {field.label.toLowerCase()}
            </button>
          </div>
        );
      }
      return (
        <fieldset className="pgroup">
          <legend>{field.label}</legend>
          {field.help && <p className="hint">{field.help}</p>}
          {field.fields.map((sub) => (
            <FieldEditor key={sub.key} field={sub} value={getPath(value, sub.key)} onChange={(v) => onChange(setPath(value ?? {}, sub.key, v))} />
          ))}
          {field.optional && (
            <button type="button" className="pbtn pbtn--danger-ghost pbtn--sm" onClick={() => onChange(undefined)}>
              Remove {field.label.toLowerCase()}
            </button>
          )}
        </fieldset>
      );
    }

    case 'list': {
      const items = Array.isArray(value) ? value : [];
      const update = (next: unknown[]) => onChange(next);
      return (
        <fieldset className="plist-field">
          <legend>{field.label}</legend>
          {field.help && <p className="hint">{field.help}</p>}
          {items.length === 0 && <p className="muted small">None yet.</p>}
          <ol>
            {items.map((item, i) => (
              <li key={i} className="plist-item">
                <div className="plist-item__head">
                  <span className="plist-item__title">
                    {field.itemLabel} {i + 1}
                    {field.item.type !== 'group' && enText(item as LocalizedText) ? `: ${enText(item as LocalizedText).slice(0, 40)}` : ''}
                  </span>
                  <span className="plist-item__actions">
                    <button
                      type="button"
                      className="pbtn pbtn--ghost pbtn--xs"
                      disabled={i === 0}
                      aria-label={`Move ${field.itemLabel} ${i + 1} up`}
                      onClick={() => update(items.map((x, j) => (j === i - 1 ? items[i] : j === i ? items[i - 1] : x)))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="pbtn pbtn--ghost pbtn--xs"
                      disabled={i === items.length - 1}
                      aria-label={`Move ${field.itemLabel} ${i + 1} down`}
                      onClick={() => update(items.map((x, j) => (j === i + 1 ? items[i] : j === i ? items[i + 1] : x)))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="pbtn pbtn--danger-ghost pbtn--xs"
                      aria-label={`Remove ${field.itemLabel} ${i + 1}`}
                      onClick={() => update(items.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </span>
                </div>
                <FieldEditor
                  field={{ ...field.item, label: `${field.itemLabel} ${i + 1}` }}
                  value={item}
                  onChange={(v) => update(items.map((x, j) => (j === i ? v : x)))}
                />
              </li>
            ))}
          </ol>
          <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => update([...items, emptyValue(field.item)])}>
            + Add {field.itemLabel.toLowerCase()}
          </button>
        </fieldset>
      );
    }

    case 'keyvalue': {
      const entries = Object.entries((value as Record<string, string>) ?? {});
      const update = (next: [string, string][]) => onChange(Object.fromEntries(next));
      return (
        <fieldset className="plist-field">
          <legend>{field.label}</legend>
          {field.help && <p className="hint">{field.help}</p>}
          {entries.map(([k, v], i) => (
            <div key={i} className="kv-row">
              <input aria-label="Field name" value={k} onChange={(e) => update(entries.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
              <input aria-label="Value" value={v} onChange={(e) => update(entries.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
              <button type="button" className="pbtn pbtn--danger-ghost pbtn--xs" onClick={() => update(entries.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="pbtn pbtn--secondary pbtn--sm" onClick={() => update([...entries, ['', '']])}>
            + Add field
          </button>
        </fieldset>
      );
    }
  }
}
