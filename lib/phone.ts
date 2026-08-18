/**
 * lib/phone.ts
 *
 * Nigerian phone number normalisation and validation.
 * Only +234 numbers are accepted per spec (Section 6).
 */

/**
 * Normalise a Nigerian phone number to E.164 format (+234XXXXXXXXXX).
 * Accepts:
 *   - 080XXXXXXXX  → +23480XXXXXXXX
 *   - 090XXXXXXXX  → +23490XXXXXXXX
 *   - 234XXXXXXXXX → +234XXXXXXXXX
 *   - +234XXXXXXXX → +234XXXXXXXX (returned as-is if valid)
 *
 * Returns null for non-Nigerian or invalid numbers.
 */
export function normaliseNigerianPhone(raw: string): string | null {
  const cleaned = raw.replace(/\D/g, '');

  // Already E.164 without the +
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return '+' + cleaned;
  }

  // Local format: 0XXXXXXXXXX (11 digits)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+234' + cleaned.slice(1);
  }

  return null;
}

/**
 * Returns true if the phone is a valid Nigerian E.164 number.
 */
export function isValidNigerianPhone(phone: string): boolean {
  return normaliseNigerianPhone(phone) !== null;
}

/**
 * Format a +234 number for display: +234 80 1234 5678
 */
export function formatNigerianPhone(e164: string): string {
  if (!e164.startsWith('+234') || e164.length !== 14) return e164;
  const local = e164.slice(4); // 10 digits
  return `+234 ${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7)}`;
}
