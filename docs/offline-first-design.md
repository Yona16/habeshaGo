# Birr Abay Offline-First Design

Mobile apps should use local SQLite for:

- Session profile cache.
- Countries, cities, merchants, products, and payment options.
- Active cart.
- Offline order queue.
- Delivery assignment queue for drivers.
- SMS fallback logs.

Each offline operation should include:

- `client_operation_id`
- country and city context
- user id
- payload hash
- created timestamp
- retry count

The server must process sync operations idempotently to avoid duplicate orders when mobile internet returns.
