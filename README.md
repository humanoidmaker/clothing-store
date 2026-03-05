# HumanoidMaker Ecommerce

Production-ready ecommerce platform with a Next.js host layer, React admin/storefront UI, and Express + MongoDB API.

## Features

- Customer storefront with catalog, filters, cart, wishlist, checkout, and order history
- Admin panel for products, variants, orders, settings, and SEO
- Profit/loss reporting with purchase price support on products and variants
- SEO controls for default, public-page, and product-level metadata
- Popup media library with upload, select, preview, and CRUD
- File-based media storage (`storage/media/YYYY/MM/DD/...`) with URLs in MongoDB
- Media route protection (rate limiting + hotlink protection) and CDN-ready asset URLs
- Razorpay payment flow with admin-managed credentials
- Dropshipping reseller websites with domain-based pricing margins (file-managed, no extra DB collections)

## Tech Stack

- Next.js 14 (App Router catch-all page)
- React 18 + Material UI
- Express 4 + Mongoose
- MongoDB
- JWT auth
- Razorpay integration

## Project Structure

- `app/`: Next.js app shell
- `client/src/`: React UI pages/components
- `server/src/`: Express routes/controllers/models
- `server.js`: unified runtime for pages + `/api`

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or remotely

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   copy .env.example .env
   ```
   On macOS/Linux:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` values.
4. (Optional) Seed sample data:
   ```bash
   npm run seed
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
6. Open:
   - App: `http://localhost:3000`
   - API health: `http://localhost:3000/api/health`

## One-Line Server Setup (GitHub)

These commands clone the full project from GitHub, install dependencies, create/update `.env` (with generated secrets), build the app, seed sample data, and print live step-by-step output.

Linux / Ubuntu:

```bash
curl -fsSL https://raw.githubusercontent.com/humanoidmaker/clothing-store/master/scripts/bootstrap.sh | bash
```

Linux / Ubuntu with MongoDB auto-install:

```bash
curl -fsSL https://raw.githubusercontent.com/humanoidmaker/clothing-store/master/scripts/bootstrap.sh | bash -s -- --install-mongodb
```

Windows Server (PowerShell as Administrator):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -useb https://raw.githubusercontent.com/humanoidmaker/clothing-store/master/scripts/bootstrap.ps1 | iex"
```

Windows Server with MongoDB auto-install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((iwr -useb 'https://raw.githubusercontent.com/humanoidmaker/clothing-store/master/scripts/bootstrap.ps1'))) -InstallMongoDb"
```

Optional flags:

- Linux: `--dir myapp --branch master --skip-seed --skip-build --install-mongodb`
- Windows: `-TargetDir myapp -Branch master -SkipSeed -SkipBuild -InstallMongoDb`

## Environment Variables

- `PORT`: server port (default `3000`)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: long random secret for auth tokens
- `SETTINGS_ENCRYPTION_SECRET`: secret used to encrypt payment credentials stored in database
- `NEXT_PUBLIC_API_URL`: API base path (default `/api`)
- `NEXT_PUBLIC_CDN_BASE_URL`: optional CDN prefix for Next.js static assets
- `MEDIA_CDN_BASE_URL`: optional CDN base URL for uploaded media file URLs
- `MEDIA_PUBLIC_BASE_PATH`: public route used to serve local media files (default `/storage/media`)
- `MEDIA_STORAGE_DIR`: local storage directory for uploaded media files (default `storage/media`)
- `ASSET_RATE_LIMIT_WINDOW_MS`: rate limit window for static asset traffic
- `ASSET_RATE_LIMIT_MAX`: max requests per IP/window for regular clients
- `ASSET_BOT_RATE_LIMIT_MAX`: stricter max requests per IP/window for bot user-agents
- `PAGE_RATE_LIMIT_WINDOW_MS`: rate limit window for non-API page requests
- `PAGE_RATE_LIMIT_MAX`: max page requests per IP/window for regular clients
- `PAGE_BOT_RATE_LIMIT_MAX`: stricter max page requests per IP/window for bot user-agents
- `ENABLE_HOTLINK_PROTECTION`: block offsite referrers from directly embedding local media (`true`/`false`)
- `HOTLINK_ALLOWED_DOMAINS`: comma-separated domains allowed to hotlink local media
- `ENABLE_RESELLER_DEV_PORTS`: enable/disable automatic reseller localhost ports in dev (`true`/`false`, default `true`)
- `RESELLER_DEV_PORT_START`: starting port for auto-assigned reseller dev websites (default `3100`)

## Available Scripts

- `npm run dev`: run development server with nodemon
- `npm run build`: build Next.js app
- `npm start`: run production server
- `npm run seed`: seed database

## Reseller Dropshipping

- Open `Admin -> Resellers` to create unlimited reseller websites.
- Each reseller maps to one or more domains and can be enabled/disabled.
- Each reseller has a `primary domain` used as the main storefront domain.
- Product catalog stays shared; reseller pricing is virtual and margin-based:
  - Apply one margin to all products.
  - Set/clear per-product margin overrides.
- Reseller configuration is stored in `storage/resellers.json` to keep it lightweight and database-free for this module.
- On a mapped reseller domain, storefront prices and checkout totals automatically use that reseller margin.

### Development Domain Testing

- In development (`npm run dev`), each reseller automatically gets a dedicated local port (starting from `RESELLER_DEV_PORT_START`).
- Just create reseller in admin and click `Open Dev URL` to open its own website.
- Behind the scenes, local proxy ports forward to the main app and inject reseller host automatically.

## Seed Admin (Default)

- Email: `admin@example.com`
- Password: `admin123`

Change default credentials immediately in any non-local environment.

## Production Notes

- Use HTTPS, secure secrets management, rate limits, backups, and monitoring before production use.
- Configure Razorpay key id/secret in Admin > Settings (stored encrypted in database).
- Uploaded media files are stored on disk; ensure persistent volume mounting in production.
- If using external CDN/object storage, set `MEDIA_CDN_BASE_URL` and keep cache TTL high.
- Review your regional legal, tax, and privacy compliance obligations before launch.

## Open Source License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

Important legal summary: this software is provided "AS IS", without warranty of any kind, and the authors/contributors are not liable for any claim, damages, outages, data loss, security incidents, or other production/business impact from using this system. 

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request
