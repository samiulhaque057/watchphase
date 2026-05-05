# Watch Phase

Watch Phase is a Next.js (App Router) ecommerce storefront for watches with a built-in admin panel.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Prisma ORM + PostgreSQL
- Zod validation

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Set required env vars in `.env`:
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_ROUTE_KEY` (legacy internal route key)
- `NEXT_PUBLIC_SITE_URL` (production canonical origin, e.g. `https://watchphase.com`)

Optional SEO/performance envs:
- `NEXT_PUBLIC_MEDIA_HOST` (if uploads are served from a separate host like `media.watchphase.com`)
- `SITEMAP_LASTMOD` (stable ISO timestamp for static sitemap routes)

4. Start DB + sync schema + seed:

```bash
npm run db:up
npm run db:push
npm run db:generate
npm run db:seed
```

5. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Main Routes

### Storefront
- `/` homepage
- `/[slug]` category listing
- `/product/[slug]` product detail
- `/search` catalog search
- `/cart` cart checkout
- `/buy-now` single-product checkout
- `/blog` blog index
- `/blog/[slug]` blog detail

### Admin
- `/admin` admin dashboard
- `/api/admin/*` protected admin APIs

## Scripts

- `npm run dev` start development server
- `npm run build` production build + typecheck
- `npm run start` run production server
- `npm run lint` run ESLint
- `npm run db:up` start PostgreSQL via Docker
- `npm run db:push` sync Prisma schema
- `npm run db:generate` regenerate Prisma client
- `npm run db:seed` seed initial data

## Project Structure

```text
watchh/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ admin/page.tsx
│  ├─ buy-now/page.tsx
│  ├─ cart/page.tsx
│  ├─ product/[slug]/page.tsx
│  ├─ search/page.tsx
│  ├─ blog/
│  │  ├─ page.tsx
│  │  └─ [slug]/page.tsx
│  ├─ [slug]/page.tsx
│  ├─ internal/stock/[secret]/
│  │  ├─ page.tsx
│  │  └─ stock-admin-panel.tsx
│  └─ api/
│     ├─ orders/
│     ├─ products/search/
│     └─ admin/
│        ├─ login/ logout/
│        ├─ products/ orders/
│        ├─ blog-posts/ hero-images/
│        ├─ listing-categories/
│        ├─ upload/ uploads/
│        └─ site-settings/
├─ components/
│  ├─ layout/
│  ├─ home/
│  ├─ product/
│  ├─ cart/
│  ├─ checkout/
│  └─ category/
├─ lib/
│  ├─ prisma.ts
│  ├─ admin-session.ts
│  ├─ catalog.ts
│  ├─ search-products.ts
│  ├─ blog-posts.ts
│  ├─ get-orders-for-admin.ts
│  ├─ shipping-method.ts
│  ├─ hero-images.ts
│  └─ validators/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
├─ data/
├─ public/
│  └─ uploads/products/
├─ proxy.ts
└─ .env.example
```

## Data Model (High Level)

- `Product`, `ProductImage`, `ProductVariation`
- `ListingCategory`
- `Order`, `OrderItem` (with 7-digit customer reference number)
- `BlogPost`
- `SiteSettings`

## Notes

- Admin auth is cookie-based (`ADMIN_PASSWORD` + signed session token).
- Admin URL is `/admin`.
- Password in query params is stripped to avoid URL credential leaks.
- Product uploads are stored in `public/uploads/products`.
