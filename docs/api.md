# HabeshaGo API

Base URL:

```text
http://localhost:4000
```

Country-aware routes use:

```text
/api/:country/v1
```

Examples: `/api/ET/v1`, `/api/KE/v1`, `/api/TZ/v1`.

## Public

- `GET /health`
- `GET /api/v1/countries`
- `GET /api/:country/v1/cities`
- `GET /api/:country/v1/merchants`
- `GET /api/:country/v1/merchants/:id`
- `GET /api/:country/v1/merchants/:id/products`

## Auth

- `POST /api/:country/v1/auth/register`
- `POST /api/:country/v1/auth/login`
- `POST /api/:country/v1/auth/refresh-token`

## Customer

- `GET /api/:country/v1/customers/profile`
- `PATCH /api/:country/v1/customers/profile`
- `GET /api/:country/v1/customers/orders`
- `GET /api/:country/v1/customers/wallet`

## Cart And Orders

- `GET /api/:country/v1/cart`
- `POST /api/:country/v1/cart/items`
- `PATCH /api/:country/v1/cart/items/:id`
- `DELETE /api/:country/v1/cart/items/:id`
- `POST /api/:country/v1/orders`
- `GET /api/:country/v1/orders/:id`
- `GET /api/:country/v1/orders/customer/:customerId`
- `PATCH /api/:country/v1/orders/:id/status`
- `POST /api/:country/v1/orders/:id/cancel`

## Driver

- `GET /api/:country/v1/drivers/available`
- `PATCH /api/:country/v1/drivers/status`
- `POST /api/:country/v1/drivers/:driverId/accept-order`
- `POST /api/:country/v1/drivers/:driverId/reject-order`
- `POST /api/:country/v1/drivers/:driverId/picked-up`
- `POST /api/:country/v1/drivers/:driverId/delivered`
- `GET /api/:country/v1/drivers/:driverId/earnings`
- `GET /api/:country/v1/drivers/:driverId/float-account`

## Wallet

- `GET /api/:country/v1/wallet`
- `GET /api/:country/v1/wallet/transactions`
- `POST /api/:country/v1/wallet/admin-adjustment`

## Admin

- `GET /api/:country/v1/admin/orders`
- `GET /api/:country/v1/admin/customers`
- `GET /api/:country/v1/admin/drivers`
- `GET /api/:country/v1/admin/merchants`
- `GET /api/:country/v1/admin/wallet-transactions`
- `GET /api/:country/v1/admin/driver-float`
- `PATCH /api/:country/v1/admin/orders/:id/status`
- `PATCH /api/:country/v1/admin/drivers/:id/freeze`
- `PATCH /api/:country/v1/admin/merchants/:id/status`
- `GET /api/:country/v1/admin/reports`

## Future Feature Placeholders

- `POST /api/:country/v1/voice/command`
- `POST /api/:country/v1/referrals/voice`
- `POST /api/:country/v1/community-delivery/join`
- `GET /api/:country/v1/neighborhoods/:id/merchants`
- `POST /api/:country/v1/address/verify`
- `POST /api/:country/v1/senior/accounts`
- `POST /api/:country/v1/child-delivery/create`
- `POST /api/:country/v1/night-safety/start`
- `POST /api/:country/v1/marketplace/items`
- `GET /api/:country/v1/feed`
