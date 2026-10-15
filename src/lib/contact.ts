import type { SchoolConfig } from '../config/types';
import { isSet } from './content';

/** tel: link, or null when the number is still a placeholder. */
export function telHref(number: string): string | null {
  if (!isSet(number)) return null;
  const cleaned = number.replace(/[^\d+]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

export function whatsappDigits(c: SchoolConfig): string | null {
  const n = c.contact.whatsappNumber;
  if (!isSet(n)) return null;
  const digits = n.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

/** https://wa.me link with an optional pre-filled message. */
export function whatsappHref(c: SchoolConfig, text?: string): string | null {
  const digits = whatsappDigits(c);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function emailAddress(c: SchoolConfig): string | null {
  const e = c.contact.email.trim();
  return isSet(e) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function mailtoHref(c: SchoolConfig, subject?: string, body?: string): string | null {
  const email = emailAddress(c);
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? `?${params.join('&')}` : ''}`;
}

/** Google Maps link: the configured share link, or a search for the address. */
export function mapsHref(c: SchoolConfig, addressLines: string[]): string | null {
  if (isSet(c.contact.googleMapsUrl) && /^https:\/\//.test(c.contact.googleMapsUrl!)) return c.contact.googleMapsUrl!;
  if (addressLines.length === 0 || !addressLines.every(isSet)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLines.join(', '))}`;
}

export function mapsEmbedSrc(c: SchoolConfig): string | null {
  const src = c.contact.googleMapsEmbedUrl;
  return isSet(src) && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(src) ? src : null;
}
