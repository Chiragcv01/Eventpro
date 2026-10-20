/* ================= Easy mode, crew screen, quick booking, live updates =================
   Goal: a tent-house owner or a crew member should be able to use the app in seconds.
   - Easy home (default): today at a glance + 4–6 big buttons. "Full app" is one tap away
     and nothing is removed (A.setFull).
   - Crew home: "I reached" (self attendance), my tasks with big % buttons, call/alert owner.
   - Quick booking: 4 fields (+ optional advance, + saved packages).
   - Live updates: changes made by anyone (e.g. crew sets setup to 40%) show on every open
     phone within a second (Supabase Realtime on `records`), plus a refresh when the app
     comes back to the screen. */

/* ---------- mode ---------- */
const isSimple = () => !!S.org && !LS.get('ep_full_' + S.org.orgId, false);
const isCrewUser = () => !!S.org && !isClinic() && S.role !== 'owner' && (S.role === 'staff' || (!!S.me?.staffId && lvl('bookings') < 2));
A.setFull = on => { LS.set('ep_full_' + S.org.orgId, !!on); A.closeModal(); A.go('dashboard'); toast(on ? 'Full app is on. All sections are on the home screen.' : 'Easy home is on.'); };
A.newBooking = () => (isSimple() && can('bookings', 2) ? A.quickBooking() : A.eventForm());

/* ---------- live updates ---------- */
let liveChan = null, liveRenderT = null, lastFullLoad = Date.now();
function startLiveSync() {
  lastFullLoad = Date.now();
  if (S.adapter?.mode !== 'cloud' || !S.org) return;
  try { if (liveChan) S.adapter.sb.removeChannel(liveChan); } catch (e) { }
  const org = S.org.orgId;
  liveChan = S.adapter.sb.channel('rec-' + org).on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: 'org_id=eq.' + org }, p => {
    if (!S.org || S.org.orgId !== org) return;
    const row = p.eventType === 'DELETE' ? p.old : p.new; if (!row || !row.collection) return;
    if (p.eventType === 'DELETE') { S.data[row.collection] = col(row.collection).filter(x => x.id !== row.id); }
    else {
      const rec = row.data; if (!rec || !rec.id) return; const arr = col(row.collection); const i = arr.findIndex(x => x.id === rec.id);
      const old = i >= 0 ? arr[i] : null;
      if (rec.archived) { if (i >= 0) arr.splice(i, 1); liveRender(); return; }
      if (i >= 0) arr[i] = rec; else arr.push(rec);
      if (rec.updatedById && rec.updatedById !== S.user?.id) liveNotice(row.collection, rec, old);
    }
    liveRender();
  }).subscribe();
}
function liveRender() {
  clearTimeout(liveRenderT);
  liveRenderT = setTimeout(() => { const a = document.activeElement; if (a && a.closest && a.closest('#app') && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) { liveRender(); return; } render(); }, 350);
}
function liveNotice(coll, rec, old) {
  const who = rec.updatedBy || 'Team';
  if (coll === 'tasks' && (lvl('tasks') >= 3 || S.role === 'owner') && (!old || old.progress !== rec.progress)) { const e = evById(rec.eventId); toast(`${who}: ${rec.title} ${rec.progress}%${e ? ' · ' + e.title : ''}`); }
  else if (coll === 'attendance' && rec.selfAt && (!old || old.selfAt !== rec.selfAt) && can('staff')) { const s = getById('staff', rec.staffId); toast(`${s?.name || who} reached at ${rec.selfAt}`); }
  else if (coll === 'events' && !old && can('bookings')) toast(`New booking: ${rec.title}`);
  else if (coll === 'payments' && !old && can('payments')) toast(`Payment received: ${inr(rec.amount)}`);
}
async function liveRefresh() {
  if (!S.org || S.adapter?.mode !== 'cloud' || Date.now() - lastFullLoad < 90e3) return;
  if (['suspended', 'expired'].includes(orgState(S.org))) return;
  try { const { data, members } = await S.adapter.loadOrg(S.org.orgId); S.data = data; S.members = members; S.patLoaded = {}; lastFullLoad = Date.now(); liveRender(); } catch (e) { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') liveRefresh(); });

/* ---------- easy home (owner / manager) ---------- */
const evToday = () => { const t = todayLocal(); return col('events').filter(e => !['Cancelled', 'Closed'].includes(e.stage) && e.date && e.date <= t && eventEnd(e) >= t); };
const evTomorrow = () => { const t = addDays(todayLocal(), 1); return col('events').filter(e => !['Cancelled', 'Closed'].includes(e.stage) && e.date === t); };
function bigBtn(label, icon, color, fn, sub = '') { return `<button class="big-btn" style="--c:${color}" onclick="${fn}">${ibox(icon, color, 'lg')}<b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</button>`; }
function liveEventRow(e) {
  const p = eventProgress(e); const [i, c] = evStyle(e); const present = col('attendance').filter(a => a.date === todayLocal() && a.eventId === e.id && a.status !== 'A').length;
  return `<button class="row click live-ev" onclick="A.go('event',{id:'${e.id}'})">${datebox(e.date, c)}<div class="main-col"><b>${esc(e.title)}</b><div class="sub"><span>${esc((e.venue || '—').split(',')[0])}</span>${e.time ? ' · <span>' + esc(e.time) + '</span>' : ''}${present ? ` · <span>${present} crew at site</span>` : ''}</div>${p != null ? `<div class="row-flex" style="gap:8px;margin-top:6px;flex-wrap:nowrap"><div style="flex:1">${prog(p)}</div><b class="num small">${Math.round(p)}%</b></div>` : ''}</div>${stagePill(e.stage)}</button>`;
}
function simpleHome() {
  const t = todayLocal(); const today = evToday(); const tom = evTomorrow();
  const money = can('invoices'); const due = money ? sum(col('invoices').filter(i => i.type === 'invoice'), i => Math.max(0, invCalc(i).balance)) : 0;
  const al = computeAlerts(); const follow = col('events').filter(followDue).length;
  const setup = today.map(eventProgress).filter(x => x != null); const setupAvg = setup.length ? Math.round(sum(setup, x => x) / setup.length) : null;
  const btns = [
    can('bookings', 2) && bigBtn('New booking', 'calendar', MOD.bookings.c, 'A.newBooking()', '4 things to fill'),
    can('payments', 2) && bigBtn('Payment received', 'rupee', '#0B9B68', 'A.paymentForm()'),
    can('staff', 2) && bigBtn('Attendance', 'users', MOD.staff.c, "A.go('staff',{tab:'attendance'})"),
    can('leads', 2) && bigBtn('New lead', 'megaphone', MOD.leads.c, 'A.leadForm()', 'Call, walk-in or ad'),
    typeof isVenue === 'function' && isVenue() && can('venue') && bigBtn('Rooms & guests', 'bed', MOD.venue.c, "A.go('venue')"),
    can('inventory') && !(typeof isVenue === 'function' && isVenue()) && bigBtn('Stock', 'box', MOD.inventory.c, "A.go('inventory')"),
    can('invoices', 2) && bigBtn('Bill / quotation', 'receipt', MOD.invoices.c, 'A.newInvoice()'),
    can('tasks', 2) && bigBtn('Alert to team', 'bell', '#E11D74', 'A.alertForm()')].filter(Boolean);
  return `${pushCard()}${whatsNewCard()}
  <div class="today-strip">
    <div><b>${today.length}</b><span>Events today</span></div>
    <div><b>${tom.length}</b><span>Tomorrow</span></div>
    ${setupAvg != null ? `<div><b>${setupAvg}%</b><span>Setup done</span></div>` : follow ? `<div><b>${follow}</b><span>Call back</span></div>` : ''}
    ${money ? `<div><b>${inr(due)}</b><span>To collect</span></div>` : ''}
  </div>
  <div class="big-grid">${btns.join('')}</div>
  ${today.length || tom.length ? `<div class="sec-h"><h2>Today & tomorrow${info('dash-live')}</h2><button class="linkbtn" onclick="A.go('bookings')">All bookings ${ic('chev')}</button></div>
  <div class="card"><div class="rows">${[...today, ...tom].map(liveEventRow).join('')}</div></div>` : `<div class="card" style="margin-top:14px">${empty('No event today or tomorrow', 'Your next bookings will show here with live setup progress.', '', 'calendar', MOD.bookings.c)}</div>`}
  ${al.length ? `<div class="sec-h"><h2>Needs attention${info('dash-attention')}</h2><button class="linkbtn" onclick="A.alertsSheet()">See all (${al.length}) ${ic('chev')}</button></div><div class="stack-sm">${al.slice(0, 3).map(alertCard).join('')}</div>` : ''}
  <div class="easy-foot"><button class="btn block" onclick="A.moreSheet()">${ic('grid')} All sections</button><button class="linkbtn" onclick="A.setFull(true)">Show the full home screen</button></div>`;
}

/* ---------- crew home ---------- */
function crewHome() {
  const sid = S.me?.staffId; const t = todayLocal(); const st = settings();
  const mine = col('tasks').filter(x => ((sid && x.assignee === sid) || x.assigneeUser === S.user.id) && (x.progress < 100 || (x.updatedAt && todayLocal(new Date(x.updatedAt)) === t)));
  const evIds = [...new Set(mine.map(x => x.eventId).filter(Boolean))];
  const evs = [...new Set([...evIds.map(evById).filter(Boolean), ...evToday()])];
  const marked = LS.get('ep_att_' + S.org.orgId + '_' + t, null);
  const owner = S.members.find(m => m.role === 'owner' && m.userId !== S.user.id);
  return `${pushCard()}
  <div class="card pad crew-att ${marked ? 'done' : ''}">${marked
    ? `${ibox('check', '#0B9B68', 'lg')}<div><b>Attendance marked</b><div class="small muted"><span>Today at ${esc(marked.at)}</span>${marked.ev ? ' · <span>' + esc(marked.ev) + '</span>' : ''}</div></div>`
    : sid ? `<button class="btn primary block crew-reach" onclick="A.iReached()">${ic('pin')} I have reached the site</button>${evs.length > 1 ? `<select id="reachEv" class="inline-in" aria-label="Which event">${evs.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}</select>` : ''}<div class="tiny muted">Tap when you reach. Your attendance is marked for today.</div>`
    : `<div class="banner warn">${ic('alert')}<span>Your login is not linked to a crew name yet. Ask the owner to link it in Team & access.</span></div>`}</div>
  <div class="sec-h"><h2>My work</h2></div>
  ${mine.length ? `<div class="stack-sm">${mine.map(x => { const e = evById(x.eventId); return `<div class="card pad crew-task"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b class="crew-task-t">${esc(x.title)}</b><div class="small muted">${e ? esc(e.title) + (e.venue ? ' · ' + esc(e.venue.split(',')[0]) : '') : ''}</div></div><b class="num crew-pct">${x.progress}%</b></div>${prog(x.progress)}
    <div class="pct-btns">${[25, 50, 75].map(v => `<button class="${x.progress >= v ? 'on' : ''}" onclick="A.crewProg('${x.id}',${v})">${v}%</button>`).join('')}<button class="done ${x.progress >= 100 ? 'on' : ''}" onclick="A.crewProg('${x.id}',100)">${ic('check')} Done</button></div></div>`; }).join('')}</div>`
    : `<div class="card">${empty('No work given to you', 'When the owner gives you setup work, it shows here.', '', 'pulse', MOD.tasks.c)}</div>`}
  ${evs.length ? `<div class="sec-h"><h2>Today’s events</h2></div><div class="card"><div class="rows">${evs.map(e => `<div class="row">${datebox(e.date, evStyle(e)[1])}<div class="main-col"><b>${esc(e.title)}</b><div class="sub">${esc(e.venue || '')}${e.time ? ' · ' + esc(e.time) : ''}</div></div>${e.venue ? `<a class="btn sm" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(e.venue)}">${ic('pin')} Map</a>` : ''}</div>`).join('')}</div></div>` : ''}
  <div class="big-grid two" style="margin-top:14px">${canSendAlert() ? bigBtn('Alert my seniors', 'bell', '#E11D74', `A.alertForm('@seniors')`) : ''}${st.phone ? `<a class="big-btn" style="--c:#0B9B68" href="tel:${esc(String(st.phone).replace(/\s/g, ''))}">${ibox('phone', '#0B9B68', 'lg')}<b>Call the owner</b></a>` : ''}</div>`;
}
A.iReached = async () => {
  try {
    const evId = document.getElementById('reachEv')?.value || (evToday()[0]?.id || '');
    let rec;
    if (S.adapter.mode === 'cloud') { const { data, error } = await S.adapter.sb.rpc('mark_my_attendance', { p_org: S.org.orgId, p_event: evId }); if (error) throw S.adapter.err(error); rec = data; }
    else { const d = todayLocal(); rec = { id: d + '_' + S.me.staffId, staffId: S.me.staffId, date: d, status: 'P', eventId: evId, selfAt: new Date().toTimeString().slice(0, 5) }; const arr = col('attendance'); const i = arr.findIndex(x => x.id === rec.id); if (i >= 0) arr[i] = { ...arr[i], ...rec }; else arr.push(rec); await S.adapter.put(S.org.orgId, 'attendance', rec); }
    LS.set('ep_att_' + S.org.orgId + '_' + todayLocal(), { at: rec.selfAt, ev: evById(evId)?.title || '' });
    toast('Attendance marked. Have a good day!'); render();
  } catch (e) { toast(e.message, 'bad'); }
};
A.crewProg = async (id, v) => {
  const t = getById('tasks', id); if (!t) return; if (!canTask(t)) { toast('You can update only your own work', 'bad'); return; }
  const was = t.progress; await A.taskProg(id, v);
  if (v >= 100 && was < 100) notifyManagers(`${T('Work done')}: ${t.title}`, evById(t.eventId)?.title || '');
};
/* quiet "update" to owner/manager/supervisor phones (no ringing) */
async function notifyManagers(title, body) {
  try { if (S.adapter.mode !== 'cloud' || lvl('tasks') < 2) return; const a = await AlertsDB.send({ kind: 'update', to_role: 'managers', title: title.slice(0, 140), body: body || null, urgent: false, from_name: S.me?.name || S.user.name }); await AlertsDB.push(a.id); } catch (e) { }
}

/* ---------- quick booking (4 fields) + packages ---------- */
A.quickBooking = () => {
  const pk = settings().packages || []; const pay = can('payments', 2);
  modal(`<form class="form" onsubmit="A.saveQuickBooking(event)" novalidate>${sheetHead('New booking', 'Only 4 things. Add the rest later if you want.')}<div class="sheet-b stack">
    ${pk.length ? `<div class="field"><span>Package (optional)</span><div class="chips">${pk.map(p => `<button type="button" class="chip" data-pk="${p.id}" onclick="A.pickPackage(this,'${p.id}')">${esc(p.name)}${p.budget ? ' · ' + inr(p.budget) : ''}</button>`).join('')}</div><input type="hidden" name="pkg"></div>` : ''}
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'client', label: 'Client name', required: true, autofocus: true })}${fieldHTML({ name: 'phone', label: 'Mobile', type: 'tel', placeholder: '98290 12345' })}
    ${fieldHTML({ name: 'date', label: 'Event date', type: 'date', required: true, value: todayLocal() })}${fieldHTML({ name: 'budget', label: 'Total amount ₹', type: 'number', min: 0, placeholder: 'e.g. 150000' })}</div>
    <div class="field"><span>Type</span><div class="chips type-chips">${['Wedding', 'Reception', 'Sangeet & Mehendi', 'Birthday / Anniversary', 'Religious / Jagran', 'Corporate Event', 'Other'].map((x, i) => `<label class="chip-radio"><input type="radio" name="type" value="${esc(x)}" ${i === 0 ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div></div>
    ${pay ? fieldHTML({ name: 'advance', label: 'Advance received now ₹ (optional)', type: 'number', min: 0, hint: 'Booking becomes Confirmed and the advance is saved in Payments' }) : ''}
    <label class="check"><input type="checkbox" name="confirmed"> <span>Booking is confirmed (pakki)</span></label>
  </div><footer class="sheet-f"><button type="button" class="linkbtn" onclick="A.closeModal();A.eventForm()">More details</button><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save booking</button></footer></form>`);
};
A.pickPackage = (btn, id) => {
  const f = btn.form; const p = (settings().packages || []).find(x => x.id === id); if (!p) return;
  f.querySelectorAll('[data-pk]').forEach(b => b.classList.toggle('on', b === btn)); f.pkg.value = id;
  if (p.budget && !f.budget.value) f.budget.value = p.budget;
  if (p.type) { const r = [...f.querySelectorAll('input[name=type]')].find(x => x.value === p.type); if (r) r.checked = true; }
};
A.saveQuickBooking = e => {
  e.preventDefault(); const v = readForm(e.target);
  if (!(v.client || '').trim()) { toast('Write the client name', 'bad'); return; }
  if (!v.date) { toast('Pick the event date', 'bad'); return; }
  withBtn(e, async () => {
    const p = (settings().packages || []).find(x => x.id === v.pkg); const adv = +v.advance || 0;
    const stage = v.confirmed || adv > 0 ? 'Confirmed' : 'Enquiry'; const type = v.type || 'Wedding';
    const rec = { id: uid('e_'), created: Date.now(), client: v.client.trim(), phone: v.phone || '', date: v.date, type, stage, budget: +v.budget || 0, pax: p?.pax || 0, venue: '', title: `${v.client.trim().split(' ').slice(-1)[0]} ${type}`,
      items: p?.items ? JSON.parse(JSON.stringify(p.items)) : [], schedule: [], menu: { dishIds: [...(p?.dishIds || [])], pax: p?.pax || 0 }, dispatch: {} };
    await save('events', rec, `Created booking ${rec.title}`);
    if (adv > 0 && can('payments', 2)) await save('payments', { id: uid('p_'), invoiceId: '', eventId: rec.id, amount: adv, date: todayLocal(), mode: 'Cash', ref: 'Advance', by: S.me?.name }, `Recorded payment ${inr(adv)}`);
    A.closeModal(); toast(adv > 0 ? `Booking saved with ${inr(adv)} advance` : 'Booking saved'); A.go('event', { id: rec.id });
  });
};
A.savePackage = evId => {
  const e = evById(evId); if (!e) return; need('settings', 2);
  formModal({ title: 'Save as package', sub: 'Next time, one tap fills these items, menu and amount', fields: [{ name: 'name', label: 'Package name', required: true, value: `${e.type} ${e.pax || ''}`.trim(), full: true, placeholder: 'e.g. Wedding 500 guests' }, { name: 'budget', label: 'Package amount ₹', type: 'number', min: 0, value: e.budget || '' }],
    onSubmit: async v => { const st = settings(); const pk = { id: uid('pk_'), name: v.name.trim(), type: e.type, budget: +v.budget || 0, pax: e.pax || 0, items: (e.items || []).map(x => ({ ...x })), dishIds: [...(e.menu?.dishIds || [])] };
      await saveSettingsRec({ packages: [...(st.packages || []), pk] }); logAct(`Saved package ${pk.name}`); toast('Package saved'); render(); } });
};
A.delPackage = id => confirmBox('Delete this package?', '', 'Delete', async () => { const st = settings(); await saveSettingsRec({ packages: (st.packages || []).filter(p => p.id !== id) }); render(); });
function packagesCard() {
  const pk = settings().packages || []; const edit = can('settings', 2);
  return `<div class="card"><div class="card-h"><div><h3>Booking packages${info('set-packages')}</h3><p>Ready sets of items, menu and amount. Pick one while making a booking.</p></div></div><div class="rows">${pk.map(p => `<div class="row">${ibox('gift', '#7C3AED', 'sm')}<div class="main-col"><b>${esc(p.name)}</b><div class="sub">${p.budget ? inr(p.budget) + ' · ' : ''}${(p.items || []).length} items · ${(p.dishIds || []).length} dishes${p.pax ? ' · ' + p.pax + ' guests' : ''}</div></div>${edit ? `<button class="icon-btn" style="width:36px;height:36px" aria-label="Delete package" onclick="A.delPackage('${p.id}')">${ic('trash')}</button>` : ''}</div>`).join('') || `<div class="row"><span class="small muted">No packages yet. Open any booking and tap “Save as package”.</span></div>`}</div></div>`;
}

/* ---------- simple access: who sees what ---------- */
const ROLE_HELP = {
  manager: 'Runs bookings, stock, catering and crew. Sees bills; cannot change team or settings.',
  accountant: 'Bills, payments and expenses. Sees bookings and reports.',
  supervisor: 'Site work: bookings, setup tasks, stock out and in, attendance.',
  staff: 'Crew: sees only their own work and marks attendance.'
};
function roleCards(cur, name = 'role') {
  return `<div class="role-cards">${Object.entries(S.roles).filter(([k]) => k !== 'owner').map(([k, r]) => `<label class="role-card"><input type="radio" name="${name}" value="${k}" ${cur === k ? 'checked' : ''}><span><b>${esc(r.label)}</b><small>${esc((isClinic() ? CLINIC_ROLE_HELP : ROLE_HELP)[k] || 'Custom role')}</small></span></label>`).join('')}</div>`;
}
const LV3 = [[0, 'Off'], [1, 'See'], [2, 'Change']];
A.accessSheet = uidv => {
  const m = S.members.find(x => x.userId === uidv); if (!m) return; const rp = S.roles[m.role]?.perms || {}; const eff = { ...rp, ...(m.perms || {}) };
  modal(`<form class="form" onsubmit="A.saveAccess(event,'${uidv}')" novalidate>${sheetHead('What ' + (m.name || '').split(' ')[0] + ' can see', 'Tap to change. Saves for this person only.')}<div class="sheet-b stack">
    <div class="field"><span>Job</span>${roleCards(m.role)}</div>
    <div class="acc-list">${MODULES.filter(md => moduleOn(md.key)).map(md => { const cur = Math.min(2, +(eff[md.key] || 0)); return `<div class="acc-row">${ibox(md.icon, md.c, 'sm')}<b>${esc(md.label)}</b><div class="seg acc-seg">${LV3.map(([v, l]) => `<label><input type="radio" name="a_${md.key}" value="${v}" ${cur === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`; }).join('')}</div>
    <p class="tiny muted">Off = section hidden. See = can look only. Change = can add and edit. Only the owner can delete.</p>
  </div><footer class="sheet-f"><button type="button" class="linkbtn" onclick="A.memberMore('${uidv}')">Password & more</button><span class="grow"></span><button class="btn primary" type="submit">Save</button></footer></form>`, { wide: true });
  document.querySelectorAll('.role-cards input').forEach(r => r.addEventListener('change', () => { const p = S.roles[r.value]?.perms || {}; MODULES.forEach(md => { const x = document.querySelector(`input[name="a_${md.key}"][value="${Math.min(2, +(p[md.key] || 0))}"]`); if (x) x.checked = true; }); }));
};
A.saveAccess = (e, uidv) => {
  e.preventDefault(); const f = e.target; const m = S.members.find(x => x.userId === uidv);
  withBtn(e, async () => {
    need('team', 3); const role = f.querySelector('input[name=role]:checked')?.value || m.role; const rp = S.roles[role]?.perms || {}; const perms = {};
    MODULES.forEach(md => { const x = f.querySelector(`input[name="a_${md.key}"]:checked`); if (!x) return; const v = +x.value; const def = Math.min(2, +(rp[md.key] || 0)); if (v !== def) perms[md.key] = v; });
    await S.adapter.updateMember(S.org.orgId, uidv, { staffId: m.staffId || '', perms, role });
    Object.assign(m, { perms: Object.keys(perms).length ? perms : null, role });
    logAct(`Updated access for ${m.name}`); A.closeModal(); toast('Access saved'); render();
  });
};

/* ---------- home screen switch (nothing removed: full home is one tap away) ---------- */
const fullDashboard = V.dashboard;
V.dashboard = () => {
  if (isSimple()) return isCrewUser() ? crewHome() : `<div class="sec-h" style="margin-top:0"><h2>Today${info('dashboard')}</h2></div>` + simpleHome();
  return `<div class="easy-switch"><button class="linkbtn" onclick="A.setFull(false)">${ic('home')} Switch to easy home</button></div>${whatsNewCard()}` + fullDashboard();
};

/* ---------- getting the Android app + what's new ---------- */
const APP_DL = 'https://sabmanage.com/download';
try { if (String(document.referrer).startsWith('android-app://com.sabmanage.app')) LS.set('ep_in_app', true); } catch (e) { }
const inAndroidApp = () => LS.get('ep_in_app', false);
A.shareAppLink = () => { const st = settings(); window.open(waLink(`${st.bizName ? st.bizName + ': ' : ''}SabManage app\n${T('Download')}: ${APP_DL}\n${T('Log in with your mobile number and the password the owner gives you.')}`, ''), '_blank', 'noopener'); };
const WHATS_NEW = [
  ['home', 'Easy home: today’s events, setup % and money to collect at the top'],
  ['calendar', 'New booking needs only 4 things; save packages for one-tap bookings'],
  ['pin', 'Crew get their own simple screen: “I have reached” and 25% / 50% / Done'],
  ['pulse', 'Crew updates show on your phone within a second'],
  ['bell', 'Alerts to your team ring with the SabManage tune']];
function whatsNewCard() {
  if (!S.org || LS.get('ep_new_v3', false) || isCrewUser()) return '';
  return `<div class="card pad whats-new"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><b>${ic('sparkle')} What’s new in SabManage</b><button class="icon-btn" style="width:32px;height:32px" aria-label="Close" onclick="LS.set('ep_new_v3',true);render()">${ic('x')}</button></div>
    <ul>${WHATS_NEW.map(([i, t]) => `<li>${ic(i)}<span>${t}</span></li>`).join('')}</ul>
    <div class="row-flex">${!inAndroidApp() ? `<a class="btn sm primary" href="${APP_DL}" target="_blank" rel="noopener">${ic('download')} Get the Android app</a>` : ''}${can('team', 2) ? `<button class="btn sm wa" onclick="A.shareAppLink()">${ic('wa')} Send app to team</button>` : ''}</div></div>`;
}
