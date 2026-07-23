# Whisk & Wonder — Artisan Bakery

A luxury bakery web app built with React + Vite. Features an immersive entrance animation, product browsing, a shopping cart, checkout flow, wishlist, order tracking, an admin dashboard, and ambient audio/sound effects.

## Stack

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 6 (port 5000)
- **Styling**: Tailwind CSS v4 + shadcn/ui components (Radix UI primitives)
- **UI extras**: MUI icons, Framer Motion (`motion`), Lucide icons
- **Routing**: React Router v7
- **Drag & drop**: react-dnd
- **Maps**: React Leaflet
- **Charts**: Recharts

## How to run

```bash
npm run dev   # starts Vite dev server on port 5000
npm run build # production build → dist/
```

The workflow **Start application** (`npm run dev`) is configured and runs automatically.

## Project structure

```
src/
  app/
    App.tsx                  # Root component / router
    BakeryEntrance.tsx       # Animated entrance screen
    components/
      AdminDashboard.tsx
      AuthModal.tsx
      CartDrawer.tsx
      CheckoutFlow.tsx
      OrderTrackingModal.tsx
      ProductModal.tsx
      SearchModal.tsx
      ui/                    # shadcn/ui component library
  assets/
    audio/                   # Ambient + SFX audio files
  styles/                    # Global CSS, Tailwind, theme, fonts
  main.tsx                   # Entry point
index.html
vite.config.ts
```

## User preferences

- Keep the existing premium bakery design — do not redesign or restructure
- Maintain the existing component and file structure
