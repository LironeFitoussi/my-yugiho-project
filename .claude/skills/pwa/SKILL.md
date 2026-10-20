---
name: pwa
description: Add or adjust PWA support (PRD §15) — web app manifest, icons, service worker for static asset caching, iPhone Add to Home Screen, mobile navigation. Use for Phase 4 PWA/mobile work.
---

# Progressive Web App

## Read first
Grep `node_modules/next/dist/docs/` for `manifest` and `progressive-web-apps` (the App Router has a `manifest.ts` file convention and a PWA guide). Follow the Next 16 docs over memory. Avoid PWA plugins unless they're clearly needed (§3 rule 12).

## Requirements
- `src/app/manifest.ts`: name, short_name, `display: "standalone"`, theme/background colors, `start_url: "/"`, and icons (192, 512, maskable).
- iOS: `apple-touch-icon`, plus `appleWebApp` metadata in the root layout (capable, status bar style, title). Respect safe-area insets (`env(safe-area-inset-*)`).
- Service worker (`public/sw.js`, registered from a small client component): cache **static assets only** (`/_next/static`, icons, fonts). Never cache authenticated HTML, server action responses, or API data. Full offline editing is out of scope for the MVP.
- Version the cache name and delete old caches in `activate`.
- Security headers for `sw.js` (`Cache-Control: no-cache`, correct `Content-Type`) go in `next.config.ts` headers.
- Mobile UI: bottom or compact navigation on small screens, tap targets ≥ 44px, no hover-only interactions.

## Verify
- `npm run build && npm start`, then check Chrome DevTools → Application (manifest, SW, and that installability passes).
- Playwright at an iPhone viewport (`devices["iPhone 15"]`) for navigation and the main flows.
- Real iPhone Safari → Share → Add to Home Screen. Tell the user this step is manual.
