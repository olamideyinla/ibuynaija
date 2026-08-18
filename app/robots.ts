import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/cart',
          '/checkout',
          '/orders/',
          '/bookings/',
          '/messages/',
          '/api/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
