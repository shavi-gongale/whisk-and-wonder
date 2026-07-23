---
name: react-leaflet version pin for React 18 projects
description: Which react-leaflet major version to install when the host app is on React 18, and why v5 fails.
---

When adding Leaflet/OpenStreetMap maps to a React 18 project, install `react-leaflet@4.2.1` (not the latest v5.x) along with `leaflet` and `@types/leaflet`.

**Why:** react-leaflet v5 declares a peer dependency on React 19. Installing it into a React 18.3.1 app causes peer-dependency conflicts / install failures. v4.2.1 supports React 18 and has the same core API (MapContainer, TileLayer, Marker, useMapEvents, useMap).

**How to apply:** Before adding any Leaflet map feature, check the project's React version first (`package.json`). If it's React 18.x, pin `react-leaflet` to the 4.x line explicitly rather than letting the package manager pick latest.
