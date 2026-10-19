/* ================= Leads & sales (all event businesses: venue, tent, caterer, planner) =================
   Collection `leads` (module 'leads'). A lead comes from the business's own lead link (Meta lead ads through
   Make / Zapier / Pabbly, Google Forms through a small Apps Script, the website, any form), from an Ads Manager
   CSV, or is typed by a sales executive. Every call / WhatsApp / visit is logged with the client's reply in
   short; the app suggests the next follow-up message for that client and shows which dates are booked,
   which have quotations running and which leads convert. */

const LEAD_ST = ['New', 'Contacted', 'Site visit', 'Quoted', 'Negotiation', 'Won', 'Lost'];
const LEAD_OPEN = ['New', 'Contacted', 'Site visit', 'Quoted', 'Negotiation'];
const LEAD_TONE = { New: 'info', Contacted: '', 'Site visit': 'accent', Quoted: 'primary', Negotiation: 'warn', Won: 'good', Lost: 'bad' };
const LEAD_SRC = ['Meta / Facebook', 'Instagram', 'Google Form', 'Website', 'Google Ads', 'Phone call', 'WhatsApp', 'Walk-in', 'Referral', 'Wedding portal', 'Other'];
const SRC_COLOR = { 'Meta / Facebook': '#1877F2', Instagram: '#D6249F', 'Google Form': '#7248B9', Website: '#0F766E', 'Google Ads': '#EA4335', 'Phone call': '#0B9B68', WhatsApp: '#16A34A', 'Walk-in': '#D97706', Referral: '#DB2777', 'Wedding portal': '#9333EA', Other: '#64748B' };
const OUTCOMES = [['interested', 'Interested', 'Contacted', 2], ['no_answer', 'Did not pick up', '', 0.17], ['call_later', 'Asked to call later', 'Contacted', 1],
  ['wants_quote', 'Wants a quotation', 'Quoted', 1], ['visit_planned', 'Site visit fixed', 'Site visit', 0], ['budget', 'Budget is a problem', 'Negotiation', 2],
  ['comparing', 'Comparing other options', 'Negotiation', 2], ['date_issue', 'Date not free / date changed', 'Contacted', 1],
  ['confirmed', 'Ready to book', 'Won', 0], ['booked_else', 'Booked somewhere else', 'Lost', 0], ['not_interested', 'Not interested', 'Lost', 0]];
const OUT = Object.fromEntries(OUTCOMES.map(o => [o[0], o]));
const LOST_REASONS = ['Budget', 'Booked elsewhere', 'Date not available', 'No response', 'Plan cancelled', 'Other'];
const LOG_ICON = { call: ['phone', '#0B9B68'], whatsapp: ['wa', '#16A34A'], visit: ['pin', '#D97706'], quote: ['receipt', '#2563EB'], note: ['edit', '#64748B'], lead: ['sparkle', '#7C3AED'], status: ['check', '#0F766E'] };

/* ---------- reading a lead from any form (same rules as api/lead.js on the server) ---------- */
const LEAD_KEYS = {
  name: ['fullname', 'name', 'yourname', 'clientname', 'customername', 'naam', 'firstname'], last: ['lastname', 'surname'],
  phone: ['phonenumber', 'phone', 'mobile', 'mobilenumber', 'mobileno', 'contactnumber', 'contactno', 'whatsappnumber', 'whatsapp', 'phoneno', 'contact'],
  email: ['email', 'emailaddress', 'emailid', 'mail'],
  eventDate: ['eventdate', 'weddingdate', 'functiondate', 'dateofevent', 'dateoffunction', 'preferreddate', 'bookingdate', 'date'],
  guests: ['guests', 'guestcount', 'noofguests', 'numberofguests', 'pax', 'expectedguests', 'headcount', 'guest'],
  eventType: ['eventtype', 'typeofevent', 'occasion', 'functiontype', 'event', 'function'],
  budget: ['budget', 'yourbudget', 'approxbudget', 'budgetrange'], city: ['city', 'location', 'yourcity', 'venuecity'],
  message: ['message', 'comments', 'comment', 'requirement', 'requirements', 'details', 'anymessage', 'query', 'notes', 'yourmessage'],
  source: ['source', 'platform', 'leadsource'], campaign: ['campaignname', 'campaign', 'adname', 'adsetname'], form: ['formname', 'form'],
  extId: ['leadgenid', 'leadid', 'id'], createdTime: ['createdtime', 'timestamp', 'submittedat']
};
const LEAD_FUZZY = { phone: /phone|mobile|whatsapp|contact/, name: /name/, eventDate: /date|when|tarikh/, guests: /guest|pax/, email: /mail/, eventType: /event|occasion|function/ };
const nkey = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
function flattenLead(b) {
  const o = {}; if (!b || typeof b !== 'object') return o;
  if (Array.isArray(b.field_data)) b.field_data.forEach(f => { if (f && f.name) o[f.name] = (f.values || [])[0]; });
  if (b.namedValues && typeof b.namedValues === 'object') Object.entries(b.namedValues).forEach(([k, v]) => { o[k] = Array.isArray(v) ? v.join(', ') : v; });
  Object.entries(b).forEach(([k, v]) => {
    if (k === 'field_data' || k === 'namedValues' || k === 'key') return;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.entries(v).forEach(([k2, v2]) => { if (v2 == null || typeof v2 !== 'object') o[k2] = v2; });
    else if (Array.isArray(v)) o[k] = v.filter(x => typeof x !== 'object').join(', '); else o[k] = v;
  });
  return o;
}
function parseDateAny(v) {
  const s = String(v || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  const t = Date.parse(s); if (!isNaN(t)) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  return '';
}
function srcName(s, def) {
  const x = String(s || '').toLowerCase();
  if (/^(ig|instagram)/.test(x)) return 'Instagram'; if (/^(fb|facebook|meta)/.test(x)) return 'Meta / Facebook'; if (/google\s*form/.test(x)) return 'Google Form';
  const hit = LEAD_SRC.find(z => z.toLowerCase() === x); return hit || def || 'Other';
}
function normLead(raw, defSource) {
  const o = flattenLead(raw); const out = {}; const used = new Set(); const byNk = {};
  Object.keys(o).forEach(k => { if (o[k] != null && String(o[k]).trim() !== '' && byNk[nkey(k)] == null) byNk[nkey(k)] = k; });
  Object.entries(LEAD_KEYS).forEach(([f, keys]) => { for (const kk of keys) { if (byNk[kk] != null && !used.has(byNk[kk])) { out[f] = String(o[byNk[kk]]).trim(); used.add(byNk[kk]); break; } } });
  Object.entries(LEAD_FUZZY).forEach(([f, re]) => { if (out[f]) return; const k = Object.keys(o).find(x => !used.has(x) && re.test(nkey(x)) && String(o[x] ?? '').trim()); if (k) { out[f] = String(o[k]).trim(); used.add(k); } });
  if (out.last) { out.name = [out.name, out.last].filter(Boolean).join(' '); delete out.last; }
  if (!out.eventDate && /^\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}$/.test(String(out.eventType || '').trim())) { out.eventDate = out.eventType; out.eventType = ''; }
  if (out.extId && !/^[\w:-]{4,80}$/.test(out.extId)) delete out.extId;
  const extra = {}; Object.keys(o).forEach(k => { if (!used.has(k) && Object.keys(extra).length < 20 && String(o[k] ?? '').trim() !== '') extra[String(k).slice(0, 60)] = String(o[k]).slice(0, 200); });
  const digits = String(out.phone || '').replace(/[^\d+]/g, '');
  return {
    name: String(out.name || '').slice(0, 120), phone: digits.slice(-15), email: String(out.email || '').slice(0, 160), eventDate: parseDateAny(out.eventDate),
    guests: parseInt(String(out.guests || '').replace(/[^\d]/g, ''), 10) || '', eventType: String(out.eventType || '').slice(0, 60), budget: String(out.budget || '').slice(0, 60),
    city: String(out.city || '').slice(0, 80), message: String(out.message || '').slice(0, 1000), source: srcName(out.source, defSource), campaign: String(out.campaign || '').slice(0, 120),
    form: String(out.form || '').slice(0, 120), extId: out.extId || '', extra
  };
}

/* ---------- helpers ---------- */
const leadById = id => getById('leads', id);
const phone10 = p => String(p || '').replace(/\D/g, '').slice(-10);
const leadOpen = l => LEAD_OPEN.includes(l.status || 'New');
const leadDue = (l, end = todayLocal() + 'T23:59') => leadOpen(l) && (!l.nextAt ? (l.status || 'New') === 'New' : String(l.nextAt) <= end);
const leadLate = l => leadOpen(l) && l.nextAt && String(l.nextAt) < nowAt();
const leadPill = l => pill(l.status || 'New', LEAD_TONE[l.status || 'New']);
const srcPill = s => `<span class="src-pill" style="--c:${SRC_COLOR[s] || '#64748B'}">${esc(T(s || 'Other'))}</span>`;
const salesPeople = () => S.members.filter(m => m.userId && (m.role === 'owner' || (S.roles[m.role]?.perms?.leads || m.perms?.leads || 0) >= 2 || m.role === 'manager' || m.role === 'sales'));
const memberName = uid_ => S.members.find(m => m.userId === uid_)?.name || '';
const isMineLead = l => !l.assignedTo || l.assignedTo === S.user?.id;
const leadAge = l => { const t = +l.created || Date.parse(l.createdAt || '') || 0; if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
const LEAD_WHEN = [['2h', 'In 2 hours', () => isoIn(2)], ['eve', 'This evening', () => todayLocal() + 'T18:00'], ['tom', 'Tomorrow', () => addDays(todayLocal(), 1) + 'T11:00'], ['3d', 'In 3 days', () => addDays(todayLocal(), 3) + 'T11:00'], ['1w', 'Next week', () => addDays(todayLocal(), 7) + 'T11:00']];
function isoIn(h) { const d = new Date(Date.now() + h * 36e5); return todayLocal(d) + 'T' + d.toTimeString().slice(0, 5); }
function nextFor(outcome) { const h = OUT[outcome]?.[3]; if (h === 0 || h == null) return ''; return h < 1 ? isoIn(Math.round(h * 24)) : addDays(todayLocal(), Math.round(h)) + 'T11:00'; }

/* ---------- list ---------- */
V.leads = () => {
  const tab = S.params.tab || 'list'; const all = col('leads');
  const due = all.filter(l => leadDue(l)); const fresh = all.filter(l => (l.status || 'New') === 'New');
  const quoting = all.filter(l => ['Quoted', 'Negotiation'].includes(l.status));
  const m0 = todayLocal().slice(0, 7); const wonM = all.filter(l => l.status === 'Won' && String(l.wonAt || '').slice(0, 7) === m0);
  const tabs = [['list', 'Leads', 0], ['today', 'Follow up today', due.length], ['dates', 'Dates'], ['report', 'Report'], ...(can('leads', 3) ? [['connect', 'Get leads automatically']] : [])];
  const head = pageHead('Leads & sales', 'Every enquiry from ads, forms, calls and walk-ins in one place', can('leads', 2) ? `<button class="btn primary" onclick="A.leadForm()">${ic('plus')} New lead</button>` : '') +
    `<div class="today-strip"><div><b>${fresh.length}</b><span>New</span></div><div><b>${due.length}</b><span>Follow up today</span></div><div><b>${quoting.length}</b><span>Quotes running</span></div><div><b>${wonM.length}</b><span>Won this month</span></div></div>
    <div class="tabs">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('ld-' + tab)}</div>`;
  if (tab === 'today') return head + leadsToday(due);
  if (tab === 'dates') return head + leadDates();
  if (tab === 'report') return head + leadReport();
  if (tab === 'connect' && can('leads', 3)) return head + leadConnect();
  return head + leadList(all);
};
function leadRow(l) {
  const late = leadLate(l);
  return `<button class="row click lead-row" onclick="A.go('lead',{id:'${l.id}'})"><div class="avatar" style="background:${SRC_COLOR[l.source] || '#64748B'}1f;color:${SRC_COLOR[l.source] || '#334155'}">${esc(initials(l.name || '?'))}</div>
    <div class="main-col"><b>${esc(l.name || l.phone || 'No name')}</b><div class="sub">${[l.eventType ? esc(T(l.eventType)) : '', l.eventDate ? fmtShort(l.eventDate) : '', l.guests ? num(l.guests) + ' ' + T('guests') : ''].filter(Boolean).join(' · ') || esc(l.phone || '')}</div>
    <div class="tiny row-flex" style="gap:6px;margin-top:3px">${srcPill(l.source)}${l.nextAt && leadOpen(l) ? `<span class="${late ? 'bad-t' : 'muted'}">${ic('clock')} ${atText(l.nextAt)}</span>` : (l.status || 'New') === 'New' ? `<span class="muted">${T(leadAge(l) + ' ago')}</span>` : ''}${l.assignedTo ? `<span class="muted">${ic('user')} ${esc(memberName(l.assignedTo))}</span>` : ''}</div></div>
    ${leadPill(l)}${ic('chev', 'go')}</button>`;
}
function leadList(all) {
  const f = S.filters.ldF || 'Open'; const src = S.filters.ldSrc || ''; const q = (S.filters.ldQ || '').toLowerCase(); const mine = S.filters.ldMine;
  let list = all.slice();
  if (f === 'Open') list = list.filter(leadOpen); else if (f !== 'All') list = list.filter(l => (l.status || 'New') === f);
  if (src) list = list.filter(l => l.source === src);
  if (mine) list = list.filter(l => l.assignedTo === S.user?.id);
  if (q) list = list.filter(l => [l.name, l.phone, l.email, l.eventType, l.city, l.campaign].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => (leadLate(b) - leadLate(a)) || ((b.status === 'New') - (a.status === 'New')) || String(a.nextAt || '9').localeCompare(String(b.nextAt || '9')) || (+b.created || 0) - (+a.created || 0));
  const srcs = [...new Set(all.map(l => l.source).filter(Boolean))];
  return `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="${esc(T('Search name, mobile or event'))}" value="${esc(S.filters.ldQ || '')}" oninput="clearTimeout(window._lq);window._lq=setTimeout(()=>A.setF('ldQ',this.value),350)"></div>
    ${srcs.length > 1 ? `<select class="inline-in" aria-label="Source" onchange="A.setF('ldSrc',this.value)"><option value="">${T('All sources')}</option>${srcs.map(s => `<option value="${esc(s)}" ${s === src ? 'selected' : ''}>${esc(T(s))}</option>`).join('')}</select>` : ''}</div>
  <div class="chips" style="margin-bottom:14px">${['Open', ...LEAD_ST, 'All'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('ldF','${c}')">${T(c)}${c !== 'All' && c !== 'Open' ? ` <span class="muted">${all.filter(l => (l.status || 'New') === c).length}</span>` : ''}</button>`).join('')}${S.user ? `<button class="chip ${mine ? 'on' : ''}" onclick="A.setF('ldMine',${!mine})">${ic('user')} ${T('Mine')}</button>` : ''}</div>
  <div class="card">${list.length ? `<div class="rows">${list.slice(0, 300).map(leadRow).join('')}</div>` : empty(all.length ? 'Nothing here' : 'No leads yet', all.length ? 'Change the filter above.' : 'Add a lead by hand, upload your Facebook / Instagram leads file, or connect your ads and Google Form so leads come in by themselves.', all.length ? '' : `${can('leads', 2) ? `<button class="btn primary" onclick="A.leadForm()">${ic('plus')} New lead</button>` : ''}${can('leads', 3) ? `<button class="btn" onclick="A.setP('tab','connect')">${ic('bolt')} Get leads automatically</button>` : ''}`, 'megaphone', MOD.leads.c)}</div>`;
}
function leadsToday(due) {
  const list = due.slice().sort((a, b) => String(a.nextAt || '').localeCompare(String(b.nextAt || '')));
  return `<p class="small muted" style="margin:0 0 12px">${T('New leads and follow-ups due till tonight. Send the suggested message, then tap Update to note what the client said.')}</p>
  <div class="stack-sm">${list.map(l => { const m = leadMsgs(l)[0]; const p = phone10(l.phone);
    return `<div class="card pad lead-today ${leadLate(l) ? 'late' : ''}"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><button class="linkbtn" style="text-align:left;min-width:0" onclick="A.go('lead',{id:'${l.id}'})"><b style="font-size:16px">${esc(l.name || l.phone)}</b><div class="small muted">${[l.eventType ? esc(T(l.eventType)) : '', l.eventDate ? fmtShort(l.eventDate) : '', l.guests ? num(l.guests) + ' ' + T('guests') : ''].filter(Boolean).join(' · ')}</div></button>${leadPill(l)}</div>
      ${l.lastOutcome ? `<div class="tiny muted" style="margin-top:4px">${T('Last')}: ${esc(T(OUT[l.lastOutcome]?.[1] || ''))}${l.lastNote ? ' · “' + esc(String(l.lastNote).slice(0, 90)) + '”' : ''}</div>` : ''}
      <div class="msg-preview">${esc(m.text)}</div>
      <div class="row-flex" style="gap:6px">${p ? `<a class="btn sm" href="tel:${p}" onclick="A.leadQuickLog('${l.id}','call')">${ic('phone')} Call</a><a class="btn sm wa" target="_blank" rel="noopener" href="${esc(waLink(m.text, p))}" onclick="A.leadQuickLog('${l.id}','whatsapp')">${ic('wa')} WhatsApp</a>` : ''}${can('leads', 2) ? `<button class="btn sm primary" onclick="A.leadLog('${l.id}')">${ic('edit')} Update</button>` : ''}</div></div>`; }).join('') || `<div class="card">${empty('All caught up', 'No follow-up is due today.', '', 'check', '#0B9B68')}</div>`}</div>`;
}

/* ---------- one lead ---------- */
V.lead = () => {
  const l = leadById(S.params.id); if (!l) return pageHead('Lead', '', '', "A.go('leads')") + empty('Lead not found', 'It may have been deleted.');
  const p = phone10(l.phone); const edit = can('leads', 2); const si = LEAD_ST.indexOf(l.status || 'New');
  const msgs = leadMsgs(l); const ev = l.eventId ? evById(l.eventId) : null;
  const clash = l.eventDate ? col('events').filter(e => RESERVING.includes(e.stage) && e.date <= l.eventDate && eventEnd(e) >= l.eventDate) : [];
  const log = (l.log || []).slice().reverse();
  return `<button class="back" onclick="A.go('leads')">${ic('back')} Leads</button>
  <div class="card pad lead-head"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar" style="width:52px;height:52px;font-size:18px;background:${SRC_COLOR[l.source] || '#64748B'}1f;color:${SRC_COLOR[l.source] || '#334155'}">${esc(initials(l.name || '?'))}</div>
    <div style="min-width:0;flex:1"><h1 style="font:800 22px/1.2 var(--f-display)">${esc(l.name || l.phone || 'No name')}${info('lead')}</h1><div class="small muted">${esc(l.phone || '')}${l.email ? ' · ' + esc(l.email) : ''}</div><div class="row-flex" style="gap:6px;margin-top:6px">${leadPill(l)}${srcPill(l.source)}${l.campaign ? `<span class="pill">${esc(l.campaign)}</span>` : ''}</div></div>
    ${edit ? `<button class="icon-btn" aria-label="Edit lead" onclick="A.leadForm('${l.id}')">${ic('edit')}</button>` : ''}</div>
    <div class="stepper lead-steps" style="margin-top:12px">${LEAD_ST.slice(0, 6).map((s, i) => `<button class="step ${l.status === 'Lost' ? '' : i < si ? 'done' : i === si ? 'cur' : ''}" ${edit ? `onclick="A.leadStatus('${l.id}','${s}')"` : 'disabled'}><i></i>${T(s)}</button>`).join('')}</div>
    <div class="row-flex" style="gap:6px;margin-top:10px">${p ? `<a class="btn sm" href="tel:${p}" onclick="A.leadQuickLog('${l.id}','call')">${ic('phone')} Call</a>${waBtn('', p, 'WhatsApp')}` : ''}${edit ? `<button class="btn sm primary" onclick="A.leadLog('${l.id}')">${ic('edit')} Update after talking</button>` : ''}
      ${edit && l.status !== 'Won' ? `<button class="btn sm" onclick="A.leadWon('${l.id}')">${ic('check')} Won: make booking</button>` : ''}${edit && leadOpen(l) ? `<button class="btn sm ghost danger" onclick="A.leadLost('${l.id}')">${T('Lost')}</button>` : ''}</div></div>
  ${clash.length && leadOpen(l) ? `<div class="banner warn" style="margin-bottom:12px">${ic('calendar')}<span><b>${fmtDate(l.eventDate)}</b>: ${T('already booked for')} ${clash.map(e => esc(e.title)).join(', ')}${typeof venueClashText === 'function' ? venueClashText(l.eventDate) : ''}</span></div>` : ''}
  ${l.nextAt && leadOpen(l) ? `<div class="banner ${leadLate(l) ? 'bad' : ''}" style="margin-bottom:12px">${ic('clock')}<span>${T('Next follow-up')}: <b>${atText(l.nextAt)}</b></span></div>` : ''}
  <div class="split">
    <div class="stack">
      <div class="card"><div class="card-h"><div><h3>${T('Suggested message')}${info('lead-msg')}</h3><p>${T('Made for this client from their last reply. Edit before sending if you like.')}</p></div></div>
        <div class="sheet-b stack-sm" style="padding-top:4px">${msgs.map((m, i) => `<div class="msg-card"><div class="eyebrow">${esc(T(m.label))}</div><textarea id="lm${i}" rows="4" class="msg-edit">${esc(m.text)}</textarea>
          <div class="row-flex" style="gap:6px">${p ? `<button class="btn sm wa" onclick="A.leadSend('${l.id}',${i})">${ic('wa')} Send on WhatsApp</button>` : ''}<button class="btn sm" onclick="A.copy(document.getElementById('lm${i}').value)">${ic('copy')} Copy</button></div></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>${T('What happened so far')}</h3></div><div class="timeline-s">${log.map(x => { const [i, c] = LOG_ICON[x.type] || LOG_ICON.note; return `<div class="tl-row">${ibox(i, c, 'sm')}<div class="main-col"><div class="small"><b>${esc(T(x.type === 'lead' ? 'Lead came in' : OUT[x.outcome]?.[1] || ({ call: 'Called', whatsapp: 'WhatsApp sent', visit: 'Site visit', quote: 'Quotation', note: 'Note', status: 'Status changed' })[x.type] || 'Note'))}</b>${x.status ? ' → ' + esc(T(x.status)) : ''}${x.amount ? ' · ' + inr(x.amount) : ''}</div>${x.text ? `<div class="pre small">${esc(x.text)}</div>` : ''}<div class="tiny muted">${esc(x.by || '')} · ${atText(x.at)}</div></div></div>`; }).join('') || `<div class="small muted" style="padding:0 16px 14px">${T('Nothing yet.')}</div>`}</div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h3>${T('Details')}</h3></div><div class="sheet-b" style="padding-top:8px"><table class="tbl"><tbody>
        <tr><td class="muted">${T('Event')}</td><td>${esc(T(l.eventType || '—'))}</td></tr>
        <tr><td class="muted">${T('Date')}</td><td>${l.eventDate ? fmtDay(l.eventDate) : '—'}</td></tr>
        <tr><td class="muted">${T('Guests')}</td><td class="num">${l.guests ? num(l.guests) : '—'}</td></tr>
        <tr><td class="muted">${T('Budget')}</td><td>${esc(l.budget || '—')}</td></tr>
        ${l.quote ? `<tr><td class="muted">${T('Quotation')}</td><td class="num"><b>${inr(l.quote)}</b></td></tr>` : ''}
        <tr><td class="muted">${T('City')}</td><td>${esc(l.city || '—')}</td></tr>
        <tr><td class="muted">${T('Handled by')}</td><td>${esc(memberName(l.assignedTo) || T('Not assigned'))}</td></tr>
        <tr><td class="muted">${T('Came in')}</td><td>${l.createdAt ? atText(l.createdAt) : ''}${l.form ? ' · ' + esc(l.form) : ''}</td></tr>
        ${l.message ? `<tr><td class="muted">${T('Message')}</td><td class="pre">${esc(l.message)}</td></tr>` : ''}
        ${l.lostReason ? `<tr><td class="muted">${T('Lost because')}</td><td>${esc(T(l.lostReason))}</td></tr>` : ''}
        ${Object.entries(l.extra || {}).map(([k, v]) => `<tr><td class="muted" translate="no">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
      </tbody></table></div></div>
      ${ev ? `<button class="card pad row-flex click-card" style="flex-wrap:nowrap;text-align:left" onclick="A.go('event',{id:'${ev.id}'})">${ibox('calendar', MOD.bookings.c)}<div class="grow"><b>${esc(ev.title)}</b><div class="small muted">${fmtDate(ev.date)} · ${esc(T(ev.stage))}</div></div>${ic('chev', 'go')}</button>` : ''}
      ${lvl('leads') >= 3 ? `<button class="btn ghost danger" onclick="A.delLead('${l.id}')">${ic('trash')} ${T('Delete lead')}</button>` : ''}
    </div></div>`;
};

A.leadForm = (id, preset = {}) => {
  const l = id ? leadById(id) : { status: 'New', source: 'Phone call', eventType: 'Wedding', assignedTo: S.user?.id, ...preset };
  const people = salesPeople();
  formModal({
    title: id ? 'Edit lead' : 'New lead', sub: id ? l.name : 'Only the name or mobile is needed',
    fields: [
      { name: 'name', label: 'Client name', value: l.name, autofocus: !id }, { name: 'phone', label: 'Mobile (WhatsApp)', type: 'tel', value: l.phone, placeholder: '98290 12345' },
      { name: 'eventType', label: 'Event', type: 'select', options: EVENT_TYPES, value: l.eventType }, { name: 'eventDate', label: 'Event date', type: 'date', value: l.eventDate },
      { name: 'guests', label: 'Guests', type: 'number', min: 0, value: l.guests }, { name: 'budget', label: 'Budget', value: l.budget, placeholder: 'e.g. 5–7 lakh' },
      { name: 'source', label: 'Where did it come from', type: 'select', options: LEAD_SRC, value: l.source }, { name: 'campaign', label: 'Ad / campaign (optional)', value: l.campaign },
      { name: 'assignedTo', label: 'Handled by', type: 'select', options: [['', 'Not assigned'], ...people.map(m => [m.userId, m.name])], value: l.assignedTo || '' }, { name: 'city', label: 'City', value: l.city },
      { name: 'email', label: 'Email', type: 'email', value: l.email }, { name: 'nextAt', label: 'Next follow-up', type: 'datetime-local', value: l.nextAt || (id ? '' : isoIn(1)) },
      { name: 'message', label: 'What they asked for', type: 'textarea', value: l.message, full: true }
    ],
    left: '',
    onSubmit: async v => {
      if (!(v.name || '').trim() && !phone10(v.phone)) throw new Error('Write the client name or mobile');
      const p = phone10(v.phone);
      if (!id && p) { const dup = col('leads').find(x => phone10(x.phone) === p && leadOpen(x)); if (dup) { toast(T('This mobile is already a lead. Opening it.'), 'warn'); A.go('lead', { id: dup.id }); return; } }
      const base = id ? l : { id: uid('ld_'), created: Date.now(), createdAt: nowAt(), status: 'New', log: [{ at: nowAt(), type: 'lead', by: S.me?.name || '', text: v.message || '' }] };
      const rec = { ...base, ...v, name: (v.name || '').trim(), guests: v.guests === '' ? '' : +v.guests || '', eventDate: v.eventDate || '' };
      await save('leads', rec, `${id ? 'Updated' : 'Added'} lead ${rec.name || rec.phone}`); toast('Saved');
      if (!id) A.go('lead', { id: rec.id }); else render();
    }
  });
};
A.delLead = id => { const l = leadById(id); confirmBox('Delete this lead?', `${l.name || l.phone} and its history will be removed.`, 'Delete lead', async () => { await removeRec('leads', id, `Deleted lead ${l.name || l.phone}`); A.go('leads'); }); };

/* log what the client said; the status and next follow-up are suggested from the reply */
A.leadLog = (id, preset = {}) => {
  const l = leadById(id); if (!l) return;
  modal(`<form class="form" onsubmit="A.saveLeadLog(event,'${id}')" novalidate>${sheetHead('What did the client say?', l.name || l.phone)}<div class="sheet-b stack">
    <div class="field"><span>How did you talk</span><div class="chips">${[['call', 'Call'], ['whatsapp', 'WhatsApp'], ['visit', 'Site visit'], ['note', 'Note']].map(([k, t], i) => `<label class="chip-radio"><input type="radio" name="type" value="${k}" ${(preset.type || 'call') === k ? 'checked' : ''}><span>${ic(LOG_ICON[k][0])} ${t}</span></label>`).join('')}</div></div>
    <div class="field"><span>Client’s reply</span><div class="chips">${OUTCOMES.map(([k, t]) => `<label class="chip-radio"><input type="radio" name="outcome" value="${k}" onchange="A.leadOutcome(this)"><span>${t}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'text', label: 'In short, what did they say?', type: 'textarea', rows: 3, placeholder: 'e.g. Liked the lawn, wants 500 pax buffet, father will decide by Sunday' })}
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'status', label: 'Stage now', type: 'select', options: LEAD_ST, value: l.status || 'New' })}${fieldHTML({ name: 'quote', label: 'Quotation ₹ (if given)', type: 'number', min: 0, value: l.quote || '' })}</div>
    <div class="field"><span>Next follow-up</span><div class="chips">${LEAD_WHEN.map(([k, t]) => `<button type="button" class="chip" onclick="A.leadWhen(this,'${k}')">${t}</button>`).join('')}</div><input type="datetime-local" name="nextAt" value="${esc(l.nextAt && String(l.nextAt) > nowAt() ? l.nextAt : '')}"><small>Leave empty if no follow-up is needed</small></div>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`);
};
A.leadWhen = (el, k) => { el.form.nextAt.value = LEAD_WHEN.find(x => x[0] === k)[2](); };
A.leadOutcome = el => { const o = OUT[el.value]; const f = el.form; if (o?.[2]) f.status.value = o[2]; const n = nextFor(el.value); f.nextAt.value = n; };
A.saveLeadLog = (e, id) => {
  e.preventDefault(); const v = readForm(e.target);
  withBtn(e, async () => {
    const l = leadById(id); const st = v.status || l.status || 'New';
    if (!v.outcome && !(v.text || '').trim() && st === l.status) throw new Error('Pick the client’s reply or write what they said');
    if (st === 'Won') { A.closeModal(); await addLeadLog(l, { type: v.type, outcome: v.outcome, text: v.text, amount: +v.quote || 0 }, {}); return A.leadWon(id); }
    if (st === 'Lost') { A.closeModal(); await addLeadLog(l, { type: v.type, outcome: v.outcome, text: v.text }, {}); return A.leadLost(id); }
    await addLeadLog(l, { type: v.type || 'call', outcome: v.outcome || '', text: (v.text || '').trim(), status: st !== l.status ? st : '', amount: +v.quote && +v.quote !== +l.quote ? +v.quote : 0 }, { status: st, nextAt: v.nextAt || '', ...(+v.quote ? { quote: +v.quote } : {}) });
    A.closeModal(); toast('Saved'); render();
  });
};
async function addLeadLog(l, entry, patch) {
  const at = nowAt(); const log = [...(l.log || []), { at, by: S.me?.name || S.user?.name || '', ...entry }].slice(-200);
  const rec = { ...l, ...patch, log, lastAt: at };
  if (entry.outcome) { rec.lastOutcome = entry.outcome; rec.lastNote = entry.text || ''; }
  if (!rec.firstContactAt && ['call', 'whatsapp', 'visit'].includes(entry.type)) rec.firstContactAt = at;
  if (patch.status) rec.reached = { ...(l.reached || {}), [patch.status]: (l.reached || {})[patch.status] || at };
  if (patch.status && patch.status !== 'New' && rec.status === 'New') rec.status = patch.status;
  if (!rec.assignedTo && S.user?.id) rec.assignedTo = S.user.id;
  await save('leads', rec, `${l.name || l.phone}: ${entry.type}${entry.outcome ? ' · ' + (OUT[entry.outcome]?.[1] || '') : ''}`);
  return rec;
}
A.leadQuickLog = (id, type) => { const l = leadById(id); if (!l || !can('leads', 2)) return; setTimeout(() => addLeadLog(l, { type, text: '' }, (l.status || 'New') === 'New' ? { status: 'Contacted' } : {}).then(render).catch(() => { }), 300); };
A.leadSend = (id, i) => { const l = leadById(id); const text = document.getElementById('lm' + i)?.value || ''; window.open(waLink(text, phone10(l.phone)), '_blank', 'noopener'); if (can('leads', 2)) addLeadLog(l, { type: 'whatsapp', text: text.slice(0, 300) }, (l.status || 'New') === 'New' ? { status: 'Contacted' } : {}).then(render).catch(() => { }); };
A.leadStatus = async (id, st) => { const l = leadById(id); if (st === 'Won') return A.leadWon(id); try { await addLeadLog(l, { type: 'status', status: st }, { status: st }); render(); } catch (e) { toast(e.message, 'bad'); } };
A.leadLost = id => {
  const l = leadById(id);
  formModal({ title: 'Lost lead', sub: l.name, fields: [{ name: 'reason', label: 'Why', type: 'select', options: LOST_REASONS, value: 'Budget' }, { name: 'note', label: 'Note (optional)', type: 'textarea', full: true }], submit: 'Mark lost',
    onSubmit: async v => { await addLeadLog(l, { type: 'status', status: 'Lost', text: [T(v.reason), v.note].filter(Boolean).join(' · ') }, { status: 'Lost', lostReason: v.reason, lostAt: nowAt(), nextAt: '' }); toast('Marked lost'); render(); } });
};
A.leadWon = id => {
  const l = leadById(id);
  if (!can('bookings', 2)) { addLeadLog(l, { type: 'status', status: 'Won' }, { status: 'Won', wonAt: nowAt(), nextAt: '' }).then(() => { toast('Marked won'); render(); }); return; }
  formModal({ title: 'Won: make the booking', sub: l.name, fields: [
    { name: 'type', label: 'Event type', type: 'select', options: EVENT_TYPES, value: l.eventType || 'Wedding' }, { name: 'date', label: 'Date', type: 'date', required: true, value: l.eventDate || '' },
    { name: 'endDate', label: 'End date (multi-day)', type: 'date' }, { name: 'pax', label: 'Guests', type: 'number', min: 0, value: l.guests || '' },
    { name: 'budget', label: 'Package value ₹', type: 'number', min: 0, value: l.quote || '' }, { name: 'stage', label: 'Stage', type: 'select', options: ['Confirmed', 'Quoted'], value: 'Confirmed' }],
    submit: 'Make booking', onSubmit: async v => {
      if (!v.date) throw new Error('Pick the date');
      const ev = { id: uid('e_'), created: Date.now(), items: [], schedule: [], menu: { dishIds: [], pax: +v.pax || 0 }, dispatch: {}, client: l.name || l.phone, phone: l.phone || '', email: l.email || '', type: v.type, stage: v.stage, date: v.date, endDate: v.endDate || '', pax: +v.pax || 0, budget: +v.budget || 0, venue: '', notes: l.message || '', title: `${String(l.name || 'Client').split(' ').slice(-1)[0]} ${v.type}`, leadId: l.id, source: l.source };
      await save('events', ev, `Booking from lead ${l.name}`);
      await addLeadLog(l, { type: 'status', status: 'Won', amount: +v.budget || 0 }, { status: 'Won', wonAt: nowAt(), nextAt: '', eventId: ev.id, quote: +v.budget || l.quote || 0, eventDate: v.date });
      toast('Booking made'); A.go('event', { id: ev.id });
    } });
};

/* ---------- follow-up messages, made for each client ---------- */
function leadMsgs(l) {
  const st = settings(); const hi = I18N.lang === 'hi'; const biz = st.bizName || ''; const me = (S.me?.name || '').split(' ')[0];
  const n = (l.name || '').split(' ')[0] || (hi ? 'जी' : ''); const ji = n ? (hi ? `${n} जी` : `${n} ji`) : (hi ? 'जी' : 'ji');
  const ty = l.eventType ? (hi ? T(l.eventType) : l.eventType.toLowerCase()) : (hi ? 'फ़ंक्शन' : 'event');
  const d = l.eventDate ? (hi ? T(fmtDate(l.eventDate)) : fmtDate(l.eventDate)) : ''; const g = l.guests ? (hi ? `${l.guests} मेहमानों` : `${l.guests} guests`) : '';
  const q = l.quote ? inr(l.quote) : ''; const soon = l.eventDate && daysBetween(todayLocal(), l.eventDate) >= 0 && daysBetween(todayLocal(), l.eventDate) <= 75;
  const free = l.eventDate && !col('events').some(e => RESERVING.includes(e.stage) && e.date <= l.eventDate && eventEnd(e) >= l.eventDate);
  const out = l.lastOutcome || ((l.status || 'New') === 'New' ? 'new' : l.status === 'Quoted' ? 'wants_quote' : l.status === 'Site visit' ? 'visit_planned' : l.status === 'Negotiation' ? 'budget' : l.status === 'Won' ? 'confirmed' : l.status === 'Lost' ? 'booked_else' : 'interested');
  const sig = hi ? `\n\n– ${me ? me + ', ' : ''}${biz}` : `\n\n– ${me ? me + ', ' : ''}${biz}`;
  const forD = d ? (hi ? ` ${d} के` : ` on ${d}`) : '';
  const E = {
    new: [['First message', `Namaste ${ji}, thank you for your enquiry for your ${ty}${forD}${g ? ' for ' + g : ''}. I am from ${biz}. ${free ? 'Good news: the date is available right now. ' : ''}When can I call you for 2 minutes to understand what you need?`],
      ['Short', `Namaste ${ji}, ${biz} here. Got your enquiry${forD}. Can I share our packages and photos here on WhatsApp?`]],
    no_answer: [['After a missed call', `Namaste ${ji}, I tried calling you about your ${ty}${forD}. Please tell me a good time to call, or reply here and I will send all details on WhatsApp.`]],
    call_later: [['Call back as asked', `Namaste ${ji}, as you said, I am calling back about your ${ty}${forD}. Is this a good time? If not, just tell me when.`]],
    wants_quote: [['Quotation sent', `Namaste ${ji}, as discussed I have prepared the quotation for your ${ty}${forD}${g ? ' (' + g + ')' : ''}${q ? ': ' + q : ''}. Please have a look and tell me if you want any change. Happy to help.`],
      ['Gentle reminder', `Namaste ${ji}, did you get a chance to see our quotation${q ? ' (' + q + ')' : ''}? If anything is unclear or you want a different menu or setup, I can change it today.`],
      ['Invite for a visit', `Namaste ${ji}, seeing the place helps you decide better. You are welcome to visit any day between 11 am and 7 pm. Shall I book a time for you?`]],
    visit_planned: [['Visit reminder', `Namaste ${ji}, looking forward to your visit to ${biz}. ${st.address ? 'Address: ' + st.address + (st.city ? ', ' + st.city : '') + '. ' : ''}Please message me when you leave so I can be ready for you.`]],
    budget: [['Options in budget', `Namaste ${ji}, I understand the budget is important. I have made two more options for your ${ty}${g ? ' with ' + g : ''} that fit better. Shall I send them?`],
      ['Small token to hold the date', `Namaste ${ji}, to keep your date${d ? ' (' + d + ')' : ''} safe, you can block it with a small advance. The final package we can fix together later.`]],
    comparing: [['Why us', `Namaste ${ji}, while you compare, here is what our guests like most about ${biz}: clear pricing with no hidden charges, our own team for food and decor, and a manager with you on the day. Happy to answer any question.`],
      ['Date may go', `Namaste ${ji}, just to let you know: we are getting more enquiries for${d ? ' ' + d : ' your date'}. If you like us, a small advance keeps the date for you.`]],
    date_issue: [['Other dates', `Namaste ${ji}, I checked the dates. Shall I send you the nearest free dates around${d ? ' ' + d : ' your date'} so you can choose?`]],
    interested: [['Next step', `Namaste ${ji}, thank you for your time today. As discussed, I will share the details for your ${ty}${forD}. Shall we fix a visit or a call with the family to finalise?`],
      ['Date may go', `Namaste ${ji}, ${d ? d + ' is a busy date' : 'this season is busy'} and we are getting more enquiries. A small advance will keep the date for you.`]],
    confirmed: [['Thank you', `Namaste ${ji}, thank you for choosing ${biz} for your ${ty}${forD}! I will send the booking details and the advance receipt here. Our team will take good care of everything.`]],
    booked_else: [['Stay in touch', `Namaste ${ji}, thank you for considering ${biz}. Best wishes for your ${ty}! For any future function, we are always happy to help.`]],
    not_interested: [['Stay in touch', `Namaste ${ji}, thank you for your time. If your plans change or for any future function, just message us here.`]]
  };
  const H = {
    new: [['First message', `नमस्ते ${ji}, आपके${forD} ${ty}${g ? ' (' + g + ')' : ''} की पूछताछ के लिए धन्यवाद। मैं ${biz} से बात कर रहा/रही हूं। ${free ? 'अच्छी ख़बर: यह तारीख़ अभी ख़ाली है। ' : ''}आपकी ज़रूरत समझने के लिए 2 मिनट के लिए कब कॉल करूं?`],
      ['Short', `नमस्ते ${ji}, ${biz} से। आपकी पूछताछ मिली${d ? ' (' + d + ')' : ''}। क्या मैं यहीं व्हाट्सऐप पर हमारे पैकेज और फ़ोटो भेज दूं?`]],
    no_answer: [['After a missed call', `नमस्ते ${ji}, आपके${forD} ${ty} के बारे में कॉल किया था। बात करने का सही समय बता दीजिए, या यहीं जवाब दीजिए, मैं सारी जानकारी व्हाट्सऐप पर भेज दूंगा/दूंगी।`]],
    call_later: [['Call back as asked', `नमस्ते ${ji}, आपके कहे अनुसार आपके${forD} ${ty} के बारे में दोबारा संपर्क कर रहा/रही हूं। अभी बात हो सकती है? नहीं तो समय बता दीजिए।`]],
    wants_quote: [['Quotation sent', `नमस्ते ${ji}, बात के अनुसार आपके${forD} ${ty}${g ? ' (' + g + ')' : ''} का कोटेशन तैयार है${q ? ': ' + q : ''}। एक बार देख लीजिए, कोई बदलाव चाहिए तो बताइए।`],
      ['Gentle reminder', `नमस्ते ${ji}, क्या आपने हमारा कोटेशन${q ? ' (' + q + ')' : ''} देखा? कुछ समझ न आए या मेन्यू / सजावट में बदलाव चाहिए, तो मैं आज ही बदल दूंगा/दूंगी।`],
      ['Invite for a visit', `नमस्ते ${ji}, जगह देखकर फ़ैसला करना आसान होता है। आप किसी भी दिन सुबह 11 से शाम 7 बजे के बीच आ सकते हैं। आपके लिए समय तय कर दूं?`]],
    visit_planned: [['Visit reminder', `नमस्ते ${ji}, ${biz} में आपके आने का इंतज़ार है। ${st.address ? 'पता: ' + st.address + (st.city ? ', ' + st.city : '') + '। ' : ''}निकलते समय मैसेज कर दीजिए, ताकि हम तैयार रहें।`]],
    budget: [['Options in budget', `नमस्ते ${ji}, बजट ज़रूरी है, हम समझते हैं। आपके ${ty}${g ? ' (' + g + ')' : ''} के लिए दो और विकल्प बनाए हैं जो बजट में बेहतर बैठते हैं। भेज दूं?`],
      ['Small token to hold the date', `नमस्ते ${ji}, आपकी तारीख़${d ? ' (' + d + ')' : ''} सुरक्षित रखने के लिए थोड़ा एडवांस देकर इसे रोक सकते हैं। फ़ाइनल पैकेज बाद में साथ बैठकर तय कर लेंगे।`]],
    comparing: [['Why us', `नमस्ते ${ji}, आप तुलना कर रहे हैं, तो बता दें कि हमारे मेहमानों को ${biz} में सबसे ज़्यादा क्या पसंद आता है: साफ़ क़ीमत, कोई छिपा ख़र्च नहीं, खाने और सजावट की अपनी टीम, और उस दिन आपके साथ एक मैनेजर। कोई भी सवाल हो तो पूछिए।`],
      ['Date may go', `नमस्ते ${ji}, बता दें कि${d ? ' ' + d : ' आपकी तारीख़'} के लिए और भी पूछताछ आ रही है। अगर हम पसंद हैं, तो थोड़ा एडवांस देकर तारीख़ पक्की कर लीजिए।`]],
    date_issue: [['Other dates', `नमस्ते ${ji}, मैंने तारीख़ें देखीं।${d ? ' ' + d + ' के' : ''} आसपास की ख़ाली तारीख़ें भेज दूं, ताकि आप चुन सकें?`]],
    interested: [['Next step', `नमस्ते ${ji}, आज समय देने के लिए धन्यवाद। बात के अनुसार आपके${forD} ${ty} की जानकारी भेज रहा/रही हूं। परिवार के साथ फ़ाइनल करने के लिए विज़िट या कॉल रख लें?`],
      ['Date may go', `नमस्ते ${ji}, ${d ? d + ' व्यस्त तारीख़ है' : 'यह सीज़न व्यस्त है'} और पूछताछ बढ़ रही है। थोड़ा एडवांस देकर तारीख़ आपके लिए रोकी जा सकती है।`]],
    confirmed: [['Thank you', `नमस्ते ${ji}, आपके${forD} ${ty} के लिए ${biz} चुनने का बहुत धन्यवाद! बुकिंग की जानकारी और एडवांस की रसीद यहीं भेजता/भेजती हूं। हमारी टीम सब कुछ अच्छे से संभालेगी।`]],
    booked_else: [['Stay in touch', `नमस्ते ${ji}, ${biz} के बारे में सोचने के लिए धन्यवाद। आपके ${ty} के लिए शुभकामनाएं! आगे किसी भी फ़ंक्शन के लिए हम हमेशा हाज़िर हैं।`]],
    not_interested: [['Stay in touch', `नमस्ते ${ji}, समय देने के लिए धन्यवाद। प्लान बदले या आगे कोई फ़ंक्शन हो, तो यहीं मैसेज कर दीजिए।`]]
  };
  const set = (hi ? H : E); let list = (set[out] || set.interested).slice();
  if (soon && !['confirmed', 'booked_else', 'not_interested', 'comparing', 'interested'].includes(out) && leadOpen(l)) list.push((set.comparing || [])[1]);
  return list.filter(Boolean).slice(0, 3).map(([label, text]) => ({ label, text: text.replace(/\s+([,.?!।])/g, '$1').replace(/ {2,}/g, ' ') + sig }));
}

/* ---------- dates: booked, quotation running, enquiries ---------- */
function dateInfo(d) {
  const booked = col('events').filter(e => RESERVING.includes(e.stage) && e.date <= d && eventEnd(e) >= d);
  const quotedEv = col('events').filter(e => ['Quoted', 'Enquiry'].includes(e.stage) && e.date <= d && eventEnd(e) >= d);
  const quoted = col('leads').filter(l => ['Quoted', 'Negotiation'].includes(l.status) && l.eventDate === d);
  const enq = col('leads').filter(l => ['New', 'Contacted', 'Site visit'].includes(l.status || 'New') && l.eventDate === d);
  return { booked, quotedEv, quoted, enq };
}
function leadDates() {
  const m = S.filters.ldMonth || todayLocal().slice(0, 7); const [y, mo] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1); const days = new Date(y, mo, 0).getDate(); const pad = (first.getDay() + 6) % 7;
  const prev = new Date(y, mo - 2, 1), next = new Date(y, mo, 1); const ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const cells = []; for (let i = 0; i < pad; i++) cells.push('<div class="dc empty"></div>');
  for (let i = 1; i <= days; i++) {
    const d = `${m}-${String(i).padStart(2, '0')}`; const x = dateInfo(d); const past = d < todayLocal();
    cells.push(`<button class="dc ${past ? 'past' : ''} ${d === todayLocal() ? 'today' : ''} ${x.booked.length ? 'is-booked' : ''}" onclick="A.dateSheet('${d}')"><span class="dn">${i}</span>
      <span class="dts">${x.booked.length ? `<span class="dt b" title="${esc(T('Booked'))}">${x.booked.length}</span>` : ''}${x.quoted.length + x.quotedEv.length ? `<span class="dt q" title="${esc(T('Quotation running'))}">${x.quoted.length + x.quotedEv.length}</span>` : ''}${x.enq.length ? `<span class="dt e" title="${esc(T('Enquiry'))}">${x.enq.length}</span>` : ''}</span></button>`);
  }
  const monthName = first.toLocaleDateString(I18N.lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' });
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:10px"><button class="btn sm" onclick="A.setF('ldMonth','${ym(prev)}')">${ic('back')}</button><b style="font:800 18px var(--f-display)">${esc(monthName)}</b><button class="btn sm" onclick="A.setF('ldMonth','${ym(next)}')" aria-label="Next month">${ic('chev')}</button></div>
  <div class="dlegend"><span><i class="b"></i>${T('Booked')}</span><span><i class="q"></i>${T('Quotation running')}</span><span><i class="e"></i>${T('Enquiry')}</span></div>
  <div class="dcal"><div class="dh">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${T(x)}</span>`).join('')}</div><div class="dgrid">${cells.join('')}</div></div>
  <p class="tiny muted" style="margin-top:8px">${T('Tap a date to see who booked it and which clients are asking for it.')}</p>`;
}
A.dateSheet = d => {
  const x = dateInfo(d); const row = (b, t, s, go) => `<button class="row click" onclick="A.closeModal();setTimeout(()=>${go},40)">${b}<div class="main-col"><b>${esc(t)}</b><div class="sub">${s}</div></div>${ic('chev', 'go')}</button>`;
  modal(`${sheetHead(fmtDay(d), '')}<div class="sheet-b stack">
    ${typeof venueDayHTML === 'function' ? venueDayHTML(d) : ''}
    <div><div class="eyebrow">${T('Booked')} (${x.booked.length})</div><div class="card"><div class="rows">${x.booked.map(e => row(pill(T(e.stage), STAGE_TONE[e.stage]), e.title, `${esc(e.client)} · ${num(e.pax)} ${T('guests')}`, `A.go('event',{id:'${e.id}'})`)).join('') || `<div class="row small muted">${T('Free')}</div>`}</div></div></div>
    <div><div class="eyebrow">${T('Quotation running')} (${x.quoted.length + x.quotedEv.length})</div><div class="card"><div class="rows">${[...x.quoted.map(l => row(leadPill(l), l.name || l.phone, `${esc(T(l.eventType || ''))}${l.quote ? ' · ' + inr(l.quote) : ''}`, `A.go('lead',{id:'${l.id}'})`)), ...x.quotedEv.map(e => row(pill(T(e.stage), STAGE_TONE[e.stage]), e.title, esc(e.client), `A.go('event',{id:'${e.id}'})`))].join('') || `<div class="row small muted">—</div>`}</div></div></div>
    <div><div class="eyebrow">${T('Enquiry')} (${x.enq.length})</div><div class="card"><div class="rows">${x.enq.map(l => row(leadPill(l), l.name || l.phone, `${esc(T(l.eventType || ''))}${l.guests ? ' · ' + num(l.guests) + ' ' + T('guests') : ''}`, `A.go('lead',{id:'${l.id}'})`)).join('') || `<div class="row small muted">—</div>`}</div></div></div>
    ${can('leads', 2) ? `<button class="btn" onclick="A.closeModal();setTimeout(()=>A.leadForm('',{eventDate:'${d}'}),40)">${ic('plus')} New lead for this date</button>` : ''}</div>`);
};

/* ---------- report: which leads convert ---------- */
function leadReport() {
  const r = S.filters.ldRange || '30'; const since = r === 'all' ? 0 : Date.now() - (+r) * 864e5;
  const ls = col('leads').filter(l => (+l.created || Date.parse(l.createdAt || '') || 0) >= since);
  const won = ls.filter(l => l.status === 'Won'); const lost = ls.filter(l => l.status === 'Lost');
  const idx = l => { if (l.status === 'Won') return 5; let m = LEAD_ST.indexOf(l.status === 'Lost' ? 'New' : l.status || 'New'); Object.keys(l.reached || {}).forEach(s => { const i = LEAD_ST.indexOf(s); if (i >= 0 && i < 6) m = Math.max(m, i); }); return m; };
  const funnel = LEAD_ST.slice(0, 6).map((s, i) => [s, ls.filter(l => idx(l) >= i).length]);
  const conv = ls.length ? Math.round(won.length / ls.length * 100) : 0;
  const resp = ls.filter(l => l.firstContactAt && l.createdAt).map(l => (msOf(l.firstContactAt) - msOf(l.createdAt)) / 60000).filter(x => x >= 0);
  const avgResp = resp.length ? Math.round(sum(resp, x => x) / resp.length) : null;
  const bySrc = [...new Set(ls.map(l => l.source || 'Other'))].map(s => { const a = ls.filter(l => (l.source || 'Other') === s); const w = a.filter(l => l.status === 'Won'); return [s, a.length, w.length, sum(w, l => +l.quote || 0)]; }).sort((a, b) => b[1] - a[1]);
  const byPerson = [...new Set(ls.map(l => l.assignedTo || ''))].map(u => { const a = ls.filter(l => (l.assignedTo || '') === u); const w = a.filter(l => l.status === 'Won'); const due = a.filter(l => leadLate(l)).length; return [memberName(u) || T('Not assigned'), a.length, w.length, due]; }).sort((a, b) => b[1] - a[1]);
  const reasons = LOST_REASONS.map(x => [x, lost.filter(l => l.lostReason === x).length]).filter(x => x[1]);
  const max = Math.max(1, ...funnel.map(f => f[1]));
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px">${seg('ldRange', [['7', '7 days'], ['30', '30 days'], ['90', '3 months'], ['365', '1 year'], ['all', 'All']], r, 'A.setF')}</div>
  <div class="kpis">${kpi('Leads', num(ls.length))}${kpi('Won', num(won.length), conv + '% ' + T('converted'), 'good')}${kpi('Lost', num(lost.length), '', lost.length ? 'bad' : '')}${kpi('Value won', inr(sum(won, l => +l.quote || 0)))}${kpi('First reply in', avgResp == null ? '—' : avgResp < 60 ? avgResp + ' min' : Math.round(avgResp / 60) + ' h', T('average'))}</div>
  <div class="split"><div class="card"><div class="card-h"><h3>${T('How far leads go')}${info('ld-funnel')}</h3></div><div class="funnel">${funnel.map(([s, n], i) => `<div class="fr"><span>${T(s)}</span><div class="fb"><i style="width:${Math.max(2, n / max * 100)}%;background:${i === 5 ? 'var(--good)' : 'var(--brand)'}"></i></div><b class="num">${n}</b><span class="tiny muted">${funnel[0][1] ? Math.round(n / funnel[0][1] * 100) + '%' : ''}</span></div>`).join('')}</div></div>
  <div class="card"><div class="card-h"><h3>${T('Why leads were lost')}</h3></div>${reasons.length ? `<div class="funnel">${reasons.map(([s, n]) => `<div class="fr"><span>${T(s)}</span><div class="fb"><i style="width:${n / Math.max(...reasons.map(x => x[1])) * 100}%;background:var(--bad)"></i></div><b class="num">${n}</b><span></span></div>`).join('')}</div>` : `<div class="pad small muted" style="padding:0 16px 14px">${T('No lost leads in this period.')}</div>`}</div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><h3>${T('Which source brings bookings')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Source')}</th><th class="r">${T('Leads')}</th><th class="r">${T('Won')}</th><th class="r">%</th><th class="r">${T('Value won')}</th></tr></thead><tbody>${bySrc.map(([s, a, w, v]) => `<tr><td>${srcPill(s)}</td><td class="r num">${a}</td><td class="r num">${w}</td><td class="r num">${a ? Math.round(w / a * 100) : 0}%</td><td class="r num">${inr(v)}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">—</td></tr>`}</tbody></table></div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><h3>${T('Sales team')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Person')}</th><th class="r">${T('Leads')}</th><th class="r">${T('Won')}</th><th class="r">%</th><th class="r">${T('Follow-ups late')}</th></tr></thead><tbody>${byPerson.map(([n, a, w, d]) => `<tr><td>${esc(n)}</td><td class="r num">${a}</td><td class="r num">${w}</td><td class="r num">${a ? Math.round(w / a * 100) : 0}%</td><td class="r num ${d ? 'bad-t' : ''}">${d}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">—</td></tr>`}</tbody></table></div></div>`;
}

/* ---------- get leads automatically: lead link, Meta via Make / Zapier / Pabbly, Google Form, CSV ---------- */
function leadConnect() {
  const url = S.leadUrl;
  if (url === undefined) { S.leadUrl = null; S.adapter.leadKey(S.org.orgId, false).then(k => { S.leadUrl = k ? `${location.origin}/api/lead?key=${k}` : ''; render(); }).catch(e => { S.leadUrl = ''; S.leadErr = e.message; render(); }); }
  const u = url || ''; const gs = googleFormScript(u);
  return `<div class="stack">
  <div class="card pad stack-sm"><div class="row-flex" style="gap:10px;flex-wrap:nowrap">${ibox('bolt', '#7C3AED')}<div><b>${T('Your lead link')}</b><div class="small muted">${T('Anything sent to this link becomes a new lead here, rings on your sales team’s phones and shows in Leads within seconds. Keep it private.')}</div></div></div>
    ${u ? `<div class="mono small link-box">${esc(u)}</div><div class="row-flex"><button class="btn" onclick="A.copy('${esc(u)}')">${ic('copy')} Copy link</button><button class="btn" onclick="A.leadTest()">${ic('send')} Send a test lead</button><button class="linkbtn" style="color:var(--muted)" onclick="confirmBox('Make a new link?','The old link stops working at once. You will have to paste the new link in Make / Zapier / Google Form again.','New link',()=>A.leadKeyReset(),'primary')">${ic('key')} New link</button></div>` : `<div class="small muted">${S.leadErr ? esc(S.leadErr) : T('Loading…')}</div>`}</div>
  <div class="card"><div class="card-h"><div><h3>${ic('wa')} ${T('Facebook & Instagram lead ads (Meta)')}${info('ld-meta')}</h3><p>${T('Free or low-cost tools connect Meta to your lead link in 10 minutes, without any code.')}</p></div></div>
    <ol class="help-steps" style="padding:0 16px 14px 36px">
      <li>${T('Make a free account on Make.com, Zapier or Pabbly Connect.')}</li>
      <li>${T('Create a new flow. Trigger: “Facebook Lead Ads → New lead”. Log in with Facebook and pick your page and form.')}</li>
      <li>${T('Action: “HTTP / Webhooks → POST”. URL: your lead link above. Body type: JSON.')}</li>
      <li>${T('Map the fields: full_name, phone_number, email and your form questions (date, guests, event). Add platform and campaign_name if you like.')}</li>
      <li>${T('Turn the flow on, then fill your form once with Meta’s Lead Ads Testing Tool. The lead appears here.')}</li></ol></div>
  <div class="card"><div class="card-h"><div><h3>${ic('file')} ${T('Google Form (live)')}${info('ld-gform')}</h3><p>${T('Every new answer of your Google Form comes here at once.')}</p></div></div>
    <ol class="help-steps" style="padding:0 16px 8px 36px">
      <li>${T('Open your Google Form → ⋮ (3 dots) → Apps Script.')}</li>
      <li>${T('Delete what is there, paste the code below and press Save.')}</li>
      <li>${T('On the left open Triggers (clock) → Add trigger → function onFormSubmit → event “On form submit” → Save → Allow.')}</li>
      <li>${T('Fill the form once to test. The answer shows here as a new lead.')}</li></ol>
    <div style="padding:0 16px 16px"><pre class="code-box">${esc(gs)}</pre><button class="btn" onclick="A.copy(${esc(JSON.stringify(gs))})">${ic('copy')} ${T('Copy the code')}</button></div></div>
  <div class="card pad stack-sm"><div class="row-flex" style="gap:10px;flex-wrap:nowrap">${ibox('upload', '#0B9B68')}<div><b>${T('Upload leads file')}</b><div class="small muted">${T('Download leads from Meta Ads Manager / Leads Center (CSV or Excel) and upload here. Old leads with the same mobile are skipped.')}</div></div></div>
    <label class="btn primary" style="align-self:flex-start">${ic('upload')} ${T('Choose file')}<input type="file" accept=".csv,.xlsx,.xls,text/csv" hidden onchange="A.leadFile(this)"></label></div>
  <div class="card pad small muted">${T('Website or any other form: send the form to your lead link (POST, JSON or form fields). Field names like name, phone, email, date, guests and message are read automatically; everything else is kept with the lead.')}</div>
  </div>`;
}
function googleFormScript(u) {
  return `// SabManage: send every new Google Form answer to your Leads\nvar URL = '${u || 'YOUR LEAD LINK'}';\nfunction onFormSubmit(e) {\n  var data = { source: 'Google Form' };\n  if (e && e.namedValues) { for (var k in e.namedValues) data[k] = String(e.namedValues[k]); }\n  else if (e && e.response) { e.response.getItemResponses().forEach(function (r) { data[r.getItem().getTitle()] = String(r.getResponse()); }); data.form = FormApp.getActiveForm().getTitle(); }\n  UrlFetchApp.fetch(URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify(data), muteHttpExceptions: true });\n}`;
}
A.leadKeyReset = async () => { try { const k = await S.adapter.leadKey(S.org.orgId, true); S.leadUrl = `${location.origin}/api/lead?key=${k}`; toast('New link made'); render(); } catch (e) { toast(e.message, 'bad'); } };
A.leadTest = async () => {
  try { const k = (S.leadUrl || '').split('key=')[1]; await S.adapter.leadIntake(k, normLead({ full_name: 'Test Lead', phone_number: '9000000000', event_date: addDays(todayLocal(), 45), guests: 300, message: 'This is a test lead from SabManage. You can delete it.' }, 'Website')); toast(T('Test lead sent. It will show in Leads in a few seconds.')); if (S.adapter.mode !== 'cloud') render(); }
  catch (e) { toast(e.message, 'bad'); }
};
A.leadFile = async input => {
  const f = input.files?.[0]; input.value = ''; if (!f) return;
  try {
    let rows;
    if (/\.csv$/i.test(f.name) && !/\.xls/i.test(f.name)) { const txt = await f.text(); const isTab = (txt.split('\n')[0].match(/\t/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length; rows = parseCSV(txt, isTab ? '\t' : ','); }
    else { await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'); const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' }); rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false }); }
    const [head, ...body] = rows.filter(r => r && r.some(x => String(x || '').trim())); if (!head || !body.length) throw new Error('The file is empty');
    const have = new Set(col('leads').map(l => phone10(l.phone)).filter(Boolean)); const ext = new Set(col('leads').map(l => l.extId).filter(Boolean));
    const recs = []; let skip = 0;
    body.forEach(r => { const o = {}; head.forEach((h, i) => { o[String(h || '').trim()] = r[i]; }); const n = normLead(o, 'Meta / Facebook'); const p = phone10(n.phone);
      if ((!n.name && !p) || (p && have.has(p)) || (n.extId && ext.has(n.extId))) { skip++; return; } if (p) have.add(p);
      const at = n.extra?.created_time ? String(n.extra.created_time).slice(0, 16).replace(' ', 'T') : nowAt();
      recs.push({ id: uid('ld_'), created: Date.now(), createdAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at) ? at : nowAt(), status: 'New', ...n, log: [{ at: nowAt(), type: 'lead', by: T('File upload'), text: n.message || '' }], via: 'file' }); });
    if (!recs.length) { toast(`${T('No new leads in the file')} (${skip} ${T('already here')})`, 'warn'); return; }
    if (S.adapter.putMany) await S.adapter.putMany(S.org.orgId, 'leads', recs.map(x => ({ ...x, updatedAt: Date.now(), updatedById: S.user.id }))); else for (const x of recs) await save('leads', x);
    S.data.leads = [...col('leads'), ...recs.filter(x => !col('leads').some(y => y.id === x.id))]; logAct(`Uploaded ${recs.length} leads`);
    toast(`${recs.length} ${T('leads added')}${skip ? ` · ${skip} ${T('skipped')}` : ''}`); S.params.tab = 'list'; render();
  } catch (e) { toast(e.message, 'bad'); }
};
function parseCSV(txt, sep = ',') {
  const rows = []; let row = [], cur = '', q = false; txt = txt.replace(/^﻿/, '');
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += c; }
  if (cur || row.length) { row.push(cur.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

/* ---------- bell + live notices ---------- */
EXTRA_ALERTS.push(() => {
  if (!can('leads')) return [];
  const out = []; const mgr = lvl('leads') >= 3;
  col('leads').forEach(l => {
    if (!mgr && l.assignedTo && l.assignedTo !== S.user?.id) return;
    if ((l.status || 'New') === 'New' && !(l.log || []).some(x => x.type !== 'lead')) out.push({ tag: 'Lead', tone: 'info', title: `${T('New lead')}: ${l.name || l.phone}`, sub: `${T(l.source || '')} · ${T(leadAge(l) + ' ago')}${l.eventDate ? ' · ' + fmtShort(l.eventDate) : ''}`, go: `A.go('lead',{id:'${l.id}'})` });
    else if (leadLate(l)) out.push({ tag: 'Follow up', tone: 'warn', title: `${T('Follow up')}: ${l.name || l.phone}`, sub: `${T(l.status || '')} · ${atText(l.nextAt)}`, go: `A.go('lead',{id:'${l.id}'})` });
  });
  return out;
});
Object.assign(ALERT_STYLE, { Lead: ['megaphone', '#7C3AED'] });
const _lnLeads = liveNotice; liveNotice = (coll, rec, old) => {
  if (coll === 'leads' && !old && rec.via === 'link' && can('leads')) { toast(`🔔 ${T('New lead')}: ${rec.name || rec.phone}${rec.source ? ' · ' + T(rec.source) : ''}`, 'warn'); try { Tune.play(); } catch (e) { } return; }
  return _lnLeads(coll, rec, old);
};
