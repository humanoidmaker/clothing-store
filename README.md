# HumanoidMaker Ecommerce

Production-ready ecommerce platform with a Next.js host layer, React admin/storefront UI, and Express + MongoDB API.

## Features

- Customer storefront with catalog, filters, cart, wishlist, checkout, and order history
- Admin panel for products, variants, orders, settings, and SEO
- Profit/loss reporting with purchase price support on products and variants
- SEO controls for default, public-page, and product-level metadata
- Popup media library with upload, select, preview, and CRUD
- Razorpay payment flow (test mode supported)

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

## Environment Variables

- `PORT`: server port (default `3000`)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: long random secret for auth tokens
- `RAZORPAY_KEY_ID`: Razorpay key id
- `RAZORPAY_KEY_SECRET`: Razorpay secret
- `NEXT_PUBLIC_API_URL`: API base path (default `/api`)

## Available Scripts

- `npm run dev`: run development server with nodemon
- `npm run build`: build Next.js app
- `npm start`: run production server
- `npm run seed`: seed database

## Seed Admin (Default)

- Email: `admin@example.com`
- Password: `admin123`

Change default credentials immediately in any non-local environment.

## Production Notes

- Use HTTPS, secure secrets management, rate limits, backups, and monitoring before production use.
- Razorpay credentials in this repo are for integration/testing; use your own production keys.
- Review your regional legal, tax, and privacy compliance obligations before launch.

## Open Source License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

Important legal summary: this software is provided "AS IS", without warranty of any kind, and the authors/contributors are not liable for any claim, damages, outages, data loss, security incidents, or other production/business impact from using this system.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request
