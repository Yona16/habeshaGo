CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE countries (
  id text PRIMARY KEY,
  name text NOT NULL,
  currency text NOT NULL,
  timezone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE languages (
  id text PRIMARY KEY,
  country_id text REFERENCES countries(id),
  name text NOT NULL,
  local_name text NOT NULL
);

CREATE TABLE currencies (
  code text PRIMARY KEY,
  country_id text REFERENCES countries(id),
  name text NOT NULL,
  symbol text NOT NULL
);

CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  name text NOT NULL,
  launch_phase int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT false,
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  role text NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  frozen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  account_type text NOT NULL DEFAULT 'standard',
  senior_mode boolean NOT NULL DEFAULT false,
  family_account boolean NOT NULL DEFAULT false
);

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  label text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  landmark text,
  building_name text,
  woreda text,
  sub_city text,
  gate_color text,
  nearby_place text,
  driver_notes text,
  customer_notes text,
  address_confidence_score numeric(5,2) DEFAULT 0
);

CREATE TABLE merchant_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  name text NOT NULL
);

CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id uuid REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  category_id uuid REFERENCES merchant_categories(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  women_owned boolean NOT NULL DEFAULT false,
  commission_rate numeric(6,4) NOT NULL DEFAULT 0.1200,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE merchant_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  address_note text,
  latitude numeric(10,7),
  longitude numeric(10,7)
);

CREATE TABLE merchant_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  day_of_week int NOT NULL,
  opens_at time,
  closes_at time,
  closed boolean NOT NULL DEFAULT false
);

CREATE TABLE product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  name text NOT NULL
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  category_id uuid REFERENCES product_categories(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  available boolean NOT NULL DEFAULT true
);

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id uuid NOT NULL REFERENCES carts(id),
  product_id uuid NOT NULL REFERENCES products(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL
);

CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  online boolean NOT NULL DEFAULT false,
  frozen boolean NOT NULL DEFAULT false,
  safety_score numeric(5,2) NOT NULL DEFAULT 100,
  badge_level text
);

CREATE TABLE driver_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  document_type text NOT NULL,
  storage_key text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE driver_float_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid UNIQUE NOT NULL REFERENCES drivers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE driver_cash_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  amount numeric(12,2) NOT NULL,
  transaction_type text NOT NULL,
  reconciliation_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  driver_id uuid REFERENCES drivers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'placed',
  subtotal numeric(12,2) NOT NULL,
  delivery_fee numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  cash_on_delivery boolean NOT NULL DEFAULT false,
  address_note text,
  offline_client_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  quantity int NOT NULL,
  unit_price numeric(12,2) NOT NULL
);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'offered',
  zone_id uuid,
  accepted_at timestamptz
);

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  provider text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  provider text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  external_reference text
);

CREATE TABLE wallet_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  UNIQUE (user_id, currency)
);

CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_account_id uuid NOT NULL REFERENCES wallet_accounts(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  amount numeric(12,2) NOT NULL,
  transaction_type text NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  merchant_id uuid REFERENCES merchants(id),
  category_id uuid REFERENCES merchant_categories(id),
  rate numeric(6,4) NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payee_user_id uuid NOT NULL REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  amount numeric(12,2) NOT NULL,
  payout_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text
);

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal'
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id uuid REFERENCES users(id),
  country_id text REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text,
  language text,
  timezone text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id text NOT NULL REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text NOT NULL,
  language text NOT NULL,
  timezone text NOT NULL,
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  provider text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  country_id text REFERENCES countries(id),
  city_id uuid REFERENCES cities(id),
  currency text,
  language text,
  timezone text,
  enabled boolean NOT NULL DEFAULT false,
  legal_hold boolean NOT NULL DEFAULT true,
  description text
);

CREATE TABLE merchant_advance_requests (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE merchant_advance_offers (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE merchant_advance_repayments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE merchant_risk_scores (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), merchant_id uuid REFERENCES merchants(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, score numeric(5,2));
CREATE TABLE diaspora_users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES users(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, legal_country text);
CREATE TABLE merchant_funding_campaigns (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), merchant_id uuid REFERENCES merchants(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE funding_contributions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE funding_repayments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE social_feed_posts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE trust_verifications (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, entity_type text, status text DEFAULT 'pending');
CREATE TABLE driver_badges (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), driver_id uuid REFERENCES drivers(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, badge text);
CREATE TABLE driver_leaderboards (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, period text, score numeric(12,2));
CREATE TABLE voice_commands (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES users(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, command_text text, status text DEFAULT 'captured');
CREATE TABLE voice_referrals (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES users(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'pending');
CREATE TABLE community_deliveries (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'forming');
CREATE TABLE neighborhood_zones (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, name text NOT NULL);
CREATE TABLE senior_accounts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id uuid REFERENCES customers(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, priority_support boolean DEFAULT true);
CREATE TABLE child_delivery_profiles (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), guardian_customer_id uuid REFERENCES customers(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'feature_flagged');
CREATE TABLE night_safety_sessions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), order_id uuid REFERENCES orders(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'monitoring');
CREATE TABLE women_owned_business_verifications (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), merchant_id uuid REFERENCES merchants(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'pending');
CREATE TABLE hyperlocal_marketplace_items (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, seller_user_id uuid REFERENCES users(id), name text, quantity int);
CREATE TABLE address_landmarks (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, name text, latitude numeric(10,7), longitude numeric(10,7));
CREATE TABLE address_verifications (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), address_id uuid REFERENCES customer_addresses(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, status text DEFAULT 'pending');
CREATE TABLE offline_sync_queue (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES users(id), country_id text REFERENCES countries(id), city_id uuid REFERENCES cities(id), currency text, language text, timezone text, client_operation_id text UNIQUE, payload jsonb NOT NULL, status text DEFAULT 'queued');

CREATE INDEX idx_users_country_city ON users(country_id, city_id);
CREATE INDEX idx_merchants_country_city ON merchants(country_id, city_id);
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_orders_status ON orders(country_id, city_id, status);
CREATE INDEX idx_wallet_transactions_account ON wallet_transactions(wallet_account_id, created_at);
