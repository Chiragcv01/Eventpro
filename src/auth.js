/* ================= Auth, onboarding, guest portal ================= */
const V = {};

V.auth = () => {
  const tab = S.authTab;
  const openSignup = S.platform?.allowSignup !== false;
  const tabs = [['login', 'Log in'], ...(openSignup ? [['signup', 'New business']] : []), ['guest', 'Client']];
  const bizIcon = { tent: ['tent', '#2563EB'], caterer: ['pot', '#16A34A'], event: ['sparkle', '#DB2777'] };
  const types = BIZ_TYPES.map(([v, l]) => `<label class="checkcard">${ibox(bizIcon[v][0], bizIcon[v][1], 'sm')}<span class="grow">${l}</span><input type="checkbox" name="bizTypes" value="${v}" data-multi="1" checked></label>`).join('');
  const forms = {
    login: `<form class="stack" onsubmit="A.doLogin(event)">
      ${fieldHTML({ name: 'email', label: 'Login ID (email or mobile number)', required: true, autocomplete: 'username', placeholder: 'you@business.in or 98290 12345' })}
      ${fieldHTML({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' })}
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Log in</button>
      <button type="button" class="linkbtn" style="align-self:center" onclick="A.forgotModal()">Forgot password?</button></form>`,
    signup: `<form class="stack" onsubmit="A.doSignup(event)">
      <div class="grid2" style="padding:0">${fieldHTML({ name: 'name', label: 'Your name', required: true, autocomplete: 'name' })}${fieldHTML({ name: 'phone', label: 'Mobile', type: 'tel', required: true, placeholder: '98290 12345', autocomplete: 'tel' })}</div>
      ${fieldHTML({ name: 'bizName', label: 'Business name', required: true, placeholder: 'e.g. Shree Ganesh Tent House' })}
      <div class="field"><span>What do you do? Pick all that apply</span><div class="stack-sm">${types}</div></div>
      ${fieldHTML({ name: 'email', label: 'Your login ID: email or mobile number', required: true, autocomplete: 'username', hint: 'You will use this to log in every time' })}
      ${fieldHTML({ name: 'password', label: 'Password (min 6 characters)', type: 'password', required: true, minlength: 6, autocomplete: 'new-password' })}
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">Create my business account</button>
      <p class="tiny muted">You become the Owner with full access. Inside the app you create login IDs and passwords for your manager, accountant and staff, and decide what each person can see.</p></form>`,
    guest: `<form class="stack" onsubmit="A.doGuest(event)">
      <div class="banner">${ic('eye')}<span>See your own event only: setup progress, programme, bill, balance and how to pay. No login needed.</span></div>
      ${fieldHTML({ name: 'code', label: 'Event code from your organiser', required: true, placeholder: 'e.g. k3m9xq2p7a' })}
      <button class="btn primary block" style="min-height:50px;font-size:16px" type="submit">View my event</button></form>`
  };
  const showcase = [['Bookings', 'calendar', '#7C3AED'], ['Tent stock', 'tent', '#2563EB'], ['Catering', 'pot', '#16A34A'], ['GST bills', 'receipt', '#DB2777'], ['Payments', 'rupee', '#0B9B68'], ['Live setup', 'pulse', '#0EA5E9'], ['Crew', 'users', '#0D9488'], ['Reports', 'chart', '#0891B2']];
  return `<div class="auth">
  <section class="auth-brand"><div class="inner">
    <div class="row-flex"><div class="logo">${ic('tent')}</div><div><b style="font:800 21px/1 var(--f-display);display:block">EventPro</b><span class="tiny muted">Tent · Catering · Events</span></div></div>
    <h1>Tent, catering aur event ka <em>poora hisaab</em>, ek app mein.</h1>
    <p class="desk-only">Bookings, godown stock, halwai ration, GST bills, payment reminders, crew attendance and profit for every event.</p>
    <div class="showcase">${showcase.map(([l, i, c]) => `<div class="sc">${ibox(i, c, 'lg')}<span>${l}</span></div>`).join('')}</div>
  </div></section>
  <section class="auth-side"><div class="auth-card">
    <div class="seg" role="tablist" style="width:100%">${tabs.map(([v, l]) => `<button role="tab" style="flex:1" class="${tab === v ? 'on' : ''}" onclick="A.authTab('${v}')">${l}</button>`).join('')}</div>
    <div class="card pad">${forms[tab]}</div>
    ${S.platform?.supportPhone ? `<p class="small" style="text-align:center">Need help? ${waBtn('Namaste, I need help with ' + (S.platform.appName || 'EventPro') + '.', S.platform.supportPhone, (S.platform.supportName || 'Support') + ' on WhatsApp', 'linkbtn')}</p>` : ''}
    <p class="tiny muted" style="text-align:center">${cloudReady() ? 'Secure login. Your data is saved in the cloud and shared only with your team.' : 'Offline mode: accounts and data stay on this device only.'}</p>
  </div></section></div>`;
};
A.authTab = t => { S.authTab = t; render(); };
function formVals(e) { e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return null; } return readForm(f); }
async function withBtn(e, fn) { const b = e.target.querySelector('button[type=submit]'); if (b) b.disabled = true; try { await fn(); } catch (err) { toast(err.message || String(err), 'bad'); } finally { if (b) b.disabled = false; } }

A.doLogin = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { S.user = await S.adapter.signIn(loginId(v.email), v.password); await afterLogin(); toast('Welcome back, ' + (S.me?.name || S.user.name).split(' ')[0]); }); };
A.doSignup = e => {
  const v = formVals(e); if (!v) return;
  if (!v.bizTypes?.length) { toast('Pick at least one business type', 'bad'); return; }
  withBtn(e, async () => {
    const email = loginId(v.email); if (!email.includes('@')) throw new Error('Enter an email or a 10-digit mobile number');
    if ((v.password || '').length < 6) throw new Error('Password must be at least 6 characters');
    const st = defaultSettings({ bizName: v.bizName, owner: v.name, phone: v.phone, email: email.endsWith('@' + MOBILE_DOMAIN) ? '' : email, bizTypes: v.bizTypes });
    await S.adapter.signUpBusiness({ email, password: v.password, name: v.name, phone: v.phone, bizName: v.bizName, roles: ROLE_DEFAULTS, settings: st });
    S.user = await S.adapter.signIn(email, v.password); await afterLogin(); toast('Business created. You are the Owner.');
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
    ${P.supportPhone ? `<div class="row-flex" style="justify-content:center">${waBtn('Namaste, I forgot my ' + (P.appName || 'EventPro') + ' password. My login ID is: ', P.supportPhone, 'WhatsApp ' + (P.supportName || 'Super Admin'), 'btn wa')}<span class="mono small">${esc(P.supportPhone)}</span></div>` : ''}
    ${P.supportEmail ? `<p class="small muted" style="text-align:center">Email: <span class="mono">${esc(P.supportEmail)}</span></p>` : ''}</div>`);
};
A.newPasswordModal = () => formModal({ title: 'Set a new password', fields: [{ name: 'p', label: 'New password', type: 'password', required: true, minlength: 6 }], submit: 'Update password', onSubmit: async v => { if (v.p.length < 6) throw new Error('Use at least 6 characters'); await S.adapter.changeOwnPassword(v.p); toast('Password updated'); } });

V.noOrg = () => `<div class="auth"><section class="auth-brand"><div class="inner"><div class="row-flex"><div class="logo">${ic('tent')}</div><b style="font:800 21px var(--f-display)">EventPro</b></div><h1>Namaste, <em>${esc((S.user.name || '').split(' ')[0] || 'ji')}</em>!</h1><p>Your login works, but you are not part of any business yet. Start your own business, or ask your employer to add you from their Team & Access screen.</p></div></section>
<section class="auth-side"><div class="auth-card"><div class="card pad stack"><h2>Get started</h2>
<button class="checkcard" onclick="A.newOrgModal()">${ibox('store', '#1F5EFF')}<span class="grow" style="text-align:left">Create my business<div class="tiny muted" style="font-weight:500">You become the Owner</div></span>${ic('chev')}</button>
<button class="btn ghost block" onclick="A.logout()">${ic('logout')} Log out</button></div></div></section></div>`;
A.newOrgModal = () => formModal({
  title: 'Create a business', sub: 'You will be the Owner.',
  fields: [{ name: 'bizName', label: 'Business name', required: true, full: true }, { name: 'phone', label: 'Business phone', type: 'tel' },
  ...BIZ_TYPES.map(([v, l]) => ({ name: 't_' + v, label: l, type: 'checkbox', value: true }))],
  submit: 'Create', onSubmit: async v => {
    const types = BIZ_TYPES.map(([k]) => k).filter(k => v['t_' + k]);
    const id = await S.adapter.createOrg(S.user.id, v.bizName, S.user.name, ROLE_DEFAULTS, defaultSettings({ bizName: v.bizName, owner: S.user.name, phone: v.phone, email: S.user.email, bizTypes: types }));
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
  <div class="row-flex" style="justify-content:space-between;margin-bottom:14px"><div class="row-flex">${bizLogo(st)}<div><b style="font:800 16px var(--f-display)">${esc(st.bizName || 'Your event team')}</b><div class="tiny muted">${esc(st.phone || '')}</div></div></div><button class="btn sm ghost" onclick="A.exitGuest()">Exit</button></div>
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
  <p class="tiny muted" style="text-align:center;margin-top:16px">Powered by EventPro OS</p></div>`;
};
A.guestReview = e => { const v = formVals(e); if (!v) return; withBtn(e, async () => { await S.adapter.guestReview(S.guest.token, { stars: +v.stars, client: v.client, comment: v.comment }); S.guest = { token: S.guest.token, ...(await S.adapter.guestView(S.guest.token)) }; render(); toast('Thank you! Review submitted.'); }); };

