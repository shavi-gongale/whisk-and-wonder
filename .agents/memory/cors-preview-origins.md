---
name: CORS preview origins
description: Replit proxied preview origins may include the development port in the browser Origin header.
---

The API CORS allowlist must accept configured Replit development domains with and without the forwarded preview port, while still rejecting unknown origins.

**Why:** The proxied browser origin included `:5000`, but the original allowlist only matched the bare HTTPS hostname and caused `Origin not allowed`.

**How to apply:** Normalize `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS`, allow their configured hostnames and expected preview ports, and keep an explicit deny path for unrelated origins.