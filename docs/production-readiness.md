# Production Readiness

HabeshaGo is ready for local product demos and workflow validation. It is not ready for real customer production launch yet.

## Current Ready Areas

- Local browser app for customer, merchant, driver, and admin workflows.
- Standalone Merchant Portal at `/merchant` connected to local merchant APIs.
- Standalone Admin Portal at `/admin` connected to local admin APIs.
- Role-based signup and login for local testing.
- Nearby restaurant, cafe, supermarket, and driver discovery.
- Simulated real-time driver location events and local map markers.
- Sample cart, order placement, live order tracking, and food-ready notifications.
- Dummy payment records, simulated SMS logs, sample map/ETA quotes, compliance gates, and legal holds.
- End-to-end live demo from order placed to delivered.

## Production Blockers

- Replace local JSON persistence with PostgreSQL-backed API storage, migrations, transactions, backups, and restore testing.
- Harden authentication with refresh tokens, password reset, MFA for admin, device/session tracking, rate limiting, and secure secrets.
- Integrate real payment providers such as Telebirr, Chapa, and future M-Pesa, including webhooks, refunds, settlement, reconciliation, and audit trails.
- Integrate Ethiopia payment providers Telebirr, CBE Birr, Chapa, and SantimPay with webhook signature verification, settlement reports, refund controls, and finance audit ownership.
- Integrate real SMS and push providers with retries, delivery receipts, notification preferences, and opt-out support.
- Replace sample distance math with production maps, geocoding, routing, ETA, and dispatch optimization.
- Add OpenStreetMap/Nominatim first, then validated Ethiopia landmark, neighborhood, and local-address intelligence.
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

## Local Production-Readiness Runbook

Start the local validation server:

```powershell
cd backend
node src/demoServer.js
```

Open the app:

```text
http://localhost:3000/
http://localhost:3000/app
```

Run the smoke test from another terminal:

```powershell
cd backend
node scripts/smoke-test.js
```

The local smoke test verifies the web app, health endpoint, launch gate, nearby merchant search, customer login, sample cart, and order placement.

## Launch Gate

The app exposes a production launch gate:

```text
GET /ready
GET /api/ET/v1/launch-gate
```

In `APP_MODE=local-demo`, the gate intentionally returns blocked/not ready. That is correct. For a real production launch, `APP_MODE=production` is not enough by itself. The following production environment values and operational approvals must exist:

- `DATABASE_URL`
- `JWT_SECRET`
- `PAYMENT_PROVIDER_MODE`
- `SMS_PROVIDER_MODE`
- `MAPS_PROVIDER_MODE`
- `PUSH_PROVIDER_MODE`
- `LEGAL_APPROVAL_REFERENCE`

Production must also clear critical and high-severity readiness checks for database, authentication, payments, SMS/push, maps, compliance, security, mobile apps, observability, testing, and deployment.

## Current Practical Status

Use this version for local testing, stakeholder demos, and a controlled internal pilot with fake money. Do not use it for real customer orders, real payment collection, real driver payouts, or legal/financial transactions until the launch gate passes with real providers, audited infrastructure, and documented legal approval.
