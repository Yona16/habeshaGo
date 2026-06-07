# Business Rules

- Customer cancellation is allowed only while an order is `placed`.
- Merchant rejection must include an operational reason in status history.
- Driver rejection is allowed and tracked separately from merchant rejection.
- Admin can override order status, but every override must write an audit log.
- Commission rules must support country, city, merchant, and category scope.
- Delivery fee rules must support country, city, distance, and service type.
- Cash-on-delivery must be recorded and reconciled against driver cash transactions.
- Wallet transactions are immutable ledger entries; corrections are new adjustment entries.
- Driver float and cash collected are separate balances.
- Merchant payouts and driver payouts are separate payout types.
- Merchant advance, diaspora funding, driver-agent cash, and cross-border wallet features stay disabled until legal approval.
- Child delivery requires a guardian account, PIN confirmation, and guardian notifications.
- Night safety requires trusted driver workflow, emergency contact support, and delivery PIN.
- Senior mode is optional, privacy-respecting, and supports family notification.
- Voice ordering must repeat and confirm final basket, total, address, and payment method before placement.
- Offline orders require an idempotent client operation id to prevent duplicates.
