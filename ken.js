.ken-widget,.ken-widget *{box-sizing:border-box}
.ken-launcher{position:fixed;right:18px;bottom:18px;z-index:10000;border:0;border-radius:999px;padding:7px 14px 7px 7px;background:#0a2436;color:#fff;display:flex;align-items:center;gap:10px;box-shadow:0 18px 55px rgba(4,23,35,.27);cursor:pointer;font:800 14px/1.15 Inter,system-ui,sans-serif}
.ken-launcher img{width:52px;height:52px;border-radius:50%;background:#f6f1e9;border:2px solid #fff}
.ken-launcher small{display:block;font-size:11px;font-weight:650;opacity:.78;margin-top:3px;text-align:left}
.ken-panel{position:fixed;right:18px;bottom:88px;z-index:10001;width:min(420px,calc(100vw - 20px));height:min(720px,calc(100vh - 108px));background:#fff;border:1px solid #d5e1e7;border-radius:22px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 22px 70px rgba(4,23,35,.28);font-family:Inter,system-ui,sans-serif;color:#0b1f2d}
.ken-panel.open{display:flex;animation:kenIn .2s ease both}
@keyframes kenIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
.ken-head{background:linear-gradient(135deg,#0a2436,#10445f);color:#fff;padding:13px 14px;display:flex;align-items:center;gap:11px}
.ken-head img{width:47px;height:47px;border-radius:50%;background:#f6f1e9;border:2px solid #fff}
.ken-head-copy{flex:1}
.ken-head-copy strong{display:block}
.ken-head-copy span{font-size:11px;opacity:.78}
.ken-close{width:35px;height:35px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:22px;cursor:pointer}
.ken-progress{height:4px;background:#e8eef2}
.ken-progress span{display:block;height:100%;width:8%;background:#b87333;transition:width .25s ease}
.ken-messages{flex:1;overflow:auto;background:#f4f7f9;padding:14px}
.ken-row{display:flex;margin-bottom:10px}
.ken-row.user{justify-content:flex-end}
.ken-bubble{max-width:88%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap}
.ken-row.bot .ken-bubble{background:#fff;border:1px solid #d8e2e8;border-bottom-left-radius:5px}
.ken-row.user .ken-bubble{background:#0b6f9f;color:#fff;border-bottom-right-radius:5px}
.ken-chips{display:flex;gap:7px;flex-wrap:wrap;padding:0 14px 10px;background:#f4f7f9}
.ken-chip{border:1px solid #bfd0da;background:#fff;color:#0a2436;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:800;cursor:pointer}
.ken-input{display:flex;gap:7px;padding:10px;background:#fff;border-top:1px solid #d8e2e8}
.ken-input input{flex:1;min-width:0;border:1px solid #c9d6de;border-radius:11px;padding:11px;font:inherit}
.ken-send{width:44px;border:0;border-radius:11px;background:#0b6f9f;color:#fff;font-size:18px;cursor:pointer}
.ken-disclaimer{padding:0 12px 9px;background:#fff;color:#77858e;font-size:9.5px;line-height:1.35}
.ken-estimate{background:#fff;border:1px solid #d2dfe6;border-radius:16px;padding:15px;margin:4px 0 12px}
.ken-estimate-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#0b6f9f}
.ken-estimate h3{font-size:18px;margin:6px 0;color:#0a2436}
.ken-price{font-size:31px;font-weight:900;letter-spacing:-.04em;color:#0a2436;margin:7px 0}
.ken-meta{font-size:12px;color:#63717b;line-height:1.45}
.ken-confidence{display:inline-block;margin-top:7px;background:#e8f5ef;color:#18794e;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}
.ken-paynote{margin-top:11px;padding:10px;border-radius:11px;background:#f6f1e9;font-size:12px;line-height:1.45}
.ken-form{display:grid;gap:8px;margin-top:12px}
.ken-form input{border:1px solid #c9d6de;border-radius:10px;padding:10px;font:inherit}
.ken-btn{border:0;border-radius:11px;padding:11px 12px;font-weight:900;cursor:pointer;text-align:center;text-decoration:none}
.ken-btn.primary{background:#b87333;color:#fff}
.ken-btn.secondary{background:#fff;color:#0a2436;border:1px solid #cbd8df}
.ken-alert{padding:10px;border-radius:11px;background:#fff3f1;border:1px solid #efc8c2;color:#7b271f;font-size:12px;line-height:1.4;margin-bottom:10px}
.ken-typing{font-size:12px;color:#73828c;padding:3px 0 8px}
@media(max-width:620px){
  .ken-launcher{right:9px;bottom:9px}
  .ken-launcher small{display:none}
  .ken-panel{right:5px;bottom:72px;width:calc(100vw - 10px);height:calc(100vh - 82px);border-radius:18px}
}
@media(prefers-reduced-motion:reduce){.ken-panel.open{animation:none}}
