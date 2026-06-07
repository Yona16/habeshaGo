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

Immediate dependency-free demo API:

```bash
cd outputs/habeshago/backend
node src/demoServer.js
```

This exposes a lightweight runnable subset for `/health`, countries, cities, merchants, merchant products, demo login, order creation, and feature flags.

Full Express API:

```bash
cd outputs/habeshago/backend
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
cd outputs/habeshago
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
