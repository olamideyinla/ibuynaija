/**
 * POST /api/referrals
 *
 * Creates a pending referral record.  Called during user/seller registration
 * when the sign-up request carries a referral cookie.
 *
 * Source A: referrer = seller, referred = new buyer
 *   { referrerType: 'seller', referrerId: sellerId,
 *     referredType: 'buyer',  referredId: newUserId, source: 'A' }
 *
 * Source B: referrer = buyer (user), referred = new seller
 *   { referrerType: 'buyer', referrerId: buyerUserId,
 *     referredType: 'seller', referredId: newSellerId, source: 'B' }
 *
 * Also stamps the relevant referred_by_* column on the user or seller row so
 * the relationship is visible without joining the referrals table.
 *
 * Idempotent: a UNIQUE index on (referrer, referred, source) WHERE pending
 * prevents duplicate pending rows — returns 200 with the existing referral id
 * if one already exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface Body {
  referrerType: 'buyer' | 'seller';
  referrerId:   string;
  referredType: 'buyer' | 'seller';
  referredId:   string;
  source:       'A' | 'B';
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { referrerType, referrerId, referredType, referredId, source } = body;
  if (!referrerType || !referrerId || !referredType || !referredId || !source) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['buyer', 'seller'].includes(referrerType) || !['buyer', 'seller'].includes(referredType)) {
    return NextResponse.json({ error: 'Invalid referrer/referred type' }, { status: 400 });
  }
  if (!['A', 'B'].includes(source)) {
    return NextResponse.json({ error: 'source must be A or B' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert: return existing pending referral if unique constraint fires
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO referrals
         (referrer_id, referrer_type, referred_id, referred_type, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT referrals_unique_pending_idx DO NOTHING
       RETURNING id`,
      [referrerId, referrerType, referredId, referredType, source],
    );

    let referralId: string;
    if (rows.length > 0) {
      referralId = rows[0].id;
    } else {
      // Row already existed — fetch it
      const { rows: existing } = await client.query<{ id: string }>(
        `SELECT id FROM referrals
         WHERE referrer_id = $1 AND referrer_type = $2
           AND referred_id = $3 AND referred_type = $4
           AND source = $5 AND status = 'pending'`,
        [referrerId, referrerType, referredId, referredType, source],
      );
      referralId = existing[0]?.id;
    }

    // Stamp the referred_by column on the entity being referred
    if (source === 'A' && referredType === 'buyer') {
      // New buyer referred by a seller's share link
      await client.query(
        `UPDATE users
         SET referred_by_seller_id = $1, referral_source = 'A'
         WHERE id = $2 AND referred_by_seller_id IS NULL`,
        [referrerId, referredId],
      );
    } else if (source === 'B' && referredType === 'seller') {
      // New seller referred by a buyer's generic link
      await client.query(
        `UPDATE sellers
         SET referred_by_user_id = $1, referral_source = 'B'
         WHERE id = $2 AND referred_by_user_id IS NULL`,
        [referrerId, referredId],
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ referralId }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[referrals] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  } finally {
    client.release();
  }
}
