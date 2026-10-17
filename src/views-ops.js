const DISH_STYLE = { 'Welcome Drinks & Chaat': ['sparkle', '#F59E0B'], 'Starters & Live Counters': ['diya', '#EA580C'], 'Main Course': ['pot', '#16A34A'], 'Breads & Rice': ['utensils', '#D97706'], 'Sweets': ['cake', '#DB2777'] };
/* ================= Dashboard ================= */
V.dashboard = () => {
  const t = todayLocal(); const in7 = addDays(t, 7);
  const evs = col('events').filter(e => !['Cancelled', 'Closed'].includes(e.stage));
  const upcoming = evs.filter(e => eventEnd(e) >= t && e.stage !== 'Completed').sort(by('date'));
  const week = upcoming.filter(e => e.date <= in7);
  const todayEv = upcoming.filter(e => e.date <= t && eventEnd(e) >= t);
  const money = can('invoices') || can('payments');
  const outstanding = sum(col('invoices').filter(i => i.type === 'invoice'), i => Math.max(0, invCalc(i).balance));
  const monthStart = t.slice(0, 8) + '01';
  const monthPays = col('payments').filter(p => p.date >= monthStart);
  const collected = sum(monthPays, p => p.amount);
  const outPcs = sum(col('inventory'), i => onRent(i));
  const alerts = computeAlerts();
  const myStaff = S.me?.staffId; const myTasks = myStaff ? col('tasks').filter(x => x.assignee === myStaff && x.progress < 100) : [];
  const overdueCount = col('invoices').filter(i => i.type === 'invoice' && invStatus(i)[0] === 'Overdue').length;

  const hero = money
    ? `<div class="hero"><div class="in"><div class="stack-sm" style="gap:4px"><span class="eyebrow">Pending from clients</span><div class="big">${inr(outstanding)}</div><p>${overdueCount ? `${overdueCount} invoice${overdueCount > 1 ? 's are' : ' is'} past due date` : 'No invoice is past its due date'}</p></div>
        <div class="stack-sm" style="align-items:flex-start"><div class="hstats"><div><b>${inr(collected)}</b><span>Collected this month</span></div><div><b>${week.length}</b><span>Events in 7 days</span></div></div>
        <div class="row-flex">${can('payments') ? `<button class="btn white sm" onclick="A.go('payments')">${ic('wa')} Send reminders</button>` : ''}${can('payments', 2) ? `<button class="btn sm" onclick="A.paymentForm()">${ic('plus')} Payment</button>` : ''}</div></div></div></div>`
    : `<div class="hero" style="--c:#0D9488;--c2:#0EA5E9"><div class="in"><div class="stack-sm" style="gap:4px"><span class="eyebrow">${fmtDay(t)}</span><div class="big">${myTasks.length ? myTasks.length + ' task' + (myTasks.length > 1 ? 's' : '') : todayEv.length + ' live'}</div><p>${myTasks.length ? 'assigned to you and still open' : 'events running today'} · ${week.length} in the next 7 days</p></div>${can('tasks') ? `<button class="btn white" onclick="A.go('tasks')">${ic('pulse')} Open tracker</button>` : ''}</div></div>`;

  const svc = navItems().filter(m => m.key !== 'dashboard');
  const shown = svc.slice(0, 7);
  const tiles = `<div class="card pad"><div class="tiles">${shown.map(m => `<button class="tile" onclick="A.go('${m.key}')">${ibox(m.icon, m.c)}<span>${esc(m.label)}</span></button>`).join('')}${svc.length > 7 ? `<button class="tile" onclick="A.moreSheet()">${ibox('grid', '#64748B')}<span>All services</span></button>` : ''}</div></div>`;

  const stats = `<div class="kpis" style="margin:16px 0 0">
    ${kpi('Next 7 days', week.length + ' events', num(sum(week, e => e.pax)) + ' guests to serve', '', 'calendar', MOD.bookings.c)}
    ${kpi('Running today', todayEv.length, todayEv.map(e => e.title).slice(0, 1).join('') || 'No event on site', '', 'pulse', MOD.tasks.c)}
    ${can('inventory') ? kpi('Out on rent', num(outPcs) + ' pcs', (n => n + (n === 1 ? ' site' : ' sites'))(col('events').filter(e => e.dispatch?.out && !e.dispatch?.returned).length), '', 'tent', MOD.inventory.c) : kpi('My open tasks', myTasks.length, 'Assigned to you', '', 'check', MOD.staff.c)}
    ${kpi('Needs attention', alerts.length, alerts.length ? 'Tap the bell to see' : 'All clear', alerts.length ? 'bad' : 'good', 'bell', alerts.length ? '#E0344B' : '#0B9B68')}
  </div>`;

  const evCards = upcoming.slice(0, 8).map(eventCard).join('');
  return `${pushCard()}${startCard()}${hero}${tiles}${stats}
  <div class="sec-h"><h2>Upcoming events${info('dash-upcoming')}</h2><button class="linkbtn" onclick="A.go('bookings')">See all ${ic('chev')}</button></div>
  ${evCards ? `<div class="hscroll">${evCards}</div>` : `<div class="card">${empty('No upcoming events', 'New bookings will appear here.', can('bookings', 2) ? `<button class="btn primary sm" onclick="A.eventForm()">${ic('plus')} Add booking</button>` : '', 'calendar', MOD.bookings.c)}</div>`}
  <div class="split" style="margin-top:6px">
    <div class="stack" style="gap:0">
      <div class="sec-h"><h2>Needs attention${info('dash-attention')}</h2>${alerts.length ? pill(alerts.length + ' open', 'bad') : pill('All clear', 'good')}</div>
      <div class="stack-sm">${alerts.slice(0, 6).map(alertCard).join('') || `<div class="card">${empty('Nothing pending', 'Overdue bills, stock shortages and dispatches show here.', '', 'check', '#0B9B68')}</div>`}</div>
      ${myTasks.length ? `<div class="sec-h"><h2>My tasks</h2></div><div class="card"><div class="rows">${myTasks.map(taskRow).join('')}</div></div>` : ''}
    </div>
    ${can('tasks') ? `<div class="stack" style="gap:0"><div class="sec-h"><h2>Live setup${info('dash-live')}</h2><button class="linkbtn" onclick="A.go('tasks')">Tracker ${ic('chev')}</button></div>
      <div class="card"><div class="rows">${upcoming.filter(e => eventProgress(e) != null).slice(0, 5).map(e => { const p = Math.round(eventProgress(e)); const [i, c] = evStyle(e); return `<div class="row click" onclick="A.go('event',{id:'${e.id}',tab:'tasks'})">${ibox(i, c, 'sm')}<div class="main-col"><b>${esc(e.title)}</b><div style="margin-top:7px">${prog(p)}</div></div><b class="num" style="font:800 17px var(--f-display)">${p}%</b></div>`; }).join('') || empty('No tasks yet', 'Add setup tasks inside a booking.', '', 'pulse', MOD.tasks.c)}</div></div></div>` : ''}
  </div>`;
};
function whenLabel(e) { const d = daysBetween(todayLocal(), e.date); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d > 0 ? `In ${d} days` : eventEnd(e) >= todayLocal() ? 'Running now' : fmtShort(e.date); }
function eventCard(e) {
  const [i, c] = evStyle(e); const p = eventProgress(e);
  return `<button class="evc" style="--c:${c}" onclick="A.go('event',{id:'${e.id}'})"><div class="top">${datebox(e.date)}<div style="min-width:0;flex:1;position:relative;z-index:1"><span class="tiny">${esc(e.type)} · ${whenLabel(e)}</span><b>${esc(e.title)}</b></div></div>
  <div class="bot"><div class="meta"><span>${ic('pin')}${esc((e.venue || '—').split(',')[0])}</span><span>${ic('users')}${num(e.pax)}</span></div>
  <div class="row-flex" style="justify-content:space-between">${stagePill(e.stage)}${p != null ? `<span class="tiny muted num">${Math.round(p)}% setup</span>` : can('invoices') && e.budget ? `<b class="num small">${inr(e.budget)}</b>` : ''}</div>${p != null ? prog(p) : ''}</div></button>`;
}
function eventRow(e) {
  const [i, c] = evStyle(e); const p = eventProgress(e);
  return `<div class="row click" onclick="A.go('event',{id:'${e.id}'})">${datebox(e.date, c)}<div class="main-col"><b>${esc(e.title)}</b><div class="sub">${esc(e.type)} · ${esc((e.venue || '—').split(',')[0])} · ${num(e.pax)} pax${p != null ? ` · ${Math.round(p)}% setup` : ''}</div></div><div class="end stack-sm" style="align-items:flex-end;gap:4px">${stagePill(e.stage)}<span class="tiny muted">${whenLabel(e)}</span></div></div>`;
}

/* ================= Bookings ================= */
V.bookings = () => {
  const mode = S.params.mode || 'list';
  const actions = can('bookings', 2) ? `${importBtn('events')}<button class="btn primary" onclick="A.eventForm()">${ic('plus')} New booking</button>` : '';
  return pageHead('Bookings', 'Every enquiry, quotation and confirmed event in one diary.', actions) +
    `<div class="toolbar">${seg('mode', [['list', 'List'], ['calendar', 'Calendar'], ['board', 'Pipeline']], mode, 'A.setP')}</div>` +
    (mode === 'calendar' ? calendarView() : mode === 'board' ? boardView() : listViewEvents());
};
function listViewEvents() {
  const f = S.filters.evStage || 'Active';
  const chips = ['Active', 'Upcoming', 'Enquiry', 'Quoted', 'Confirmed', 'Completed', 'Cancelled', 'All'];
  return `<div class="toolbar"><div class="search">${ic('search')}<input id="evSearch" placeholder="Search client, venue or phone" value="${esc(S.filters.evQ || '')}" oninput="A.evSearch(this.value)"></div></div>
  <div class="chips" style="margin-bottom:12px">${chips.map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('evStage','${c}')">${c}</button>`).join('')}</div>
  <div class="card"><div class="rows" id="evList">${evListRows()}</div></div>`;
}
function evListRows() {
  const f = S.filters.evStage || 'Active'; const q = (S.filters.evQ || '').toLowerCase(); const t = todayLocal();
  let list = col('events').slice();
  if (f === 'Active') list = list.filter(e => !['Completed', 'Closed', 'Cancelled'].includes(e.stage));
  else if (f === 'Upcoming') list = list.filter(e => e.date >= t && e.stage !== 'Cancelled');
  else if (f !== 'All') list = list.filter(e => e.stage === f);
  if (q) list = list.filter(e => [e.title, e.client, e.venue, e.phone].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => f === 'Completed' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  return list.map(eventRow).join('') || empty('No bookings here', 'Try another filter or add a new booking.');
}
A.evSearch = v => { S.filters.evQ = v; const el = $('#evList'); if (el) el.innerHTML = evListRows(); };
function calendarView() {
  const t = todayLocal(); const ym = S.filters.calMonth || t.slice(0, 7);
  const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1); const startDow = (first.getDay() + 6) % 7;
  const start = addDays(todayLocal(first), -startDow); const sel = S.filters.calSel || t;
  const saaya = Object.fromEntries((settings().saaya || []).map(s => [s.date, s.label]));
  const evs = col('events').filter(e => e.stage !== 'Cancelled');
  const cells = []; for (let i = 0; i < 42; i++) { const d = addDays(start, i); const de = evs.filter(e => e.date <= d && eventEnd(e) >= d); cells.push(`<button class="day ${d.slice(0, 7) !== ym ? 'out' : ''} ${d === t ? 'today' : ''} ${d === sel ? 'sel' : ''} ${saaya[d] ? 'saaya' : ''}" onclick="A.setF('calSel','${d}')" aria-label="${fmtDate(d)}, ${de.length} events"><span class="dn">${+d.slice(8)}</span>${de.slice(0, 3).map(e => `<span class="ev ${STAGE_TONE[e.stage] === 'good' ? 'good' : STAGE_TONE[e.stage] === 'accent' ? 'accent' : RESERVING.includes(e.stage) ? '' : 'warn'}">${esc(e.title)}</span>`).join('')}${de.length > 3 ? `<span class="tiny muted">+${de.length - 3}</span>` : ''}</button>`); }
  const prev = todayLocal(new Date(y, m - 2, 1)).slice(0, 7), next = todayLocal(new Date(y, m, 1)).slice(0, 7);
  const dayEvs = evs.filter(e => e.date <= sel && eventEnd(e) >= sel);
  return `<div class="split"><div class="card pad"><div class="row-flex" style="justify-content:space-between;margin-bottom:10px"><button class="icon-btn" onclick="A.setF('calMonth','${prev}')" aria-label="Previous month">${ic('back')}</button><h3>${first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button class="icon-btn" onclick="A.setF('calMonth','${next}')" aria-label="Next month" style="transform:scaleX(-1)">${ic('back')}</button></div>
  <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('')}${cells.join('')}</div>
  <div class="legend" style="margin-top:10px"><span><i style="background:var(--accent-soft);border:1px solid var(--accent)"></i>Peak saaya date</span><span><i style="background:var(--info-soft)"></i>Confirmed</span><span><i style="background:var(--warn-soft)"></i>Enquiry / quoted</span></div></div>
  <div class="card"><div class="card-h"><div><h3>${fmtDay(sel)}</h3>${saaya[sel] ? `<p>${esc(saaya[sel])}</p>` : ''}</div>${can('bookings', 2) ? `<button class="btn sm primary" onclick="A.eventForm(null,'${sel}')">${ic('plus')} Book</button>` : ''}</div>
  <div class="rows">${dayEvs.map(eventRow).join('') || empty('Free date', 'No bookings on this day.')}</div>
  ${can('inventory') ? `<div class="sheet-b" style="padding-top:12px;border-top:1px solid var(--line)"><div class="eyebrow" style="margin-bottom:6px">Stock free on this date</div>${col('inventory').slice(0, 6).map(i => { const a = availableOn(i, sel); return `<div class="row-flex small" style="justify-content:space-between"><span>${esc(i.name)}</span><b class="num ${a < 0 ? '' : ''}" style="color:${a < 0 ? 'var(--bad)' : 'inherit'}">${num(a)} / ${num(i.total)}</b></div>`; }).join('')}</div>` : ''}</div></div>`;
}
function boardView() {
  const stages = STAGES.filter(s => !['Closed', 'Cancelled'].includes(s)); const edit = can('bookings', 2);
  return `<div class="board">${stages.map(s => { const list = col('events').filter(e => e.stage === s).sort(by('date')); return `<div class="col"><h4><span>${s}</span><span class="muted num">${list.length}</span></h4>${list.map(e => `<div class="mini" onclick="A.go('event',{id:'${e.id}'})"><b class="small" style="display:block">${esc(e.title)}</b><div class="tiny muted">${fmtShort(e.date)} · ${num(e.pax)} pax${e.budget && can('invoices') ? ' · ' + inr(e.budget) : ''}</div>${edit ? `<div class="row-flex" style="margin-top:6px;gap:4px">${STAGES.indexOf(s) > 0 ? `<button class="btn sm" onclick="event.stopPropagation();A.moveStage('${e.id}',-1)" aria-label="Move back">←</button>` : ''}<button class="btn sm" onclick="event.stopPropagation();A.moveStage('${e.id}',1)">${esc(STAGES[STAGES.indexOf(s) + 1])} →</button></div>` : ''}</div>`).join('') || '<span class="tiny muted">Empty</span>'}</div>`; }).join('')}</div>`;
}
A.moveStage = async (id, dir) => { const e = evById(id); const i = STAGES.indexOf(e.stage) + dir; if (i < 0 || i >= STAGES.length) return; await A.setStage(id, STAGES[i]); };
A.setStage = async (id, stage) => {
  try { const e = evById(id); const old = e.stage; e.stage = stage; await save('events', e, `Moved ${e.title} from ${old} to ${stage}`);
    if (RESERVING.includes(stage)) { const sh = shortages().filter(s => s.ev.id === id); if (sh.length) toast(`Stock short: ${sh.map(s => s.short + '× ' + s.item.name).join(', ')}`, 'warn'); else toast(`${e.title} → ${stage}`); } else toast(`${e.title} → ${stage}`);
    render(); } catch (err) { toast(err.message, 'bad'); }
};
A.eventForm = (id, date) => {
  const e = id ? evById(id) : { date: date || todayLocal(), stage: 'Enquiry', type: 'Wedding', pax: 300 };
  formModal({
    title: id ? 'Edit booking' : 'New booking', sub: id ? e.title : 'Enquiry, quotation or confirmed event',
    fields: [
      { name: 'client', label: 'Client name', value: e.client, required: true, autofocus: true }, { name: 'phone', label: 'Mobile', type: 'tel', value: e.phone, required: true },
      { name: 'type', label: 'Event type', type: 'select', options: EVENT_TYPES, value: e.type }, { name: 'stage', label: 'Stage', type: 'select', options: STAGES, value: e.stage },
      { name: 'title', label: 'Event name', value: e.title, placeholder: 'Auto: client + event type', full: true },
      { name: 'date', label: 'Start date', type: 'date', value: e.date, required: true }, { name: 'endDate', label: 'End date (multi-day)', type: 'date', value: e.endDate },
      { name: 'time', label: 'Start time', type: 'time', value: e.time }, { name: 'pax', label: 'Guests (pax)', type: 'number', value: e.pax, min: 0 },
      { name: 'venue', label: 'Venue', value: e.venue, full: true, placeholder: 'e.g. Rambagh Lawn, Jaipur' },
      { name: 'budget', label: 'Package value (₹)', type: 'number', value: e.budget, min: 0, hint: 'Quoted amount; used until an invoice is made' }, { name: 'email', label: 'Client email', type: 'email', value: e.email },
      { name: 'notes', label: 'Notes for team', type: 'textarea', value: e.notes, full: true }
    ],
    left: id && can('bookings', 3) ? `<button type="button" class="btn danger" onclick="A.deleteEvent('${id}')">${ic('trash')} Delete</button>` : '',
    onSubmit: async v => {
      if (v.endDate && v.endDate < v.date) throw new Error('End date cannot be before the start date');
      const clash = col('events').filter(x => x.id !== id && x.stage !== 'Cancelled' && x.date <= (v.endDate || v.date) && eventEnd(x) >= v.date);
      const rec = Object.assign(id ? e : { id: uid('e_'), created: Date.now(), items: [], schedule: [], menu: { dishIds: [], pax: v.pax }, dispatch: {} }, v, { title: v.title || `${v.client.split(' ').slice(-1)[0]} ${v.type}`, pax: +v.pax || 0, budget: +v.budget || 0 });
      await save('events', rec, `${id ? 'Updated' : 'Created'} booking ${rec.title}`);
      toast(clash.length ? `Saved. Note: ${clash.length} other booking(s) on these dates.` : 'Booking saved', clash.length ? 'warn' : '');
      if (!id) A.go('event', { id: rec.id }); else render();
    }
  });
};
A.deleteEvent = id => { const e = evById(id); confirmBox('Delete booking?', `${e.title} and its schedule will be removed. Invoices and payments stay in Money.`, 'Delete booking', async () => { await removeRec('events', id, 'Deleted booking ' + e.title); A.go('bookings'); }); };

/* ================= Event hub ================= */
V.event = () => {
  const e = evById(S.params.id); if (!e) return empty('Booking not found', 'It may have been deleted.', `<button class="btn" onclick="A.go('bookings')">Back to bookings</button>`);
  const tabs = [['overview', 'Overview', true], ['items', 'Items & dispatch', can('inventory')], ['menu', 'Menu', can('catering')], ['schedule', 'Run-sheet', true], ['tasks', 'Tasks', can('tasks')], ['money', 'Money', can('invoices') || can('payments') || can('expenses')], ['guest', 'Client link', can('bookings', 2)]].filter(x => x[2]);
  const tab = tabs.find(x => x[0] === S.params.tab) ? S.params.tab : 'overview';
  const si = STAGES.indexOf(e.stage); const edit = can('bookings', 2);
  const [ei, ec] = evStyle(e);
  const head = `<button class="back" onclick="A.go('bookings')">${ic('back')} Bookings</button>
  <div class="evc evhead" style="--c:${ec}"><div class="top">${datebox(e.date)}<div style="min-width:0;flex:1;position:relative;z-index:1"><span class="tiny">${esc(e.type)} · ${whenLabel(e)}${e.endDate && e.endDate !== e.date ? ' · till ' + fmtShort(e.endDate) : ''}</span><b>${esc(e.title)}</b></div><span style="position:relative;z-index:1">${stagePill(e.stage)}</span></div>
  <div class="bot"><div class="meta"><span>${ic('user')}${esc(e.client)}</span><span>${ic('pin')}${esc(e.venue || '—')}</span><span>${ic('users')}${num(e.pax)} guests</span>${e.time ? `<span>${ic('clock')}${esc(e.time)}</span>` : ''}</div>
  <div class="stepper" style="margin-top:4px">${STAGES.slice(0, 7).map((s, i) => `<button class="step ${i < si ? 'done' : i === si ? 'cur' : ''}" ${edit ? `onclick="A.setStage('${e.id}','${s}')"` : 'disabled'}><i></i>${s}</button>`).join('')}</div>
  <div class="row-flex">${waBtn(`Namaste ${e.client} ji, this is ${settings().bizName} regarding your ${e.type} on ${fmtDate(e.date)}.`, e.phone, 'Message')}${edit ? `<button class="btn sm" onclick="A.eventForm('${e.id}')">${ic('edit')} Edit</button>` : ''}<span class="grow"></span>${edit && e.stage !== 'Cancelled' ? `<button class="btn sm ghost danger" onclick="A.setStage('${e.id}','Cancelled')">Cancel event</button>` : ''}</div></div></div>`;
  const stepper = '';
  const tabBar = `<div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}</button>`).join('')}${tabHelp('ev-' + tab)}</div>`;
  return head + stepper + tabBar + EV_TABS[tab](e);
};
const EV_TABS = {};
EV_TABS.overview = e => {
  const m = eventMoney(e); const p = eventProgress(e);
  return `<div class="split"><div class="card"><div class="card-h"><h3>Details</h3></div><div class="sheet-b" style="padding-top:12px"><table class="tbl"><tbody>
    <tr><td class="muted">Client</td><td><b>${esc(e.client)}</b><div class="small muted">${esc(e.phone || '')} ${e.email ? '· ' + esc(e.email) : ''}</div></td></tr>
    <tr><td class="muted">When</td><td>${fmtDay(e.date)}${e.endDate && e.endDate !== e.date ? ' to ' + fmtDay(e.endDate) : ''} ${e.time ? '· ' + esc(e.time) : ''}</td></tr>
    <tr><td class="muted">Venue</td><td>${esc(e.venue || '—')}</td></tr><tr><td class="muted">Guests</td><td class="num">${num(e.pax)}</td></tr>
    ${can('invoices') ? `<tr><td class="muted">Package value</td><td class="num">${inr(e.budget)}</td></tr>` : ''}
    <tr><td class="muted">Notes</td><td>${esc(e.notes || '—')}</td></tr></tbody></table></div></div>
  <div class="stack">${can('invoices') ? `<div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0">${kpi('Received', inr(m.received), '', 'good')}${kpi('Balance', inr(Math.max(0, m.due)), '', m.due > 0 ? 'bad' : '')}${can('reports') ? kpi('Costs so far', inr(m.cost)) + kpi('Profit est.', inr(m.profit), m.revenue ? m.margin.toFixed(1) + '% margin' : '', m.profit >= 0 ? 'good' : 'bad') : ''}</div>` : ''}
  <div class="card pad stack-sm"><div class="row-flex" style="justify-content:space-between"><b>Setup progress</b><b class="num">${p == null ? '—' : Math.round(p) + '%'}</b></div>${prog(p || 0)}<span class="tiny muted">${col('tasks').filter(x => x.eventId === e.id).length} tasks · ${(e.items || []).length} item types reserved · ${(e.schedule || []).length} run-sheet entries</span></div></div></div>`;
};
EV_TABS.items = e => {
  const edit = can('bookings', 2);
  const rows = (e.items || []).map((it, idx) => { const item = getById('inventory', it.invId); if (!item) return ''; const free = availableOn(item, e.date, e.id); const short = it.qty > free;
    return `<tr><td><b>${esc(item.name)}</b><div class="tiny muted">${esc(item.category)} · ${esc(item.bay || '')}</div></td><td class="r">${edit ? `<input class="inline-in num" style="width:80px;text-align:right" type="number" min="0" value="${it.qty}" onchange="A.setItemQty('${e.id}',${idx},this.value)">` : num(it.qty)}</td><td class="r"><span style="color:${short ? 'var(--bad)' : 'var(--good)'};font-weight:700">${num(free)}</span>${short ? `<div class="tiny" style="color:var(--bad)">Short ${it.qty - free}</div>` : ''}</td>${can('invoices') ? `<td class="r">${inr(item.rate)}</td>` : ''}<td class="r">${edit ? `<button class="btn sm ghost" onclick="A.removeItem('${e.id}',${idx})" aria-label="Remove">${ic('trash')}</button>` : ''}</td></tr>`; }).join('');
  const ds = e.dispatch || {};
  const weight = sum(e.items || [], it => (+getById('inventory', it.invId)?.weightKg || 0) * it.qty);
  return `<div class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Reserved items</h3><p>Free stock is checked against every other confirmed booking on ${fmtDate(e.date)}.</p></div>${edit ? `<button class="btn sm primary" onclick="A.addItemForm('${e.id}')">${ic('plus')} Add item</button>` : ''}</div>
  ${rows ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Free on date</th>${can('invoices') ? '<th class="r">Rate/day</th>' : ''}<th></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('No items reserved', 'Add tents, chairs, lights and DG sets for this event.')}
  ${!RESERVING.includes(e.stage) && rows ? `<div class="banner warn" style="margin:12px">${ic('alert')}<span>Stock is held only when the booking is Confirmed, Setup or Live. Right now it is ${esc(e.stage)}.</span></div>` : ''}</div>
  <div class="card"><div class="card-h"><div><h3>Dispatch & return</h3><p>Approx. load ${num(weight)} kg</p></div>${ds.returned ? pill('Returned ' + fmtShort(ds.returned), 'good') : ds.out ? pill('On site since ' + fmtShort(ds.out), 'accent') : pill('In godown')}</div>
  <div class="sheet-b row-flex" style="padding-top:12px">
    <button class="btn" onclick="A.challan('${e.id}')">${ic('truck')} Delivery challan</button>
    ${edit && !ds.out && (e.items || []).length ? `<button class="btn accent" onclick="A.dispatchForm('${e.id}')">${ic('send')} Mark dispatched</button>` : ''}
    ${edit && ds.out && !ds.returned ? `<button class="btn primary" onclick="A.returnForm('${e.id}')">${ic('check')} Mark returned</button>` : ''}
    ${can('invoices', 2) && (e.items || []).length ? `<button class="btn" onclick="A.itemsToInvoice('${e.id}')">${ic('receipt')} Bill these items</button>` : ''}
  </div></div>`;
};
A.addItemForm = id => {
  const e = evById(id);
  formModal({ title: 'Reserve item', sub: `Free quantity shown for ${fmtDate(e.date)}`, fields: [
    { name: 'invId', label: 'Item', type: 'select', required: true, full: true, options: col('inventory').map(i => [i.id, `${i.name} (free ${availableOn(i, e.date, e.id)})`]) },
    { name: 'qty', label: 'Quantity', type: 'number', min: 1, value: 1, required: true }],
    onSubmit: async v => { e.items = e.items || []; const ex = e.items.find(x => x.invId === v.invId); if (ex) ex.qty += +v.qty; else e.items.push({ invId: v.invId, qty: +v.qty }); await save('events', e, `Reserved ${v.qty} × ${getById('inventory', v.invId)?.name} for ${e.title}`); render(); }
  });
};
A.setItemQty = async (id, idx, val) => { const e = evById(id); e.items[idx].qty = Math.max(0, +val || 0); try { await save('events', e); render(); } catch (err) { toast(err.message, 'bad'); } };
A.removeItem = async (id, idx) => { const e = evById(id); e.items.splice(idx, 1); try { await save('events', e); render(); } catch (err) { toast(err.message, 'bad'); } };
A.dispatchForm = id => { const e = evById(id); formModal({ title: 'Dispatch to site', fields: [{ name: 'vehicle', label: 'Vehicle number', value: e.dispatch?.vehicle, placeholder: 'RJ14 GB 5421' }, { name: 'driver', label: 'Driver & mobile', value: e.dispatch?.driver }, { name: 'date', label: 'Date', type: 'date', value: todayLocal() }], submit: 'Mark dispatched', onSubmit: async v => { e.dispatch = { ...e.dispatch, out: v.date, vehicle: v.vehicle, driver: v.driver }; if (['Enquiry', 'Quoted', 'Confirmed'].includes(e.stage)) e.stage = 'Setup'; await save('events', e, `Dispatched material for ${e.title}`); render(); } }); };
A.returnForm = id => {
  const e = evById(id);
  const fields = (e.items || []).map((it, i) => ({ name: 'd' + i, label: `Damaged / missing: ${getById('inventory', it.invId)?.name || ''} (sent ${it.qty})`, type: 'number', min: 0, max: it.qty, value: 0, full: true }));
  fields.push({ name: 'charge', label: 'Add damage charges to the client invoice', type: 'checkbox', value: can('invoices', 2) });
  formModal({ title: 'Material return', sub: 'Count everything back into the godown', fields, submit: 'Confirm return', onSubmit: async v => {
    const lines = [];
    for (const [i, it] of (e.items || []).entries()) { const dmg = +v['d' + i] || 0; if (!dmg) continue; const item = getById('inventory', it.invId); item.damaged = (+item.damaged || 0) + dmg; await save('inventory', item, `${dmg} × ${item.name} damaged at ${e.title}`); lines.push({ id: uid('l'), desc: `Damage recovery: ${item.name}`, qty: dmg, rate: Math.round((+item.rate || 0) * 10), days: 1, hsn: settings().sac }); }
    e.dispatch = { ...e.dispatch, returned: todayLocal() }; if (['Setup', 'Live'].includes(e.stage)) e.stage = 'Completed';
    await save('events', e, `Material returned from ${e.title}`);
    if (v.charge && lines.length && can('invoices', 2)) { const inv = eventInvoices(e.id).find(i => i.type === 'invoice') || await createInvoiceFor(e, 'invoice', []); inv.lines.push(...lines); await save('invoices', inv, `Added damage charges to ${inv.no}`); toast(`Return saved. Damage charges added to ${inv.no}`); } else toast('Return saved');
    render(); } });
};
A.challan = id => {
  const e = evById(id); const st = settings();
  const text = `Delivery Challan · ${st.bizName}\nEvent: ${e.title}\nVenue: ${e.venue}\nDate: ${fmtDate(e.date)}\nVehicle: ${e.dispatch?.vehicle || '-'}\n\n` + (e.items || []).map(it => `${getById('inventory', it.invId)?.name}: ${it.qty}`).join('\n');
  modal(`${sheetHead('Delivery challan', e.title)}<div class="sheet-b"><div id="printArea"><div class="paper" style="--pb:${esc(brandColor(st))}">${paperHead(st, 'DELIVERY CHALLAN', `<div class="pm">No. DC-${esc(e.id.slice(-5).toUpperCase())}</div><div class="pm">${fmtDate(e.dispatch?.out || todayLocal())}</div>`)}
  <p style="margin:14px 0"><b>To:</b> ${esc(e.client)} · ${esc(e.venue)}<br><b>Vehicle:</b> ${esc(e.dispatch?.vehicle || '__________')} · <b>Driver:</b> ${esc(e.dispatch?.driver || '__________')}</p>
  <table><thead><tr><th>#</th><th>Item</th><th class="r">Qty sent</th><th class="r">Qty returned</th></tr></thead><tbody>${(e.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${esc(getById('inventory', it.invId)?.name || '')}</td><td class="r">${num(it.qty)}</td><td class="r">______</td></tr>`).join('')}</tbody></table>
  <div class="row-flex" style="justify-content:space-between;margin-top:36px"><span class="pm" style="align-self:flex-end">Received by (client)</span>${signBlock(st, true)}</div></div></div></div>
  <footer class="sheet-f no-print">${waBtn(text, (e.dispatch?.driver || '').replace(/\D/g, '').slice(-10), 'Send to driver')}<span class="grow"></span>${!FRAMED ? `<button class="btn primary" onclick="window.print()">${ic('print')} Print</button>` : ''}</footer>`, { wide: true });
};
A.itemsToInvoice = async id => {
  try { const e = evById(id); const days = Math.max(1, daysBetween(e.date, eventEnd(e)) + 1);
    const lines = (e.items || []).map(it => { const item = getById('inventory', it.invId); return { id: uid('l'), desc: item?.name || 'Item', qty: it.qty, rate: +item?.rate || 0, days, hsn: settings().sac }; });
    let inv = eventInvoices(e.id).find(i => i.type === 'quotation' && !i.converted) || eventInvoices(e.id).find(i => i.type === 'invoice');
    if (inv) { inv.lines.push(...lines); await save('invoices', inv, `Added ${lines.length} items to ${inv.no}`); } else inv = await createInvoiceFor(e, 'quotation', lines);
    A.go('invoice', { id: inv.id }); toast(`${lines.length} items added to ${inv.no}`);
  } catch (err) { toast(err.message, 'bad'); }
};
EV_TABS.menu = e => {
  const menu = e.menu || { dishIds: [] }; const ds = col('dishes').filter(d => (menu.dishIds || []).includes(d.id));
  return `<div class="card"><div class="card-h"><div><h3>Menu for ${num(menu.pax || e.pax)} guests</h3><p>${menu.perPlate && can('invoices') ? 'Rate ' + inr(menu.perPlate) + ' per plate' : 'Plan dishes in the catering calculator'}</p></div><button class="btn sm primary" onclick="A.openCatering('${e.id}')">${ic('pot')} Open calculator</button></div>
  <div class="rows">${ds.map(d => `<div class="row"><div class="main-col"><b>${esc(d.name)}</b><div class="sub">${esc(d.category)}</div></div></div>`).join('') || empty('No menu yet', 'Pick dishes in the catering calculator and save them to this event.')}</div></div>`;
};
EV_TABS.schedule = e => {
  const edit = can('bookings', 2);
  const list = (e.schedule || []).slice().sort((a, b) => ((a.day || '') + a.time).localeCompare((b.day || '') + b.time));
  const days = [...new Set(list.map(s => s.day || 'Day 1'))];
  const text = `Run-sheet: ${e.title} (${e.venue})\n` + days.map(d => `\n${d}\n` + list.filter(s => (s.day || 'Day 1') === d).map(s => `${s.time}  ${s.title}${s.lead ? ' — ' + s.lead : ''}`).join('\n')).join('\n');
  return `<div class="card"><div class="card-h"><div><h3>Run-sheet</h3><p>Minute-by-minute plan for crew, halwai and coordinators</p></div><div class="row-flex">${list.length ? waBtn(text, '', 'Share') : ''}${edit ? `<button class="btn sm primary" onclick="A.schedForm('${e.id}')">${ic('plus')} Add</button>` : ''}</div></div>
  ${days.map(d => `<div class="eyebrow" style="padding:12px 16px 0">${esc(d)}</div><div class="rows">${list.filter(s => (s.day || 'Day 1') === d).map(s => `<div class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.schedForm('${e.id}','${s.id}')"` : ''}><span class="pill accent mono">${esc(s.time)}</span><div class="main-col"><b>${esc(s.title)}</b><div class="sub">${esc(s.lead || '')}</div></div></div>`).join('')}</div>`).join('') || empty('No run-sheet yet', 'Add sound check, baarat, dinner and phera timings.')}</div>`;
};
A.schedForm = (id, sid) => {
  const e = evById(id); const s = sid ? e.schedule.find(x => x.id === sid) : { day: (e.schedule || []).slice(-1)[0]?.day || 'Day 1', time: '18:00' };
  formModal({ title: sid ? 'Edit entry' : 'Add run-sheet entry', fields: [{ name: 'day', label: 'Day label', value: s.day, placeholder: 'Day 1 · Sangeet' }, { name: 'time', label: 'Time', type: 'time', value: s.time, required: true }, { name: 'title', label: 'What happens', value: s.title, required: true, full: true }, { name: 'lead', label: 'Person in charge', value: s.lead, full: true }],
    left: sid ? `<button type="button" class="btn danger" onclick="A.delSched('${id}','${sid}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { e.schedule = e.schedule || []; if (sid) Object.assign(s, v); else e.schedule.push({ id: uid('s'), ...v }); await save('events', e, `Updated run-sheet for ${e.title}`); render(); } });
};
A.delSched = async (id, sid) => { const e = evById(id); e.schedule = e.schedule.filter(x => x.id !== sid); try { await save('events', e); A.closeModal(); render(); } catch (err) { toast(err.message, 'bad'); } };
EV_TABS.tasks = e => {
  const list = col('tasks').filter(t => t.eventId === e.id);
  return `<div class="card"><div class="card-h"><div><h3>Setup tasks</h3><p>Crew update progress from their phones</p></div>${can('tasks', 2) ? `<button class="btn sm primary" onclick="A.taskForm(null,'${e.id}')">${ic('plus')} Task</button>` : ''}</div><div class="rows">${list.map(taskRow).join('') || empty('No tasks', 'Break the setup into tasks and assign crew.')}</div></div>`;
};
EV_TABS.money = e => {
  const m = eventMoney(e); const invs = eventInvoices(e.id); const pays = col('payments').filter(p => p.eventId === e.id);
  const pos = col('pos').filter(p => p.eventId === e.id); const exps = col('expenses').filter(x => x.eventId === e.id);
  return `<div class="kpis">${kpi('Billed', inr(m.billed), m.billed ? '' : 'Using package ' + inr(e.budget))}${kpi('Received', inr(m.received), '', 'good')}${kpi('Costs', inr(m.cost), `POs ${inr(m.po)} · Exp ${inr(m.exp)} · Crew ${inr(m.wages + m.crew)}`)}${kpi('Profit est.', inr(m.profit), m.revenue ? m.margin.toFixed(1) + '% margin' : '', m.profit >= 0 ? 'good' : 'bad')}</div>
  <div class="grid g2">
    ${can('invoices') ? `<div class="card"><div class="card-h"><h3>Invoices & quotes</h3>${can('invoices', 2) ? `<button class="btn sm primary" onclick="A.newInvoice('${e.id}')">${ic('plus')} New</button>` : ''}</div><div class="rows">${invs.map(invRow).join('') || empty('None yet', 'Create a quotation for this event.')}</div></div>` : ''}
    ${can('payments') ? `<div class="card"><div class="card-h"><h3>Payments received</h3>${can('payments', 2) ? `<button class="btn sm" onclick="A.paymentForm(null,'${e.id}')">${ic('plus')} Record</button>` : ''}</div><div class="rows">${pays.map(payRow).join('') || empty('No payments', 'Advance and balance payments show here.')}</div></div>` : ''}
    ${can('vendors') ? `<div class="card"><div class="card-h"><h3>Vendor POs</h3>${can('vendors', 2) ? `<button class="btn sm" onclick="A.poForm(null,'${e.id}')">${ic('plus')} PO</button>` : ''}</div><div class="rows">${pos.map(poRow).join('') || empty('No POs', 'Florist, DJ, dairy and other partners.')}</div></div>` : ''}
    ${can('expenses') ? `<div class="card"><div class="card-h"><h3>Expenses</h3>${can('expenses', 2) ? `<button class="btn sm" onclick="A.expenseForm(null,'${e.id}')">${ic('plus')} Add</button>` : ''}</div><div class="rows">${exps.map(expRow).join('') || empty('No expenses', 'Diesel, transport, extra labour.')}</div></div>` : ''}
  </div>`;
};
EV_TABS.guest = e => `<div class="card pad stack" style="max-width:640px"><h3>Share a client link</h3><p class="muted">The client sees only this event: stage, setup progress, run-sheet, bill, balance with your UPI, and a review form. They cannot see other clients, costs or margins.</p>
  <div class="row-flex"><label class="field" style="width:180px"><span>Link valid for</span><select id="gDays"><option value="30">30 days</option><option value="90" selected>90 days</option><option value="365">1 year</option></select></label><button class="btn primary" style="align-self:flex-end" onclick="A.makeGuest('${e.id}')">${ic('link')} Create link</button></div>
  <div id="guestOut"></div>${S.adapter.mode === 'local' ? `<div class="banner warn">${ic('alert')}<span>Offline mode: a client link only opens on this same device. Connect Supabase so clients can open it on their own phone.</span></div>` : ''}</div>`;
A.makeGuest = async id => {
  try { const e = evById(id); const days = +($('#gDays')?.value || 90); const token = await S.adapter.createGuest(S.org.orgId, id, days);
    const url = location.href.split('#')[0] + '#guest-' + token; const st = settings();
    const msg = `Namaste ${e.client} ji! Track your ${e.type} with ${st.bizName}: setup progress, programme and bill.\nOpen: ${url}\nOr enter code ${token} under "Client / Guest" in the app.`;
    $('#guestOut').innerHTML = `<div class="banner good stack-sm" style="flex-direction:column"><div><b>Code:</b> <span class="mono">${token}</span></div><div class="small mono" style="overflow-wrap:anywhere">${esc(url)}</div><div class="row-flex">${waBtn(msg, e.phone, 'Send to client')}<button class="btn sm" onclick="A.copy('${esc(url)}')">${ic('copy')} Copy link</button>${S.adapter.mode === 'local' ? `<button class="btn sm" onclick="A.openGuest('${token}')">${ic('eye')} Preview</button>` : ''}</div></div>`;
    logAct(`Created client link for ${e.title}`);
  } catch (err) { toast(err.message, 'bad'); }
};

/* ================= Inventory ================= */
V.inventory = () => {
  const date = S.filters.invDate || todayLocal(); const cat = S.filters.invCat || 'All';
  const cats = ['All', ...INV_CATS.filter(c => col('inventory').some(i => i.category === c))];
  const totalItems = sum(col('inventory'), i => i.total); const dmg = sum(col('inventory'), i => i.damaged);
  return pageHead('Inventory', 'Godown stock with date-wise availability. Stock is held automatically for confirmed bookings.', can('inventory', 2) ? `${importBtn('inventory')}<button class="btn primary" onclick="A.itemForm()">${ic('plus')} Add item</button>` : '') +
    `<div class="kpis">${kpi('Item types', col('inventory').length, '', '', 'box', '#2563EB')}${kpi('Total pieces', num(totalItems), '', '', 'chair', '#7C3AED')}${kpi('Out on rent now', num(sum(col('inventory'), onRent)), '', 'accent', 'truck', '#EA580C')}${kpi('Damaged / repair', num(dmg), '', dmg ? 'bad' : '', 'wrench', '#E0344B')}</div>
  <div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search chairs, tent, DG…" value="${esc(S.filters.invQ || '')}" oninput="A.invSearch(this.value)"></div><label class="row-flex small" style="gap:6px"><span class="muted">Free on</span><input type="date" value="${date}" style="width:auto" onchange="A.setF('invDate',this.value)"></label></div>
  <div class="chips" style="margin-bottom:12px">${cats.map(c => `<button class="chip ${cat === c ? 'on' : ''}" onclick="A.setF('invCat','${c}')">${c}</button>`).join('')}</div>
  <div class="grid g-auto" id="invGrid">${invCards()}</div>`;
};
function invCards() {
  const date = S.filters.invDate || todayLocal(); const cat = S.filters.invCat || 'All'; const q = (S.filters.invQ || '').toLowerCase(); const edit = can('inventory', 2);
  const list = col('inventory').filter(i => (cat === 'All' || i.category === cat) && (!q || (i.name + i.category + (i.bay || '')).toLowerCase().includes(q))).sort(by('category'));
  return list.map(i => { const res = reservedOn(i.id, date); const free = availableOn(i, date); const pct = i.total ? Math.max(0, free) / i.total * 100 : 0;
    const [ii, icc] = INV_STYLE[i.category] || INV_STYLE.Other;
    return `<div class="card pad stack-sm"><div class="row-flex" style="align-items:flex-start;flex-wrap:nowrap">${ibox(ii, icc)}<div style="min-width:0;flex:1"><b style="display:block;line-height:1.3">${esc(i.name)}</b><span class="tiny muted">${esc(i.category)} · ${esc(i.bay || 'Main godown')}</span></div>${free < 0 ? pill('Short ' + (-free), 'bad') : free < i.total * .15 ? pill('Low', 'warn') : pill('OK', 'good')}</div>
    <div class="tri"><div><span>Total</span><b class="num">${num(i.total)}</b></div><div class="bk"><span>Booked</span><b class="num">${num(res)}</b></div><div class="${free < 0 ? 'sh' : 'fr'}"><span>Free</span><b class="num">${num(free)}</b></div></div>
    <div class="row-flex" style="justify-content:space-between"><span class="tiny muted">${can('invoices') ? inr(i.rate) + '/day · ' : ''}${i.damaged ? num(i.damaged) + ' damaged' : 'No damage'}</span>${edit ? `<div class="row-flex" style="gap:4px"><button class="btn sm" onclick="A.stock('${i.id}',-1)" aria-label="Reduce stock">−</button><button class="btn sm" onclick="A.stock('${i.id}',1)" aria-label="Add stock">+</button><button class="btn sm ghost" onclick="A.itemForm('${i.id}')" aria-label="Edit">${ic('edit')}</button></div>` : ''}</div></div>`; }).join('') || `<div class="card">${empty('No items', 'Add your tents, chairs, lights, DG sets and utensils.')}</div>`;
}
A.invSearch = v => { S.filters.invQ = v; $('#invGrid').innerHTML = invCards(); };
A.stock = async (id, d) => { const i = getById('inventory', id); i.total = Math.max(0, (+i.total || 0) + d); try { await save('inventory', i); $('#invGrid').innerHTML = invCards(); } catch (err) { toast(err.message, 'bad'); } };
A.itemForm = id => {
  const i = id ? getById('inventory', id) : { category: INV_CATS[1], total: 50, damaged: 0, rate: 100, weightKg: 0 };
  formModal({ title: id ? 'Edit item' : 'Add inventory item', fields: [
    { name: 'name', label: 'Item name', value: i.name, required: true, full: true, placeholder: 'e.g. Maharaja velvet sofa' }, { name: 'category', label: 'Category', type: 'select', options: INV_CATS, value: i.category },
    { name: 'bay', label: 'Godown location', value: i.bay, placeholder: 'Rack B-4' }, { name: 'total', label: 'Total owned', type: 'number', min: 0, value: i.total, required: true },
    { name: 'damaged', label: 'Under repair / damaged', type: 'number', min: 0, value: i.damaged }, { name: 'rate', label: 'Rent per day (₹)', type: 'number', min: 0, value: i.rate },
    { name: 'weightKg', label: 'Weight per piece (kg)', type: 'number', min: 0, value: i.weightKg, hint: 'Used for truck loading' }],
    left: id && can('inventory', 3) ? `<button type="button" class="btn danger" onclick="A.delItem('${id}')">${ic('trash')} Delete</button>` : '',
    onSubmit: async v => { const rec = Object.assign(id ? i : { id: uid('i_'), unit: 'day' }, v); await save('inventory', rec, `${id ? 'Updated' : 'Added'} inventory: ${rec.name}`); render(); } });
};
A.delItem = id => { const i = getById('inventory', id); confirmBox('Delete item?', `${i.name} will be removed from inventory. Bookings that reserved it will lose that line.`, 'Delete', async () => { await removeRec('inventory', id, 'Deleted inventory ' + i.name); render(); }); };

/* ================= Catering ================= */
A.openCatering = evId => { const e = evById(evId); if (!can('catering')) return; initCatering(); Object.assign(S.cat, { eventId: evId, pax: e.menu?.pax || e.pax || S.cat.pax }); if (e.menu?.dishIds?.length) S.cat.selected = [...e.menu.dishIds]; A.go('catering'); };
function cateringCalc() {
  const c = S.cat; const st = settings(); const rates = mandi(); const effPax = Math.round(c.pax * (1 + c.buffer / 100)); const agg = {};
  const dishes = col('dishes').filter(d => c.selected.includes(d.id));
  dishes.forEach(d => Object.entries(d.ration || {}).forEach(([k, v]) => agg[k] = (agg[k] || 0) + (+v || 0) * effPax));
  const rows = Object.entries(agg).map(([k, q]) => ({ name: k, qty: q, rate: +rates[k] || 0, cost: q * (+rates[k] || 0) })).sort((a, b) => b.cost - a.cost);
  const raw = sum(rows, r => r.cost); const rawPerPlate = c.pax ? raw / c.pax : 0; const costPerPlate = rawPerPlate + (+st.overheadPerPlate || 0);
  const sell = Math.ceil(costPerPlate * (1 + c.markup / 100) / 5) * 5;
  return { effPax, rows, raw, rawPerPlate, costPerPlate, sell, total: sell * c.pax, dishes };
}
V.catering = () => {
  const c = S.cat; const edit = can('catering', 2);
  const evOpts = [['', '— Not linked —'], ...col('events').filter(e => !['Cancelled', 'Closed'].includes(e.stage)).sort(by('date')).map(e => [e.id, `${e.title} (${fmtShort(e.date)})`])];
  const cats = [...new Set([...DISH_CATS, ...col('dishes').map(d => d.category)])];
  return pageHead('Catering & ration calculator', 'Pick the menu, set guests and buffer. Get the halwai’s samagri list, raw cost and a per-plate price.', edit ? `${importBtn('dishes')}<button class="btn" onclick="A.dishForm()">${ic('plus')} Add dish</button>` : '') +
  `<div class="card pad" style="margin-bottom:14px"><div class="grid2" style="padding:0;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    <label class="field"><span>Guests (pax)</span><input type="number" min="1" value="${c.pax}" onchange="A.catSet('pax',this.value)"></label>
    <label class="field"><span>Halwai buffer</span><select onchange="A.catSet('buffer',this.value)">${[0, 5, 10, 15, 20].map(b => `<option value="${b}" ${+c.buffer === b ? 'selected' : ''}>+${b}%${b === 10 ? ' (usual)' : ''}</option>`).join('')}</select></label>
    <label class="field"><span>Margin on cost</span><input type="number" min="0" value="${c.markup}" onchange="A.catSet('markup',this.value)"></label>
    <label class="field"><span>Link to booking</span><select onchange="A.catSet('eventId',this.value)">${evOpts.map(([v, l]) => `<option value="${v}" ${c.eventId === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div></div>
  <div class="split"><div class="stack">${cats.map(cat => { const ds = col('dishes').filter(d => d.category === cat); if (!ds.length) return ''; const [ci, cc] = DISH_STYLE[cat] || ['pot', '#16A34A']; return `<div class="card"><div class="card-h"><div class="row-flex" style="flex-wrap:nowrap">${ibox(ci, cc, 'sm')}<h3>${esc(cat)}</h3></div><span class="pill ${ds.some(d => c.selected.includes(d.id)) ? 'good' : ''}">${ds.filter(d => c.selected.includes(d.id)).length}/${ds.length} picked</span></div><div>${ds.map(d => `<label class="dishrow"><span class="veg" title="Veg"></span><div class="main-col" style="flex:1;min-width:0"><b style="display:block">${esc(d.name)}</b><div class="sub small muted">${Object.keys(d.ration || {}).slice(0, 4).map(esc).join(', ')}</div></div>${edit ? `<button class="btn sm ghost" onclick="event.preventDefault();A.dishForm('${d.id}')" aria-label="Edit dish">${ic('edit')}</button>` : ''}<input type="checkbox" ${c.selected.includes(d.id) ? 'checked' : ''} onchange="A.catToggle('${d.id}')"></label>`).join('')}</div></div>`; }).join('') || `<div class="card">${empty('No dishes yet', 'Add your standard dishes with ingredient quantity per guest.')}</div>`}</div>
  <div class="stack" id="catResult">${catResult()}</div></div>`;
};
function catResult() {
  const r = cateringCalc(); const c = S.cat; const money = can('invoices') || can('catering', 2); const edit = can('catering', 2);
  const list = `Kitchen samagri list (${c.pax} pax + ${c.buffer}% buffer = ${r.effPax})\n` + r.rows.map(x => `${x.name}: ${x.qty.toFixed(1)} ${/\(L\)/.test(x.name) ? 'L' : 'kg'}`).join('\n');
  return `${money ? `<div class="hero" style="margin:0;--c:#16A34A;--c2:#0D9488"><div class="in" style="display:block"><div class="eyebrow">Suggested price per plate</div><div class="big">${inr(r.sell)}</div><p>Raw ${inr(r.rawPerPlate)} + overhead ${inr(settings().overheadPerPlate)} = cost ${inr(r.costPerPlate)} · ${c.markup}% margin</p><p style="margin-top:6px"><b>${inr(r.total)}</b> for ${num(c.pax)} plates · ${r.dishes.length} dishes</p>
  <div class="row-flex" style="margin-top:12px">${c.eventId && can('bookings', 2) ? `<button class="btn white sm" onclick="A.saveMenu()">${ic('check')} Save menu to booking</button>` : ''}${can('invoices', 2) ? `<button class="btn sm" onclick="A.cateringToInvoice()">${ic('receipt')} Add to invoice</button>` : ''}</div></div></div>` : ''}
  <div class="card"><div class="card-h"><div><h3>Samagri list</h3><p>For ${num(r.effPax)} plates including buffer</p></div><div class="row-flex">${waBtn(list, '', 'Share')}${!FRAMED ? `<button class="btn sm" onclick="A.rationCSV()">${ic('download')} CSV</button>` : ''}</div></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ingredient</th><th class="r">Qty</th>${money ? '<th class="r">Mandi ₹/unit</th><th class="r">Cost</th>' : ''}</tr></thead><tbody>${r.rows.map(x => `<tr><td>${esc(x.name)}</td><td class="r"><b>${x.qty.toFixed(1)}</b> <span class="tiny muted">${/\(L\)/.test(x.name) ? 'L' : 'kg'}</span></td>${money ? `<td class="r">${edit ? `<input class="inline-in num" type="number" min="0" style="width:84px;text-align:right" value="${x.rate}" onchange="A.setMandi('${esc(x.name)}',this.value)">` : inr(x.rate)}</td><td class="r">${inr(x.cost)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="4">${empty('Select dishes', 'Ingredients add up here.')}</td></tr>`}</tbody>${money && r.rows.length ? `<tfoot><tr><td><b>Total raw material</b></td><td></td><td></td><td class="r"><b>${inr(r.raw)}</b></td></tr></tfoot>` : ''}</table></div></div>`;
}
const refreshCat = () => { const el = $('#catResult'); if (el) el.innerHTML = catResult(); };
A.catSet = (k, v) => { S.cat[k] = k === 'eventId' ? v : Math.max(0, +v || 0); if (k === 'eventId' && v) { const e = evById(v); S.cat.pax = e.menu?.pax || e.pax || S.cat.pax; if (e.menu?.dishIds?.length) S.cat.selected = [...e.menu.dishIds]; render(); return; } refreshCat(); };
A.catToggle = id => { const s = S.cat.selected; const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.push(id); refreshCat(); };
A.setMandi = async (name, val) => { try { need('catering', 2); const rec = getById('mandi', 'rates') || { id: 'rates', rates: { ...mandi() } }; rec.rates[name] = +val || 0; await save('mandi', rec); refreshCat(); } catch (err) { toast(err.message, 'bad'); } };
A.saveMenu = async () => { try { const e = evById(S.cat.eventId); const r = cateringCalc(); e.menu = { dishIds: [...S.cat.selected], pax: S.cat.pax, perPlate: r.sell }; await save('events', e, `Saved ${r.dishes.length}-dish menu for ${e.title}`); toast('Menu saved to ' + e.title); } catch (err) { toast(err.message, 'bad'); } };
A.cateringToInvoice = async () => {
  try { const r = cateringCalc(); const line = { id: uid('l'), desc: `Catering buffet: ${r.dishes.length} dishes (${r.dishes.slice(0, 4).map(d => d.name).join(', ')}${r.dishes.length > 4 ? '…' : ''})`, qty: S.cat.pax, rate: r.sell, days: 1, hsn: '996334' };
    const e = S.cat.eventId ? evById(S.cat.eventId) : null;
    let inv = e ? (eventInvoices(e.id).find(i => i.type === 'quotation' && !i.converted) || eventInvoices(e.id).find(i => i.type === 'invoice')) : null;
    if (inv) { inv.lines.push(line); await save('invoices', inv, `Added catering to ${inv.no}`); } else inv = await createInvoiceFor(e, 'quotation', [line]);
    A.go('invoice', { id: inv.id }); toast('Catering added to ' + inv.no);
  } catch (err) { toast(err.message, 'bad'); }
};
A.rationCSV = () => { const r = cateringCalc(); downloadFile(`samagri_${S.cat.pax}_pax.csv`, 'Ingredient,Quantity,Unit,Rate,Cost\n' + r.rows.map(x => `"${x.name}",${x.qty.toFixed(2)},${/\(L\)/.test(x.name) ? 'L' : 'kg'},${x.rate},${Math.round(x.cost)}`).join('\n'), 'text/csv'); };
A.dishForm = id => {
  const d = id ? getById('dishes', id) : { category: DISH_CATS[2], ration: {} };
  const ingr = Object.entries(d.ration || {}).map(([k, v]) => `${k} = ${v}`).join('\n');
  formModal({ title: id ? 'Edit dish' : 'Add dish', sub: 'Quantity is per guest, in kg (or litres for milk).', fields: [
    { name: 'name', label: 'Dish name', value: d.name, required: true, full: true }, { name: 'category', label: 'Course', type: 'select', options: DISH_CATS, value: d.category },
    { name: 'default', label: 'Selected by default', type: 'checkbox', value: d.default },
    { name: 'ration', label: 'Ingredients, one per line: Name = kg per guest', type: 'textarea', rows: 6, value: ingr || 'Fresh Paneer = 0.06\nTomato = 0.04', full: true, hint: 'Use the same names as your mandi rates (e.g. Pure Desi Ghee, Milk (L)) so cost is calculated.' }],
    left: id && can('catering', 3) ? `<button type="button" class="btn danger" onclick="A.delDish('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const ration = {}; v.ration.split('\n').forEach(l => { const [k, q] = l.split('='); if (k && q && !isNaN(parseFloat(q))) ration[k.trim()] = parseFloat(q); });
      if (!Object.keys(ration).length) throw new Error('Add at least one ingredient line like "Basmati Rice = 0.035"');
      const rec = Object.assign(id ? d : { id: uid('d_') }, { name: v.name, category: v.category, default: v.default, ration });
      await save('dishes', rec, `${id ? 'Updated' : 'Added'} dish ${rec.name}`); if (!id) S.cat.selected.push(rec.id); render(); } });
};
A.delDish = id => { const d = getById('dishes', id); confirmBox('Delete dish?', d.name, 'Delete', async () => { await removeRec('dishes', id); S.cat.selected = S.cat.selected.filter(x => x !== id); render(); }); };
function downloadFile(name, content, type) {
  if (FRAMED) { fallbackCopy(content); return; }
  const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
