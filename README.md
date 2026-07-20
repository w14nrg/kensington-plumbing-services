# Kensington Plumbing Services — Ken Rebuild v1

A clean rebuild of `kensington.biz` with **Ken**, the live plumbing assistant and estimator, built into every page.

## What is already built

- New responsive Kensington Plumbing Services website.
- Ken floating on every page.
- Cartoon plumber avatar (`public/assets/ken-avatar.svg`).
- Controlled KPS plumbing pricing catalogue covering:
  - leaks and pipework;
  - toilets;
  - taps;
  - showers and baths;
  - sinks and wastes;
  - appliance connections;
  - radiators and water-side heating;
  - tanks and cylinders;
  - small drainage;
  - common installations.
- Deterministic estimate engine — AI does **not** invent prices.
- Natural-language Ken endpoint using the OpenAI Responses API.
- Safe fallback conversation when OpenAI is not connected.
- D1 database schema for sessions, chat messages, estimates, leads, payments and bookings.
- SumUp Hosted Checkout endpoint for a unique £75 checkout.
- Payment status verification before the booking form opens.
- Post-payment preferred-date/time booking form.
- SEO area pages for Kensington, West Kensington, Chelsea, Hammersmith, Fulham, Earl's Court, Barons Court and Shepherd's Bush.
- No Tawk.to. Ken is the single website assistant.

## Architecture

- **Cloudflare Worker**: API and secure server-side logic.
- **Cloudflare Workers Static Assets**: website HTML/CSS/JS.
- **Cloudflare D1**: estimates, leads, payment references and bookings.
- **OpenAI API**: Ken's natural-language plumbing conversation.
- **KPS pricing engine**: actual estimate ranges.
- **SumUp Hosted Checkout**: secure £75 payment.

## Important

Do **not** put the OpenAI API key or SumUp API key in GitHub, JavaScript or HTML.

They must be Cloudflare Worker secrets.

## First deployment

### 1. Put these files in the GitHub repository

You can replace the existing repository contents with this project, or create a new branch first.

### 2. Install Wrangler

```bash
npm install
```

### 3. Log into Cloudflare

```bash
npx wrangler login
```

### 4. Create the D1 database

```bash
npx wrangler d1 create kensington-ken
```

Cloudflare will return a database ID.

Paste that ID into `wrangler.jsonc` in:

```json
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

### 5. Create the tables

```bash
npx wrangler d1 execute kensington-ken --remote --file=./schema.sql
```

### 6. Add the OpenAI key securely

```bash
npx wrangler secret put OPENAI_API_KEY
```

Paste the key when prompted.

The default model in `wrangler.jsonc` is `gpt-5-mini`. You can change `OPENAI_MODEL` later.

### 7. Add the SumUp key securely

```bash
npx wrangler secret put SUMUP_API_KEY
```

Then add the SumUp merchant code:

```bash
npx wrangler secret put SUMUP_MERCHANT_CODE
```

### 8. Test

```bash
npm run dev
```

### 9. Deploy

```bash
npm run deploy
```

### 10. Connect kensington.biz

In the Cloudflare Worker settings, add `kensington.biz` and `www.kensington.biz` as custom domains/routes as appropriate for the DNS setup.

## £75 wording used in the build

> The £75 covers attendance and diagnosis and is credited against the final repair price when we carry out the work. The exact price is confirmed on site before additional work proceeds.

## Pricing review

The current ranges are a **first-draft commercial pricing catalogue**, not a final tariff.

Edit `src/pricing.js` before launch.

Each job has:

- `code`
- `category`
- `name`
- `min`
- `max`
- `confidence`
- `keywords`
- `note`

The most important next job is to review every price against your actual KPS labour rate, parking/travel assumptions, standard materials and margin.

## Recommended v2

1. Add photo upload to R2 so Ken can see the fixture/problem.
2. Add real engineer availability rather than preferred time windows.
3. Add SMS/email confirmations.
4. Add an admin dashboard for leads, estimates, payments and bookings.
5. Add structured job modifiers per job code rather than the current global access modifiers.
6. Add SumUp webhooks so payment state updates immediately, even if the customer closes the browser.
7. Add analytics for:
   - Ken opened;
   - estimate started;
   - estimate completed;
   - £75 checkout started;
   - payment completed;
   - booking completed.
