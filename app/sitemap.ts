import type { MetadataRoute } from 'next';
import pool from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

const CATEGORY_SLUGS = [
  'fashion-textiles', 'beauty-personal-care', 'hair-wigs-weaves',
  'furniture-interior-decor', 'food-spices-pantry', 'arts-crafts-home-decor',
  'jewelry-accessories', 'agro-products', 'creative-media',
  'cultural-heritage-souvenirs', 'health-wellness-herbs',
  'bags-leather-goods', 'kids-baby',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL,               lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${APP_URL}/services`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${APP_URL}/search`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${APP_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Active listings
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await pool.query(
      `SELECT id, date_updated, date_posted
       FROM listings
       WHERE status = 'active'
       ORDER BY date_posted DESC
       LIMIT 50000`,
    );
    listingPages = rows.map(r => ({
      url: `${APP_URL}/listing/${r.id}`,
      lastModified: new Date(r.date_updated ?? r.date_posted),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic listings
  }

  // Public seller profiles
  let sellerPages: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await pool.query(
      `SELECT slug, date_created FROM sellers ORDER BY date_created DESC LIMIT 10000`,
    );
    sellerPages = rows.map(r => ({
      url: `${APP_URL}/shop/${r.slug}`,
      lastModified: new Date(r.date_created),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable at build time — skip
  }

  return [...staticPages, ...categoryPages, ...listingPages, ...sellerPages];
}
