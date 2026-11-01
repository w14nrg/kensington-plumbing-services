import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../_worker.js";
import entryWorker from "../_worker-entry.js";

// A small Cloudflare D1 stand-in backed by a real SQLite database,
// laid out like the live KPS tables (leads already has an address column).
function makeD1({ failAlter = false } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE leads (id TEXT PRIMARY KEY, session_id TEXT, estimate_id TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, postcode TEXT, address TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE estimates (id TEXT PRIMARY KEY, session_id TEXT, issue_text TEXT NOT NULL, job_code TEXT NOT NULL, job_name TEXT NOT NULL, estimate_min INTEGER NOT NULL, estimate_max INTEGER NOT NULL, confidence TEXT NOT NULL, access_level TEXT, postcode TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE ken_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE reservations (id TEXT PRIMARY KEY, session_id TEXT, estimate_id TEXT, lead_id TEXT, slot_key TEXT UNIQUE NOT NULL, appointment_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'HELD', expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE payments (id TEXT PRIMARY KEY, lead_id TEXT, estimate_id TEXT, reservation_id TEXT, checkout_reference TEXT UNIQUE NOT NULL, sumup_checkout_id TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE bookings (id TEXT PRIMARY KEY, payment_id TEXT UNIQUE NOT NULL, reservation_id TEXT, lead_id TEXT, slot_key TEXT UNIQUE NOT NULL, appointment_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CONFIRMED', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  const d1 = {
    raw: db,
    prepare(sql) {
      let args = [];
      const st = {
        bind(...v) { args = v.map(x => (x === undefined ? null : x)); return st; },
        async first() {
          if (failAlter && /^ALTER/i.test(sql.trim())) throw new Error("D1_ERROR: simulated failure");
          return db.prepare(sql).get(...args) ?? null;
        },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() {
          if (failAlter && /^ALTER/i.test(sql.trim())) throw new Error("D1_ERROR: simulated failure");
          const r = db.prepare(sql).run(...args);
          return { meta: { changes: Number(r.changes) } };
        }
      };
      return st;
    }
  };
  return d1;
}

const customer = { name: "Melissa Test", phone: "07123456789", address: "1 Test Street", postcode: "w14 9bp", email: "" };
const post = (path, body, w = worker) => w.fetch(new Request(`https://www.kensington.biz${path}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
}), {});

async function postEnv(env, path, body, w = worker) {
  return w.fetch(new Request(`https://www.kensington.biz${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  }), env, { waitUntil() {} });
}
function cols(d1) { return d1.raw.prepare("PRAGMA table_info(leads)").all().map(c => c.name); }

test("direct booking saves the job type and description", async () => {
  const DB = makeD1(), env = { DB };
  const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_1", service: "Leak or pipework problem", details: "Water bills have tripled, think there is a leak somewhere" });
  assert.equal(r.status, 200);
  const { leadId } = await r.json();
  const row = DB.raw.prepare("SELECT * FROM leads WHERE id=?").get(leadId);
  assert.equal(row.job_category, "Leak or pipework problem");
  assert.match(row.job_details, /Water bills have tripled/);
  assert.equal(row.postcode, "W14 9BP");
});

test("missing job type is refused", async () => {
  const env = { DB: makeD1() };
  const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_2", service: "", details: "Leaking pipe under the kitchen sink" });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).field, "service");
});

test("empty or meaningless descriptions are refused, even on a direct call", async () => {
  for (const details of ["", "leak", "...", "help!!", "aaaa"]) {
    const env = { DB: makeD1() };
    const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_3", service: "Tap problem", details });
    assert.equal(r.status, 400, `should refuse "${details}"`);
    assert.equal((await r.json()).field, "details");
    assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM leads").get().n, 0);
  }
});

test("the automatic 'already agreed' note never counts as the description", async () => {
  const env = { DB: makeD1() };
  const refused = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_4", service: "Toilet problem", details: "", arrangedNote: "Appointment already agreed: Emergency call-out, 2026-11-03." });
  assert.equal(refused.status, 400);
  const ok = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_4", service: "Toilet problem", details: "Toilet keeps running after flushing", arrangedNote: "Appointment already agreed: Emergency call-out, 2026-11-03." });
  assert.equal(ok.status, 200);
  const row = env.DB.raw.prepare("SELECT job_details FROM leads").get();
  assert.match(row.job_details, /Toilet keeps running/);
  assert.match(row.job_details, /Emergency call-out/);
});

test("estimator bookings reuse what the customer told the estimator", async () => {
  const DB = makeD1(), env = { DB };
  DB.raw.prepare("INSERT INTO estimates (id,session_id,issue_text,job_code,job_name,estimate_min,estimate_max,confidence) VALUES ('est_1','session_abc','Kitchen tap dripping','tap','Repair dripping tap',95,190,'medium')").run();
  DB.raw.prepare("INSERT INTO ken_messages (id,session_id,role,content,created_at) VALUES ('m1','session_abc','user','My kitchen tap is dripping constantly','2026-11-01 10:00:00'),('m2','session_abc','assistant','From the spout?','2026-11-01 10:00:01'),('m3','session_abc','user','Yes from the spout','2026-11-01 10:00:02')").run();
  const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "session_abc", estimateId: "est_1" });
  assert.equal(r.status, 200);
  const row = DB.raw.prepare("SELECT job_category,job_details FROM leads").get();
  assert.equal(row.job_category, "Repair dripping tap");
  assert.match(row.job_details, /kitchen tap is dripping constantly/);
  assert.doesNotMatch(row.job_details, /From the spout\?/);
});

test("an estimator booking is never blocked, even if its chat or estimate was lost", async () => {
  const env = { DB: makeD1() };
  const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "session_lost" });
  assert.equal(r.status, 200);
  const row = env.DB.raw.prepare("SELECT job_category FROM leads").get();
  assert.equal(row.job_category, "Online estimator");
});

test("SumUp is never reached for a direct booking with no job information", async () => {
  const DB = makeD1();
  let sumupCalls = 0;
  const orig = globalThis.fetch;
  globalThis.fetch = async () => { sumupCalls++; return new Response(JSON.stringify({ id: "c1", hosted_checkout_url: "https://pay.example" }), { status: 200 }); };
  try {
    const env = { DB, SUMUP_API_KEY: "k", SUMUP_MERCHANT_CODE: "m" };
    // a lead row saved by the old code, with no job info
    DB.raw.prepare("INSERT INTO leads (id,session_id,name,phone,postcode,address) VALUES ('lead_old','direct_x','A','1','W14','x')").run();
    DB.raw.prepare("INSERT INTO reservations (id,lead_id,slot_key,appointment_date,start_time,end_time,status,expires_at) VALUES ('res_1','lead_old','s1','2026-11-03','08:00','11:00','HELD',datetime('now','+30 minutes'))").run();
    const r = await postEnv(env, "/api/checkout", { leadId: "lead_old", reservationId: "res_1" });
    assert.equal(r.status, 400);
    assert.equal(sumupCalls, 0);
  } finally { globalThis.fetch = orig; }
});

test("a proper direct booking still reaches SumUp for £75 with the same redirect", async () => {
  const DB = makeD1();
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response(JSON.stringify({ id: "c1", status: "PENDING", hosted_checkout_url: "https://pay.example/c1" }), { status: 200 }); };
  try {
    const env = { DB, SUMUP_API_KEY: "k", SUMUP_MERCHANT_CODE: "m" };
    const lead = await (await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_5", service: "Tap problem", details: "Bathroom tap will not turn off fully" })).json();
    DB.raw.prepare("INSERT INTO reservations (id,lead_id,slot_key,appointment_date,start_time,end_time,status,expires_at) VALUES ('res_2',?,'s2','2026-11-03','08:00','11:00','HELD',datetime('now','+30 minutes'))").run(lead.leadId);
    const r = await postEnv(env, "/api/checkout", { leadId: lead.leadId, reservationId: "res_2" });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).checkoutUrl, "https://pay.example/c1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.amount, 75);
    assert.equal(calls[0].body.currency, "GBP");
    assert.match(calls[0].body.redirect_url, /^https:\/\/www\.kensington\.biz\/ken-payment-return\?ref=KPS-/);
  } finally { globalThis.fetch = orig; }
});

test("the paid-booking email shows the job category and description", async () => {
  const DB = makeD1();
  const emails = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { emails.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: "e1" }), { status: 200 }); };
  try {
    const env = { DB, RESEND_API_KEY: "re", OWNER_EMAIL: "owner@example.com" };
    const lead = await (await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_6", service: "Leak or pipework problem", details: "Water bills have tripled, possible hidden leak" })).json();
    DB.raw.prepare("INSERT INTO reservations (id,lead_id,slot_key,appointment_date,start_time,end_time,status,expires_at) VALUES ('res_3',?,'s3','2026-11-03','08:00','11:00','HELD',datetime('now','+30 minutes'))").run(lead.leadId);
    DB.raw.prepare("INSERT INTO payments (id,lead_id,reservation_id,checkout_reference,status) VALUES ('pay_3',?,'res_3','KPS-3','PAID')").run(lead.leadId);
    const r = await worker.fetch(new Request("https://www.kensington.biz/api/payment-status?ref=KPS-3"), env);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).paid, true);
    assert.equal(emails.length, 1);
    assert.match(emails[0].subject, /PAID BOOKING: .* — Melissa Test — Leak or pipework problem/);
    assert.match(emails[0].text, /Job category: Leak or pipework problem/);
    assert.match(emails[0].text, /Job description: Water bills have tripled/);
    assert.doesNotMatch(emails[0].text, /Job: Not recorded/);
    assert.match(emails[0].html, /Job description/);
  } finally { globalThis.fetch = orig; }
});

test("the column change only adds two empty columns and keeps existing leads intact", async () => {
  const DB = makeD1(), env = { DB };
  DB.raw.prepare("INSERT INTO leads (id,session_id,name,phone,postcode,address) VALUES ('lead_keep','s','Old Customer','0700','W14','2 Old Road')").run();
  const before = DB.raw.prepare("SELECT id,session_id,estimate_id,name,phone,email,postcode,address,created_at FROM leads").all();
  await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_7", service: "Tap problem", details: "Kitchen tap dripping constantly" });
  await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_8", service: "Tap problem", details: "Kitchen tap dripping constantly again" });
  const c = cols(DB);
  assert.deepEqual(c.slice(-2), ["job_category", "job_details"]);
  assert.equal(c.filter(x => x === "job_category").length, 1);
  const after = DB.raw.prepare("SELECT id,session_id,estimate_id,name,phone,email,postcode,address,created_at FROM leads WHERE id='lead_keep'").all();
  assert.deepEqual(after, before);
  assert.equal(DB.raw.prepare("SELECT job_category FROM leads WHERE id='lead_keep'").get().job_category, null);
});

test("if the database ever refuses the column change, bookings and payments still work", async () => {
  const DB = makeD1({ failAlter: true });
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(String(url)); return new Response(JSON.stringify({ id: "c9", status: "PENDING", hosted_checkout_url: "https://pay.example/c9" }), { status: 200 }); };
  try {
    const env = { DB, SUMUP_API_KEY: "k", SUMUP_MERCHANT_CODE: "m" };
    const r = await postEnv(env, "/api/lead", { ...customer, sessionId: "direct_9", service: "Tap problem", details: "Kitchen tap dripping constantly" });
    assert.equal(r.status, 200);
    const { leadId } = await r.json();
    assert.ok(DB.raw.prepare("SELECT id FROM leads WHERE id=?").get(leadId));
    DB.raw.prepare("INSERT INTO reservations (id,lead_id,slot_key,appointment_date,start_time,end_time,status,expires_at) VALUES ('res_9',?,'s9','2026-11-03','08:00','11:00','HELD',datetime('now','+30 minutes'))").run(leadId);
    const c = await postEnv(env, "/api/checkout", { leadId, reservationId: "res_9" });
    assert.equal(c.status, 200);
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = orig; }
});

test("the booking page served through the live entry code keeps the agreed-appointment rewrite and compulsory description", async () => {
  const fs = await import("node:fs/promises");
  const html = await fs.readFile(new URL("../booking.html", import.meta.url), "utf8");
  const env = { ASSETS: { fetch: async () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }) } };
  const r = await entryWorker.fetch(new Request("https://www.kensington.biz/booking.html"), env, { waitUntil() {} });
  const out = await r.text();
  assert.equal(r.status, 200);
  assert.doesNotMatch(out, /id="agreedTime"/);
  assert.match(out, /agreedTime:'00:00'/);
  assert.match(out, /<textarea id="details" required/);
  assert.match(out, /arrangedNote:arrangedText\.trim\(\)/);
  assert.match(out, /Appointment already agreed: \$\{\$\('bookingType'\)\.value\}, \$\{\$\('agreedDate'\)\.value\}\.`/);
});

test("other API routes are unaffected by the lead changes (no DB → same errors as before)", async () => {
  const r = await post("/api/lead", { ...customer, service: "Tap problem", details: "Kitchen tap dripping constantly" });
  assert.equal(r.status, 200);
  assert.ok((await r.json()).leadId);
  const missing = await post("/api/lead", { name: "", phone: "" });
  assert.equal(missing.status, 400);
});
