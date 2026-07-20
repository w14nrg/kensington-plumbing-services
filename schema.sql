CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  issue_text TEXT NOT NULL,
  job_code TEXT NOT NULL,
  job_name TEXT NOT NULL,
  estimate_min INTEGER NOT NULL,
  estimate_max INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  access_level TEXT,
  postcode TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  estimate_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  postcode TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  estimate_id TEXT,
  checkout_reference TEXT UNIQUE NOT NULL,
  sumup_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  payment_id TEXT,
  preferred_date TEXT NOT NULL,
  preferred_window TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_ref ON payments(checkout_reference);
