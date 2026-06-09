# HabeshaGo

HabeshaGo is an Ethiopia-led East Africa super app foundation for food, grocery, courier, pharmacy, wallet, driver agents, merchant tools, diaspora ordering, safety workflows, and future regional expansion.

This first build gives you a runnable backend foundation, PostgreSQL schema, seed data, Docker setup, web portal placeholders, Flutter app placeholders, and product/architecture docs.

## What Is Included

- Node.js + Express REST API with JWT auth, bcrypt password hashing, RBAC, validation, rate limiting, and security middleware.
- Multi-country API routing using `/api/:country/v1/...`.
- Seeded support for Ethiopia, Kenya, Tanzania, Uganda, Rwanda, and South Sudan.
- Merchant, product, cart, order, driver, wallet ledger, admin, and feature flag modules.
- Placeholder endpoints for Tenagn, Birr Abay, Yene Guzo, Sened, Ende Guzo, Seb Seb, Kelemat, Chewata, Lijoch, Mesewa, Weynos, Gasha, Almaz, diaspora, and regulated fintech features.
- PostgreSQL schema with launch tables and future placeholder tables.
- Docker-ready local stack.

## Quick Start

Backend API:

```bash
cd C:\habeshaGo\backend
npm install
node src\server.js
```

Dependency-free local demo backend:

```bash
cd C:\habeshaGo
set PORT=4000
node backend\src\demoServer.js
```

Local apps:

```text
Backend API: http://localhost:4000
Customer App: http://localhost:8080 or fallback http://localhost:8085
Admin Portal: http://localhost:8081
Merchant Portal: http://localhost:8082
API base URL: http://localhost:4000/api/ET/v1
```

Static app commands:

```bash
cd C:\habeshaGo\web\app
python -m http.server 8085

cd C:\habeshaGo\web\admin
python -m http.server 8081

cd C:\habeshaGo\web\merchant
python -m http.server 8082
```

This exposes a local browser MVP for customer ordering, real-time live updates, customer special menu requests, merchant order flow, driver dispatch requests, driver pickup/delivery flow, admin reporting, dummy payments, simulated SMS logs, map/ETA quotes, wallet adjustment, feature flags, and legal/compliance gates.

The local server persists test data to:

```text
backend/data/local-store.json
```

## Local Simulation Boundaries

- Dummy payments record provider/status only. No real money moves.
- SMS messages are logged with `SIMULATED_SMS`; no SMS is sent.
- Map estimates use sample coordinates and distance math, not Google Maps billing/API calls.
- Real-time updates use server-sent events for local testing. Production should use managed WebSockets/SSE infrastructure with auth, fanout, retries, and observability.
- Legal-hold features remain blocked in feature flags and compliance reviews.
- This is suitable for local product testing, demos, and engineering iteration, not real customer launch.

## End-To-End Local Test Flow

1. Login as `Customer`, add menu items, send a special menu request, quote ETA/fee, and place an order.
2. Login as `Merchant`, accept the order, mark it preparing, mark it ready, then request a driver.
3. Login as `Driver`, accept the available driver request, mark picked up, then mark delivered.
4. Login as `Admin`, review orders, dummy payments, SMS logs, compliance gates, and reports.

The browser listens for live events from:

```text
http://localhost:4000/api/ET/v1/events
```

Full Express API:

```bash
cd C:\habeshaGo\backend
cp .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:4000/health
```

Demo accounts:

```text
admin@habeshago.local / Admin123!
customer@habeshago.local / Customer123!
driver@habeshago.local / Driver123!
merchant@habeshago.local / Merchant123!
```

## Docker

```bash
cd C:\habeshaGo
docker compose up --build
```

The API starts on port `4000`, and PostgreSQL starts on port `5432`.

## Important Compliance Position

Ye HabeshaGo Bank is only a technical foundation. Lending, merchant advances, diaspora funding, cross-border transfers, and driver-agent cash services are behind feature flags and legal holds.

## First API Calls

```bash
curl http://localhost:4000/api/v1/countries
curl http://localhost:4000/api/ET/v1/cities
curl http://localhost:4000/api/ET/v1/merchants
```

Login:

```bash
curl -X POST http://localhost:4000/api/ET/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customer@habeshago.local\",\"password\":\"Customer123!\"}"
```

Use the returned token as `Authorization: Bearer <token>` for customer, cart, order, wallet, driver, and admin endpoints.
