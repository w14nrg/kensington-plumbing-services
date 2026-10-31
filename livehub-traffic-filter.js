// Filters obvious automated page views from Live Hub reporting only.
// Never block requests or change website, chat, payment, lead or booking behaviour.
const AUTOMATED_USER_AGENT = /(?:bot|crawler|spider|headlesschrome|phantomjs|curl\/|wget\/|python-requests|python-urllib|go-http-client|scrapy|aiohttp|httpclient|postmanruntime|selenium|playwright|puppeteer|lighthouse|pagespeed|uptimerobot|pingdom|ahrefs|semrush|facebookexternalhit|discordbot|slackbot)/i;

export function shouldReportLiveHubPageView(request) {
  const botManagement = request.cf?.botManagement;
  if (botManagement?.verifiedBot === true) return false;
  if (typeof botManagement?.score === "number" && botManagement.score < 30) return false;

  const userAgent = (request.headers.get("user-agent") || "").trim();
  if (!userAgent || AUTOMATED_USER_AGENT.test(userAgent)) return false;

  // Browser navigation, not HTML fetched by a script/prefetch. Omitted headers
  // remain allowed for older browsers and privacy-focused clients.
  const fetchMode = (request.headers.get("sec-fetch-mode") || "").toLowerCase();
  if (fetchMode && fetchMode !== "navigate") return false;
  const fetchDest = (request.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (fetchDest && fetchDest !== "document" && fetchDest !== "iframe") return false;
  return true;
}
