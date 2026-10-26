/* ================= Transport / fleet (bizTypes 'transport', module 'fleet') =================
   For truck, tempo, tanker, bus and taxi owners and goods transporters (and tent houses that run their own vehicles).
   Collections (module fleet):
   vehicles { id, no, type, make, capacity, own: own|attached|market, ownerName, ownerPhone, driverId, odo, docs: {insurance, fitness, permit, natPermit, puc, tax}, emi, emiDay, repair, notes }
   drivers  { id, name, phone, licence, licenceExp, salary, vehicleId, notes }   (a driver login links via member.staffId = driver id)
   trips    { id, no, lr, date, time, vehicleId, driverId, party, partyPhone, partyGstin, partyAddress,
              consignor {name, phone, address, gstin}, consignee {…}, from, to, goods, packages, weight, value, goodsInv, eway,
              payType paid|topay|tbb, freight, status planned|loading|on_way|reached|done|cancelled, kmStart, kmEnd,
              recv [{id, amount, date, mode, note}], dAdv [{id, amount, date, mode}], costs [{id, type, amount, date, liters, by driver|owner, place, note}],
              hire, hirePaid [{id, amount, date}], settled, pod, invoiceId, log [{at, st, place, lat, lng, by}], notes }
   fleetx   { id, vehicleId, type, amount, date, odo, note }   (service, tyre, repair, insurance, EMI… not tied to one trip) */
const isTransport = () => !!S.org && !isClinic() && bizHas('transport');
const transportOnly = () => isTransport() && !(settings().bizTypes || []).some(t => ['tent', 'caterer', 'event', 'venue'].includes(t));
const VEH_TYPES = ['Truck', 'Trailer', 'Container', 'Tanker', 'Tempo / mini truck', 'Pickup', 'Tractor', 'Bus', 'Tempo traveller', 'Car / taxi', 'Crane / JCB', 'Other'];
const VEH_OWN = [['own', 'Own vehicle'], ['attached', 'Attached (owner’s vehicle on contract)'], ['market', 'Market vehicle (hired per trip)']];
const VEH_DOCS = [['insurance', 'Insurance'], ['fitness', 'Fitness'], ['permit', 'Permit'], ['natPermit', 'National permit'], ['puc', 'PUC (pollution)'], ['tax', 'Road tax']];
const TRIP_ST = { planned: ['Planned', '', 'calendar'], loading: ['Loading', 'info', 'box'], on_way: ['On the way', 'accent', 'truck'], reached: ['Reached', 'primary', 'pin'], done: ['Delivered', 'good', 'check'], cancelled: ['Cancelled', 'bad', 'x'] };
const TRIP_LIVE = ['loading', 'on_way', 'reached'];
const TRIP_COSTS = [['diesel', 'Diesel', 'fuel', '#EA580C'], ['toll', 'Toll / FASTag', 'receipt', '#2563EB'], ['loading', 'Loading / unloading', 'box', '#7C3AED'], ['bhatta', 'Driver bhatta / food', 'pot', '#16A34A'], ['police', 'RTO / police / entry', 'shield', '#64748B'], ['repair', 'Repair on the way', 'wrench', '#E0344B'], ['parking', 'Parking', 'pin', '#0891B2'], ['commission', 'Commission / broker', 'handshake', '#D97706'], ['other', 'Other', 'dots', '#94A3B8']];
const VEH_EXP = [['service', 'Service / oil change', 'wrench'], ['tyre', 'Tyres', 'sparkle'], ['repair', 'Repair', 'wrench'], ['insurance', 'Insurance', 'shield'], ['tax', 'Tax / permit / fitness', 'file'], ['emi', 'EMI / loan', 'rupee'], ['salary', 'Driver salary', 'user'], ['diesel', 'Diesel (not on a trip)', 'fuel'], ['other', 'Other', 'dots']];
const PAY_TYPES = [['paid', 'Paid (freight paid at booking)'], ['topay', 'To pay (consignee pays at delivery)'], ['tbb', 'To be billed (party pays on bill)']];
const vehById = id => getById('vehicles', id); const drvById = id => getById('drivers', id); const tripById = id => getById('trips', id);
const plate = no => `<span class="plate" translate="no">${esc(String(no || '—').toUpperCase())}</span>`;
const sumA = a => sum(a || [], x => +x.amount || 0);
function tripMoney(t) {
  const freight = +t.freight || 0, recv = sumA(t.recv), bal = Math.max(0, freight - recv);
  const costs = sumA(t.costs), hire = +t.hire || 0, hirePaid = sumA(t.hirePaid); const cost = costs + hire;
  const km = t.kmEnd && t.kmStart ? Math.max(0, +t.kmEnd - +t.kmStart) : 0; const liters = sum((t.costs || []).filter(c => c.type === 'diesel'), c => +c.liters || 0);
  const given = sumA(t.dAdv), spent = sum((t.costs || []).filter(c => c.by === 'driver'), c => +c.amount || 0);
  return { freight, recv, bal, costs, hire, hirePaid, hireBal: Math.max(0, hire - hirePaid), cost, profit: freight - cost, km, liters, mileage: km && liters ? Math.round(km / liters * 10) / 10 : 0, given, spent, drv: given - spent };
}
const liveTripOf = vid => col('trips').filter(t => t.vehicleId === vid && TRIP_LIVE.includes(t.status)).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
const lastLog = t => (t?.log || []).slice(-1)[0];
function vehState(v) {
  if (v.repair) return ['repair', 'In repair', 'bad'];
  const t = liveTripOf(v.id); if (t) return ['trip', TRIP_ST[t.status][0], TRIP_ST[t.status][1], t];
  const next = col('trips').filter(x => x.vehicleId === v.id && x.status === 'planned').sort(by('date'))[0]; if (next) return ['planned', 'Booked', '', next];
  return ['free', 'Free', 'good'];
}
const docDays = d => d ? daysBetween(todayLocal(), d) : null;
function docAlerts() {
  const out = [];
  col('vehicles').forEach(v => VEH_DOCS.forEach(([k, l]) => { const n = docDays(v.docs?.[k]); if (n != null && n <= 30) out.push({ v, k, l, n, date: v.docs[k] }); }));
  col('drivers').forEach(d => { const n = docDays(d.licenceExp); if (n != null && n <= 30) out.push({ d, l: 'Driving licence', n, date: d.licenceExp }); });
  return out.sort((a, b) => a.n - b.n);
}
const docPill = (n, date) => n == null ? '' : pill(n < 0 ? `Expired ${-n}d ago` : n === 0 ? 'Expires today' : `${n} days left`, n < 0 ? 'bad' : n <= 15 ? 'warn' : '');
function partyList() {
  const m = new Map();
  col('trips').filter(t => t.status !== 'cancelled' && (t.party || '').trim()).forEach(t => {
    const k = String(t.partyPhone || '').replace(/\D/g, '').slice(-10) || t.party.trim().toLowerCase(); const p = m.get(k) || { key: k, name: t.party, phone: t.partyPhone || '', gstin: t.partyGstin || '', address: t.partyAddress || '', trips: [] };
    p.trips.push(t); if (!p.gstin && t.partyGstin) p.gstin = t.partyGstin; if (!p.address && t.partyAddress) p.address = t.partyAddress; m.set(k, p);
  });
  return [...m.values()].map(p => { p.trips.sort(by('date')); p.freight = sum(p.trips, t => +t.freight || 0); p.recv = sum(p.trips, t => sumA(t.recv)); p.bal = Math.max(0, p.freight - p.recv); p.oldest = p.trips.find(t => tripMoney(t).bal > 0); p.last = p.trips[p.trips.length - 1]; return p; }).sort((a, b) => b.bal - a.bal || String(b.last?.date).localeCompare(String(a.last?.date)));
}
const partyOf = key => partyList().find(p => p.key === key);
function nextTripNo() { const n = col('trips').reduce((mx, t) => Math.max(mx, +String(t.no || '').replace(/\D/g, '') || 0), 0) + 1; return 'T-' + String(n).padStart(3, '0'); }
function nextLr() { const st = settings(); const n = col('trips').reduce((mx, t) => Math.max(mx, +String(t.lr || '').replace(/\D/g, '').slice(-5) || 0), 0) + 1; return `${st.lrPrefix || 'LR'}-${String(n).padStart(3, '0')}`; }

/* ---------- main page ---------- */
const FLEET_TABS = [['today', 'Today'], ['trips', 'Trips'], ['vehicles', 'Vehicles'], ['parties', 'Parties (khata)'], ['drivers', 'Drivers'], ['report', 'Report']];
V.fleet = () => {
  const tab = S.params.tab || 'today'; const edit = can('fleet', 2);
  const due = sum(partyList(), p => p.bal); const docs = docAlerts().length;
  const head = pageHead('Transport', 'Every vehicle, trip, bilty, bill, advance and balance in one place.', (can('settings', 2) ? `<button class="icon-btn" aria-label="Transport settings" onclick="A.fleetSettings()">${ic('gear')}</button>` : '') + (edit ? `<button class="btn primary" onclick="A.tripForm()">${ic('plus')} ${T('New trip')}</button>` : ''));
  const tabs = `<div class="tabs">${FLEET_TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${T(l)}${k === 'vehicles' && docs ? ` <span class="tabn">${docs}</span>` : ''}</button>`).join('')}${tabHelp('fl-' + tab)}</div>`;
  if (!col('vehicles').length && tab !== 'drivers') return head + `<div class="card">${empty('Add your first vehicle', 'Add each truck, tempo or bus with its number and paper dates (insurance, fitness, permit, PUC). Then make trips; the app keeps the full hisaab.', edit ? `<button class="btn primary" onclick="A.vehForm()">${ic('plus')} ${T('Add vehicle')}</button>` : '', 'truck', MOD.fleet.c)}</div>`;
  return head + tabs + ({ trips: fleetTrips, vehicles: fleetVehicles, parties: fleetParties, drivers: fleetDrivers, report: fleetReport }[tab] || fleetToday)({ due, docs });
};
function fleetToday({ due }) {
  const vs = col('vehicles').slice().sort(by('no')); const st = vs.map(v => [v, vehState(v)]); const t = todayLocal();
  const onRoad = st.filter(x => x[1][0] === 'trip').length, free = st.filter(x => x[1][0] === 'free').length, rep = st.filter(x => x[1][0] === 'repair').length;
  const docs = docAlerts(); const edit = can('fleet', 2);
  const drvDue = col('trips').filter(x => !x.settled && x.status === 'done' && tripMoney(x).given > 0);
  return `<div class="today-strip"><div><b>${onRoad}</b><span>${T('On the road')}</span></div><div><b>${free}</b><span>${T('Free')}</span></div>${rep ? `<div><b>${rep}</b><span>${T('In repair')}</span></div>` : ''}<div><b>${inr(due)}</b><span>${T('To collect')}</span></div></div>
  ${edit ? `<div class="big-grid">${bigBtn(T('New trip'), 'truck', MOD.fleet.c, 'A.tripForm()', T('Vehicle, party, from → to'))}${bigBtn(T('Diesel / expense'), 'fuel', '#EA580C', 'A.pickTripCost()')}${bigBtn(T('Payment received'), 'rupee', '#0B9B68', "A.setP('tab','parties')")}${bigBtn(T('Add vehicle'), 'plus', '#2563EB', 'A.vehForm()')}</div>` : ''}
  ${docs.length ? `<div class="sec-h"><h2>${T('Papers expiring')}${info('fl-docs')}</h2></div><div class="card"><div class="rows">${docs.slice(0, 8).map(x => `<button class="row click" onclick="${x.v ? `A.go('vehicle',{id:'${x.v.id}'})` : `A.drvForm('${x.d.id}')`}">${ibox(x.v ? 'file' : 'user', x.n < 0 ? '#E0344B' : '#D97706', 'sm')}<div class="main-col"><b>${x.v ? plate(x.v.no) : esc(x.d.name)} · ${T(x.l)}</b><div class="sub">${dShortF(x.date)}</div></div>${docPill(x.n)}</button>`).join('')}</div></div>` : ''}
  <div class="sec-h"><h2>${T('Where is each vehicle')}${info('fl-board')}</h2></div>
  <div class="veh-board">${st.map(([v, s]) => vehCard(v, s)).join('')}</div>
  ${drvDue.length ? `<div class="sec-h"><h2>${T('Driver hisaab to settle')}</h2></div><div class="card"><div class="rows">${drvDue.map(x => { const m = tripMoney(x); const d = drvById(x.driverId); return `<button class="row click" onclick="A.go('trip',{id:'${x.id}'})"><div class="main-col"><b>${esc(d?.name || T('Driver'))} · ${esc(x.no)}</b><div class="sub">${T('Given')} ${inr(m.given)} · ${T('Spent')} ${inr(m.spent)}</div></div>${pill(m.drv >= 0 ? `${T('Driver returns')} ${inr(m.drv)}` : `${T('Pay driver')} ${inr(-m.drv)}`, m.drv >= 0 ? 'warn' : 'bad')}</button>`; }).join('')}</div></div>` : ''}
  ${col('trips').filter(x => x.date === t).length ? '' : ''}`;
}
const dShortF = d => d ? T(fmtShort(d)) : '—';
function vehCard(v, s) {
  const tr = s[3]; const d = drvById(tr?.driverId || v.driverId); const lg = lastLog(tr); const ph = d?.phone ? String(d.phone).replace(/\D/g, '').slice(-10) : '';
  const lastDone = !tr ? col('trips').filter(x => x.vehicleId === v.id && x.status === 'done').sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] : null;
  return `<div class="card veh-card ${s[0]}"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><button class="linkish" onclick="A.go('vehicle',{id:'${v.id}'})">${plate(v.no)}<span class="tiny muted"> ${esc(T(v.type || ''))}</span></button>${pill(T(s[1]), s[2])}</div>
    ${tr ? `<button class="veh-route linkish" onclick="A.go('trip',{id:'${tr.id}'})"><b>${esc(tr.from || '?')} → ${esc(tr.to || '?')}</b><span class="tiny muted">${esc(tr.party || '')} · ${dShortF(tr.date)}${tr.time ? ' ' + esc(tr.time) : ''}</span>${lg ? `<span class="tiny">${ic('pin')} ${esc(lg.place || T(TRIP_ST[lg.st]?.[0] || ''))} · ${esc(timeAgo(lg.at))}${lg.lat ? ` · <a href="https://maps.google.com/?q=${lg.lat},${lg.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${T('Map')}</a>` : ''}</span>` : ''}</button>`
      : `<div class="tiny muted">${s[0] === 'repair' ? esc(v.repairNote || T('In the workshop')) : lastDone ? `${T('Last trip')}: ${esc(lastDone.from)} → ${esc(lastDone.to)} · ${dShortF(lastDone.date)}` : T('No trip yet')}</div>`}
    <div class="row-flex" style="gap:6px;margin-top:6px">${d ? `<span class="small">${ic('user')} ${esc(d.name)}</span>` : ''}${ph ? `<a class="icon-btn sm-ic" href="tel:${ph}" aria-label="Call driver">${ic('phone')}</a>` : ''}<span class="grow"></span>
      ${can('fleet', 2) ? (tr ? `<button class="btn sm" onclick="A.tripStatus('${tr.id}')">${ic('pin')} ${T('Update')}</button>` : s[0] === 'repair' ? `<button class="btn sm" onclick="A.vehRepair('${v.id}',false)">${T('Back on road')}</button>` : `<button class="btn sm primary" onclick="A.tripForm({vehicleId:'${v.id}'})">${ic('plus')} ${T('Trip')}</button>`) : ''}</div></div>`;
}
const timeAgo = at => { if (!at) return ''; const m = Math.round((Date.now() - new Date(at).getTime()) / 60000); if (m < 1) return T('just now'); if (m < 60) return `${m} ${T('min ago')}`; const h = Math.round(m / 60); if (h < 24) return `${h} ${T('hr ago')}`; return dShortF(String(at).slice(0, 10)); };

/* ---------- trips list ---------- */
function fleetTrips() {
  const f = S.filters.trF || 'active'; const q = (S.filters.trQ || '').toLowerCase(); let list = col('trips').slice();
  if (f === 'active') list = list.filter(t => ['planned', ...TRIP_LIVE].includes(t.status)); if (f === 'due') list = list.filter(t => t.status !== 'cancelled' && tripMoney(t).bal > 0); if (f === 'done') list = list.filter(t => t.status === 'done');
  if (q) list = list.filter(t => [t.no, t.lr, t.party, t.from, t.to, vehById(t.vehicleId)?.no, drvById(t.driverId)?.name].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.no).localeCompare(String(a.no)));
  return `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="${T('Search party, place, vehicle, LR')}" value="${esc(S.filters.trQ || '')}" onchange="A.setF('trQ',this.value)"></div>${seg('trF', [['active', 'Running'], ['due', 'Balance due'], ['done', 'Delivered'], ['all', 'All']], f, 'A.setF')}</div>
  <div class="card">${list.length ? `<div class="rows">${list.map(tripRow).join('')}</div>` : empty('No trip here', 'Make a trip with vehicle, party, from and to.', can('fleet', 2) ? `<button class="btn primary" onclick="A.tripForm()">${ic('plus')} ${T('New trip')}</button>` : '', 'truck', MOD.fleet.c)}</div>`;
}
function tripRow(t) {
  const m = tripMoney(t); const v = vehById(t.vehicleId); const [l, tone] = TRIP_ST[t.status] || TRIP_ST.planned;
  return `<button class="row click trip-row" onclick="A.go('trip',{id:'${t.id}'})"><div class="trip-d"><b>${esc(t.no || '')}</b><span>${dShortF(t.date)}</span></div><div class="main-col"><b>${esc(t.from || '?')} → ${esc(t.to || '?')}</b><div class="sub">${v ? plate(v.no) + ' · ' : ''}${esc(t.party || '')}${t.lr ? ' · ' + esc(t.lr) : ''}</div></div><div class="trip-m">${pill(T(l), tone)}<b class="num">${inr(m.freight)}</b>${m.bal && t.status !== 'cancelled' ? `<span class="tiny bad-t">${T('Due')} ${inr(m.bal)}</span>` : ''}</div></button>`;
}

/* ---------- one trip ---------- */
V.trip = () => {
  const t = tripById(S.params.id); if (!t) return pageHead('Trip', '', '', "A.go('fleet',{tab:'trips'})") + empty('Trip not found', '');
  const m = tripMoney(t); const v = vehById(t.vehicleId); const d = drvById(t.driverId); const edit = can('fleet', 2); const [l, tone] = TRIP_ST[t.status] || TRIP_ST.planned;
  const dph = d?.phone ? String(d.phone).replace(/\D/g, '').slice(-10) : ''; const pph = String(t.partyPhone || '').replace(/\D/g, '').slice(-10);
  const flow = ['planned', 'loading', 'on_way', 'reached', 'done']; const at = flow.indexOf(t.status);
  return `<button class="back" onclick="A.go('fleet',{tab:'trips'})">${ic('back')} ${T('Trips')}</button>
  <div class="card pad trip-head"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0"><div class="tiny muted">${esc(t.no || '')}${t.lr ? ' · ' + T('LR') + ' ' + esc(t.lr) : ''} · ${dShortF(t.date)}${t.time ? ' ' + esc(t.time) : ''}</div><h1 class="trip-route">${esc(t.from || '?')} → ${esc(t.to || '?')}${info('trip')}</h1><div class="row-flex" style="gap:6px;margin-top:6px">${v ? `<button class="linkish" onclick="A.go('vehicle',{id:'${v.id}'})">${plate(v.no)}</button>` : ''}${pill(T(l), tone)}${t.pod ? pill(T('POD received'), 'good') : ''}${t.invoiceId ? pill(T('Billed'), 'primary') : ''}</div></div>${edit ? `<button class="icon-btn" aria-label="Edit trip" onclick="A.tripForm({id:'${t.id}'})">${ic('edit')}</button>` : ''}</div>
    ${t.status !== 'cancelled' ? `<div class="trip-steps">${flow.map((s, i) => `<button class="${i <= at ? 'on' : ''} ${i === at ? 'cur' : ''}" ${edit ? `onclick="A.tripStatus('${t.id}','${s}')"` : 'disabled'}><i>${ic(TRIP_ST[s][2])}</i><span>${T(TRIP_ST[s][0])}</span></button>`).join('')}</div>` : ''}
    <div class="row-flex" style="gap:6px;margin-top:10px">${edit && TRIP_LIVE.includes(t.status) ? `<button class="btn sm primary" onclick="A.tripStatus('${t.id}')">${ic('pin')} ${T('Location update')}</button>` : ''}<button class="btn sm" onclick="A.printBilty('${t.id}')">${ic('print')} ${T('Bilty / LR')}</button>${can('invoices', 2) ? (t.invoiceId && getById('invoices', t.invoiceId) ? `<button class="btn sm" onclick="A.go('invoice',{id:'${t.invoiceId}'})">${ic('receipt')} ${T('Open bill')}</button>` : `<button class="btn sm" onclick="A.tripBill(['${t.id}'])">${ic('receipt')} ${T('Make bill')}</button>`) : ''}${dph ? `<a class="btn sm" href="tel:${dph}">${ic('phone')} ${T('Driver')}</a>` : ''}${pph ? waBtn(tripMsg(t), pph, T('Party')) : ''}</div></div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card pad stack-sm"><h3>${T('Money')}${info('trip-money')}</h3>
      <div class="money-grid"><div><span>${T('Freight')}</span><b>${inr(m.freight)}</b></div><div><span>${T('Received')}</span><b class="good-t">${inr(m.recv)}</b></div><div><span>${T('Balance')}</span><b class="${m.bal ? 'bad-t' : ''}">${inr(m.bal)}</b></div><div><span>${T('Trip cost')}</span><b>${inr(m.cost)}</b></div><div><span>${T('Profit')}</span><b class="${m.profit >= 0 ? 'good-t' : 'bad-t'}">${inr(m.profit)}</b></div>${m.km ? `<div><span>${T('Km')}</span><b>${num(m.km)}${m.mileage ? ` · ${m.mileage} ${T('km/l')}` : ''}</b></div>` : ''}</div>
      <div class="tiny muted">${T(({ paid: 'Paid', topay: 'To pay', tbb: 'To be billed' })[t.payType] || 'To be billed')} · ${esc(t.party || '')}</div>
      ${(t.recv || []).length ? `<div class="rows tight">${t.recv.map(r => `<div class="row"><div class="main-col"><b>${inr(r.amount)}</b><div class="sub">${dShortF(r.date)} · ${esc(T(r.mode || ''))}${r.note ? ' · ' + esc(r.note) : ''}</div></div>${edit ? `<button class="icon-btn" aria-label="Delete" onclick="A.tripDelLine('${t.id}','recv','${r.id}')">${ic('x')}</button>` : ''}</div>`).join('')}</div>` : ''}
      ${edit ? `<div class="row-flex" style="gap:6px"><button class="btn sm primary" onclick="A.tripPay('${t.id}')">${ic('rupee')} ${T('Payment received')}</button>${m.bal && pph ? waBtn(payMsg(t), pph, T('Ask for payment')) : ''}</div>` : ''}</div>
    <div class="card pad stack-sm"><h3>${T('Trip expenses')}${info('trip-costs')}</h3>
      ${(t.costs || []).length ? `<div class="rows tight">${t.costs.map(c => { const ct = TRIP_COSTS.find(x => x[0] === c.type) || TRIP_COSTS[8]; return `<div class="row">${ibox(ct[2], ct[3], 'sm')}<div class="main-col"><b>${T(ct[1])}${c.liters ? ` · ${c.liters} L` : ''}</b><div class="sub">${dShortF(c.date)}${c.place ? ' · ' + esc(c.place) : ''} · ${T(c.by === 'driver' ? 'paid by driver' : 'paid by office')}${c.note ? ' · ' + esc(c.note) : ''}</div></div><b class="num">${inr(c.amount)}</b>${edit ? `<button class="icon-btn" aria-label="Delete" onclick="A.tripDelLine('${t.id}','costs','${c.id}')">${ic('x')}</button>` : ''}</div>`; }).join('')}</div>` : `<p class="small muted">${T('Diesel, toll, loading, bhatta… add as they happen.')}</p>`}
      ${edit ? `<button class="btn sm" onclick="A.costForm('${t.id}')">${ic('plus')} ${T('Add expense')}</button>` : ''}</div>
    ${d || m.given ? `<div class="card pad stack-sm"><h3>${T('Driver hisaab')}${info('trip-driver')}</h3><div class="money-grid"><div><span>${T('Advance given')}</span><b>${inr(m.given)}</b></div><div><span>${T('Spent by driver')}</span><b>${inr(m.spent)}</b></div><div><span>${m.drv >= 0 ? T('Driver returns') : T('Pay driver')}</span><b class="${m.drv ? 'bad-t' : ''}">${inr(Math.abs(m.drv))}</b></div></div>
      ${(t.dAdv || []).length ? `<div class="rows tight">${t.dAdv.map(r => `<div class="row"><div class="main-col"><b>${inr(r.amount)}</b><div class="sub">${dShortF(r.date)} · ${esc(T(r.mode || ''))}</div></div>${edit ? `<button class="icon-btn" aria-label="Delete" onclick="A.tripDelLine('${t.id}','dAdv','${r.id}')">${ic('x')}</button>` : ''}</div>`).join('')}</div>` : ''}
      ${edit ? `<div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.drvAdvance('${t.id}')">${ic('rupee')} ${T('Give advance')}</button>${!t.settled && (m.given || m.spent) ? `<button class="btn sm primary" onclick="A.tripSettle('${t.id}')">${ic('check')} ${T('Hisaab done')}</button>` : t.settled ? pill(T('Settled'), 'good') : ''}</div>` : ''}</div>` : ''}
    ${v?.own === 'market' || m.hire ? `<div class="card pad stack-sm"><h3>${T('Vehicle hire (market vehicle)')}</h3><div class="money-grid"><div><span>${T('Hire to pay')}</span><b>${inr(m.hire)}</b></div><div><span>${T('Paid')}</span><b>${inr(m.hirePaid)}</b></div><div><span>${T('Balance')}</span><b class="${m.hireBal ? 'bad-t' : ''}">${inr(m.hireBal)}</b></div></div>${edit ? `<button class="btn sm" onclick="A.hirePay('${t.id}')">${ic('rupee')} ${T('Pay vehicle owner')}</button>` : ''}</div>` : ''}
    <div class="card pad stack-sm"><h3>${T('Load & papers')}</h3><div class="kv">${[['Party', t.party], ['Party phone', t.partyPhone], ['Consignor', t.consignor?.name], ['Consignee', t.consignee?.name], ['Goods', t.goods], ['Packages', t.packages], ['Weight', t.weight ? t.weight + ' ' + T('tons') : ''], ['Value of goods', t.value ? inr(t.value) : ''], ['Goods invoice no.', t.goodsInv], ['E-way bill', t.eway], ['Driver', d?.name], ['Km start → end', t.kmStart ? `${t.kmStart} → ${t.kmEnd || '…'}` : '']].filter(x => x[1]).map(([k, val]) => `<div><span>${T(k)}</span><b>${esc(val)}</b></div>`).join('')}</div>
      ${edit ? `<label class="check"><input type="checkbox" ${t.pod ? 'checked' : ''} onchange="A.tripPod('${t.id}',this.checked)"> <span>${T('POD (signed bilty) received back')}</span></label>` : ''}${t.notes ? `<div class="small muted">${esc(t.notes)}</div>` : ''}</div>
    <div class="card pad stack-sm"><h3>${T('Timeline')}</h3><div class="timeline">${(t.log || []).slice().reverse().map(x => `<div><i style="--c:var(--${(TRIP_ST[x.st] || TRIP_ST.planned)[1] || 'muted'})"></i><b>${T((TRIP_ST[x.st] || [''])[0])}${x.place ? ' · ' + esc(x.place) : ''}</b><span class="tiny muted">${esc(String(x.at || '').replace('T', ' ').slice(0, 16))}${x.by ? ' · ' + esc(x.by) : ''}${x.lat ? ` · <a href="https://maps.google.com/?q=${x.lat},${x.lng}" target="_blank" rel="noopener">${T('Map')}</a>` : ''}</span></div>`).join('') || `<span class="small muted">${T('Nothing yet')}</span>`}</div></div>
  </div>`;
};
const tripMsg = t => { const st = settings(); const v = vehById(t.vehicleId); const d = drvById(t.driverId); const [l] = TRIP_ST[t.status] || TRIP_ST.planned; const lg = lastLog(t);
  return `${I18N.lang === 'hi' ? 'नमस्ते' : 'Namaste'} ${t.party || ''} ji 🙏\n${st.bizName}: ${T('Trip')} ${t.from} → ${t.to}${t.lr ? ` (${T('LR')} ${t.lr})` : ''}\n${T('Vehicle')}: ${v?.no || ''}${d ? `\n${T('Driver')}: ${d.name} ${d.phone || ''}` : ''}\n${T('Status')}: ${T(l)}${lg?.place ? ' · ' + lg.place : ''}${lg?.lat ? `\nhttps://maps.google.com/?q=${lg.lat},${lg.lng}` : ''}`; };
const payMsg = t => { const st = settings(); const m = tripMoney(t); return I18N.lang === 'hi' ? `नमस्ते ${t.party || ''} जी 🙏\n${st.bizName} से। ${t.from} → ${t.to} (${dShortF(t.date)}${t.lr ? ', बिल्टी ' + t.lr : ''}) का भाड़ा ${inr(m.freight)}, मिला ${inr(m.recv)}, बाकी ${inr(m.bal)}। कृपया भुगतान कर दें।${st.upi ? '\nUPI: ' + st.upi : ''}\n${st.phone || ''}` : `Namaste ${t.party || ''} ji 🙏\nFrom ${st.bizName}. Freight for ${t.from} → ${t.to} (${dShortF(t.date)}${t.lr ? ', LR ' + t.lr : ''}): ${inr(m.freight)}, received ${inr(m.recv)}, balance ${inr(m.bal)}. Kindly pay.${st.upi ? '\nUPI: ' + st.upi : ''}\n${st.phone || ''}`; };

/* ---------- trip form ---------- */
A.tripForm = (preset = {}) => {
  if (!col('vehicles').length) { toast('Add a vehicle first', 'warn'); A.vehForm(); return; }
  const t = preset.id ? tripById(preset.id) : { date: todayLocal(), time: '', status: 'planned', payType: 'tbb', no: nextTripNo(), lr: nextLr(), ...preset };
  const parties = partyList(); const v0 = vehById(t.vehicleId);
  modal(`<form class="form" onsubmit="A.saveTrip(event,'${t.id || ''}')" novalidate>${sheetHead(T(t.id ? 'Edit trip' : 'New trip'), `${t.no || ''}`)}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, value: t.vehicleId || '', options: [['', '— ' + T('Choose') + ' —'], ...col('vehicles').slice().sort(by('no')).map(v => [v.id, `${String(v.no).toUpperCase()} · ${T(v.type || '')}${vehState(v)[0] === 'trip' && v.id !== t.vehicleId ? ' (' + T('on a trip') + ')' : ''}`])] }).replace('<select', `<select onchange="const d=this.form.driverId;const m=${esc(JSON.stringify(Object.fromEntries(col('vehicles').map(v => [v.id, v.driverId || '']))))};if(d&&!d.value)d.value=m[this.value]||''"`)}
    ${fieldHTML({ name: 'driverId', label: 'Driver', type: 'select', value: t.driverId || v0?.driverId || '', options: [['', '—'], ...col('drivers').slice().sort(by('name')).map(d => [d.id, d.name])] })}
    ${fieldHTML({ name: 'from', label: 'From place', required: true, value: t.from || '', placeholder: 'e.g. Jaipur' })}${fieldHTML({ name: 'to', label: 'To place', required: true, value: t.to || '', placeholder: 'e.g. Delhi' })}
    ${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: t.date })}${fieldHTML({ name: 'time', label: 'Time', type: 'time', value: t.time || '' })}</div>
    <div class="grid2" style="padding:0"><label class="field"><span>${T('Party (who pays)')} *</span><input name="party" list="partyList" required value="${esc(t.party || '')}" autocomplete="off" oninput="A.partyPick(this)"><datalist id="partyList">${parties.map(p => `<option value="${esc(p.name)}">${esc(p.phone)}</option>`).join('')}</datalist></label>${fieldHTML({ name: 'partyPhone', label: 'Party mobile', type: 'tel', value: t.partyPhone || '' })}
    ${fieldHTML({ name: 'freight', label: 'Freight (bhaada) ₹', type: 'number', min: 0, value: t.freight ?? '' })}${fieldHTML({ name: 'payType', label: 'Freight', type: 'select', value: t.payType || 'tbb', options: PAY_TYPES.map(([k, l]) => [k, T(l)]) })}
    ${t.id ? '' : `${fieldHTML({ name: 'adv', label: 'Advance received now ₹', type: 'number', min: 0 })}${fieldHTML({ name: 'dadv', label: 'Advance to driver now ₹', type: 'number', min: 0 })}`}</div>
    <details class="more-box" ${t.goods || t.consignor?.name ? 'open' : ''}><summary>${T('Goods, consignor, consignee (for the bilty)')}</summary><div class="grid2" style="padding:8px 0 0">
      ${fieldHTML({ name: 'lr', label: 'Bilty / LR no.', value: t.lr || '' })}${fieldHTML({ name: 'goods', label: 'Goods', value: t.goods || '', placeholder: 'e.g. Cement bags, furniture' })}
      ${fieldHTML({ name: 'packages', label: 'Packages / bags', value: t.packages || '' })}${fieldHTML({ name: 'weight', label: 'Weight (tons)', type: 'number', step: '0.01', min: 0, value: t.weight ?? '' })}
      ${fieldHTML({ name: 'value', label: 'Value of goods ₹', type: 'number', min: 0, value: t.value ?? '' })}${fieldHTML({ name: 'goodsInv', label: 'Goods invoice no.', value: t.goodsInv || '' })}
      ${fieldHTML({ name: 'eway', label: 'E-way bill no.', value: t.eway || '' })}${fieldHTML({ name: 'partyGstin', label: 'Party GSTIN', value: t.partyGstin || '' })}
      ${fieldHTML({ name: 'partyAddress', label: 'Party address', value: t.partyAddress || '', full: true })}
      ${fieldHTML({ name: 'cnor_name', label: 'Consignor (sender)', value: t.consignor?.name || '' })}${fieldHTML({ name: 'cnor_gstin', label: 'Consignor GSTIN', value: t.consignor?.gstin || '' })}
      ${fieldHTML({ name: 'cnor_address', label: 'Consignor address', value: t.consignor?.address || '', full: true })}
      ${fieldHTML({ name: 'cnee_name', label: 'Consignee (receiver)', value: t.consignee?.name || '' })}${fieldHTML({ name: 'cnee_gstin', label: 'Consignee GSTIN', value: t.consignee?.gstin || '' })}
      ${fieldHTML({ name: 'cnee_address', label: 'Consignee address', value: t.consignee?.address || '', full: true })}${fieldHTML({ name: 'cnee_phone', label: 'Consignee phone', type: 'tel', value: t.consignee?.phone || '' })}</div></details>
    <details class="more-box" ${t.kmStart || t.hire ? 'open' : ''}><summary>${T('Km and hire')}</summary><div class="grid2" style="padding:8px 0 0">
      ${fieldHTML({ name: 'kmStart', label: 'Km reading at start', type: 'number', min: 0, value: t.kmStart ?? (v0?.odo || '') })}${fieldHTML({ name: 'kmEnd', label: 'Km reading at end', type: 'number', min: 0, value: t.kmEnd ?? '' })}
      ${fieldHTML({ name: 'hire', label: 'Hire to pay vehicle owner ₹ (market vehicle)', type: 'number', min: 0, value: t.hire ?? '' })}</div></details>
    ${fieldHTML({ name: 'notes', label: 'Notes', type: 'textarea', rows: 2, value: t.notes || '' })}
  </div><footer class="sheet-f">${t.id && can('fleet', 3) ? `<button type="button" class="btn ghost danger" onclick="A.delTrip('${t.id}')">${ic('trash')}</button>` : ''}${t.id && t.status !== 'cancelled' ? `<button type="button" class="btn ghost" onclick="A.tripCancel('${t.id}')">${T('Cancel trip')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
};
A.partyPick = el => { const p = partyList().find(x => x.name.toLowerCase() === el.value.trim().toLowerCase()); if (!p) return; const f = el.form; if (!f.partyPhone.value) f.partyPhone.value = p.phone || ''; if (!f.partyGstin.value) f.partyGstin.value = p.gstin || ''; if (!f.partyAddress.value) f.partyAddress.value = p.address || ''; };
A.saveTrip = (e, id) => {
  e.preventDefault(); const v = readForm(e.target);
  withBtn(e, async () => {
    if (!v.vehicleId) throw new Error('Choose the vehicle'); if (!(v.from || '').trim() || !(v.to || '').trim()) throw new Error('Write from and to'); if (!(v.party || '').trim()) throw new Error('Write the party name');
    const base = id ? tripById(id) : { id: uid('tr_'), no: nextTripNo(), status: 'planned', recv: [], dAdv: [], costs: [], hirePaid: [], log: [{ at: nowIso(), st: 'planned', by: S.me?.name || S.user.name }], created: Date.now() };
    const party = { name: (v.cnor_name || '').trim(), gstin: (v.cnor_gstin || '').trim(), address: (v.cnor_address || '').trim() };
    const rec = { ...base, vehicleId: v.vehicleId, driverId: v.driverId || '', from: v.from.trim(), to: v.to.trim(), date: v.date || todayLocal(), time: v.time || '', party: v.party.trim(), partyPhone: (v.partyPhone || '').trim(), partyGstin: (v.partyGstin || '').trim().toUpperCase(), partyAddress: (v.partyAddress || '').trim(),
      freight: +v.freight || 0, payType: v.payType || 'tbb', lr: (v.lr || '').trim() || base.lr || nextLr(), goods: (v.goods || '').trim(), packages: (v.packages || '').trim(), weight: nOr(v.weight), value: nOr(v.value), goodsInv: (v.goodsInv || '').trim(), eway: (v.eway || '').trim(),
      consignor: party, consignee: { name: (v.cnee_name || '').trim(), gstin: (v.cnee_gstin || '').trim(), address: (v.cnee_address || '').trim(), phone: (v.cnee_phone || '').trim() }, kmStart: nOr(v.kmStart), kmEnd: nOr(v.kmEnd), hire: nOr(v.hire), notes: (v.notes || '').trim() };
    if (!id && +v.adv) rec.recv = [{ id: uid('rc_'), amount: +v.adv, date: rec.date, mode: 'Cash', note: T('Advance') }];
    if (!id && +v.dadv) rec.dAdv = [{ id: uid('da_'), amount: +v.dadv, date: rec.date, mode: 'Cash' }];
    await save('trips', rec, `${id ? 'Updated' : 'New'} trip ${rec.no}: ${rec.from} → ${rec.to}`);
    if (rec.kmEnd) { const vh = vehById(rec.vehicleId); if (vh && +rec.kmEnd > +(vh.odo || 0)) await save('vehicles', { ...vh, odo: +rec.kmEnd }); }
    A.closeModal(); toast(id ? 'Saved' : 'Trip made'); if (id) render(); else A.go('trip', { id: rec.id });
  });
};
const nowIso = () => { const d = new Date(); return todayLocal(d) + 'T' + d.toTimeString().slice(0, 5); };
A.delTrip = id => confirmBox('Delete this trip?', 'Its payments and expenses are deleted with it.', 'Delete', async () => { await removeRec('trips', id, 'Deleted trip'); A.closeModal(); A.go('fleet', { tab: 'trips' }); });
A.tripCancel = id => confirmBox('Cancel this trip?', 'It stays in the list as cancelled.', 'Cancel trip', async () => { const t = tripById(id); await save('trips', { ...t, status: 'cancelled', log: [...(t.log || []), { at: nowIso(), st: 'cancelled', by: S.me?.name || S.user.name }] }, `Cancelled trip ${t.no}`); A.closeModal(); render(); });

/* ---------- status / location ---------- */
A.tripStatus = (id, st) => {
  const t = tripById(id); const cur = st || t.status;
  modal(`<form class="form" onsubmit="A.saveTripStatus(event,'${id}')" novalidate>${sheetHead(T('Update trip'), `${t.from} → ${t.to}`)}<div class="sheet-b stack">
    <div class="field"><span>${T('Status')}</span><div class="chips">${['planned', 'loading', 'on_way', 'reached', 'done'].map(k => `<label class="chip-radio"><input type="radio" name="st" value="${k}" ${cur === k ? 'checked' : ''}><span>${ic(TRIP_ST[k][2])} ${T(TRIP_ST[k][0])}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'place', label: 'Where is it now (optional)', placeholder: 'e.g. Near Behror toll, unloading at Okhla' })}
    <label class="check"><input type="checkbox" name="gps" ${navigator.geolocation ? 'checked' : 'disabled'}> <span>${T('Add my phone’s location (map link)')}</span></label>
    ${cur === 'done' ? fieldHTML({ name: 'kmEnd', label: 'Km reading at end', type: 'number', min: 0, value: t.kmEnd ?? '' }) : ''}
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`);
};
const getPos = () => new Promise(res => { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res({ lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }), () => res(null), { timeout: 8000, maximumAge: 60000 }); });
A.saveTripStatus = (e, id) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const st = f.querySelector('input[name=st]:checked')?.value || 'on_way';
  withBtn(e, async () => {
    const t = tripById(id); const pos = v.gps ? await getPos() : null;
    const rec = { ...t, status: st, log: [...(t.log || []), { at: nowIso(), st, place: (v.place || '').trim(), ...(pos || {}), by: S.me?.name || S.user.name }].slice(-60) };
    if (v.kmEnd) rec.kmEnd = +v.kmEnd;
    await save('trips', rec, `Trip ${t.no}: ${TRIP_ST[st][0]}${v.place ? ' · ' + v.place : ''}`);
    if (rec.kmEnd) { const vh = vehById(rec.vehicleId); if (vh && +rec.kmEnd > +(vh.odo || 0)) await save('vehicles', { ...vh, odo: +rec.kmEnd }); }
    A.closeModal(); toast(T(TRIP_ST[st][0])); render();
    if (st === 'done' && S.me?.staffId && t.driverId === S.me.staffId && typeof notifyManagers === 'function') notifyManagers(`${T('Delivered')}: ${t.from} → ${t.to}`, vehById(t.vehicleId)?.no || '');
  });
};
A.tripPod = async (id, on) => { const t = tripById(id); try { await save('trips', { ...t, pod: !!on }, on ? `POD received for ${t.no}` : ''); render(); } catch (e) { toast(e.message, 'bad'); } };

/* ---------- money on a trip ---------- */
const lineForm = (title, sub, extra, onSubmit) => formModal({ title, sub, fields: [{ name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true }, { name: 'date', label: 'Date', type: 'date', value: todayLocal() }, { name: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Diesel card'].map(m => [m, T(m)]) }, ...extra], onSubmit });
A.tripPay = id => { const t = tripById(id); const m = tripMoney(t); lineForm('Payment received', `${t.party} · ${T('Balance')} ${inr(m.bal)}`, [{ name: 'note', label: 'Note', full: true }], async v => { await save('trips', { ...t, recv: [...(t.recv || []), { id: uid('rc_'), amount: +v.amount, date: v.date || todayLocal(), mode: v.mode, note: (v.note || '').trim() }] }, `Received ${inr(v.amount)} from ${t.party} (${t.no})`); render(); }); };
A.drvAdvance = id => { const t = tripById(id); lineForm('Advance to driver', `${drvById(t.driverId)?.name || ''} · ${t.no}`, [], async v => { await save('trips', { ...t, dAdv: [...(t.dAdv || []), { id: uid('da_'), amount: +v.amount, date: v.date || todayLocal(), mode: v.mode }], settled: false }, `Driver advance ${inr(v.amount)} (${t.no})`); render(); }); };
A.hirePay = id => { const t = tripById(id); const vh = vehById(t.vehicleId); lineForm('Pay vehicle owner', `${vh?.ownerName || vh?.no || ''} · ${t.no}`, [], async v => { await save('trips', { ...t, hirePaid: [...(t.hirePaid || []), { id: uid('hp_'), amount: +v.amount, date: v.date || todayLocal(), mode: v.mode }] }, `Hire paid ${inr(v.amount)} (${t.no})`); render(); }); };
A.tripDelLine = (id, k, lid) => confirmBox('Delete this entry?', '', 'Delete', async () => { const t = tripById(id); await save('trips', { ...t, [k]: (t[k] || []).filter(x => x.id !== lid) }, `Deleted an entry on ${t.no}`); render(); });
A.tripSettle = id => { const t = tripById(id); const m = tripMoney(t); confirmBox(T('Hisaab done?'), m.drv >= 0 ? `${T('Driver returns')} ${inr(m.drv)}` : `${T('Pay driver')} ${inr(-m.drv)}`, 'Done', async () => { await save('trips', { ...t, settled: true, settledAt: todayLocal(), settleAmt: m.drv }, `Driver hisaab settled for ${t.no}: ${inr(m.drv)}`); render(); }, 'primary'); };
A.costForm = (id, type) => {
  const t = tripById(id); const isDrv = S.me?.staffId && t.driverId === S.me.staffId;
  formModal({ title: 'Trip expense', sub: `${t.no} · ${t.from} → ${t.to}`, fields: [
    { type: 'html', full: true, html: `<div class="chips cost-chips">${TRIP_COSTS.map(([k, l, i, c]) => `<label class="chip-radio"><input type="radio" name="type" value="${k}" ${(type || 'diesel') === k ? 'checked' : ''} onchange="this.form.querySelector('.lit').hidden=this.value!=='diesel'"><span>${ic(i)} ${T(l)}</span></label>`).join('')}</div>` },
    { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true }, { name: 'date', label: 'Date', type: 'date', value: todayLocal() },
    { type: 'html', html: `<div class="lit" ${(type || 'diesel') === 'diesel' ? '' : 'hidden'}>${fieldHTML({ name: 'liters', label: 'Litres', type: 'number', step: '0.1', min: 0 })}</div>` },
    { name: 'by', label: 'Paid by', type: 'select', options: [['driver', T('Driver (from advance)')], ['office', T('Office / owner')]], value: isDrv || (t.dAdv || []).length ? 'driver' : 'office' },
    { name: 'place', label: 'Place', placeholder: 'e.g. Shahpura pump' }, { name: 'note', label: 'Note' }],
    onSubmit: async (v, f) => { const ty = f.querySelector('input[name=type]:checked')?.value || 'diesel'; const fresh = tripById(id);
      await save('trips', { ...fresh, costs: [...(fresh.costs || []), { id: uid('tc_'), type: ty, amount: +v.amount, date: v.date || todayLocal(), liters: ty === 'diesel' ? nOr(v.liters) : '', by: v.by, place: (v.place || '').trim(), note: (v.note || '').trim() }], settled: v.by === 'driver' ? false : fresh.settled }, `${(TRIP_COSTS.find(x => x[0] === ty) || [])[1]} ${inr(v.amount)} on ${fresh.no}`); render(); } });
};
A.pickTripCost = () => {
  const live = col('trips').filter(t => ['planned', ...TRIP_LIVE].includes(t.status)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!live.length) { A.vxForm(); return; }
  modal(`${sheetHead(T('Diesel / expense'), T('Pick the trip, or add a vehicle expense'))}<div class="sheet-b stack-sm"><div class="rows">${live.map(t => `<button class="row click" onclick="A.closeModal();setTimeout(()=>A.costForm('${t.id}'),40)">${plate(vehById(t.vehicleId)?.no)}<div class="main-col"><b>${esc(t.from)} → ${esc(t.to)}</b><div class="sub">${esc(t.no)} · ${dShortF(t.date)}</div></div>${ic('chev')}</button>`).join('')}</div>
    <button class="btn block" onclick="A.closeModal();setTimeout(()=>A.vxForm(),40)">${ic('wrench')} ${T('Vehicle expense (service, tyre, EMI…)')}</button></div>`);
};

/* ---------- vehicles ---------- */
function fleetVehicles() {
  const month = todayLocal().slice(0, 7); const edit = can('fleet', 2);
  return `${edit ? `<div class="row-flex" style="gap:8px;margin-bottom:12px"><button class="btn primary" onclick="A.vehForm()">${ic('plus')} ${T('Add vehicle')}</button><button class="btn" onclick="A.vxForm()">${ic('wrench')} ${T('Vehicle expense')}</button></div>` : ''}
  <div class="grid g-auto">${col('vehicles').slice().sort(by('no')).map(v => { const s = vehState(v); const mm = vehMonth(v, month); const docs = VEH_DOCS.map(([k, l]) => [l, docDays(v.docs?.[k])]).filter(x => x[1] != null && x[1] <= 30);
    return `<button class="card pad stack-sm linkish veh-tile" onclick="A.go('vehicle',{id:'${v.id}'})"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap">${plate(v.no)}${pill(T(s[1]), s[2])}</div><div class="tiny muted">${esc(T(v.type || ''))}${v.make ? ' · ' + esc(v.make) : ''} · ${T((VEH_OWN.find(o => o[0] === (v.own || 'own')) || VEH_OWN[0])[1])}${drvById(v.driverId) ? ' · ' + esc(drvById(v.driverId).name) : ''}</div>
      <div class="tri"><div><span>${T('Trips this month')}</span><b>${mm.trips}</b></div><div><span>${T('Income')}</span><b>${inr(mm.freight)}</b></div><div class="${mm.profit < 0 ? 'sh' : 'fr'}"><span>${T('Profit')}</span><b>${inr(mm.profit)}</b></div></div>
      ${docs.length ? `<div class="row-flex" style="gap:4px">${docs.map(([l, n]) => pill(`${T(l)}: ${n < 0 ? T('expired') : n + ' ' + T('days')}`, n < 0 ? 'bad' : 'warn')).join('')}</div>` : ''}</button>`; }).join('')}</div>`;
}
function vehMonth(v, month) {
  const tr = col('trips').filter(t => t.vehicleId === v.id && t.status !== 'cancelled' && (t.date || '').startsWith(month)); const ms = tr.map(tripMoney);
  const vx = sum(col('fleetx').filter(x => x.vehicleId === v.id && (x.date || '').startsWith(month)), x => +x.amount || 0);
  const freight = sum(ms, m => m.freight), cost = sum(ms, m => m.cost) + vx, km = sum(ms, m => m.km), liters = sum(ms, m => m.liters);
  return { trips: tr.length, freight, cost, vx, profit: freight - cost, km, liters, mileage: km && liters ? Math.round(km / liters * 10) / 10 : 0 };
}
V.vehicle = () => {
  const v = vehById(S.params.id); if (!v) return pageHead('Vehicle', '', '', "A.go('fleet',{tab:'vehicles'})") + empty('Vehicle not found', '');
  const s = vehState(v); const month = S.filters.vMonth || todayLocal().slice(0, 7); const mm = vehMonth(v, month); const edit = can('fleet', 2);
  const trips = col('trips').filter(t => t.vehicleId === v.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
  const vx = col('fleetx').filter(x => x.vehicleId === v.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
  return `<button class="back" onclick="A.go('fleet',{tab:'vehicles'})">${ic('back')} ${T('Vehicles')}</button>
  <div class="card pad"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><div>${plate(v.no)}<div class="small muted" style="margin-top:6px">${esc(T(v.type || ''))}${v.make ? ' · ' + esc(v.make) : ''}${v.capacity ? ' · ' + esc(v.capacity) : ''} · ${T((VEH_OWN.find(o => o[0] === (v.own || 'own')) || VEH_OWN[0])[1])}${v.odo ? ` · ${num(v.odo)} km` : ''}</div>${v.own !== 'own' && v.ownerName ? `<div class="small">${T('Owner')}: ${esc(v.ownerName)} ${esc(v.ownerPhone || '')}</div>` : ''}</div><div class="row-flex" style="gap:6px">${pill(T(s[1]), s[2])}${edit ? `<button class="icon-btn" aria-label="Edit vehicle" onclick="A.vehForm('${v.id}')">${ic('edit')}</button>` : ''}</div></div>
    ${edit ? `<div class="row-flex" style="gap:6px;margin-top:10px">${s[0] === 'free' || s[0] === 'planned' ? `<button class="btn sm primary" onclick="A.tripForm({vehicleId:'${v.id}'})">${ic('plus')} ${T('New trip')}</button>` : ''}<button class="btn sm" onclick="A.vxForm('${v.id}')">${ic('wrench')} ${T('Vehicle expense')}</button>${s[0] === 'repair' ? `<button class="btn sm" onclick="A.vehRepair('${v.id}',false)">${T('Back on road')}</button>` : s[0] !== 'trip' ? `<button class="btn sm ghost" onclick="A.vehRepair('${v.id}',true)">${ic('wrench')} ${T('Send to repair')}</button>` : ''}</div>` : ''}</div>
  <div class="sec-h"><h2>${T('Papers')}${info('fl-docs')}</h2></div><div class="card"><div class="rows">${VEH_DOCS.map(([k, l]) => { const n = docDays(v.docs?.[k]); return `<div class="row"><div class="main-col"><b>${T(l)}</b><div class="sub">${v.docs?.[k] ? T('Valid till') + ' ' + dShortF(v.docs[k]) : T('Not added')}</div></div>${docPill(n)}</div>`; }).join('')}${v.emi ? `<div class="row"><div class="main-col"><b>${T('EMI')}</b><div class="sub">${inr(v.emi)} · ${T('every month on')} ${v.emiDay || 5}</div></div></div>` : ''}</div></div>
  <div class="sec-h"><h2>${T('Month')}</h2><input type="month" style="width:auto" value="${month}" onchange="A.setF('vMonth',this.value)"></div>
  <div class="kpis">${kpi('Trips', mm.trips, mm.km ? `${num(mm.km)} km` : '')}${kpi('Income', inr(mm.freight), '', 'good', 'rupee', '#0B9B68')}${kpi('Costs', inr(mm.cost), `${T('Vehicle')} ${inr(mm.vx)}`, '', 'wallet', '#EA580C')}${kpi('Profit', inr(mm.profit), mm.mileage ? `${mm.mileage} ${T('km/l')}` : '', mm.profit >= 0 ? 'good' : 'bad', 'chart', '#2563EB')}</div>
  <div class="sec-h"><h2>${T('Trips')}</h2></div><div class="card">${trips.length ? `<div class="rows">${trips.map(tripRow).join('')}</div>` : empty('No trip yet', '')}</div>
  <div class="sec-h"><h2>${T('Vehicle expenses')}</h2></div><div class="card">${vx.length ? `<div class="rows">${vx.map(x => { const ty = VEH_EXP.find(y => y[0] === x.type) || VEH_EXP[8]; return `<div class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.vxForm('${v.id}','${x.id}')"` : ''}>${ibox(ty[2], '#EA580C', 'sm')}<div class="main-col"><b>${T(ty[1])}</b><div class="sub">${dShortF(x.date)}${x.odo ? ' · ' + num(x.odo) + ' km' : ''}${x.note ? ' · ' + esc(x.note) : ''}</div></div><b class="num">${inr(x.amount)}</b></div>`; }).join('')}</div>` : `<p class="small muted dept-note" style="padding-top:12px">${T('Service, tyres, repair, insurance and EMI go here.')}</p>`}</div>`;
};
A.vehRepair = async (id, on) => { const v = vehById(id); if (on) { formModal({ title: 'Send to repair', sub: v.no, fields: [{ name: 'note', label: 'What is the problem / which garage', full: true }], onSubmit: async x => { await save('vehicles', { ...v, repair: true, repairNote: (x.note || '').trim(), repairAt: todayLocal() }, `${v.no} sent to repair`); render(); } }); return; } try { await save('vehicles', { ...v, repair: false, repairNote: '' }, `${v.no} back on road`); render(); } catch (e) { toast(e.message, 'bad'); } };
A.vehForm = id => {
  const v = id ? vehById(id) : { type: 'Truck', own: 'own', docs: {} };
  formModal({ title: id ? 'Edit vehicle' : 'Add vehicle', sub: id ? v.no : 'Number and paper dates. Reminders come 30 days before.', fields: [
    { name: 'no', label: 'Vehicle number', required: true, value: v.no, placeholder: 'RJ14 GB 5421' }, { name: 'type', label: 'Type', type: 'select', options: VEH_TYPES.map(x => [x, T(x)]), value: v.type },
    { name: 'make', label: 'Make / model', value: v.make, placeholder: 'e.g. Tata 1613, Ashok Leyland 1920' }, { name: 'capacity', label: 'Capacity', value: v.capacity, placeholder: 'e.g. 16 ton, 32 ft, 40 seats' },
    { name: 'own', label: 'Ownership', type: 'select', options: VEH_OWN.map(([k, l]) => [k, T(l)]), value: v.own || 'own' }, { name: 'driverId', label: 'Regular driver', type: 'select', options: [['', '—'], ...col('drivers').map(d => [d.id, d.name])], value: v.driverId || '' },
    { name: 'ownerName', label: 'Owner name (attached / market)', value: v.ownerName }, { name: 'ownerPhone', label: 'Owner mobile', type: 'tel', value: v.ownerPhone },
    ...VEH_DOCS.map(([k, l]) => ({ name: 'doc_' + k, label: `${l} valid till`, type: 'date', value: v.docs?.[k] || '' })),
    { name: 'odo', label: 'Km reading now', type: 'number', min: 0, value: v.odo }, { name: 'emi', label: 'EMI ₹ / month (optional)', type: 'number', min: 0, value: v.emi }, { name: 'emiDay', label: 'EMI date (day of month)', type: 'number', min: 1, max: 31, value: v.emiDay || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v.notes, full: true }],
    left: id && can('fleet', 3) ? `<button type="button" class="btn danger" onclick="A.delVeh('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async x => { const no = String(x.no || '').trim().toUpperCase().replace(/\s+/g, ' '); if (!no) throw new Error('Write the vehicle number'); if (col('vehicles').some(y => y.id !== id && String(y.no).replace(/\s/g, '') === no.replace(/\s/g, ''))) throw new Error('This vehicle is already added');
      const docs = Object.fromEntries(VEH_DOCS.map(([k]) => [k, x['doc_' + k] || ''])); const rec = { ...(id ? v : { id: uid('vh_') }), no, type: x.type, make: (x.make || '').trim(), capacity: (x.capacity || '').trim(), own: x.own, driverId: x.driverId || '', ownerName: (x.ownerName || '').trim(), ownerPhone: (x.ownerPhone || '').trim(), docs, odo: nOr(x.odo), emi: nOr(x.emi), emiDay: nOr(x.emiDay), notes: (x.notes || '').trim() };
      await save('vehicles', rec, `${id ? 'Updated' : 'Added'} vehicle ${no}`); render(); } });
};
A.delVeh = id => { const v = vehById(id); confirmBox(`${T('Delete')} ${v.no}?`, 'Old trips keep the record.', 'Delete', async () => { await removeRec('vehicles', id, `Deleted vehicle ${v.no}`); A.closeModal(); A.go('fleet', { tab: 'vehicles' }); }); };
A.vxForm = (vid, id) => {
  if (!col('vehicles').length) { toast('Add a vehicle first', 'warn'); return; } const x = id ? getById('fleetx', id) : { vehicleId: vid || '', type: 'service', date: todayLocal() };
  formModal({ title: id ? 'Edit vehicle expense' : 'Vehicle expense', fields: [{ name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, options: col('vehicles').map(v => [v.id, String(v.no).toUpperCase()]), value: x.vehicleId }, { name: 'type', label: 'Type', type: 'select', options: VEH_EXP.map(([k, l]) => [k, T(l)]), value: x.type },
    { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: x.amount }, { name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'odo', label: 'Km reading', type: 'number', min: 0, value: x.odo }, { name: 'note', label: 'Note', value: x.note, placeholder: 'e.g. 2 new rear tyres, Sharma garage' }],
    left: id && can('fleet', 3) ? `<button type="button" class="btn danger" onclick="A.delVx('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { await save('fleetx', { ...(id ? x : { id: uid('fx_') }), ...v, amount: +v.amount, odo: nOr(v.odo) }, `${(VEH_EXP.find(y => y[0] === v.type) || [])[1]} ${inr(v.amount)} for ${vehById(v.vehicleId)?.no}`); render(); } });
};
A.delVx = id => confirmBox('Delete this expense?', '', 'Delete', async () => { await removeRec('fleetx', id); A.closeModal(); render(); });

/* ---------- parties (khata) ---------- */
function fleetParties() {
  const list = partyList(); const tot = sum(list, p => p.bal);
  return `<div class="toolbar"><b class="num">${T('Total to collect')} ${inr(tot)}</b></div>
  <div class="card">${list.length ? `<div class="rows">${list.map(p => `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(p.name))}</div><button class="main-col linkish" style="min-width:160px" onclick="A.partySheet('${esc(p.key)}')"><b>${esc(p.name)}</b><div class="sub">${p.trips.length} ${T('trips')} · ${T('Freight')} ${inr(p.freight)} · ${T('Received')} ${inr(p.recv)}${p.oldest ? ` · ${T('oldest due')} ${dShortF(p.oldest.date)}` : ''}</div></button><div class="row-flex" style="gap:6px">${p.bal ? pill(`${T('Due')} ${inr(p.bal)}`, 'bad') : pill(T('Clear'), 'good')}${p.bal && p.phone ? waBtn(partyStatement(p), p.phone, T('Remind')) : ''}${can('fleet', 2) && p.bal ? `<button class="btn sm primary" onclick="A.partyPay('${esc(p.key)}')">${ic('rupee')} ${T('Received')}</button>` : ''}</div></div>`).join('')}</div>` : empty('No party yet', 'Parties come from your trips.', '', 'users', MOD.fleet.c)}</div>`;
}
function partyStatement(p) {
  const st = settings(); const due = p.trips.filter(t => tripMoney(t).bal > 0);
  return `${I18N.lang === 'hi' ? 'नमस्ते' : 'Namaste'} ${p.name} ji 🙏\n${st.bizName} — ${T('Pending freight')}\n${due.map(t => `• ${dShortF(t.date)} ${t.from}→${t.to}${t.lr ? ' (' + t.lr + ')' : ''}: ${inr(tripMoney(t).bal)}`).join('\n')}\n*${T('Total')}: ${inr(p.bal)}*${st.upi ? '\nUPI: ' + st.upi : ''}\n${st.phone || ''}`;
}
A.partySheet = key => {
  const p = partyOf(key); if (!p) return;
  modal(`${sheetHead(p.name, `${p.phone || ''}${p.gstin ? ' · ' + p.gstin : ''}`)}<div class="sheet-b stack-sm"><div class="money-grid"><div><span>${T('Freight')}</span><b>${inr(p.freight)}</b></div><div><span>${T('Received')}</span><b class="good-t">${inr(p.recv)}</b></div><div><span>${T('Balance')}</span><b class="${p.bal ? 'bad-t' : ''}">${inr(p.bal)}</b></div></div>
    <div class="rows">${p.trips.slice().reverse().map(t => { const m = tripMoney(t); return `<button class="row click" onclick="A.closeModal();A.go('trip',{id:'${t.id}'})"><div class="main-col"><b>${esc(t.from)} → ${esc(t.to)}</b><div class="sub">${dShortF(t.date)} · ${esc(t.no)}${t.lr ? ' · ' + esc(t.lr) : ''}</div></div><div class="trip-m"><b class="num">${inr(m.freight)}</b>${m.bal ? `<span class="tiny bad-t">${T('Due')} ${inr(m.bal)}</span>` : `<span class="tiny good-t">${T('Paid')}</span>`}</div></button>`; }).join('')}</div>
    <div class="row-flex" style="gap:6px">${can('invoices', 2) ? `<button class="btn" onclick="A.closeModal();A.tripBill(${esc(JSON.stringify(p.trips.filter(t => !t.invoiceId && t.status !== 'cancelled').map(t => t.id)))})">${ic('receipt')} ${T('Bill for unbilled trips')}</button>` : ''}${p.bal && p.phone ? waBtn(partyStatement(p), p.phone, T('Send statement')) : ''}</div></div>`);
};
/* a lump payment goes to the oldest unpaid trips first */
A.partyPay = key => { const p = partyOf(key); lineForm('Payment received', `${p.name} · ${T('Due')} ${inr(p.bal)}`, [{ name: 'note', label: 'Note', full: true }], async v => {
  let left = +v.amount; for (const t of p.trips) { if (left <= 0) break; const bal = tripMoney(tripById(t.id)).bal; if (!bal) continue; const a = Math.min(bal, left); left -= a; const fresh = tripById(t.id); await save('trips', { ...fresh, recv: [...(fresh.recv || []), { id: uid('rc_'), amount: a, date: v.date || todayLocal(), mode: v.mode, note: (v.note || '').trim() }] }); }
  logAct(`Received ${inr(v.amount)} from ${p.name}`); toast(left > 0 ? `${T('Saved')}. ${inr(left)} ${T('more than the balance, not used')}` : T('Saved')); render(); }); };

/* ---------- drivers ---------- */
function fleetDrivers() {
  const edit = can('fleet', 2); const list = col('drivers').slice().sort(by('name'));
  return `${edit ? `<div class="row-flex" style="gap:8px;margin-bottom:12px"><button class="btn primary" onclick="A.drvForm()">${ic('plus')} ${T('Add driver')}</button></div>` : ''}
  <div class="card">${list.length ? `<div class="rows">${list.map(d => { const tr = col('trips').find(t => t.driverId === d.id && TRIP_LIVE.includes(t.status)); const pend = sum(col('trips').filter(t => t.driverId === d.id && !t.settled && t.status !== 'cancelled'), t => tripMoney(t).drv); const n = docDays(d.licenceExp); const login = S.members.find(m => m.staffId === d.id); const ph = String(d.phone || '').replace(/\D/g, '').slice(-10);
    return `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(d.name))}</div><button class="main-col linkish" style="min-width:150px" ${edit ? `onclick="A.drvForm('${d.id}')"` : ''}><b>${esc(d.name)}</b><div class="sub">${tr ? `${T('On trip')}: ${esc(tr.from)} → ${esc(tr.to)}` : T('Free')}${d.salary ? ` · ${inr(d.salary)}/${T('month')}` : ''}${login ? ' · ' + T('App login') : ''}</div></button><div class="row-flex" style="gap:6px">${n != null && n <= 30 ? pill(`${T('Licence')}: ${n < 0 ? T('expired') : n + ' ' + T('days')}`, n < 0 ? 'bad' : 'warn') : ''}${pend ? pill(pend > 0 ? `${T('Driver returns')} ${inr(pend)}` : `${T('Pay driver')} ${inr(-pend)}`, 'warn') : ''}${ph ? `<a class="icon-btn" href="tel:${ph}" aria-label="Call">${ic('phone')}</a>${waBtn('', ph, 'WhatsApp')}` : ''}${edit && !login && can('team', 2) && ph ? `<button class="btn sm ghost" onclick="A.drvLogin('${d.id}')">${ic('key')} ${T('App for driver')}</button>` : ''}</div></div>`; }).join('')}</div>` : empty('No driver added', 'Add drivers with mobile and licence date. A driver with the app can update the trip and add diesel from the road.', edit ? `<button class="btn primary" onclick="A.drvForm()">${ic('plus')} ${T('Add driver')}</button>` : '', 'user', MOD.fleet.c)}</div>`;
}
A.drvForm = id => { const d = id ? drvById(id) : {}; formModal({ title: id ? 'Edit driver' : 'Add driver', fields: [{ name: 'name', label: 'Name', required: true, value: d.name }, { name: 'phone', label: 'Mobile', type: 'tel', value: d.phone }, { name: 'licence', label: 'Driving licence no.', value: d.licence }, { name: 'licenceExp', label: 'Licence valid till', type: 'date', value: d.licenceExp }, { name: 'salary', label: 'Salary ₹ / month (optional)', type: 'number', min: 0, value: d.salary }, { name: 'vehicleId', label: 'Usual vehicle', type: 'select', options: [['', '—'], ...col('vehicles').map(v => [v.id, String(v.no).toUpperCase()])], value: d.vehicleId || '' }, { name: 'notes', label: 'Notes', full: true, value: d.notes }],
  left: id && can('fleet', 3) ? `<button type="button" class="btn danger" onclick="A.delDrv('${id}')">${ic('trash')}</button>` : '',
  onSubmit: async v => { const rec = { ...(id ? d : { id: uid('dr_') }), ...v, salary: nOr(v.salary) }; await save('drivers', rec, `${id ? 'Updated' : 'Added'} driver ${v.name}`); if (v.vehicleId) { const vh = vehById(v.vehicleId); if (vh && !vh.driverId) await save('vehicles', { ...vh, driverId: rec.id }); } render(); } }); };
A.delDrv = id => { const d = drvById(id); confirmBox(`${T('Delete')} ${d.name}?`, 'Old trips keep the record.', 'Delete', async () => { await removeRec('drivers', id, `Deleted driver ${d.name}`); A.closeModal(); render(); }); };
A.drvLogin = id => { const d = drvById(id); formModal({ title: 'App for driver', sub: `${d.name} · ${T('The driver updates the trip, location and diesel from the phone.')}`, fields: [{ name: 'mobile', label: 'Mobile (login ID)', type: 'tel', required: true, value: String(d.phone || '').replace(/\D/g, '').slice(-10) }, { name: 'password', label: 'Password (at least 6 letters)', required: true, placeholder: 'e.g. driver123' }],
  submit: 'Make login', onSubmit: async v => { const mob = String(v.mobile || '').replace(/\D/g, '').slice(-10); if (mob.length !== 10) throw new Error('Write a 10-digit mobile number'); if (String(v.password || '').length < 6) throw new Error('Password must be at least 6 letters');
    const m = await S.adapter.createMember(S.org.orgId, { name: d.name, email: loginId(mob), password: v.password, role: 'staff', staffId: d.id }); S.members.push(m); logAct(`Made app login for driver ${d.name}`); toast('Login made. Tell the driver the mobile and password.'); render(); } }); };

/* ---------- driver's own phone: my trip ---------- */
function driverExtra() {
  if (!isTransport() || !S.me?.staffId) return ''; const mine = col('trips').filter(t => t.driverId === S.me.staffId && ['planned', ...TRIP_LIVE].includes(t.status)).sort(by('date')); if (!mine.length && !drvById(S.me.staffId)) return '';
  return `<div class="sec-h"><h2>${T('My trip')}</h2></div>${mine.length ? mine.map(t => { const m = tripMoney(t); const v = vehById(t.vehicleId); const pph = String(t.consignee?.phone || t.partyPhone || '').replace(/\D/g, '').slice(-10); const [l, tone] = TRIP_ST[t.status];
    return `<div class="card pad stack-sm drv-trip"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap">${v ? plate(v.no) : ''}${pill(T(l), tone)}</div><b class="trip-route">${esc(t.from)} → ${esc(t.to)}</b><div class="small muted">${esc(t.goods || '')}${t.weight ? ' · ' + t.weight + ' ' + T('tons') : ''}${t.lr ? ' · ' + T('LR') + ' ' + esc(t.lr) : ''}</div>
      <div class="big-grid two">${t.status === 'planned' || t.status === 'loading' ? bigBtn(T('Started'), 'truck', MOD.fleet.c, `A.drvStep('${t.id}','on_way')`) : t.status === 'on_way' ? bigBtn(T('Reached'), 'pin', '#2563EB', `A.drvStep('${t.id}','reached')`) : bigBtn(T('Unloaded / delivered'), 'check', '#0B9B68', `A.drvStep('${t.id}','done')`)}${bigBtn(T('Location update'), 'send', '#7C3AED', `A.tripStatus('${t.id}')`)}${bigBtn(T('Diesel / expense'), 'fuel', '#EA580C', `A.costForm('${t.id}')`)}${pph ? `<a class="big-btn" style="--c:#0B9B68" href="tel:${pph}">${ibox('phone', '#0B9B68', 'lg')}<b>${T('Call receiver')}</b></a>` : ''}</div>
      <div class="tiny muted">${T('Advance given')} ${inr(m.given)} · ${T('Spent')} ${inr(m.spent)} · ${m.drv >= 0 ? T('With you') : T('Office owes you')} ${inr(Math.abs(m.drv))}</div></div>`; }).join('') : `<div class="card pad small muted">${T('No trip given to you right now.')}</div>`}`;
}
A.drvStep = async (id, st) => { const t = tripById(id); try { const pos = await getPos(); await save('trips', { ...t, status: st, log: [...(t.log || []), { at: nowIso(), st, ...(pos || {}), by: S.me?.name || S.user.name }].slice(-60) }, `Trip ${t.no}: ${TRIP_ST[st][0]}`); toast(T(TRIP_ST[st][0])); render(); if (typeof notifyManagers === 'function' && st !== 'loading') notifyManagers(`${T(TRIP_ST[st][0])}: ${t.from} → ${t.to}`, vehById(t.vehicleId)?.no || ''); } catch (e) { toast(e.message, 'bad'); } };

/* ---------- report ---------- */
function fleetReport() {
  const month = S.filters.flMonth || todayLocal().slice(0, 7); const tr = col('trips').filter(t => t.status !== 'cancelled' && (t.date || '').startsWith(month)); const ms = tr.map(tripMoney);
  const vx = col('fleetx').filter(x => (x.date || '').startsWith(month)); const office = transportOnly() ? sum(col('expenses').filter(x => (x.date || '').startsWith(month)), x => +x.amount || 0) : 0;
  const freight = sum(ms, m => m.freight), recv = sum(ms, m => m.recv), tcost = sum(ms, m => m.cost), vcost = sum(vx, x => +x.amount || 0) + office, profit = freight - tcost - vcost;
  const byType = TRIP_COSTS.map(([k, l]) => [l, sum(tr, t => sum((t.costs || []).filter(c => c.type === k), c => +c.amount || 0))]).concat([['Vehicle hire', sum(ms, m => m.hire)]], VEH_EXP.map(([k, l]) => [l, sum(vx.filter(x => x.type === k), x => +x.amount || 0)])).concat([['Office expenses', office]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const tc = tcost + vcost;
  return `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('flMonth',this.value)">${!FRAMED ? `<button class="btn sm" onclick="A.fleetCSV('${month}')">${ic('download')} CSV</button>` : ''}</div>
  <div class="kpis">${kpi('Trips', tr.length, `${num(sum(ms, m => m.km))} km`)}${kpi('Freight', inr(freight), `${T('Received')} ${inr(recv)}`, 'good', 'rupee', '#0B9B68')}${kpi('Costs', inr(tc), `${T('Trips')} ${inr(tcost)} · ${T('Vehicles')} ${inr(vcost)}`, '', 'wallet', '#EA580C')}${kpi('Profit', inr(profit), freight ? Math.round(profit / freight * 100) + '%' : '', profit >= 0 ? 'good' : 'bad', 'chart', '#2563EB')}</div>
  <div class="split"><div class="card"><div class="card-h"><h3>${T('By vehicle')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Vehicle')}</th><th class="r">${T('Trips')}</th><th class="r">${T('Km')}</th><th class="r">${T('Freight')}</th><th class="r">${T('Costs')}</th><th class="r">${T('Profit')}</th><th class="r">${T('km/l')}</th></tr></thead><tbody>${col('vehicles').map(v => [v, vehMonth(v, month)]).sort((a, b) => b[1].profit - a[1].profit).map(([v, m]) => `<tr onclick="A.go('vehicle',{id:'${v.id}'})" style="cursor:pointer"><td>${plate(v.no)}</td><td class="r">${m.trips}</td><td class="r">${num(m.km)}</td><td class="r">${inr(m.freight)}</td><td class="r">${inr(m.cost)}</td><td class="r" style="color:${m.profit >= 0 ? 'var(--good)' : 'var(--bad)'}">${inr(m.profit)}</td><td class="r">${m.mileage || '—'}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card pad stack-sm"><h3>${T('Where the money goes')}</h3>${byType.map(([l, val]) => `<div><div class="row-flex small" style="justify-content:space-between"><span>${T(l)}</span><b class="num">${inr(val)}</b></div>${prog(tc ? val / tc * 100 : 0)}</div>`).join('') || `<span class="muted small">${T('Nothing yet')}</span>`}</div></div>`;
}
A.fleetCSV = month => { const q = x => `"${String(x ?? '').replace(/"/g, '""')}"`; const rows = col('trips').filter(t => (t.date || '').startsWith(month)).sort(by('date')).map(t => { const m = tripMoney(t); return [t.date, t.no, t.lr, vehById(t.vehicleId)?.no, drvById(t.driverId)?.name, t.party, t.from, t.to, t.goods, t.weight, TRIP_ST[t.status]?.[0], m.freight, m.recv, m.bal, m.cost, m.profit, m.km, m.liters].map(q).join(','); });
  downloadFile(`trips-${month}.csv`, '﻿Date,Trip,LR,Vehicle,Driver,Party,From,To,Goods,Tons,Status,Freight,Received,Balance,Cost,Profit,Km,Diesel L\n' + rows.join('\n'), 'text/csv'); logAct('Downloaded trips CSV'); };

/* ---------- bilty (LR / consignment note) ---------- */
A.printBilty = id => {
  const t = tripById(id); const st = settings(); const v = vehById(t.vehicleId); const d = drvById(t.driverId); const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', 'bad'); return; }
  const cn = t.consignor?.name ? t.consignor : { name: t.party, gstin: t.partyGstin, address: t.partyAddress }; const ce = t.consignee || {};
  const pt = { paid: 'PAID', topay: 'TO PAY', tbb: 'TO BE BILLED' }[t.payType] || 'TO BE BILLED';
  const copy = label => `<div class="lr"><div class="hd"><div>${st.logo ? `<img src="${esc(st.logo)}" alt="">` : ''}<div><h1>${esc(st.bizName || '')}</h1><div class="m">${esc([st.address, st.city].filter(Boolean).join(', '))}${st.phone ? ' · ' + esc(st.phone) : ''}${st.gstin ? ' · GSTIN ' + esc(st.gstin) : ''}</div></div></div><div class="cp"><b>${label}</b><div>CONSIGNMENT NOTE / BILTY</div><div class="no">LR No. <b>${esc(t.lr || '')}</b></div><div>Date ${fmtDate(t.date)}</div></div></div>
    <table><tr><td><b>From</b> ${esc(t.from || '')}</td><td><b>To</b> ${esc(t.to || '')}</td><td><b>Vehicle</b> ${esc(String(v?.no || '').toUpperCase())}</td><td><b>Driver</b> ${esc(d?.name || '')} ${esc(d?.phone || '')}</td></tr></table>
    <table class="two"><tr><td><div class="lb">Consignor (sender)</div><b>${esc(cn.name || '')}</b><div>${esc(cn.address || '')}</div>${cn.gstin ? `<div>GSTIN ${esc(cn.gstin)}</div>` : ''}</td><td><div class="lb">Consignee (receiver)</div><b>${esc(ce.name || '')}</b><div>${esc(ce.address || '')}</div>${ce.gstin ? `<div>GSTIN ${esc(ce.gstin)}</div>` : ''}${ce.phone ? `<div>${esc(ce.phone)}</div>` : ''}</td></tr></table>
    <table><thead><tr><th>Packages</th><th>Description of goods</th><th>Weight</th><th>Value ₹</th><th>Invoice / E-way bill</th><th>Freight</th></tr></thead><tbody><tr><td>${esc(t.packages || '')}</td><td>${esc(t.goods || '')}</td><td>${t.weight ? esc(String(t.weight)) + ' ton' : ''}</td><td>${t.value ? inr(t.value) : ''}</td><td>${esc(t.goodsInv || '')}${t.eway ? '<br>EWB ' + esc(t.eway) : ''}</td><td><b>${pt}</b><br>${t.freight && t.payType !== 'tbb' ? inr(t.freight) : ''}</td></tr></tbody></table>
    <div class="ft"><div>${esc(st.biltyTerms || BILTY_TERMS)} Subject to ${esc(st.city || 'local')} jurisdiction.</div><div class="sg"><span>Receiver's sign & stamp</span><span>For ${esc(st.bizName || '')}</span></div></div></div>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bilty ${esc(t.lr || '')}</title><style>body{font:13px/1.4 system-ui,sans-serif;color:#111;max-width:820px;margin:16px auto;padding:0 12px}.lr{border:2px solid #111;padding:10px;margin-bottom:14px;page-break-inside:avoid}.hd{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #111;padding-bottom:6px}.hd>div:first-child{display:flex;gap:10px;align-items:center}.hd img{height:46px}h1{font-size:20px;margin:0}.m{font-size:11.5px;color:#333}.cp{text-align:right;font-size:12px}.cp b{font-size:13px}.no{font-size:14px;margin-top:2px}table{border-collapse:collapse;width:100%;margin-top:6px}td,th{border:1px solid #444;padding:5px 6px;text-align:left;vertical-align:top}th{background:#eee;font-size:11.5px}.two td{width:50%}.lb{font-size:10.5px;text-transform:uppercase;color:#555}.ft{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font-size:11px}.sg{display:flex;gap:40px;align-items:flex-end}.sg span{border-top:1px solid #111;padding-top:2px;min-width:140px;text-align:center}@media print{button{display:none}body{margin:0}}</style></head><body>
    ${['CONSIGNOR COPY', 'CONSIGNEE COPY', 'DRIVER COPY', 'OFFICE COPY'].map(copy).join('')}<button onclick="print()" style="padding:10px 16px">Print / Save as PDF</button></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) { } }, 400);
};

/* ---------- freight bill (GST invoice) from one or more trips ---------- */
A.tripBill = ids => {
  const trips = (ids || []).map(tripById).filter(Boolean); if (!trips.length) { toast('No unbilled trip', 'warn'); return; }
  formModal({ title: 'Make freight bill', sub: `${trips[0].party} · ${trips.length} ${T(trips.length === 1 ? 'trip' : 'trips')} · ${inr(sum(trips, t => +t.freight || 0))}`, fields: [
    { name: 'gst', label: 'GST', type: 'select', full: true, value: settings().transportGst || 'rcm', options: [['rcm', T('Reverse charge: party pays GST (GTA, 5%)')], ['5', T('5% GST charged by us (no input credit)')], ['12', T('12% GST charged by us')], ['none', T('No GST')]] },
    { name: 'type', label: 'Document', type: 'select', options: [['invoice', T('Tax invoice / freight bill')], ['quotation', T('Quotation')]], value: 'invoice' }],
    submit: 'Make bill', onSubmit: async v => {
      const p = trips[0]; const inv = await createInvoiceFor({ client: p.party, phone: p.partyPhone || '', title: p.party }, v.type, trips.map(t => ({ id: uid('l'), desc: `Freight ${t.from} → ${t.to} · ${String(vehById(t.vehicleId)?.no || '').toUpperCase()}${t.lr ? ' · LR ' + t.lr : ''} · ${fmtShort(t.date)}${t.goods ? ' · ' + t.goods : ''}${t.weight ? ' (' + t.weight + ' t)' : ''}`, qty: 1, rate: +t.freight || 0, days: 1, hsn: '996511' })));
      const rcm = v.gst === 'rcm';
      Object.assign(inv, { address: p.partyAddress || '', clientGstin: p.partyGstin || '', gstMode: v.gst === 'none' || rcm ? 'none' : 'excl', gstRate: rcm ? 0 : +v.gst || 0, rcm, tripIds: trips.map(t => t.id), notes: rcm ? 'GST on this freight is payable by the recipient under reverse charge (GTA service, SAC 996511).' : 'Transport of goods by road (SAC 996511).' });
      await save('invoices', inv); await saveSettingsRec({ transportGst: v.gst });
      if (v.type === 'invoice') for (const t of trips) await save('trips', { ...tripById(t.id), invoiceId: inv.id });
      A.go('invoice', { id: inv.id }); } });
};

/* freight already received on the trips of a bill counts as paid on the bill (capped at the bill total) */
function tripPaidFor(inv) { const got = sum(inv.tripIds.map(tripById).filter(Boolean), t => sumA(t.recv)); const lines = sum(inv.lines || [], l => (+l.qty || 0) * (+l.rate || 0) * (+l.days || 1)); const r = inv.gstMode === 'excl' ? 1 + (+inv.gstRate || 0) / 100 : 1; return Math.min(got * r, Math.round(lines * r)); }
A.fleetSettings = () => { const st = settings(); formModal({ title: 'Transport settings', fields: [{ name: 'lrPrefix', label: 'Bilty / LR number starts with', value: st.lrPrefix || 'LR', placeholder: 'LR' }, { name: 'biltyTerms', label: 'Terms printed on the bilty', type: 'textarea', full: true, value: st.biltyTerms || '', placeholder: BILTY_TERMS }],
  onSubmit: async v => { await saveSettingsRec({ lrPrefix: (v.lrPrefix || 'LR').replace(/[^A-Za-z0-9/-]/g, '').slice(0, 8) || 'LR', biltyTerms: (v.biltyTerms || '').trim() }); toast('Saved'); render(); } }); };
const BILTY_TERMS = "Goods are carried at owner's risk. We are not responsible for leakage, breakage or damage by weather.";

/* ---------- reminders, home, crew ---------- */
EXTRA_ALERTS.push(() => {
  if (!isTransport() || !can('fleet')) return []; const out = [];
  docAlerts().filter(x => x.n <= 15).forEach(x => out.push({ tag: 'Papers', tone: x.n < 0 ? 'bad' : 'warn', title: `${x.v ? String(x.v.no).toUpperCase() : x.d.name}: ${T(x.l)} ${x.n < 0 ? T('expired') : T('ends') + ' ' + dShortF(x.date)}`, sub: T('Renew it in time'), go: x.v ? `A.go('vehicle',{id:'${x.v.id}'})` : `A.go('fleet',{tab:'drivers'})` }));
  const old = col('trips').filter(t => t.status === 'done' && tripMoney(t).bal > 0 && t.date && daysBetween(t.date, todayLocal()) >= 15); if (old.length) out.push({ tag: 'Overdue', title: `${T('Freight due for 15+ days')}: ${old.length} ${T(old.length === 1 ? 'trip' : 'trips')}`, sub: inr(sum(old, t => tripMoney(t).bal)), go: "A.go('fleet',{tab:'parties'})" });
  const d = +todayLocal().slice(8, 10); col('vehicles').filter(v => v.emi && v.emiDay && (+v.emiDay - d >= 0 && +v.emiDay - d <= 3)).forEach(v => out.push({ tag: 'Payment', title: `${String(v.no).toUpperCase()}: ${T('EMI')} ${inr(v.emi)}`, sub: `${T('EMI date')}: ${v.emiDay}`, go: `A.go('vehicle',{id:'${v.id}'})` }));
  return out;
});
const _createFleet = createActions; createActions = () => { const base = _createFleet(); if (!isTransport() || !can('fleet', 2)) return base;
  const fl = [['New trip', 'truck', MOD.fleet.c, 'A.tripForm()'], ['Diesel / expense', 'fuel', '#EA580C', 'A.pickTripCost()'], ['Freight received', 'rupee', '#0B9B68', "A.go('fleet',{tab:'parties'})"], ['Add vehicle', 'plus', '#2563EB', 'A.vehForm()']];
  return [...fl, ...(transportOnly() ? base.filter(x => x[0] !== 'Payment received') : base)]; };
const _crewHomeFleet = crewHome; crewHome = () => { const d = driverExtra(); if (!d || !transportOnly()) return d + _crewHomeFleet(); const st = settings();
  return `${pushCard()}${d}<div class="big-grid two" style="margin-top:14px">${canSendAlert() ? bigBtn('Alert my seniors', 'bell', '#E11D74', `A.alertForm('@seniors')`) : ''}${st.phone ? `<a class="big-btn" style="--c:#0B9B68" href="tel:${esc(String(st.phone).replace(/\s/g, ''))}">${ibox('phone', '#0B9B68', 'lg')}<b>${T('Call the owner')}</b></a>` : ''}</div>`; };
const _dashFleet = V.dashboard; V.dashboard = () => (S.org && transportOnly() && can('fleet') && !(typeof isCrewUser === 'function' && isCrewUser()) ? `<div class="sec-h" style="margin-top:0"><h2>${T('Today')}${info('fl-today')}</h2></div>` + fleetToday({ due: sum(partyList(), p => p.bal) }) : _dashFleet());

/* ---------- demo data (demo.js calls this) ---------- */
function fleetDemo(add, full) {
  const dD = n => addDays(todayLocal(), n); const dm = p => 'dm_' + p + '_' + Math.random().toString(36).slice(2, 8); const at = (n, t) => dD(n) + 'T' + t;
  const D = [['Bablu Gurjar', '9829000110', -40], ['Shankar Lal', '9829000111', 12], ['Imran Khan', '9829000112', 300], ['Pappu Yadav', '9829000113', 500]].map(([name, phone, n], i) => add('drivers', { id: dm('dr'), name, phone, licence: 'RJ14 2015' + (1000 + i * 37), licenceExp: dD(n), salary: [18000, 16000, 17000, 15000][i] }));
  const V = [['RJ14 GB 5421', 'Truck', 'Tata 1613', '16 ton', 'own', 0, { insurance: 9, fitness: 140, permit: 200, natPermit: 220, puc: -3, tax: 90 }, 28500, 5, 184520],
    ['RJ14 GC 1180', 'Trailer', 'Ashok Leyland 4019', '32 ton', 'own', 1, { insurance: 210, fitness: 25, permit: 300, natPermit: 300, puc: 60, tax: 120 }, 42000, 10, 312040],
    ['RJ14 GD 7702', 'Tempo / mini truck', 'Tata 407', '3 ton', 'own', 2, { insurance: 320, fitness: 180, permit: 160, puc: 40, tax: 200 }, 0, 0, 96410],
    ['HR55 AK 3391', 'Container', 'Eicher Pro 6028', '20 ton', 'attached', 3, { insurance: 150, fitness: 150, permit: 150, natPermit: 150, puc: 30, tax: 150 }, 0, 0, 228300]]
    .map(([no, type, make, capacity, own, di, docs, emi, emiDay, odo]) => { const v = add('vehicles', { id: dm('vh'), no, type, make, capacity, own, driverId: D[di].id, docs: Object.fromEntries(Object.entries(docs).map(([k, n]) => [k, dD(n)])), emi, emiDay: emiDay || '', odo, ownerName: own === 'attached' ? 'Satpal Singh' : '', ownerPhone: own === 'attached' ? '9813000441' : '' }); D[di].vehicleId = v.id; return v; });
  const M = add('vehicles', { id: dm('vh'), no: 'RJ09 GA 2210', type: 'Truck', make: 'Market vehicle', capacity: '10 ton', own: 'market', driverId: '', docs: {}, ownerName: 'Lakhan Transport', ownerPhone: '9829900550' });
  const P = [['Shree Cement Ltd', '9414000301', '08AABCS1234F1Z5', 'Beawar, Rajasthan'], ['Gupta Traders', '9414000302', '08AAKPG5678K1Z2', 'Kishanpole Bazar, Jaipur'], ['Om Furniture House', '9414000303', '', 'Sanganer, Jaipur'], ['Marudhar Agro', '9414000304', '08AAFFM9012Q1Z7', 'Jodhpur']];
  let no = 0, lr = 0; const pr = i => ({ party: P[i][0], partyPhone: P[i][1], partyGstin: P[i][2], partyAddress: P[i][3] });
  const trip = o => { no++; lr++; const t = { id: dm('tr'), no: 'T-' + String(no).padStart(3, '0'), lr: 'LR-' + String(lr).padStart(3, '0'), time: '', payType: 'tbb', recv: [], dAdv: [], costs: [], hirePaid: [], log: [], notes: '', consignor: { name: '', gstin: '', address: '' }, consignee: { name: '', gstin: '', address: '', phone: '' }, ...o }; return add('trips', t); };
  const c = (type, amount, n, by = 'driver', liters = '', place = '') => ({ id: dm('tc'), type, amount, date: dD(n), by, liters, place, note: '' });
  const lg = (st, n, t, place = '', ll) => ({ at: at(n, t), st, place, ...(ll ? { lat: ll[0], lng: ll[1] } : {}), by: 'Demo' });
  trip({ ...pr(0), vehicleId: V[0].id, driverId: D[0].id, from: 'Beawar', to: 'Delhi', date: dD(-1), time: '06:00', status: 'on_way', goods: 'Cement bags (OPC 53)', packages: '320 bags', weight: 16, value: 128000, goodsInv: 'SCL/4471', eway: '3311 2290 4471', freight: 38000, kmStart: 184520,
    consignor: { name: 'Shree Cement Ltd', gstin: '08AABCS1234F1Z5', address: 'Beawar, Rajasthan' }, consignee: { name: 'Delhi Build Mart', gstin: '07AAECD4410M1Z3', address: 'Okhla Phase 2, New Delhi', phone: '9810000771' },
    recv: [{ id: dm('rc'), amount: 10000, date: dD(-1), mode: 'Bank transfer', note: 'Advance' }], dAdv: [{ id: dm('da'), amount: 15000, date: dD(-1), mode: 'Cash' }],
    costs: [c('diesel', 9200, -1, 'driver', 98, 'Beawar pump'), c('toll', 1450, -1), c('bhatta', 400, 0), c('diesel', 4600, 0, 'driver', 49, 'Behror')],
    log: [lg('planned', -2, '18:00'), lg('loading', -1, '05:10', 'Shree Cement plant'), lg('on_way', -1, '07:00'), lg('on_way', 0, '09:40', 'Near Behror toll', [27.889, 76.287])] });
  trip({ ...pr(1), vehicleId: V[1].id, driverId: D[1].id, from: 'Jaipur', to: 'Ahmedabad', date: dD(-3), status: 'reached', goods: 'Kirana goods', packages: '540 cartons', weight: 24, value: 410000, eway: '3311 2290 5520', freight: 52000, payType: 'topay', kmStart: 311380,
    consignee: { name: 'Patel Wholesale', gstin: '24AAGFP2210H1Z9', address: 'Kalupur, Ahmedabad', phone: '9825000661' }, dAdv: [{ id: dm('da'), amount: 20000, date: dD(-3), mode: 'Cash' }],
    costs: [c('diesel', 16800, -3, 'driver', 178), c('toll', 2860, -3), c('police', 500, -2), c('bhatta', 800, -2), c('loading', 1500, -3, 'office')],
    log: [lg('planned', -4, '17:00'), lg('loading', -3, '06:00', 'Transport Nagar'), lg('on_way', -3, '09:00'), lg('reached', 0, '07:30', 'Kalupur market', [23.027, 72.6])] });
  trip({ ...pr(2), vehicleId: V[2].id, driverId: D[2].id, from: 'Sanganer', to: 'Ajmer', date: dD(1), time: '07:00', status: 'planned', goods: 'Furniture (wedding order)', packages: '42 pieces', weight: 2.5, freight: 7500, payType: 'paid', log: [lg('planned', 0, '11:00')] });
  trip({ ...pr(3), vehicleId: M.id, driverId: '', from: 'Jodhpur', to: 'Jaipur', date: dD(-2), status: 'on_way', goods: 'Guar seed', packages: '250 bags', weight: 10, freight: 26000, hire: 21000, hirePaid: [{ id: dm('hp'), amount: 10000, date: dD(-2), mode: 'Cash' }],
    log: [lg('planned', -3, '16:00'), lg('on_way', -2, '06:30', 'Jodhpur mandi')] });
  /* finished trips of the last two months, so the khata and the report have numbers */
  const routes = [['Beawar', 'Delhi', 0, 38000, 16, 0, 'Cement bags'], ['Jaipur', 'Ahmedabad', 1, 52000, 24, 1, 'Kirana goods'], ['Jaipur', 'Kota', 2, 6500, 3, 2, 'Furniture'], ['Jodhpur', 'Jaipur', 3, 31000, 20, 3, 'Guar seed'], ['Beawar', 'Gurugram', 0, 36000, 16, 0, 'Cement bags'], ['Jaipur', 'Indore', 1, 58000, 25, 1, 'Marble slabs']];
  for (let k = 0; k < (full ? 22 : 10); k++) { const [from, to, vi, freight, wt, pi, goods] = routes[k % routes.length]; const n = -6 - k * 3; const km = Math.round(freight / 70); const paid = k > 3 ? freight : k === 1 ? Math.round(freight / 2) : 0; const pdx = k === 2 ? 2 : pi;
    trip({ ...pr(pdx), vehicleId: V[vi].id, driverId: D[vi].id, from, to, date: dD(n), status: 'done', goods, weight: wt, freight, pod: k > 1, settled: k > 0, settleAmt: 0, kmStart: 150000 + k * 900, kmEnd: 150000 + k * 900 + km,
      recv: paid ? [{ id: dm('rc'), amount: paid, date: dD(n + 5), mode: 'Bank transfer', note: '' }] : [], dAdv: [{ id: dm('da'), amount: Math.round(freight * .35 / 500) * 500, date: dD(n), mode: 'Cash' }],
      costs: [c('diesel', Math.round(km / 4 * 94), n, 'driver', Math.round(km / 4)), c('toll', Math.round(km * 2.6), n), c('bhatta', 600, n + 1)], log: [lg('planned', n - 1, '17:00'), lg('on_way', n, '06:00'), lg('done', n + 1, '15:00')] });
  }
  [[0, 'service', 6800, -9, 'Oil change + filters'], [1, 'tyre', 38000, -20, '2 new rear tyres'], [0, 'emi', 28500, -21, 'Bank EMI'], [1, 'emi', 42000, -16, 'Bank EMI'], [2, 'repair', 3200, -5, 'Clutch plate'], [0, 'salary', 18000, -25, D[0].name], [1, 'salary', 16000, -25, D[1].name]]
    .forEach(([vi, type, amount, n, note]) => add('fleetx', { id: dm('fx'), vehicleId: V[vi].id, type, amount, date: dD(n), odo: '', note }));
}
