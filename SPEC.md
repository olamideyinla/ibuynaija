# ibuynaija.com — Complete Implementation Specification
**Version 2.0** | Compiled June 2026
*This document supersedes the v1.2 product spec and incorporates all technical decisions
made during the implementation interview. It is the single source of truth for building
the platform.*

---

## Table of Contents
1. [Product Summary](#1-product-summary)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Authentication](#6-authentication)
7. [Data Model Decisions](#7-data-model-decisions)
8. [Core User Flows](#8-core-user-flows)
9. [Search & Ranking](#9-search--ranking)
10. [API Route Inventory](#10-api-route-inventory)
11. [Page Inventory](#11-page-inventory)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Notifications](#13-notifications)
14. [Image Handling](#14-image-handling)
15. [SEO & Social Sharing](#15-seo--social-sharing)
16. [Trust & Safety](#16-trust--safety)
17. [Non-Negotiable Rules](#17-non-negotiable-rules)
18. [Build Plan — Phased Task Order](#18-build-plan--phased-task-order)

---

## 1. Product Summary

ibuynaija.com is a seller-submitted commerce platform with two connected sections:

1. **The Marketplace** — exclusively for products made in Nigeria. Every listing must be
   self-declared as Nigerian-made. Cart is unified across sellers; checkout splits into
   one Order per seller. Payment is direct bank transfer — the platform never holds funds.

2. **Local Services** — booking-based system for hairdressers, barbers, tailors,
   carpenters, plumbers, electricians, cleaners, and event providers. Bookings require
   provider approval; they are never auto-confirmed.

**Hard constraints (enforced in code, not just policy):**
- `made_in_nigeria = true` is required before any listing can be published. No API path
  bypasses this.
- No Electronics, Phones & Tablets, or Vehicles categories — ever.
- Cart → checkout always creates one `Order` per seller represented in the cart.
- "Confirm payment" creates a notification to the seller; it is not proof of payment.
- Booking confirmation is always manual; no auto-confirm path exists.
- Ratings require a prior `Enquiry` or `Order` on that specific listing.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend + API | **Next.js 14 (App Router) + TypeScript** | SSR for SEO, API Routes for backend, single deployment |
| Database | **Supabase (PostgreSQL)** | Managed Postgres, built-in Row Level Security, auth helpers |
| Auth | **Supabase Auth** (custom OTP flow via Termii) | Phone OTP for sellers/buyers; email+password for admin |
| OTP SMS | **Termii** | Nigerian-founded, best delivery on MTN/Airtel/Glo/9mobile |
| Image storage | **Cloudinary** | Auto-resize/compress, CDN delivery, generous free tier |
| Hosting | **Vercel** | Native Next.js, preview deployments, edge functions |
| Styling | **Tailwind CSS** | Utility-first, fast iteration |
| Email (admin) | **Resend** (optional) | Admin password reset / transactional email |

**Not used:**
- Jumia affiliate feed (removed in v1.1)
- In-app chat / messaging system
- Any payment gateway (bank transfer only, platform never touches funds)
- Algolia / Typesense (Postgres full-text is sufficient for MVP)

---

## 3. Project Structure

```
ibuynaija/
├── app/
│   ├── (public)/                    # Logged-out routes
│   │   ├── page.tsx                 # Homepage
│   │   ├── [category]/page.tsx      # Category browse
│   │   ├── search/page.tsx          # Search results
│   │   ├── listing/[id]/page.tsx    # Product listing detail
│   │   ├── services/page.tsx        # Local services home
│   │   ├── services/[category]/page.tsx
│   │   ├── services/[id]/page.tsx   # Service offering detail
│   │   └── shop/[slug]/page.tsx     # Seller public profile
│   ├── (auth)/
│   │   ├── login/page.tsx           # Phone OTP login
│   │   └── register/page.tsx        # Signup (role selection)
│   ├── (buyer)/                     # Buyer-authenticated routes
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── bookings/page.tsx
│   │   └── account/page.tsx
│   ├── (seller)/                    # Seller-authenticated routes
│   │   ├── dashboard/page.tsx
│   │   ├── dashboard/listings/page.tsx
│   │   ├── dashboard/listings/new/page.tsx
│   │   ├── dashboard/listings/[id]/edit/page.tsx
│   │   ├── dashboard/orders/page.tsx
│   │   ├── dashboard/orders/[id]/page.tsx
│   │   ├── dashboard/services/page.tsx
│   │   ├── dashboard/services/new/page.tsx
│   │   ├── dashboard/bookings/page.tsx
│   │   └── dashboard/settings/page.tsx
│   ├── admin/                       # Admin-only routes (email+password gate)
│   │   ├── login/page.tsx
│   │   ├── page.tsx                 # Admin home / stats
│   │   ├── verification/page.tsx    # Verification queue
│   │   ├── listings/page.tsx        # Reported listings
│   │   ├── ratings/page.tsx         # Reported ratings
│   │   └── users/page.tsx           # All users
│   └── api/
│       ├── auth/
│       │   ├── send-otp/route.ts
│       │   └── verify-otp/route.ts
│       ├── listings/
│       │   ├── route.ts             # GET (search), POST (create)
│       │   ├── [id]/route.ts        # GET, PATCH, DELETE
│       │   └── [id]/report/route.ts
│       ├── cart/
│       │   ├── route.ts             # GET, POST (add item)
│       │   └── [itemId]/route.ts    # PATCH (qty), DELETE
│       ├── checkout/route.ts        # POST → creates CheckoutSession + Orders
│       ├── orders/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── claim/route.ts   # POST → buyer claims payment
│       │       └── cancel/route.ts
│       ├── enquiries/route.ts       # POST (log enquiry, reveal buyer contact)
│       ├── ratings/
│       │   ├── route.ts             # POST (create rating)
│       │   └── [id]/report/route.ts
│       ├── services/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── bookings/
│       │   ├── route.ts             # POST (create booking request)
│       │   └── [id]/
│       │       ├── confirm/route.ts # Provider confirms + sets price
│       │       ├── decline/route.ts
│       │       └── complete/route.ts
│       ├── sellers/
│       │   ├── [slug]/route.ts      # Public profile
│       │   └── me/route.ts          # Authenticated seller profile PATCH
│       ├── upload/route.ts          # Cloudinary signed upload
│       └── admin/
│           ├── verification/route.ts
│           ├── listings/route.ts
│           ├── ratings/route.ts
│           └── users/route.ts
├── components/
│   ├── ui/                          # Reusable primitives (Button, Input, etc.)
│   ├── listing/                     # ListingCard, ListingGrid, ListingForm
│   ├── cart/                        # CartDrawer, CartItem
│   ├── order/                       # OrderCard, OrderStatusBadge
│   ├── booking/                     # BookingForm, BookingCard
│   ├── seller/                      # SellerCard, VerifiedBadge
│   ├── search/                      # SearchBar, SearchFilters
│   └── admin/                       # AdminTable, VerificationActions
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   └── server.ts                # Server Supabase client
│   ├── termii.ts                    # OTP send/verify helpers
│   ├── cloudinary.ts                # Upload signature helper
│   ├── ranking.ts                   # THE shared 6-band sort function
│   ├── trending.ts                  # Trending score computation
│   └── notifications.ts             # SMS dispatch via Termii
├── types/
│   └── index.ts                     # All shared TypeScript types
├── middleware.ts                    # Route protection (auth gates)
└── supabase/
    └── migrations/                  # SQL migration files
```

---

## 4. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-only, never expose to client

# Termii (SMS OTP)
TERMII_API_KEY=
TERMII_SENDER_ID=ibuynaija         # Registered sender ID

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Admin
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=               # bcrypt hash, not plaintext

# App
NEXT_PUBLIC_APP_URL=https://ibuynaija.com
```

---

## 5. Database Schema

Full Postgres schema. All tables use UUID primary keys. RLS (Row Level Security) enabled
on all tables via Supabase.

```sql
-- ─── USERS / ACCOUNTS ────────────────────────────────────────────────────────

-- One user account per phone number (Nigerian +234 only).
-- Roles are non-exclusive: a user can be both buyer and seller.
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             TEXT UNIQUE NOT NULL,          -- +234XXXXXXXXXX format
  email             TEXT,                          -- optional
  is_buyer          BOOLEAN NOT NULL DEFAULT FALSE,
  is_seller         BOOLEAN NOT NULL DEFAULT FALSE,
  is_service_provider BOOLEAN NOT NULL DEFAULT FALSE,
  date_joined       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Buyer fields
  saved_delivery_addresses TEXT[]                  -- JSON array of address strings
);

-- Seller / provider profile (created when user selects seller or provider role)
CREATE TABLE sellers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                  TEXT UNIQUE NOT NULL,       -- URL slug for /shop/[slug]
  business_name         TEXT NOT NULL,
  tagline               TEXT,
  description           TEXT,
  state                 TEXT NOT NULL,              -- One of 36 states + FCT
  city_area             TEXT NOT NULL,              -- LGA or neighbourhood
  logo_photo_url        TEXT,                       -- Cloudinary URL
  banner_image_url      TEXT,                       -- Cloudinary URL
  -- Bank details (shown only on Order page, never on public profile)
  bank_account_name     TEXT,
  bank_account_number   TEXT,
  bank_name             TEXT,
  -- Verification
  verification_requested BOOLEAN NOT NULL DEFAULT FALSE,
  verified_status       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_date         TIMESTAMPTZ,
  verified_by           UUID,                       -- references admin_users.id
  provider_type         TEXT NOT NULL CHECK (provider_type IN ('seller','provider','both')),
  date_created          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug history for 301 redirects when seller edits their slug
CREATE TABLE slug_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  old_slug   TEXT NOT NULL,
  new_slug   TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT UNIQUE NOT NULL,
  slug     TEXT UNIQUE NOT NULL,
  section  TEXT NOT NULL CHECK (section IN ('marketplace','services')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Seed: Marketplace categories
-- Fashion & Textiles | Beauty & Personal Care | Hair (Wigs, Weaves & Extensions)
-- Furniture & Interior Décor | Food, Spices & Pantry | Arts, Crafts & Home Décor
-- Jewelry & Accessories | Agro-Products (Raw/Bulk) | Creative & Media
--
-- Seed: Services categories
-- Hair & Grooming | Home Trades | Tailoring & Fashion Services
-- Cleaning Services | Event Services

-- ─── LISTINGS (PRODUCTS) ──────────────────────────────────────────────────────

CREATE TABLE listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id        UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  category_id      UUID NOT NULL REFERENCES categories(id),
  price            NUMERIC(12,2),                  -- NULL = "Price on request"
  photos           TEXT[] NOT NULL DEFAULT '{}',   -- Cloudinary URLs, max 5
  made_in_nigeria  BOOLEAN NOT NULL DEFAULT FALSE,
  condition        TEXT NOT NULL CHECK (condition IN ('new','used')),
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','sold','expired')),
  -- Full-text search vector (auto-maintained via trigger)
  search_vector    TSVECTOR,
  date_posted      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft constraints (enforced in API, double-checked here)
  CONSTRAINT made_in_nigeria_required CHECK (made_in_nigeria = TRUE OR status = 'active' = FALSE)
  -- Note: API layer must reject status='active' when made_in_nigeria=false.
  -- The CHECK above is belt-and-suspenders.
);

-- Trigger to keep search_vector current
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title,'') || ' ' || COALESCE(NEW.description,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_search_vector_trigger
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- Listing reports
CREATE TABLE listing_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),           -- NULL if anonymous
  reason      TEXT NOT NULL CHECK (reason IN ('not_made_in_nigeria','counterfeit','inappropriate')),
  details     TEXT,                                 -- Optional free text
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CART ─────────────────────────────────────────────────────────────────────

CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)
);

-- ─── CHECKOUT & ORDERS ────────────────────────────────────────────────────────

-- One CheckoutSession per checkout action; multiple Orders (one per seller) share it.
CREATE TABLE checkout_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id          UUID NOT NULL REFERENCES users(id),
  delivery_method   TEXT NOT NULL CHECK (delivery_method IN ('pickup','delivery')),
  delivery_address  TEXT,                           -- Required if delivery_method = 'delivery'
  buyer_phone       TEXT NOT NULL,
  buyer_email       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id   UUID NOT NULL REFERENCES checkout_sessions(id),
  buyer_id              UUID NOT NULL REFERENCES users(id),
  seller_id             UUID NOT NULL REFERENCES sellers(id),
  line_items            JSONB NOT NULL,             -- [{listing_id, title, qty, unit_price}]
  total                 NUMERIC(12,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'awaiting_payment'
                        CHECK (status IN (
                          'awaiting_payment',
                          'payment_claimed',
                          'confirmed_by_seller',
                          'fulfilled',
                          'cancelled'
                        )),
  receipt_attachment_url TEXT,                      -- Cloudinary URL, optional
  seller_cancelled      BOOLEAN NOT NULL DEFAULT FALSE,
  date_created          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ENQUIRIES ────────────────────────────────────────────────────────────────

-- An enquiry is a button click: it logs interest and reveals the buyer's phone
-- number to the seller via a notification. No in-app chat. This record also
-- gates the buyer's ability to rate this listing.
CREATE TABLE enquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL REFERENCES users(id),
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)                    -- One enquiry per buyer per listing
);

-- ─── RATINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE ratings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id                 UUID NOT NULL REFERENCES users(id),
  listing_id               UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buying_experience_score  SMALLINT NOT NULL CHECK (buying_experience_score BETWEEN 1 AND 5),
  product_quality_score    SMALLINT NOT NULL CHECK (product_quality_score BETWEEN 1 AND 5),
  comment                  TEXT,
  reported                 BOOLEAN NOT NULL DEFAULT FALSE,
  date_created             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)                    -- One rating per buyer per listing
);

-- Rating reports
CREATE TABLE rating_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id   UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),
  reason      TEXT NOT NULL CHECK (reason IN ('fake','inappropriate','spam')),
  details     TEXT,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

CREATE TABLE service_offerings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category_id      UUID NOT NULL REFERENCES categories(id),
  description      TEXT NOT NULL,
  price_type       TEXT NOT NULL CHECK (price_type IN ('fixed','quote')),
  price            NUMERIC(12,2),                  -- NULL for quote-type
  price_from       NUMERIC(12,2),                  -- Indicative "from" price for quote
  duration_minutes INTEGER,                         -- Estimated duration
  location_type    TEXT NOT NULL CHECK (location_type IN ('at_provider','provider_travels')),
  photos           TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  date_created     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each ServiceOffering has its own weekly schedule
CREATE TABLE availability_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  UNIQUE (service_id, day_of_week)
);

-- Manual blocked dates per service offering
CREATE TABLE availability_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  UNIQUE (service_id, blocked_date)
);

CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES sellers(id),
  service_id         UUID NOT NULL REFERENCES service_offerings(id),
  buyer_id           UUID NOT NULL REFERENCES users(id),
  requested_datetime TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested','confirmed','completed','cancelled','no_show')),
  quote_requested    BOOLEAN NOT NULL DEFAULT FALSE,  -- True for price_type='quote' jobs
  confirmed_price    NUMERIC(12,2),                   -- Set by provider at confirmation
  provider_note      TEXT,                            -- Provider's message to buyer
  notes              TEXT,                            -- Buyer's notes / job description
  address            TEXT,                            -- For on-site jobs (travels-to-customer)
  date_created       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ADMIN ────────────────────────────────────────────────────────────────────

-- Admin users are separate from sellers/buyers. Email + password auth.
-- Never exposed publicly.
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                      -- bcrypt
  role          TEXT NOT NULL DEFAULT 'moderator'
                CHECK (role IN ('moderator','verifier','super_admin')),
  date_created  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES admin_users(id),
  text        TEXT NOT NULL,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Internal only — never shown to seller or buyer
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

-- Full-text search on listings
CREATE INDEX listings_search_idx ON listings USING GIN(search_vector);

-- Also index seller business_name for cross-table search
CREATE INDEX sellers_business_name_idx ON sellers USING GIN(to_tsvector('english', business_name));

-- Category + status browsing
CREATE INDEX listings_category_status_idx ON listings(category_id, status);

-- Ranking: join listings to sellers for verified_status + location
CREATE INDEX sellers_location_idx ON sellers(state, city_area);
CREATE INDEX sellers_verified_idx ON sellers(verified_status);

-- Cart
CREATE INDEX cart_items_buyer_idx ON cart_items(buyer_id);

-- Orders
CREATE INDEX orders_buyer_idx ON orders(buyer_id);
CREATE INDEX orders_seller_idx ON orders(seller_id);
CREATE INDEX orders_status_idx ON orders(status);

-- Bookings
CREATE INDEX bookings_provider_idx ON bookings(provider_id, status);
CREATE INDEX bookings_buyer_idx ON bookings(buyer_id);

-- Slug history
CREATE INDEX slug_history_old_slug_idx ON slug_history(old_slug);
```

---

## 6. Authentication

### Sellers and Buyers — Phone OTP via Termii

1. User enters Nigerian phone number (`+234...` or `080x`/`090x` — normalised to E.164).
2. Server calls Termii API to send a 6-digit OTP via SMS.
3. User enters OTP. Server verifies against a short-lived (5 min) OTP record in
   Supabase (or in-memory with Redis if needed later).
4. On success, Supabase Auth creates/retrieves the user session.
5. At first login (new phone), user is redirected to `/register` to choose role and
   complete their profile.

**Nigerian number validation:**
```typescript
// lib/phone.ts
export function normaliseNigerianPhone(raw: string): string | null {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('234') && cleaned.length === 13) return '+' + cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) return '+234' + cleaned.slice(1);
  return null; // Reject non-Nigerian numbers
}
```

### Admin — Email + Password

- Route: `/admin/login` (not linked from any public page)
- `bcrypt` password comparison server-side
- Session stored in a signed HTTP-only cookie (not Supabase Auth)
- Middleware protects all `/admin/*` routes

### Route Protection (middleware.ts)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin')) {
    // Check admin session cookie
  }
  if (path.startsWith('/dashboard') || path.startsWith('/cart') || ...) {
    // Check Supabase session
    // Redirect to /login if missing
  }
}
```

---

## 7. Data Model Decisions

All decisions from the implementation interview, recorded here permanently.

### 7.1 Roles
- One user account per phone number.
- A user may be Buyer, Seller, Service Provider, or any combination.
- Role is chosen at registration (checkbox: "I want to sell products" / "I offer services").
- Seller and Service Provider roles create a `sellers` row. Buyer role does not.

### 7.2 Made in Nigeria Enforcement
- `made_in_nigeria = true` is required in the API before any listing status can be set
  to `active`. The constraint is enforced:
  1. Client-side: publish button disabled until checkbox is ticked.
  2. API-side: `POST /api/listings` and `PATCH /api/listings/[id]` reject `status: 'active'`
     when `made_in_nigeria` is not `true`.
  3. DB-level: see CHECK constraint in schema above.
- No admin pre-approval required. Self-declared, reactively moderated.

### 7.3 Cart
- Persistent in DB (linked to `buyer_id`).
- When a buyer returns, items with `listing.status = 'sold'` or `'expired'` are shown
  greyed-out as "No longer available". Checkout is blocked until the buyer removes them.
- Cart items for `price = null` (Price on Request) listings cannot be added to cart.
  Only an Enquiry action is available for such listings.
- Cart is cleared (all `cart_items` for the buyer deleted) on successful checkout.

### 7.4 Checkout & Orders
- `POST /api/checkout` creates one `checkout_sessions` row and one `order` per seller
  represented in the cart.
- Delivery address, buyer phone, and buyer email are stored on `checkout_sessions` and
  inherited by all orders from that session.
- Bank details (account name, number, bank) are shown on the `Order` page only — not
  on the public seller profile.
- Orders have no auto-cancel. Sellers manually cancel stale orders via their dashboard.
- Order status transitions:
  - `awaiting_payment` → `payment_claimed` (buyer clicks "I've paid" / attaches receipt)
  - `payment_claimed` → `confirmed_by_seller` (seller verifies in their bank account)
  - `confirmed_by_seller` → `fulfilled` (seller marks dispatched/delivered)
  - Any status → `cancelled` (seller action only)

### 7.5 Enquiries
- An `Enquiry` is a button click on a listing. No in-app chat.
- Effect: logs a row in `enquiries`, reveals buyer's phone number to seller via SMS
  notification, and increments a visible enquiry count on the seller's dashboard.
- One enquiry per buyer per listing (UNIQUE constraint).
- Gates rating eligibility for that buyer on that listing.

### 7.6 Ratings
- Rating requires a prior `enquiry` OR a prior `order` on the same `listing_id`
  by the same `buyer_id`.
- Two scores: `buying_experience_score` and `product_quality_score` (1–5).
- One rating per buyer per listing.
- Ratings can be reported. Admin reviews via the admin dashboard.

### 7.7 Local Services Booking
- Each `service_offering` has its own `availability_schedules` (weekly recurring)
  and `availability_blocks` (date overrides).
- Booking conflict handling: the platform shows a slot as available until a provider
  confirms a booking for it. If two buyers request the same slot, both show as
  `requested`. The provider sees both and manually declines one. The platform does
  not auto-reject.
- For `price_type = 'quote'` bookings: provider sets `confirmed_price` (and optionally
  `provider_note`) when confirming the booking.
- Booking status flow:
  `requested` → `confirmed` → `completed` / `cancelled` / `no_show`
- The platform never auto-confirms. `POST /api/bookings/[id]/confirm` is a
  provider-only action.

### 7.8 Seller Slugs
- Slugs are editable. When a slug changes, the old slug is written to `slug_history`.
- `GET /shop/[slug]` checks `sellers` first; if not found, checks `slug_history` and
  issues a 301 redirect to the current slug.

### 7.9 Search & Ranking (the shared sort function)
See Section 9 for full detail. **This logic is implemented once in `lib/ranking.ts`
and reused across category browsing, search results, and the homepage trending section.**
Never duplicate it per-page.

### 7.10 Trending Algorithm
Homepage trending = listings with the highest engagement score over the last 30 days,
using the same 6-band ranking.

```
engagement_score = (enquiry_count × 1) + (order_count × 3)
  where enquiries and orders occurred in the last 30 days
```

Computed via a SQL query joining `listings`, `enquiries`, and `orders` with a 30-day
window filter.

### 7.11 Currency
NGN only. All `price` and `total` fields are in Nigerian Naira. Diaspora buyers
handle FX conversion themselves.

---

## 8. Core User Flows

### 8.1 New User Registration

1. Visit `/register`
2. Enter phone number (Nigerian format enforced)
3. Receive OTP via Termii SMS, enter it
4. Choose role: **[ ] I want to buy** / **[ ] I want to sell products** / **[ ] I offer services**
   (at least one required; any combination allowed)
5. If selling or services: enter business name, slug, state, city/LGA, bank details
6. Redirect to dashboard (if seller) or homepage (if buyer-only)

### 8.2 Product Purchase Flow

1. Browse by category or search → results ranked by 6-band sort + engagement score
2. Buyer prompted for location (state + city) on first browse — stored on account
3. Open listing detail page → see photos, description, condition, seller info
4. If `price = null`: only "Enquire" button shown. No "Add to cart".
5. If `price` set: "Add to cart" (cart item saved to DB)
6. Cart page: items grouped by seller, per-seller subtotals, sold items greyed out
7. Checkout: enter delivery method (Pickup / Delivery), delivery address, confirm phone
8. `POST /api/checkout` → creates `checkout_sessions` + one `order` per seller
9. Order page (one per seller): shows that seller's bank account details, order total,
   and a "I have paid" button + optional receipt upload
10. Buyer clicks "I have paid" → order status → `payment_claimed` → SMS to seller
11. Seller verifies in their bank account, marks `confirmed_by_seller`
12. Seller marks `fulfilled` when dispatched

### 8.3 Enquiry Flow

1. Buyer opens listing detail page
2. Clicks "Enquire about this listing"
3. Server creates `enquiries` row (or ignores if already exists)
4. Seller receives SMS: "Someone is interested in [listing title]. Their number: [buyer phone]"
5. Enquiry count shown in seller's dashboard
6. Buyer is now eligible to rate this listing

### 8.4 Rating Flow

1. Buyer visits a listing they have previously enquired about or ordered from
2. "Leave a rating" button appears (hidden otherwise)
3. Rate buying experience (1–5) + product quality (1–5) + optional comment
4. Submitted rating is immediately visible on the listing

### 8.5 Local Services Booking (Fixed-Price)

1. Browse Local Services by category, select location
2. Open service offering → see description, price, location type, availability
3. Select available time slot from provider's weekly schedule (minus blocked dates
   and already-confirmed bookings)
4. Submit booking request with notes (buyer's message)
5. Provider receives SMS: "New booking request for [service] on [date/time]"
6. Provider reviews, confirms (adds provider note if needed) or declines
7. Buyer receives SMS: "Your booking for [service] is confirmed / was declined"

### 8.6 Local Services Booking (Quote Required)

Same as 8.5 but:
- No slot selection at submission. Buyer describes the job in `notes`.
- `quote_requested = true` on the booking.
- Provider sets `confirmed_price` + `provider_note` + `requested_datetime` when confirming.
- Buyer receives SMS with confirmed price and time.

### 8.7 Seller Verification Request

1. Seller visits Dashboard → Settings
2. Clicks "Request Verified Seller badge"
3. `sellers.verification_requested = true`
4. Admin sees request in verification queue with seller's profile, listing history,
   bank details, and any prior reports
5. Admin approves or rejects (adds internal `verification_notes` entry)
6. If approved: `verified_status = true`, `verified_date` set
7. Verified badge appears on seller profile + all listings; priority ranking activated
8. Admin can revoke at any time → `verified_status = false`

---

## 9. Search & Ranking

### The 6-Band Sort

**This is implemented once in `lib/ranking.ts` and used everywhere. Do not copy-paste
the logic into individual pages.**

Bands (in order of priority, highest first):

| Band | Description |
|------|-------------|
| 1 | Verified seller, seller city/LGA = buyer city/LGA |
| 2 | Verified seller, seller state = buyer state (different city) |
| 3 | Verified seller, different state |
| 4 | Unverified seller, seller city/LGA = buyer city/LGA |
| 5 | Unverified seller, seller state = buyer state (different city) |
| 6 | Unverified seller, different state |

Within each band, secondary sort: `engagement_score DESC`, then `date_posted DESC`.

**Buyer location** is set when the buyer first browses a category or runs a search —
a location prompt appears ("Where are you shopping from? State / City"). Stored on their
account. Can be changed at any time via a location widget on category/search pages.
Unauthenticated visitors: location prompt stored in a cookie.

### Implementation (conceptual SQL)

```sql
SELECT
  l.*,
  s.verified_status,
  s.state AS seller_state,
  s.city_area AS seller_city,
  CASE
    WHEN s.verified_status AND s.city_area = :buyer_city THEN 1
    WHEN s.verified_status AND s.state = :buyer_state THEN 2
    WHEN s.verified_status THEN 3
    WHEN NOT s.verified_status AND s.city_area = :buyer_city THEN 4
    WHEN NOT s.verified_status AND s.state = :buyer_state THEN 5
    ELSE 6
  END AS rank_band,
  COALESCE(eng.score, 0) AS engagement_score
FROM listings l
JOIN sellers s ON l.seller_id = s.id
LEFT JOIN (
  SELECT listing_id,
    COUNT(DISTINCT e.id) + COUNT(DISTINCT o.id) * 3 AS score
  FROM enquiries e
  LEFT JOIN orders o ON o.id IS NOT NULL -- join line items to listing_id
  WHERE e.date_created > NOW() - INTERVAL '30 days'
  GROUP BY listing_id
) eng ON eng.listing_id = l.id
WHERE l.status = 'active'
  AND (:category_id IS NULL OR l.category_id = :category_id)
  AND (:search IS NULL OR l.search_vector @@ plainto_tsquery(:search)
       OR to_tsvector('english', s.business_name) @@ plainto_tsquery(:search))
ORDER BY rank_band ASC, engagement_score DESC, l.date_posted DESC;
```

### Search Fields
Full-text search (Postgres `tsvector`) on:
- `listings.title`
- `listings.description`
- `sellers.business_name` (joined at query time)

---

## 10. API Route Inventory

All routes are under `/app/api/`. Server-side only. JSON in, JSON out.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/send-otp` | None | Send OTP via Termii to a Nigerian phone |
| POST | `/api/auth/verify-otp` | None | Verify OTP, return Supabase session |

### Listings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/listings` | None | Search + browse (with ranking) |
| POST | `/api/listings` | Seller | Create listing. Enforces `made_in_nigeria=true` before `status=active` |
| GET | `/api/listings/[id]` | None | Single listing detail |
| PATCH | `/api/listings/[id]` | Seller (owner) | Update listing |
| DELETE | `/api/listings/[id]` | Seller (owner) | Delete listing |
| POST | `/api/listings/[id]/report` | Any | Submit listing report |

### Cart
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cart` | Buyer | Get cart items with stale-status flags |
| POST | `/api/cart` | Buyer | Add item. Reject if `price = null`. |
| PATCH | `/api/cart/[itemId]` | Buyer | Update quantity |
| DELETE | `/api/cart/[itemId]` | Buyer | Remove item |

### Checkout & Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/checkout` | Buyer | Create CheckoutSession + Orders; clear cart |
| GET | `/api/orders` | Buyer or Seller | List orders for the authenticated user |
| GET | `/api/orders/[id]` | Buyer or Seller (own order) | Order detail. Shows bank details to buyer. |
| POST | `/api/orders/[id]/claim` | Buyer (own order) | Claim payment; optional receipt upload |
| PATCH | `/api/orders/[id]` | Seller (own order) | Update status (confirm / fulfil) |
| POST | `/api/orders/[id]/cancel` | Seller (own order) | Cancel order |

### Enquiries
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/enquiries` | Buyer | Log enquiry, trigger SMS to seller |

### Ratings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ratings` | Buyer (with prior enquiry or order) | Create rating |
| POST | `/api/ratings/[id]/report` | Any | Report a rating |

### Services & Bookings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | None | Browse service offerings (with ranking) |
| POST | `/api/services` | Provider | Create service offering |
| GET | `/api/services/[id]` | None | Service offering detail + availability |
| PATCH | `/api/services/[id]` | Provider (owner) | Update offering |
| POST | `/api/bookings` | Buyer | Submit booking request (never auto-confirmed) |
| GET | `/api/bookings` | Buyer or Provider | List bookings |
| GET | `/api/bookings/[id]` | Buyer or Provider (own) | Booking detail |
| POST | `/api/bookings/[id]/confirm` | Provider (own) | Confirm booking; set price for quotes |
| POST | `/api/bookings/[id]/decline` | Provider (own) | Decline booking |
| POST | `/api/bookings/[id]/complete` | Provider (own) | Mark completed |
| PATCH | `/api/bookings/[id]` | Provider (own) | Update (no_show, cancel) |

### Sellers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sellers/[slug]` | None | Public profile. Checks slug_history for 301s. |
| PATCH | `/api/sellers/me` | Seller | Update own profile (slug, bank details, etc.) |
| POST | `/api/sellers/me/request-verification` | Seller | Set `verification_requested = true` |

### Uploads
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | Authenticated | Return Cloudinary signed upload params |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | None | Email+password → admin session cookie |
| GET | `/api/admin/verification` | Admin | Queue of verification requests |
| POST | `/api/admin/verification/[sellerId]/approve` | Admin | Grant badge |
| POST | `/api/admin/verification/[sellerId]/reject` | Admin | Reject + add note |
| POST | `/api/admin/verification/[sellerId]/revoke` | Admin | Revoke badge |
| GET | `/api/admin/listings` | Admin | Reported listings |
| POST | `/api/admin/listings/[id]/resolve` | Admin | Remove listing or clear report |
| GET | `/api/admin/ratings` | Admin | Reported ratings |
| POST | `/api/admin/ratings/[id]/resolve` | Admin | Remove rating or clear report |
| GET | `/api/admin/users` | Admin | All users (paginated) |

---

## 11. Page Inventory

### Public (no auth)

| Route | Description | Rendering |
|-------|-------------|-----------|
| `/` | Homepage: hero + category grid + trending listings | SSR |
| `/[category]` | Category browse with ranking | SSR |
| `/search` | Search results (query param) | SSR |
| `/listing/[id]` | Product listing detail | SSR |
| `/services` | Local services home | SSR |
| `/services/[category]` | Services category browse | SSR |
| `/services/[id]` | Service offering detail + booking form | SSR |
| `/shop/[slug]` | Seller public profile | SSR (301 redirect via slug_history) |

### Auth
| Route | Description |
|-------|-------------|
| `/login` | Phone number entry + OTP |
| `/register` | Role selection + profile completion |

### Buyer (authenticated)
| Route | Description |
|-------|-------------|
| `/cart` | Cart with stale-item highlighting |
| `/checkout` | Delivery details form |
| `/orders` | Order list |
| `/orders/[id]` | Order detail + bank details + payment claim |
| `/bookings` | Booking list |
| `/account` | Profile, saved addresses, location setting |

### Seller/Provider Dashboard (authenticated + seller role)
| Route | Description |
|-------|-------------|
| `/dashboard` | Overview: orders inbox, stats, quick actions |
| `/dashboard/listings` | Listing manager (active/sold/expired) |
| `/dashboard/listings/new` | Create listing form (made_in_nigeria checkbox required) |
| `/dashboard/listings/[id]/edit` | Edit listing |
| `/dashboard/orders` | Orders from buyers |
| `/dashboard/orders/[id]` | Order detail + status update actions |
| `/dashboard/services` | Service offerings manager |
| `/dashboard/services/new` | Create service offering + availability |
| `/dashboard/bookings` | Booking queue (requested → confirm/decline) |
| `/dashboard/settings` | Profile, slug, bank details, verification request |

### Admin (separate auth, not public)
| Route | Description |
|-------|-------------|
| `/admin/login` | Email + password |
| `/admin` | Stats overview |
| `/admin/verification` | Verification queue |
| `/admin/listings` | Reported listings |
| `/admin/ratings` | Reported ratings |
| `/admin/users` | All users + seller profiles |

---

## 12. Admin Dashboard

- Accessed at `/admin/*` — not linked from any public page.
- Separate session (HTTP-only signed cookie), not Supabase Auth.
- Password stored as bcrypt hash in `admin_users` table.

### Verification Queue
- Shows sellers with `verification_requested = true` and `verified_status = false`
- Per-seller view: business name, phone, bank details, listing count, order count,
  existing reports, `date_joined`
- Actions: **Approve**, **Reject** (both log a `verification_notes` entry)
- Approved sellers get `verified_status = true` immediately (affects ranking in real-time)
- Admin can also Revoke from the user detail page

### Listing Moderation
- Shows listings with unresolved `listing_reports`
- Admin can: Remove listing (sets `status = 'expired'`) or Clear report (mark resolved)

### Rating Moderation
- Shows ratings with `reported = true`
- Admin can: Remove rating or Clear report

### User List
- Paginated table of all users (sellers + buyers)
- Click into seller profile to see full details, revoke verification, add notes

---

## 13. Notifications

All notifications sent via **Termii SMS**. Four trigger events at Phase 1.
Opt-out is not implemented at MVP — add in Phase 2.

| Trigger | Recipient | Message Template |
|---------|-----------|-----------------|
| Buyer claims payment on an order | **Seller** | "Payment claimed for order #[short_id] on ibuynaija.com. Total: ₦[amount]. Check your [bank_name] account and confirm in your dashboard." |
| Seller confirms or marks order fulfilled | **Buyer** | "Your ibuynaija order #[short_id] has been [confirmed / marked as fulfilled] by [business_name]." |
| Buyer submits booking request | **Provider** | "New booking request for [service_name] on [date] at [time]. Review in your ibuynaija dashboard." |
| Provider confirms or declines booking | **Buyer** | "Your booking for [service_name] has been [confirmed for [date] at [time] / declined] by [business_name]." |
| Buyer sends enquiry on a listing | **Seller** | "Someone is interested in '[listing_title]'. Contact them: [buyer_phone]." |

SMS dispatch is fire-and-forget (non-blocking). Failures are logged but do not
fail the primary action.

---

## 14. Image Handling

All images via **Cloudinary**.

### Upload Flow
1. Authenticated client requests a signed upload URL: `POST /api/upload`
2. Server generates a Cloudinary signed upload signature (short-lived, scoped to folder)
3. Client uploads directly to Cloudinary (no proxy through Next.js server)
4. Cloudinary returns the image URL; client includes it in the subsequent create/update call

### Constraints
- Product listing photos: max 5 per listing, max 2MB each before upload
- Cloudinary auto-transforms: resize to 1200×1200 max, compress to WebP
- Service offering photos: same limits as product photos
- Seller banner image: max 1, 2MB, transformed to 1400×400
- Seller logo/photo: max 1, 2MB, transformed to 400×400
- Order receipt attachment: max 1, 5MB (proof of payment image — any format)

### Folders (Cloudinary naming)
```
ibuynaija/listings/[listing_id]/
ibuynaija/sellers/[seller_id]/
ibuynaija/receipts/[order_id]/
ibuynaija/services/[service_id]/
```

---

## 15. SEO & Social Sharing

### Rendering
All public listing, seller profile, and service pages use **Next.js SSR** (not ISR
or static). This ensures Google always indexes current data and OG tags are always fresh.

### OpenGraph Tags
Every listing and seller profile page generates dynamic OG tags server-side:

```typescript
// app/listing/[id]/page.tsx
export async function generateMetadata({ params }) {
  const listing = await getListing(params.id);
  return {
    title: `${listing.title} — ibuynaija`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: `₦${listing.price?.toLocaleString() ?? 'Price on request'} · Made in Nigeria`,
      images: [{ url: listing.photos[0], width: 1200, height: 630 }],
      url: `https://ibuynaija.com/listing/${listing.id}`,
    },
  };
}
```

Seller profile pages (`/shop/[slug]`) generate OG tags using the seller's banner image
and business name + tagline.

This makes WhatsApp, Instagram, and iMessage link previews rich and informative when
sellers share their profile links — every share is a promotion for ibuynaija.

---

## 16. Trust & Safety

| Mechanism | Implementation |
|-----------|---------------|
| Made-in-Nigeria enforcement | API rejects `status=active` without `made_in_nigeria=true`. DB CHECK constraint as belt-and-suspenders. |
| Bank detail name-matching | Shown at checkout only. Sellers told account name should match business name. Not technically enforced — visual deterrent. |
| Enquiry-gated ratings | `POST /api/ratings` checks for a prior `enquiries` or `orders` row for that `(buyer_id, listing_id)` pair before creating a rating. |
| Listing reports | Dropdown reason + optional text. Admin reviews queue. |
| Rating reports | Flag on rating. Admin reviews queue. |
| Booking approval | No auto-confirm path exists. Provider must explicitly call `/api/bookings/[id]/confirm`. |
| Verified Seller badge | Admin-granted, revocable, affects search ranking. |
| Admin notes | `verification_notes` are internal-only — never exposed via any API to sellers or buyers. |
| NDPA compliance | Buyer phone, email, and delivery address are personal data. No unnecessary exposure. Bank details shown only to the buyer who placed the order. Seller bank details not on public profile. |

---

## 17. Non-Negotiable Rules

Repeat of the core constraints for anyone reading only this section:

1. **No listing can be set to `status = 'active'` without `made_in_nigeria = true`.**
   Enforced at API level and DB level. Non-negotiable.

2. **No Electronics, Phones & Tablets, or Vehicles categories.** These are not seeded
   and must not be added via any admin interface.

3. **Checkout always creates one `Order` per seller.** The API must never create a
   single merged Order across sellers.

4. **"Confirm payment" does not confirm funds received.** It only changes order status
   to `payment_claimed` and sends an SMS to the seller. Copy must never imply otherwise.

5. **Bookings are never auto-confirmed.** No code path sets `booking.status = 'confirmed'`
   without explicit provider action.

6. **Ratings require prior Enquiry or Order.** `POST /api/ratings` must verify this
   before inserting.

7. **Admin data is internal-only.** `verification_notes` and admin actions must never
   appear in any buyer- or seller-facing API response.

8. **Bank details are shown on the Order page only.** Never on the public seller
   profile, listing detail, or in API responses to non-authenticated users.

---

## 18. Build Plan — Phased Task Order

### Phase 0: Project Bootstrap
- [ ] `npx create-next-app@latest ibuynaija --typescript --tailwind --app`
- [ ] Install dependencies: `@supabase/supabase-js @supabase/ssr cloudinary termii-nodejs`
- [ ] Set up Supabase project, run schema migrations
- [ ] Configure environment variables
- [ ] Set up Vercel project, link to Git repo
- [ ] Configure Cloudinary account and folders
- [ ] Seed `categories` table
- [ ] Set up Termii account, register sender ID `ibuynaija`

### Phase 1: Auth
- [ ] Phone normalisation utility (`lib/phone.ts`)
- [ ] `POST /api/auth/send-otp` → Termii integration
- [ ] `POST /api/auth/verify-otp` → Supabase session creation
- [ ] `/login` page (phone entry + OTP input)
- [ ] `/register` page (role selection + profile form)
- [ ] Middleware: protect `/dashboard/*`, `/cart`, `/orders`, `/bookings`, `/admin/*`
- [ ] Admin email+password auth (`/admin/login`)

### Phase 2: Seller Profile & Listings
- [ ] Seller profile DB read + `GET /api/sellers/[slug]`
- [ ] Slug history + 301 redirect logic
- [ ] Cloudinary upload API (`POST /api/upload`)
- [ ] Create listing form (with `made_in_nigeria` checkbox enforcement)
- [ ] `POST /api/listings` (enforce MiN rule)
- [ ] Listing detail page (`/listing/[id]`) with SSR + OG tags
- [ ] Public seller profile page (`/shop/[slug]`) with SSR + OG tags
- [ ] Seller dashboard: listing manager (list, edit, mark sold)

### Phase 3: Search & Category Browse
- [ ] `lib/ranking.ts` — the shared 6-band sort function
- [ ] `GET /api/listings` with ranking + full-text search
- [ ] Category browse page (`/[category]`)
- [ ] Search results page (`/search`)
- [ ] Homepage trending (engagement score query + ranking)
- [ ] Location prompt component (stored on user account + cookie for guests)

### Phase 4: Cart & Checkout
- [ ] Cart API (GET, POST, PATCH, DELETE cart items)
- [ ] Cart page (with sold-item detection and grey-out)
- [ ] `POST /api/checkout` (CheckoutSession + Orders)
- [ ] Order detail page (bank details revealed to buyer)
- [ ] `POST /api/orders/[id]/claim` (payment claim + optional receipt upload)
- [ ] Seller dashboard: orders inbox + status update actions

### Phase 5: Enquiries & Ratings
- [ ] `POST /api/enquiries` (log + SMS to seller)
- [ ] Enquiry count on seller dashboard
- [ ] Rating eligibility check (prior enquiry or order)
- [ ] `POST /api/ratings` with eligibility gate
- [ ] Rating display on listing detail page
- [ ] Report listing form + `POST /api/listings/[id]/report`
- [ ] Report rating form + `POST /api/ratings/[id]/report`

### Phase 6: Local Services & Bookings
- [ ] Service offering create/edit forms + availability schedule UI
- [ ] `POST /api/services`, `GET /api/services`, `GET /api/services/[id]`
- [ ] Availability computation (weekly schedule minus blocks minus confirmed bookings)
- [ ] Booking request form (slot selection for fixed / description for quote)
- [ ] `POST /api/bookings`
- [ ] Provider booking queue page
- [ ] `POST /api/bookings/[id]/confirm` (with `confirmed_price` for quotes)
- [ ] `POST /api/bookings/[id]/decline`
- [ ] `POST /api/bookings/[id]/complete`
- [ ] Buyer bookings list page

### Phase 7: Notifications
- [ ] `lib/notifications.ts` (Termii SMS dispatch, fire-and-forget)
- [ ] Wire up all 5 notification trigger points (order claim, status change,
  booking request, booking response, enquiry)

### Phase 8: Admin Dashboard
- [ ] Admin auth middleware
- [ ] `/admin` overview page
- [ ] Verification queue (list + approve/reject/revoke actions)
- [ ] Listing moderation (reported listings + resolve actions)
- [ ] Rating moderation (reported ratings + resolve actions)
- [ ] User list (paginated)

### Phase 9: Polish & Pre-launch
- [ ] OG tag audit: all SSR pages have correct `title`, `description`, `og:image`
- [ ] Mobile responsiveness audit (all pages)
- [ ] Error states: sold item in cart, invalid slug, booking conflict
- [ ] NDPA: audit which API responses expose personal data to whom
- [ ] DNS: `www.ibuynaija.com` → Vercel
- [ ] Seed initial sellers (direct outreach cohort)
- [ ] Soft launch (limited sharing, no paid promotion)

---

*End of specification. Every decision in this document reflects explicit choices made
during the implementation interview and supersedes any ambiguity in the original v1.2
product spec.*
