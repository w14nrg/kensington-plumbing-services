KENSINGTON KEN V6 — BIGGER + LIVE 3D CHAT AVATAR

Upload these FOUR files to the ROOT of GitHub:

ken.html
ken-v6.css
ken-v6.js
ken-v6-3d.js

The HTML uses versioned filenames so the browser does not keep showing an old cached Ken.

Changes:
- Ken is much larger in the main viewer.
- Camera is closer and zoom limits improved.
- The chat header uses the SAME live WebGL Ken, framed as a face/bust.
- No static/photo Ken is used by V6.
- Mini Ken mounting is robust even when the chat HTML is created after the 3D script starts.
- Added appealing stats:
  * 235+ plumbing job types covered
  * real Ken chats started counter
  * £75 attendance & diagnosis
- Chat counter starts at 0 and increments once when a genuine new browser session starts chatting.
- Once Cloudflare/D1 is connected, this local counter can be replaced by a genuine global total.

Keep the existing:
_worker.js
ken-schema.sql
