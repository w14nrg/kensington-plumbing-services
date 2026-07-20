PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  postcode TEXT,
  page_path TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  issue_text TEXT NOT NULL,
  job_code TEXT NOT NULL,
  job_name TEXT NOT NULL,
  category TEXT NOT NULL,
  estimate_min INTEGER NOT NULL,
  estimate_max INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  active_leak INTEGER NOT NULL DEFAULT 0,
  access_level TEXT,
  postcode TEXT,
  reasoning_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  estimate_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  postcode TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  estimate_id TEXT,
  checkout_reference TEXT UNIQUE NOT NULL,
  sumup_checkout_id TEXT,
  hosted_checkout_url TEXT,
  amount REAL NOT NULL DEFAULT 75,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  payment_id TEXT,
  lead_id TEXT,
  preferred_date TEXT NOT NULL,
  preferred_window TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS ken_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_estimates_session ON estimates(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_estimate ON leads(estimate_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(checkout_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON bookings(payment_id);
