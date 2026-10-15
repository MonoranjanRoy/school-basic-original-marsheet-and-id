/**
 * Helpers for working with values from school.config.ts.
 * A value written inside [square brackets] is treated as an unfilled placeholder.
 */
const PLACEHOLDER = /\[[^\]]+\]/;

export function isPlaceholder(value: string | undefined | null): boolean {
  return typeof value === 'string' && PLACEHOLDER.test(value);
}

/** True when a value has been filled in with real information. */
export function isSet(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim() !== '' && !isPlaceholder(value);
}

/** Lists every placeholder left in the config, e.g. "contact.email". */
export function findPlaceholders(node: unknown, path = ''): string[] {
  if (typeof node === 'string') return isPlaceholder(node) ? [path] : [];
  if (Array.isArray(node)) return node.flatMap((v, i) => findPlaceholders(v, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => findPlaceholders(v, path ? `${path}.${k}` : k));
  }
  return [];
}

/** Prefix root-relative asset paths with the deployment base path. */
export function asset(src: string): string {
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + src;
}

/** Initials for avatar fallbacks. */
export function initials(name: string): string {
  const clean = name.replace(/[[\]]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}
