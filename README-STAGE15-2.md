# Chelsea.biz — Stage 15.2 Clear Login and Signup

This update fixes the confusing membership journey by separating account creation from returning-member login.

## What changed

- Signed-out members now see two clear choices: `Log in` and `Create account`.
- Log in only works for an existing Chelsea.biz account.
- Create account only works for a new email address.
- Existing members who choose Create account are redirected to Log in without creating a duplicate.
- Unknown emails entered under Log in are redirected to Create account.
- Login emails now say `Log in to Chelsea.biz` and explicitly state that they are not another signup.
- Signup emails now say `Finish creating your Chelsea.biz account`.
- The account page has separate Log in and Create free account buttons.
- The UI explains that passwordless login always sends a fresh one-time email link.
- The UI warns that Incognito/private browsing sessions disappear when the private window closes.
- Normal-browser sessions remain valid for 30 days unless the member logs out or clears cookies.

## Upload

Upload the contents of this package to the root of the GitHub repository and replace the existing files.

Key replacements:

- `worker/index.js`
- `membership.js`
- `membership.css`
- `account.html`
- `account.js`
- `account.css`
