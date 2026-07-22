-- KEN INSIGHTS V10
-- Run this entire file once in Cloudflare:
-- Storage & databases > D1 > kensington-ken > Console

CREATE TABLE IF NOT EXISTS ken_sessions (
  session_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_page TEXT,
  last_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  visitor_country TEXT,
  visitor_city TEXT,
  stage TEXT NOT NULL DEFAULT 'conversation',
  job_code TEXT,
  job_name TEXT,
  estimate_id TEXT,
  estimate_min INTEGER,
  estimate_max INTEGER,
  confidence_score INTEGER,
  lead_id TEXT,
  reservation_id TEXT,
  payment_id TEXT,
  booking_id TEXT,
  last_user_message TEXT,
  last_assistant_message TEXT,
  message_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ken_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  page_path TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ken_notification_log (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ken_sessions_started
  ON ken_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_ken_sessions_activity
  ON ken_sessions(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_ken_sessions_stage
  ON ken_sessions(stage);

CREATE INDEX IF NOT EXISTS idx_ken_sessions_booking
  ON ken_sessions(booking_id);

CREATE INDEX IF NOT EXISTS idx_ken_events_session
  ON ken_events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ken_events_type
  ON ken_events(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_ken_notifications_session
  ON ken_notification_log(session_id, created_at);
