(() => {
  const state = {
    sessionId: localStorage.getItem("kps_ken_session") || `session_${crypto.randomUUID()}`,
    step: "issue",
    issueText: "",
    activeLeak: false,
    accessLevel: "unknown",
    postcode: "",
    estimate: null,
    leadId: null,
    history: []
  };
  localStorage.setItem("kps_ken_session", state.sessionId);

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  function markup() {
    return `
      <div class="ken-widget">
        <button class="ken-launcher" type="button" aria-expanded="false">
          <img src="/assets/ken-avatar.svg" alt="">
          <span><strong>Ask Ken</strong><small>Live plumbing estimate</small></span>
        </button>
        <section class="ken-panel" aria-label="Ask Ken live plumbing estimator">
          <header class="ken-head">
            <img src="/assets/ken-avatar.svg" alt="Ken the virtual plumber">
            <div class="ken-head-copy"><strong>Ken</strong><span>Kensington Plumbing live estimator · £75 to book</span></div>
            <button class="ken-close" type="button" aria-label="Close">×</button>
          </header>
          <div class="ken-progress"><span></span></div>
          <div class="ken-messages" aria-live="polite"></div>
          <div class="ken-chips"></div>
          <div class="ken-input">
            <input type="text" maxlength="500" placeholder="Tell Ken what's gone wrong…" aria-label="Message Ken">
            <button class="ken-send" type="button" aria-label="Send">➜</button>
          </div>
          <div class="ken-disclaimer">Ken provides guidance and estimated price ranges, not a fixed quotation. The exact repair price is confirmed on site before additional work proceeds.</div>
        </section>
      </div>`;
  }

  function add(text, role = "bot") {
    const box = document.querySelector(".ken-messages");
    if (!box) return;
    const row = document.createElement("div");
    row.className = `ken-row ${role}`;
    row.innerHTML = `<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    state.history.push({ role: role === "user" ? "user" : "assistant", content: text });
    state.history = state.history.slice(-10);
  }

  function addHtml(html) {
    const box = document.querySelector(".ken-messages");
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) box.appendChild(wrap.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function chips(items = []) {
    const el = document.querySelector(".ken-chips");
    el.innerHTML = "";
    items.forEach(item => {
      const button = document.createElement("button");
      button.className = "ken-chip";
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", item.action);
      el.appendChild(button);
    });
  }

  function progress(percent) {
    const bar = document.querySelector(".ken-progress span");
    if (bar) bar.style.width = `${percent}%`;
  }

  function placeholder(text) {
    const input = document.querySelector(".ken-input input");
    if (input) {
      input.placeholder = text;
      input.focus();
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type":"application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Something went wrong.");
      error.data = data;
      throw error;
    }
    return data;
  }

  async function kenReply(message) {
    const box = document.querySelector(".ken-messages");
    const typing = document.createElement("div");
    typing.className = "ken-typing";
    typing.textContent = "Ken is thinking…";
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
    try {
      const data = await api("/api/ken", {
        method:"POST",
        body:JSON.stringify({
          sessionId: state.sessionId,
          message,
          history: state.history.slice(0,-1),
          estimateContext: state.estimate
        })
      });
      typing.remove();
      add(data.reply, "bot");
    } catch {
      typing.remove();
      add("I can still run the estimator. I’ll use your answers to calculate a controlled KPS price range.", "bot");
    }
  }

  function start() {
    state.step = "issue";
    progress(8);
    add("Hi, I’m Ken 👋", "bot");
    add("Tell me what’s gone wrong in your own words. I’ll talk it through with you, then use the Kensington Plumbing pricing engine to give you an estimated repair range.", "bot");
    chips([
      {label:"I have a leak",action:()=>quickIssue("I have a leak")},
      {label:"Toilet problem",action:()=>quickIssue("I have a toilet problem")},
      {label:"Tap problem",action:()=>quickIssue("I have a tap problem")},
      {label:"Shower problem",action:()=>quickIssue("I have a shower problem")},
      {label:"Radiator / heating",action:()=>quickIssue("I have a radiator or heating problem")},
      {label:"Blocked sink / drain",action:()=>quickIssue("I have a blocked sink or drain")}
    ]);
  }

  async function quickIssue(text) {
    add(text,"user");
    state.issueText = text;
    chips([]);
    await kenReply(text);
    askLeak();
  }

  async function acceptIssue(text) {
    state.issueText = text;
    add(text,"user");
    chips([]);
    await kenReply(text);
    askLeak();
  }

  function askLeak() {
    state.step = "leak";
    progress(34);
    add("Is water actively leaking or overflowing right now?", "bot");
    chips([
      {label:"Yes — active leak",action:()=>setLeak(true)},
      {label:"No",action:()=>setLeak(false)},
      {label:"Not applicable",action:()=>setLeak(false)}
    ]);
  }

  function setLeak(value) {
    state.activeLeak = value;
    add(value ? "Yes — active leak" : "No / not applicable","user");
    if (value) addHtml('<div class="ken-alert"><strong>Do this first:</strong> if it is safe, isolate the nearest affected valve or the main stopcock. If water is near electrical fittings, keep clear of affected electrics.</div>');
    askAccess();
  }

  function askAccess() {
    state.step = "access";
    progress(54);
    add("How easy is the likely repair area to get to?", "bot");
    chips([
      {label:"Visible / easy access",action:()=>setAccess("easy","Visible / easy access")},
      {label:"Tight / awkward access",action:()=>setAccess("awkward","Tight / awkward access")},
      {label:"Behind tiles / boxing / floor",action:()=>setAccess("concealed","Behind tiles / boxing / floor")},
      {label:"I’m not sure",action:()=>setAccess("unknown","I’m not sure")}
    ]);
  }

  function setAccess(value,label) {
    state.accessLevel = value;
    add(label,"user");
    askPostcode();
  }

  function askPostcode() {
    state.step = "postcode";
    progress(72);
    chips([]);
    add("What’s the postcode for the job?", "bot");
    placeholder("e.g. W14 9BP");
  }

  async function makeEstimate(postcode) {
    state.postcode = postcode.toUpperCase();
    add(state.postcode,"user");
    try {
      const estimate = await api("/api/estimate", {
        method:"POST",
        body:JSON.stringify({
          sessionId:state.sessionId,
          issueText:state.issueText,
          activeLeak:state.activeLeak,
          accessLevel:state.accessLevel,
          postcode:state.postcode
        })
      });
      state.estimate = estimate;
      state.sessionId = estimate.sessionId || state.sessionId;
      localStorage.setItem("kps_ken_session",state.sessionId);
      state.step = "estimate";
      progress(100);
      showEstimate();
    } catch(error) {
      add(error.message,"bot");
    }
  }

  function showEstimate() {
    const e = state.estimate;
    addHtml(`
      <div class="ken-estimate">
        <div class="ken-estimate-label">Your live estimate</div>
        <h3>${esc(e.jobName)}</h3>
        <div class="ken-price">£${e.min}–£${e.max}</div>
        <div class="ken-meta">${esc(e.note)}</div>
        <span class="ken-confidence">Estimate confidence: ${esc(e.confidence)}</span>
        <div class="ken-paynote"><strong>£${e.callout} to book.</strong><br>The £${e.callout} covers attendance and diagnosis and is credited against the final repair price when we carry out the work. The exact price is confirmed on site before additional work.</div>
        <form class="ken-form" data-lead-form>
          <input name="name" autocomplete="name" placeholder="Your name" required>
          <input name="phone" autocomplete="tel" placeholder="Mobile number" required>
          <input name="email" type="email" autocomplete="email" placeholder="Email (optional)">
          <button class="ken-btn primary" type="submit">Continue — pay £${e.callout} & book</button>
          <button class="ken-btn secondary" type="button" data-restart>Start again</button>
        </form>
      </div>`);
    chips([]);
    const form = document.querySelector("[data-lead-form]");
    form.addEventListener("submit", submitLead);
    document.querySelector("[data-restart]").addEventListener("click", reset);
  }

  async function submitLead(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Preparing secure checkout…";
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const lead = await api("/api/lead", {
        method:"POST",
        body:JSON.stringify({
          ...values,
          postcode:state.postcode,
          estimateId:state.estimate.estimateId,
          sessionId:state.sessionId,
          consent:true
        })
      });
      state.leadId = lead.leadId;

      const checkout = await api("/api/checkout", {
        method:"POST",
        body:JSON.stringify({
          leadId:state.leadId,
          estimateId:state.estimate.estimateId
        })
      });

      window.location.href = checkout.checkoutUrl;
    } catch(error) {
      button.disabled = false;
      button.textContent = `Continue — pay £${state.estimate.callout} & book`;
      if (error.data?.setupRequired) {
        add("The estimator is working, but SumUp has not been connected to this build yet. Once the SumUp API key and merchant code are added in Cloudflare, this button will create the real £75 secure checkout.", "bot");
      } else {
        add(error.message,"bot");
      }
    }
  }

  function reset() {
    Object.assign(state,{
      step:"issue",issueText:"",activeLeak:false,accessLevel:"unknown",
      postcode:"",estimate:null,leadId:null,history:[]
    });
    document.querySelector(".ken-messages").innerHTML = "";
    placeholder("Tell Ken what's gone wrong…");
    start();
  }

  function submitInput() {
    const input = document.querySelector(".ken-input input");
    const value = input.value.trim();
    if (!value) return;
    input.value = "";

    if (state.step === "issue") {
      acceptIssue(value);
    } else if (state.step === "postcode") {
      makeEstimate(value);
    } else {
      add(value,"user");
      kenReply(value);
    }
  }

  function open() {
    document.querySelector(".ken-panel")?.classList.add("open");
    document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","true");
    setTimeout(()=>document.querySelector(".ken-input input")?.focus(),50);
  }

  function close() {
    document.querySelector(".ken-panel")?.classList.remove("open");
    document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","false");
  }

  function init() {
    const host = document.createElement("div");
    host.innerHTML = markup();
    document.body.appendChild(host.firstElementChild);

    document.querySelector(".ken-launcher").addEventListener("click",open);
    document.querySelector(".ken-close").addEventListener("click",close);
    document.querySelector(".ken-send").addEventListener("click",submitInput);
    document.querySelector(".ken-input input").addEventListener("keydown",event=>{
      if(event.key==="Enter") submitInput();
    });
    start();
  }

  window.KenWidget = { open, close, reset };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
