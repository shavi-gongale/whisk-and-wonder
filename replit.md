# Whimsy Wonders Bakery — Replit Project

## Overview

A full-stack premium bakery e-commerce web app built with React + TypeScript (Vite) on the frontend and Express.js + PostgreSQL on the backend.

**Features:** Product catalog, cart, wishlist, user auth, checkout flow, order tracking, reviews, admin dashboard, coupons, newsletter, contact form.

## Stack

- **Frontend:** React 18, TypeScript, Vite (port 5000), Tailwind CSS v4, Radix UI, shadcn/ui components, Framer Motion, React Router
- **Backend:** Express.js (port 3001), PostgreSQL (Replit built-in DB), JWT auth via `SESSION_SECRET`
- **Audio/FX:** Custom sound effects for cart, checkout, hover interactions

## How to Run

The `Start application` workflow runs both servers concurrently:

```
npm run dev:full
```

- Vite dev server → `http://localhost:5000` (proxies `/api` → `localhost:3001`)
- Express API server → `http://localhost:3001`

## Environment Variables

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Replit managed | PostgreSQL connection string |
| `SESSION_SECRET` | Replit secret | JWT signing key |

## Database

All tables are created via the initial setup. Schema includes:
`users`, `products`, `orders`, `addresses`, `reviews`, `newsletter`, `wishlist`, `coupons`, `contact_messages`

## Admin Access

Create a user then manually set `is_owner = true` in the database to grant admin/owner access.

## User Preferences

- Keep the existing premium bakery design — do not redesign without explicit instruction.
- Maintain the project's existing file structure and stack.
