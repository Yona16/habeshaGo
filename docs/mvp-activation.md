# MVP Activation Status

## Active Local Portals

- Public SEO site: `http://localhost:3000/`
- Customer app: `http://localhost:3000/app`
- Customer static app: `http://localhost:8080` or fallback `http://localhost:8085`
- Merchant Portal: `http://localhost:3000/merchant`
- Admin Portal: `http://localhost:3000/admin`

The Merchant Portal is connected to local APIs for merchant signup/login, profile update, product creation/edit/delete, image URL, price/inventory/availability update, incoming orders, accept/reject, preparation status, driver request, backend wallet/payout summary, and support tickets.

The Admin Portal is connected to local APIs for admin login, customer management, merchant approval, driver approval, order monitoring, dummy payment review, city/neighborhood data, commission settings, support tickets, audit logs, feature flags, safety/trust controls, payment-provider readiness, and production launch gate visibility.

## Active Local Real-Time Features

- Server-sent events for order, dispatch, notification, menu request, and driver location updates.
- Simulated real-time driver coordinates under `/api/ET/v1/locations/live`.
- Driver location update endpoint for the driver app: `POST /api/ET/v1/drivers/location`.
- Local map display in the customer app showing customer, merchant, and moving driver markers.

## Provider Roadmap

- Payments: Telebirr, CBE Birr, Chapa, and SantimPay are represented as planned integrations with dummy payment/audit flows only.
- Maps: OpenStreetMap is the planned first production map provider. The current local app uses stored coordinates and simulated movement.
- Address intelligence: Ethiopia neighborhood and landmark intelligence should start with Bole pilot data, then grow through validated merchant/customer/driver feedback.

## Production Replacement Roadmap

- Replace local static pages with React/Next.js when moving from MVP demo to production UI.
- Replace local JSON storage with PostgreSQL repositories, migrations, transactions, backups, and restore drills.
- Replace local sessions with production JWT access tokens, refresh-token rotation, device/session tracking, password reset, and admin MFA.
- Move secrets to a managed secret store and use `backend/.env.production.example` only as a template.
- Add real provider webhook verification, settlement reconciliation, refund review, wallet/payment audit controls, and observability before public launch.
