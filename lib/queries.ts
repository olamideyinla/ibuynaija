import pool from './db';
import { rankBandSql } from './ranking';
import { ACTIVE_PROMO_LATERAL } from './promotions';

export interface ListingRow {
  id: string;
  title: string;
  description: string;
  price: number | null;
  photos: string[];
  cover_photo_index: number;
  condition: string;
  status: string;
  made_in_nigeria: boolean;
  date_posted: string;
  category_name: string;
  category_slug: string;
  seller_id: string;
  seller_slug: string;
  business_name: string;
  state: string;
  city_area: string;
  logo_photo_url: string | null;
  verified_status: boolean;
  tagline: string | null;
  rank_band: number;
  engagement_score: number;
  avg_experience: number;
  avg_quality: number;
  rating_count: number;
  badge_trending: boolean;
  badge_top_seller: boolean;
  /** Sum of stock_count across all variants. 0 = sold out. */
  total_stock: number;
  // ── Active promotion (null when none) ──────────────────────────────────────
  promo_id: string | null;
  promo_discount_type: 'percentage' | 'fixed_amount' | null;
  promo_discount_value: number | null;
  promo_end_date: string | null;
}

export interface VariantRow {
  id: string;
  listing_id: string;
  attributes: Record<string, string>;
  price_override: number | null;
  stock_count: number;
  is_available: boolean;
}

export interface ListingDetailRow extends ListingRow {
  seller_description: string | null;
  seller_bank_name: string | null;
  seller_bank_account_name: string | null;
  whatsapp_number: string | null;
  sold_count: number;
  enquiry_count: number;
  // total_stock inherited from ListingRow
}

const RANKED_LISTING_SQL = (extraWhere = '', params: unknown[] = []) => `
WITH eng AS (
  SELECT listing_id, COUNT(*) AS enq_count
  FROM enquiries
  WHERE date_created > NOW() - INTERVAL '30 days'
  GROUP BY listing_id
),
ord AS (
  SELECT
    (item->>'listing_id')::uuid AS listing_id,
    COUNT(*) AS order_count
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.line_items) item
  WHERE o.date_created > NOW() - INTERVAL '30 days'
    AND o.status != 'cancelled'
  GROUP BY 1
),
avg_r AS (
  SELECT listing_id,
    ROUND(AVG(buying_experience_score)::numeric, 1) AS avg_exp,
    ROUND(AVG(product_quality_score)::numeric, 1) AS avg_quality,
    COUNT(*) AS rating_count
  FROM ratings
  GROUP BY listing_id
),
stock AS (
  SELECT listing_id, COALESCE(SUM(stock_count), 0)::int AS total_stock
  FROM listing_variants
  GROUP BY listing_id
)
SELECT
  l.id, l.title, l.description, l.price, l.photos, l.cover_photo_index,
  l.condition, l.status,
  l.made_in_nigeria, l.date_posted::text,
  c.name AS category_name, c.slug AS category_slug,
  s.id AS seller_id, s.slug AS seller_slug, s.business_name,
  s.state, s.city_area, s.logo_photo_url, s.verified_status, s.tagline,
  s.badge_trending, s.badge_top_seller,
  ${rankBandSql('$1', '$2')} AS rank_band,
  COALESCE(eng.enq_count::int, 0) + COALESCE(ord.order_count::int, 0) * 3 AS engagement_score,
  COALESCE(avg_r.avg_exp::float, 0) AS avg_experience,
  COALESCE(avg_r.avg_quality::float, 0) AS avg_quality,
  COALESCE(avg_r.rating_count::int, 0) AS rating_count,
  COALESCE(stock.total_stock, 0) AS total_stock,
  promo.promo_id,
  promo.promo_discount_type,
  promo.promo_discount_value::float AS promo_discount_value,
  promo.promo_end_date::text        AS promo_end_date
FROM listings l
JOIN sellers s ON s.id = l.seller_id
JOIN categories c ON c.id = l.category_id
LEFT JOIN eng   ON eng.listing_id   = l.id
LEFT JOIN ord   ON ord.listing_id   = l.id
LEFT JOIN avg_r ON avg_r.listing_id = l.id
LEFT JOIN stock ON stock.listing_id = l.id
${ACTIVE_PROMO_LATERAL('l')}
${extraWhere}
ORDER BY rank_band ASC, engagement_score DESC, l.date_posted DESC
`;

export async function getTrendingListings(
  buyerCity = '',
  buyerState = '',
  limit = 24,
): Promise<ListingRow[]> {
  const sql = RANKED_LISTING_SQL(`WHERE l.status = 'active'`) + ` LIMIT $3`;
  const { rows } = await pool.query(sql, [buyerCity, buyerState, limit]);
  return rows;
}

export async function getRecentListings(limit = 12): Promise<ListingRow[]> {
  const { rows } = await pool.query(`
    WITH avg_r AS (
      SELECT listing_id,
        ROUND(AVG(buying_experience_score)::numeric, 1) AS avg_exp,
        ROUND(AVG(product_quality_score)::numeric, 1)   AS avg_quality,
        COUNT(*) AS rating_count
      FROM ratings
      GROUP BY listing_id
    ),
    stock AS (
      SELECT listing_id, COALESCE(SUM(stock_count), 0)::int AS total_stock
      FROM listing_variants GROUP BY listing_id
    )
    SELECT
      l.id, l.title, l.description, l.price, l.photos, l.cover_photo_index,
      l.condition, l.status,
      l.made_in_nigeria, l.date_posted::text,
      c.name AS category_name, c.slug AS category_slug,
      s.id AS seller_id, s.slug AS seller_slug, s.business_name,
      s.state, s.city_area, s.logo_photo_url, s.verified_status, s.tagline,
      s.badge_trending, s.badge_top_seller,
      0 AS rank_band,
      0 AS engagement_score,
      COALESCE(avg_r.avg_exp::float, 0)       AS avg_experience,
      COALESCE(avg_r.avg_quality::float, 0)   AS avg_quality,
      COALESCE(avg_r.rating_count::int, 0)    AS rating_count,
      COALESCE(stock.total_stock, 0)          AS total_stock,
      promo.promo_id,
      promo.promo_discount_type,
      promo.promo_discount_value::float AS promo_discount_value,
      promo.promo_end_date::text        AS promo_end_date
    FROM listings l
    JOIN sellers  s ON s.id = l.seller_id
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN avg_r ON avg_r.listing_id = l.id
    LEFT JOIN stock ON stock.listing_id = l.id
    ${ACTIVE_PROMO_LATERAL('l')}
    WHERE l.status = 'active'
    ORDER BY l.date_posted DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

export async function getProducts(
  query: string,
  categorySlug: string,
  buyerCity = '',
  buyerState = '',
  limit = 48,
  offset = 0,
): Promise<ListingRow[]> {
  // $1=buyerCity, $2=buyerState (for ranking), $3=categorySlug, $4=query, $5=%query%, $6=limit, $7=offset
  const sql = RANKED_LISTING_SQL(`
    WHERE l.status = 'active'
      AND ($3 = '' OR c.slug = $3)
      AND (
        $4 = ''
        OR l.search_vector @@ plainto_tsquery('english', $4)
        OR to_tsvector('english', s.business_name) @@ plainto_tsquery('english', $4)
        OR l.title ILIKE $5
      )
  `) + ` LIMIT $6 OFFSET $7`;
  const { rows } = await pool.query(sql, [
    buyerCity, buyerState, categorySlug, query, `%${query}%`, limit, offset,
  ]);
  return rows;
}

export async function getListingsByCategory(
  categorySlug: string,
  buyerCity = '',
  buyerState = '',
  limit = 48,
  offset = 0,
): Promise<ListingRow[]> {
  // Include all statuses — sold listings shown greyed-out per spec
  const sql = RANKED_LISTING_SQL(`WHERE c.slug = $3`) + ` LIMIT $4 OFFSET $5`;
  const { rows } = await pool.query(sql, [buyerCity, buyerState, categorySlug, limit, offset]);
  return rows;
}

export async function getListingsBySeller(
  sellerSlug: string,
  limit = 24,
): Promise<ListingRow[]> {
  const sql = RANKED_LISTING_SQL(`WHERE l.status = 'active' AND s.slug = $3`) + ` LIMIT $4`;
  const { rows } = await pool.query(sql, ['', '', sellerSlug, limit]);
  return rows;
}

export async function getSellerProfile(slug: string) {
  const { rows } = await pool.query(
    `WITH avg_r AS (
       SELECT l.seller_id,
         ROUND(AVG(r.buying_experience_score)::numeric, 1) AS avg_exp,
         ROUND(AVG(r.product_quality_score)::numeric, 1)   AS avg_quality,
         COUNT(*) AS rating_count
       FROM listings l
       JOIN ratings r ON r.listing_id = l.id
       GROUP BY l.seller_id
     ),
     order_cnt AS (
       SELECT seller_id, COUNT(*) AS sold_count
       FROM orders
       WHERE status != 'cancelled'
       GROUP BY seller_id
     )
     SELECT
       s.id, s.slug, s.business_name, s.tagline, s.description,
       s.state, s.city_area, s.verified_status, s.logo_photo_url,
       s.badge_trending, s.badge_top_seller,
       s.date_created,
       COALESCE(oc.sold_count::int, 0)       AS sold_count,
       COALESCE(avg_r.avg_exp::float, 0)     AS avg_experience,
       COALESCE(avg_r.avg_quality::float, 0) AS avg_quality,
       COALESCE(avg_r.rating_count::int, 0)  AS rating_count
     FROM sellers s
     LEFT JOIN avg_r     ON avg_r.seller_id = s.id
     LEFT JOIN order_cnt oc ON oc.seller_id = s.id
     WHERE s.slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function searchListings(
  query: string,
  buyerCity = '',
  buyerState = '',
  limit = 48,
  offset = 0,
): Promise<ListingRow[]> {
  // $1=buyerCity, $2=buyerState used for both ranking AND optional location filter
  const sql = RANKED_LISTING_SQL(`
    WHERE l.status = 'active'
      AND ($2 = '' OR s.state = $2)
      AND ($1 = '' OR s.city_area ILIKE '%' || $1 || '%')
      AND (
        $3 = ''
        OR l.search_vector @@ plainto_tsquery('english', $3)
        OR to_tsvector('english', s.business_name) @@ plainto_tsquery('english', $3)
        OR l.title ILIKE $4
      )
  `) + ` LIMIT $5 OFFSET $6`;
  const { rows } = await pool.query(sql, [
    buyerCity, buyerState, query, `%${query}%`, limit, offset,
  ]);
  return rows;
}

export interface ServiceRow {
  id: string;
  name: string;
  description: string;
  price_type: 'fixed' | 'quote';
  price: number | null;
  price_from: number | null;
  duration_minutes: number | null;
  location_type: 'at_provider' | 'provider_travels';
  photos: string[];
  category_name: string;
  provider: {
    business_name: string;
    state: string;
    city_area: string;
    verified_status: boolean;
  };
}

export async function searchServices(
  query: string,
  buyerCity = '',
  buyerState = '',
  limit = 24,
): Promise<ServiceRow[]> {
  // $1=query, $2=buyerCity, $3=buyerState, $4=limit
  const { rows } = await pool.query(`
    SELECT so.id, so.name, so.description, so.price_type,
           so.price, so.price_from, so.duration_minutes,
           so.location_type, so.photos,
           c.name AS category_name,
           s.business_name, s.state, s.city_area, s.verified_status
    FROM service_offerings so
    JOIN sellers s ON s.id = so.provider_id
    JOIN categories c ON c.id = so.category_id
    WHERE so.status = 'active'
      AND ($1 = '' OR so.name ILIKE '%' || $1 || '%' OR so.description ILIKE '%' || $1 || '%' OR s.business_name ILIKE '%' || $1 || '%')
      AND ($3 = '' OR s.state = $3)
      AND ($2 = '' OR s.city_area ILIKE '%' || $2 || '%')
    ORDER BY s.verified_status DESC, so.date_created DESC
    LIMIT $4
  `, [query, buyerCity, buyerState, limit]);

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    price_type: r.price_type as 'fixed' | 'quote',
    price: r.price != null ? parseFloat(r.price) : null,
    price_from: r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes as number | null,
    location_type: r.location_type as 'at_provider' | 'provider_travels',
    photos: r.photos as string[],
    category_name: r.category_name as string,
    provider: {
      business_name: r.business_name as string,
      state: r.state as string,
      city_area: r.city_area as string,
      verified_status: r.verified_status as boolean,
    },
  }));
}

export async function getListingById(id: string): Promise<ListingDetailRow | null> {
  const { rows } = await pool.query(`
    WITH avg_r AS (
      SELECT listing_id,
        ROUND(AVG(buying_experience_score)::numeric, 1) AS avg_exp,
        ROUND(AVG(product_quality_score)::numeric, 1) AS avg_quality,
        COUNT(*) AS rating_count
      FROM ratings GROUP BY listing_id
    ),
    sold_counts AS (
      SELECT s.id AS seller_id, COUNT(DISTINCT o.id) AS sold_count
      FROM sellers s
      LEFT JOIN orders o ON o.seller_id = s.id AND o.status != 'cancelled'
      GROUP BY s.id
    ),
    enq_counts AS (
      SELECT listing_id, COUNT(*) AS enquiry_count
      FROM enquiries GROUP BY listing_id
    )
    SELECT
      l.id, l.title, l.description, l.price, l.photos, l.cover_photo_index,
      l.condition, l.status,
      l.made_in_nigeria, l.date_posted::text,
      c.name AS category_name, c.slug AS category_slug,
      s.id AS seller_id, s.slug AS seller_slug, s.business_name,
      s.state, s.city_area, s.logo_photo_url, s.verified_status, s.tagline,
      s.badge_trending, s.badge_top_seller,
      s.description AS seller_description,
      s.bank_name AS seller_bank_name,
      s.bank_account_name AS seller_bank_account_name,
      s.whatsapp_number,
      0 AS rank_band, 0 AS engagement_score,
      COALESCE(avg_r.avg_exp::float, 0) AS avg_experience,
      COALESCE(avg_r.avg_quality::float, 0) AS avg_quality,
      COALESCE(avg_r.rating_count::int, 0) AS rating_count,
      COALESCE(sc.sold_count::int, 0) AS sold_count,
      COALESCE(ec.enquiry_count::int, 0) AS enquiry_count,
      COALESCE(st.total_stock, 0) AS total_stock,
      promo.promo_id,
      promo.promo_discount_type,
      promo.promo_discount_value::float AS promo_discount_value,
      promo.promo_end_date::text        AS promo_end_date
    FROM listings l
    JOIN sellers s ON s.id = l.seller_id
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN avg_r ON avg_r.listing_id = l.id
    LEFT JOIN sold_counts sc ON sc.seller_id = s.id
    LEFT JOIN enq_counts ec ON ec.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, COALESCE(SUM(stock_count), 0)::int AS total_stock
      FROM listing_variants GROUP BY listing_id
    ) st ON st.listing_id = l.id
    ${ACTIVE_PROMO_LATERAL('l')}
    WHERE l.id = $1
  `, [id]);
  return rows[0] ?? null;
}

export async function getVariantsByListing(listingId: string): Promise<VariantRow[]> {
  const { rows } = await pool.query(
    `SELECT id, listing_id, attributes, price_override, stock_count, is_available
     FROM listing_variants
     WHERE listing_id = $1
     ORDER BY id`,
    [listingId],
  );
  return rows;
}

export async function getCategories(section = 'marketplace') {
  const { rows } = await pool.query(
    `SELECT id, name, slug, section, sort_order FROM categories WHERE section = $1 ORDER BY sort_order`,
    [section],
  );
  return rows;
}

export async function getRatingsByListing(listingId: string) {
  const { rows } = await pool.query(`
    SELECT
      r.id,
      CONCAT(LEFT(u.email, 1), '***', SUBSTRING(u.email FROM POSITION('@' IN u.email))) AS reviewer_name,
      r.buying_experience_score AS experience_score,
      r.product_quality_score   AS quality_score,
      r.comment                 AS review_text,
      r.date_created::text      AS created_at
    FROM ratings r
    JOIN users u ON u.id = r.buyer_id
    WHERE r.listing_id = $1 AND r.reported = false
    ORDER BY r.date_created DESC
    LIMIT 10
  `, [listingId]);
  return rows;
}
