CREATE TABLE IF NOT EXISTS ken_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  job_code TEXT NOT NULL,
  job_name TEXT NOT NULL,
  estimate_min INTEGER NOT NULL,
  estimate_max INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  postcode TEXT,
  access_level TEXT,
  problem_summary TEXT,
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

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  estimate_id TEXT,
  lead_id TEXT,
  slot_key TEXT UNIQUE NOT NULL,
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'HELD',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  estimate_id TEXT,
  reservation_id TEXT,
  checkout_reference TEXT UNIQUE NOT NULL,
  sumup_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  reservation_id TEXT,
  lead_id TEXT,
  slot_key TEXT UNIQUE NOT NULL,
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON ken_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_estimates_session ON estimates(session_id);
CREATE INDEX IF NOT EXISTS idx_reservation_slot ON reservations(slot_key);
CREATE INDEX IF NOT EXISTS idx_reservation_status ON reservations(status,expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_reference ON payments(checkout_reference);
CREATE INDEX IF NOT EXISTS idx_booking_date ON bookings(appointment_date,start_time);
