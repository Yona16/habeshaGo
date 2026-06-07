# Fintech Compliance Notes

HabeshaGo is not a bank. This build includes only the technical foundation for wallet accounts, wallet transactions, driver float, cash reconciliation, refunds, payouts, and audit logs.

The following must remain disabled until legal review is complete:

- Merchant advances.
- Diaspora merchant funding.
- Cross-border wallet transfers.
- Driver agent cash-in/cash-out.
- Investment or lending products.

Every financial mutation must create an immutable ledger entry and an audit log. Admin corrections should never update historical transactions in place.
