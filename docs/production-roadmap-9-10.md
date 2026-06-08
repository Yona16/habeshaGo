# HabeshaGo 9/10 Production Roadmap

## Current Local MVP Status

- Customer web app is active at `/`.
- Merchant Portal is active at `/merchant`.
- Admin Portal is active at `/admin`.
- Demo authentication supports customer, merchant, driver, and admin.
- Local order flow supports placed, accepted, preparing, ready for pickup, driver requested, driver accepted, picked up, on the way, delivered, cancelled, rejected, and simulated refunded states.
- Customer tools now include saved addresses, favorites, reviews, promo validation, order tracking, and notifications.
- Maps/GPS are simulated with real-time driver location events and local distance/ETA calculation.
- Payments are simulated for cash and provider placeholders; no real money moves.

## Phase 1: Critical Production Foundation

1. Replace local JSON/demo storage with PostgreSQL.
2. Add migrations and repositories for users, customers, drivers, merchants, products, orders, order items, payments, wallets, wallet transactions, payouts, cities, neighborhoods, addresses, support tickets, audit logs, feature flags, reviews, favorites, and promo codes.
3. Replace local sessions with production JWT access tokens, refresh-token rotation, session/device audit, admin MFA, password reset, and email/SMS verification.
4. Restrict CORS to production domains and enforce HTTPS.

## Phase 2: Customer Experience

- Browse stores and products.
- Search, favorites, saved addresses, promo codes, ratings/reviews, reorder, order history, support, and push notifications.
- Ethiopia address model: country, city, sub-city, woreda, neighborhood, landmark, GPS pin, phone number, and delivery instructions.

## Phase 3: Merchant Portal

- Store profile, menu/product management, image upload, availability, live orders, accept/reject, preparing, ready for pickup, sales report, payout report, and support tickets.
- Current local portal covers most workflow actions except real image upload/storage and real payout settlement.

## Phase 4: Driver Platform

- Online/offline, accept delivery, pickup confirmation, on-the-way status, delivery confirmation, navigation, earnings, wallet, performance metrics, and safety controls.
- Dispatch engine should add nearest-driver assignment, load balancing, rating logic, auto-dispatch, and manual admin dispatch.

## Phase 5: Admin Portal

- Admin login, merchant approval, driver approval, customer management, order monitoring, payment review, wallet management, fraud/safety review, commission management, feature flags, support tickets, audit logs, and city/neighborhood setup.

## Phase 6: Payments And Wallet

- Ethiopia launch methods: Telebirr, CBE Birr, Chapa, SantimPay, and cash on delivery.
- Diaspora future methods: Visa, Mastercard, Apple Pay, Google Pay, and Stripe.
- Wallet balances must only change through immutable wallet transactions and admin reconciliation.

## Phase 7: Maps And GPS

- Start with OpenStreetMap, Leaflet, GPS tracking, distance calculation, delivery zones, and ETA calculation.
- Later add Ethiopia-specific landmark, woreda, neighborhood, and local-address intelligence.

## Phase 8: Language, Security, Observability, Testing

- Launch English and Amharic first; add Oromo, Tigrinya, and Swahili later.
- Add XSS/CSRF protections, SQL injection protection through parameterized queries, secrets management, refresh-token rotation, admin MFA, structured logging, Sentry, Prometheus/Grafana or CloudWatch, API/database monitoring, alerts, backups, and 80%+ automated coverage.

## Phase 9: Deployment

- Frontend: Next.js.
- Backend: Node.js + TypeScript.
- Database: managed PostgreSQL.
- Cache: Redis.
- Storage: S3-compatible image storage.
- CDN, SSL, CI/CD, monitoring, backups, and runbooks.

## Delay Until Version 2

- Social feed.
- Merchant advance.
- Diaspora funding marketplace.
- Voice ordering.
- Night safety AI.
- Community delivery expansion.
