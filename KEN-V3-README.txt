KENSINGTON KEN — FINAL PRE-CLOUDFLARE V3
=========================================

Upload these four files to the ROOT of the GitHub repository:

ken.html
ken.css
ken.js
ken-3d.js

They replace the current Ken front-end files.

WHAT THIS FIXES
---------------
- Matches the existing Kensington Plumbing Services cream / dark teal / copper style.
- Ken is a real Three.js 3D character built directly in code.
- No ken.glb is required.
- No missing image or missing model can leave the Ken side blank.
- The chat interface is rendered immediately by ken.js.
- GitHub Pages gets a local preview conversation and estimate when /api/ken is unavailable.
- When Cloudflare is connected, the exact same UI automatically uses the live /api/ken backend instead.
- Large Ken can rotate, zoom and pan.
- Ken can wave, thumbs-up, pick up his wrench, inspect the toilet and check the radiator.
- A smaller live 3D Ken appears inside the chat header.
- The page uses the existing 235-route Cloudflare backend when it becomes available.

DO NOT REPLACE
--------------
Do not replace _worker.js or ken-schema.sql with this package.
Keep the existing V2 backend files already in GitHub.

NEXT STEP AFTER THIS LOOKS RIGHT
--------------------------------
Connect Cloudflare.
Then:
1. D1
2. OpenAI
3. Live appointments
4. SumUp
5. End-to-end booking test
