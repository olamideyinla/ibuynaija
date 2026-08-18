import Navbar from '@/components/Navbar';
import ServiceCard from '@/components/service/ServiceCard';
import { pool } from '@/lib/db';
import { getCategories } from '@/lib/queries';
import JsonLd from '@/components/JsonLd';
import { buildServiceItemListJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';
import { NextRequest } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export const metadata: Metadata = {
  title: 'Local Services | iBuyNaija',
  description: 'Book skilled Nigerian service providers — hair, beauty, home, and more.',
};

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const { category = '', q = '' } = await searchParams;

  const [serviceCategories, { rows: serviceRows }] = await Promise.all([
    getCategories('services'),
    pool.query(
      `SELECT
         so.id, so.name, so.description, so.price_type,
         so.price, so.price_from, so.duration_minutes,
         so.location_type, so.photos,
         c.name AS category_name, c.slug AS category_slug,
         s.business_name, s.state, s.city_area, s.verified_status
       FROM service_offerings so
       JOIN sellers    s ON s.id = so.provider_id
       JOIN categories c ON c.id = so.category_id
       WHERE so.status = 'active'
         AND ($1 = '' OR c.slug = $1)
         AND ($2 = '' OR so.search_vector @@ plainto_tsquery('english', $2)
                      OR so.name ILIKE $3)
       ORDER BY s.verified_status DESC, so.date_created DESC
       LIMIT 48`,
      [category, q, q ? `%${q}%` : ''],
    ),
  ]);

  const services = serviceRows.map((r) => ({
    id:               r.id,
    name:             r.name,
    description:      r.description,
    price_type:       r.price_type as 'fixed' | 'quote',
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes,
    location_type:    r.location_type as 'at_provider' | 'provider_travels',
    photos:           r.photos as string[],
    category_name:    r.category_name,
    provider: {
      business_name:   r.business_name,
      state:           r.state,
      city_area:       r.city_area,
      verified_status: r.verified_status as boolean,
    },
  }));

  const listName = category
    ? `Local Services — ${serviceCategories.find((c) => c.slug === category)?.name ?? category}`
    : q
    ? `Services: ${q}`
    : 'Local Services';
  const listUrl = `${APP_URL}/services${category ? `?category=${category}` : q ? `?q=${encodeURIComponent(q)}` : ''}`;

  return (
    <>
      {services.length > 0 && (
        <JsonLd data={buildServiceItemListJsonLd(listName, listUrl, services)} />
      )}
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header — no NaijaSeal, neutral treatment */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 32,
              color: '#1B2A4A',
              margin: '0 0 8px',
            }}
          >
            Local Services
          </h1>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 16,
              color: '#8A7E66',
              margin: 0,
            }}
          >
            Book skilled Nigerian providers — hairdressers, artisans, consultants and more.
          </p>
        </div>

        {/* Search bar */}
        <form
          method="GET"
          action="/services"
          style={{ display: 'flex', gap: 10, marginBottom: 28 }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search services…"
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1px solid rgba(27,42,74,0.2)',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 15,
              color: '#1B2A4A',
              background: '#fff',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '11px 20px',
              background: '#1B2A4A',
              color: '#F7F1E3',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
          {(q || category) && (
            <a
              href="/services"
              style={{
                padding: '11px 16px',
                background: 'rgba(27,42,74,0.06)',
                color: '#8A7E66',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 14,
                borderRadius: 10,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Clear
            </a>
          )}
        </form>

        {/* Category filter chips */}
        {serviceCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            <a
              href="/services"
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${!category ? '#1B2A4A' : 'rgba(27,42,74,0.2)'}`,
                background: !category ? '#1B2A4A' : 'transparent',
                color: !category ? '#F7F1E3' : '#8A7E66',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              All
            </a>
            {serviceCategories.map((cat) => {
              const active = cat.slug === category;
              return (
                <a
                  key={cat.id}
                  href={`/services?category=${cat.slug}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1px solid ${active ? '#1B2A4A' : 'rgba(27,42,74,0.2)'}`,
                    background: active ? '#1B2A4A' : 'transparent',
                    color: active ? '#F7F1E3' : '#8A7E66',
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                </a>
              );
            })}
          </div>
        )}

        {/* Results */}
        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, color: '#8A7E66' }}>
              No services found{q ? ` for "${q}"` : ''}.
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 14,
                color: '#8A7E66',
                marginBottom: 20,
              }}
            >
              {services.length} service{services.length !== 1 ? 's' : ''} available
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 20,
              }}
            >
              {services.map((s) => (
                <ServiceCard key={s.id} {...s} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
