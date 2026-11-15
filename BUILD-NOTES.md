# Build notes

## Stack

- `frontend/`: React 19 + Vite 7 (MPA: index.html toko, admin.html admin; styles.css statis di public/).
- `backend/`: Express 5 + Prisma 6 + MySQL. Sesi admin di memori (cookie HttpOnly, SameSite=Strict).

## Design decisions

- **Dials:** ENERGY 1 / RHYTHM 1 / MOTION 1.
- **Palette:** `warm-paper-walnut` (#f7f3ec paper, #2a2622 ink, #7a4a2c action), a bakery palette from the frontend design skill; chosen over the first dealt yellow accent for a calm, warm draft.
- **Type:** Nunito as the supplied bakery pairing.
- **Layout:** short place page with a photo-led first screen, text below the photograph, a catalog, order flow and Ciranjang location details. No guessed opening hours, street address, product claims, prices, reviews or ratings.
- **Motion:** restrained hover/focus transitions only; no auto-play or scroll reveal.

## Stand-in photography (replace before publication)

- Hero cookies photograph: YoAmes, Wikimedia Commons, CC BY-SA 2.0. https://commons.wikimedia.org/wiki/File:Baked_sugar_cookies_on_tray_and_wire_rack.jpg
- Replace with an Alikha Bakery-owned photo of the storefront/counter for the hero, plus real photos of signature cookies and cakes. The catalog itself has no seeded products.

## Suggested first-party photo shoot

Shopfront straight on; counter from the doorway; three real products on one consistent surface; close detail of decorating/packing; hands at work. Natural window light, no filters, and consistent framing.

## Required launch configuration

Set a strong `ALIKHA_ADMIN_PASSWORD` and correct `WHATSAPP_NUMBER` in `.env`. Confirm shop address, hours, price list, pickup/delivery policy, lead times, cancellation/payment policy, customer-data retention, and privacy notice with the owner. Deploy behind HTTPS with persistent SQLite storage and backups.
