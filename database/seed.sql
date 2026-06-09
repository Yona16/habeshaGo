INSERT INTO countries (id, name, currency, timezone) VALUES
('ET', 'Ethiopia', 'ETB', 'Africa/Addis_Ababa'),
('KE', 'Kenya', 'KES', 'Africa/Nairobi'),
('TZ', 'Tanzania', 'TZS', 'Africa/Dar_es_Salaam'),
('UG', 'Uganda', 'UGX', 'Africa/Kampala'),
('RW', 'Rwanda', 'RWF', 'Africa/Kigali'),
('SS', 'South Sudan', 'SSP', 'Africa/Juba')
ON CONFLICT DO NOTHING;

INSERT INTO languages (id, country_id, name, local_name) VALUES
('am', 'ET', 'Amharic', 'Amharic'),
('en', 'ET', 'English', 'English'),
('om', 'ET', 'Oromo', 'Afaan Oromo'),
('ti', 'ET', 'Tigrinya', 'Tigrinya'),
('sw', 'KE', 'Swahili', 'Kiswahili'),
('lg', 'UG', 'Luganda', 'Luganda'),
('rw', 'RW', 'Kinyarwanda', 'Kinyarwanda'),
('ar', 'SS', 'Arabic', 'Arabic'),
('jub', 'SS', 'Juba Arabic', 'Juba Arabic')
ON CONFLICT DO NOTHING;

INSERT INTO currencies (code, country_id, name, symbol) VALUES
('ETB', 'ET', 'Ethiopian Birr', 'Br'),
('KES', 'KE', 'Kenyan Shilling', 'KSh'),
('TZS', 'TZ', 'Tanzanian Shilling', 'TSh'),
('UGX', 'UG', 'Ugandan Shilling', 'USh'),
('RWF', 'RW', 'Rwandan Franc', 'RF'),
('SSP', 'SS', 'South Sudanese Pound', 'SSP')
ON CONFLICT DO NOTHING;

INSERT INTO cities (country_id, name, launch_phase, active, currency, language, timezone) VALUES
('ET', 'Addis Ababa', 1, true, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Bole', 1, true, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Adama', 2, false, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Bahir Dar', 2, false, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Hawassa', 2, false, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Dire Dawa', 2, false, 'ETB', 'am', 'Africa/Addis_Ababa'),
('ET', 'Mekelle', 2, false, 'ETB', 'ti', 'Africa/Addis_Ababa'),
('ET', 'Gondar', 2, false, 'ETB', 'am', 'Africa/Addis_Ababa'),
('KE', 'Nairobi', 3, false, 'KES', 'sw', 'Africa/Nairobi'),
('TZ', 'Dar es Salaam', 3, false, 'TZS', 'sw', 'Africa/Dar_es_Salaam'),
('UG', 'Kampala', 3, false, 'UGX', 'en', 'Africa/Kampala'),
('RW', 'Kigali', 3, false, 'RWF', 'rw', 'Africa/Kigali'),
('SS', 'Juba', 3, false, 'SSP', 'en', 'Africa/Juba');

INSERT INTO roles (name) VALUES ('admin'), ('customer'), ('driver'), ('merchant') ON CONFLICT DO NOTHING;

INSERT INTO users (country_id, city_id, currency, language, timezone, role, name, email, phone, password_hash, status)
SELECT 'ET', c.id, 'ETB', 'en', 'Africa/Addis_Ababa', v.role, v.name, v.email, v.phone, crypt(v.password, gen_salt('bf')), 'active'
FROM (
  VALUES
    ('customer', 'Test Customer', 'customer@test.com', '+251900000012', 'Customer123!'),
    ('merchant', 'Test Merchant', 'merchant@test.com', '+251900000013', 'Merchant123!'),
    ('driver', 'Test Driver', 'driver@test.com', '+251900000014', 'Driver123!'),
    ('admin', 'Test Admin', 'admin@test.com', '+251900000011', 'Admin123!')
) AS v(role, name, email, phone, password)
CROSS JOIN LATERAL (
  SELECT id FROM cities WHERE country_id = 'ET' AND name = 'Bole' ORDER BY created_at LIMIT 1
) c
ON CONFLICT (email) DO NOTHING;

INSERT INTO feature_flags (key, enabled, legal_hold, description) VALUES
('DRIVER_AGENT_ENABLED', false, true, 'Driver agent cash-in/cash-out must wait for compliance approval.'),
('MERCHANT_ADVANCE_ENABLED', false, true, 'Merchant advance product is disabled until legal approval.'),
('DIASPORA_FUNDING_ENABLED', false, true, 'Diaspora merchant funding marketplace is disabled until legal approval.'),
('CROSS_BORDER_WALLET_ENABLED', false, true, 'Cross-border wallet transfer is disabled until legal approval.'),
('SOCIAL_FEED_ENABLED', false, false, 'Yene Guzo feed placeholder.'),
('VOICE_ORDERING_ENABLED', false, false, 'Tenagn voice ordering placeholder.'),
('NIGHT_SAFETY_ENABLED', false, false, 'Mesewa night safety mode placeholder.'),
('CHILD_DELIVERY_ENABLED', false, false, 'Lijoch child delivery placeholder.')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;
