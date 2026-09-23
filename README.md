# Whisk & Wonder

Whisk & Wonder is a full-stack bakery storefront with product browsing, cart and checkout flows, customer accounts, order history, reviews, wishlist, loyalty, coupons, Cake Studio, and an owner dashboard.

## Features

- Product catalog and category browsing
- Cart, checkout, delivery, coupons, and order tracking
- Customer authentication, email verification, password reset flow, wishlist, reviews, and loyalty points
- Cake Studio customization experience
- Owner authentication, provisioning, product management, order management, and dashboard APIs
- Express health and product APIs backed by PostgreSQL

## Tech Stack

- React 18, TypeScript, Vite, Tailwind CSS, Radix UI, and React Router
- Express 5 API server
- PostgreSQL with `pg`
- JWT sessions signed with `SESSION_SECRET`
- `bcryptjs` for password hashing

## Architecture

The Vite development server serves the React application on port 5000 and proxies `/api` requests to the Express server on port 3001. Express owns authentication, authorization, business APIs, and PostgreSQL access. Database schema creation and seed data are kept in `server/init-db.js` and `server/seed.js`.

## Setup

Requirements: Node.js 20 or newer, npm, and a running PostgreSQL instance.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux, use `cp .env.example .env` instead. Fill in local values; never commit `.env`.

### Environment Variables

Required:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: random secret of at least 32 characters

Optional owner provisioning:

- `OWNER_EMAIL`
- `OWNER_PASSWORD` (at least 12 characters with upper, lower, and numeric characters)
- `OWNER_NAME`

Optional password-reset delivery configuration:

- `PASSWORD_RESET_URL`
- `EMAIL_PROVIDER`
- `CORS_ORIGINS`: comma-separated deployment hostnames allowed by the API

### PostgreSQL Setup

Create an empty PostgreSQL database and set its connection string in `DATABASE_URL`. The application creates or updates its tables through the checked-in initialization logic. Do not commit PostgreSQL data directories, dumps containing private data, or credentials.

Starting the API with `npm run server` initializes the schema and seeds the catalog through `server/init-db.js`. The initialization script is safe to rerun for the schema it owns. Do not delete an existing local database as part of normal development.

### Owner Account Provisioning

Set `OWNER_EMAIL`, `OWNER_PASSWORD`, and optionally `OWNER_NAME` in `.env`, then run:

```bash
npm run provision:owner
```

Public signup always writes `is_owner = false`. Owner access is granted only by the environment-driven provisioning script and verified by the owner middleware.

## Development Commands

```bash
npm run dev          # Vite frontend
npm run server       # Express API
npm run dev:full    # Frontend and API together
npm run build       # Production frontend build
```

The frontend is available at `http://localhost:5000`; the API is available at `http://localhost:3001`.

## Production Build

Run `npm run build`, then serve the generated `dist/` directory through the deployment platform. Run the Express server with production environment variables and a managed PostgreSQL database. Keep secrets in the deployment secret manager or an untracked `.env` file.

## Project Structure

```text
src/                 React frontend and UI assets
server/              Express API, database initialization, seed, and provisioning
public/               Public static assets
vite.config.ts       Vite configuration and API proxy
.env.example         Placeholder environment variable names
```

## Security Notes

- Never commit `.env`, credentials, tokens, private keys, database dumps, or local database files.
- Use a unique `SESSION_SECRET` with at least 32 characters.
- Use a strong owner password and keep owner credentials outside source control.
- Review `git status --short` and the staged file list before the first commit.

## Deployment Preparation

1. Provision PostgreSQL and configure `DATABASE_URL`.
2. Set a unique `SESSION_SECRET` and owner variables through the deployment secret manager.
3. Run `npm install` and `npm run build`.
4. Initialize the schema, seed required catalog data, and provision the owner account through the deployment process.
5. Verify `/api/health`, `/api/products`, customer authentication, and owner authentication in the deployment environment.

This project is prepared for deployment, but production readiness still depends on the selected hosting, database, email delivery, monitoring, and operational controls.
