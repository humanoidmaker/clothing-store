# Astra Attire Ecommerce (Next.js + Express + MongoDB)

A clothing-focused ecommerce app migrated to a Next.js-hosted runtime while preserving all storefront and admin features.

## Stack

- Frontend host: Next.js (App Router catch-all)
- UI: React + Material UI
- API: Express + MongoDB (Mongoose) mounted at `/api` inside the same Node process
- Auth: JWT
- Payments: Razorpay (test mode)
- Currency: INR

## What Was Preserved

- Storefront product catalog, filters, cart, wishlist, checkout, order history, invoice page
- Admin products, orders, settings
- Admin SEO manager for default tags, public pages, and product-specific tags
- Admin business reporting with filters, charts, and cost-based profit/loss (using `purchasePrice`)
- Variant pricing/stock/image support
- Razorpay verification flow

## Project Structure

- `app/` Next.js App Router shell
- `client/src/` existing React UI modules and pages (rendered by Next catch-all page)
- `server/src/` Express API, models, controllers, seed script
- `server.js` unified runtime that serves both Next pages and `/api`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   - Copy `.env.example` to `.env`
3. Add Razorpay test keys in `.env`:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=...`
4. Seed data:
   ```bash
   npm run seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

- App + API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## Default Seeded Admin

- Email: `admin@example.com`
- Password: `admin123`

## Main API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)
- `GET /api/products` (supports search + clothing filters)
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/orders` (protected)
- `POST /api/orders/razorpay/order` (protected)
- `POST /api/orders/razorpay/verify` (protected)
- `GET /api/orders/my` (protected)
- `GET /api/orders` (admin)
- `GET /api/orders/reports/summary` (admin, supports report filters)
- `PUT /api/orders/:id/status` (admin)
- `GET /api/seo/admin` (admin)
- `PUT /api/seo/defaults` (admin)
- `PUT /api/seo/public-page` (admin)
- `DELETE /api/seo/public-page/:key` (admin)
- `GET /api/seo/products` (admin)
- `GET /api/seo/products/:id` (admin)
- `PUT /api/seo/products/:id` (admin)
- `GET /api/media` (admin)
- `POST /api/media` (admin)
- `PUT /api/media/:id` (admin)
- `DELETE /api/media/:id` (admin)

## Notes

- Product and variant forms include `purchasePrice` so reports calculate real cost-based profit/loss.
- Product page includes sharing actions (native share, WhatsApp, Facebook, X, Telegram, copy link for Instagram) using URL-level OG/Twitter tags.
- SEO metadata is server-rendered per route from admin-configurable SEO settings for better Google/social crawler compatibility.
- SEO and product image selection support popup media gallery with upload, thumbnail preview, single/multi-select, and media CRUD.
- Existing older orders without item `purchasePrice` use product fallback purchase pricing in reports.
- If you seeded before purchase pricing support, re-run `npm run seed` to refresh sample cost data.
