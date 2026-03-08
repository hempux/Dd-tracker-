import { ExpiryStatus } from '../types';

export const DAYS_WARNING = 7;
export const DAYS_CRITICAL = 3;

/**
 * Returns the number of days until the given date.
 * Negative means already expired.
 */
export function daysUntil(dateString: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns expiry status based on days until expiry.
 */
export function getExpiryStatus(bestBeforeDate: string | null): ExpiryStatus {
  if (!bestBeforeDate) return 'unknown';
  const days = daysUntil(bestBeforeDate);
  if (days < 0) return 'expired';
  if (days <= DAYS_CRITICAL) return 'critical';
  if (days <= DAYS_WARNING) return 'warning';
  return 'ok';
}

/**
 * Returns a human-readable label for the expiry status.
 */
export function getExpiryLabel(bestBeforeDate: string | null): string {
  if (!bestBeforeDate) return 'Inget datum satt';
  const days = daysUntil(bestBeforeDate);
  if (days < 0) return `Utgångna för ${Math.abs(days)} dag${Math.abs(days) === 1 ? '' : 'ar'} sedan`;
  if (days === 0) return 'Utgår idag';
  if (days === 1) return 'Utgår imorgon';
  return `${days} dagar kvar`;
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format an ISO date string to a Swedish display format.
 */
export function formatDateSwedish(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
