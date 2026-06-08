# Production Readiness

HabeshaGo is ready for local product demos and workflow validation. It is not ready for real customer production launch yet.

## Current Ready Areas

- Local browser app for customer, merchant, driver, and admin workflows.
- Role-based signup and login for local testing.
- Nearby restaurant, cafe, supermarket, and driver discovery.
- Sample cart, order placement, live order tracking, and food-ready notifications.
- Dummy payment records, simulated SMS logs, sample map/ETA quotes, compliance gates, and legal holds.
- End-to-end live demo from order placed to delivered.

## Production Blockers

- Replace local JSON persistence with PostgreSQL-backed API storage, migrations, transactions, backups, and restore testing.
- Harden authentication with refresh tokens, password reset, MFA for admin, device/session tracking, rate limiting, and secure secrets.
- Integrate real payment providers such as Telebirr, Chapa, and future M-Pesa, including webhooks, refunds, settlement, reconciliation, and audit trails.
- Integrate real SMS and push providers with retries, delivery receipts, notification preferences, and opt-out support.
- Replace sample distance math with production maps, geocoding, routing, ETA, and dispatch optimization.
- Build full Flutter customer and driver apps with offline-first SQLite sync.
- Add observability: structured logs, metrics, traces, uptime monitors, alerts, and error tracking.
- Add automated tests: unit, integration, E2E, load, security, provider webhook, offline sync, and cash reconciliation tests.
- Complete legal/compliance review before enabling wallet, driver float expansion, merchant advances, diaspora funding, cross-border transfers, or child delivery programs.

## Recommended Production Roadmap

1. Build PostgreSQL repositories and migrations for every active local model.
2. Add integration tests for auth, cart, orders, dispatch, notifications, wallet, and admin flows.
3. Add production auth hardening and admin MFA.
4. Add provider abstraction implementations for payments, SMS, maps, and push.
5. Add CI/CD, Docker production image, deployment environments, and rollback plan.
6. Run internal pilot with fake money and controlled users.
7. Complete legal/compliance review.
8. Run limited Bole pilot with monitored operations and daily reconciliation.

## Launch Rule

Do not launch to real customers until all critical and high-severity readiness checks are cleared or explicitly accepted by the business, legal, and engineering owners.
