/**
 * lib/structured-data.ts
 *
 * Server-side JSON-LD builders for every public page type.
 *
 * Rules followed throughout:
 * - All data pulled from existing DB columns — no invented or hardcoded values.
 * - `price` from NUMERIC columns arrives as a string from the pg driver; every
 *   builder calls toPrice() to normalise before writing to the schema.
 * - aggregateRating is only emitted when rating_count > 0.
 * - Sold / expired listings appear as OutOfStock, consistent with the UI rule
 *   that sold items remain visible but greyed-out.
 * - The LocalBusiness verified_status is surfaced as a custom additionalProperty,
 *   NOT as a schema.org Certification — our verification is an internal trust
 *   signal, not an officially recognised credential.
 */

import type { ListingRow, ListingDetailRow } from './queries';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * pg returns NUMERIC columns as strings. Normalise to a JavaScript number
 * before embedding in JSON-LD so crawlers receive a proper Number, not a
 * quoted string. Returns null if the value is absent or non-numeric.
 */
function toPrice(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? null : n;
}

function listingAvailability(status: string): string {
  return status === 'active'
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function avgRating(exp: number, quality: number): string {
  return ((Number(exp) + Number(quality)) / 2).toFixed(1);
}

// ─── WebSite + Organization (homepage) ──────────────────────────────────────

export function buildWebSiteJsonLd(): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'iBuyNaija',
      url: APP_URL,
      description:
        'Made-in-Nigeria marketplace. Every item made in Nigeria. Bought with trust.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'iBuyNaija',
      url: APP_URL,
      description:
        'The exclusively Made-in-Nigeria online marketplace. Shop verified Nigerian makers for authentic products and local services.',
      foundingLocation: {
        '@type': 'Place',
        name: 'Nigeria',
        address: { '@type': 'PostalAddress', addressCountry: 'NG' },
      },
      areaServed: { '@type': 'Place', name: 'Nigeria' },
    },
  ];
}

// ─── Product (listing detail page) ──────────────────────────────────────────

export function buildProductJsonLd(listing: ListingDetailRow): object {
  const price = toPrice(listing.price);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${APP_URL}/listing/${listing.id}`,
    name: listing.title,
    description: listing.description,
    category: listing.category_name,
    brand: { '@type': 'Brand', name: listing.business_name },
    offers: {
      '@type': 'Offer',
      url: `${APP_URL}/listing/${listing.id}`,
      priceCurrency: 'NGN',
      availability: listingAvailability(listing.status),
      seller: { '@type': 'Organization', name: listing.business_name },
      ...(price != null ? { price } : {}),
    },
    additionalProperty: {
      '@type': 'PropertyValue',
      name: 'madeInNigeria',
      value: listing.made_in_nigeria,
    },
  };

  if (listing.photos.length > 0) {
    schema.image = listing.photos;
  }

  if (listing.rating_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating(listing.avg_experience, listing.avg_quality),
      reviewCount: listing.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

// ─── ItemList of Products (category / search results / homepage trending) ───

/**
 * listings must be passed in DISPLAY ORDER — the same array that is handed
 * to ProductGrid — so that the structured data position matches what a human
 * sees. Never sort independently here.
 */
export function buildListingItemListJsonLd(
  name: string,
  url: string,
  listings: ListingRow[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => {
      const price = toPrice(l.price);

      const item: Record<string, unknown> = {
        '@type': 'Product',
        '@id': `${APP_URL}/listing/${l.id}`,
        name: l.title,
        url: `${APP_URL}/listing/${l.id}`,
        description: l.description,
        category: l.category_name,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NGN',
          availability: listingAvailability(l.status),
          ...(price != null ? { price } : {}),
        },
      };

      if (l.photos.length > 0) item.image = l.photos[0];

      if (l.rating_count > 0) {
        item.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: avgRating(l.avg_experience, l.avg_quality),
          reviewCount: l.rating_count,
          bestRating: 5,
          worstRating: 1,
        };
      }

      return { '@type': 'ListItem', position: i + 1, item };
    }),
  };
}

// ─── Service (service detail page) ──────────────────────────────────────────

export interface ServiceDetailInput {
  id: string;
  name: string;
  description: string;
  price_type: string;
  price: number | string | null;
  price_from: number | string | null;
  category_name: string;
  provider_slug: string;
  business_name: string;
  state: string;
  city_area: string;
}

export function buildServiceJsonLd(svc: ServiceDetailInput): object {
  const price     = toPrice(svc.price);
  const priceFrom = toPrice(svc.price_from);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${APP_URL}/services/${svc.id}`,
    name: svc.name,
    description: svc.description,
    serviceType: svc.category_name,
    url: `${APP_URL}/services/${svc.id}`,
    provider: {
      '@type': 'LocalBusiness',
      name: svc.business_name,
      url: `${APP_URL}/shop/${svc.provider_slug}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: svc.city_area,
        addressRegion: svc.state,
        addressCountry: 'NG',
      },
    },
    areaServed: {
      '@type': 'Place',
      name: `${svc.city_area}, ${svc.state}`,
    },
  };

  if (svc.price_type === 'fixed' && price != null) {
    schema.offers = { '@type': 'Offer', price, priceCurrency: 'NGN' };
  } else if (priceFrom != null) {
    schema.offers = { '@type': 'Offer', price: priceFrom, priceCurrency: 'NGN' };
  }

  return schema;
}

// ─── ItemList of Services (services browse page) ─────────────────────────────

export interface ServiceListItem {
  id: string;
  name: string;
  description: string;
  price_type: string;
  price: number | null;
  price_from: number | null;
  category_name: string;
  provider: { business_name: string; state: string; city_area: string };
}

/**
 * services must be passed in the same order they are rendered on screen.
 */
export function buildServiceItemListJsonLd(
  name: string,
  url: string,
  services: ServiceListItem[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    numberOfItems: services.length,
    itemListElement: services.map((s, i) => {
      const price = toPrice(s.price);
      const item: Record<string, unknown> = {
        '@type': 'Service',
        '@id': `${APP_URL}/services/${s.id}`,
        name: s.name,
        url: `${APP_URL}/services/${s.id}`,
        serviceType: s.category_name,
        provider: {
          '@type': 'LocalBusiness',
          name: s.provider.business_name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: s.provider.city_area,
            addressRegion: s.provider.state,
            addressCountry: 'NG',
          },
        },
        areaServed: {
          '@type': 'Place',
          name: `${s.provider.city_area}, ${s.provider.state}`,
        },
      };

      if (s.price_type === 'fixed' && price != null) {
        item.offers = { '@type': 'Offer', price, priceCurrency: 'NGN' };
      }

      return { '@type': 'ListItem', position: i + 1, item };
    }),
  };
}

// ─── LocalBusiness (seller public profile — /shop/[slug]) ───────────────────
//
// Used by app/shop/[slug]/page.tsx when that page is built.
// Exported now so the page can import it without touching this file again.

export interface SellerProfileInput {
  business_name: string;
  slug: string;
  state: string;
  city_area: string;
  verified_status: boolean;
  avg_experience: number;
  avg_quality: number;
  rating_count: number;
}

export function buildLocalBusinessJsonLd(seller: SellerProfileInput): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${APP_URL}/shop/${seller.slug}`,
    name: seller.business_name,
    url: `${APP_URL}/shop/${seller.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: seller.city_area,
      addressRegion: seller.state,
      addressCountry: 'NG',
    },
    // verified_status is an internal iBuyNaija trust signal, NOT an official
    // accreditation — represented as a custom PropertyValue, not schema:hasCredential
    additionalProperty: {
      '@type': 'PropertyValue',
      name: 'ibuynaija_verified',
      value: seller.verified_status,
    },
  };

  if (seller.rating_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating(seller.avg_experience, seller.avg_quality),
      reviewCount: seller.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}
