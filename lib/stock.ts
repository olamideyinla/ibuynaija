/**
 * lib/stock.ts
 *
 * Shared helpers for writing stock events and detecting low-stock thresholds.
 * All functions run inside the caller's pg transaction (PoolClient).
 */

import type { PoolClient } from 'pg';

export type StockChangeType =
  | 'platform_sale'
  | 'manual_adjustment'
  | 'restock'
  | 'offline_sale';

export interface StockEventResult {
  /** Stock level AFTER this change */
  stockAfter: number;
  /** True if this change crossed below the low_stock_threshold (threshold crossing only) */
  lowStockCrossed: boolean;
  /** The configured threshold (null = no alert set) */
  threshold: number | null;
}

/**
 * Writes a stock_events row for the given variant and returns crossing info.
 *
 * Caller is responsible for:
 *  - Having already updated listing_variants.stock_count
 *  - Running inside an open transaction
 *  - Checking the returned lowStockCrossed flag and sending alerts after COMMIT
 */
export async function writeStockEvent(
  client: PoolClient,
  variantId: string,
  changeType: StockChangeType,
  quantityDelta: number,
  reason?: string,
): Promise<StockEventResult> {
  // Insert the event row
  await client.query(
    `INSERT INTO stock_events (variant_id, change_type, quantity_delta, reason)
     VALUES ($1, $2, $3, $4)`,
    [variantId, changeType, quantityDelta, reason ?? null],
  );

  // Fetch current stock + threshold in one query
  const { rows } = await client.query<{
    stock_count: number;
    low_stock_threshold: number | null;
  }>(
    `SELECT stock_count, low_stock_threshold
     FROM listing_variants
     WHERE id = $1`,
    [variantId],
  );

  if (rows.length === 0) {
    return { stockAfter: 0, lowStockCrossed: false, threshold: null };
  }

  const { stock_count: stockAfter, low_stock_threshold: threshold } = rows[0];
  const stockBefore = stockAfter - quantityDelta; // delta is signed

  // "Crossing" means stock was >= threshold before, and is now < threshold.
  // Only fire on the crossing event, not every subsequent sale.
  const lowStockCrossed =
    threshold != null &&
    threshold > 0 &&
    stockBefore >= threshold &&
    stockAfter < threshold;

  return { stockAfter, lowStockCrossed, threshold };
}
