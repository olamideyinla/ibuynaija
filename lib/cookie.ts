/**
 * lib/cookie.ts
 *
 * Cookie name constants and helpers to read buyer/seller identity cookies.
 * These are placeholder cookies for Phase 0 (before Supabase/Termii auth).
 */

import { cookies } from 'next/headers';

export const BUYER_COOKIE  = 'ibuynaija_buyer_id';
export const SELLER_COOKIE = 'ibuynaija_seller_id';

/** Returns the buyer UUID from cookies, or null if absent. */
export async function getBuyerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(BUYER_COOKIE)?.value ?? null;
}

/** Returns the seller UUID from cookies, or null if absent. */
export async function getSellerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SELLER_COOKIE)?.value ?? null;
}
