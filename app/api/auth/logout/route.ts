import { NextResponse } from 'next/server';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BUYER_COOKIE, '', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0,
  });
  response.cookies.set(SELLER_COOKIE, '', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0,
  });
  return response;
}
