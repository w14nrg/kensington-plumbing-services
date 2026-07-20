:root{
  --ink:#0b1f2d;
  --navy:#0a2436;
  --blue:#0b6f9f;
  --copper:#b87333;
  --copper2:#d59a61;
  --cream:#f6f1e9;
  --paper:#ffffff;
  --mist:#f2f6f8;
  --line:#d8e2e8;
  --muted:#63717b;
  --green:#18794e;
  --red:#b42318;
  --shadow:0 20px 60px rgba(8,31,45,.14);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:#fff}
a{color:inherit}
img{max-width:100%;display:block}
.wrap{width:min(1180px,calc(100% - 36px));margin:0 auto}
.site-header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(11,31,45,.08)}
.nav{height:72px;display:flex;align-items:center;gap:24px}
.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-weight:900;letter-spacing:-.02em}
.brand-mark{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--navy);color:white;font-weight:900}
.brand-text span{display:block;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.nav-links{display:flex;align-items:center;gap:20px;margin-left:auto}
.nav-links a{text-decoration:none;font-size:14px;font-weight:750;color:#263845}
.nav-links a:hover{color:var(--blue)}
.nav-cta{padding:11px 15px;border-radius:12px;background:var(--navy)!important;color:#fff!important}
.menu-btn{display:none;margin-left:auto;border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 11px}
.hero{padding:72px 0 46px;background:
  radial-gradient(circle at 85% 20%,rgba(11,111,159,.15),transparent 30%),
  linear-gradient(180deg,#fff 0,#f7fafb 100%)}
.hero-grid{display:grid;grid-template-columns:1.12fr .88fr;gap:44px;align-items:center}
.eyebrow{display:inline-flex;gap:8px;align-items:center;font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.1em;color:var(--blue)}
.eyebrow:before{content:"";width:28px;height:2px;background:var(--copper)}
h1{font-size:clamp(44px,6vw,76px);line-height:.98;letter-spacing:-.055em;margin:18px 0 20px;color:var(--navy)}
.hero p{font-size:19px;line-height:1.58;color:#43545f;max-width:700px}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:0;border-radius:13px;padding:14px 18px;font-weight:850;font-size:15px;cursor:pointer}
.btn-primary{background:var(--copper);color:#fff}
.btn-dark{background:var(--navy);color:#fff}
.btn-light{background:#fff;border:1px solid var(--line);color:var(--navy)}
.hero-points{display:flex;gap:18px;flex-wrap:wrap;margin-top:24px;color:var(--muted);font-size:13px;font-weight:700}
.hero-points span:before{content:"✓";color:var(--green);font-weight:900;margin-right:6px}
.ken-feature{background:var(--navy);border-radius:28px;padding:28px;color:white;box-shadow:var(--shadow);position:relative;overflow:hidden}
.ken-feature:after{content:"";position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.06);right:-90px;top:-80px}
.ken-feature-top{display:flex;gap:16px;align-items:center;position:relative;z-index:1}
.ken-feature img{width:96px;height:96px;border-radius:50%;background:var(--cream);border:4px solid rgba(255,255,255,.8)}
.ken-feature h2{margin:0 0 5px;font-size:30px;letter-spacing:-.03em}
.ken-feature p{color:#dce8ef;font-size:15px;margin:0}
.ken-feature .speech{margin-top:22px;background:#fff;color:var(--ink);border-radius:17px 17px 17px 5px;padding:16px;line-height:1.5;position:relative;z-index:1}
.ken-feature .btn{margin-top:16px;width:100%;position:relative;z-index:1}
.strip{padding:18px 0;background:var(--cream);border-top:1px solid #eadfce;border-bottom:1px solid #eadfce}
.strip-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.strip-item{font-size:13px;font-weight:800;text-align:center;color:#3a4650}
.section{padding:78px 0}
.section.alt{background:var(--mist)}
.section-head{max-width:760px;margin-bottom:34px}
.section-head h2{font-size:clamp(34px,4vw,52px);letter-spacing:-.045em;line-height:1.05;margin:10px 0 12px;color:var(--navy)}
.section-head p{color:var(--muted);font-size:17px;line-height:1.6}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px}
.card-icon{width:42px;height:42px;border-radius:12px;background:#e9f3f8;color:var(--blue);display:grid;place-items:center;font-size:20px;margin-bottom:16px}
.card h3{margin:0 0 8px;font-size:19px;color:var(--navy)}
.card p{margin:0;color:var(--muted);line-height:1.55;font-size:14px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.step{position:relative;padding:24px;border:1px solid var(--line);border-radius:18px;background:#fff}
.step-num{font-size:12px;font-weight:900;color:var(--copper);letter-spacing:.08em}
.step h3{font-size:22px;margin:9px 0;color:var(--navy)}
.step p{color:var(--muted);line-height:1.55}
.price-banner{background:linear-gradient(135deg,var(--navy),#103e59);border-radius:28px;padding:38px;color:#fff;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center}
.price-banner h2{font-size:36px;line-height:1.05;margin:0 0 10px;letter-spacing:-.04em}
.price-banner p{margin:0;color:#dce8ef;line-height:1.55;max-width:720px}
.area-grid{display:flex;gap:10px;flex-wrap:wrap}
.area-pill{text-decoration:none;border:1px solid var(--line);background:#fff;border-radius:999px;padding:10px 13px;font-weight:800;font-size:13px}
.area-pill:hover{border-color:var(--blue);color:var(--blue)}
.page-hero{padding:62px 0;background:linear-gradient(180deg,#f7fafb,#fff)}
.page-hero h1{max-width:900px}
.prose{max-width:820px}
.prose h2{font-size:32px;color:var(--navy);margin-top:36px}
.prose p,.prose li{color:#4c5c67;line-height:1.7}
.site-footer{background:#071a28;color:#d9e5eb;padding:48px 0 28px}
.footer-grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:28px}
.site-footer h3,.site-footer h4{color:#fff}
.site-footer a{color:#d9e5eb;text-decoration:none;display:block;margin:8px 0;font-size:14px}
.site-footer small{color:#8fa4b0}
.footer-bottom{margin-top:34px;padding-top:22px;border-top:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}
.notice{border:1px solid #f0c9c4;background:#fff4f2;color:#7b271f;border-radius:14px;padding:14px;line-height:1.5}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.field{display:grid;gap:6px}
.field.full{grid-column:1/-1}
.field label{font-size:12px;font-weight:850;color:#40515d}
.field input,.field textarea,.field select{width:100%;border:1px solid #cbd8df;border-radius:11px;padding:12px;font:inherit}
.field textarea{min-height:110px;resize:vertical}
.status-box{border:1px solid var(--line);border-radius:18px;padding:22px;background:#fff}
@media(max-width:900px){
  .hero-grid,.price-banner{grid-template-columns:1fr}
  .cards,.steps{grid-template-columns:1fr 1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
  .strip-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
  .nav-links{display:none;position:absolute;left:0;right:0;top:72px;background:#fff;border-bottom:1px solid var(--line);padding:16px 18px;flex-direction:column;align-items:stretch}
  .nav-links.open{display:flex}
  .menu-btn{display:block}
  .hero{padding-top:48px}
  h1{font-size:46px}
  .cards,.steps,.footer-grid,.form-grid{grid-template-columns:1fr}
  .field.full{grid-column:auto}
  .strip-grid{grid-template-columns:1fr}
  .ken-feature{padding:22px}
  .price-banner{padding:28px 22px}
}
