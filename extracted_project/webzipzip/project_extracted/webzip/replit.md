# Whisk & Wonder — Artisan Bakery App

A luxury bakery e-commerce experience built with React, Vite, and Tailwind CSS.

## Stack
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 6
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **Routing**: React Router v7
- **Maps**: Leaflet + react-leaflet v4
- **Drag & drop**: react-dnd v16
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)

## Features
- Bakery entrance / splash screen animation
- Product browsing with modal detail views
- Cart drawer and multi-step checkout flow
- Order tracking modal
- Address map picker (Leaflet)
- Admin dashboard with charts
- Auth modal (sign in / sign up)
- User profile modal with notification history
- Search modal
- Sound effects and background ambience

## Running the app

```bash
npm install
npm run dev
```

The dev server runs on port 5000. Vite is already configured for Replit (`host: 0.0.0.0`, `allowedHosts: true`).

## Project structure

```
src/
  app/
    App.tsx               # Root component and routing
    BakeryEntrance.tsx    # Splash/entrance screen
    components/           # Feature components (cart, checkout, admin, etc.)
    components/ui/        # shadcn/ui primitive components
    components/figma/     # Figma-specific helpers
  assets/                 # Images, audio files
  styles/                 # Global CSS
  main.tsx               # Entry point
```

## User preferences
- Keep the existing premium bakery design — do not redesign or restructure.
