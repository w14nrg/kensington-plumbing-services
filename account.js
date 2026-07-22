(() => {
  const loading = document.getElementById('accountLoading');
  const signedOut = document.getElementById('accountSignedOut');
  const dashboard = document.getElementById('accountDashboard');
  const welcome = document.getElementById('accountWelcome');
  const welcomeTitle = document.getElementById('accountWelcomeTitle');
  const form = document.getElementById('accountProfileForm');
  const status = document.getElementById('accountSaveStatus');
  let state = null;

  boot();
  window.addEventListener('chelsea:memberchange', e => {
    state = e.detail;
    render();
  });

  async function boot() {
    showWelcomeMessage();
    try {
      const res = await fetch('/api/member/me', { cache: 'no-store', credentials: 'same-origin' });
      state = await res.json();
    } catch { state = { authenticated: false }; }
    render();
  }

  function showWelcomeMessage() {
    const params = new URLSearchParams(location.search);
    const authMessage = document.getElementById('accountAuthMessage');
    if (params.has('welcome')) {
      if (welcome) welcome.hidden = false;
      if (welcomeTitle) welcomeTitle.textContent = params.has('new') ? 'Welcome to Chelsea.biz.' : 'Welcome back, Blue.';
    }
    if (params.get('error') === 'no-account' && authMessage) {
      authMessage.hidden = false;
      authMessage.textContent = 'No account was found for that login link. Create a free account instead.';
    } else if (params.has('error') && authMessage) {
      authMessage.hidden = false;
      authMessage.textContent = 'That sign-in link could not be used. Request a fresh login link below.';
    }
    if ([...params.keys()].length) history.replaceState({}, '', location.pathname + location.hash);
  }

  function render() {
    if (loading) loading.hidden = true;
    const authed = Boolean(state?.authenticated);
    if (signedOut) signedOut.hidden = authed;
    if (dashboard) dashboard.hidden = !authed;
    if (!authed) {
      if (welcome) welcome.hidden = true;
      return;
    }

    const member = state.member || {};
    const profile = state.profile || {};
    document.getElementById('accountGreeting').textContent = member.displayName ? `Alright, ${member.displayName}.` : 'Complete your Chelsea profile';
    document.getElementById('accountEmail').textContent = member.email || '';
    document.getElementById('accountJoined').textContent = member.joinedAt ? `Member since ${formatDate(member.joinedAt)}` : 'Free Blue Member';

    set('displayName', member.displayName);
    set('favouriteCurrentPlayer', profile.favouriteCurrentPlayer);
    set('favouriteEverPlayer', profile.favouriteEverPlayer);
    set('favouriteEra', profile.favouriteEra);
    set('preferredFormation', profile.preferredFormation);
    set('predictedFinish', profile.predictedFinish);
    set('favouriteMemory', profile.favouriteMemory);
    const marketing = form?.elements?.marketingOptIn;
    if (marketing) marketing.checked = Boolean(member.marketingOptIn);
  }

  function set(name, value) {
    const el = form?.elements?.[name];
    if (el) el.value = value || '';
  }

  document.getElementById('accountLogin')?.addEventListener('click', () => window.ChelseaMembership?.open('login'));
  document.getElementById('accountCreate')?.addEventListener('click', () => window.ChelseaMembership?.open('signup'));

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (status) status.textContent = 'Saving…';
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.marketingOptIn = Boolean(form.elements.marketingOptIn?.checked);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not save your profile.');
      state = { authenticated: true, member: data.member, profile: data.profile };
      if (status) status.textContent = 'Saved.';
      window.dispatchEvent(new CustomEvent('chelsea:memberchange', { detail: state }));
      await window.ChelseaMembership?.refresh?.();
      render();
      setTimeout(() => { if (status) status.textContent = ''; }, 2500);
    } catch (err) {
      if (status) status.textContent = err?.message || 'Save failed.';
    }
  });

  document.getElementById('accountLogout')?.addEventListener('click', async () => {
    await fetch('/api/member/logout', { method: 'POST', credentials: 'same-origin' });
    await window.ChelseaMembership?.refresh?.();
    location.href = '/?loggedout=1';
  });

  document.getElementById('accountDelete')?.addEventListener('click', async () => {
    const confirmed = window.confirm('Delete your Chelsea.biz account permanently? This cannot be undone.');
    if (!confirmed) return;
    const typed = window.prompt('Type DELETE to confirm.');
    if (typed !== 'DELETE') return;
    const res = await fetch('/api/member/delete', {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ confirm: 'DELETE' })
    });
    if (res.ok) location.href = '/?account=deleted';
    else alert('The account could not be deleted right now.');
  });

  function formatDate(value) {
    const d = new Date(value.endsWith?.('Z') ? value : `${value}Z`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
})();
