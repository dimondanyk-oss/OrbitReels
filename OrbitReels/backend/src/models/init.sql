CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  usdt_balance NUMERIC(12,2) DEFAULT 0,
  coin_balance BIGINT DEFAULT 0,
  total_usdt_earned NUMERIC(12,2) DEFAULT 0,
  total_coin_earned BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tariffs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_usdt NUMERIC(8,2) NOT NULL,
  paid_reels_daily INT NOT NULL,
  ad_limit_daily INT NOT NULL,
  sub_limit_daily INT NOT NULL,
  min_withdrawal_usdt NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  tariff_id INT REFERENCES tariffs(id),
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  paid_reels_used_today INT DEFAULT 0,
  ads_used_today INT DEFAULT 0,
  subs_used_today INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS content_reels (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  embed_code TEXT,
  duration_required INT DEFAULT 10,
  reward_usdt NUMERIC(8,4) DEFAULT 0.01,
  reward_coin INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watch_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  reel_id BIGINT REFERENCES content_reels(id),
  session_token UUID DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'started',
  ended_at TIMESTAMPTZ,
  client_duration INT,
  reward_usdt NUMERIC(8,4),
  reward_coin INT
);

CREATE TABLE IF NOT EXISTS ads (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  embed_url TEXT,
  redirect_url TEXT,
  duration_required INT DEFAULT 15,
  reward_usdt NUMERIC(8,4) DEFAULT 0.02,
  reward_coin INT DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscription_channels (
  id BIGSERIAL PRIMARY KEY,
  channel_username VARCHAR(255) NOT NULL,
  reward_usdt NUMERIC(8,4) DEFAULT 0.05,
  reward_coin INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  channel_id BIGINT REFERENCES subscription_channels(id),
  status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT REFERENCES users(id),
  referred_id BIGINT REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'verified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS referral_tasks (
  id SERIAL PRIMARY KEY,
  count_required INT NOT NULL,
  reward_usdt NUMERIC(8,4) NOT NULL,
  reward_coin INT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_referral_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  task_id INT REFERENCES referral_tasks(id),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  amount NUMERIC(12,4) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  amount_usdt NUMERIC(12,2) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  tx_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  tariff_id INT REFERENCES tariffs(id),
  amount_usdt NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  status VARCHAR(20) DEFAULT 'pending',
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

INSERT INTO tariffs (name, price_usdt, paid_reels_daily, ad_limit_daily, sub_limit_daily, min_withdrawal_usdt) VALUES
('Бесплатный', 0, 10, 2, 1, NULL),
('Старт', 3, 30, 5, 3, 100),
('Про', 10, 100, 15, 10, 200),
('Премиум', 30, 300, 40, 25, 500),
('Ультра', 50, 500, 60, 40, 1000)
ON CONFLICT DO NOTHING;

INSERT INTO referral_tasks (count_required, reward_usdt, reward_coin) VALUES
(1, 0.02, 3),
(5, 0.10, 15),
(10, 0.20, 30),
(50, 1.00, 150)
ON CONFLICT DO NOTHING;