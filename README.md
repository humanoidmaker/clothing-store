# HumanoidMaker Ecommerce (Node.js + React + MongoDB)

A full-stack ecommerce starter built with:

- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- Frontend: React (Vite), React Router, Axios
- Data: Product catalog, cart, checkout, orders, admin product management

## Project structure

- `server/` Express API and MongoDB models
- `client/` React storefront/admin UI
- `package.json` root workspace scripts

## Features

- User registration/login with JWT
- Product listing + search/filter
- Product details and add-to-cart
- Cart persisted in localStorage
- Checkout with shipping address
- Order creation and "My Orders" tracking
- Admin product create/delete APIs and UI
- Seed script for sample products + admin account

## Prerequisites

- Node.js 18+
- MongoDB running locally (or update `MONGO_URI`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env files:
   - Copy `server/.env.example` to `server/.env`
   - Copy `client/.env.example` to `client/.env`
3. Seed data (optional but recommended):
   ```bash
   npm run seed
   ```
4. Start frontend + backend together:
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
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/orders` (protected)
- `GET /api/orders/my` (protected)
- `GET /api/orders` (admin)

## Notes

- Cart state is managed client-side and synced to localStorage.
- This is a solid foundation; next common additions are online payments, image uploads, and order status management workflows.
