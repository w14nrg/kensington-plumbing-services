import test from "node:test";
import assert from "node:assert/strict";
import { shouldReportLiveHubPageView } from "../livehub-traffic-filter.js";

const chromiumUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
function request({ ua = chromiumUA, fetchMode = "navigate", fetchDest = "document", cf } = {}) {
  const headers = new Headers();
  if (ua !== null) headers.set("user-agent", ua);
  if (fetchMode !== null) headers.set("sec-fetch-mode", fetchMode);
  if (fetchDest !== null) headers.set("sec-fetch-dest", fetchDest);
  return { headers, cf };
}

test("real browser page navigation remains counted", () => {
  assert.equal(shouldReportLiveHubPageView(request()), true);
  assert.equal(shouldReportLiveHubPageView(request({ fetchMode: null, fetchDest: null })), true);
});

test("known crawlers and command-line clients are omitted from visitor figures", () => {
  for (const ua of [
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0)",
    "Mozilla/5.0 HeadlessChrome/130",
    "python-requests/2.32.0",
    "curl/8.5.0",
    "facebookexternalhit/1.1"
  ]) assert.equal(shouldReportLiveHubPageView(request({ ua })), false, ua);
  assert.equal(shouldReportLiveHubPageView(request({ ua: null })), false);
});

test("Cloudflare bot signals are used when exposed", () => {
  assert.equal(shouldReportLiveHubPageView(request({ cf: { botManagement: { verifiedBot: true } } })), false);
  assert.equal(shouldReportLiveHubPageView(request({ cf: { botManagement: { score: 5 } } })), false);
  assert.equal(shouldReportLiveHubPageView(request({ cf: { botManagement: { score: 88 } } })), true);
});

test("script fetches returning HTML are not visits", () => {
  assert.equal(shouldReportLiveHubPageView(request({ fetchMode: "cors" })), false);
  assert.equal(shouldReportLiveHubPageView(request({ fetchDest: "empty" })), false);
});
