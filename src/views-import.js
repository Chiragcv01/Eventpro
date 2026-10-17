/* ================= Import from Excel / CSV ================= */
/* One screen imports stock, menu, crew, vendors or bookings from a sheet.
   Columns are matched by heading (English or Hindi), so the owner's own sheet often works as it is. */
const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const normH = s => String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, '');
const toNum = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[₹,\s]/g, '')); return isFinite(n) ? n : NaN; };
const yes = v => /^(y|yes|haan|ha|han|true|1|हां|हाँ|✓|✔)$/i.test(String(v || '').trim());
const pickFrom = (list, v, fallback) => { const k = normH(v); if (!k) return fallback; return list.find(x => normH(x) === k) || list.find(x => normH(x).includes(k) || k.includes(normH(x))) || fallback; };
function toDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v)) return todayLocal(new Date(v.getTime() + 12 * 3600e3));
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
  const s = String(v).trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  const d = new Date(s); return isNaN(d) ? 'bad' : todayLocal(d);
}

const IMPORTS = {
  inventory: {
    label: 'Godown stock', coll: 'inventory', mod: 'inventory', icon: 'box',
    cols: [
      ['name', 'Item name', true, ['item', 'itemname', 'name', 'saman', 'सामान', 'नाम']],
      ['category', 'Category', false, ['category', 'type', 'श्रेणी', 'प्रकार']],
      ['total', 'Total quantity', true, ['total', 'quantity', 'qty', 'totalquantity', 'stock', 'मात्रा', 'कुल']],
      ['damaged', 'Damaged', false, ['damaged', 'repair', 'broken', 'टूटा']],
      ['rate', 'Rent per day (₹)', false, ['rent', 'rate', 'rentperday', 'kiraya', 'किराया']],
      ['weightKg', 'Weight per piece (kg)', false, ['weight', 'weightkg', 'weightperpiece', 'वज़न', 'वजन']],
      ['bay', 'Godown location', false, ['location', 'godown', 'godownlocation', 'rack', 'bay', 'जगह']]],
    example: [['Shamiana 40x60 ft', 'Tents & Shamiana', 12, 0, 4500, 180, 'Main godown'], ['Banquet chair (white cover)', 'Furniture', 500, 10, 18, 6, 'Rack B-4'], ['LED par light', 'Lighting & Sound', 160, 0, 250, 4, '']],
    key: r => normH(r.name),
    build: r => {
      const total = toNum(r.total), damaged = toNum(r.damaged) ?? 0, rate = toNum(r.rate) ?? 0, w = toNum(r.weightKg) ?? 0;
      if ([total, damaged, rate, w].some(Number.isNaN)) return { error: 'Numbers only in quantity, rent and weight' };
      if (total == null || total < 0) return { error: 'Total quantity missing' };
      return { rec: { name: String(r.name).trim(), category: pickFrom(INV_CATS, r.category, 'Other'), total, damaged: Math.max(0, damaged), rate, weightKg: w, bay: String(r.bay || '').trim(), unit: 'day' } };
    }
  },
  dishes: {
    label: 'Menu (dishes)', coll: 'dishes', mod: 'catering', icon: 'pot',
    cols: [
      ['name', 'Dish name', true, ['dish', 'dishname', 'name', 'item', 'डिश', 'नाम']],
      ['category', 'Course', false, ['course', 'category', 'type', 'कोर्स']],
      ['default', 'Selected by default (Yes/No)', false, ['default', 'selected', 'selectedbydefault']],
      ['ration', 'Ingredients (Name = kg per guest; …)', false, ['ingredients', 'ration', 'samagri', 'सामग्री']]],
    example: [['Paneer Tikka', 'Starters & Live Counters', 'Yes', 'Fresh Paneer = 0.08; Dahi = 0.02; Spices & Masala = 0.005'], ['Dal Makhani', 'Main Course', 'Yes', 'Urad Dal = 0.03; Butter = 0.01; Fresh Cream = 0.01'], ['Gulab Jamun', 'Sweets', 'No', 'Mawa = 0.03; Sugar = 0.04']],
    key: r => normH(r.name),
    build: r => {
      const ration = {}; let bad = false;
      String(r.ration || '').split(/[;\n]/).map(x => x.trim()).filter(Boolean).forEach(l => { const [k, q] = l.split(/[=:]/); const n = toNum(q); if (!k || n == null || Number.isNaN(n)) bad = true; else ration[k.trim()] = n; });
      if (bad) return { error: 'Write ingredients like "Basmati Rice = 0.07; Sugar = 0.04"' };
      return { rec: { name: String(r.name).trim(), category: pickFrom(DISH_CATS, r.category, 'Main Course'), default: yes(r.default), ration } };
    }
  },
  staff: {
    label: 'Crew & staff', coll: 'staff', mod: 'staff', icon: 'users',
    cols: [
      ['name', 'Name', true, ['name', 'naam', 'नाम', 'crew', 'worker']],
      ['phone', 'Mobile', false, ['mobile', 'phone', 'number', 'mobilenumber', 'मोबाइल', 'फोन']],
      ['role', 'Work', false, ['work', 'role', 'kaam', 'काम', 'designation']],
      ['rate', 'Daily wage (₹)', false, ['dailywage', 'wage', 'rate', 'salary', 'mazdoori', 'मज़दूरी', 'मजदूरी']]],
    example: [['Pappu Lal', '9829000001', 'Rigger', 900], ['Ramesh Halwai', '9829000002', 'Halwai', 1500], ['Suresh', '', 'Waiter', 600]],
    key: r => normH(r.name),
    build: r => { const rate = toNum(r.rate) ?? 0; if (Number.isNaN(rate)) return { error: 'Daily wage must be a number' }; return { rec: { name: String(r.name).trim(), phone: String(r.phone || '').replace(/[^\d+]/g, ''), role: String(r.role || '').trim(), rate } }; }
  },
  vendors: {
    label: 'Vendors', coll: 'vendors', mod: 'vendors', icon: 'handshake',
    cols: [
      ['name', 'Vendor / firm name', true, ['vendor', 'vendorname', 'firm', 'name', 'नाम']],
      ['category', 'Service', false, ['service', 'category', 'type', 'सेवा']],
      ['phone', 'Mobile', false, ['mobile', 'phone', 'number', 'मोबाइल']],
      ['gstin', 'GSTIN', false, ['gstin', 'gst', 'gstno']],
      ['notes', 'Notes', false, ['notes', 'note', 'remarks', 'bank', 'upi']]],
    example: [['Gulab Florist', 'Floral & Decor', '9414000001', '', 'UPI gulab@upi'], ['DJ Sonu', 'DJ / Sound / Dhol', '9414000002', '', '']],
    key: r => normH(r.name),
    build: r => ({ rec: { name: String(r.name).trim(), category: pickFrom(VENDOR_CATS, r.category, 'Other'), phone: String(r.phone || '').replace(/[^\d+]/g, ''), gstin: String(r.gstin || '').trim().toUpperCase(), notes: String(r.notes || '').trim() } })
  },
  events: {
    label: 'Bookings', coll: 'events', mod: 'bookings', icon: 'calendar',
    cols: [
      ['client', 'Client name', true, ['client', 'clientname', 'customer', 'name', 'ग्राहक', 'नाम']],
      ['phone', 'Mobile', false, ['mobile', 'phone', 'number', 'मोबाइल']],
      ['type', 'Event type', false, ['eventtype', 'type', 'event', 'function']],
      ['date', 'Start date', true, ['startdate', 'date', 'eventdate', 'तारीख']],
      ['endDate', 'End date', false, ['enddate', 'todate']],
      ['venue', 'Venue', false, ['venue', 'place', 'location', 'जगह']],
      ['pax', 'Guests', false, ['guests', 'pax', 'guest', 'मेहमान']],
      ['budget', 'Package amount (₹)', false, ['package', 'packageamount', 'amount', 'budget', 'value', 'रकम']],
      ['stage', 'Stage', false, ['stage', 'status']],
      ['notes', 'Notes', false, ['notes', 'remarks', 'note']]],
    example: [['Rajesh Sharma', '9829012345', 'Wedding', '18-11-2026', '19-11-2026', 'Rambagh Lawn, Jaipur', 800, 450000, 'Confirmed', ''], ['Sunita Agarwal', '9414023456', 'Sangeet & Mehendi', '02-12-2026', '', 'Hotel Clarks Amer', 300, 180000, 'Quoted', 'Needs stage quote']],
    key: r => normH(r.client) + '|' + toDate(r.date),
    build: r => {
      const date = toDate(r.date), endDate = toDate(r.endDate);
      if (!date || date === 'bad') return { error: 'Start date not understood. Use 18-11-2026' };
      if (endDate === 'bad') return { error: 'End date not understood' };
      const pax = toNum(r.pax) ?? 0, budget = toNum(r.budget) ?? 0;
      if ([pax, budget].some(Number.isNaN)) return { error: 'Guests and amount must be numbers' };
      const type = pickFrom(EVENT_TYPES, r.type, 'Other'); const client = String(r.client).trim();
      return { rec: { client, phone: String(r.phone || '').replace(/[^\d+]/g, ''), type, title: `${client.split(' ').slice(-1)[0]} ${type === 'Other' ? 'Event' : type.split(' ')[0]}`, date, endDate: endDate && endDate >= date ? endDate : '', venue: String(r.venue || '').trim(), pax, budget, stage: pickFrom(STAGES, r.stage, 'Confirmed'), notes: String(r.notes || '').trim(), items: [], schedule: [] } };
    }
  }
};

A.importSheet = kind => {
  const K = IMPORTS[kind]; if (!K) return;
  if (!can(K.mod, 2)) { toast('Your role does not have permission for this. Ask the owner to update access.', 'bad'); return; }
  S.imp = { kind, rows: null, mode: 'update' };
  modal(`${sheetHead('Import from Excel', K.label)}<div class="sheet-b stack" id="impBox">
    <div class="imp-step"><span class="n">1</span><div class="grow"><b>Download the sample sheet</b><div class="small muted">Fill your ${esc(K.label.toLowerCase())} in it, or use your own sheet with these headings:</div><div class="imp-cols">${K.cols.map(([, l, req]) => `<span class="pill ${req ? 'primary' : ''}">${esc(l)}${req ? ' *' : ''}</span>`).join('')}</div>
      <button type="button" class="btn sm" style="margin-top:8px" onclick="A.importTemplate('${kind}')">${ic('download')} Sample sheet (.xlsx)</button></div></div>
    <div class="imp-step"><span class="n">2</span><div class="grow"><b>Upload the filled sheet</b><div class="small muted">Excel (.xlsx, .xls) or CSV. The first row must be the headings.</div>
      <label class="btn primary sm" style="margin-top:8px">${ic('upload')} Choose file<input type="file" hidden accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onchange="A.importFile(this.files[0])"></label></div></div>
    <div id="impResult"></div></div>`, { wide: true });
};
async function xlsxLib() { if (!window.XLSX) await loadScript(XLSX_SRC); return window.XLSX; }
A.importTemplate = async kind => {
  const K = IMPORTS[kind];
  try {
    const X = await xlsxLib(); const ws = X.utils.aoa_to_sheet([K.cols.map(c => c[1]), ...K.example]);
    ws['!cols'] = K.cols.map(c => ({ wch: Math.max(14, c[1].length + 2) }));
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, K.label.slice(0, 30));
    X.writeFile(wb, `${(S.platform?.appName || 'SabManage').toLowerCase()}-${kind}-sample.xlsx`);
  } catch (e) { toast('Could not make the sample sheet. Check your internet.', 'bad'); }
};
A.importFile = async file => {
  if (!file) return; const K = IMPORTS[S.imp.kind]; const out = $('#impResult');
  if (file.size > 8e6) { toast('This file is over 8 MB. Split it into smaller sheets.', 'bad'); return; }
  out.innerHTML = `<div class="banner">${ic('clock')}<span>Reading ${esc(file.name)}…</span></div>`;
  try {
    const X = await xlsxLib(); const isCsv = /\.(csv|txt)$/i.test(file.name) || /csv|text\/plain/.test(file.type);
    const wb = isCsv ? X.read((await file.text()).replace(/^\ufeff/, ''), { type: 'string', raw: false }) : X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]]; const raw = X.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    const hi = raw.findIndex(r => r.filter(c => String(c).trim()).length >= 1); if (hi < 0) throw new Error('The sheet is empty');
    const heads = raw[hi].map(normH);
    const map = {}; K.cols.forEach(([f, label, , al]) => { const idx = heads.findIndex(h => h && (h === normH(label) || al.some(a => h === normH(a)))); if (idx >= 0) map[f] = idx; });
    K.cols.forEach(([f, , , al]) => { if (map[f] == null) { const idx = heads.findIndex((h, i) => h && !Object.values(map).includes(i) && al.some(a => h.includes(normH(a)))); if (idx >= 0) map[f] = idx; } });
    const missing = K.cols.filter(([f, , req]) => req && map[f] == null).map(c => c[1]);
    if (missing.length) throw new Error(`Heading not found: ${missing.join(', ')}. Use the sample sheet headings.`);
    const existing = new Map(col(K.coll).map(x => [K.key(x), x]));
    const seen = new Set();
    const rows = raw.slice(hi + 1).map((r, i) => {
      const o = {}; K.cols.forEach(([f]) => { o[f] = map[f] != null ? r[map[f]] : ''; });
      const empty = !K.cols.some(([f]) => String(o[f] ?? '').trim()); if (empty) return null;
      const reqMiss = K.cols.filter(([f, , req]) => req && !String(o[f] ?? '').trim()).map(c => c[1]);
      let res = reqMiss.length ? { error: reqMiss.join(', ') + ' missing' } : K.build(o);
      const key = res.rec ? K.key(res.rec) : '';
      if (res.rec && seen.has(key)) res = { error: 'Repeated in this sheet' }; if (key) seen.add(key);
      return { line: hi + i + 2, src: o, ...res, exists: res.rec ? existing.get(key) : null };
    }).filter(Boolean);
    if (!rows.length) throw new Error('No rows found under the headings');
    S.imp.rows = rows; S.imp.file = file.name; renderImport();
  } catch (e) { out.innerHTML = `<div class="banner bad">${ic('alert')}<span>${esc(e.message || 'Could not read this file. Save it as .xlsx or .csv and try again.')}</span></div>`; }
};
function renderImport() {
  const K = IMPORTS[S.imp.kind]; const rows = S.imp.rows; const ok = rows.filter(r => r.rec); const bad = rows.filter(r => r.error);
  const upd = ok.filter(r => r.exists).length; const add = ok.length - upd;
  const willDo = S.imp.mode === 'update' ? ok.length : add;
  const show = [...bad, ...ok].slice(0, 12);
  $('#impResult').innerHTML = `<div class="imp-step"><span class="n">3</span><div class="grow stack-sm"><b>Check and import</b>
    <div class="row-flex" style="gap:6px">${pill(`${add} new`, 'good')}${upd ? pill(`${upd} already exist`, 'info') : ''}${bad.length ? pill(`${bad.length} with problems`, 'bad') : ''}<span class="tiny muted">${esc(S.imp.file)}</span></div>
    ${upd ? `<div class="seg" style="align-self:flex-start"><button type="button" class="${S.imp.mode === 'update' ? 'on' : ''}" onclick="S.imp.mode='update';renderImport()">Update existing</button><button type="button" class="${S.imp.mode === 'skip' ? 'on' : ''}" onclick="S.imp.mode='skip';renderImport()">Skip existing</button></div>` : ''}
    <div class="tbl-wrap card" style="box-shadow:none"><table class="tbl"><thead><tr><th>Row</th>${K.cols.slice(0, 4).map(c => `<th>${esc(c[1])}</th>`).join('')}<th></th></tr></thead><tbody>${show.map(r => `<tr><td class="num muted">${r.line}</td>${K.cols.slice(0, 4).map(([f]) => `<td>${esc(r.src[f] instanceof Date ? toDate(r.src[f]) : r.src[f])}</td>`).join('')}<td>${r.error ? `<span class="pill bad">${esc(r.error)}</span>` : r.exists ? pill(S.imp.mode === 'update' ? 'Update' : 'Skip', 'info') : pill('New', 'good')}</td></tr>`).join('')}</tbody></table></div>
    ${rows.length > show.length ? `<span class="tiny muted">Showing ${show.length} of ${rows.length} rows</span>` : ''}
    ${bad.length ? `<span class="small muted">Rows with problems are left out. Fix them in the sheet and upload again any time.</span>` : ''}
    <button type="button" class="btn primary" ${willDo ? '' : 'disabled'} onclick="A.importRun()">${ic('upload')} Import ${willDo} row${willDo === 1 ? '' : 's'}</button></div></div>`;
}
A.importRun = async () => {
  const K = IMPORTS[S.imp.kind]; const ok = S.imp.rows.filter(r => r.rec && (S.imp.mode === 'update' || !r.exists));
  const prefix = { inventory: 'i_', dishes: 'd_', staff: 'st_', vendors: 'vd_', events: 'e_' }[S.imp.kind];
  const recs = ok.map(r => r.exists ? Object.assign(JSON.parse(JSON.stringify(r.exists)), r.rec, S.imp.kind === 'events' ? { items: r.exists.items || [], schedule: r.exists.schedule || [] } : {}) : { id: uid(prefix), ...r.rec });
  const btn = $('#impResult .btn.primary'); if (btn) { btn.disabled = true; btn.textContent = T('Importing…'); }
  try {
    await saveMany(K.coll, recs, `Imported ${recs.length} ${K.label.toLowerCase()} from Excel`);
    if (S.imp.kind === 'dishes') { S.cat = null; initCatering(); }
    A.closeModal(); toast(`${recs.length} rows imported`); render();
  } catch (e) { toast(e.message, 'bad'); if (btn) { btn.disabled = false; btn.textContent = T('Try again'); } }
};
const importBtn = kind => can(IMPORTS[kind].mod, 2) ? `<button class="btn" onclick="A.importSheet('${kind}')">${ic('upload')} Import</button>` : '';
function importCard() {
  const kinds = Object.keys(IMPORTS).filter(k => can(IMPORTS[k].mod, 2) && moduleOn(IMPORTS[k].mod));
  if (!kinds.length) return '';
  return `<div class="card"><div class="card-h"><div><h3>Import from Excel${info('set-import')}</h3><p>Bring your existing stock, menu, crew, vendors and bookings in one go. Download the sample sheet, fill it, upload.</p></div></div>
  <div class="sheet-b" style="padding-top:12px"><div class="tiles">${kinds.map(k => `<button class="tile" onclick="A.importSheet('${k}')">${ibox(IMPORTS[k].icon, MOD[IMPORTS[k].mod].c)}<span>${esc(IMPORTS[k].label)}</span></button>`).join('')}</div></div></div>`;
}

/* ---------- Getting started (new business) ---------- */
function startCard() {
  if (S.role !== 'owner' || S.org?.viewAs) return '';
  const st = settings(); const hide = LS.get('ep_start_done_' + S.org.orgId, false); if (hide) return '';
  const steps = [
    ['Add your logo and GST details', 'They print on every bill', !!(st.logo || st.gstin), "A.go('settings')", 'receipt', '#DB2777'],
    moduleOn('inventory') && ['Import your godown stock', 'From Excel, in one go', col('inventory').length > 0, "A.importSheet('inventory')", 'box', '#2563EB'],
    moduleOn('catering') && ['Add your menu', 'Dishes with ingredients per guest', col('dishes').length > 0, "A.importSheet('dishes')", 'pot', '#16A34A'],
    ['Add your team', 'Logins for manager, accountant, crew', S.members.length > 1, 'A.memberForm()', 'users', '#0D9488'],
    ['Create your first booking', 'Or import your diary', col('events').length > 0, 'A.newBooking()', 'calendar', '#7C3AED']].filter(Boolean);
  const done = steps.filter(s => s[2]).length; if (done === steps.length) return '';
  return `<div class="card pad stack-sm start-card"><div class="row-flex" style="justify-content:space-between"><div><h3>Get started${info('start')}</h3><p class="small muted">${done} of ${steps.length} done</p></div><button class="linkbtn" onclick="LS.set('ep_start_done_${S.org.orgId}',true);render()">Hide</button></div>${prog(done / steps.length * 100)}
    <div class="stack-sm" style="margin-top:4px">${steps.map(([t, sub, ok, fn, i, c]) => `<button class="start-step ${ok ? 'ok' : ''}" onclick="${fn}">${ok ? `<span class="ibox sm" style="--c:#0B9B68">${ic('check')}</span>` : ibox(i, c, 'sm')}<span class="grow" style="text-align:left"><b>${esc(t)}</b><span class="tiny muted" style="display:block">${esc(sub)}</span></span>${ok ? '' : ic('chev')}</button>`).join('')}</div></div>`;
}
