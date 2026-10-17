/* ================= Auth, onboarding, guest portal ================= */
const V = {};

V.auth = () => {
  const tab = S.authTab;
  const openSignup = S.platform?.allowSignup !== false;
  const tabs = [['login', 'Log in'], ...(openSignup ? [['signup', 'New business']] : []), ['guest', 'Client']];
  if (S.preKind && tab === 'signup') { const k = S.preKind; S.preKind = null; setTimeout(() => { const el = document.querySelector(`input[name=bizTypes][value=${k}]`); if (el && !el.checked) { el.checked = true; A.pickKind(el); } }, 30); }
  const types = KIND_CARDS.map(([v, l, sub, i, c]) => `<label class="kind-card"><input type="checkbox" name="bizTypes" value="${v}" data-multi="1" onchange="A.pickKind(this)">${ibox(i, c)}<span><b>${l}</b><small>${sub}</small></span></label>`).join('');
  const forms = {
    login: `<form class="stack" onsubmit="A.doLogin(event)">
      ${fieldHTML({ name: 'email', label: 'Login ID (email or mobile number)', required: true, autocomplete: 'username', placeholder: 'you@business.in or 98290 12345' })}
      ${fieldHTML({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' })}
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Log in</button>
      <button type="button" class="linkbtn" style="align-self:center" onclick="A.forgotModal()">Forgot password?</button></form>`,
    signup: `<form class="stack" onsubmit="A.doSignup(event)">
      <div class="grid2" style="padding:0">${fieldHTML({ name: 'name', label: 'Your name', required: true, autocomplete: 'name' })}${fieldHTML({ name: 'phone', label: 'Mobile', type: 'tel', required: true, placeholder: '98290 12345', autocomplete: 'tel' })}</div>
      <div class="field"><span>What is your business? *</span><div class="kind-cards">${types}</div><small>Tent, catering and event: pick all that apply. Doctors: pick Doctor / Clinic.</small></div>
      <label class="field"><span id="bizNameLabel">Business name *</span><input id="f_bizName" name="bizName" required placeholder="e.g. Sharma Enterprises"></label>
      <div id="docFields" class="doc-fields" hidden>${doctorFieldsHTML({})}</div>
      ${fieldHTML({ name: 'email', label: 'Your login ID: email or mobile number', required: true, autocomplete: 'username', hint: 'You will use this to log in every time' })}
      ${fieldHTML({ name: 'password', label: 'Password (min 6 characters)', type: 'password', required: true, minlength: 6, autocomplete: 'new-password' })}
      <label class="check terms"><input type="checkbox" name="terms" required> <span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of use</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></span></label>
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Create my business account</button>
      <p class="tiny muted">You become the Owner with full access. Inside the app you create login IDs and passwords for your manager, accountant and staff, and decide what each person can see.</p></form>`,
    guest: `<form class="stack" onsubmit="A.doGuest(event)">
      <div class="banner">${ic('eye')}<span>See your own event only: setup progress, programme, bill, balance and how to pay. No login needed.</span></div>
      ${fieldHTML({ name: 'code', label: 'Code you got from the business', required: true, placeholder: 'e.g. k3m9xq2p7a' })}
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Open my page</button></form>`
  };
  const showcase = [['Customers', 'user', '#7C3AED'], ['Bookings', 'calendar', '#2563EB'], ['GST bills', 'receipt', '#DB2777'], ['Payments', 'rupee', '#0B9B68'], ['Staff', 'users', '#0D9488'], ['Reminders', 'bell', '#D97706'], ['Reports', 'chart', '#0891B2'], ['Hindi', 'globe', '#16A34A']];
  return `<div class="auth">
  <section class="auth-brand"><div class="inner">
    <div class="row-flex"><div class="logo">${MARK_SVG}</div><div><b style="font:800 21px/1 var(--f-display);display:block">SabManage</b><span class="tiny muted">Your business, in one app</span></div></div>
    <h1>Run your entire business from one app.</h1>
    <p class="desk-only">Bookings and appointments, GST bills, payments, staff attendance and customer reminders. On any phone, in Hindi and English.</p>
    <div class="showcase">${showcase.map(([l, i, c]) => `<div class="sc">${ibox(i, c, 'lg')}<span>${l}</span></div>`).join('')}</div>
  </div></section>
  <section class="auth-side"><div class="auth-card">
    <div class="auth-top"><a href="/" class="linkbtn">${ic('back')} Home</a>${langSwitch()}</div>
    <div class="seg" role="tablist" style="width:100%">${tabs.map(([v, l]) => `<button role="tab" style="flex:1" class="${tab === v ? 'on' : ''}" onclick="A.authTab('${v}')">${l}</button>`).join('')}</div>
    <div class="card pad">${forms[tab]}</div>
    ${S.platform?.supportPhone ? `<p class="small" style="text-align:center">Need help? ${waBtn('Namaste, I need help with ' + (S.platform.appName || 'SabManage') + '.', S.platform.supportPhone, (S.platform.supportName || 'Support') + ' on WhatsApp', 'linkbtn')}</p>` : ''}
    <p class="tiny muted" style="text-align:center">${cloudReady() ? 'Secure login. Your data is saved in the cloud and shared only with your team.' : 'Offline mode: accounts and data stay on this device only.'}</p>
  </div></section></div>`;
};
A.authTab = t => { S.authTab = t; render(); };
function formVals(e) { e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return null; } return readForm(f); }
async function withBtn(e, fn) { const b = e.target.querySelector('button[type=submit]'); if (b) b.disabled = true; try { await fn(); } catch (err) { toast(err.message || String(err), 'bad'); } finally { if (b) b.disabled = false; } }

A.doLogin = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { const u = await S.adapter.signIn(loginId(v.email), v.password); if (await needsMfa()) { S.mfaPending = u; render(); setTimeout(() => $('#f_code')?.focus(), 50); return; } S.user = u; await afterLogin(); toast('Welcome back, ' + (S.me?.name || S.user.name).split(' ')[0]); }); };
A.doSignup = e => {
  const v = formVals(e); if (!v) return;
  if (!v.bizTypes?.length) { toast('Pick your business type', 'bad'); return; }
  const clinic = v.bizTypes.includes('clinic'); const files = clinic ? [...(e.target.querySelector('[name=cert]')?.files || [])] : [];
  if (clinic) { const err = doctorCheck(v, files); if (err) { toast(err, 'bad'); return; } }
  if (!v.terms) { toast('Please accept the Terms of use and Privacy policy', 'bad'); return; }
  withBtn(e, async () => {
    const email = loginId(v.email); if (!email.includes('@')) throw new Error('Enter an email or a 10-digit mobile number');
    if ((v.password || '').length < 6) throw new Error('Password must be at least 6 characters');
    const st = defaultSettings({ bizName: v.bizName, owner: v.name, phone: v.phone, email: email.endsWith('@' + MOBILE_DOMAIN) ? '' : email, bizTypes: clinic ? ['clinic'] : v.bizTypes });
    if (clinic) Object.assign(st, clinicDefaults(v));
    st.termsAcceptedAt = new Date().toISOString(); st.termsVersion = TERMS_VERSION;
    try { const ref = localStorage.getItem('ep_ref'); if (ref) st.referredBy = ref; } catch (x) { }
    await S.adapter.signUpBusiness({ email, password: v.password, name: v.name, phone: v.phone, bizName: v.bizName, roles: clinic ? CLINIC_ROLES : ROLE_DEFAULTS, settings: st });
    S.user = await S.adapter.signIn(email, v.password);
    if (clinic) {
      try { const orgs = await S.adapter.myOrgs(S.user.id); const o = orgs.find(x => x.kind === 'clinic' && x.name === v.bizName) || orgs.find(x => x.kind === 'clinic'); if (o) await sendVerification(o.orgId, v, files); }
      catch (err) { setTimeout(() => toast('Account made, but the certificate did not upload: ' + err.message + '. Please upload it again.', 'bad'), 400); }
    }
    await afterLogin(); toast(clinic ? 'Account created. We will check your certificate soon.' : 'Business created. You are the Owner.');
  });
};
A.doJoin = e => {
  const v = formVals(e); if (!v) return;
  withBtn(e, async () => {
    v.email = loginId(v.email); if (!v.email.includes('@')) throw new Error('Enter an email or a 10-digit mobile number');
    LS.set('ep3_pending', { kind: 'join', email: v.email, name: v.name, code: v.code });
    const u = await S.adapter.signUp(v);
    if (u.pendingConfirm) { S.authTab = 'login'; render(); toast('Confirm your email, then log in. You will join the team automatically.'); return; }
    S.user = u; await afterLogin();
  });
};
A.doGuest = e => { const v = formVals(e); if (!v) return; withBtn(e, () => A.openGuest(v.code)); };
A.forgotModal = () => {
  const P = S.platform || DEFAULT_PLATFORM;
  modal(`${sheetHead('Forgot password?')}<div class="sheet-b stack">
    <div class="checkcard">${ibox('users', '#0D9488')}<span class="grow">Staff / employee<div class="small muted" style="font-weight:500">Ask your business owner. They can set a new password for you from Team & Access.</div></span></div>
    <div class="checkcard">${ibox('shield', '#0F172A')}<span class="grow">Business owner<div class="small muted" style="font-weight:500">Contact ${esc(P.supportName || 'Super Admin')}. For your safety, only the Super Admin can reset an owner's password.</div></span></div>
    <p class="small muted">Lost the phone with your Authenticator app? The same people can switch it off for you, then you can set it up again.</p>
    ${P.supportPhone ? `<div class="row-flex" style="justify-content:center">${waBtn('Namaste, I forgot my ' + (P.appName || 'SabManage') + ' password. My login ID is: ', P.supportPhone, 'WhatsApp ' + (P.supportName || 'Super Admin'), 'btn wa')}<span class="mono small">${esc(P.supportPhone)}</span></div>` : ''}
    ${P.supportEmail ? `<p class="small muted" style="text-align:center">Email: <span class="mono">${esc(P.supportEmail)}</span></p>` : ''}</div>`);
};
A.newPasswordModal = () => formModal({ title: 'Set a new password', fields: [{ name: 'p', label: 'New password', type: 'password', required: true, minlength: 6 }], submit: 'Update password', onSubmit: async v => { if (v.p.length < 6) throw new Error('Use at least 6 characters'); await S.adapter.changeOwnPassword(v.p); toast('Password updated'); } });

V.noOrg = () => `<div class="auth"><section class="auth-brand"><div class="inner"><div class="row-flex"><div class="logo">${MARK_SVG}</div><b style="font:800 21px var(--f-display)">SabManage</b></div><h1>Namaste, <em>${esc((S.user.name || '').split(' ')[0] || 'ji')}</em>!</h1><p>Your login works, but you are not part of any business yet. Start your own business, or ask your employer to add you from their Team & Access screen.</p></div></section>
<section class="auth-side"><div class="auth-card"><div class="auth-top"><span></span>${langSwitch()}</div><div class="card pad stack"><h2>Get started</h2>
<button class="checkcard" onclick="A.newOrgModal()">${ibox('store', '#1F5EFF')}<span class="grow" style="text-align:left">Create my business<div class="tiny muted" style="font-weight:500">You become the Owner</div></span>${ic('chev')}</button>
<button class="btn ghost block" onclick="A.logout()">${ic('logout')} Log out</button></div></div></section></div>`;
A.newOrgModal = () => formModal({
  title: 'Create a business', sub: 'You will be the Owner.',
  fields: [{ name: 'bizName', label: 'Business name', required: true, full: true }, { name: 'phone', label: 'Business phone', type: 'tel' },
  { name: 'kind', label: 'Type of business', type: 'select', options: [['event', 'Tent / catering / event'], ['clinic', 'Doctor / Clinic (certificate needed)']], value: 'event' },
  ...BIZ_TYPES.map(([v, l]) => ({ name: 't_' + v, label: l, type: 'checkbox', value: true }))],
  submit: 'Create', onSubmit: async v => {
    const clinic = v.kind === 'clinic'; const types = clinic ? ['clinic'] : BIZ_TYPES.map(([k]) => k).filter(k => v['t_' + k]);
    const st = defaultSettings({ bizName: v.bizName, owner: S.user.name, phone: v.phone, email: S.user.email, bizTypes: types }); if (clinic) Object.assign(st, clinicDefaults({ name: S.user.name }));
    const id = await S.adapter.createOrg(S.user.id, v.bizName, S.user.name, clinic ? CLINIC_ROLES : ROLE_DEFAULTS, st);
    S.orgs = await S.adapter.myOrgs(S.user.id); await openOrg(id); toast('Business created');
  }
});
A.joinModal = () => formModal({ title: 'Join a team', fields: [{ name: 'code', label: 'Invite code', required: true, placeholder: 'ABCD-2345', full: true }, { name: 'name', label: 'Your name as the team sees it', value: S.user.name, full: true }], submit: 'Join', onSubmit: async v => { const id = await S.adapter.acceptInvite(S.user.id, v.code, v.name); S.orgs = await S.adapter.myOrgs(S.user.id); await openOrg(id); toast('You joined ' + S.org.name); } });

/* ---------- Guest portal ---------- */
A.openGuest = async token => {
  const data = await S.adapter.guestView(token);
  S.guest = { token: String(token).trim().toLowerCase(), ...data };
  try { history.replaceState(null, '', '#guest-' + S.guest.token); } catch (e) { }
  render();
};
A.exitGuest = () => { S.guest = null; try { history.replaceState(null, '', location.pathname); } catch (e) { } render(); };
V.guest = () => {
  const g = S.guest; const e = g.event; const st = g.settings || {};
  const invs = (g.invoices || []).filter(i => i.type === 'invoice');
  const quotes = (g.invoices || []).filter(i => i.type === 'quotation' && !i.converted);
  const calcs = invs.map(i => ({ i, c: invCalc(i, g.payments || []) }));
  const total = sum(calcs, x => x.c.total); const paid = sum(g.payments || [], p => p.amount); const due = Math.max(0, total - paid);
  const tasks = g.tasks || []; const pct = tasks.length ? Math.round(sum(tasks, t => t.progress) / tasks.length) : null;
  const si = Math.max(0, STAGES.indexOf(e.stage));
  const days = [...new Set((e.schedule || []).map(s => s.day || 'Day 1'))];
  const reviewed = (g.reviews || []).some(r => r.source === 'guest');
  return `<div class="stripe"></div><div class="content" style="max-width:760px;padding-bottom:40px">
  <div class="row-flex" style="justify-content:space-between;margin-bottom:14px"><div class="row-flex">${bizLogo(st)}<div><b style="font:800 16px var(--f-display)">${esc(st.bizName || 'Your event team')}</b><div class="tiny muted">${esc(st.phone || '')}</div></div></div><div class="row-flex" style="gap:8px">${langSwitch()}<button class="btn sm ghost" onclick="A.exitGuest()">Exit</button></div></div>
  <div class="evc evhead" style="--c:${evStyle(e)[1]}"><div class="top">${datebox(e.date)}<div style="min-width:0;flex:1;position:relative;z-index:1"><span class="tiny">${esc(e.type || 'Event')}</span><b>${esc(e.title)}</b></div><span style="position:relative;z-index:1">${stagePill(e.stage)}</span></div><div class="bot"><div class="meta"><span>${ic('calendar')}${fmtDay(e.date)}${e.endDate && e.endDate !== e.date ? ' – ' + fmtDay(e.endDate) : ''}</span><span>${ic('pin')}${esc(e.venue || '')}</span><span>${ic('users')}${num(e.pax)} guests</span></div></div></div>
  <div class="card pad stack" style="margin-bottom:14px;margin-top:-2px"><div class="stepper">${STAGES.slice(0, 6).map((s, i) => `<div class="step ${i < si ? 'done' : i === si ? 'cur' : ''}"><i></i>${s}</div>`).join('')}</div>
  ${pct != null ? `<div><div class="row-flex" style="justify-content:space-between"><b>Setup progress</b><b class="num">${pct}%</b></div>${prog(pct)}<div class="stack-sm" style="margin-top:10px">${tasks.map(t => `<div class="row-flex small" style="justify-content:space-between"><span>${esc(t.title)}</span><span class="num muted">${t.progress}%</span></div>`).join('')}</div></div>` : ''}</div>
  ${days.length ? `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Programme</h3></div><div class="rows">${(e.schedule || []).slice().sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time)).map(s => `<div class="row"><span class="pill info mono">${esc(s.time)}</span><div class="main-col"><b>${esc(s.title)}</b><div class="sub">${esc(s.day || '')}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Bill & payment</h3>${due > 0 ? pill('Balance ' + inr(due), 'warn') : total ? pill('Fully paid', 'good') : ''}</div><div class="sheet-b" style="padding-top:12px">
    ${total ? `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${kpi('Bill total', inr(total), '', '', 'receipt', '#DB2777')}${kpi('Paid', inr(paid), '', 'good', 'check', '#0B9B68')}${kpi('Balance', inr(due), '', due > 0 ? 'bad' : 'good', 'clock', due > 0 ? '#E0344B' : '#0B9B68')}</div>` : quotes.length ? `<p>Quotation shared: <b>${inr(invCalc(quotes[0], []).total)}</b> (${esc(quotes[0].no)})</p>` : `<p class="muted">Your bill will appear here once it is issued.</p>`}
    ${(g.payments || []).length ? `<div class="rows card" style="margin-top:10px">${g.payments.map(p => `<div class="row"><div class="main-col"><b>${inr(p.amount)}</b><div class="sub">${fmtDate(p.date)} · ${esc(p.mode)}</div></div>${pill('Received', 'good')}</div>`).join('')}</div>` : ''}
    ${due > 0 && st.upi ? `<div class="banner good" style="margin-top:12px">${ic('rupee')}<div class="grow"><b>Pay by UPI:</b> <span class="mono">${esc(st.upi)}</span><div class="tiny">Send ${inr(due)} and share the screenshot with ${esc(st.bizName)}.</div></div><button class="btn sm" onclick="A.copy('${esc(st.upi)}')">${ic('copy')} Copy</button></div>` : ''}
  </div></div>
  <div class="card pad">${reviewed ? `<h3>Thank you for your review!</h3><p class="muted">It helps ${esc(st.bizName)} serve more families.</p>` : `<h3 style="margin-bottom:8px">How was your experience?</h3>
    <form class="stack" onsubmit="A.guestReview(event)"><div class="grid2" style="padding:0">${fieldHTML({ name: 'stars', label: 'Rating', type: 'select', options: [[5, '★★★★★ Excellent'], [4, '★★★★ Very good'], [3, '★★★ Okay'], [2, '★★ Poor'], [1, '★ Bad']] })}${fieldHTML({ name: 'client', label: 'Your name', value: e.client })}</div>${fieldHTML({ name: 'comment', label: 'Your words', type: 'textarea', placeholder: 'Food, decor, staff behaviour, timing…' })}<button class="btn primary" type="submit">Submit review</button></form>`}</div>
  <div class="card pad stack-sm" style="margin-top:14px">${ibox('share', '#0B9B68')}<h3>Happy with ${esc(st.bizName || 'us')}?</h3><p class="small muted">Recommend them to family and friends planning a function.</p><div class="row-flex">${waBtn(I18N.lang === 'hi' ? `हमारा ${e.type || 'इवेंट'} ${st.bizName || ''} ने किया, काम बहुत अच्छा लगा। आप भी संपर्क करें: ${st.phone || ''}` : `Our ${e.type || 'event'} was done by ${st.bizName || ''} and we were very happy with their work. Contact them: ${st.phone || ''}`, '', 'Recommend on WhatsApp', 'btn wa')}${st.googleReview ? `<a class="btn" href="${esc(st.googleReview)}" target="_blank" rel="noopener">${ic('star')} Review on Google</a>` : ''}${st.instagram ? `<a class="btn ghost" href="${esc(st.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}</div></div>
  <p class="tiny muted" style="text-align:center;margin-top:16px"><a href="https://sabmanage.com/?utm_source=client-page" target="_blank" rel="noopener" style="color:inherit">Powered by SabManage</a></p></div>`;
};
A.guestReview = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { await S.adapter.guestReview(S.guest.token, { stars: +v.stars, client: v.client, comment: v.comment }); S.guest = { token: S.guest.token, ...(await S.adapter.guestView(S.guest.token)) }; render(); toast('Thank you! Review submitted.'); }); };


/* ---------- Authenticator (2-step login) ---------- */
V.mfa = () => {
  const P = S.platform || DEFAULT_PLATFORM;
  return `<div class="auth"><section class="auth-brand"><div class="inner"><div class="row-flex"><div class="logo">${MARK_SVG}</div><b style="font:800 21px var(--f-display)">${esc(P.appName || 'SabManage')}</b></div><h1>One more <em>step</em>.</h1><p>Your account is protected with an Authenticator app. Open Google Authenticator (or Microsoft Authenticator) on your phone and type the 6-digit code for ${esc(P.appName || 'SabManage')}.</p></div></section>
  <section class="auth-side"><div class="auth-card"><div class="auth-top"><span></span>${langSwitch()}</div><form class="card pad stack" onsubmit="A.doMfa(event)">${ibox('shield', '#0B9B68', 'lg')}<h2>Enter your 6-digit code</h2>
    <p class="small muted">Logging in as <b>${esc(displayId(S.mfaPending?.email || ''))}</b></p>
    <input id="f_code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required placeholder="123 456" style="font:700 28px var(--f-mono);letter-spacing:.3em;text-align:center">
    <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Verify and continue</button>
    <p class="tiny muted">Lost your phone? Employees: ask your business owner. Owners: contact ${esc(P.supportName || 'Super Admin')}${P.supportPhone ? ' on ' + esc(P.supportPhone) : ''}.</p>
    <button type="button" class="btn ghost block" onclick="A.logout()">${ic('logout')} Use a different login</button></form></div></section></div>`;
};
A.doMfa = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { await S.adapter.mfaLoginVerify(v.code); S.user = S.mfaPending; S.mfaPending = null; await afterLogin(); toast('Welcome back, ' + ((S.me?.name || S.user.name) || '').split(' ')[0]); }); };
A.mfaSheet = async () => {
  if (S.adapter.mode !== 'cloud') { toast('Authenticator works only in the live app', 'warn'); return; }
  let on = false; try { on = await S.adapter.mfaIsOn(); } catch (e) { }
  S.mfaOn = on;
  if (on) {
    modal(`${sheetHead('Authenticator', 'Two-step login')}<div class="sheet-b stack"><div class="banner good">${ic('check')}<span><b>On.</b> Every login asks for the 6-digit code from your Authenticator app. Even if someone learns your password, they cannot open your account.</span></div>
      <button class="btn danger" onclick="A.mfaOff()">${ic('x')} Turn off authenticator</button></div>`);
    return;
  }
  modal(`${sheetHead('Authenticator', 'Protect your login with a 6-digit code')}<div class="sheet-b stack" id="mfaBox">
    <div class="stack-sm small"><div class="row-flex" style="flex-wrap:nowrap">${ibox('download', '#1F5EFF', 'sm')}<span>1. Install <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> from Play Store / App Store.</span></div>
    <div class="row-flex" style="flex-wrap:nowrap">${ibox('eye', '#7C3AED', 'sm')}<span>2. Tap Start below and scan the QR code with that app.</span></div>
    <div class="row-flex" style="flex-wrap:nowrap">${ibox('key', '#0B9B68', 'sm')}<span>3. Type the 6-digit code it shows. Done.</span></div></div>
    <button class="btn primary block" onclick="A.mfaStart()">${ic('shield')} Start setup</button></div>`);
};
A.mfaStart = async () => {
  try {
    const f = await S.adapter.mfaEnroll(); S.mfaEnrolling = f.id;
    $('#mfaBox').innerHTML = `<div style="display:grid;place-items:center"><img src="${esc(f.qr)}" alt="QR code" style="width:210px;height:210px;background:#fff;border-radius:16px;padding:8px;border:1px solid var(--line)"></div>
      <div class="small muted" style="text-align:center">Can't scan? Type this key in the app:<div class="mono" style="font-size:14px;color:var(--ink);overflow-wrap:anywhere;margin-top:4px">${esc(f.secret)}</div><button class="linkbtn" onclick="A.copy('${esc(f.secret)}')">${ic('copy')} Copy key</button></div>
      <form class="stack-sm" onsubmit="A.mfaConfirm(event)"><input id="f_code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required placeholder="6-digit code" style="font:700 24px var(--f-mono);letter-spacing:.25em;text-align:center"><button class="btn primary block" type="submit">Verify and turn on</button></form>`;
  } catch (e) { toast(e.message, 'bad'); }
};
A.mfaConfirm = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { await S.adapter.mfaVerify(S.mfaEnrolling, v.code); S.mfaOn = true; A.closeModal(); toast('Authenticator is on. You will need the code at every login.'); render(); }); };
A.mfaOff = () => confirmBox('Turn off authenticator?', 'Your login will need only the password again. You can turn it back on any time.', 'Turn off', async () => { await S.adapter.mfaDisable(); S.mfaOn = false; toast('Authenticator turned off'); render(); });
A.resetMfa = (userId, orgId, name) => confirmBox('Reset authenticator?', `${name || 'This person'} will log in with just the password next time, and can set up the authenticator again on their new phone.`, 'Reset authenticator', async () => { const n = await S.adapter.resetUserMfa(userId, orgId); toast(n ? 'Authenticator reset' : 'They did not have an authenticator on'); if (S.view === 'admin') await A.adminLoad(); }, 'primary');

/* ---------- business type + doctor verification ---------- */
const KIND_CARDS = [['tent', 'Tent House', 'Stock, bookings, crew', 'tent', '#2563EB'], ['caterer', 'Caterer / Halwai', 'Menu, ration, plates', 'pot', '#16A34A'],
  ['event', 'Event Manager', 'Planning, vendors, setup', 'sparkle', '#DB2777'], ['clinic', 'Doctor / Clinic', 'Patients, reports, appointments', 'steth', '#E11D48']];
const COUNCILS = ['National Medical Commission (NMC)', 'Rajasthan Medical Council', 'Delhi Medical Council', 'Maharashtra Medical Council', 'Gujarat Medical Council', 'Uttar Pradesh Medical Council', 'Madhya Pradesh Medical Council', 'Haryana Medical Council', 'Punjab Medical Council', 'Bihar Medical Council', 'West Bengal Medical Council', 'Karnataka Medical Council', 'Tamil Nadu Medical Council', 'Telangana State Medical Council', 'Andhra Pradesh Medical Council', 'Kerala (TCMC)', 'Dental Council (State / DCI)', 'AYUSH / Ayurveda / Homoeopathy Board', 'Physiotherapy Council', 'Other state council'];
const SPECIALITIES = ['General Physician', 'Diabetologist', 'Cardiologist', 'Physiotherapist', 'Paediatrician', 'Gynaecologist', 'Dermatologist', 'Orthopaedic', 'ENT', 'Eye specialist', 'Dentist', 'Psychiatrist', 'Dietitian', 'Ayurveda', 'Homoeopathy', 'Other'];
function doctorFieldsHTML(v) {
  return `<div class="banner" style="font-size:13px">${ic('shield')}<span>For patient safety we check every doctor. Upload your registration certificate. The app opens after our team approves it, usually within 24 hours.</span></div>
  <div class="grid2" style="padding:0">
  ${fieldHTML({ name: 'regNo', label: 'Medical registration number *', value: v.reg_no || '', placeholder: 'e.g. RMC/12345' })}
  ${fieldHTML({ name: 'council', label: 'Medical council *', type: 'select', options: [['', '— Choose —'], ...COUNCILS], value: v.council || '' })}
  ${fieldHTML({ name: 'qualification', label: 'Qualification', value: v.qualification || '', placeholder: 'e.g. MBBS, MD (Medicine)' })}
  ${fieldHTML({ name: 'specialisation', label: 'Speciality', type: 'select', options: SPECIALITIES, value: v.specialisation || 'General Physician' })}</div>
  <label class="field"><span>Registration certificate (photo or PDF) *</span><input type="file" name="cert" accept="image/*,application/pdf" multiple><small>You can add your degree too. Up to 6 files, 10 MB each.</small></label>`;
}
A.pickKind = el => {
  const f = el.form; const boxes = [...f.querySelectorAll('input[name=bizTypes]')];
  if (el.value === 'clinic' && el.checked) boxes.forEach(b => { if (b !== el) b.checked = false; });
  if (el.value !== 'clinic' && el.checked) boxes.forEach(b => { if (b.value === 'clinic') b.checked = false; });
  const clinic = boxes.some(b => b.value === 'clinic' && b.checked);
  const d = f.querySelector('#docFields'); if (d) d.hidden = !clinic;
  const lab = f.querySelector('#bizNameLabel'); if (lab) lab.textContent = T(clinic ? 'Clinic / hospital name *' : 'Business name *');
  const bn = f.querySelector('[name=bizName]'); if (bn) bn.placeholder = clinic ? 'e.g. Sharma Clinic' : 'e.g. Shree Ganesh Tent House';
};
function doctorCheck(v, files) {
  if (!(v.regNo || '').trim()) return 'Write your medical registration number';
  if (!v.council) return 'Choose your medical council';
  if (!files.length) return 'Upload your registration certificate';
  if (files.length > 6) return 'Up to 6 files';
  for (const f of files) { if (!/^image\/|^application\/pdf$/.test(f.type)) return 'Certificate must be a photo or a PDF'; if (f.size > 10e6) return 'Each file must be under 10 MB'; }
  return '';
}
function clinicDefaults(v) { return { doctorName: v.name || '', regNo: (v.regNo || '').trim(), council: v.council || '', qualification: (v.qualification || '').trim(), specialisation: v.specialisation || 'General Physician', timings: '', feeClinic: '', feeVideo: '', terms: '' }; }
/* resize a photo before upload (saves data and storage); PDFs and audio go as they are */
async function shrinkPhoto(file, max = 1800, q = .82) {
  if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type)) return file;
  try {
    const url = URL.createObjectURL(file); const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); return blob && blob.size < file.size ? blob : file;
  } catch (e) { return file; }
}
const extOf = (blob, name = '') => blob.type === 'application/pdf' ? 'pdf' : /^audio\//.test(blob.type) ? (blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('mpeg') ? 'mp3' : 'webm') : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
async function sendVerification(orgId, v, files) {
  const up = [];
  for (const f of files) { const b = await shrinkPhoto(f); const path = `${orgId}/${uid('c_')}.${extOf(b, f.name)}`; await S.adapter.uploadFile('verify', path, b); up.push({ path, name: f.name.slice(0, 80), type: b.type === 'application/pdf' ? 'pdf' : 'image' }); }
  await S.adapter.submitVerification(orgId, { doctor_name: v.name || v.doctorName || '', reg_no: (v.regNo || '').trim(), council: v.council, qualification: (v.qualification || '').trim(), specialisation: v.specialisation || '', files: up });
}
A.openFile = async (bucket, path) => { const w = window.open('', '_blank'); try { const u = await S.adapter.fileUrl(bucket, path); if (!u) throw new Error('File not found'); if (w) w.location = u; else location.href = u; } catch (e) { if (w) w.close(); toast(e.message, 'bad'); } };

/* waiting for approval */
V.verify = () => {
  const P = S.platform || DEFAULT_PLATFORM; const o = S.org; const v = S.myVerify && S.myVerify.orgId === o.orgId ? S.myVerify.v : undefined;
  if (v === undefined) { if (!S.myVerifyLoading) { S.myVerifyLoading = true; S.adapter.myVerification(o.orgId).then(x => { S.myVerify = { orgId: o.orgId, v: x }; }).catch(() => { S.myVerify = { orgId: o.orgId, v: null }; }).finally(() => { S.myVerifyLoading = false; render(); }); } }
  const st = v?.status; const pending = st === 'pending';
  const sup = P.supportPhone ? waBtn(`Namaste, I am Dr. ${S.me?.name || S.user.name} (${o.name}). Please check my certificate for ${P.appName}.`, P.supportPhone, 'WhatsApp support', 'btn wa') : '';
  return `<div class="auth"><section class="auth-brand"><div class="inner"><div class="row-flex"><div class="logo" style="background:#E11D48">${ic('steth')}</div><b style="font:800 21px var(--f-display)">${esc(o.name)}</b></div>
    <h1>${pending ? 'We are <em>checking</em> your certificate.' : 'One step <em>left</em>: verify you are a doctor.'}</h1>
    <p>${pending ? 'Our team checks your registration with the medical council. This usually takes less than 24 hours. You will get a WhatsApp message, and the app opens here by itself.' : 'Patients trust the doctors on SabManage. Upload your medical registration certificate once. After approval you can add patients, appointments and reports.'}</p></div></section>
  <section class="auth-side"><div class="auth-card"><div class="auth-top"><span></span>${langSwitch()}</div><div class="card pad stack">
    ${v === undefined ? `<p class="muted">Loading…</p>` : pending ? `<div class="banner warn">${ic('clock')}<span><b>Verification pending</b> · sent ${v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span></div>
      <div class="stack-sm small"><div><span class="muted">Registration no.</span> <b>${esc(v.reg_no || '')}</b></div><div><span class="muted">Council</span> <b>${esc(v.council || '')}</b></div><div><span class="muted">Files</span> <b>${(v.files || []).length}</b></div></div>
      <div class="row-flex">${sup}<button class="btn" onclick="S.myVerify=null;A.recheckVerify()">${ic('pulse')} Check again</button></div>
      <button class="linkbtn" onclick="S.myVerify={orgId:'${o.orgId}',v:{...S.myVerify.v,status:'edit'}};render()">Change details or add a file</button>`
    : `${st === 'rejected' ? `<div class="banner bad">${ic('alert')}<span><b>Not approved yet.</b> ${esc(v.note || 'Please upload a clear photo of your registration certificate.')}</span></div>` : ''}
      <form class="stack" onsubmit="A.doVerify(event)" novalidate>${doctorFieldsHTML(v || settings())}<button class="btn primary block" style="min-height:50px" type="submit">${ic('upload')} Send for approval</button></form>${sup}`}
    ${S.orgs.length > 1 ? `<div class="eyebrow">Your other businesses</div>${S.orgs.filter(x => x.orgId !== o.orgId).map(x => `<button class="btn" style="justify-content:space-between" onclick="A.switchOrg('${x.orgId}')"><span>${esc(x.name)}</span>${ic('chev')}</button>`).join('')}` : ''}
    <button class="btn ghost block" onclick="A.logout()">${ic('logout')} Log out</button></div></div></section></div>`;
};
A.doVerify = e => {
  e.preventDefault(); const v = readForm(e.target); const files = [...(e.target.querySelector('[name=cert]')?.files || [])];
  const err = doctorCheck(v, files); if (err) { toast(err, 'bad'); return; }
  withBtn(e, async () => { await sendVerification(S.org.orgId, { ...v, name: S.me?.name || S.user.name }, files); S.myVerify = null; toast('Sent. We will check it soon.'); await A.recheckVerify(); });
};
A.recheckVerify = async () => { try { S.orgs = await S.adapter.myOrgs(S.user.id); const o = S.orgs.find(x => x.orgId === S.org.orgId); if (o && orgState(o) !== 'verify') { await openOrg(o.orgId); toast('Approved! Welcome to SabManage.'); return; } if (o) S.org = o; } catch (e) { } render(); };
