# Astra Attire Ecommerce (Node.js + React + MongoDB)

A clothing-focused ecommerce web app built with:

- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- Frontend: React + Vite + Material UI
- Payments: Razorpay (test mode)
- Currency: INR (Indian Rupees)

## What changed

This project is now fashion-specific (not general-purpose ecommerce):

- Clothing catalog with fields like `gender`, `sizes`, `colors`, `material`, `fit`
- Material UI based storefront with a styled theme
- Advanced filters: search, category, gender, size, color, price range, sorting
- Product detail variant selection (size + color)
- Cart stores variants as separate line items

## Project structure

- `server/` Express API and MongoDB models
- `client/` React + MUI storefront/admin UI
- `package.json` root workspace scripts

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env files:
   - Copy `server/.env.example` to `server/.env`
   - Copy `client/.env.example` to `client/.env`
3. Add Razorpay test keys in `server/.env`:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=...`
4. Seed clothing catalog:
   ```bash
   npm run seed
   ```
5. Start frontend + backend:
   ```bash
   npm run dev
   ```

- API: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Default seeded admin

- Email: `admin@example.com`
- Password: `admin123`

## Main API routes

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

## Notes

- Prices are stored/displayed in INR.
- If you previously seeded older products, run `npm run seed` again to load the new clothing dataset.
