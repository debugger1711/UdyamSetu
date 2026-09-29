/**
 * A renewal date is the certificate valid_until timestamp.
 * No statutory period is added when that timestamp is absent.
 * The 100-day group matches the existing renewals screen and is display only.
 */

export const RENEWAL_DISPLAY_WINDOW_MS = 100 * 24 * 60 * 60 * 1000;

export function renewalDueAt(validUntil: string | null | undefined): string | null {
  if (!validUntil || !validUntil.trim()) return null;
  const date = new Date(validUntil);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function renewalWithinDisplayWindow(validUntil: string | null, now: Date): boolean {
  const due = renewalDueAt(validUntil);
  if (!due) return false;
  return new Date(due).getTime() - now.getTime() <= RENEWAL_DISPLAY_WINDOW_MS;
}
