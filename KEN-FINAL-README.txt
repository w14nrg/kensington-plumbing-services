KENSINGTON KEN — FINAL FRONT-END BEFORE CLOUDFLARE

This is the final Ken visual/front-end package. It is designed so we do not need to revisit the Ken page or avatar before connecting the live cloud backend.

FILES
- ken.html — premium dedicated Ken page
- ken.css — dedicated page, popup and homepage styling
- ken.js — shared chat/estimate/booking frontend with preview fallback
- ken-3d.js — REAL procedural Three.js 3D Ken + bathroom scene
- _worker.js — existing 235-job Cloudflare backend and booking flow
- ken-schema.sql — D1 tables for conversations, estimates, holds, payments and confirmed bookings

3D KEN
This version does NOT need a ken.glb file. Ken is built as a real Three.js 3D character in code.
You can:
- drag to rotate 360 degrees
- zoom in/out
- pan the camera
- look behind him
- use front/left/back/right/close-up presets
- wave
- thumbs up
- pick up a wrench
- move to inspect the toilet
- move to check the radiator

The scene also contains a simple 3D bathroom/plumbing environment.
The smaller chat version uses a live mini 3D Ken as well.

BEFORE CLOUDFLARE
On GitHub Pages the dedicated ken.html page can be viewed and the 3D Ken works. The chat uses a small preview fallback because /api/ken does not exist on GitHub Pages.

AFTER CLOUDFLARE
The exact same UI automatically uses:
- OpenAI conversation
- 235-job estimator
- D1 appointment availability and 35-minute holds
- SumUp £75 payment
- payment verification
- confirmed booking

UPLOAD
Upload ALL SEVEN files to the root of the existing repository and let them replace the previous Ken versions. Do not delete or replace the rest of the Kensington website.
