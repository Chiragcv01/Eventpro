/* ================= Branding on documents ================= */
const BRAND_SWATCHES = ['#1F5EFF', '#B4235A', '#C2410C', '#B45309', '#15803D', '#0F766E', '#6D28D9', '#0F172A'];
function brandColor(st) { return /^#[0-9a-f]{6}$/i.test(st.brandColor || '') ? st.brandColor : '#1F5EFF'; }
function paperHead(st, title, meta) {
  const contact = [st.phone, st.email, st.website].filter(Boolean).map(esc).join(' · ');
  return `<div class="pstripe"></div><div class="phd">${st.logo ? `<img class="plogo" src="${esc(st.logo)}" alt="">` : ''}<div class="pbiz"><h2 class="biz">${esc(st.bizName || 'Your business name')}</h2>${st.tagline ? `<div class="ptag">${esc(st.tagline)}</div>` : ''}<div class="pm">${esc([st.address, st.city, st.state].filter(Boolean).join(', '))}</div>${contact ? `<div class="pm">${contact}</div>` : ''}${st.gstin ? `<div class="pm mono">GSTIN ${esc(st.gstin)}${st.pan ? ' · PAN ' + esc(st.pan) : ''}</div>` : ''}</div><div class="pmeta"><b class="ptitle">${title}</b>${meta}</div></div>`;
}
function signBlock(st, inline) { return `<div class="psign" ${inline ? '' : 'style="margin-top:18px"'}>${st.stamp ? `<img src="${esc(st.stamp)}" alt="">` : '<div style="height:40px"></div>'}<div>For ${esc(st.bizName)}</div><span class="pm">Authorised signatory</span></div>`; }

A.uploadImg = (kind, file) => {
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Choose an image file (PNG or JPG)', 'bad'); return; }
  if (file.size > 5e6) { toast('This image is over 5 MB. Choose a smaller one.', 'bad'); return; }
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = async () => {
      const max = kind === 'logo' ? 360 : 480; const w = img.naturalWidth || 300, h = img.naturalHeight || 300; const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let url = c.toDataURL('image/png'); if (url.length > 260000) url = c.toDataURL('image/jpeg', .85);
      try { await saveSettingsRec({ [kind]: url }); logAct(kind === 'logo' ? 'Updated business logo' : 'Updated stamp / signature'); toast(kind === 'logo' ? 'Logo saved. It now shows on all bills.' : 'Stamp saved'); render(); } catch (e) { toast(e.message, 'bad'); }
    };
    img.onerror = () => toast('Could not read this image. Try a PNG or JPG.', 'bad');
    img.src = r.result;
  };
  r.readAsDataURL(file);
};
A.removeImg = async kind => { try { await saveSettingsRec({ [kind]: '' }); render(); } catch (e) { toast(e.message, 'bad'); } };
A.setBrand = async c => { if (!/^#[0-9a-f]{6}$/i.test(c)) return; try { await saveSettingsRec({ brandColor: c }); render(); } catch (e) { toast(e.message, 'bad'); } };

function brandingCard() {
  const st = settings(); const edit = can('settings', 2); const bc = brandColor(st);
  const up = (kind, label, hint) => `<div class="upl"><div class="imgbox ${kind}">${st[kind] ? `<img src="${esc(st[kind])}" alt="">` : ic(kind === 'logo' ? 'store' : 'edit')}</div><div style="min-width:0"><b>${label}</b><div class="tiny muted">${hint}</div>${edit ? `<div class="row-flex" style="margin-top:8px;gap:6px"><label class="btn sm soft">${ic('upload')} ${st[kind] ? 'Change' : 'Upload'}<input type="file" accept="image/*" hidden onchange="A.uploadImg('${kind}', this.files[0])"></label>${st[kind] ? `<button class="btn sm ghost danger" onclick="A.removeImg('${kind}')">Remove</button>` : ''}</div>` : ''}</div></div>`;
  return `<div class="card"><div class="card-h"><div><h3>Your branding on bills</h3><p>Logo, stamp and colour appear on every invoice, quotation, challan, receipt and your client page.</p></div></div>
  <div class="brandgrid">${up('logo', 'Business logo', 'PNG or JPG. Square or round logos look best.')}${up('stamp', 'Stamp / signature', 'Printed above “Authorised signatory”.')}
    <div class="upl" style="display:block"><b>Bill colour</b><div class="tiny muted">Used for your name, headings and table on bills</div><div class="swatches">${BRAND_SWATCHES.map(c => `<button class="sw ${c.toLowerCase() === bc.toLowerCase() ? 'on' : ''}" style="background:${c}" ${edit ? `onclick="A.setBrand('${c}')"` : 'disabled'} aria-label="Colour ${c}"></button>`).join('')}${edit ? `<label class="sw custom" title="Pick any colour" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"><input type="color" value="${bc}" onchange="A.setBrand(this.value)"></label>` : ''}</div></div></div>
  <div style="padding:0 18px 18px"><div class="eyebrow" style="margin-bottom:8px">Live preview</div><div class="paper mini" style="--pb:${bc}">${paperHead(st, 'TAX INVOICE', `<div class="mono">${esc(st.invPrefix || 'INV')}/${fyOf()}/001</div><div class="pm">${fmtDate(todayLocal())}</div>`)}</div></div></div>`;
}
function planCard() {
  if (!S.org) return '';
  const P = S.platform || DEFAULT_PLATFORM; const stt = orgState(S.org); const [lab, tone] = STATE_PILL[stt] || ['Active', 'good'];
  const left = S.org.expires ? daysBetween(todayLocal(), S.org.expires) : null;
  return `<div class="card pad row-flex" style="justify-content:space-between">${ibox('star', '#EAB308', 'lg')}<div class="grow" style="min-width:200px"><div class="row-flex" style="gap:8px"><h3>${esc(S.org.plan || 'Pro')} plan</h3>${pill(lab, tone)}</div><p class="small muted">${S.org.expires ? (left >= 0 ? `Valid till ${fmtDate(S.org.expires)} · ${left} day${left === 1 ? '' : 's'} left` : `Expired on ${fmtDate(S.org.expires)}`) : 'No expiry date'}${P.supportPhone ? ` · Support ${esc(P.supportPhone)}` : ''}</p></div>
  ${P.supportPhone ? waBtn(`Namaste, I want to renew/upgrade ${P.appName} for ${settings().bizName}. Current plan: ${S.org.plan}.`, P.supportPhone, 'Renew / upgrade', 'btn wa') : ''}${S.super ? `<button class="btn" onclick="A.go('admin')">${ic('shield')} Manage in console</button>` : ''}</div>`;
}

/* ================= Account paused screen ================= */
V.blocked = () => {
  const P = S.platform || DEFAULT_PLATFORM; const st = settings();
  return `<div class="auth"><section class="auth-brand"><div class="inner"><div class="row-flex">${bizLogo(st)}<b style="font:800 21px var(--f-display)">${esc(st.bizName || S.org.name)}</b></div><h1>Access is <em>paused</em> for this business.</h1><p>Your data is safe. ${esc(P.appName)} has paused this account, usually because of a pending renewal. Contact support to restore access.</p></div></section>
  <section class="auth-side"><div class="auth-card"><div class="card pad stack"><h2>Get access back</h2>
  ${P.supportPhone ? `<div class="checkcard">${ibox('phone', '#0B9B68')}<span class="grow">${esc(P.supportName)}<div class="mono small" style="font-weight:500">${esc(P.supportPhone)}</div></span>${waBtn(`Namaste, ${st.bizName} account is paused. Please help me restore it.`, P.supportPhone, 'WhatsApp')}</div>` : ''}
  ${P.supportEmail ? `<div class="checkcard">${ibox('send', '#1F5EFF')}<span class="grow">Email<div class="small" style="font-weight:500">${esc(P.supportEmail)}</div></span><button class="btn sm" onclick="A.copy('${esc(P.supportEmail)}')">${ic('copy')}</button></div>` : ''}
  ${S.orgs.length > 1 ? `<div class="eyebrow">Your other businesses</div>${S.orgs.filter(o => o.orgId !== S.org.orgId).map(o => `<button class="btn" style="justify-content:space-between" onclick="A.switchOrg('${o.orgId}')"><span>${esc(o.name)}</span>${ic('chev')}</button>`).join('')}` : ''}
  <button class="btn ghost block" onclick="A.logout()">${ic('logout')} Log out</button></div></div></section></div>`;
};

/* ================= Super Admin console ================= */
A.adminLoad = async () => {
  S.adminLoading = true;
  try { const [orgs, users, plat] = await Promise.all([S.adapter.adminOverview(), S.adapter.adminUsers(), S.adapter.getPlatform()]); S.admin = { orgs, users, loaded: true }; S.platform = plat; }
  catch (e) { S.admin = { orgs: [], users: [], loaded: true, error: e.message }; }
  S.adminLoading = false; if (S.view === 'admin') render();
};
A.exitOrg = () => { S.org = null; S.data = {}; S.me = null; S.role = null; S.view = 'admin'; S.params = {}; A.adminLoad(); render(); };
A.adminOpen = async id => {
  const o = (S.admin?.orgs || []).find(x => x.orgId === id); if (!o) return;
  const mine = S.orgs.find(x => x.orgId === id);
  try { await openOrg(id, mine ? { ...mine, ...pickMeta(o) } : { orgId: id, name: o.name, role: 'owner', ...pickMeta(o), viewAs: true }); window.scrollTo({ top: 0 }); } catch (e) { toast(e.message, 'bad'); }
};
const pickMeta = o => ({ status: o.status, plan: o.plan, expires: o.expires, notes: o.notes });
function planPrice(name) { return +((S.platform?.plans || DEFAULT_PLATFORM.plans).find(p => p.name === name)?.price || 0); }

V.admin = () => {
  const head = pageHead('Super Admin', 'Every business on your platform: plans, renewals, users and access.', `<button class="btn" onclick="A.adminLoad()">${ic('pulse')} Refresh</button><button class="btn primary" onclick="A.adminAddBusiness()">${ic('plus')} Add business</button>`, '', ['shield', '#0F172A']);
  if (!S.admin?.loaded) { if (!S.adminLoading) setTimeout(A.adminLoad); return head + `<div class="card">${empty('Loading all businesses…', 'Fetching plans, users and activity.', '', 'shield', '#0F172A')}</div>`; }
  if (S.admin.error) return head + `<div class="banner bad">${ic('alert')}<span>${esc(S.admin.error)}</span></div>`;
  const tab = S.params.tab || 'biz'; const t = todayLocal();
  const rows = S.admin.orgs.map(o => ({ ...o, state: orgState(o), left: o.expires ? daysBetween(t, o.expires) : null }));
  const live = rows.filter(r => ['trial', 'active'].includes(r.state));
  const expiring = live.filter(r => r.left != null && r.left <= 7);
  const paid = rows.filter(r => r.state === 'active');
  const mrr = sum(paid, r => planPrice(r.plan));
  const tabs = `<div class="tabs">${[['biz', `Businesses (${rows.length})`], ['users', `Users (${S.admin.users.length})`], ['platform', 'Plans & support']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}</button>`).join('')}</div>`;
  const kp = `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    ${kpi('Businesses', rows.length, `${S.admin.users.length} users in total`, '', 'store', '#1F5EFF')}
    ${kpi('Paid & active', paid.length, `Monthly value ${inr(mrr)}`, 'good', 'check', '#0B9B68')}
    ${kpi('On free trial', rows.filter(r => r.state === 'trial').length, `${expiring.length} expire within 7 days`, expiring.length ? 'accent' : '', 'clock', '#D97706')}
    ${kpi('Expired / paused', rows.filter(r => ['expired', 'suspended'].includes(r.state)).length, 'Read-only or blocked', rows.some(r => ['expired', 'suspended'].includes(r.state)) ? 'bad' : '', 'alert', '#E0344B')}
  </div>`;
  if (tab === 'users') return head + kp + tabs + adminUsers();
  if (tab === 'platform') return head + kp + tabs + adminPlatform();
  const f = S.filters.adm || 'All'; const q = (S.filters.admQ || '').toLowerCase();
  let list = rows;
  if (f === 'Trial') list = list.filter(r => r.state === 'trial');
  if (f === 'Paid') list = list.filter(r => r.state === 'active');
  if (f === 'Expiring soon') list = expiring;
  if (f === 'Expired') list = list.filter(r => r.state === 'expired');
  if (f === 'Suspended') list = list.filter(r => r.state === 'suspended');
  if (q) list = list.filter(r => [r.name, r.ownerName, r.ownerEmail, r.ownerPhone, r.city].join(' ').toLowerCase().includes(q));
  return head + kp + tabs + `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search business, owner, phone or city" value="${esc(S.filters.admQ || '')}" onchange="A.setF('admQ',this.value)"></div></div>
  <div class="chips" style="margin-bottom:14px">${['All', 'Trial', 'Paid', 'Expiring soon', 'Expired', 'Suspended'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('adm','${c}')">${c}</button>`).join('')}</div>
  <div class="grid g-auto">${list.map(adminOrgCard).join('') || `<div class="card">${empty('No businesses here', 'Try another filter. New sign-ups appear here automatically.', '', 'store', '#94A3B8')}</div>`}</div>`;
};
function adminOrgCard(o) {
  const [lab, tone] = STATE_PILL[o.state] || ['Active', 'good'];
  const exp = o.expires ? fmtShort(o.expires) : '—'; const expSub = o.expires ? (o.left >= 0 ? `${o.left} days left` : `ended ${-o.left}d ago`) : 'no expiry';
  const P = S.platform || DEFAULT_PLATFORM;
  const msg = o.state === 'expired' || o.left != null && o.left <= 7
    ? `Namaste ${o.ownerName || ''} ji, aapka ${P.appName} ${o.plan} plan ${o.left >= 0 ? fmtDate(o.expires) + ' ko khatam ho raha hai' : fmtDate(o.expires) + ' ko khatam ho gaya hai'}. Renew karne ke liye reply karein. Dhanyawad!`
    : `Namaste ${o.ownerName || ''} ji, ${P.appName} team se. `;
  const phone = o.ownerPhone || (String(o.ownerEmail || '').endsWith('@' + MOBILE_DOMAIN) ? o.ownerEmail.split('@')[0] : '');
  return `<div class="card pad stack-sm">
    <div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start">${o.logo ? `<div class="logo has-img" style="width:46px;height:46px">${`<img src="${esc(o.logo)}" alt="">`}</div>` : `<span class="ibox" style="--c:#1F5EFF;width:46px;height:46px;font:800 16px var(--f-display)">${esc(initials(o.name))}</span>`}
      <div style="min-width:0;flex:1"><b style="display:block;line-height:1.25;font-size:16px">${esc(o.name)}</b><span class="tiny muted">${esc(o.city || '')}${o.city ? ' · ' : ''}since ${fmtShort(todayLocal(new Date(o.created || Date.now())))}</span></div>${pill(lab, tone)}</div>
    <div class="small" style="color:var(--ink2)">${ic('user')} ${esc(o.ownerName || '—')} <span class="muted">· ${esc(phone ? '+91 ' + phone.replace(/\D/g, '').slice(-10) : displayId(o.ownerEmail || ''))}</span></div>
    <div class="tri"><div><span>Plan</span><b style="font-size:15px">${esc(o.plan || '—')}</b></div><div class="${o.left != null && o.left < 0 ? 'sh' : o.left != null && o.left <= 7 ? 'bk' : 'fr'}"><span>Valid till</span><b style="font-size:15px">${esc(exp)}</b><span>${expSub}</span></div><div><span>Team · Bookings</span><b style="font-size:15px">${o.members} · ${o.bookings}</b></div></div>
    ${o.notes ? `<div class="tiny muted">${ic('edit')} ${esc(o.notes)}</div>` : ''}
    <div class="row-flex" style="gap:6px"><button class="btn sm primary" onclick="A.adminOpen('${o.orgId}')">${ic('eye')} Open</button><button class="btn sm" onclick="A.adminManage('${o.orgId}')">${ic('gear')} Plan & access</button>${phone ? waBtn(msg, phone, 'Owner') : ''}</div>
    <div class="tiny muted">Last activity ${o.lastActivity ? new Date(o.lastActivity).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'} · ${o.invoices} bills</div></div>`;
}
A.adminManage = id => {
  const o = S.admin.orgs.find(x => x.orgId === id); const P = S.platform || DEFAULT_PLATFORM;
  formModal({ title: o.name, sub: 'Plan, expiry and access for this business', fields: [
    { name: 'plan', label: 'Plan', type: 'select', options: ['Trial', ...P.plans.map(p => p.name)].map(n => [n, n === 'Trial' ? 'Free trial' : `${n} · ${inr(planPrice(n))}/month`]), value: o.plan },
    { name: 'status', label: 'Access', type: 'select', options: [['trial', 'Trial'], ['active', 'Active (paid)'], ['suspended', 'Suspended (block login)']], value: o.status },
    { name: 'expires', label: 'Valid till', type: 'date', value: o.expires },
    { name: 'extend', label: 'Or extend by', type: 'select', options: [['0', 'No change'], ['30', '+1 month'], ['90', '+3 months'], ['180', '+6 months'], ['365', '+1 year']], value: '0' },
    { name: 'notes', label: 'Private note (only Super Admins see this)', type: 'textarea', value: o.notes, full: true, placeholder: 'e.g. Paid ₹9,999 by UPI on 12 Oct, yearly plan' },
    { type: 'html', full: true, html: `<div class="banner" style="font-size:13px">${ic('shield')}<span>After expiry the business can still log in and see data, but cannot add or change anything. Suspended blocks the app completely.</span></div>` }],
    submit: 'Save', onSubmit: async v => {
      let exp = v.expires; const ext = +v.extend || 0;
      if (ext) { const base = exp && exp > todayLocal() ? exp : todayLocal(); exp = addDays(base, ext); }
      const status = ext && v.status === 'trial' && v.plan !== 'Trial' ? 'active' : v.status;
      const patch = { plan: v.plan, status, expires: exp || '', notes: v.notes };
      await S.adapter.adminUpdateOrg(id, patch); Object.assign(o, patch);
      if (S.org?.orgId === id) Object.assign(S.org, patch);
      S.orgs.forEach(x => { if (x.orgId === id) Object.assign(x, patch); });
      toast(`${o.name}: ${v.plan}, ${status}${exp ? ' till ' + fmtDate(exp) : ''}`); render();
    } });
};
function adminUsers() {
  const q = (S.filters.admU || '').toLowerCase();
  const list = S.admin.users.filter(u => !q || [u.name, u.email, ...(u.orgs || []).map(o => o.name)].join(' ').toLowerCase().includes(q)).sort((a, b) => (b.created || 0) - (a.created || 0));
  return `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search name, email, mobile or business" value="${esc(S.filters.admU || '')}" onchange="A.setF('admU',this.value)"></div><button class="btn primary" onclick="A.addSuperForm()">${ic('shield')} Add Super Admin</button></div>
  <div class="card"><div class="rows">${list.map(u => `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(u.name))}</div><div class="main-col" style="min-width:180px"><b>${esc(u.name || '—')}${u.userId === S.user.id ? ' (you)' : ''}</b><div class="sub">${esc(displayId(u.email))}${u.lastLogin ? ' · last login ' + new Date(u.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ' · never logged in'}</div><div class="row-flex" style="gap:5px;margin-top:5px">${(u.orgs || []).map(o => `<span class="pill">${esc(o.name)} · ${esc(o.role)}</span>`).join('') || '<span class="tiny muted">Not in any business</span>'}</div></div>
    <div class="row-flex" style="gap:6px">${u.super ? pill('Super Admin', 'primary') : ''}<button class="btn sm" onclick="A.adminResetPw('${u.userId}')">${ic('key')} Reset password</button>${u.userId !== S.user.id ? `<button class="btn sm ${u.super ? 'ghost danger' : ''}" onclick="A.toggleSuper('${esc(u.email)}',${!u.super})">${u.super ? 'Remove Super Admin' : 'Make Super Admin'}</button><button class="btn sm ghost danger" onclick="A.adminDeleteUser('${u.userId}')">${ic('trash')}</button>` : ''}</div></div>`).join('') || empty('No users found', '')}</div></div>`;
}
A.toggleSuper = (email, on) => confirmBox(on ? 'Give Super Admin access?' : 'Remove Super Admin access?', on ? `${displayId(email)} will see and change every business on the platform.` : `${displayId(email)} will lose access to the Super Admin console.`, on ? 'Make Super Admin' : 'Remove', async () => { await S.adapter.adminSetSuper(email, on); await A.adminLoad(); toast('Updated'); }, on ? 'primary' : 'danger');
A.addSuperForm = () => formModal({ title: 'Add a Super Admin', sub: 'They must have signed up already.', fields: [{ name: 'email', label: 'Their email or mobile number', required: true, full: true }], submit: 'Give access', onSubmit: async v => { await S.adapter.adminSetSuper(v.email, true); await A.adminLoad(); toast('Super Admin added'); } });
function adminPlatform() {
  const P = S.platform || DEFAULT_PLATFORM; const plans = [...P.plans, {}, {}].slice(0, 3);
  return `<form class="card" onsubmit="A.savePlatform(event)"><div class="card-h"><div><h3>Plans & support</h3><p>Shown to businesses on renewal reminders, expiry screens and the Settings page.</p></div></div>
  <div class="grid2" style="padding:6px 18px 14px">
    ${fieldHTML({ name: 'appName', label: 'Platform name', value: P.appName, required: true })}${fieldHTML({ name: 'trialDays', label: 'Free trial for new sign-ups (days)', type: 'number', min: 0, value: P.trialDays })}
    ${fieldHTML({ name: 'supportName', label: 'Support name', value: P.supportName })}${fieldHTML({ name: 'supportPhone', label: 'Support WhatsApp number', type: 'tel', value: P.supportPhone, hint: 'Businesses tap “Renew” and it opens WhatsApp to this number' })}
    ${fieldHTML({ name: 'supportEmail', label: 'Support email', type: 'email', value: P.supportEmail, full: true })}
    ${fieldHTML({ name: 'allowSignup', label: 'Let new businesses sign up on their own (free trial). Turn off to add businesses only from here.', type: 'checkbox', value: P.allowSignup !== false, full: true })}
    ${plans.map((p, i) => fieldHTML({ name: 'pn' + i, label: `Plan ${i + 1} name`, value: p.name || '' }) + fieldHTML({ name: 'pp' + i, label: `Plan ${i + 1} price per month (₹)`, type: 'number', min: 0, value: p.price ?? '' })).join('')}
  </div><footer class="sheet-f" style="position:static"><span class="tiny muted grow">New businesses start on a ${+P.trialDays || 0}-day free trial.</span><button class="btn primary" type="submit">Save</button></footer></form>`;
}
A.savePlatform = async e => {
  e.preventDefault(); const v = readForm(e.target);
  const plans = [0, 1, 2].map(i => ({ name: (v['pn' + i] || '').trim(), price: +v['pp' + i] || 0 })).filter(p => p.name);
  const p = { appName: v.appName || 'EventPro', allowSignup: !!v.allowSignup, supportName: v.supportName, supportPhone: v.supportPhone, supportEmail: v.supportEmail, trialDays: Math.max(0, +v.trialDays || 0), plans: plans.length ? plans : DEFAULT_PLATFORM.plans };
  try { await S.adapter.savePlatform(p); S.platform = p; toast('Platform settings saved'); render(); } catch (err) { toast(err.message, 'bad'); }
};

/* ================= Per-person access ================= */
A.memberMore = uidv => {
  const m = S.members.find(x => x.userId === uidv); const rp = S.roles[m.role]?.perms || {}; const ov = m.perms || {};
  const roleOpts = Object.entries(S.roles).filter(([k]) => k !== 'owner').map(([k, r]) => [k, r.label]);
  const matrix = `<div class="eyebrow" style="margin:4px 0 8px">What ${esc((m.name || '').split(' ')[0])} can do</div><div class="tbl-wrap perm card" style="box-shadow:none"><table class="tbl"><thead><tr><th>Section</th><th>Access</th></tr></thead><tbody>${MODULES.map(md => `<tr><td><span class="row-flex" style="gap:8px;flex-wrap:nowrap">${ibox(md.icon, md.c, 'sm')}${esc(md.label)}</span></td><td><select name="p_${md.key}" class="${ov[md.key] != null ? 'ovr' : ''}">${[['', `Role default · ${LEVELS[+(rp[md.key] || 0)][1]}`], ...LEVELS.map(([v, l]) => [String(v), l])].map(([v, l]) => `<option value="${v}" ${String(ov[md.key] ?? '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><small class="muted">Change only what is different for this person. Everything else follows their role.</small>`;
  formModal({ title: m.name || displayId(m.email), sub: displayId(m.email), wide: true, fields: [
    { name: 'role', label: 'Role', type: 'select', options: roleOpts, value: m.role },
    { name: 'staffId', label: 'Link to crew record (for “My tasks”)', type: 'select', options: [['', '— Not linked —'], ...col('staff').map(s => [s.id, s.name])], value: m.staffId || '' },
    { name: 'pass', label: 'Set a new password (leave empty to keep)', type: 'text', full: true, autocomplete: 'new-password', hint: 'Use this when they forget their password. Then share it with them.' },
    { type: 'html', full: true, html: matrix }],
    left: `<button type="button" class="btn danger" onclick="A.removeMember('${uidv}')">${ic('trash')} Remove</button>`,
    onSubmit: async v => {
      need('team', 3); const perms = {};
      MODULES.forEach(md => { const x = v['p_' + md.key]; if (x !== '' && x != null) perms[md.key] = +x; });
      await S.adapter.updateMember(S.org.orgId, uidv, { staffId: v.staffId, perms, role: v.role });
      Object.assign(m, { staffId: v.staffId, perms: Object.keys(perms).length ? perms : null, role: v.role });
      if (v.pass) { if (v.pass.length < 6) throw new Error('Password needs 6+ characters'); await S.adapter.setPasswordFor(uidv, v.pass, S.org.orgId); setTimeout(() => credSheet('Password changed', m.name, m.email, v.pass), 60); }
      logAct(`Updated access for ${m.name}${Object.keys(perms).length ? ` (${Object.keys(perms).length} custom)` : ''}`); toast('Access updated'); render();
    } });
};
function accessSummary(m) {
  if (m.role === 'owner') return 'Full access to everything';
  const p = { ...(S.roles[m.role]?.perms || {}), ...(m.perms || {}) };
  const full = MODULES.filter(md => +p[md.key] >= 2).map(md => md.label.split(' ')[0]);
  const view = MODULES.filter(md => +p[md.key] === 1).length;
  return (full.length ? 'Can change: ' + full.slice(0, 4).join(', ') + (full.length > 4 ? ` +${full.length - 4}` : '') : 'View only') + (view ? ` · views ${view} more` : '');
}

/* ================= Login IDs & passwords ================= */
function genPass() { const w = ['Tent', 'Diya', 'Gulab', 'Kesar', 'Moti', 'Raja', 'Neem', 'Chand', 'Heera', 'Mehndi']; return w[Math.floor(Math.random() * w.length)] + '@' + (1000 + Math.floor(Math.random() * 9000)); }
function credSheet(title, name, email, pass) {
  const url = location.href.split('#')[0]; const id = displayId(email);
  const msg = `Namaste ${name || ''} ji!\n${S.org ? settings().bizName + ' ke ' : ''}${S.platform?.appName || 'EventPro'} app ka login:\n\nLink: ${url}\nLogin ID: ${id.replace('+91 ', '')}\nPassword: ${pass}\n\nKripya yeh password kisi aur ko na bataein.`;
  modal(`${sheetHead(title, name)}<div class="sheet-b stack">
    <div class="card pad stack-sm" style="background:var(--surface2);box-shadow:none"><div class="row-flex" style="justify-content:space-between"><span class="muted small">Link</span><span class="mono small" style="overflow-wrap:anywhere">${esc(url)}</span></div>
    <div class="row-flex" style="justify-content:space-between"><span class="muted small">Login ID</span><b class="mono">${esc(id.replace('+91 ', ''))}</b></div>
    <div class="row-flex" style="justify-content:space-between"><span class="muted small">Password</span><b class="mono">${esc(pass)}</b></div></div>
    <div class="banner warn">${ic('alert')}<span>Save or send this now. For safety the password is not shown again. You can always set a new one.</span></div>
    <div class="row-flex">${waBtn(msg, String(email).endsWith('@' + MOBILE_DOMAIN) ? email.split('@')[0] : '', 'Send on WhatsApp', 'btn wa')}<button class="btn" onclick="A.copy(${esc(JSON.stringify(msg))})">${ic('copy')} Copy</button></div></div>`);
}
A.memberForm = () => {
  const roleOpts = Object.entries(S.roles).filter(([k]) => k !== 'owner').map(([k, r]) => [k, r.label]);
  formModal({ title: 'Add employee', sub: 'Create their login. You decide what they can see and do.', fields: [
    { name: 'name', label: 'Full name', required: true, autofocus: true },
    { name: 'role', label: 'Role', type: 'select', options: roleOpts, value: 'staff' },
    { name: 'email', label: 'Login ID: mobile number or email', required: true, placeholder: '98290 12345', hint: 'They type this on the login screen' },
    { name: 'password', label: 'Password', type: 'text', required: true, value: genPass(), minlength: 6, hint: 'Change it if you like. Minimum 6 characters.' },
    { name: 'staffId', label: 'Link to crew record (for “My tasks”)', type: 'select', options: [['', '— Not linked —'], ...col('staff').map(s => [s.id, s.name])] },
    { type: 'html', full: true, html: `<div class="banner" style="font-size:13px">${ic('key')}<span>After adding, tap <b>Access</b> next to their name to give or remove access to any section.</span></div>` }],
    submit: 'Create login', onSubmit: async v => {
      need('team', 2); const email = loginId(v.email); if (!email.includes('@')) throw new Error('Enter a 10-digit mobile number or an email');
      if ((v.password || '').length < 6) throw new Error('Password must be at least 6 characters');
      const m = await S.adapter.createMember(S.org.orgId, { name: v.name, email, password: v.password, role: v.role, staffId: v.staffId });
      S.members.push(m); logAct(`Added ${v.name} as ${S.roles[v.role]?.label}`); render();
      setTimeout(() => credSheet('Login created', v.name, email, v.password), 60);
    } });
};
A.adminResetPw = userId => {
  const u = S.admin.users.find(x => x.userId === userId);
  formModal({ title: 'Reset password', sub: `${u.name} · ${displayId(u.email)}`, fields: [{ name: 'password', label: 'New password', type: 'text', required: true, value: genPass(), full: true, hint: 'Share it with them on WhatsApp after saving.' }],
    submit: 'Set password', onSubmit: async v => { if ((v.password || '').length < 6) throw new Error('Password must be at least 6 characters'); await S.adapter.setPasswordFor(userId, v.password, null); setTimeout(() => credSheet('Password reset', u.name, u.email, v.password), 60); } });
};
A.adminDeleteUser = userId => {
  const u = S.admin.users.find(x => x.userId === userId);
  confirmBox('Delete this login?', `${u.name} (${displayId(u.email)}) will not be able to log in again. Business data stays.`, 'Delete login', async () => { await S.adapter.adminDeleteUser(userId); await A.adminLoad(); toast('Login deleted'); });
};
A.adminAddBusiness = () => {
  const P = S.platform || DEFAULT_PLATFORM;
  formModal({ title: 'Add a business', sub: 'Creates the business and its owner login.', fields: [
    { name: 'bizName', label: 'Business name', required: true, full: true, autofocus: true },
    { name: 'name', label: 'Owner name', required: true }, { name: 'phone', label: 'Owner mobile', type: 'tel' },
    { name: 'email', label: 'Owner login ID: mobile or email', required: true }, { name: 'password', label: 'Owner password', type: 'text', required: true, value: genPass() },
    { name: 'city', label: 'City', value: 'Jaipur' },
    { name: 'plan', label: 'Plan', type: 'select', options: ['Trial', ...P.plans.map(p => p.name)].map(n => [n, n === 'Trial' ? 'Free trial' : `${n} · ${inr(planPrice(n))}/month`]) },
    { name: 'expires', label: 'Valid till', type: 'date', value: addDays(todayLocal(), +P.trialDays || 14) },
    ...BIZ_TYPES.map(([k, l]) => ({ name: 't_' + k, label: l, type: 'checkbox', value: true }))],
    submit: 'Create business', onSubmit: async v => {
      const email = loginId(v.email); if (!email.includes('@')) throw new Error('Enter a 10-digit mobile number or an email');
      const types = BIZ_TYPES.map(([k]) => k).filter(k => v['t_' + k]);
      const st = Object.assign(defaultSettings({ bizName: v.bizName, owner: v.name, phone: v.phone, email: email.endsWith('@' + MOBILE_DOMAIN) ? '' : email, bizTypes: types.length ? types : ['tent', 'caterer', 'event'] }), { city: v.city });
      await S.adapter.adminCreateBusiness({ email, password: v.password, name: v.name, phone: v.phone, bizName: v.bizName, roles: ROLE_DEFAULTS, settings: st, plan: v.plan, status: v.plan === 'Trial' ? 'trial' : 'active', expires: v.expires });
      await A.adminLoad(); setTimeout(() => credSheet('Business created', v.name, email, v.password), 60);
    } });
};
