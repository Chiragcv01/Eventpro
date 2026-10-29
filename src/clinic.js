/* ================= SabManage for doctors / clinics =================
   Kind 'clinic' businesses get: Appointments, Patients (readings with charts, messages,
   photos and voice notes), Medical records (visits / reports, hidden module 'medical' so
   the doctor decides who may see diagnoses), fees by UPI with reminders, video calls
   (Jitsi link or WhatsApp) and a private patient link (portal) without login.
   Collections: patients, readings, pmsgs, visits (loaded per patient), appts. */

/* ---------- vitals ---------- */
const VITALS = [
  ['bp', 'BP', 'mmHg', 'heart', '#C2185B'], ['sugar', 'Sugar', 'mg/dL', 'drop', '#D97706'], ['weight', 'Weight', 'kg', 'scale', '#0D9488'],
  ['pulse', 'Pulse', '/min', 'pulse', '#7C3AED'], ['spo2', 'Oxygen (SpO₂)', '%', 'lungs', '#0891B2'], ['temp', 'Temperature', '°F', 'thermo', '#EA580C']];
const VIT = Object.fromEntries(VITALS.map(v => [v[0], v]));
const SUGAR_T = { fasting: 'Fasting', pp: 'After food', random: 'Random' };
const SUGAR_C = { fasting: '#1E5BD8', pp: '#C2185B', random: '#D97706' };
const LIMITS = { sys: [50, 260], dia: [30, 160], sugar: [20, 600], weight: [1, 300], pulse: [20, 220], spo2: [50, 100], temp: [90, 110] };
Object.assign(ICONS, {
  flask: 'M9 3h6M10 3v6l-5.2 9.1A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.9L14 9V3M7.6 15h8.8',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5', siren: 'M6 18v-6a6 6 0 0 1 12 0v6M4 18h16v3H4zM12 3V1M4.2 5.2 3 4M19.8 5.2 21 4'
});

/* ---------- the doctor's own readings / lab tests (settings.tests) ----------
   {key:'t_xxxx', name, unit, type:'number'|'text', min, max}. On the patient link they come with the page. */
const numOr = v => (v === '' || v == null || !isFinite(+v)) ? null : +v;
const curTests = () => (((S.portal ? S.portal.clinic?.tests : (S.org ? settings().tests : null)) || [])).filter(t => t && /^t_[a-z0-9]{2,16}$/.test(t.key || '') && t.name);
const testOf = k => curTests().find(t => t.key === k);
function MDEF(k) { if (VIT[k]) return VIT[k]; const t = testOf(k); return t ? [k, t.name, t.unit || '', t.type === 'text' ? 'file' : 'flask', '#4F46E5'] : null; }
const isText = k => testOf(k)?.type === 'text';
const allKeys = () => [...VITALS.map(v => v[0]), ...curTests().map(t => t.key)];

function cleanReading(p) {
  const r = {};
  Object.entries(LIMITS).forEach(([k, [lo, hi]]) => { const v = p[k]; if (v === '' || v == null) return; const n = Number(v); if (!isFinite(n) || n < lo || n > hi) throw new Error(`${T('The number looks wrong')}: ${k} (${lo}–${hi})`); r[k] = Math.round(n * 10) / 10; });
  if ((r.sys == null) !== (r.dia == null)) throw new Error('Fill both BP numbers (upper and lower)');
  if (r.sugar != null) r.sugarType = SUGAR_T[p.sugarType] ? p.sugarType : 'random';
  curTests().forEach(t => {
    const v = p[t.key]; if (v === '' || v == null) return;
    if (t.type === 'text') { const s = String(v).trim().slice(0, 120); if (s) r[t.key] = s; return; }
    const n = Number(v); const lo = numOr(t.min), hi = numOr(t.max);
    if (!isFinite(n) || Math.abs(n) > 1e6 || (lo != null && n < lo) || (hi != null && n > hi)) throw new Error(`${T('The number looks wrong')}: ${t.name}${lo != null || hi != null ? ` (${lo ?? '…'}–${hi ?? '…'})` : ''}`);
    r[t.key] = Math.round(n * 100) / 100;
  });
  if ((p.note || '').trim()) r.note = p.note.trim().slice(0, 300);
  return r;
}
const readingHas = r => ['sys', 'sugar', 'weight', 'pulse', 'spo2', 'temp'].some(k => r[k] != null) || curTests().some(t => r[t.key] != null && r[t.key] !== '');

/* ---------- alert limits (set by the doctor; the same rules run on the server) ----------
   below low / above high = "check" (alert);  below critLow / above critHigh = EMERGENCY */
const RULE_FIELDS = [['sys', 'BP upper (systolic)', 'mmHg'], ['dia', 'BP lower (diastolic)', 'mmHg'], ['sugar', 'Sugar', 'mg/dL'], ['weight', 'Weight', 'kg'], ['pulse', 'Pulse', '/min'], ['spo2', 'Oxygen (SpO₂)', '%'], ['temp', 'Temperature', '°F']];
const SHORT_L = { sys: 'BP upper', dia: 'BP lower', sugar: 'Sugar', weight: 'Weight', pulse: 'Pulse', spo2: 'SpO2', temp: 'Temp' };
const RULE_KEYS = ['low', 'high', 'critLow', 'critHigh'];
const DEFAULT_RULES = { sys: { low: 90, high: 160, critLow: 80, critHigh: 180 }, dia: { high: 100, critHigh: 120 }, sugar: { low: 70, high: 250, critLow: 54, critHigh: 400 }, pulse: { low: 50, high: 120, critLow: 40, critHigh: 140 }, spo2: { low: 92, critLow: 88 }, temp: { high: 101, critHigh: 103 } };
const clinicRules = st => (st && st.rules && typeof st.rules === 'object') ? st.rules : DEFAULT_RULES;
function mergeRules(base, own) {
  const out = {}; new Set([...Object.keys(base || {}), ...Object.keys(own || {})]).forEach(f => {
    const r = {}; RULE_KEYS.forEach(k => { const v = numOr(own?.[f]?.[k]) ?? numOr(base?.[f]?.[k]); if (v != null) r[k] = v; }); if (Object.keys(r).length) out[f] = r;
  }); return out;
}
const rulesFor = p => S.portal ? (S.portal.rules || {}) : mergeRules(clinicRules(settings()), p?.rules);
const ruleFieldLabel = f => RULE_FIELDS.find(x => x[0] === f)?.[1] || testOf(f)?.name || f;
function fieldLevel(v, r) {
  v = numOr(v); if (v == null || !r) return null;
  if (r.critLow != null && v < r.critLow) return { lvl: 2, dir: 'low' }; if (r.critHigh != null && v > r.critHigh) return { lvl: 2, dir: 'high' };
  if (r.low != null && v < r.low) return { lvl: 1, dir: 'low' }; if (r.high != null && v > r.high) return { lvl: 1, dir: 'high' };
  return null;
}
/* {level:'emergency'|'alert'|'', flags:['BP upper 190', …]} */
function readingLevel(r, rules) {
  let lvl = 0; const flags = [];
  Object.entries(rules || {}).forEach(([f, rr]) => { const x = fieldLevel(r[f], rr); if (x) { lvl = Math.max(lvl, x.lvl); flags.push(`${T(SHORT_L[f] || testOf(f)?.name || f)} ${r[f]}`); } });
  return { level: lvl === 2 ? 'emergency' : lvl === 1 ? 'alert' : '', flags };
}
const readingFlags = (r, p) => readingLevel(r, rulesFor(p)).flags;
let RN = {}; /* limits of the patient on screen (set by V.patient / V.portal) */
function vitalCheck(key, r, rules = RN) {
  let best = null; (key === 'bp' ? ['sys', 'dia'] : [key]).forEach(f => { const x = fieldLevel(r[f], rules[f]); if (x && (!best || x.lvl > best.lvl)) best = x; });
  return best;
}
function vitalText(key, r) {
  if (key === 'bp') return r.sys != null ? `${r.sys}/${r.dia}` : '';
  if (key === 'sugar') return r.sugar != null ? `${r.sugar}` : '';
  return r[key] != null && r[key] !== '' ? String(r[key]) : '';
}
const hasVital = (key, r) => key === 'bp' ? r.sys != null : r[key] != null && r[key] !== '';
function vitalCell(key, r) {
  const t = vitalText(key, r); if (!t) return '<span class="muted">—</span>'; const c = isText(key) ? null : vitalCheck(key, r);
  return `<b class="num ${c ? (c.lvl === 2 ? 'v-crit' : 'v-' + c.dir) : ''}">${esc(t)}</b>${key === 'sugar' ? `<span class="tiny muted"> ${esc(T(SUGAR_T[r.sugarType] || 'Random'))}</span>` : ''}${c ? ` <span class="vflag ${c.lvl === 2 ? 'crit' : c.dir}">${c.lvl === 2 ? '!!' : c.dir === 'high' ? '↑' : '↓'}</span>` : ''}`;
}
const levelPill = lv => lv === 'emergency' ? `<span class="pill bad">${ic('siren')} ${T('Emergency')}</span>` : lv === 'alert' ? `<span class="pill warn">${T('Check')}</span>` : '';
const atText = at => { if (!at) return ''; const [d, t] = String(at).split('T'); return `${fmtShort(d)}${t ? ' · ' + t.slice(0, 5) : ''}`; };
const nowAt = () => { const d = new Date(); return todayLocal(d) + 'T' + d.toTimeString().slice(0, 5); };
const trackOf = p => (p?.track && p.track.length ? p.track : ['bp', 'sugar', 'weight']).filter(k => MDEF(k));
const ageSex = p => [p.age ? p.age + ' ' + T('yrs') : '', p.sex ? T(p.sex) : ''].filter(Boolean).join(' · ');
const patientById = id => getById('patients', id);
const MODE_L = { clinic: 'In clinic', video: 'Video call', whatsapp: 'WhatsApp call' };
const MODE_I = { clinic: ['building', '#2563EB'], video: ['video', '#7C3AED'], whatsapp: ['wa', '#16A34A'] };
const APPT_ST = { requested: ['Request', 'warn'], booked: ['Booked', 'primary'], done: ['Done', 'good'], missed: ['Missed', 'bad'], cancelled: ['Cancelled', ''] };
const apptPill = a => pill(...(APPT_ST[a.status] || APPT_ST.booked));
const feeDue = a => +a.fee > 0 && !a.paid && ['booked', 'done'].includes(a.status);

/* ---------- per-patient data (readings / messages / visits load when a patient is opened) ---------- */
async function loadPatientData(pid, force) {
  if (!S.org || S.adapter.mode !== 'cloud') return;
  if (S.patLoaded?.[pid] && !force) return;
  S.patLoaded = S.patLoaded || {}; S.patLoaded[pid] = 'loading';
  try {
    const d = await S.adapter.loadPatient(S.org.orgId, pid);
    ['readings', 'pmsgs', 'visits'].forEach(c => { S.data[c] = col(c).filter(x => x.patientId !== pid).concat(d[c] || []); });
    S.patLoaded[pid] = true; if (S.view === 'patient' && S.params.id === pid) render();
  } catch (e) { S.patLoaded[pid] = false; toast(e.message, 'bad'); }
}
const pReadings = pid => col('readings').filter(r => r.patientId === pid).sort((a, b) => String(b.at).localeCompare(String(a.at)));
const pMsgs = pid => col('pmsgs').filter(r => r.patientId === pid).sort((a, b) => String(a.at).localeCompare(String(b.at)) || (+a.updatedAt || 0) - (+b.updatedAt || 0));
const pVisits = pid => col('visits').filter(r => r.patientId === pid && !r.kind).sort((a, b) => String(b.date).localeCompare(String(a.date)));
const pAppts = pid => col('appts').filter(a => a.patientId === pid).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

/* ---------- private files (photos, reports, voice notes) ---------- */
const FILEURL = {};
async function fileSrc(bucket, path) {
  const k = bucket + ':' + path; const c = FILEURL[k]; if (c && c.exp > Date.now()) return c.url;
  const url = await S.adapter.fileUrl(bucket, path); FILEURL[k] = { url, exp: Date.now() + 50 * 60e3 }; return url;
}
AFTER_RENDER.push(() => {
  document.querySelectorAll('[data-fp]:not([data-ok])').forEach(async el => {
    el.setAttribute('data-ok', '1'); const url = await fileSrc(el.dataset.fb || 'clinic', el.dataset.fp); if (!url) { el.classList.add('fmissing'); return; }
    if (el.tagName === 'A') el.href = url; else el.src = url;
  });
});
function fileChip(f, bucket = 'clinic') {
  if (f.type === 'audio') return `<div class="vnote">${ic('mic')}<audio controls preload="none" data-fb="${bucket}" data-fp="${esc(f.path)}"></audio>${f.secs ? `<span class="tiny muted">${f.secs}s</span>` : ''}</div>`;
  if (f.type === 'pdf') return `<a class="btn sm" target="_blank" rel="noopener" data-fb="${bucket}" data-fp="${esc(f.path)}">${ic('file')} ${esc(f.name || 'Report (PDF)')}</a>`;
  return `<button type="button" class="fthumb" onclick="A.lightbox('${bucket}','${esc(f.path)}')"><img alt="${esc(f.name || 'Photo')}" data-fb="${bucket}" data-fp="${esc(f.path)}"></button>`;
}
A.lightbox = async (bucket, path) => { const url = await fileSrc(bucket, path); modal(`${sheetHead('Photo')}<div class="sheet-b"><img src="${esc(url)}" alt="" style="width:100%;border-radius:14px"><a class="btn block" style="margin-top:10px" href="${esc(url)}" target="_blank" rel="noopener">${ic('download')} Open full size</a></div>`, { wide: true }); };

/* attachments waiting to be sent (photos, PDFs, voice notes) per form */
const PEND = {};
A.addFiles = (target, input) => {
  const list = PEND[target] = PEND[target] || [];
  for (const f of [...(input.files || [])]) {
    if (list.length >= 5) { toast('Up to 5 files in one message', 'warn'); break; }
    if (!/^image\/|^application\/pdf$/.test(f.type)) { toast('Only photos or PDF', 'bad'); continue; }
    if (f.size > 10e6) { toast('Each file must be under 10 MB', 'bad'); continue; }
    list.push({ blob: f, type: f.type === 'application/pdf' ? 'pdf' : 'image', name: f.name.slice(0, 80), url: URL.createObjectURL(f) });
  }
  input.value = ''; drawPending(target);
};
A.dropPending = (target, i) => { (PEND[target] || []).splice(i, 1); drawPending(target); };
function drawPending(target) {
  const el = document.getElementById('pend-' + target); if (!el) return;
  el.innerHTML = (PEND[target] || []).map((f, i) => `<span class="pend">${f.type === 'image' ? `<img src="${f.url}" alt="">` : f.type === 'audio' ? `${ic('mic')}<audio controls src="${f.url}"></audio>` : `${ic('file')}<span>${esc(f.name)}</span>`}<button type="button" aria-label="Remove" onclick="A.dropPending('${target}',${i})">${ic('x')}</button></span>`).join('');
}
async function uploadPending(target, prefix) {
  const out = [];
  for (const f of PEND[target] || []) {
    const b = f.type === 'image' ? await shrinkPhoto(f.blob, 1600) : f.blob;
    const path = `${prefix}/${uid('f_')}.${extOf(b, f.name)}`;
    await S.adapter.uploadFile('clinic', path, b.type ? b : new Blob([b], { type: 'audio/webm' }));
    out.push({ path, type: f.type, name: f.name || '', ...(f.secs ? { secs: f.secs } : {}) });
  }
  PEND[target] = []; return out;
}
function attachBar(target, voice = true) {
  return `<div class="attach-bar"><label class="btn sm">${ic('camera')} Photo<input type="file" accept="image/*" capture="environment" hidden onchange="A.addFiles('${target}',this)"></label>
    <label class="btn sm">${ic('file')} Report / file<input type="file" accept="image/*,application/pdf" multiple hidden onchange="A.addFiles('${target}',this)"></label>
    ${voice ? `<button type="button" class="btn sm rec-btn" id="rec-${target}" onclick="A.recToggle('${target}')">${ic('mic')} <span>Voice note</span></button>` : ''}</div><div class="pend-list" id="pend-${target}"></div>`;
}

/* voice notes: tap to record, tap to stop (max 2 minutes) */
const REC = { mr: null, target: '', t0: 0, timer: null, stream: null };
A.recToggle = async target => {
  if (REC.mr) { REC.mr.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast('Voice recording is not supported in this browser. Use Chrome.', 'bad'); return; }
  if ((PEND[target] || []).length >= 5) { toast('Up to 5 files in one message', 'warn'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported?.(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {}); const chunks = [];
    Object.assign(REC, { mr, target, t0: Date.now(), stream });
    mr.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    mr.onstop = () => {
      clearInterval(REC.timer); stream.getTracks().forEach(t => t.stop());
      const type = (mr.mimeType || mime || 'audio/webm').split(';')[0]; const blob = new Blob(chunks, { type }); const secs = Math.round((Date.now() - REC.t0) / 1000);
      REC.mr = null; const b = document.getElementById('rec-' + target); if (b) { b.classList.remove('on'); b.querySelector('span').textContent = T('Voice note'); }
      if (blob.size > 800 && secs >= 1) { (PEND[target] = PEND[target] || []).push({ blob, type: 'audio', name: 'Voice note', secs, url: URL.createObjectURL(blob) }); drawPending(target); }
    };
    mr.start(1000);
    const btn = document.getElementById('rec-' + target); if (btn) btn.classList.add('on');
    REC.timer = setInterval(() => { const s = Math.round((Date.now() - REC.t0) / 1000); const b = document.getElementById('rec-' + target); if (b) b.querySelector('span').textContent = `${T('Stop')} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s >= 120) mr.stop(); }, 500);
  } catch (e) { toast(/denied|allowed|permission/i.test(e.message) ? 'Allow the microphone to record a voice note' : e.message, 'bad'); }
};

/* ---------- charts (inline SVG, one measure per chart, hover / tap shows the values) ---------- */
const CW = 400; /* chart width in SVG units: labels stay readable on phones */
function lineChart(series, { unit = '', h = 170 } = {}) {
  const pts = series.flatMap(s => s.points); if (!pts.length) return '';
  const W = CW, H = h, L = 34, R = 10, Tp = 10, B = 24;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = Math.max(1, (y1 - y0) * .15); y0 = Math.floor(y0 - pad); y1 = Math.ceil(y1 + pad);
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => Tp + (1 - (y - y0) / (y1 - y0)) * (H - Tp - B);
  const ticks = [0, 1, 2, 3].map(i => y0 + (y1 - y0) * i / 3);
  const dl = ms => new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const data = series.map(s => ({ n: s.name, c: s.color, p: s.points.map(p => [Math.round(X(p.x)), +p.y, p.lab]) }));
  return `<div class="vchart" data-chart='${esc(JSON.stringify(data))}' data-unit="${esc(unit)}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => T(s.name)).join(', '))}">
    ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid" vector-effect="non-scaling-stroke"/><text x="${L - 6}" y="${Y(t) + 4}" class="yl">${Math.round(t)}</text>`).join('')}
    <text x="${L}" y="${H - 5}" class="xl">${dl(x0)}</text><text x="${W - R}" y="${H - 5}" class="xl" text-anchor="end">${dl(x1)}</text>
    ${series.map(s => { const sp = s.points.slice().sort((a, b) => a.x - b.x); return `${sp.length > 1 ? `<polyline fill="none" stroke="${s.color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" points="${sp.map(p => X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')}"/>` : ''}${sp.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}`; }).join('')}
    <line class="xh" x1="0" x2="0" y1="${Tp}" y2="${H - B}" style="display:none"/></svg><div class="vtip" hidden></div></div>`;
}
document.addEventListener('pointermove', e => chartHover(e)); document.addEventListener('pointerdown', e => chartHover(e));
function chartHover(e) {
  const box = e.target.closest?.('.vchart'); document.querySelectorAll('.vchart .vtip:not([hidden])').forEach(t => { if (!box || !box.contains(t)) t.hidden = true; });
  if (!box) return; const svg = box.querySelector('svg'); const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * CW;
  let data; try { data = JSON.parse(box.dataset.chart); } catch (er) { return; }
  let best = null; data.forEach(s => s.p.forEach(p => { if (!best || Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; }));
  if (!best) return; const at = best[0]; const rows = data.map(s => { const p = s.p.find(q => q[0] === at); return p ? `<div><i style="background:${s.c}"></i><b>${p[1]}</b> <span>${esc(T(s.n))}</span></div>` : ''; }).join('');
  const tip = box.querySelector('.vtip'); tip.innerHTML = `<div class="tiny muted">${esc(best[2] || '')}</div>${rows}`; tip.hidden = false;
  tip.style.left = Math.min(r.width - 150, Math.max(0, at / CW * r.width - 70)) + 'px';
  const xh = svg.querySelector('.xh'); xh.setAttribute('x1', at); xh.setAttribute('x2', at); xh.style.display = '';
}
const msOf = at => Date.parse(String(at).length <= 10 ? at + 'T12:00' : at);
function vitalChart(key, list) {
  const rs = list.filter(r => hasVital(key, r)).slice().reverse();
  if (!rs.length) return '';
  if (key === 'bp') return lineChart([{ name: 'Upper (systolic)', color: '#C2185B', points: rs.map(r => ({ x: msOf(r.at), y: r.sys, lab: atText(r.at) })) }, { name: 'Lower (diastolic)', color: '#1E5BD8', points: rs.map(r => ({ x: msOf(r.at), y: r.dia, lab: atText(r.at) })) }], { unit: 'mmHg' });
  if (key === 'sugar') { const types = Object.keys(SUGAR_T).filter(t => rs.some(r => (r.sugarType || 'random') === t)); return lineChart(types.map(t => ({ name: SUGAR_T[t], color: SUGAR_C[t], points: rs.filter(r => (r.sugarType || 'random') === t).map(r => ({ x: msOf(r.at), y: r.sugar, lab: atText(r.at) })) })), { unit: 'mg/dL' }); }
  const d = MDEF(key); if (!d || isText(key)) return '';
  return lineChart([{ name: d[1], color: VIT[key] ? '#1E5BD8' : '#4F46E5', points: rs.filter(r => numOr(r[key]) != null).map(r => ({ x: msOf(r.at), y: +r[key], lab: atText(r.at) })) }], { unit: d[2] });
}
function chartLegend(key, list) {
  if (key === 'bp') return `<div class="vlegend"><span><i style="background:#C2185B"></i>Upper (systolic)</span><span><i style="background:#1E5BD8"></i>Lower (diastolic)</span></div>`;
  if (key === 'sugar') { const types = Object.keys(SUGAR_T).filter(t => list.some(r => r.sugar != null && (r.sugarType || 'random') === t)); return types.length > 1 ? `<div class="vlegend">${types.map(t => `<span><i style="background:${SUGAR_C[t]}"></i>${SUGAR_T[t]}</span>`).join('')}</div>` : ''; }
  return '';
}
/* first vs latest, and the last 7 days against the 7 days before */
function vitalTrend(key, list) {
  if (isText(key)) return '';
  const rs = list.filter(r => hasVital(key, r) && numOr(key === 'bp' ? r.sys : r[key]) != null); if (rs.length < 2) return '';
  const val = r => +(key === 'bp' ? r.sys : r[key]); const last = rs[0], first = rs[rs.length - 1];
  const d = Math.round((val(last) - val(first)) * 10) / 10; if (!d) return `<span class="trend same">No change since ${fmtShort(first.at.slice(0, 10))}</span>`;
  const better = key === 'weight' || key === 'bp' || key === 'sugar' ? d < 0 : null;
  return `<span class="trend ${better === null ? '' : better ? 'good' : 'bad'}">${d > 0 ? '↑' : '↓'} ${Math.abs(d)} ${esc(MDEF(key)?.[2] || '')} <span>since ${fmtShort(first.at.slice(0, 10))}</span></span>`;
}

/* ---------- clinic home ---------- */
const apptsOn = d => col('appts').filter(a => a.date === d && a.status !== 'cancelled').sort((a, b) => String(a.time || '99').localeCompare(String(b.time || '99')));
function clinicHome() {
  const t = todayLocal(); const today = apptsOn(t); const req = col('appts').filter(a => a.status === 'requested').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const unread = col('patients').filter(p => +p.unread > 0); const dues = col('appts').filter(feeDue); const claims = col('appts').filter(a => a.payClaim && !a.paid);
  const left = today.filter(a => a.status === 'booked').length;
  const btns = [
    can('appointments', 2) && bigBtn('Book appointment', 'calendar', MOD.appointments.c, 'A.apptForm()', 'Clinic, video or WhatsApp'),
    can('patients', 2) && bigBtn('New patient', 'user', MOD.patients.c, 'A.patientForm()'),
    can('patients', 2) && bigBtn('Add reading', 'pulse', '#0EA5E9', "A.pickPatient('reading')", 'BP, sugar, weight…'),
    can('medical', 2) && bigBtn('Visit / report', 'file', MOD.medical.c, "A.pickPatient('visit')"),
    can('patients') && bigBtn('Patients', 'heart', '#E11D48', "A.go('patients')"),
    can('tasks', 2) && bigBtn('Alert to team', 'bell', '#E11D74', 'A.alertForm()')].filter(Boolean);
  return `${pushCard()}
  <div class="today-strip">
    <div><b>${today.length}</b><span>Appointments today</span></div>
    <div><b>${left}</b><span>Still to see</span></div>
    ${req.length ? `<div><b>${req.length}</b><span>Requests</span></div>` : ''}
    <div><b>${unread.length}</b><span>New messages</span></div>
    ${can('appointments') ? `<div><b>${inr(sum(dues, a => a.fee))}</b><span>Fees to collect</span></div>` : ''}
  </div>
  <div class="big-grid">${btns.join('')}</div>
  ${flaggedPatients().length && can('patients') ? `<div class="sec-h"><h2>Readings that crossed your limits${info('c-flagged')}</h2><button class="linkbtn" onclick="A.go('limits')">${ic('gear')} Limits</button></div><div class="card"><div class="rows">${flaggedPatients().map(flaggedRow).join('')}</div></div>` : ''}
  ${claims.length ? `<div class="sec-h"><h2>Patients say they paid</h2></div><div class="card"><div class="rows">${claims.map(apptRow).join('')}</div></div>` : ''}
  ${req.length ? `<div class="sec-h"><h2>Appointment requests${info('c-requests')}</h2></div><div class="card"><div class="rows">${req.map(apptRow).join('')}</div></div>` : ''}
  <div class="sec-h"><h2>Today’s queue${info('c-queue')}</h2><button class="linkbtn" onclick="A.go('appointments')">All appointments ${ic('chev')}</button></div>
  <div class="card">${today.length ? `<div class="rows">${today.map(apptRow).join('')}</div>` : empty('No appointment today', 'Book one, or share the patient link so patients can request a time.', can('appointments', 2) ? `<button class="btn primary" onclick="A.apptForm()">${ic('plus')} Book appointment</button>` : '', 'calendar', MOD.appointments.c)}</div>
  ${unread.length ? `<div class="sec-h"><h2>New messages from patients</h2></div><div class="card"><div class="rows">${unread.map(patientRow).join('')}</div></div>` : ''}
  <div class="easy-foot"><button class="btn block" onclick="A.moreSheet()">${ic('grid')} All sections</button></div>`;
}
function clinicAlerts() {
  const out = []; const t = todayLocal();
  if (can('appointments')) {
    col('appts').filter(a => a.status === 'requested').forEach(a => out.push({ tag: 'Request', title: `${a.patientName || 'Patient'} wants an appointment`, sub: `${fmtDate(a.date)}${a.time ? ' · ' + a.time : ''} · ${T(MODE_L[a.mode] || 'In clinic')}`, go: `A.apptSheet('${a.id}')` }));
    col('appts').filter(a => a.payClaim && !a.paid).forEach(a => out.push({ tag: 'Fee', title: `${a.patientName || 'Patient'} says fee paid ${inr(a.fee)}`, sub: `${T('Check your UPI and confirm')}${a.payClaim.utr ? ' · UTR ' + a.payClaim.utr : ''}`, go: `A.apptSheet('${a.id}')` }));
    col('appts').filter(a => feeDue(a) && !a.payClaim && a.date < t).forEach(a => out.push({ tag: 'Overdue', title: `${a.patientName || 'Patient'}: fee ${inr(a.fee)} pending`, sub: `${fmtDate(a.date)} · ${T('Send a reminder')}`, go: `A.apptSheet('${a.id}')` }));
  }
  if (can('patients')) flaggedPatients().forEach(p => out.push({ tag: p.alertLevel === 'emergency' ? 'Emergency' : 'Reading', title: `${p.name}: ${p.alertText || T('reading to check')}`, sub: atText(p.alertAt), go: `A.go('patient',{id:'${p.id}'})` }));
  if (can('patients')) col('patients').filter(p => +p.unread > 0).forEach(p => out.push({ tag: 'Message', title: `${p.name}: ${p.unread} new message${p.unread > 1 ? 's' : ''}`, sub: atText(p.lastMsgAt), go: `A.go('patient',{id:'${p.id}',tab:'messages'})` }));
  return out;
}
Object.assign(ALERT_STYLE, { Request: ['calendar', '#D97706'], Fee: ['rupee', '#0B9B68'], Message: ['send', '#E11D48'], Emergency: ['siren', '#D92D20'], Reading: ['pulse', '#D97706'] });
/* patients whose reading from the link crossed a limit and the doctor has not marked it checked */
const flaggedPatients = () => col('patients').filter(p => p.alertLevel).sort((a, b) => (b.alertLevel === 'emergency') - (a.alertLevel === 'emergency') || String(b.alertAt || '').localeCompare(String(a.alertAt || '')));
const flaggedRow = p => `<button class="row click ${p.alertLevel === 'emergency' ? 'row-crit' : ''}" onclick="A.go('patient',{id:'${p.id}'})"><div class="avatar" style="background:${p.alertLevel === 'emergency' ? '#FEE4E2;color:#B42318' : '#FEF0C7;color:#93370D'}">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${esc(p.alertText || '')}</div><div class="tiny muted">${atText(p.alertAt)}</div></div>${levelPill(p.alertLevel)}${ic('chev', 'go')}</button>`;
A.clearPatientAlert = async pid => { const p = patientById(pid); if (!p) return; try { await save('patients', { ...p, alertLevel: '', alertText: '', checkedAt: nowAt(), checkedBy: S.me?.name || '' }, `Checked reading of ${p.name}`); toast('Marked as checked'); render(); } catch (e) { toast(e.message, 'bad'); } };

/* ---------- patients ---------- */
function patientRow(p) {
  return `<button class="row click" onclick="A.go('patient',{id:'${p.id}'${+p.unread > 0 ? ",tab:'messages'" : ''}})"><div class="avatar" style="background:#FFE4EA;color:#9F1239">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b>${p.ccNow?.text ? ` <span class="pill info">${T('Complaint noted')}</span>` : ''}${(p.account?.due || 0) > 0 ? ` <span class="pill bad">${T('Due')} ${inr(p.account.due)}</span>` : ''}<div class="sub">${[ageSex(p), p.phone ? esc(p.phone) : '', p.conditions ? esc(p.conditions) : ''].filter(Boolean).join(' · ')}</div>${p.lastReadingAt ? `<div class="tiny muted">${T('Last reading')} <span>${atText(p.lastReadingAt)}</span></div>` : ''}</div>${+p.unread > 0 ? `<span class="pill bad">${p.unread} ${T('new')}</span>` : ''}${ic('chev', 'go')}</button>`;
}
V.patients = () => {
  const q = (S.filters.patQ || '').toLowerCase(); const f = S.filters.patF || 'All';
  let list = col('patients').slice().sort((a, b) => String(b.lastMsgAt || b.lastReadingAt || b.created || '').localeCompare(String(a.lastMsgAt || a.lastReadingAt || a.created || '')));
  if (q) list = list.filter(p => [p.name, p.phone, p.conditions].join(' ').toLowerCase().includes(q));
  if (f === 'New messages') list = list.filter(p => +p.unread > 0);
  if (f === 'On the patient link') list = list.filter(p => p.linkToken);
  return pageHead('Patients', `${col('patients').length} patients · readings, reports, photos and voice notes in one place`, can('patients', 2) ? `<button class="btn primary" onclick="A.patientForm()">${ic('plus')} New patient</button>` : '') +
  `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search name, mobile or illness" value="${esc(S.filters.patQ || '')}" oninput="clearTimeout(window._pq);window._pq=setTimeout(()=>A.setF('patQ',this.value),350)"></div></div>
  <div class="chips" style="margin-bottom:14px">${['All', 'New messages', 'On the patient link'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('patF','${c}')">${c}</button>`).join('')}</div>
  <div class="card">${list.length ? `<div class="rows">${list.map(patientRow).join('')}</div>` : empty('No patients yet', 'Add your first patient. Then send them their link to share daily readings.', can('patients', 2) ? `<button class="btn primary" onclick="A.patientForm()">${ic('plus')} New patient</button>` : '', 'heart', MOD.patients.c)}</div>`;
};
A.patientForm = (id, then) => {
  const p = id ? patientById(id) : { track: ['bp', 'sugar', 'weight'] };
  modal(`<form class="form" onsubmit="A.savePatient(event,'${id || ''}','${then || ''}')" novalidate>${sheetHead(id ? 'Edit patient' : 'New patient', id ? p.name : 'Only the name is needed. Add the rest when you like.')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'name', label: 'Patient name', required: true, value: p.name, autofocus: !id })}${fieldHTML({ name: 'phone', label: 'Mobile (WhatsApp)', type: 'tel', value: p.phone, placeholder: '98290 12345' })}
    ${fieldHTML({ name: 'age', label: 'Age', type: 'number', min: 0, max: 120, value: p.age })}
    <div class="field"><span>Gender</span><div class="chips">${['Male', 'Female', 'Other'].map(x => `<label class="chip-radio"><input type="radio" name="sex" value="${x}" ${p.sex === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div></div>
    ${fieldHTML({ name: 'conditions', label: 'Illness / reason for care', value: p.conditions, placeholder: 'e.g. Diabetes, high BP' })}
    ${fieldHTML({ name: 'allergies', label: 'Allergies', value: p.allergies, placeholder: 'e.g. Penicillin' })}
    <div class="field"><span>Readings to track</span><div class="chips">${[...VITALS.map(([k, l]) => [k, l]), ...curTests().map(t => [t.key, t.name])].map(([k, l]) => `<label class="chip-check"><input type="checkbox" name="track" value="${k}" data-multi="1" ${trackOf(p).includes(k) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div><small>These show on the patient’s link and as charts here.${can('settings', 2) ? ` <button type="button" class="linkbtn" onclick="A.closeModal();setTimeout(()=>A.go('limits'),40)">${ic('plus')} Add your own reading or test</button>` : ''}</small></div>
    ${fieldHTML({ name: 'notes', label: 'Private note', type: 'textarea', rows: 2, value: p.notes })}
  </div><footer class="sheet-f">${id && lvl('patients') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delPatient('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`);
};
A.savePatient = (e, id, then) => {
  e.preventDefault(); const v = readForm(e.target); if (!(v.name || '').trim()) { toast('Write the patient name', 'bad'); return; }
  withBtn(e, async () => {
    const base = id ? patientById(id) : { id: uid('pt_'), created: Date.now() };
    const rec = { ...base, name: v.name.trim(), phone: (v.phone || '').replace(/[^\d+ ]/g, '').trim(), age: v.age === '' ? '' : +v.age, sex: v.sex || '', conditions: v.conditions || '', allergies: v.allergies || '', notes: v.notes || '', track: (v.track || []).length ? v.track : ['bp'] };
    await save('patients', rec, id ? `Updated patient ${rec.name}` : `Added patient ${rec.name}`); A.closeModal(); toast('Saved');
    if (then === 'reading') return A.readingForm(rec.id); if (then === 'appt') return A.apptForm({ patientId: rec.id });
    A.go('patient', { id: rec.id });
  });
};
A.delPatient = id => { const p = patientById(id); confirmBox('Delete ' + p.name + '?', 'The patient is removed from the list. Readings, messages and records stay saved but hidden. You cannot undo this from the app.', 'Delete patient', async () => { await removeRec('patients', id, `Deleted patient ${p.name}`); A.go('patients'); }); };
A.pickPatient = next => {
  const list = col('patients').slice().sort(by('name'));
  modal(`${sheetHead('Choose patient')}<div class="sheet-b stack-sm"><div class="search">${ic('search')}<input id="pickQ" placeholder="Search name or mobile" oninput="document.querySelectorAll('#pickList .row').forEach(r=>r.hidden=!r.dataset.q.includes(this.value.toLowerCase()))"></div>
    <div class="card"><div class="rows" id="pickList">${list.map(p => `<button class="row click" data-q="${esc((p.name + ' ' + (p.phone || '')).toLowerCase())}" onclick="A.closeModal();setTimeout(()=>${next === 'visit' ? `A.visitForm('${p.id}')` : `A.readingForm('${p.id}')`},40)"><div class="avatar">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${esc(ageSex(p))}${p.phone ? ' · ' + esc(p.phone) : ''}</div></div></button>`).join('') || `<div class="row"><span class="small muted">No patients yet</span></div>`}</div></div>
    <button class="btn" onclick="A.closeModal();setTimeout(()=>A.patientForm('','${next === 'visit' ? '' : 'reading'}'),40)">${ic('plus')} New patient</button></div>`);
};

V.patient = () => {
  const p = patientById(S.params.id); if (!p) return pageHead('Patient', '', '', "A.go('patients')") + empty('Patient not found', '');
  loadPatientData(p.id); const loading = S.adapter.mode === 'cloud' && S.patLoaded?.[p.id] !== true; RN = rulesFor(p);
  const tab = S.params.tab || 'health'; const rd = pReadings(p.id); const msgs = pMsgs(p.id); const unread = +p.unread || 0;
  const tabs = [['health', 'Health'], ['readings', 'Readings'], ...(typeof specTabs === 'function' ? specTabs(p) : []), ...(can('medical') ? [['records', 'Records']] : []), ['messages', 'Messages', unread], ...(can('appointments') ? [['fees', 'Visits & fees']] : [])];
  const phone = p.phone ? String(p.phone).replace(/\D/g, '').slice(-10) : '';
  const head = `<button class="back" onclick="A.go('patients')">${ic('back')} Patients</button>
  <div class="card pad pat-head"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar" style="width:54px;height:54px;font-size:19px;background:#FFE4EA;color:#9F1239">${esc(initials(p.name))}</div>
    <div style="min-width:0;flex:1"><h1 style="font:800 22px/1.2 var(--f-display)">${esc(p.name)}${info('patient')}</h1><div class="small muted">${[ageSex(p), p.phone ? esc(p.phone) : ''].filter(Boolean).join(' · ')}</div>
    <div class="row-flex" style="gap:6px;margin-top:6px">${p.conditions ? `<span class="pill accent">${esc(p.conditions)}</span>` : ''}${p.allergies ? `<span class="pill bad">${T('Allergy')}: ${esc(p.allergies)}</span>` : ''}${p.consentAt ? `<span class="pill good">${T('On the patient link')}</span>` : ''}</div></div>
    ${can('patients', 2) ? `<button class="icon-btn" aria-label="Edit patient" onclick="A.patientForm('${p.id}')">${ic('edit')}</button>` : ''}</div>
    <div class="row-flex" style="gap:6px;margin-top:12px">${phone ? `<a class="btn sm" href="tel:${phone}">${ic('phone')} Call</a>${waBtn('', phone, 'WhatsApp')}` : ''}${can('patients', 2) ? `<button class="btn sm primary" onclick="A.patientLinkSheet('${p.id}')">${ic('link')} Patient link</button>` : ''}${can('appointments', 2) ? `<button class="btn sm" onclick="A.apptForm({patientId:'${p.id}'})">${ic('calendar')} Appointment</button>` : ''}${can('patients', 2) ? `<button class="btn sm flag-btn" onclick="A.flagPatient('${p.id}')">${ic('flag')} Alert patient</button>` : ''}</div></div>
  ${patientBanners(p)}
  <div class="tabs">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('pt-' + tab)}</div>`;
  if (loading) return head + `<div class="card">${empty('Loading…', '', '', 'pulse', '#94A3B8')}</div>`;
  if (tab.startsWith('sp-') && can('medical') && typeof specView === 'function') return head + specView(tab.slice(3), p);
  if (tab === 'readings') return head + readingsTab(p, rd);
  if (tab === 'records' && can('medical')) return head + recordsTab(p);
  if (tab === 'messages') { if (unread && can('patients', 2)) setTimeout(() => A.markRead(p.id), 600); return head + messagesTab(p, msgs); }
  if (tab === 'fees' && can('appointments')) return head + feesTab(p);
  return head + healthTab(p, rd);
};
/* one card per reading: last value, change, chart (or the last results of a text test) */
function vitalCard(k, rd, list) {
  const d = MDEF(k); if (!d) return ''; const [, label, unit, icon, c] = d; const lastR = rd.find(r => hasVital(k, r));
  const head = `<div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><div class="row-flex" style="gap:10px;flex-wrap:nowrap">${ibox(icon, c, 'sm')}<div><b>${esc(T(label))}</b><div class="tiny muted">${esc(unit)}</div></div></div>${lastR ? `<div style="text-align:right"><div class="vbig">${vitalCell(k, lastR)}</div><div class="tiny muted">${atText(lastR.at)}</div></div>` : `<span class="tiny muted">${T('No reading yet')}</span>`}</div>`;
  if (isText(k)) { const xs = list.filter(r => hasVital(k, r)).slice(1, 6); return `<div class="card pad vcard">${head}${xs.map(r => `<div class="row-flex small" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:6px"><span class="muted">${atText(r.at)}</span><b>${esc(r[k])}</b></div>`).join('')}</div>`; }
  return `<div class="card pad vcard">${head}${vitalTrend(k, list)}${chartLegend(k, list)}${vitalChart(k, list) || `<div class="small muted" style="padding:14px 0">${lastR ? T('No reading in this period') : T('Add a reading or ask the patient to send it from their link')}</div>`}</div>`;
}
function healthTab(p, rd) {
  const range = S.filters.vRange || '30'; const since = range === 'all' ? '' : addDays(todayLocal(), -+range);
  const list = since ? rd.filter(r => String(r.at).slice(0, 10) >= since) : rd;
  const keys = trackOf(p).concat(allKeys().filter(k => !trackOf(p).includes(k) && rd.some(r => hasVital(k, r))));
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px">${seg('vRange', [['7', '7 days'], ['30', '30 days'], ['90', '3 months'], ['all', 'All']], range, 'A.setF')}<div class="row-flex" style="gap:6px">${can('patients', 2) ? `<button class="btn sm" onclick="A.patientLimits('${p.id}')">${ic('bell')} Alert limits</button><button class="btn primary sm" onclick="A.readingForm('${p.id}')">${ic('plus')} Add reading</button>` : ''}</div></div>
  ${rd.length ? `<div class="grid g2">${keys.map(k => vitalCard(k, rd, list)).join('')}</div>
    <p class="tiny muted" style="margin-top:10px">${T('Coloured numbers crossed the alert limits you set: orange = check, red = emergency.')} ${p.rules && Object.keys(p.rules).length ? T('This patient has own limits.') : ''}</p>`
  : `<div class="card">${empty('No readings yet', 'Add a reading here, or send the patient link so the patient adds BP, sugar and weight daily from home.', `${can('patients', 2) ? `<button class="btn primary" onclick="A.readingForm('${p.id}')">${ic('plus')} Add reading</button><button class="btn" onclick="A.patientLinkSheet('${p.id}')">${ic('link')} Patient link</button>` : ''}`, 'pulse', '#0EA5E9')}</div>`}`;
}
function readingsTab(p, rd) {
  const keys = allKeys().filter(k => trackOf(p).includes(k) || rd.some(r => hasVital(k, r)));
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><span class="small muted">${rd.length} ${T('readings')}</span><div class="row-flex" style="gap:6px">${rd.length ? `<button class="btn sm" onclick="A.readingsCSV('${p.id}')">${ic('download')} Excel / CSV</button>` : ''}${can('patients', 2) ? `<button class="btn primary sm" onclick="A.readingForm('${p.id}')">${ic('plus')} Add reading</button>` : ''}</div></div>
  <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date & time</th>${keys.map(k => `<th>${esc(T(MDEF(k)[1]))}</th>`).join('')}<th>By</th><th></th></tr></thead><tbody>${rd.map(r => { const lv = readingLevel(r, RN).level; return `<tr class="${lv ? 'lv-' + lv : ''}"><td class="nowrap">${atText(r.at)}${lv ? `<div>${levelPill(lv)}</div>` : ''}</td>${keys.map(k => `<td class="nowrap">${vitalCell(k, r)}</td>`).join('')}<td><span class="tiny ${r.by === 'patient' ? 'pill info' : 'muted'}">${r.by === 'patient' ? T('Patient') : esc(r.updatedBy || T('Clinic'))}</span>${r.note ? `<div class="tiny muted">${esc(r.note)}</div>` : ''}</td><td>${lvl('patients') >= 3 ? `<button class="icon-btn" style="width:32px;height:32px" aria-label="Delete reading" onclick="A.delReading('${r.id}')">${ic('trash')}</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="${keys.length + 3}" class="muted">${T('No readings yet')}</td></tr>`}</tbody></table></div></div>`;
}
A.readingsCSV = pid => {
  const p = patientById(pid); const rd = pReadings(pid); const tests = curTests().filter(t => rd.some(r => hasVital(t.key, r)));
  const rows = [['Date', 'Time', 'BP upper', 'BP lower', 'Sugar', 'Sugar type', 'Weight kg', 'Pulse', 'SpO2 %', 'Temp F', ...tests.map(t => t.name + (t.unit ? ' ' + t.unit : '')), 'Alert', 'By', 'Note'], ...rd.map(r => { const [d, t] = String(r.at).split('T'); return [d, t || '', r.sys ?? '', r.dia ?? '', r.sugar ?? '', r.sugar != null ? SUGAR_T[r.sugarType] || '' : '', r.weight ?? '', r.pulse ?? '', r.spo2 ?? '', r.temp ?? '', ...tests.map(x => r[x.key] ?? ''), { emergency: 'Emergency', alert: 'Check' }[readingLevel(r, rulesFor(p)).level] || '', r.by === 'patient' ? 'Patient' : (r.updatedBy || 'Clinic'), r.note || '']; })];
  const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${p.name.replace(/[^\w]+/g, '_')}_readings.csv`; a.click();
};
A.delReading = id => confirmBox('Delete this reading?', '', 'Delete', async () => { await removeRec('readings', id, 'Deleted a reading'); render(); });
function readingFields(track, r = {}) {
  const has = k => track.includes(k);
  return `${has('bp') ? `<div class="field"><span>BP (upper / lower)</span><div class="bp-in"><input name="sys" type="number" inputmode="numeric" placeholder="120" min="50" max="260" value="${r.sys ?? ''}"><b>/</b><input name="dia" type="number" inputmode="numeric" placeholder="80" min="30" max="160" value="${r.dia ?? ''}"><span class="tiny muted">mmHg</span></div></div>` : ''}
  ${has('sugar') ? `<div class="field"><span>Sugar (mg/dL)</span><input name="sugar" type="number" inputmode="numeric" placeholder="e.g. 110" value="${r.sugar ?? ''}"><div class="chips" style="margin-top:6px">${Object.entries(SUGAR_T).map(([k, l], i) => `<label class="chip-radio"><input type="radio" name="sugarType" value="${k}" ${(r.sugarType || 'fasting') === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>` : ''}
  <div class="grid2" style="padding:0">${['weight', 'pulse', 'spo2', 'temp'].filter(has).map(k => `<label class="field"><span>${VIT[k][1]} (${VIT[k][2]})</span><input name="${k}" type="number" step="any" inputmode="decimal" value="${r[k] ?? ''}" placeholder="${{ weight: '72', pulse: '76', spo2: '98', temp: '98.6' }[k]}"></label>`).join('')}</div>
  ${curTests().some(t => has(t.key)) ? `<div class="grid2" style="padding:0">${curTests().filter(t => has(t.key)).map(t => testField(t, r)).join('')}</div>` : ''}
  <details class="more-vitals"><summary>${T('Other readings')}</summary><div class="grid2" style="padding:8px 0 0">${['bp', 'sugar', 'weight', 'pulse', 'spo2', 'temp'].filter(k => !has(k)).map(k => k === 'bp' ? `<div class="field full"><span>BP (upper / lower)</span><div class="bp-in"><input name="sys" type="number" inputmode="numeric" placeholder="120"><b>/</b><input name="dia" type="number" inputmode="numeric" placeholder="80"></div></div>` : k === 'sugar' ? `<label class="field"><span>Sugar (mg/dL)</span><input name="sugar" type="number" inputmode="numeric"></label>` : `<label class="field"><span>${VIT[k][1]} (${VIT[k][2]})</span><input name="${k}" type="number" step="any" inputmode="decimal"></label>`).join('')}${curTests().filter(t => !has(t.key)).map(t => testField(t)).join('')}</div></details>
  ${fieldHTML({ name: 'note', label: 'Note (optional)', placeholder: 'e.g. after walk, felt dizzy' })}`;
}
const testField = (t, r = {}) => t.type === 'text'
  ? `<label class="field"><span translate="no">${esc(t.name)}</span><input name="${t.key}" maxlength="120" value="${esc(r[t.key] ?? '')}" placeholder="${esc(T('Result'))}"></label>`
  : `<label class="field"><span translate="no">${esc(t.name)}${t.unit ? ` (${esc(t.unit)})` : ''}</span><input name="${t.key}" type="number" step="any" inputmode="decimal" value="${r[t.key] ?? ''}"${numOr(t.min) != null ? ` min="${t.min}"` : ''}${numOr(t.max) != null ? ` max="${t.max}"` : ''}></label>`;
function readValues(form) {
  const v = readForm(form); const out = {};
  ['sys', 'dia', 'sugar', 'weight', 'pulse', 'spo2', 'temp', ...curTests().map(t => t.key)].forEach(k => { const els = [...form.querySelectorAll(`[name="${k}"]`)]; const x = els.map(e => e.value).find(Boolean); out[k] = x === undefined ? '' : x; });
  out.sugarType = v.sugarType; out.note = v.note; return out;
}
A.readingForm = pid => {
  const p = patientById(pid); if (!p) return;
  modal(`<form class="form" onsubmit="A.saveReading(event,'${pid}')" novalidate>${sheetHead('Add reading', p.name)}<div class="sheet-b stack">
    ${readingFields(trackOf(p))}${fieldHTML({ name: 'at', label: 'Date & time', type: 'datetime-local', value: nowAt() })}
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save reading</button></footer></form>`);
};
A.saveReading = (e, pid) => {
  e.preventDefault(); const f = e.target;
  withBtn(e, async () => {
    const r = cleanReading(readValues(f)); if (!readingHas(r)) throw new Error('Fill at least one reading');
    const at = (f.querySelector('[name=at]')?.value || nowAt()).slice(0, 16);
    const p0 = patientById(pid); const ev = readingLevel(r, rulesFor(p0));
    const rec = { id: uid('rd_'), patientId: pid, by: 'clinic', at, date: at.slice(0, 10), ...r, ...(ev.level ? { level: ev.level, flags: ev.flags } : {}) };
    await save('readings', rec, `Added reading for ${p0?.name}`);
    const p = patientById(pid); if (p && (!p.lastReadingAt || at > p.lastReadingAt)) { p.lastReadingAt = at; await save('patients', p); }
    A.closeModal(); toast(ev.level ? `${T('Saved')} · ${T(ev.level === 'emergency' ? 'Emergency limit crossed' : 'Please check')}: ${ev.flags.join(', ')}` : 'Reading saved', ev.level ? (ev.level === 'emergency' ? 'bad' : 'warn') : '');
    if (S.view !== 'patient' || S.params.id !== pid) A.go('patient', { id: pid }); else render();
  });
};

/* ---------- medical records (visits, reports, photos) ---------- */
function recordsTab(p) {
  const vs = pVisits(p.id); const st = settings();
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><span class="small muted">${T('Date-wise visits, reports and photos')}</span>${can('medical', 2) ? `<button class="btn primary sm" onclick="A.visitForm('${p.id}')">${ic('plus')} Visit / report</button>` : ''}</div>
  ${vs.length ? `<div class="timeline">${vs.map(v => `<div class="card pad tl-item"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><div>${datebox(v.date, MOD.medical.c)}</div><div style="flex:1;min-width:0;margin-left:12px">
      ${v.complaint ? `<div><span class="eyebrow">${T('Problem')}</span><div>${esc(v.complaint)}</div></div>` : ''}${v.diagnosis ? `<div style="margin-top:6px"><span class="eyebrow">${T('Diagnosis / findings')}</span><div>${esc(v.diagnosis)}</div></div>` : ''}
      ${v.advice ? `<div style="margin-top:6px"><span class="eyebrow">${T('Medicines & advice')}</span><div class="pre">${esc(v.advice)}</div></div>` : ''}${v.followUp ? `<div class="tiny" style="margin-top:6px">${ic('calendar')} ${T('Next visit')} ${fmtDate(v.followUp)}</div>` : ''}
      ${(v.files || []).length ? `<div class="files-row">${v.files.map(f => fileChip(f, 'clinic')).join('')}</div>` : ''}
      <div class="tiny muted" style="margin-top:6px">${esc(v.updatedBy || '')}</div></div>
      <div class="row-flex" style="gap:4px;flex-direction:column">${v.advice || v.diagnosis ? `<button class="icon-btn" aria-label="Print prescription" onclick="A.printVisit('${v.id}')">${ic('print')}</button>` : ''}${can('medical', 2) ? `<button class="icon-btn" aria-label="Edit" onclick="A.visitForm('${p.id}','${v.id}')">${ic('edit')}</button>` : ''}</div></div></div>`).join('')}</div>`
  : `<div class="card">${empty('No records yet', 'Save each visit with the problem, medicines and photos of reports. Everything stays date-wise.', can('medical', 2) ? `<button class="btn primary" onclick="A.visitForm('${p.id}')">${ic('plus')} Visit / report</button>` : '', 'file', MOD.medical.c)}</div>`}
  ${st.regNo ? '' : `<p class="tiny muted" style="margin-top:8px">${T('Add your registration number in Settings to print it on prescriptions.')}</p>`}`;
}
A.visitForm = (pid, id, preset) => {
  const p = patientById(pid); const v = id ? getById('visits', id) : { date: todayLocal(), files: [], ...(preset || {}) };
  PEND.visit = [];
  modal(`<form class="form" onsubmit="A.saveVisit(event,'${pid}','${id || ''}')" novalidate>${sheetHead(id ? 'Edit visit / report' : 'Visit / report', p.name)}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: v.date })}${fieldHTML({ name: 'followUp', label: 'Next visit (optional)', type: 'date', value: v.followUp || '' })}</div>
    ${fieldHTML({ name: 'complaint', label: 'Problem / symptoms', type: 'textarea', rows: 2, value: v.complaint })}
    ${fieldHTML({ name: 'diagnosis', label: 'Diagnosis / findings', type: 'textarea', rows: 2, value: v.diagnosis })}
    ${fieldHTML({ name: 'advice', label: 'Medicines & advice', type: 'textarea', rows: 4, value: v.advice, placeholder: 'One medicine per line, e.g.\nTab Metformin 500 mg · 1-0-1 · after food · 30 days' })}
    ${(v.files || []).length ? `<div class="files-row">${v.files.map(f => fileChip(f)).join('')}</div>` : ''}
    <div class="field"><span>Add photos or reports</span>${attachBar('visit', true)}</div>
  </div><footer class="sheet-f">${id && lvl('medical') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delVisit('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`, { wide: true });
};
A.saveVisit = (e, pid, id) => {
  e.preventDefault(); const v = readForm(e.target);
  withBtn(e, async () => {
    const base = id ? getById('visits', id) : { id: uid('vs_'), patientId: pid, files: [] };
    const files = await uploadPending('visit', `m/${S.org.orgId}/${pid}`);
    const rec = { ...base, date: v.date || todayLocal(), followUp: v.followUp || '', complaint: v.complaint || '', diagnosis: v.diagnosis || '', advice: v.advice || '', files: [...(base.files || []), ...files] };
    if (!rec.complaint && !rec.diagnosis && !rec.advice && !rec.files.length) throw new Error('Write something or add a file');
    await save('visits', rec, `Saved record for ${patientById(pid)?.name}`); A.closeModal(); toast('Saved'); render();
  });
};
A.delVisit = id => confirmBox('Delete this record?', 'The files stay in storage but this entry is removed.', 'Delete', async () => { await removeRec('visits', id, 'Deleted a record'); render(); });
A.saveToRecords = (pid, msgId) => { const m = getById('pmsgs', msgId); if (!m) return; A.visitForm(pid, '', { date: String(m.at).slice(0, 10), complaint: m.text || '', files: m.files || [] }); };
A.printVisit = id => {
  const v = getById('visits', id); const p = patientById(v.patientId); const st = settings();
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', 'bad'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)} ${esc(v.date)}</title><style>body{font:15px/1.5 system-ui,sans-serif;color:#111;max-width:720px;margin:24px auto;padding:0 18px}h1{font-size:22px;margin:0}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #C2185B;padding-bottom:10px;margin-bottom:14px}.muted{color:#555;font-size:13px}.rx{font:700 28px serif;color:#C2185B}.box{margin:12px 0}.lab{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#666}pre{font:inherit;white-space:pre-wrap;margin:4px 0}.sign{margin-top:48px;text-align:right}@media print{button{display:none}}</style></head><body>
  <div class="top"><div>${st.logo ? `<img src="${esc(st.logo)}" alt="" style="height:54px">` : ''}<h1>${esc(st.bizName || '')}</h1><div class="muted">${esc([st.address, st.city].filter(Boolean).join(', '))}${st.phone ? ' · ' + esc(st.phone) : ''}</div>${st.timings ? `<div class="muted">${esc(st.timings)}</div>` : ''}</div>
  <div style="text-align:right"><b>Dr. ${esc(st.doctorName || '')}</b><div class="muted">${esc(st.qualification || '')}${st.specialisation ? ' · ' + esc(st.specialisation) : ''}</div><div class="muted">Reg. No. ${esc(st.regNo || '—')}${st.council ? ' · ' + esc(st.council) : ''}</div></div></div>
  <div style="display:flex;justify-content:space-between"><div><b>${esc(p.name)}</b> <span class="muted">${esc(ageSex(p))}</span></div><div class="muted">${fmtDate(v.date)}</div></div>
  ${p.allergies ? `<div class="muted">Allergies: ${esc(p.allergies)}</div>` : ''}
  ${v.complaint ? `<div class="box"><div class="lab">Complaints</div>${esc(v.complaint)}</div>` : ''}${v.diagnosis ? `<div class="box"><div class="lab">Diagnosis</div>${esc(v.diagnosis)}</div>` : ''}
  <div class="box"><span class="rx">℞</span><pre>${esc(v.advice || '')}</pre></div>${v.followUp ? `<div class="box"><b>Next visit:</b> ${fmtDate(v.followUp)}</div>` : ''}
  <div class="sign">${st.stamp ? `<img src="${esc(st.stamp)}" alt="" style="height:60px"><br>` : ''}Dr. ${esc(st.doctorName || '')}</div>
  <button onclick="print()" style="margin-top:20px;padding:10px 16px">Print / Save as PDF</button></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) { } }, 400);
};

/* ---------- messages (patient ⇄ clinic) ---------- */
function msgBubble(m, mine) {
  return `<div class="msg ${mine ? 'me' : ''}"><div class="bub">${m.text ? `<div class="pre">${esc(m.text)}</div>` : ''}${(m.files || []).length ? `<div class="files-row">${m.files.map(f => fileChip(f)).join('')}</div>` : ''}</div><div class="tiny muted">${esc(mine ? (m.by || '') : (m.by || ''))} · ${atText(m.at)}</div></div>`;
}
function messagesTab(p, msgs) {
  const canSend = can('patients', 2) && p.linkToken;
  return `<div class="card pad chat"><div class="chat-list">${msgs.map(m => `${msgBubble(m, m.from === 'clinic')}${m.from === 'patient' && (m.files || []).length && can('medical', 2) ? `<button class="linkbtn tiny" style="margin:-4px 0 8px" onclick="A.saveToRecords('${p.id}','${m.id}')">${ic('file')} Save to records</button>` : ''}`).join('') || `<div class="small muted" style="text-align:center;padding:18px">${p.linkToken ? T('No messages yet. When the patient sends a problem, photo or voice note from their link, it shows here.') : T('Send the patient link first. Then the patient can send problems, photos and voice notes here.')}</div>`}</div>
  ${canSend ? `<form class="chat-box" onsubmit="A.sendReply(event,'${p.id}')" novalidate><textarea name="text" rows="2" placeholder="${esc(T('Write a reply…'))}"></textarea>${attachBar('reply', true)}<div class="row-flex" style="justify-content:flex-end"><button class="btn primary" type="submit">${ic('send')} Send</button></div></form>`
  : can('patients', 2) ? `<button class="btn primary" onclick="A.patientLinkSheet('${p.id}')">${ic('link')} Send patient link</button>` : ''}</div>`;
}
A.sendReply = (e, pid) => {
  e.preventDefault(); const p = patientById(pid); const text = (e.target.text.value || '').trim();
  if (!text && !(PEND.reply || []).length) { toast('Write something, or add a photo or voice note', 'bad'); return; }
  withBtn(e, async () => {
    const files = await uploadPending('reply', `p/${p.linkToken}`);
    await save('pmsgs', { id: uid('pm_'), patientId: pid, from: 'clinic', at: nowAt(), text, files, by: S.me?.name || S.user.name }, `Replied to ${p.name}`);
    render(); setTimeout(() => { const l = document.querySelector('.chat-list'); if (l) l.scrollTop = l.scrollHeight; }, 50);
    const phone = String(p.phone || '').replace(/\D/g, '').slice(-10);
    if (phone) toastAction(T('Reply saved. Tell the patient on WhatsApp?'), () => window.open(waLink(portalMsg(p, 'reply'), phone), '_blank'));
  });
};
function toastAction(msg, fn) { toast(msg); const t = $('#toast'); if (!t) return; t.style.cursor = 'pointer'; t.onclick = () => { t.hidden = true; t.onclick = null; fn(); }; }
A.markRead = async pid => { const p = patientById(pid); if (!p || !+p.unread) return; try { p.unread = 0; await save('patients', p); render(); } catch (e) { } };

/* ---------- patient link ---------- */
const portalUrl = token => `${location.origin}/app#p-${token}`;
function portalMsg(p, kind, extra = '') {
  const st = settings(); const doc = st.doctorName ? 'Dr. ' + st.doctorName : st.bizName; const url = p.linkToken ? portalUrl(p.linkToken) : '';
  const hi = I18N.lang === 'hi';
  if (kind === 'reply') return hi ? `नमस्ते ${p.name} जी, ${doc} ने आपके मैसेज का जवाब दिया है। यहाँ देखें: ${url}` : `Namaste ${p.name} ji, ${doc} has replied to your message. See it here: ${url}`;
  if (kind === 'fee') return hi ? `नमस्ते ${p.name} जी, ${st.bizName} की फ़ीस ${extra} बाकी है। ऑनलाइन पेमेंट करें: ${url}` : `Namaste ${p.name} ji, your fee of ${extra} at ${st.bizName} is pending. Pay online here: ${url}`;
  return hi ? `नमस्ते ${p.name} जी, ${doc} (${st.bizName}) का आपका निजी लिंक:\n${url}\n\nइससे आप रोज़ BP / शुगर / वज़न भेज सकते हैं, फ़ोटो या आवाज़ में अपनी परेशानी बता सकते हैं, अपॉइंटमेंट बुक कर सकते हैं और फ़ीस ऑनलाइन दे सकते हैं। यह लिंक किसी और को न दें।`
    : `Namaste ${p.name} ji, your private link for ${doc} (${st.bizName}):\n${url}\n\nUse it to send your daily BP / sugar / weight, tell your problem with a photo or voice note, book an appointment and pay the fee online. Please do not share this link.`;
}
A.patientLinkSheet = async (pid, reset) => {
  const p = patientById(pid); if (!p) return;
  try {
    if (!p.linkToken || reset) { p.linkToken = await S.adapter.patientLink(S.org.orgId, pid, !!reset); if (S.adapter.mode !== 'cloud') { const lp = getById('patients', pid); lp.linkToken = p.linkToken; } else await save('patients', { ...p }); }
  } catch (e) { toast(e.message, 'bad'); return; }
  const url = portalUrl(p.linkToken); const phone = String(p.phone || '').replace(/\D/g, '').slice(-10);
  modal(`${sheetHead('Patient link', p.name)}<div class="sheet-b stack">
    <div class="banner">${ic('shield')}<span>${T('This private link opens only this patient’s page: daily readings, problems with photo or voice, appointments and fee. No login or app needed.')}</span></div>
    <div class="card pad mono small" style="overflow-wrap:anywhere;background:var(--surface2);box-shadow:none">${esc(url)}</div>
    <div class="row-flex">${phone ? waBtn(portalMsg(p, 'link'), phone, 'Send on WhatsApp', 'btn wa') : ''}<button class="btn" onclick="A.copy('${esc(url)}')">${ic('copy')} Copy link</button><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">${ic('eye')} Open</a></div>
    <button class="linkbtn" style="align-self:flex-start;color:var(--muted)" onclick="confirmBox('Make a new link?','The old link stops working at once. Use this if the link was shared with the wrong person.','New link',()=>A.patientLinkSheet('${pid}',true),'primary')">${ic('key')} Stop the old link and make a new one</button></div>`);
};

/* ---------- appointments ---------- */
function apptRow(a) {
  const [i, c] = MODE_I[a.mode] || MODE_I.clinic;
  return `<button class="row click" onclick="A.apptSheet('${a.id}')"><span class="timebox" style="--c:${c}"><b>${esc(a.time || '—')}</b><span>${fmtShort(a.date)}</span></span><div class="main-col"><b>${esc(a.patientName || 'Patient')}</b><div class="sub"><span>${ic(i)} ${T(MODE_L[a.mode] || 'In clinic')}</span>${a.reason ? ' · ' + esc(a.reason) : ''}${+a.fee ? ` · <span class="${a.paid ? 'good-t' : 'warn-t'}">${inr(a.fee)} ${a.paid ? T('paid') : a.payClaim ? T('patient says paid') : T('due')}</span>` : ''}</div></div>${apptPill(a)}</button>`;
}
V.appointments = () => {
  const tab = S.params.tab || 'today'; const t = todayLocal(); const all = col('appts');
  const req = all.filter(a => a.status === 'requested'); const dues = all.filter(a => feeDue(a) || (a.payClaim && !a.paid));
  const lists = {
    today: apptsOn(t), upcoming: all.filter(a => a.date > t && ['booked', 'requested'].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    requests: req, fees: dues.sort((a, b) => a.date.localeCompare(b.date)), past: all.filter(a => a.date < t).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 200)
  };
  const tabs = `<div class="tabs">${[['today', 'Today', lists.today.length], ['upcoming', 'Upcoming'], ['requests', 'Requests', req.length], ['fees', 'Fees due', dues.length], ['past', 'Past']].map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('ap-' + tab)}</div>`;
  const list = lists[tab] || lists.today;
  return pageHead('Appointments', 'In clinic, video call or WhatsApp call. Fees and reminders in one place.', can('appointments', 2) ? `<button class="btn primary" onclick="A.apptForm()">${ic('plus')} Book appointment</button>` : '') + tabs +
  (tab === 'fees' && list.length ? `<div class="banner warn" style="margin-bottom:12px">${ic('rupee')}<span><b>${inr(sum(list, a => a.fee))}</b> ${T('to collect')}. ${T('Tap a patient to send a reminder or mark paid.')}</span></div>` : '') +
  `<div class="card">${list.length ? `<div class="rows">${list.map(apptRow).join('')}</div>` : empty(tab === 'requests' ? 'No requests' : tab === 'fees' ? 'No fees due' : 'Nothing here', tab === 'requests' ? 'Patients can ask for an appointment from their link. Requests wait here for you to confirm.' : 'Book an appointment with the button above.', '', 'calendar', MOD.appointments.c)}</div>`;
};
A.apptForm = (preset = {}) => {
  const a = preset.id ? getById('appts', preset.id) : { date: todayLocal(), time: '', mode: 'clinic', ...preset };
  const st = settings(); const p = a.patientId ? patientById(a.patientId) : null;
  const names = col('patients').slice().sort(by('name'));
  modal(`<form class="form" onsubmit="A.saveAppt(event,'${a.id || ''}')" novalidate>${sheetHead(a.id ? 'Edit appointment' : 'Book appointment', p ? p.name : '')}<div class="sheet-b stack">
    ${p ? `<input type="hidden" name="patientId" value="${p.id}">` : `<div class="grid2" style="padding:0"><label class="field"><span>Patient name *</span><input name="pname" list="ptList" autocomplete="off" required placeholder="Type to search or add new" oninput="A.apptPick(this)"><datalist id="ptList">${names.map(x => `<option value="${esc(x.name)}">${esc(x.phone || '')}</option>`).join('')}</datalist></label>${fieldHTML({ name: 'phone', label: 'Mobile (WhatsApp)', type: 'tel', placeholder: '98290 12345' })}</div>`}
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: a.date, required: true })}${fieldHTML({ name: 'time', label: 'Time', type: 'time', value: a.time || '' })}</div>
    <div class="field"><span>How</span><div class="chips">${Object.entries(MODE_L).map(([k, l]) => `<label class="chip-radio"><input type="radio" name="mode" value="${k}" ${a.mode === k ? 'checked' : ''} onchange="const f=this.form.fee;if(f&&!f.dataset.touched)f.value=${esc(JSON.stringify({ clinic: st.feeClinic || '', video: st.feeVideo || st.feeClinic || '', whatsapp: st.feeVideo || st.feeClinic || '' }))}[this.value]"><span>${ic(MODE_I[k][0])} ${l}</span></label>`).join('')}</div></div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'fee', label: 'Fee ₹', type: 'number', min: 0, value: a.id ? a.fee : (a.mode === 'clinic' ? st.feeClinic : st.feeVideo || st.feeClinic) || '' }).replace('<input', '<input oninput="this.dataset.touched=1"')}${fieldHTML({ name: 'reason', label: 'Reason (optional)', value: a.reason || '', placeholder: 'e.g. BP follow-up' })}</div>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${a.id ? 'Save' : 'Book'}</button></footer></form>`);
};
A.apptPick = el => { const p = col('patients').find(x => x.name.toLowerCase() === el.value.trim().toLowerCase()); const ph = el.form.phone; if (p && ph && !ph.value) ph.value = p.phone || ''; };
A.saveAppt = (e, id) => {
  e.preventDefault(); const v = readForm(e.target);
  withBtn(e, async () => {
    let pid = v.patientId;
    if (!pid) {
      const name = (v.pname || '').trim(); if (!name) throw new Error('Write the patient name');
      const phone = (v.phone || '').replace(/\D/g, '').slice(-10);
      let p = col('patients').find(x => x.name.toLowerCase() === name.toLowerCase() && (!phone || !x.phone || String(x.phone).replace(/\D/g, '').slice(-10) === phone));
      if (!p) { if (!can('patients', 2)) throw new Error('Choose an existing patient'); p = { id: uid('pt_'), created: Date.now(), name, phone, track: ['bp', 'sugar', 'weight'] }; await save('patients', p, `Added patient ${name}`); }
      pid = p.id;
    }
    if (!v.date) throw new Error('Pick a date');
    const p = patientById(pid); const base = id ? getById('appts', id) : { id: uid('ap_'), created: Date.now(), status: 'booked', source: 'clinic', paid: false };
    const rec = { ...base, patientId: pid, patientName: p.name, phone: p.phone || '', date: v.date, time: v.time || '', mode: v.mode || 'clinic', fee: +v.fee || 0, reason: v.reason || '' };
    if (rec.mode === 'video' && !rec.room) rec.room = videoRoom();
    await save('appts', rec, `${id ? 'Updated' : 'Booked'} appointment for ${p.name}`); A.closeModal(); toast(id ? 'Saved' : 'Appointment booked'); render();
    if (!id) setTimeout(() => A.apptSheet(rec.id), 200);
  });
};
function apptMsg(a, kind) {
  const st = settings(); const p = patientById(a.patientId) || { name: a.patientName }; const doc = st.doctorName ? 'Dr. ' + st.doctorName : st.bizName; const when = `${fmtDay(a.date)}${a.time ? ' · ' + a.time : ''}`;
  if (I18N.lang === 'hi') return kind === 'confirm' ? `नमस्ते ${p.name} जी, ${doc} के साथ आपका अपॉइंटमेंट पक्का है: ${when} (${T(MODE_L[a.mode])})।${a.mode === 'video' && a.room ? ' वीडियो कॉल लिंक: ' + jitsiUrl(a) : ''}${a.mode === 'clinic' && st.address ? ' पता: ' + st.address : ''}` : `नमस्ते ${p.name} जी, याद दिला दें: ${doc} के साथ आपका अपॉइंटमेंट ${when} को है।${a.mode === 'video' && a.room ? ' वीडियो कॉल लिंक: ' + jitsiUrl(a) : ''}`;
  return kind === 'confirm' ? `Namaste ${p.name} ji, your appointment with ${doc} is confirmed: ${when} (${MODE_L[a.mode]}).${a.mode === 'video' && a.room ? ' Video call link: ' + jitsiUrl(a) : ''}${a.mode === 'clinic' && st.address ? ' Address: ' + st.address : ''}` : `Namaste ${p.name} ji, a reminder: your appointment with ${doc} is on ${when}.${a.mode === 'video' && a.room ? ' Video call link: ' + jitsiUrl(a) : ''}`;
}
const videoRoom = () => 'SabManage-' + uid('').slice(-6) + Math.random().toString(36).slice(2, 8);
const jitsiUrl = a => 'https://meet.jit.si/' + encodeURIComponent(a.room);
A.apptSheet = id => {
  const a = getById('appts', id); if (!a) return; const p = patientById(a.patientId) || { name: a.patientName, phone: a.phone }; const st = settings();
  const phone = String(a.phone || p.phone || '').replace(/\D/g, '').slice(-10); const edit = can('appointments', 2);
  const when = `${fmtDay(a.date)}${a.time ? ' · ' + a.time : ''}`; const hi = I18N.lang === 'hi';
  modal(`${sheetHead(p.name || 'Appointment', when)}<div class="sheet-b stack">
    <div class="row-flex" style="gap:6px">${apptPill(a)}<span class="pill">${ic(MODE_I[a.mode]?.[0] || 'building')} ${T(MODE_L[a.mode] || 'In clinic')}</span>${+a.fee ? pill(`${inr(a.fee)} ${a.paid ? T('paid') : T('due')}`, a.paid ? 'good' : 'warn') : ''}</div>
    ${a.reason ? `<p>${esc(a.reason)}</p>` : ''}
    ${a.payClaim && !a.paid ? `<div class="banner good">${ic('rupee')}<span><b>${T('Patient says the fee is paid')}</b> · ${esc(a.payClaim.at || '')}${a.payClaim.utr ? ' · UTR ' + esc(a.payClaim.utr) : ''}. ${T('Check your UPI app, then confirm.')}</span></div>` : ''}
    ${edit && a.status === 'requested' ? `<button class="btn primary block" onclick="A.apptStatus('${id}','booked',true)">${ic('check')} Confirm & tell patient</button>` : ''}
    ${a.mode === 'video' && ['booked', 'requested'].includes(a.status) ? `<div class="row-flex"><button class="btn primary" onclick="A.startVideo('${id}')">${ic('video')} Start video call</button>${phone && a.room ? waBtn((hi ? 'वीडियो कॉल में जुड़ें: ' : 'Join the video call: ') + jitsiUrl(a), phone, 'Send link', 'btn wa') : ''}</div><p class="tiny muted">${T('Video calls open in Jitsi Meet (free). The first time, the doctor signs in with Google to start the room.')}</p>` : ''}
    ${a.mode === 'whatsapp' && ['booked', 'requested'].includes(a.status) && phone ? `<a class="btn primary" href="https://wa.me/91${phone}" target="_blank" rel="noopener">${ic('wa')} Open WhatsApp to call</a><p class="tiny muted">${T('WhatsApp opens the chat; tap the video or phone icon there.')}</p>` : ''}
    ${edit ? `<div class="tiles">
      ${a.status !== 'done' ? `<button class="tile" onclick="A.apptStatus('${id}','done')">${ibox('check', '#0B9B68')}<span>Done</span></button>` : ''}
      ${+a.fee && !a.paid ? `<button class="tile" onclick="A.feePaid('${id}')">${ibox('rupee', '#0B9B68')}<span>Fee received</span></button>` : ''}
      ${phone && ['booked', 'requested'].includes(a.status) ? `<a class="tile" target="_blank" rel="noopener" href="${esc(waLink(apptMsg(a, a.status === 'requested' ? 'confirm' : 'remind'), phone))}">${ibox('bell', '#D97706')}<span>${a.status === 'requested' ? 'Tell patient' : 'Reminder'}</span></a>` : ''}
      ${phone && feeDue(a) ? `<button class="tile" onclick="A.feeReminder('${id}')">${ibox('wa', '#16A34A')}<span>Fee reminder</span></button>` : ''}
      ${['booked', 'requested'].includes(a.status) ? `<button class="tile" onclick="A.apptStatus('${id}','missed')">${ibox('clock', '#E0344B')}<span>Missed</span></button><button class="tile" onclick="A.apptStatus('${id}','cancelled')">${ibox('x', '#64748B')}<span>Cancel</span></button>` : ''}
      <button class="tile" onclick="A.closeModal();setTimeout(()=>A.apptForm({id:'${id}'}),40)">${ibox('edit', '#2563EB')}<span>Edit</span></button>
    </div>` : ''}
    ${p.id && can('patients') ? `<button class="btn block" onclick="A.go('patient',{id:'${p.id}'})">${ic('heart')} Open patient</button>` : ''}</div>`);
};
A.apptStatus = async (id, status, tell) => {
  const a = getById('appts', id); try {
    const rec = { ...a, status }; if (status === 'booked' && rec.mode === 'video' && !rec.room) rec.room = videoRoom();
    await save('appts', rec, `Appointment ${status}: ${a.patientName}`); toast('Saved'); render();
    if (tell) { A.apptSheet(id); const p = patientById(a.patientId) || {}; const phone = String(a.phone || p.phone || '').replace(/\D/g, '').slice(-10); if (phone) window.open(waLink(apptMsg(rec, 'confirm'), phone), '_blank', 'noopener'); } else A.closeModal();
  } catch (e) { toast(e.message, 'bad'); }
};
A.startVideo = async id => {
  const a = getById('appts', id); let rec = a; if (!a.room) { rec = { ...a, room: videoRoom() }; try { await save('appts', rec); } catch (e) { toast(e.message, 'bad'); return; } }
  window.open(jitsiUrl(rec), '_blank', 'noopener'); A.apptSheet(id);
};
A.feePaid = id => {
  const a = getById('appts', id);
  formModal({ title: 'Fee received', sub: `${a.patientName} · ${inr(a.fee)}`, fields: [{ name: 'fee', label: 'Amount ₹', type: 'number', min: 0, value: a.fee }, { name: 'mode', label: 'How', type: 'select', options: PAY_MODES, value: a.payClaim ? 'UPI' : 'Cash' }],
    submit: 'Save', onSubmit: async v => { await save('appts', { ...a, fee: +v.fee || 0, paid: true, payMode: v.mode, paidAt: todayLocal(), status: a.status === 'requested' ? 'booked' : a.status }, `Fee ${inr(v.fee)} received from ${a.patientName}`); toast('Fee saved'); render(); } });
};
A.feeReminder = async id => {
  const a = getById('appts', id); const p = patientById(a.patientId); if (!p) return;
  if (!p.linkToken && can('patients', 2)) { try { p.linkToken = await S.adapter.patientLink(S.org.orgId, p.id, false); } catch (e) { } }
  const phone = String(a.phone || p.phone || '').replace(/\D/g, '').slice(-10);
  window.open(waLink(portalMsg(p, 'fee', inr(a.fee)), phone), '_blank', 'noopener');
};
function feesTab(p) {
  const list = pAppts(p.id);
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><span class="small muted">${T('Fees due')}: <b>${inr(sum(list.filter(feeDue), a => a.fee))}</b></span>${can('appointments', 2) ? `<button class="btn primary sm" onclick="A.apptForm({patientId:'${p.id}'})">${ic('plus')} Appointment</button>` : ''}</div>
  <div class="card">${list.length ? `<div class="rows">${list.map(apptRow).join('')}</div>` : empty('No appointments yet', '', '', 'calendar', MOD.appointments.c)}</div>`;
}

/* ---------- clinic settings ---------- */
function clinicSettings() {
  const st = settings(); const edit = can('settings', 2); const ro = edit ? '' : 'disabled';
  const f = (name, label, extra = {}) => fieldHTML({ name, label, value: st[name], ...extra }).replace('<input', `<input ${ro}`).replace('<textarea', `<textarea ${ro}`).replace('<select', `<select ${ro}`);
  return pageHead('Settings', 'Clinic profile, fees, UPI and timings') + `<div class="stack">${planCard()}
  <button class="card pad row-flex click-card" style="flex-wrap:nowrap;text-align:left" onclick="A.go('limits')">${ibox('siren', '#D92D20')}<div class="grow" style="min-width:0"><b>${T('Readings & alert limits')}</b><div class="small muted">${T('Add your own readings and tests. Set when you get an alert, and when an emergency alarm rings.')}</div></div>${ic('chev', 'go')}</button>
  <form class="card" onsubmit="A.saveClinicSettings(event)"><div class="card-h"><div><h3>Clinic profile</h3><p>Shown on the patient link and on printed prescriptions</p></div></div><div class="grid2" style="padding:14px 16px">
    ${f('bizName', 'Clinic / hospital name', { required: true })}${f('doctorName', 'Doctor name')}${f('qualification', 'Qualification')}${f('specialisation', 'Speciality', { type: 'select', options: SPECIALITIES })}
    ${f('regNo', 'Registration number')}${f('council', 'Medical council', { type: 'select', options: ['', ...COUNCILS] })}
    ${f('phone', 'Clinic phone / WhatsApp', { type: 'tel' })}${f('email', 'Email', { type: 'email' })}${f('address', 'Address', { full: true })}${f('city', 'City')}
    ${f('timings', 'Clinic timings', { type: 'textarea', rows: 2, placeholder: 'e.g. Mon–Sat 10 am–2 pm, 5–8 pm. Sunday closed.' })}
    ${f('feeClinic', 'Fee for clinic visit ₹', { type: 'number', min: 0 })}${f('feeVideo', 'Fee for video / WhatsApp call ₹', { type: 'number', min: 0 })}
    ${f('upi', 'UPI ID for fees', { placeholder: 'e.g. drsharma@okhdfcbank', hint: 'Patients pay straight to this UPI. No fee is cut.' })}
  </div>${edit ? `<footer class="sheet-f" style="position:static"><span class="grow"></span><button class="btn primary" type="submit">Save</button></footer>` : ''}</form>
  <div class="card pad"><div class="row-flex" style="gap:14px;flex-wrap:nowrap"><div class="imgbox logo">${st.logo ? `<img src="${esc(st.logo)}" alt="">` : ic('steth')}</div><div><b>Clinic logo</b><div class="tiny muted">Shows on the patient link and prescriptions</div>${edit ? `<div class="row-flex" style="margin-top:8px;gap:6px"><label class="btn sm soft">${ic('upload')} ${st.logo ? 'Change' : 'Upload'}<input type="file" accept="image/*" hidden onchange="A.uploadImg('logo', this.files[0])"></label><label class="btn sm soft">${ic('edit')} Signature / stamp<input type="file" accept="image/*" hidden onchange="A.uploadImg('stamp', this.files[0])"></label></div>` : ''}</div></div></div></div>`;
}
A.saveClinicSettings = async e => { e.preventDefault(); try { const v = readForm(e.target); ['feeClinic', 'feeVideo'].forEach(k => v[k] = v[k] === '' ? '' : +v[k] || 0); await saveSettingsRec(v); logAct('Updated clinic settings'); S.org.name = v.bizName || S.org.name; toast('Settings saved'); render(); } catch (err) { toast(err.message, 'bad'); } };

/* ---------- readings & alert limits (doctor's settings) ---------- */
const TEST_PRESETS = [
  { name: 'HbA1c', unit: '%', rules: { high: 6.5 } }, { name: 'Cholesterol (total)', unit: 'mg/dL', rules: { high: 200 } },
  { name: 'Haemoglobin', unit: 'g/dL', rules: { low: 11 } }, { name: 'Creatinine', unit: 'mg/dL', rules: { high: 1.2 } },
  { name: 'TSH', unit: 'mIU/L', rules: { low: 0.4, high: 4.5 } }, { name: 'Uric acid', unit: 'mg/dL', rules: { high: 7 } },
  { name: 'Pain score', unit: '0–10', min: 0, max: 10, rules: { high: 6 } }, { name: 'Peak flow', unit: 'L/min', rules: {} },
  { name: 'Waist', unit: 'cm', rules: {} }, { name: 'Urine test', type: 'text' }];
const ALARM_TO = [['doctors', 'Doctors only (owner + associate doctors)'], ['managers', 'Doctors and front desk'], ['all', 'Everyone in the team']];
function limitRow(f, label, unit, r = {}, ph = {}, dis = '') {
  const inp = (k, cls, lab) => `<label class="lim ${cls}"><span>${lab}</span><input name="${f}.${k}" type="number" step="any" inputmode="decimal" value="${r[k] ?? ''}" placeholder="${ph[k] ?? '—'}" ${dis}></label>`;
  return `<div class="lim-row"><div class="lim-name"><b translate="${VIT[f] || RULE_FIELDS.some(x => x[0] === f) ? 'yes' : 'no'}">${esc(T(label))}</b><span class="tiny muted">${esc(unit)}</span></div>
    <div class="lim-grid">${inp('low', 'a', T('Alert below'))}${inp('high', 'a', T('Alert above'))}${inp('critLow', 'e', T('Emergency below'))}${inp('critHigh', 'e', T('Emergency above'))}</div></div>`;
}
/* read the limit boxes of a form → {rules} or throws with a clear message */
function readLimits(form, fields) {
  const out = {};
  fields.forEach(([f, label]) => {
    const r = {}; RULE_KEYS.forEach(k => { const el = form.querySelector(`[name="${f}.${k}"]`); const v = el ? numOr(el.value) : null; if (el && el.value.trim() !== '' && v == null) throw new Error(`${T(label)}: ${T('write a number')}`); if (v != null) r[k] = v; });
    if (r.low != null && r.high != null && r.low >= r.high) throw new Error(`${T(label)}: ${T('“Alert below” must be smaller than “Alert above”')}`);
    if (r.critLow != null && r.low != null && r.critLow > r.low) throw new Error(`${T(label)}: ${T('“Emergency below” must be smaller than “Alert below”')}`);
    if (r.critHigh != null && r.high != null && r.critHigh < r.high) throw new Error(`${T(label)}: ${T('“Emergency above” must be bigger than “Alert above”')}`);
    if (Object.keys(r).length) out[f] = r;
  });
  return out;
}
const limitFields = () => [...RULE_FIELDS.map(([k, l, u]) => [k, l, u]), ...curTests().filter(t => t.type !== 'text').map(t => [t.key, t.name, t.unit || ''])];
V.limits = () => {
  const st = settings(); const edit = can('settings', 2); const dis = edit ? '' : 'disabled'; const rules = clinicRules(st); const tests = curTests();
  return pageHead('Readings & alert limits', 'Your own readings and tests, and when the app should warn you', '', "A.go('settings')") + `<div class="stack">
  <div class="card pad lim-how"><div class="lim-how-i">${ibox('bell', '#D97706')}<div><b>${T('Alert')}</b><span>${T('The reading turns orange and you get a notification once.')}</span></div></div>
    <div class="lim-how-i">${ibox('siren', '#D92D20')}<div><b>${T('Emergency')}</b><span>${T('An alarm rings on the doctor’s phone again and again until someone taps “Seen”.')}</span></div></div>
    <div class="lim-how-i">${ibox('user', '#0EA5E9')}<div><b>${T('Patient')}</b><span>${T('When the patient sends such a reading, their screen tells them to contact you.')}</span></div></div></div>
  <form class="card" onsubmit="A.saveLimits(event)" novalidate><div class="card-h"><div><h3>${T('Alert limits')}${info('limits')}</h3><p>${T('Leave a box empty for no limit. Each patient can also get own limits.')}</p></div></div>
    <div class="lim-list">${limitFields().map(([f, l, u]) => limitRow(f, l, u, rules[f] || {}, {}, dis)).join('')}</div>
    <div class="stack-sm" style="padding:4px 16px 14px">${fieldHTML({ name: 'alarmTo', label: 'Who hears the emergency alarm', type: 'select', value: st.alarmTo || 'doctors', options: ALARM_TO }).replace('<select', `<select ${dis}`)}
      <label class="check"><input type="checkbox" name="tellPatient" ${st.tellPatient === false ? '' : 'checked'} ${dis}> <span>${T('Tell the patient on their screen to contact the doctor when their reading crosses a limit')}</span></label>
      <p class="tiny muted">${T('The suggested numbers are only a starting point. Set them as per your own judgement.')}</p></div>
    ${edit ? `<footer class="sheet-f" style="position:static"><button type="button" class="btn ghost" onclick="A.resetLimits()">${T('Use suggested numbers')}</button><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save limits</button></footer>` : ''}</form>
  <div class="card"><div class="card-h"><div><h3>${T('Your own readings and tests')}${info('tests')}</h3><p>${T('Add any reading or lab test you want patients or your team to record, e.g. HbA1c, pain score or a urine test.')}</p></div>${edit ? `<button class="btn primary sm" onclick="A.testForm()">${ic('plus')} Add</button>` : ''}</div>
    ${tests.length ? `<div class="rows">${tests.map(t => `<button class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.testForm('${t.key}')"` : ''}>${ibox(t.type === 'text' ? 'file' : 'flask', '#4F46E5', 'sm')}<div class="main-col"><b translate="no">${esc(t.name)}</b><div class="sub">${t.type === 'text' ? T('Text result') : `${T('Number')}${t.unit ? ' · ' + esc(t.unit) : ''}`}${rules[t.key] ? ' · ' + T('limits set') : ''}</div></div>${edit ? ic('chev', 'go') : ''}</button>`).join('')}</div>` : `<div class="pad small muted" style="padding:0 16px 14px">${T('No own readings yet.')}</div>`}
    ${edit ? `<div style="padding:0 16px 16px"><div class="tiny muted" style="margin-bottom:6px">${T('Quick add')}</div><div class="chips">${TEST_PRESETS.filter(x => !tests.some(t => t.name.toLowerCase() === x.name.toLowerCase())).map((x, i) => `<button type="button" class="chip" onclick="A.testForm('',${TEST_PRESETS.indexOf(x)})">${ic('plus')} ${esc(x.name)}</button>`).join('')}</div></div>` : ''}</div></div>`;
};
A.saveLimits = e => {
  e.preventDefault(); const f = e.target;
  withBtn(e, async () => { const rules = readLimits(f, limitFields()); await saveSettingsRec({ rules, alarmTo: f.alarmTo.value || 'doctors', tellPatient: !!f.tellPatient.checked }); logAct('Updated alert limits'); toast('Limits saved'); render(); });
};
A.resetLimits = () => confirmBox('Use the suggested numbers?', 'The limits for BP, sugar, pulse, oxygen and temperature go back to the suggested numbers. Limits of your own tests stay.', 'Use suggested', async () => {
  const keep = Object.fromEntries(Object.entries(clinicRules(settings())).filter(([k]) => k.startsWith('t_'))); await saveSettingsRec({ rules: { ...DEFAULT_RULES, ...keep } }); toast('Done'); render(); }, 'primary');
A.testForm = (key, preset) => {
  const t = key ? testOf(key) : (preset != null ? { ...TEST_PRESETS[preset] } : { type: 'number' }); if (!t) return;
  const r = key ? (clinicRules(settings())[key] || {}) : (t.rules || {});
  modal(`<form class="form" onsubmit="A.saveTest(event,'${key || ''}')" novalidate>${sheetHead(key ? 'Edit reading / test' : 'New reading / test', 'Patients and your team can record it; it gets its own chart')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'name', label: 'Name', required: true, value: t.name || '', placeholder: 'e.g. HbA1c', maxlength: 40 })}${fieldHTML({ name: 'unit', label: 'Unit (optional)', value: t.unit || '', placeholder: 'e.g. %', maxlength: 16 })}</div>
    <div class="field"><span>Type of result</span><div class="chips">${[['number', 'Number (gets a chart and limits)'], ['text', 'Text, e.g. Positive / Negative']].map(([v, l]) => `<label class="chip-radio"><input type="radio" name="type" value="${v}" ${(t.type || 'number') === v ? 'checked' : ''} onchange="document.getElementById('tNum').hidden=this.value!=='number'"><span>${l}</span></label>`).join('')}</div></div>
    <div id="tNum" class="stack-sm" ${t.type === 'text' ? 'hidden' : ''}>
      <details ${numOr(t.min) != null || numOr(t.max) != null ? 'open' : ''}><summary class="small">${T('Allowed numbers (optional, stops typing mistakes)')}</summary><div class="grid2" style="padding:8px 0 0">${fieldHTML({ name: 'min', label: 'Lowest possible', type: 'number', value: t.min ?? '' })}${fieldHTML({ name: 'max', label: 'Highest possible', type: 'number', value: t.max ?? '' })}</div></details>
      <div class="lim-list boxed">${limitRow('x', t.name || T('This reading'), t.unit || '', r)}</div>
      <p class="tiny muted">${T('Leave the limit boxes empty if you do not want alerts for this test.')}</p></div>
  </div><footer class="sheet-f">${key ? `<button type="button" class="btn ghost danger" onclick="A.delTest('${key}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`);
};
A.saveTest = (e, key) => {
  e.preventDefault(); const f = e.target; const v = readForm(f);
  withBtn(e, async () => {
    const name = (v.name || '').trim().slice(0, 40); if (!name) throw new Error('Write the name of the reading or test');
    const st = settings(); const tests = (st.tests || []).slice(); const k = key || 't_' + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6).padEnd(6, 'x');
    if (tests.some(t => t.key !== k && t.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('A reading with this name already exists');
    const type = v.type === 'text' ? 'text' : 'number'; const min = numOr(v.min), max = numOr(v.max);
    if (min != null && max != null && min >= max) throw new Error('“Lowest possible” must be smaller than “Highest possible”');
    const rec = { key: k, name, unit: (v.unit || '').trim().slice(0, 16), type, ...(type === 'number' && min != null ? { min } : {}), ...(type === 'number' && max != null ? { max } : {}) };
    const lim = type === 'number' ? (readLimits(f, [['x', name]]).x || null) : null;
    const rules = { ...clinicRules(st) }; if (lim) rules[k] = lim; else delete rules[k];
    const i = tests.findIndex(t => t.key === k); if (i >= 0) tests[i] = rec; else tests.push(rec);
    if (tests.length > 30) throw new Error('Up to 30 own readings');
    await saveSettingsRec({ tests, rules }); logAct(`${key ? 'Updated' : 'Added'} reading ${name}`); A.closeModal(); toast('Saved. Tick it in a patient’s “Readings to track” to show it on their link.'); render();
  });
};
A.delTest = key => { const t = testOf(key); confirmBox(`Remove ${t?.name || 'this reading'}?`, 'It is removed from forms and charts. Readings already saved stay in the data.', 'Remove', async () => { const st = settings(); const rules = { ...clinicRules(st) }; delete rules[key]; await saveSettingsRec({ tests: (st.tests || []).filter(x => x.key !== key), rules }); A.closeModal(); toast('Removed'); render(); }); };

/* own limits for one patient (empty box = clinic limit) */
A.patientLimits = pid => {
  const p = patientById(pid); if (!p) return; const base = clinicRules(settings()); const own = p.rules || {};
  const tr = trackOf(p); const want = f => (f === 'sys' || f === 'dia') ? tr.includes('bp') : tr.includes(f);
  const fields = limitFields(); const main = fields.filter(([f]) => want(f)), rest = fields.filter(([f]) => !want(f));
  modal(`<form class="form" onsubmit="A.savePatientLimits(event,'${pid}')" novalidate>${sheetHead('Alert limits for this patient', p.name)}<div class="sheet-b stack">
    <div class="banner">${ic('info')}<span>${T('Empty boxes use your clinic limits (shown in grey). Fill only what is different for this patient.')}</span></div>
    <div class="lim-list boxed">${main.map(([f, l, u]) => limitRow(f, l, u, own[f] || {}, base[f] || {})).join('')}</div>
    ${rest.length ? `<details ${rest.some(([f]) => own[f]) ? 'open' : ''}><summary class="small">${T('Other readings')}</summary><div class="lim-list boxed" style="margin-top:8px">${rest.map(([f, l, u]) => limitRow(f, l, u, own[f] || {}, base[f] || {})).join('')}</div></details>` : ''}
  </div><footer class="sheet-f">${Object.keys(own).length ? `<button type="button" class="btn ghost" onclick="A.savePatientLimits(null,'${pid}',true)">${T('Use clinic limits')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`, { wide: true });
};
A.savePatientLimits = (e, pid, clear) => {
  if (e) e.preventDefault(); const p = patientById(pid);
  const run = async () => { const rules = clear ? {} : readLimits(e.target, limitFields()); await save('patients', { ...p, rules }, `Updated alert limits of ${p.name}`); A.closeModal(); toast(clear ? 'Clinic limits apply again' : 'Limits saved for this patient'); render(); };
  if (e) withBtn(e, run); else run().catch(err => toast(err.message, 'bad'));
};

/* ---------- alert the patient (shows on the patient link, re-sent until the patient taps “I have seen it”) ---------- */
const FLAG_QUICK = ['Please call the clinic now', 'Please come to the clinic today', 'Go to the nearest hospital now', 'Check your reading again in 30 minutes and send it', 'Do not take your next dose before talking to the doctor'];
function patientBanners(p) {
  const out = [];
  if (p.alertLevel) out.push(`<div class="banner ${p.alertLevel === 'emergency' ? 'bad' : 'warn'} pat-alert">${ic(p.alertLevel === 'emergency' ? 'siren' : 'bell')}<span><b>${T(p.alertLevel === 'emergency' ? 'Emergency reading' : 'Reading to check')}</b> · ${esc(p.alertText || '')} · ${atText(p.alertAt)}</span>${can('patients', 2) ? `<button class="btn sm" onclick="A.clearPatientAlert('${p.id}')">${ic('check')} Checked</button>` : ''}</div>`);
  const f = p.flag; if (f && !f.cancelledAt && (!f.seenAt || Date.now() - msOf(f.seenAt) < 36e5 * 24)) out.push(f.seenAt
    ? `<div class="banner good">${ic('check')}<span><b>${T('Patient has seen your alert')}</b> · ${atText(f.seenAt)} · “${esc(f.text)}”</span></div>`
    : `<div class="banner ${f.level === 'red' ? 'bad' : 'warn'}">${ic('flag')}<span><b>${T('Alert sent to patient, not seen yet')}</b> · ${atText(f.at)} · “${esc(f.text)}”</span>${can('patients', 2) ? `<button class="btn sm ghost" onclick="A.cancelFlag('${p.id}')">${T('Stop alert')}</button>` : ''}</div>`);
  return out.length ? `<div class="stack-sm" style="margin-bottom:12px">${out.join('')}</div>` : '';
}
A.flagPatient = pid => {
  const p = patientById(pid); if (!p) return; const phone = String(p.phone || '').replace(/\D/g, '').slice(-10);
  if (!p.linkToken) { confirmBox('Send the patient link first', 'The alert shows on the patient’s private link. Send the link once on WhatsApp, then you can alert the patient any time.', 'Send patient link', () => A.patientLinkSheet(pid), 'primary'); return; }
  modal(`<form class="form" onsubmit="A.sendFlag(event,'${pid}')" novalidate>${sheetHead('Alert the patient', p.name)}<div class="sheet-b stack">
    <div class="banner">${ic('info')}<span>${T('The patient’s link shows this alert in red with a sound. If they turned on alerts, their phone rings again and again until they tap “I have seen it”. You see here when they have seen it.')}</span></div>
    <div class="field"><span>How serious</span><div class="chips"><label class="chip-radio"><input type="radio" name="level" value="red" checked><span>${ic('siren')} Urgent</span></label><label class="chip-radio"><input type="radio" name="level" value="amber"><span>${ic('bell')} Important</span></label></div></div>
    <div class="field"><span>Quick message</span><div class="chips">${FLAG_QUICK.map(q => `<button type="button" class="chip" onclick="this.form.text.value=this.textContent">${esc(T(q))}</button>`).join('')}</div></div>
    ${fieldHTML({ name: 'text', label: 'Message for the patient', type: 'textarea', rows: 3, required: true, maxlength: 500, placeholder: 'e.g. Your BP is very high. Please call the clinic now.' })}
    ${phone ? `<label class="check"><input type="checkbox" name="wa" checked> <span>${T('Also send it on WhatsApp')}</span></label>` : ''}
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn danger-solid" type="submit">${ic('flag')} Send alert</button></footer></form>`);
};
A.sendFlag = (e, pid) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const text = (v.text || '').trim(); if (!text) { toast('Write the message for the patient', 'bad'); return; }
  const wa = !!f.wa?.checked; const waWin = wa ? window.open('', '_blank') : null;
  withBtn(e, async () => {
    try {
      const p = patientById(pid); const r = await S.adapter.clinicAlertPatient(S.org.orgId, pid, v.level, text);
      p.flag = { id: r.id, level: r.level, text: r.text, at: r.at, by: r.by }; if (S.adapter.mode !== 'cloud') await save('patients', p);
      A.closeModal(); toast(r.devices ? T('Alert sent. It rings on the patient’s phone until they open it.') : T('Alert sent. It shows when the patient opens their link (alerts are not turned on on their phone yet).'), r.devices ? '' : 'warn'); render();
      const phone = String(p.phone || '').replace(/\D/g, '').slice(-10); const st = settings(); const doc = st.doctorName ? 'Dr. ' + st.doctorName : st.bizName;
      if (waWin) waWin.location = waLink(`${v.level === 'red' ? '🚨 ' : '⚠️ '}${doc}: ${text}\n\n${T('Open your link and tap “I have seen it”')}: ${portalUrl(p.linkToken)}`, phone);
    } catch (err) { if (waWin) waWin.close(); throw err; }
  });
};
A.cancelFlag = pid => { const p = patientById(pid); if (!p?.flag) return; confirmBox('Stop this alert?', 'The patient’s phone stops getting it. Use this if you already talked to the patient.', 'Stop alert', async () => { await S.adapter.clinicCancelAlert(S.org.orgId, p.flag.id); p.flag = { ...p.flag, cancelledAt: nowAt() }; if (S.adapter.mode !== 'cloud') await save('patients', p); toast('Alert stopped'); render(); }, 'primary'); };

/* ---------- hooks into the rest of the app ---------- */
const eventDashboard = V.dashboard; V.dashboard = () => (isClinic() ? `<div class="sec-h" style="margin-top:0"><h2>Today${info('c-home')}</h2></div>` + clinicHome() : eventDashboard());
const eventSettings = V.settings; V.settings = () => (isClinic() ? clinicSettings() : eventSettings());
const CLINIC_ROLE_HELP = { manager: 'Another doctor: patients, records, appointments.', supervisor: 'Front desk: appointments, fees, patient list and messages. No medical records.', staff: 'Nurse / assistant: adds readings, sees records, helps with patients.' };
const _liveNotice = liveNotice; liveNotice = (coll, rec, old) => {
  if (!isClinic()) return _liveNotice(coll, rec, old);
  if (coll === 'pmsgs' && !old && rec.from === 'patient') toast(`💬 ${rec.by || T('Patient')}: ${rec.text ? rec.text.slice(0, 60) : T('photo / voice note')}`);
  else if (coll === 'readings' && !old && rec.by === 'patient') { const p = patientById(rec.patientId); toast(`${p?.name || T('Patient')}: ${T('new reading')}`); }
  else if (coll === 'appts' && !old && rec.status === 'requested') toast(`${T('Appointment request')}: ${rec.patientName}`);
};

/* ================= Patient portal (link, no login) ================= */
A.openPortal = async token => {
  const t = String(token || '').trim().toLowerCase(); const data = await S.adapter.portalView(t);
  if (!data) throw new Error('This link is not active. Please ask your clinic for a new link.');
  S.portal = { token: t, tab: S.portal?.tab || 'home', ...data }; try { history.replaceState(null, '', '#p-' + t); } catch (e) { } render();
  /* new alerts from the doctor: check when the patient comes back to the page, and every 2 minutes while it is open */
  if (!S.portalTimer) {
    const quiet = () => { const mr = document.getElementById('modalRoot'); return S.portal && document.visibilityState === 'visible' && !(mr && !mr.hidden); };
    S.portalTimer = setInterval(() => { if (quiet()) portalReload(); }, 120e3);
    document.addEventListener('visibilitychange', () => { if (quiet()) portalReload(); });
  }
};
const portalReload = async () => { try { const d = await S.adapter.portalView(S.portal.token); S.portal = { ...S.portal, ...d }; render(); } catch (e) { toast(e.message, 'bad'); } };
function portalErrorScreen(msg) { return `<div class="stripe"></div><div class="content" style="max-width:560px;padding:40px 18px"><div class="card pad stack">${ibox('alert', '#E0344B', 'lg')}<h2>${esc(T('Link not working'))}</h2><p class="muted">${esc(T(msg))}</p></div></div>`; }
V.portal = () => {
  const P = S.portal; const c = P.clinic || {}; const pt = P.patient || {}; const hi = I18N.lang === 'hi';
  const top = `<div class="row-flex" style="justify-content:space-between;margin-bottom:14px;flex-wrap:nowrap"><div class="row-flex" style="flex-wrap:nowrap;min-width:0">${c.logo ? `<div class="logo has-img"><img src="${esc(c.logo)}" alt=""></div>` : `<div class="logo" style="background:#E11D48">${ic('steth')}</div>`}<div style="min-width:0"><b style="font:800 16px var(--f-display);display:block">${esc(c.bizName || '')}</b><div class="tiny muted">${c.doctor ? 'Dr. ' + esc(c.doctor) : ''}${c.spec ? ' · ' + esc(c.spec) : ''}</div></div></div>${langSwitch()}</div>`;
  const foot = `<div class="portal-foot"><p class="small"><b>${T('In an emergency call 108 or go to the nearest hospital.')}</b> ${T('This page is not for emergencies.')}</p><p class="tiny muted">${c.doctor ? `Dr. ${esc(c.doctor)}${c.qual ? ', ' + esc(c.qual) : ''}${c.regNo ? ' · Reg. No. ' + esc(c.regNo) : ''}${c.council ? ' (' + esc(c.council) + ')' : ''}` : ''}</p><p class="tiny muted"><a href="/privacy" target="_blank" rel="noopener" style="color:inherit">${T('Privacy policy')}</a> · <a href="https://sabmanage.com/?utm_source=patient-link" target="_blank" rel="noopener" style="color:inherit">Powered by SabManage</a></p></div>`;
  if (!P.consent) return `<div class="stripe"></div><div class="content portal" style="max-width:640px">${top}<form class="card pad stack" onsubmit="A.portalConsent(event)"><h2>${T('Namaste')} ${esc(pt.name || '')} 🙏</h2>
    <p>${esc(c.bizName || '')} ${T('uses this page to look after your health between visits.')}</p>
    <ul class="terms-points"><li>${T('You can send your BP, sugar and weight readings.')}</li><li>${T('You can tell your problem by writing, a photo or a voice note.')}</li><li>${T('You can book an appointment and pay the fee.')}</li></ul>
    <label class="check terms"><input type="checkbox" name="ok"> <span>${T('I agree that my readings, messages, photos and voice notes are shared with this clinic and stored safely by SabManage for my treatment. I can ask the clinic to delete them.')}</span></label>
    <button class="btn primary block" style="min-height:52px;font-size:17px" type="submit">${ic('check')} ${T('Agree and continue')}</button></form>${foot}</div>`;
  const now = todayLocal(); const appts = (P.appts || []).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = appts.find(a => a.date >= now && ['booked', 'requested'].includes(a.status)); const dues = appts.filter(a => +a.fee > 0 && !a.paid && ['booked', 'done'].includes(a.status));
  const rd = (P.readings || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))); const track = trackOf(pt); RN = P.rules || {};
  const lastLv = rd[0] && Date.now() - msOf(rd[0].at) < 48 * 36e5 ? readingLevel(rd[0], RN) : null;
  const tel = c.phone ? String(c.phone).replace(/[^\d+]/g, '') : ''; const noRd = pt.medAlert === 'no';
  return `<div class="stripe"></div><div class="content portal" style="max-width:720px;padding-bottom:30px">${top}
  <h2 style="margin-bottom:12px">${T('Namaste')} ${esc(pt.name || '')} 🙏</h2>
  ${lastLv?.level && c.tellPatient !== false ? `<div class="banner ${lastLv.level === 'emergency' ? 'bad' : 'warn'}" style="margin-bottom:14px">${ic(lastLv.level === 'emergency' ? 'siren' : 'bell')}<span><b>${T(lastLv.level === 'emergency' ? 'Your last reading is in the danger range set by your doctor.' : 'Your last reading is outside the range set by your doctor.')}</b> ${T('Please contact your doctor.')} <span class="tiny">${esc(lastLv.flags.join(', '))} · ${atText(rd[0].at)}</span></span>${tel ? `<a class="btn sm" href="tel:${esc(tel)}">${ic('phone')} ${T('Call')}</a>` : ''}</div>` : ''}
  ${portalPushCard()}
  ${typeof portalCaseCards === 'function' ? portalCaseCards() : ''}
  ${next ? `<div class="card pad next-appt" style="margin-bottom:14px"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap"><div><div class="eyebrow">${T(next.status === 'requested' ? 'Appointment request sent' : 'Your next appointment')}</div><b style="font-size:18px">${fmtDay(next.date)}${next.time ? ' · ' + esc(next.time) : ''}</b><div class="small muted">${ic(MODE_I[next.mode]?.[0] || 'building')} ${T(MODE_L[next.mode] || 'In clinic')}${next.status === 'requested' ? ' · ' + T('waiting for the clinic to confirm') : ''}</div></div>${apptPill(next)}</div>
    ${next.mode === 'video' && next.room && next.status === 'booked' ? `<a class="btn primary block" style="margin-top:10px;min-height:50px" href="${esc(jitsiUrl(next))}" target="_blank" rel="noopener">${ic('video')} ${T('Join video call')}</a>` : next.mode === 'whatsapp' && next.status === 'booked' ? `<p class="small" style="margin-top:8px">${T('The doctor will call you on WhatsApp at this time.')}</p>` : next.mode === 'clinic' && c.address ? `<a class="btn sm" style="margin-top:8px" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent([c.address, c.city].filter(Boolean).join(', '))}">${ic('pin')} ${T('Map')}</a>` : ''}</div>` : ''}
  <div class="big-grid">${noRd ? '' : bigBtn('Send my reading', 'pulse', '#0EA5E9', 'A.portalReading()', 'BP, sugar, weight…')}${bigBtn('Tell my problem', 'mic', '#E11D48', 'A.portalMessage()', 'Write, photo or voice')}${bigBtn('Book appointment', 'calendar', '#7C3AED', 'A.portalBook()')}${dues.length && c.upi ? bigBtn('Pay fee', 'rupee', '#0B9B68', 'A.portalPay()', inr(sum(dues, a => a.fee))) : c.phone ? `<a class="big-btn" style="--c:#0B9B68" href="tel:${esc(String(c.phone).replace(/\s/g, ''))}">${ibox('phone', '#0B9B68', 'lg')}<b>${T('Call the clinic')}</b></a>` : ''}</div>
  ${noRd && !rd.length ? '' : `<div class="sec-h"><h2>${T('My health')}</h2></div>
  ${rd.length ? `<div class="grid g2">${allKeys().filter(k => (track.includes(k) || testOf(k)) && rd.some(r => hasVital(k, r))).map(k => vitalCard(k, rd, rd.slice(0, 60))).join('')}</div>`
    : `<div class="card">${empty('No readings yet', 'Tap “Send my reading” after you check your BP or sugar at home.', '', 'pulse', '#0EA5E9')}</div>`}`}
  <div class="sec-h"><h2>${T('Messages')}</h2></div>
  <div class="card pad chat"><div class="chat-list">${(P.msgs || []).map(m => msgBubble(m, m.from === 'patient')).join('') || `<div class="small muted" style="text-align:center;padding:14px">${T('Your messages to the clinic and their replies show here.')}</div>`}</div><button class="btn block" onclick="A.portalMessage()">${ic('send')} ${T('Write to the clinic')}</button></div>
  ${c.timings || c.address ? `<div class="card pad small" style="margin-top:14px">${c.timings ? `<div>${ic('clock')} ${esc(c.timings)}</div>` : ''}${c.address ? `<div style="margin-top:4px">${ic('pin')} ${esc([c.address, c.city].filter(Boolean).join(', '))}</div>` : ''}</div>` : ''}
  ${foot}</div>${portalAlertOverlay()}`;
};
/* an alert from the doctor: full screen, with sound, until the patient taps “I have seen it” */
function portalAlertOverlay() {
  const P = S.portal; const a = (P.alerts || [])[0]; if (!a) return ''; const c = P.clinic || {}; const red = a.level === 'red';
  const tel = c.phone ? String(c.phone).replace(/[^\d+]/g, '') : '';
  return `<div class="alert-scrim ${red ? 'urgent' : 'amber'}" role="alertdialog" aria-modal="true" aria-labelledby="paT"><div class="alert-card fade">
    <div class="alert-ring">${ic(red ? 'siren' : 'bell')}</div>
    <div class="eyebrow">${T(red ? 'Urgent message from your doctor' : 'Important message from your doctor')}${P.alerts.length > 1 ? ` · 1 / ${P.alerts.length}` : ''}</div>
    <h2 id="paT" style="white-space:pre-wrap">${esc(a.text)}</h2>
    <div class="small muted">${[c.doctor ? 'Dr. ' + esc(c.doctor) : '', a.by && a.by !== c.doctor ? esc(a.by) : '', atText(a.at)].filter(Boolean).join(' · ')}</div>
    ${tel ? `<a class="btn block" style="min-height:50px" href="tel:${esc(tel)}">${ic('phone')} ${T('Call the clinic')}</a>` : ''}
    <button class="btn primary block alert-ok" onclick="A.portalAck('${a.id}')">${ic('check')} ${T('I have seen it')}</button>
    <p class="tiny muted">${T('In an emergency call 108 or go to the nearest hospital.')}</p></div></div>`;
}
AFTER_RENDER.push(() => { if (S.portal?.alerts?.length) { if (!S.portalRinging) { S.portalRinging = true; Tune.play(300); } } else if (S.portalRinging) { S.portalRinging = false; Tune.stop(); } });
A.portalAck = async id => {
  Tune.stop(); S.portalRinging = false;
  try { await S.adapter.portalAck(S.portal.token, id); } catch (e) { toast(e.message, 'bad'); }
  S.portal.alerts = (S.portal.alerts || []).filter(a => a.id !== id); render(); portalReload();
};
/* the patient's own phone notifications (only on this link, no login) */
const portalPushKey = () => 'ep_ppush_' + (S.portal?.token || '');
function portalPushCard() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || location.protocol !== 'https:' || S.adapter.mode !== 'cloud') return '';
  if (Notification.permission === 'denied' || (Notification.permission === 'granted' && LS.get(portalPushKey(), false)) || LS.get(portalPushKey() + '_hide', false)) return '';
  return `<div class="card pad row-flex push-card" style="margin-bottom:14px;flex-wrap:nowrap">${ibox('bell', '#E11D48')}<div class="grow" style="min-width:0"><b>${T('Get alerts from your doctor on this phone')}</b><div class="small muted">${T('If your doctor needs to reach you urgently, this phone will ring.')}</div></div><div class="row-flex" style="gap:6px"><button class="btn primary sm" onclick="A.portalPush()">${T('Turn on')}</button><button class="icon-btn" style="width:34px;height:34px" aria-label="Hide" onclick="LS.set(portalPushKey()+'_hide',true);render()">${ic('x')}</button></div></div>`;
}
A.portalPush = async () => {
  try {
    const r = await Notification.requestPermission(); if (r !== 'granted') { toast(T('Notifications not allowed'), 'warn'); return; }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) });
    const j = sub.toJSON(); await S.adapter.portalSavePush(S.portal.token, { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
    LS.set(portalPushKey(), true); toast(T('Alerts are on. Your doctor can now reach you on this phone.')); render();
  } catch (e) { toast(T('Could not turn on alerts') + ': ' + e.message, 'bad'); }
};
/* after the patient sends a reading that crosses the doctor's limits */
function portalReadingResult(lv) {
  const c = S.portal.clinic || {}; const tel = c.phone ? String(c.phone).replace(/[^\d+]/g, '') : ''; const emg = lv.level === 'emergency';
  const wa = c.phone ? String(c.phone).replace(/\D/g, '').slice(-10) : '';
  modal(`<div class="read-result ${emg ? 'emg' : 'warn'}">${sheetHead(emg ? 'Please contact your doctor now' : 'Please contact your doctor', lv.flags.join(', '))}<div class="sheet-b stack">
    <div class="banner ${emg ? 'bad' : 'warn'}">${ic(emg ? 'siren' : 'bell')}<span>${T(emg ? 'This reading is in the danger range your doctor set. Your doctor has been alerted. Call your doctor now.' : 'This reading is outside the range your doctor set. The clinic has been told. Please talk to your doctor.')}</span></div>
    ${tel ? `<a class="btn primary block" style="min-height:54px;font-size:17px" href="tel:${esc(tel)}">${ic('phone')} ${T('Call the clinic')}</a>` : ''}
    ${wa ? `<a class="btn wa block" target="_blank" rel="noopener" href="${esc(waLink(`${T('Namaste')}, ${S.portal.patient?.name || ''}: ${lv.flags.join(', ')}`, wa))}">${ic('wa')} WhatsApp</a>` : ''}
    <p class="small"><b>${T('If you feel very unwell, call 108 or go to the nearest hospital.')}</b></p>
    <button class="btn ghost block" onclick="A.closeModal()">${T('OK')}</button></div></div>`);
}
A.portalConsent = e => { e.preventDefault(); if (!e.target.ok.checked) { toast('Please tick the box to agree', 'bad'); return; } withBtn(e, async () => { await S.adapter.portalConsent(S.portal.token, S.portal.patient?.name || ''); await portalReload(); }); };
A.portalReading = () => {
  const track = trackOf(S.portal.patient);
  modal(`<form class="form" onsubmit="A.portalSaveReading(event)" novalidate>${sheetHead('Send my reading', fmtDay(todayLocal()))}<div class="sheet-b stack">${readingFields(track)}</div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit" style="min-height:48px">${ic('send')} Send</button></footer></form>`);
};
A.portalSaveReading = e => {
  e.preventDefault(); const f = e.target;
  withBtn(e, async () => {
    const r = cleanReading(readValues(f)); if (!readingHas(r)) throw new Error('Fill at least one reading');
    const saved = await S.adapter.portalReading(S.portal.token, r); A.closeModal();
    const lv = saved?.level ? { level: saved.level, flags: saved.flags || [] } : readingLevel(r, S.portal.rules || {});
    await portalReload();
    if (lv.level && S.portal.clinic?.tellPatient !== false) portalReadingResult(lv); else toast(T('Sent to the clinic. Thank you!'));
  });
};
A.portalMessage = () => {
  PEND.pmsg = [];
  modal(`<form class="form" onsubmit="A.portalSendMsg(event)" novalidate>${sheetHead('Tell my problem', 'Write, add a photo, or record your voice')}<div class="sheet-b stack">
    <textarea name="text" rows="3" placeholder="${esc(T('e.g. Since yesterday I have fever and headache'))}"></textarea>${attachBar('pmsg', true)}
    <p class="tiny muted">${T('In an emergency call 108 or go to the nearest hospital.')}</p></div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit" style="min-height:48px">${ic('send')} Send</button></footer></form>`);
};
A.portalSendMsg = e => {
  e.preventDefault(); const text = (e.target.text.value || '').trim();
  if (!text && !(PEND.pmsg || []).length) { toast('Write something, or add a photo or voice note', 'bad'); return; }
  withBtn(e, async () => { const files = await uploadPending('pmsg', `p/${S.portal.token}`); await S.adapter.portalMessage(S.portal.token, { text, files }); A.closeModal(); toast(T('Sent to the clinic. Thank you!')); await portalReload(); });
};
A.portalBook = () => {
  const c = S.portal.clinic || {};
  modal(`<form class="form" onsubmit="A.portalSaveBook(event)" novalidate>${sheetHead('Book appointment', c.timings || '')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: todayLocal(), min: todayLocal() })}${fieldHTML({ name: 'time', label: 'Time you prefer', type: 'time' })}</div>
    <div class="field"><span>How</span><div class="chips">${Object.entries(MODE_L).map(([k, l], i) => `<label class="chip-radio"><input type="radio" name="mode" value="${k}" ${i === 0 ? 'checked' : ''}><span>${ic(MODE_I[k][0])} ${l}${+(k === 'clinic' ? c.feeClinic : c.feeVideo) ? ' · ' + inr(k === 'clinic' ? c.feeClinic : c.feeVideo) : ''}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'reason', label: 'Reason (optional)', placeholder: 'e.g. sugar check-up' })}
    <p class="tiny muted">${T('The clinic will confirm the time on WhatsApp or here.')}</p></div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit" style="min-height:48px">${ic('check')} Send request</button></footer></form>`);
};
A.portalSaveBook = e => { e.preventDefault(); const v = readForm(e.target); withBtn(e, async () => { await S.adapter.portalBook(S.portal.token, { date: v.date, time: v.time, mode: v.mode, reason: v.reason }); A.closeModal(); toast(T('Request sent. The clinic will confirm.')); await portalReload(); }); };
A.portalPay = async () => {
  const P = S.portal; const c = P.clinic || {}; const dues = (P.appts || []).filter(a => +a.fee > 0 && !a.paid && ['booked', 'done'].includes(a.status)); if (!dues.length || !c.upi) return;
  const a = dues[0]; const upi = `upi://pay?pa=${encodeURIComponent(c.upi)}&pn=${encodeURIComponent(c.bizName || 'Clinic')}&am=${(+a.fee).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Fee ' + (P.patient?.name || '') + ' ' + a.date)}`;
  modal(`<form class="form" onsubmit="A.portalPaid(event,'${a.id}')" novalidate>${sheetHead('Pay fee', `${inr(a.fee)} · ${fmtDate(a.date)}`)}<div class="sheet-b stack">
    <a class="btn primary block" style="min-height:54px;font-size:17px" href="${esc(upi)}">${ic('rupee')} <span>${T('Pay with any UPI app')}</span> <b>${inr(a.fee)}</b></a>
    <div class="qr-pay" id="payQr"></div><div class="small muted" style="text-align:center">UPI: <b class="mono">${esc(c.upi)}</b> <button type="button" class="linkbtn" onclick="A.copy('${esc(c.upi)}')">${ic('copy')}</button></div>
    ${a.payClaim ? `<div class="banner good">${ic('check')}<span>${T('You told the clinic you have paid. They will confirm soon.')}</span></div>` : `${fieldHTML({ name: 'utr', label: 'UPI reference / UTR number (optional)', placeholder: '12-digit number in your UPI app' })}<button class="btn block" type="submit">${ic('check')} ${T('I have paid')}</button>`}
  </div></form>`);
  try { await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'); const q = window.qrcode(0, 'M'); q.addData(upi); q.make(); const el = $('#payQr'); if (el) el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { }
};
A.portalPaid = (e, id) => { e.preventDefault(); const v = readForm(e.target); withBtn(e, async () => { await S.adapter.portalPaid(S.portal.token, id, v.utr || ''); A.closeModal(); toast(T('Thank you! The clinic will confirm.')); await portalReload(); }); };
