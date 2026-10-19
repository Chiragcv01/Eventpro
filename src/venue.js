/* ================= Venue: halls, rooms, guests, function sheet, hospitality =================
   For businesses that picked 'Venue / Banquet / Resort' at sign-up (settings.bizTypes has 'venue').
   Collections: spaces (halls / lawns), rooms, stays (a guest in a room for a booking).
   On a booking: spaceIds (halls used), functions [] (the function sheet: time, hall, pax, setup, food,
   waiters, lights, decor), roomsNeeded. 'Make hospitality checklist' creates tasks (with `area`) that the
   team updates in the Live tracker and on the crew screen. */
Object.assign(ICONS, {
  bed: 'M3 19V7M3 15h18v4M21 15v-2a3 3 0 0 0-3-3h-7v5M7 12.5a1.8 1.8 0 1 0 0-.01',
  door: 'M6 21V4h11v17M4 21h16M14 12.5v.01'
});
const bizHas = b => !!S.org && (settings().bizTypes || []).includes(b);
const isVenue = () => !!S.org && !isClinic() && bizHas('venue');
const SPACE_TYPES = ['Banquet hall', 'Lawn', 'Poolside', 'Terrace', 'Conference room', 'Restaurant', 'Other'];
const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family', 'Cottage / Villa', 'Dormitory'];
const ROOM_ST = { ready: ['Ready', '#0B9B68'], occupied: ['Guest in room', '#2563EB'], cleaning: ['To clean', '#D97706'], blocked: ['Blocked / repair', '#64748B'] };
const SETUPS = ['Round tables', 'Buffet', 'Theatre', 'Classroom', 'U-shape', 'Cluster / lounge', 'Mandap', 'Stage & dance floor', 'Cocktail (standing)'];
const MEALS = ['No food', 'Breakfast', 'Lunch', 'Hi-tea', 'Dinner', 'Cocktail & snacks'];
const HOSP_AREAS = [['welcome', 'Welcome & reception', 'sparkle', '#DB2777'], ['rooms', 'Rooms & housekeeping', 'bed', '#0F766E'], ['food', 'Food & service', 'utensils', '#16A34A'],
  ['lights', 'Lights & sound', 'bulb', '#F59E0B'], ['decor', 'Decor & setup', 'sparkle', '#9333EA'], ['transport', 'Transport & pickups', 'truck', '#2563EB'], ['security', 'Security & parking', 'shield', '#475569']];
const AREA = Object.fromEntries(HOSP_AREAS.map(a => [a[0], a]));
const VENUE_ALERTS = ['Guest waiting at reception', 'Room not ready', 'Food running short', 'Need more waiters now', 'Lights / sound problem', 'VIP arriving now', 'Clean the hall now'];

const spaceById = id => getById('spaces', id);
const roomById = id => getById('rooms', id);
const roomLabel = r => r ? `${r.no}${r.type ? ' · ' + T(r.type) : ''}` : '—';
const evSpaces = e => (e?.spaceIds || []).map(spaceById).filter(Boolean);
/* events holding a hall on a date (Confirmed / Setup / Live) */
const spaceBookings = (sid, d, except) => col('events').filter(e => e.id !== except && RESERVING.includes(e.stage) && (e.spaceIds || []).includes(sid) && e.date <= d && eventEnd(e) >= d);
const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
const stayOn = (s, d) => s.status !== 'out' && s.from <= d && d < s.to;
function roomFree(roomId, from, to, except) { return !col('stays').some(s => s.id !== except && s.roomId === roomId && s.status !== 'out' && overlap(from, to, s.from, s.to)); }
const roomGuest = (roomId, d = todayLocal()) => col('stays').find(s => s.roomId === roomId && (s.status === 'in' || stayOn(s, d)));
function waitersFor(fn) { const p = +fn.pax || 0; if (!p || fn.meal === 'No food') return 0; const per = fn.setup === 'Buffet' ? 25 : fn.setup === 'Round tables' ? 12 : fn.setup === 'Cocktail (standing)' ? 20 : 15; return Math.ceil(p / per); }
const fnSort = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

/* used by Leads: which halls are taken on a date */
function venueClashText(d) { if (!isVenue()) return ''; const busy = col('spaces').filter(s => spaceBookings(s.id, d).length); return busy.length ? ` · ${T('Halls taken')}: ${busy.map(s => esc(s.name)).join(', ')}` : ''; }
function venueDayHTML(d) {
  if (!isVenue() || !col('spaces').length) return '';
  const rooms = col('rooms'); const used = col('stays').filter(s => stayOn(s, d)).length;
  return `<div><div class="eyebrow">${T('Halls')}</div><div class="hall-chips">${col('spaces').map(s => { const b = spaceBookings(s.id, d); return `<span class="hall-chip ${b.length ? 'busy' : ''}">${esc(s.name)} · ${b.length ? esc(b[0].title) : T('Free')}</span>`; }).join('')}</div>${rooms.length ? `<div class="tiny muted" style="margin-top:6px">${T('Rooms booked')}: ${used} / ${rooms.length}</div>` : ''}</div>`;
}

/* ---------- Venue page ---------- */
V.venue = () => {
  const tab = S.params.tab || 'today'; const t = todayLocal();
  const arrive = col('stays').filter(s => s.status === 'expected' && s.from <= t); const leave = col('stays').filter(s => s.status === 'in' && s.to <= t);
  const clean = col('rooms').filter(r => r.status === 'cleaning');
  const tabs = [['today', 'Today'], ['spaces', 'Halls & lawns'], ['rooms', 'Rooms', clean.length], ['guests', 'Guests', arrive.length + leave.length]];
  return pageHead('Venue & rooms', 'Halls, rooms, guests and today’s functions') + `<div class="tabs">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('vn-' + tab)}</div>` +
    (tab === 'spaces' ? spacesTab() : tab === 'rooms' ? roomsTab() : tab === 'guests' ? guestsTab() : venueToday());
};
function venueToday() {
  const t = todayLocal(); const fns = []; col('events').filter(e => !['Cancelled'].includes(e.stage)).forEach(e => (e.functions || []).filter(f => f.date === t).forEach(f => fns.push({ ...f, ev: e }))); fns.sort(fnSort);
  const evs = col('events').filter(e => RESERVING.includes(e.stage) && e.date <= t && eventEnd(e) >= t);
  const arrive = col('stays').filter(s => s.status === 'expected' && s.from <= t).sort(by('from')); const leave = col('stays').filter(s => s.status === 'in' && s.to <= t);
  const inHouse = col('stays').filter(s => s.status === 'in'); const clean = col('rooms').filter(r => r.status === 'cleaning'); const edit = can('venue', 2);
  return `<div class="today-strip"><div><b>${fns.length || evs.length}</b><span>${fns.length ? 'Functions today' : 'Events today'}</span></div><div><b>${num(sum(fns, f => +f.pax || 0))}</b><span>Guests to serve</span></div><div><b>${inHouse.length}</b><span>Rooms with guests</span></div><div><b>${clean.length}</b><span>Rooms to clean</span></div></div>
  ${edit || can('tasks', 2) ? `<div class="big-grid">${[edit && bigBtn('Check in a guest', 'door', '#2563EB', "A.setP('tab','guests')"), edit && bigBtn('Room board', 'bed', MOD.venue.c, "A.setP('tab','rooms')"), can('tasks', 2) && bigBtn('Alert to team', 'bell', '#E11D74', 'A.alertForm()'), can('leads') && bigBtn('Leads', 'megaphone', MOD.leads.c, "A.go('leads')")].filter(Boolean).join('')}</div>` : ''}
  <div class="sec-h"><h2>${T('Today’s functions')}${info('vn-functions')}</h2></div>
  <div class="card">${fns.length ? `<div class="rows">${fns.map(f => `<button class="row click" onclick="A.go('event',{id:'${f.ev.id}',tab:'venue'})"><span class="timebox" style="--c:${evStyle(f.ev)[1]}"><b>${esc(f.time || '—')}</b><span>${esc(f.end || '')}</span></span><div class="main-col"><b>${esc(f.name || f.ev.title)}</b><div class="sub">${[spaceById(f.spaceId)?.name, f.pax ? num(f.pax) + ' ' + T('pax') : '', f.meal && f.meal !== 'No food' ? T(f.meal) : '', (f.waiters || waitersFor(f)) ? (f.waiters || waitersFor(f)) + ' ' + T('waiters') : ''].filter(Boolean).map(esc).join(' · ')}</div><div class="tiny muted">${esc(f.ev.title)}</div></div>${ic('chev', 'go')}</button>`).join('')}</div>`
    : evs.length ? `<div class="rows">${evs.map(e => `<button class="row click" onclick="A.go('event',{id:'${e.id}',tab:'venue'})">${datebox(e.date, evStyle(e)[1])}<div class="main-col"><b>${esc(e.title)}</b><div class="sub">${evSpaces(e).map(s => esc(s.name)).join(', ') || T('Add the function sheet')}</div></div>${ic('chev', 'go')}</button>`).join('')}</div>` : empty('No function today', 'Functions from each booking’s function sheet show here with hall, guests, food and waiters.', '', 'calendar', MOD.venue.c)}</div>
  ${arrive.length || leave.length ? `<div class="sec-h"><h2>${T('Arrivals & departures')}</h2></div><div class="card"><div class="rows">${arrive.map(s => stayRow(s, 'in')).join('')}${leave.map(s => stayRow(s, 'out')).join('')}</div></div>` : ''}
  ${clean.length ? `<div class="sec-h"><h2>${T('Rooms to clean')}</h2></div><div class="card"><div class="rows">${clean.map(r => `<div class="row">${ibox('bed', ROOM_ST.cleaning[1], 'sm')}<div class="main-col"><b>${T('Room')} ${esc(r.no)}</b><div class="sub">${esc(T(r.type || ''))}${r.floor ? ' · ' + T('Floor') + ' ' + esc(r.floor) : ''}</div></div>${edit ? `<button class="btn sm" onclick="A.roomStatus('${r.id}','ready')">${ic('check')} ${T('Clean, ready')}</button>` : ''}</div>`).join('')}</div></div>` : ''}`;
}

/* ---------- halls & lawns ---------- */
function spacesTab() {
  const sp = col('spaces').slice().sort(by('name')); const days = Array.from({ length: 14 }, (_, i) => addDays(todayLocal(), i)); const edit = can('venue', 2);
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><span class="small muted">${T('Next 14 days. Coloured = booked. Tap to open the booking.')}</span>${edit ? `<button class="btn primary sm" onclick="A.spaceForm()">${ic('plus')} ${T('Hall / lawn')}</button>` : ''}</div>
  ${sp.length ? `<div class="card"><div class="tbl-wrap"><table class="tbl avail"><thead><tr><th>${T('Hall')}</th>${days.map(d => `<th class="c"><span class="tiny">${esc(fmtDay(d).split(',')[0])}</span><br>${d.slice(8)}</th>`).join('')}</tr></thead><tbody>
    ${sp.map(s => `<tr><td class="nowrap"><button class="linkbtn" ${edit ? `onclick="A.spaceForm('${s.id}')"` : ''}><b>${esc(s.name)}</b></button><div class="tiny muted">${esc(T(s.type || ''))}${s.seating ? ' · ' + num(s.seating) + ' ' + T('seats') : ''}${s.floating ? ' · ' + num(s.floating) + ' ' + T('standing') : ''}</div></td>${days.map(d => { const b = spaceBookings(s.id, d); const q = col('events').filter(e => ['Quoted', 'Enquiry'].includes(e.stage) && (e.spaceIds || []).includes(s.id) && e.date <= d && eventEnd(e) >= d);
      return `<td class="c">${b.length ? `<button class="slot b" title="${esc(b[0].title)}" onclick="A.go('event',{id:'${b[0].id}'})">${esc(initials(b[0].client || b[0].title))}</button>` : q.length ? `<button class="slot q" title="${esc(q[0].title)}" onclick="A.go('event',{id:'${q[0].id}'})">?</button>` : `<span class="slot f"></span>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>
    <div class="dlegend" style="margin-top:8px"><span><i class="b"></i>${T('Booked')}</span><span><i class="q"></i>${T('Quotation / enquiry')}</span><span><i class="f"></i>${T('Free')}</span></div>`
  : `<div class="card">${empty('No halls added', 'Add your banquet halls, lawns and other spaces with their capacity. Then pick them on each booking to see which dates are free.', edit ? `<button class="btn primary" onclick="A.spaceForm()">${ic('plus')} Hall / lawn</button>` : '', 'building', MOD.venue.c)}</div>`}`;
}
A.spaceForm = id => {
  const s = id ? spaceById(id) : { type: 'Banquet hall' };
  formModal({ title: id ? 'Edit hall / lawn' : 'New hall / lawn', fields: [{ name: 'name', label: 'Name', required: true, value: s.name, placeholder: 'e.g. Crystal Hall' }, { name: 'type', label: 'Type', type: 'select', options: SPACE_TYPES, value: s.type },
    { name: 'seating', label: 'Seating capacity', type: 'number', min: 0, value: s.seating }, { name: 'floating', label: 'Standing / floating capacity', type: 'number', min: 0, value: s.floating },
    { name: 'rate', label: 'Rent per day ₹ (optional)', type: 'number', min: 0, value: s.rate }, { name: 'notes', label: 'Notes', value: s.notes, placeholder: 'e.g. AC, stage 20×12 ft, parking 80 cars' }],
    left: id && can('venue', 3) ? `<button type="button" class="btn danger" onclick="A.delSpace('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { await save('spaces', { ...(id ? s : { id: uid('sp_') }), ...v, seating: +v.seating || 0, floating: +v.floating || 0, rate: +v.rate || 0 }, `${id ? 'Updated' : 'Added'} hall ${v.name}`); toast('Saved'); render(); } });
};
A.delSpace = id => { const s = spaceById(id); confirmBox(`Delete ${s.name}?`, 'Bookings keep their details, but this hall will not show in the planner.', 'Delete', async () => { await removeRec('spaces', id, `Deleted hall ${s.name}`); A.closeModal(); render(); }); };

/* ---------- rooms ---------- */
function roomsTab() {
  const rooms = col('rooms').slice().sort((a, b) => String(a.floor || '').localeCompare(String(b.floor || ''), undefined, { numeric: true }) || String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  const floors = [...new Set(rooms.map(r => r.floor || ''))]; const edit = can('venue', 2);
  const count = k => rooms.filter(r => (r.status || 'ready') === k).length;
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><div class="dlegend">${Object.entries(ROOM_ST).map(([k, [l, c]]) => `<span><i style="background:${c}"></i>${T(l)} ${count(k)}</span>`).join('')}</div>${edit ? `<div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.roomsBulk()">${ic('plus')} ${T('Many rooms')}</button><button class="btn primary sm" onclick="A.roomForm()">${ic('plus')} ${T('Room')}</button></div>` : ''}</div>
  ${rooms.length ? floors.map(f => `<div class="sec-h" style="margin-top:6px"><h2>${f ? T('Floor') + ' ' + esc(f) : T('Rooms')}</h2></div><div class="room-board">${rooms.filter(r => (r.floor || '') === f).map(r => { const st = r.status || 'ready'; const g = roomGuest(r.id);
    return `<button class="room-tile" style="--c:${ROOM_ST[st][1]}" onclick="A.roomSheet('${r.id}')"><b>${esc(r.no)}</b><span>${esc(T(r.type || ''))}</span><span class="rs">${T(ROOM_ST[st][0])}</span>${g ? `<span class="rg">${esc(g.guest)}</span>` : ''}</button>`; }).join('')}</div>`).join('')
  : `<div class="card">${empty('No rooms added', 'Add your rooms once (you can add 101 to 120 in one go). Then allot rooms to wedding guests and track cleaning.', edit ? `<button class="btn primary" onclick="A.roomsBulk()">${ic('plus')} Add rooms</button>` : '', 'bed', MOD.venue.c)}</div>`}`;
}
A.roomForm = id => {
  const r = id ? roomById(id) : { type: 'Deluxe', beds: 2, status: 'ready' };
  formModal({ title: id ? `Room ${r.no}` : 'New room', fields: [{ name: 'no', label: 'Room number', required: true, value: r.no }, { name: 'type', label: 'Type', type: 'select', options: ROOM_TYPES, value: r.type },
    { name: 'floor', label: 'Floor / block', value: r.floor }, { name: 'beds', label: 'Guests per room', type: 'number', min: 1, value: r.beds }, { name: 'rate', label: 'Rate per night ₹', type: 'number', min: 0, value: r.rate }, { name: 'notes', label: 'Notes', value: r.notes }],
    left: id && can('venue', 3) ? `<button type="button" class="btn danger" onclick="A.delRoom('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { if (col('rooms').some(x => x.id !== id && String(x.no).toLowerCase() === String(v.no).trim().toLowerCase())) throw new Error('This room number already exists'); await save('rooms', { ...(id ? r : { id: uid('rm_'), status: 'ready' }), ...v, no: String(v.no).trim(), beds: +v.beds || 1, rate: +v.rate || 0 }, `${id ? 'Updated' : 'Added'} room ${v.no}`); toast('Saved'); render(); } });
};
A.roomsBulk = () => formModal({ title: 'Add many rooms', sub: 'e.g. 101 to 120 on the first floor', fields: [{ name: 'from', label: 'From number', type: 'number', required: true, value: 101 }, { name: 'to', label: 'To number', type: 'number', required: true, value: 110 },
  { name: 'type', label: 'Type', type: 'select', options: ROOM_TYPES, value: 'Deluxe' }, { name: 'floor', label: 'Floor / block', value: '1' }, { name: 'beds', label: 'Guests per room', type: 'number', min: 1, value: 2 }, { name: 'rate', label: 'Rate per night ₹', type: 'number', min: 0 }],
  submit: 'Add rooms', onSubmit: async v => {
    const a = +v.from, b = +v.to; if (!(a > 0 && b >= a && b - a < 300)) throw new Error('Check the numbers (up to 300 rooms at once)');
    const have = new Set(col('rooms').map(r => String(r.no))); const recs = [];
    for (let n = a; n <= b; n++) if (!have.has(String(n))) recs.push({ id: uid('rm_'), no: String(n), type: v.type, floor: v.floor, beds: +v.beds || 1, rate: +v.rate || 0, status: 'ready' });
    for (const r of recs) await save('rooms', r); logAct(`Added ${recs.length} rooms`); toast(`${recs.length} ${T('rooms added')}`); render();
  } });
A.delRoom = id => { const r = roomById(id); confirmBox(`Delete room ${r.no}?`, '', 'Delete', async () => { await removeRec('rooms', id, `Deleted room ${r.no}`); A.closeModal(); render(); }); };
A.roomSheet = id => {
  const r = roomById(id); const g = roomGuest(r.id); const edit = can('venue', 2); const st = r.status || 'ready';
  const next = col('stays').filter(s => s.roomId === id && s.status === 'expected' && s.from >= todayLocal()).sort(by('from'))[0];
  modal(`${sheetHead(`${T('Room')} ${r.no}`, [T(r.type || ''), r.floor ? T('Floor') + ' ' + r.floor : '', r.beds ? r.beds + ' ' + T('guests') : ''].filter(Boolean).join(' · '))}<div class="sheet-b stack">
    <div class="row-flex" style="gap:6px">${pill(T(ROOM_ST[st][0]), st === 'ready' ? 'good' : st === 'cleaning' ? 'warn' : st === 'occupied' ? 'primary' : '')}</div>
    ${g ? `<div class="card pad"><b>${esc(g.guest)}</b><div class="small muted">${esc(g.phone || '')} · ${fmtShort(g.from)} → ${fmtShort(g.to)}${g.eventId && evById(g.eventId) ? ' · ' + esc(evById(g.eventId).title) : ''}</div>${edit ? `<div class="row-flex" style="margin-top:8px">${g.status === 'expected' ? `<button class="btn sm primary" onclick="A.stayMove('${g.id}','in')">${ic('door')} ${T('Check in')}</button>` : `<button class="btn sm" onclick="A.stayMove('${g.id}','out')">${ic('logout')} ${T('Check out')}</button>`}</div>` : ''}</div>` : next ? `<div class="small muted">${T('Next guest')}: <b>${esc(next.guest)}</b> · ${fmtShort(next.from)}</div>` : ''}
    ${edit ? `<div class="tiles">${Object.entries(ROOM_ST).filter(([k]) => k !== st).map(([k, [l, c]]) => `<button class="tile" onclick="A.roomStatus('${id}','${k}')">${ibox(k === 'ready' ? 'check' : k === 'cleaning' ? 'sparkle' : k === 'occupied' ? 'user' : 'wrench', c)}<span>${T(l)}</span></button>`).join('')}<button class="tile" onclick="A.closeModal();setTimeout(()=>A.roomForm('${id}'),40)">${ibox('edit', '#2563EB')}<span>${T('Edit room')}</span></button></div>` : ''}</div>`);
};
A.roomStatus = async (id, st) => { const r = roomById(id); try { await save('rooms', { ...r, status: st, statusAt: nowAt() }, `Room ${r.no}: ${ROOM_ST[st][0]}`); A.closeModal(); toast(`${T('Room')} ${r.no}: ${T(ROOM_ST[st][0])}`); render(); } catch (e) { toast(e.message, 'bad'); } };

/* ---------- guests in rooms ---------- */
function stayRow(s, act) {
  const r = roomById(s.roomId); const e = s.eventId ? evById(s.eventId) : null; const edit = can('venue', 2);
  const act_ = act || (s.status === 'expected' ? 'in' : s.status === 'in' ? 'out' : '');
  return `<div class="row">${ibox(s.status === 'in' ? 'bed' : s.status === 'out' ? 'check' : 'door', s.status === 'in' ? '#2563EB' : s.status === 'out' ? '#94A3B8' : '#D97706', 'sm')}<div class="main-col"><b>${esc(s.guest)}</b><div class="sub">${r ? T('Room') + ' ' + esc(r.no) : `<span class="warn-t">${T('No room yet')}</span>`} · ${fmtShort(s.from)} → ${fmtShort(s.to)}${s.adults ? ' · ' + s.adults + ' ' + T('guests') : ''}</div>${e ? `<div class="tiny muted">${esc(e.title)}</div>` : ''}</div>
    ${edit ? `<div class="row-flex" style="gap:4px">${act_ === 'in' ? `<button class="btn sm primary" onclick="A.stayMove('${s.id}','in')">${T('Check in')}</button>` : act_ === 'out' ? `<button class="btn sm" onclick="A.stayMove('${s.id}','out')">${T('Check out')}</button>` : ''}<button class="icon-btn" style="width:34px;height:34px" aria-label="Edit" onclick="A.stayForm('${s.id}')">${ic('edit')}</button></div>` : ''}</div>`;
}
function guestsTab() {
  const f = S.filters.vgF || 'In house'; const t = todayLocal(); const q = (S.filters.vgQ || '').toLowerCase(); let list = col('stays').slice();
  const F = { 'In house': s => s.status === 'in', Arriving: s => s.status === 'expected' && s.from <= addDays(t, 1), Leaving: s => s.status === 'in' && s.to <= addDays(t, 1), Upcoming: s => s.status === 'expected', All: () => true };
  list = list.filter(F[f] || F.All); if (q) list = list.filter(s => [s.guest, s.phone, roomById(s.roomId)?.no, evById(s.eventId)?.title].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => String(a.from).localeCompare(String(b.from)));
  return `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="${esc(T('Search guest, room or booking'))}" value="${esc(S.filters.vgQ || '')}" oninput="clearTimeout(window._vq);window._vq=setTimeout(()=>A.setF('vgQ',this.value),350)"></div>${can('venue', 2) ? `<button class="btn primary" onclick="A.stayForm()">${ic('plus')} ${T('Guest')}</button>` : ''}</div>
  <div class="chips" style="margin-bottom:14px">${Object.keys(F).map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('vgF','${c}')">${T(c)} <span class="muted">${col('stays').filter(F[c]).length}</span></button>`).join('')}</div>
  <div class="card">${list.length ? `<div class="rows">${list.map(s => stayRow(s)).join('')}</div>` : empty('No guests here', 'Add guests from a booking’s Venue plan (rooming list) or with the Guest button.', '', 'bed', MOD.venue.c)}</div>`;
}
A.stayForm = (id, preset = {}) => {
  const s = id ? getById('stays', id) : { status: 'expected', adults: 2, ...preset }; const e = s.eventId ? evById(s.eventId) : null;
  const from = s.from || e?.date || todayLocal(); const to = s.to || addDays(e?.endDate || e?.date || todayLocal(), 1);
  const rooms = col('rooms').filter(r => r.id === s.roomId || (r.status !== 'blocked' && roomFree(r.id, from, to, id))).sort((a, b) => String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  const evs = col('events').filter(x => !['Cancelled', 'Closed'].includes(x.stage) && eventEnd(x) >= addDays(todayLocal(), -3)).sort(by('date'));
  formModal({ title: id ? 'Edit guest' : 'Guest in a room', sub: 'Rooms shown are free on these dates', fields: [
    { name: 'guest', label: 'Guest name', required: true, value: s.guest }, { name: 'phone', label: 'Mobile', type: 'tel', value: s.phone },
    { name: 'from', label: 'Check-in date', type: 'date', required: true, value: from }, { name: 'to', label: 'Check-out date', type: 'date', required: true, value: to },
    { name: 'roomId', label: 'Room', type: 'select', options: [['', 'Allot later'], ...rooms.map(r => [r.id, roomLabel(r)])], value: s.roomId || '' }, { name: 'adults', label: 'People', type: 'number', min: 1, value: s.adults },
    { name: 'eventId', label: 'Booking (optional)', type: 'select', options: [['', '—'], ...evs.map(x => [x.id, `${x.title} (${fmtShort(x.date)})`])], value: s.eventId || '' }, { name: 'notes', label: 'Notes', value: s.notes, placeholder: 'e.g. needs ground floor, VIP' }],
    left: id && can('venue', 3) ? `<button type="button" class="btn danger" onclick="A.delStay('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => {
      if (v.to <= v.from) throw new Error('Check-out must be after check-in');
      if (v.roomId && !roomFree(v.roomId, v.from, v.to, id)) throw new Error('This room is taken on these dates. Pick another room.');
      await save('stays', { ...(id ? s : { id: uid('st_'), status: 'expected' }), ...v, adults: +v.adults || 1 }, `${id ? 'Updated' : 'Added'} guest ${v.guest}`); toast('Saved'); render();
    } });
};
A.delStay = id => { const s = getById('stays', id); confirmBox(`Remove ${s.guest}?`, '', 'Remove', async () => { await removeRec('stays', id, `Removed guest ${s.guest}`); A.closeModal(); render(); }); };
A.stayMove = async (id, to) => {
  const s = getById('stays', id); const r = roomById(s.roomId);
  if (to === 'in' && !r) { toast('Allot a room first', 'warn'); A.stayForm(id); return; }
  try {
    await save('stays', { ...s, status: to, [to === 'in' ? 'inAt' : 'outAt']: nowAt() }, `${s.guest} checked ${to}`);
    if (r) await save('rooms', { ...r, status: to === 'in' ? 'occupied' : 'cleaning', statusAt: nowAt() });
    A.closeModal(); toast(to === 'in' ? `${s.guest}: ${T('checked in')}` : `${s.guest}: ${T('checked out. Room sent for cleaning.')}`); render();
  } catch (e) { toast(e.message, 'bad'); }
};

/* ---------- on a booking: Venue plan ---------- */
EV_TABS.venue = e => {
  const edit = can('bookings', 2) || can('venue', 2); const fns = (e.functions || []).slice().sort(fnSort);
  const stays = col('stays').filter(s => s.eventId === e.id).sort(by('guest')); const sp = col('spaces');
  const tasks = col('tasks').filter(t => t.eventId === e.id && t.area);
  return `<div class="stack">
  <div class="card"><div class="card-h"><div><h3>${T('Halls & lawns')}${info('vn-halls')}</h3><p>${T('Pick the spaces this booking uses. A hall already taken on these dates is marked.')}</p></div></div>
    <div class="hall-chips" style="padding:0 16px 14px">${sp.length ? sp.map(s => { const on = (e.spaceIds || []).includes(s.id); const busy = []; for (let d = e.date; d <= eventEnd(e); d = addDays(d, 1)) spaceBookings(s.id, d, e.id).forEach(x => { if (!busy.includes(x)) busy.push(x); });
      return `<button class="hall-chip ${on ? 'on' : ''} ${busy.length ? 'busy' : ''}" ${edit ? `onclick="A.toggleSpace('${e.id}','${s.id}')"` : 'disabled'}>${on ? ic('check') : ''} ${esc(s.name)}${s.seating ? ` <span class="tiny">${num(s.seating)}</span>` : ''}${busy.length ? ` <span class="tiny">· ${T('taken')}: ${esc(busy[0].title)}</span>` : ''}</button>`; }).join('') : `<span class="small muted">${T('No halls added yet.')}</span> ${can('venue', 2) ? `<button class="linkbtn" onclick="A.go('venue',{tab:'spaces'})">${T('Add halls')}</button>` : ''}`}</div></div>

  <div class="card"><div class="card-h"><div><h3>${T('Function sheet')}${info('vn-fsheet')}</h3><p>${T('Each function with time, hall, guests, setup, food and waiters. Share it with the team.')}</p></div>
    <div class="row-flex" style="gap:6px">${fns.length ? `<button class="btn sm" onclick="A.printFsheet('${e.id}')">${ic('print')} ${T('Print')}</button>${waBtn(fsheetText(e), '', 'Share')}` : ''}${edit ? `<button class="btn sm primary" onclick="A.fnForm('${e.id}')">${ic('plus')} ${T('Function')}</button>` : ''}</div></div>
    ${fns.length ? `<div class="rows">${fns.map(f => `<button class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.fnForm('${e.id}','${f.id}')"` : ''}><span class="timebox" style="--c:${evStyle(e)[1]}"><b>${esc(f.time || '—')}</b><span>${fmtShort(f.date)}</span></span><div class="main-col"><b>${esc(f.name || T('Function'))}</b><div class="sub">${[spaceById(f.spaceId)?.name, f.pax ? num(f.pax) + ' ' + T('pax') : '', T(f.setup || ''), f.meal && f.meal !== 'No food' ? T(f.meal) : ''].filter(Boolean).map(esc).join(' · ')}</div>${[f.menu, f.lights, f.decor].some(Boolean) ? `<div class="tiny muted">${[f.menu && T('Food') + ': ' + f.menu, f.lights && T('Lights') + ': ' + f.lights, f.decor && T('Decor') + ': ' + f.decor].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</div>${(f.waiters || waitersFor(f)) ? `<span class="pill">${f.waiters || waitersFor(f)} ${T('waiters')}</span>` : ''}</button>`).join('')}</div>`
    : `<div class="pad small muted" style="padding:0 16px 14px">${T('No function yet. Add Haldi, lunch, sangeet, wedding… one by one.')}</div>`}</div>

  <div class="card"><div class="card-h"><div><h3>${T('Rooms for guests')}${info('vn-rooming')}</h3><p>${stays.length} ${T('guests')} · ${stays.filter(s => s.roomId).length} ${T('with rooms')}${e.roomsNeeded ? ` · ${T('asked for')} ${e.roomsNeeded} ${T('rooms')}` : ''}</p></div>
    ${edit ? `<div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.roomingPaste('${e.id}')">${ic('users')} ${T('Rooming list')}</button>${stays.some(s => !s.roomId) ? `<button class="btn sm primary" onclick="A.autoRooms('${e.id}')">${ic('bolt')} ${T('Allot rooms')}</button>` : ''}</div>` : ''}</div>
    ${stays.length ? `<div class="rows">${stays.map(s => stayRow(s)).join('')}</div>` : `<div class="pad small muted" style="padding:0 16px 14px">${T('Paste the guest list from the family; the app gives each a free room.')}</div>`}</div>

  <div class="card"><div class="card-h"><div><h3>${T('Hospitality checklist')}${info('vn-hosp')}</h3><p>${T('Welcome, rooms, food, lights, decor, transport and security: every job with a person and progress.')}</p></div>
    <div class="row-flex" style="gap:6px">${tasks.length ? `<button class="btn sm" onclick="A.go('tasks')">${ic('pulse')} ${T('Live tracker')}</button>` : ''}${can('tasks', 2) ? `<button class="btn sm primary" onclick="A.hospForm('${e.id}')">${ic('plus')} ${tasks.length ? T('Add jobs') : T('Make checklist')}</button>` : ''}</div></div>
    ${tasks.length ? HOSP_AREAS.filter(a => tasks.some(t => t.area === a[0])).map(([k, l, i, c]) => { const ts = tasks.filter(t => t.area === k); const p = Math.round(sum(ts, t => +t.progress || 0) / ts.length);
      return `<details class="hosp-area"><summary><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap">${ibox(i, c, 'sm')}<b class="grow">${T(l)}</b><span class="tiny muted">${ts.filter(t => +t.progress >= 100).length}/${ts.length}</span><b class="num">${p}%</b>${ic('chev', 'go')}</div>${prog(p)}</summary><div class="rows">${ts.map(taskRow).join('')}</div></details>`; }).join('')
      : `<div class="pad small muted" style="padding:0 16px 14px">${T('Make the checklist in one tap; then give each job to a person.')}</div>`}</div>
  </div>`;
};
A.toggleSpace = async (evId, sid) => {
  const e = evById(evId); const ids = new Set(e.spaceIds || []); const on = !ids.has(sid); on ? ids.add(sid) : ids.delete(sid);
  let busy = null; if (on) for (let d = e.date; d <= eventEnd(e); d = addDays(d, 1)) { const b = spaceBookings(sid, d, e.id); if (b.length) { busy = b[0]; break; } }
  try { await save('events', { ...e, spaceIds: [...ids] }, `${e.title}: ${on ? 'added' : 'removed'} ${spaceById(sid)?.name}`); if (busy) toast(`${T('Careful')}: ${spaceById(sid).name} ${T('is already booked for')} ${busy.title}`, 'warn'); render(); } catch (err) { toast(err.message, 'bad'); }
};
A.fnForm = (evId, fid) => {
  const e = evById(evId); const f = fid ? (e.functions || []).find(x => x.id === fid) : { date: e.date, pax: e.pax, setup: 'Round tables', meal: 'Dinner', spaceId: (e.spaceIds || [])[0] || '' };
  const sp = col('spaces'); const days = []; for (let d = e.date; d <= eventEnd(e); d = addDays(d, 1)) days.push(d);
  formModal({ title: fid ? 'Edit function' : 'New function', sub: e.title, fields: [
    { name: 'name', label: 'Function', required: true, value: f.name, placeholder: 'e.g. Haldi, Lunch, Sangeet, Wedding', autofocus: !fid },
    { name: 'date', label: 'Date', type: days.length > 1 ? 'select' : 'date', options: days.map(d => [d, fmtDay(d)]), value: f.date },
    { name: 'time', label: 'From', type: 'time', value: f.time }, { name: 'end', label: 'Till', type: 'time', value: f.end },
    { name: 'spaceId', label: 'Hall / lawn', type: 'select', options: [['', '—'], ...sp.map(s => [s.id, s.name])], value: f.spaceId }, { name: 'pax', label: 'Guests (pax)', type: 'number', min: 0, value: f.pax },
    { name: 'setup', label: 'Setup', type: 'select', options: SETUPS, value: f.setup }, { name: 'meal', label: 'Food', type: 'select', options: MEALS, value: f.meal },
    { name: 'menu', label: 'Menu / counters', value: f.menu, placeholder: 'e.g. Rajasthani thali + 2 live counters', full: true },
    { name: 'waiters', label: 'Waiters (empty = suggested)', type: 'number', min: 0, value: f.waiters, hint: 'Suggested from guests and setup' }, { name: 'lights', label: 'Lights & sound', value: f.lights, placeholder: 'e.g. DJ, 2 mics, warm lights' },
    { name: 'decor', label: 'Decor', value: f.decor, placeholder: 'e.g. marigold theme, photo booth', full: true }, { name: 'notes', label: 'Notes for team', type: 'textarea', value: f.notes, full: true }],
    left: fid ? `<button type="button" class="btn danger" onclick="A.delFn('${evId}','${fid}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const fns = (e.functions || []).filter(x => x.id !== fid); fns.push({ ...(fid ? f : { id: uid('fn_') }), ...v, pax: +v.pax || 0, waiters: v.waiters === '' ? '' : +v.waiters || 0 });
      if (v.spaceId && !(e.spaceIds || []).includes(v.spaceId)) e.spaceIds = [...(e.spaceIds || []), v.spaceId];
      await save('events', { ...e, functions: fns.sort(fnSort) }, `${e.title}: function ${v.name}`); toast('Saved'); render(); } });
};
A.delFn = (evId, fid) => confirmBox('Delete this function?', '', 'Delete', async () => { const e = evById(evId); await save('events', { ...e, functions: (e.functions || []).filter(x => x.id !== fid) }); A.closeModal(); render(); });
function fsheetText(e) {
  return `${T('Function sheet')}: ${e.title}\n${fmtDate(e.date)}${e.endDate && e.endDate !== e.date ? ' – ' + fmtDate(e.endDate) : ''} · ${e.client}\n\n` + (e.functions || []).slice().sort(fnSort).map(f => `• ${fmtShort(f.date)} ${f.time || ''}${f.end ? '–' + f.end : ''} ${f.name}\n  ${[spaceById(f.spaceId)?.name, f.pax ? f.pax + ' pax' : '', f.setup, f.meal && f.meal !== 'No food' ? f.meal : ''].filter(Boolean).join(' · ')}${f.menu ? '\n  Food: ' + f.menu : ''}${(f.waiters || waitersFor(f)) ? '\n  Waiters: ' + (f.waiters || waitersFor(f)) : ''}${f.lights ? '\n  Lights & sound: ' + f.lights : ''}${f.decor ? '\n  Decor: ' + f.decor : ''}${f.notes ? '\n  Note: ' + f.notes : ''}`).join('\n\n');
}
A.printFsheet = evId => {
  const e = evById(evId); const st = settings(); const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', 'bad'); return; }
  const rows = (e.functions || []).slice().sort(fnSort).map(f => `<tr><td><b>${esc(fmtShort(f.date))}</b><br>${esc(f.time || '')}${f.end ? '–' + esc(f.end) : ''}</td><td><b>${esc(f.name || '')}</b>${f.notes ? `<div class="m">${esc(f.notes)}</div>` : ''}</td><td>${esc(spaceById(f.spaceId)?.name || '')}</td><td class="r">${f.pax || ''}</td><td>${esc(f.setup || '')}</td><td>${esc(f.meal && f.meal !== 'No food' ? f.meal : '')}${f.menu ? `<div class="m">${esc(f.menu)}</div>` : ''}</td><td class="r">${f.waiters || waitersFor(f) || ''}</td><td>${esc(f.lights || '')}</td><td>${esc(f.decor || '')}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(e.title)} function sheet</title><style>body{font:13px/1.45 system-ui,sans-serif;color:#111;margin:20px}h1{font-size:20px;margin:0}.top{display:flex;justify-content:space-between;border-bottom:3px solid #0F766E;padding-bottom:8px;margin-bottom:12px}.m{color:#555;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}th{background:#F0FDFA;font-size:12px}.r{text-align:right}@media print{button{display:none}}</style></head><body>
  <div class="top"><div><h1>${esc(st.bizName || '')}</h1><div class="m">${esc([st.address, st.city].filter(Boolean).join(', '))}</div></div><div style="text-align:right"><b>Function sheet</b><div>${esc(e.title)} · ${esc(e.client || '')}</div><div class="m">${fmtDate(e.date)}${e.endDate && e.endDate !== e.date ? ' – ' + fmtDate(e.endDate) : ''} · ${e.pax || ''} guests</div></div></div>
  <table><thead><tr><th>When</th><th>Function</th><th>Hall</th><th class="r">Pax</th><th>Setup</th><th>Food</th><th class="r">Waiters</th><th>Lights & sound</th><th>Decor</th></tr></thead><tbody>${rows}</tbody></table>
  ${e.notes ? `<p><b>Notes:</b> ${esc(e.notes)}</p>` : ''}<button onclick="print()" style="margin-top:14px;padding:10px 16px">Print / Save as PDF</button></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (x) { } }, 400);
};
A.roomingPaste = evId => {
  const e = evById(evId);
  modal(`<form class="form" onsubmit="A.saveRooming(event,'${evId}')" novalidate>${sheetHead('Rooming list', e.title)}<div class="sheet-b stack">
    ${fieldHTML({ name: 'list', label: 'One guest per line: name, mobile, people', type: 'textarea', rows: 8, placeholder: 'Ramesh Gupta, 9829012345, 2\nSunita Sharma, 9414011111, 3\nMama ji family, , 4' })}
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'from', label: 'Check-in', type: 'date', value: e.date })}${fieldHTML({ name: 'to', label: 'Check-out', type: 'date', value: addDays(eventEnd(e), 1) })}</div>
    ${fieldHTML({ name: 'roomsNeeded', label: 'Rooms the client asked for', type: 'number', min: 0, value: e.roomsNeeded || '' })}
    <label class="check"><input type="checkbox" name="auto" checked> <span>${T('Give each guest a free room now')}</span></label>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`);
};
A.saveRooming = (ev, evId) => {
  ev.preventDefault(); const v = readForm(ev.target); const auto = ev.target.auto.checked;
  withBtn(ev, async () => {
    const e = evById(evId); if (v.to <= v.from) throw new Error('Check-out must be after check-in');
    const lines = String(v.list || '').split('\n').map(x => x.trim()).filter(Boolean); if (!lines.length && !v.roomsNeeded) throw new Error('Write at least one guest');
    for (const ln of lines.slice(0, 300)) { const [g, p, n] = ln.split(/[,;\t]/).map(x => (x || '').trim()); if (!g) continue; await save('stays', { id: uid('st_'), eventId: evId, guest: g.slice(0, 80), phone: (p || '').replace(/[^\d+]/g, ''), adults: +n || 2, from: v.from, to: v.to, status: 'expected' }); }
    if (+v.roomsNeeded !== +(e.roomsNeeded || 0)) await save('events', { ...e, roomsNeeded: +v.roomsNeeded || 0 });
    A.closeModal(); logAct(`Rooming list for ${e.title}: ${lines.length} guests`);
    if (auto) await A.autoRooms(evId, true); else { toast('Saved'); render(); }
  });
};
A.autoRooms = async (evId, quiet) => {
  const need = col('stays').filter(s => s.eventId === evId && !s.roomId && s.status !== 'out').sort((a, b) => (+b.adults || 0) - (+a.adults || 0)); let done = 0;
  const rooms = col('rooms').filter(r => r.status !== 'blocked').sort((a, b) => String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  for (const s of need) { const r = rooms.find(r => (+r.beds || 2) >= Math.min(+s.adults || 1, 3) && roomFree(r.id, s.from, s.to)) || rooms.find(r => roomFree(r.id, s.from, s.to)); if (!r) break; await save('stays', { ...s, roomId: r.id }); done++; }
  toast(done === need.length ? `${done} ${T('rooms allotted')}` : `${done} ${T('rooms allotted')} · ${need.length - done} ${T('guests still without a room (not enough free rooms)')}`, done === need.length ? '' : 'warn'); render();
};
function hospItems(e) {
  const fns = (e.functions || []).slice().sort(fnSort); const st = col('stays').filter(s => s.eventId === e.id).length || +e.roomsNeeded || 0;
  return {
    welcome: ['Welcome board & flowers at the entrance', 'Reception desk with guest list', 'Welcome drinks ready for arrivals'],
    rooms: st ? [`Rooms ready for ${st} guest families (clean, towels, toiletries)`, 'Welcome kit and water in every room', 'Room keys ready at reception', 'Housekeeping after check-out'] : ['Bridal / green room ready', 'Washrooms clean every 2 hours'],
    food: fns.filter(f => f.meal && f.meal !== 'No food').flatMap(f => [`${f.name}: ${f.meal} for ${f.pax || e.pax} pax at ${f.time || '—'}`, `${f.name}: ${f.waiters || waitersFor(f)} waiters briefed and in uniform`]).concat(fns.length ? [] : [`Food for ${e.pax} pax`, 'Waiters briefed and in uniform'], ['Counters, crockery and water stations set']),
    lights: ['Lights tested in hall and entrance', 'Sound & mic check before guests arrive', 'Generator / power backup ready'],
    decor: ['Stage & backdrop ready', ...fns.map(f => `${f.name}: ${f.setup || 'setup'} done${f.decor ? ' (' + f.decor + ')' : ''}`), 'Entrance & photo point'],
    transport: ['Guest pickups from station / airport', 'Parking attendants on duty', 'Luggage help at arrival'],
    security: ['Security guards on duty', 'Parking plan ready', 'Fire exits clear and marked']
  };
}
A.hospForm = evId => {
  const e = evById(evId); const items = hospItems(e); const have = new Set(col('tasks').filter(t => t.eventId === evId).map(t => t.title));
  modal(`<form class="form" onsubmit="A.saveHosp(event,'${evId}')" novalidate>${sheetHead('Hospitality checklist', e.title)}<div class="sheet-b stack">
    <p class="small muted">${T('Untick what you do not need. Jobs go to the Live tracker; give each job to a person there.')}</p>
    ${HOSP_AREAS.map(([k, l, i, c]) => `<div class="hosp-pick"><div class="row-flex" style="gap:8px">${ibox(i, c, 'sm')}<b>${T(l)}</b></div>${items[k].map((x, j) => `<label class="check"><input type="checkbox" name="h_${k}_${j}" ${have.has(x) ? 'disabled' : 'checked'}> <span>${esc(x)}${have.has(x) ? ` <span class="tiny muted">(${T('already added')})</span>` : ''}</span></label>`).join('')}</div>`).join('')}
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Add jobs')}</button></footer></form>`, { wide: true });
};
A.saveHosp = (ev, evId) => {
  ev.preventDefault(); const f = ev.target;
  withBtn(ev, async () => {
    const e = evById(evId); const items = hospItems(e); let n = 0;
    for (const [k] of HOSP_AREAS) for (let j = 0; j < items[k].length; j++) { const box = f[`h_${k}_${j}`]; if (box && box.checked && !box.disabled) { await save('tasks', { id: uid('t_'), eventId: evId, title: items[k][j], area: k, progress: 0, assignee: '' }); n++; } }
    A.closeModal(); logAct(`Hospitality checklist for ${e.title}: ${n} jobs`); toast(`${n} ${T('jobs added')}`); render();
  });
};

/* ---------- reminders in the bell ---------- */
EXTRA_ALERTS.push(() => {
  if (!isVenue() || !can('venue')) return [];
  const out = []; const t = todayLocal();
  const clean = col('rooms').filter(r => r.status === 'cleaning'); if (clean.length) out.push({ tag: 'Rooms', tone: 'warn', title: T(`${clean.length} rooms to clean`), sub: clean.slice(0, 8).map(r => r.no).join(', '), go: "A.go('venue',{tab:'rooms'})" });
  const arr = col('stays').filter(s => s.status === 'expected' && s.from <= t); if (arr.length) out.push({ tag: 'Rooms', tone: 'info', title: T(`${arr.length} guests arriving today`), sub: T(`${arr.filter(s => !s.roomId).length} without a room`), go: "A.go('venue',{tab:'guests',})" });
  col('events').filter(e => RESERVING.includes(e.stage) && daysBetween(t, e.date) >= 0 && daysBetween(t, e.date) <= 3 && !(e.functions || []).length).forEach(e => out.push({ tag: 'Confirm', tone: 'warn', title: `${T('Make the function sheet')}: ${e.title}`, sub: fmtDate(e.date), go: `A.go('event',{id:'${e.id}',tab:'venue'})` }));
  return out;
});
Object.assign(ALERT_STYLE, { Rooms: ['bed', '#0F766E'] });
