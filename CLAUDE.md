# ibuynaija.com

## What this is
A Nigerian marketplace exclusively for Made-in-Nigeria products, plus a connected
Local Services booking section. Full spec: SPEC.md

## Tech stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: Supabase (PostgreSQL 17) — local dev uses local PostgreSQL 17
- **Auth**: Email + password for buyers/sellers/admin (bcryptjs); Termii SMS OTP
  retained for phone verification. (Magic-link/SMS-OTP login was replaced — see
  commit `6dde9c3`.)
- **Images**: Cloudinary
- **Hosting**: Vercel
- **Styling**: Tailwind CSS

## Non-negotiable product rules
- This is ONE marketplace — no general-merchandise section.
- Every listing requires `made_in_nigeria = true` before `status = 'active'`.
  Enforced at API level AND database CHECK constraint. No exceptions.
- No Electronics, Phones & Tablets, or Vehicles categories. Ever.
- Cart is unified across sellers; checkout splits into one Order per seller.
- Payment is direct bank transfer. "Confirm payment" notifies the seller only —
  it is NOT proof of payment.
- Local Services bookings require provider approval. No auto-confirm path exists.
- Ratings require a prior Enquiry or Order on that specific listing.
- Bank details shown on Order page only — never on public seller profile.
- The 6-band ranking function lives ONLY in lib/ranking.ts — never duplicate it.

## How to run locally

### Install dependencies
```
npm install
```

### Set up environment
```
cp .env.local.example .env.local
# Fill in Supabase, Termii, Cloudinary credentials
```

### Run database migrations + seed (local PostgreSQL 17)
```
bash supabase/run_local.sh --reset
```

### Start dev server
```
npm run dev
```
Open http://localhost:3000

### Run against Supabase hosted project
Apply migrations in order via the Supabase SQL editor, or use:
```
npx supabase db push
```

## Code style
- TypeScript strict mode
- All shared types live in `types/index.ts`
- API routes: Next.js Route Handlers (`app/api/.../route.ts`)
- Supabase client: use `lib/supabase/client.ts` in client components,
  `lib/supabase/server.ts` in server components and Route Handlers
- Admin routes bypass RLS via `createServiceClient()` from `lib/supabase/server.ts`
- Search/ranking: always import from `lib/ranking.ts`

## Database migrations
Located in `supabase/migrations/`, numbered 001–022 (apply in numeric order):
- 001: users, sellers, slug_history
- 002: categories (seeded inline)
- 003: listings, listing_reports, search trigger
- 004: cart_items, checkout_sessions, orders
- 005: enquiries, ratings, rating_reports
- 006: service_offerings, availability_schedules, availability_blocks, bookings
- 007: admin_users, verification_notes, deferred FK, otp_tokens
- 008: seller badges
- 009: referrals + referral boost
- 010: listing_variants
- 011: cart variants
- 012: promotions
- 013: messages (order-scoped buyer/seller messaging)
- 014: cover_photo_index
- 015: new categories
- 016: email + password auth (nullable phone, full_name, password_hash)
- 017: seller_applications (buyer → seller approval flow)
- 018: WhatsApp delivery (seller whatsapp_number)
- 019: stock_events
- 020: user phone2 + seller-application CAC certificate
- 021: offline_sales + expenses
- 022: seller name change

Migration numbers are unique and sequential — keep them that way. If two
migrations ever collide on a number, renumber the later one before committing.

Seed data: `supabase/seed/001_seed.sql`
- 6 sellers (2 verified), 8 users, 11 listings, 3 orders, 3 bookings, 14 categories

## Key architectural decisions (from interview — see SPEC.md Section 7)
- enquiry = button click only, no in-app chat
- orders have no auto-cancel (seller manually cancels)
- 6-band ranking: Verified-near > Verified-medium > Verified-far >
  Unverified-near > Unverified-medium > Unverified-far
- CheckoutSession table ties multi-seller orders to one delivery address
- Service offerings each have their own availability schedule
- confirmed_price on bookings (for quote-type jobs)
- slug history table enables 301 redirects on slug change
