import { pool } from '@/lib/db';

interface Props {
  sellerId: string;
}

interface StatsRow {
  enquiries_this_month: string;
  enquiries_last_month: string;
  enquiries_all_time: string;
  sales_this_month: string;
  sales_last_month: string;
  sales_all_time: string;
  avg_buying_experience: string | null;
  avg_product_quality: string | null;
  total_ratings: string;
}

export default async function SellerStats({ sellerId }: Props) {
  const { rows } = await pool.query<StatsRow>(
    `WITH listing_ids AS (
       SELECT id FROM listings WHERE seller_id = $1
     ),
     month_start AS (
       SELECT date_trunc('month', CURRENT_TIMESTAMP) AS ts
     ),
     enquiry_stats AS (
       SELECT
         COUNT(*) FILTER (WHERE e.date_created >= (SELECT ts FROM month_start))              AS this_month,
         COUNT(*) FILTER (WHERE e.date_created >= (SELECT ts FROM month_start) - INTERVAL '1 month'
                            AND e.date_created <  (SELECT ts FROM month_start))              AS last_month,
         COUNT(*)                                                                             AS all_time
       FROM enquiries e
       WHERE e.listing_id IN (SELECT id FROM listing_ids)
     ),
     sales_stats AS (
       SELECT
         COUNT(*) FILTER (WHERE o.date_updated >= (SELECT ts FROM month_start))              AS this_month,
         COUNT(*) FILTER (WHERE o.date_updated >= (SELECT ts FROM month_start) - INTERVAL '1 month'
                            AND o.date_updated <  (SELECT ts FROM month_start))              AS last_month,
         COUNT(*)                                                                             AS all_time
       FROM orders o
       WHERE o.seller_id = $1 AND o.status = 'fulfilled'
     ),
     rating_stats AS (
       SELECT
         ROUND(AVG(r.buying_experience_score)::numeric, 1) AS avg_buying_experience,
         ROUND(AVG(r.product_quality_score)::numeric,    1) AS avg_product_quality,
         COUNT(*)                                            AS total_ratings
       FROM ratings r
       WHERE r.listing_id IN (SELECT id FROM listing_ids)
     )
     SELECT
       (SELECT this_month FROM enquiry_stats)           AS enquiries_this_month,
       (SELECT last_month FROM enquiry_stats)           AS enquiries_last_month,
       (SELECT all_time   FROM enquiry_stats)           AS enquiries_all_time,
       (SELECT this_month FROM sales_stats)             AS sales_this_month,
       (SELECT last_month FROM sales_stats)             AS sales_last_month,
       (SELECT all_time   FROM sales_stats)             AS sales_all_time,
       (SELECT avg_buying_experience FROM rating_stats) AS avg_buying_experience,
       (SELECT avg_product_quality   FROM rating_stats) AS avg_product_quality,
       (SELECT total_ratings         FROM rating_stats) AS total_ratings`,
    [sellerId],
  );

  const row = rows[0];
  const eqMonth  = parseInt(row.enquiries_this_month) || 0;
  const eqPrev   = parseInt(row.enquiries_last_month) || 0;
  const eqAll    = parseInt(row.enquiries_all_time)   || 0;
  const salMonth = parseInt(row.sales_this_month)     || 0;
  const salPrev  = parseInt(row.sales_last_month)     || 0;
  const salAll   = parseInt(row.sales_all_time)       || 0;
  const avgBuy   = row.avg_buying_experience  ? parseFloat(row.avg_buying_experience)  : null;
  const avgQual  = row.avg_product_quality    ? parseFloat(row.avg_product_quality)    : null;
  const totalRat = parseInt(row.total_ratings) || 0;

  function momLabel(current: number, prev: number): string {
    if (current > prev) return `up from ${prev} last month`;
    if (current < prev) return `down from ${prev} last month`;
    return `same as last month (${prev})`;
  }

  function momColor(current: number, prev: number): string {
    if (current > prev) return '#2E7D32';
    if (current < prev) return '#B71C1C';
    return '#8A7E66';
  }

  const label: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif",
    fontSize: 11,
    color: '#8A7E66',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 10,
  };
  const bigNum: React.CSSProperties = {
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700,
    fontSize: 30,
    color: '#1B2A4A',
    lineHeight: 1,
    marginBottom: 4,
  };
  const subText: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif",
    fontSize: 13,
    color: '#8A7E66',
    marginBottom: 8,
  };
  const allTime: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif",
    fontSize: 12,
    color: '#8A7E66',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(27,42,74,0.06)',
  };
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid rgba(27,42,74,0.08)',
    borderRadius: 12,
    padding: '20px 22px',
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', margin: '0 0 14px' }}>
        Performance
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Enquiries */}
        <div style={card}>
          <div style={label}>Enquiries</div>
          <div style={bigNum}>{eqMonth}</div>
          <div style={subText}>this month</div>
          {eqPrev > 0 && (
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: momColor(eqMonth, eqPrev) }}>
              {momLabel(eqMonth, eqPrev)}
            </div>
          )}
          <div style={allTime}>{eqAll} all-time</div>
        </div>

        {/* Sales */}
        <div style={card}>
          <div style={label}>Sales</div>
          <div style={bigNum}>{salMonth}</div>
          <div style={subText}>fulfilled this month</div>
          {salPrev > 0 && (
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: momColor(salMonth, salPrev) }}>
              {momLabel(salMonth, salPrev)}
            </div>
          )}
          <div style={allTime}>{salAll} all-time</div>
        </div>
      </div>

      {/* Ratings */}
      <div style={card}>
        <div style={label}>Ratings</div>
        {totalRat === 0 ? (
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
            No ratings yet.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={bigNum}>{avgBuy?.toFixed(1) ?? '—'}<span style={{ fontSize: 14, fontWeight: 400, color: '#8A7E66' }}> / 5</span></div>
              <div style={{ ...subText, marginBottom: 0 }}>buying experience</div>
            </div>
            <div>
              <div style={bigNum}>{avgQual?.toFixed(1) ?? '—'}<span style={{ fontSize: 14, fontWeight: 400, color: '#8A7E66' }}> / 5</span></div>
              <div style={{ ...subText, marginBottom: 0 }}>product quality</div>
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginLeft: 'auto', alignSelf: 'center' }}>
              {totalRat} review{totalRat !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
