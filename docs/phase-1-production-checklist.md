# HabeshaGo Phase 1 Production Checklist

This checklist is the required path from local demo to controlled internal pilot. The current app is a working local MVP, but public launch must stay blocked until the critical items below are implemented and reviewed.

## Current Status

- Customer, merchant, driver, and admin web portals are active locally.
- Local demo order flow works from customer checkout through merchant preparation, driver delivery, wallet audit, and admin monitoring.
- PostgreSQL schema, seed data, Docker Compose, environment templates, SEO/PWA files, smoke tests, and production launch-gate endpoints exist.
- The dependency-free demo server still uses `backend/data/local-store.json` for local testing.
- Payments, SMS, provider webhooks, and real payouts are simulated only.

## Critical Blockers Before Real Customers

1. PostgreSQL must be the runtime source of truth.
2. Authentication must use production JWT access tokens, refresh-token rotation, password reset, verification, session expiration, logout invalidation, and admin MFA.
3. Wallet balances must only change through immutable wallet transactions and reconciliation workflows.
4. Payment providers must use approved provider credentials, signed webhooks, refund controls, and finance audit ownership.
5. Production must run behind HTTPS with restricted CORS, rate limiting, Helmet/security headers, input validation, and monitored logs.
6. Legal/compliance approval must be complete for wallet, driver float, cash reconciliation, merchant agreements, driver agreements, customer terms, privacy, refunds, and payment-provider operations.

## Required Database Scope

The production database must persist, migrate, index, back up, and restore at least:

- `users`
- `customers`
- `merchants`
- `drivers`
- `products`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_status_history`
- `payments`
- `wallet_accounts`
- `wallet_transactions`
- `payouts`
- `customer_addresses`
- `support_tickets`
- `audit_logs`
- `feature_flags`

The schema includes these tables or equivalents. Runtime repositories still need to replace local JSON/demo storage.

## Backup And Restore Plan

- Use managed PostgreSQL automated daily backups with point-in-time recovery.
- Keep at least 7 daily backups and 4 weekly backups for the controlled pilot.
- Run a restore drill before pilot launch and after every major schema migration.
- Store restore instructions with environment owner, database hostname, backup retention, restore target, and verification query.
- Verify restored data by checking users, orders, wallet transactions, payments, and audit logs.
- Never run destructive migrations without a tested rollback plan and recent backup.

## Order Lifecycle Requirement

Every order status change must create:

- An `order_status_history` row.
- An `audit_logs` row.
- A notification event.

Allowed Phase 1 statuses:

- `PLACED`
- `ACCEPTED`
- `REJECTED`
- `PREPARING`
- `READY_FOR_PICKUP`
- `DRIVER_REQUESTED`
- `DRIVER_ASSIGNED`
- `PICKED_UP`
- `ON_THE_WAY`
- `DELIVERED`
- `CANCELLED`
- `REFUNDED`

## Wallet Ledger Requirement

Wallet records must be ledger based:

- No direct balance edits from normal app actions.
- Every credit/debit must have a wallet transaction.
- Every admin adjustment must include reason, actor, timestamp, currency, and audit log.
- Reconciliation reports must compare payments, order totals, merchant payouts, driver earnings, and wallet transactions.

Each transaction needs:

- `wallet_id`
- `user_id`
- `order_id`
- `type`
- `amount`
- `currency`
- `status`
- `reason`
- `created_at`
- `created_by`

## Payment Policy

Controlled pilot may use:

- Cash on Delivery
- Simulated Telebirr
- Simulated CBE Birr
- Simulated Chapa
- Simulated SantimPay

Public production requires real provider contracts, credentials, signed webhook verification, refund workflows, settlement reports, reconciliation, monitoring, and legal/provider approval.

## Frontend Acceptance

All four frontends must:

- Use environment-based API base URL: local `http://localhost:4000/api/ET/v1`, production `https://api.habeshago.com/api/ET/v1`.
- Keep private dashboards `noindex,nofollow`.
- Show loading, success, and error states for every action.
- Hide raw JSON inside a Debug panel only.
- Avoid blank maps and never create Leaflet markers from undefined coordinates.
- Keep refresh buttons connected to live backend data.

## Testing Minimum

Before controlled pilot, automated tests must cover:

- Auth and role permissions.
- Customer cart and order placement.
- Merchant accept/reject/preparing/ready/request-driver.
- Driver request acceptance, pickup, on-the-way, delivered.
- Admin approval, monitoring, refund review, wallet audit, feature flags, and support tickets.
- Payment simulation and wallet ledger.
- Map coordinate validation.
- API error handling and refresh buttons.

## Observability Minimum

Production must include:

- Structured API request logs.
- Error tracking.
- Payment logs.
- Wallet audit logs.
- Admin action logs.
- Health checks.
- Uptime monitoring.
- Alerts for failed payments, failed webhooks, elevated errors, high latency, and database issues.

## Deployment Minimum

- Dockerfile for backend.
- Docker Compose for local backend/PostgreSQL.
- Production environment variables and secrets manager.
- Managed PostgreSQL.
- HTTPS/domain routing for `www`, `app`, `merchant`, `driver`, `admin`, and `api`.
- CI/CD pipeline.
- Rollback plan.
- Backup/restore runbook.

## Do Not Add To Phase 1

Keep these disabled until the Phase 1 food/grocery/delivery platform is stable:

- Ride hailing.
- Hotel booking.
- Bus tickets.
- Merchant lending.
- Buy now pay later.
- Diaspora funding marketplace.
- Social feed.
- AI marketplace.
- Voice ordering.

## Launch Decision

Current status: local demo / prototype.

After PostgreSQL runtime persistence, auth hardening, wallet/payment controls, maps/dispatch reliability, testing, monitoring, deployment, and legal review: controlled internal pilot.

After real provider approvals, security review, legal sign-off, operational staffing, and rollback readiness: limited public launch.
