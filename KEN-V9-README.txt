KEN V9 SMART CONVERSATION / ESTIMATE / BOOKING FLOW

Upload to GitHub root:
- _worker.js
- ken.html
- ken-v9.js
- ken-v9.css

Keep ken-v8-3d.js in GitHub.

Then in Cloudflare D1 > kensington-ken > Console run once:
ALTER TABLE leads ADD COLUMN address TEXT;

Flow:
1. Natural OpenAI conversation.
2. Ken asks only relevant diagnostic questions.
3. A live estimate appears and updates after each useful answer.
4. Confidence meter rises with useful information.
5. Range narrows as confidence rises. “I don't know” is accepted and leaves a wider range.
6. Once sufficiently understood, Continue to booking appears.
7. Collect name, mobile, full address, postcode and optional email.
8. Show 3-hour slots: 8-11, 11-2, 2-5 weekdays.
9. Selected slot is held for 35 minutes.
10. Customer is redirected to SumUp Hosted Checkout for £75.
11. Paid checkout confirms the held booking.
