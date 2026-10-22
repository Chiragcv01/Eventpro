/* ================= Speciality tools for clinics =================
   Each doctor gets tools for their speciality (Settings → Tools for your speciality; default from the speciality picked
   at sign-up): dentist teeth chart + treatment plan, eye exam + spectacle Rx, cancer care (diagnosis, stage, chemo
   cycles with counts), pregnancy (EDD, weeks, scans, ANC visits), child growth + vaccines, therapy sessions & packages
   (physio, skin, ayurveda, dialysis), mood scales (PHQ-9, GAD-7), diet plans + body measurements.
   Data lives in collection 'visits' (module medical, loaded per patient, so the front desk never sees it):
   one summary record per tool and patient: id 'sp_<tool>_<patientId>', kind '<tool>';
   log entries: kind 'eye' | 'cycle' | 'anc' | 'growth' | 'session' | 'scale' | 'body'.
   Only neutral reminders are copied to the patient record (patient.dues = [{k, label, date}]) for the clinic home. */
Object.assign(ICONS, {
  tooth: 'M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.5 1.5 5 .7 1.6.8 3.5 1.2 5.5.3 1.7.8 3 1.8 3s1.4-1.5 1.8-3.3c.3-1.5.8-2.7 1.7-2.7s1.4 1.2 1.7 2.7c.4 1.8.8 3.3 1.8 3.3s1.5-1.3 1.8-3c.4-2 .5-3.9 1.2-5.5.7-1.5 1.5-3 1.5-5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  ribbon: 'M12 3a4 4 0 0 0-4 4c0 2.2 1.4 4.3 2.6 6.1L6.5 20.5l3 .4L12 16.4l2.5 4.5 3-.4-4.1-7.4C14.6 11.3 16 9.2 16 7a4 4 0 0 0-4-4z',
  baby: 'M12 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 21v-3.5a5 5 0 0 1 10 0V21M9.5 15.5h5',
  mind: 'M9.5 4A3.5 3.5 0 0 0 6 7.5v.3A3 3 0 0 0 4 10.5a3 3 0 0 0 1.4 2.6A3.5 3.5 0 0 0 9 18h.5V4zM14.5 4A3.5 3.5 0 0 1 18 7.5v.3a3 3 0 0 1 2 2.7 3 3 0 0 1-1.4 2.6A3.5 3.5 0 0 1 15 18h-.5V4zM9.5 18v2.5M14.5 18v2.5'
});
const SPEC = {
  dental: { label: 'Teeth', long: 'Teeth chart & treatment plan', icon: 'tooth', c: '#0891B2' },
  eye: { label: 'Eye', long: 'Eye exam & glasses', icon: 'eye', c: '#2563EB' },
  onco: { label: 'Cancer care', long: 'Cancer care: stage, chemo cycles, counts', icon: 'ribbon', c: '#DB2777' },
  preg: { label: 'Pregnancy', long: 'Pregnancy: due date, weeks, scans, check-ups', icon: 'heart', c: '#E11D74' },
  child: { label: 'Growth & vaccines', long: 'Child growth & vaccines', icon: 'baby', c: '#16A34A' },
  sessions: { label: 'Sessions', long: 'Therapy sessions & packages', icon: 'clock', c: '#7C3AED' },
  scales: { label: 'Mood scales', long: 'Mood scales (PHQ-9, GAD-7)', icon: 'mind', c: '#0F766E' },
  diet: { label: 'Diet plan', long: 'Diet plan & body measurements', icon: 'utensils', c: '#EA580C' }
};
const SPEC_DEFAULT = { 'Dentist': ['dental'], 'Eye specialist': ['eye'], 'Oncologist (Cancer)': ['onco'], 'Gynaecologist': ['preg'], 'Paediatrician': ['child'], 'Physiotherapist': ['sessions'],
  'Orthopaedic': ['sessions'], 'Dermatologist': ['sessions'], 'Ayurveda': ['sessions'], 'Nephrologist': ['sessions'], 'Psychiatrist': ['scales'], 'Dietitian': ['diet'] };
/* readings / lab tests that each speciality usually follows (added to Settings → Readings on one tap) */
const SPEC_TESTS = {
  'Diabetologist': [['HbA1c', '%', { high: 6.5 }], ['Fasting insulin', 'µIU/mL', {}], ['Waist', 'cm', {}]],
  'Cardiologist': [['Cholesterol (total)', 'mg/dL', { high: 200 }], ['LDL', 'mg/dL', { high: 130 }], ['HDL', 'mg/dL', { low: 40 }], ['Triglycerides', 'mg/dL', { high: 150 }]],
  'Oncologist (Cancer)': [['Haemoglobin', 'g/dL', { low: 10, critLow: 8 }], ['WBC', '×10³/µL', { low: 4, critLow: 2 }], ['Platelets', '×10³/µL', { low: 150, critLow: 75 }]],
  'Nephrologist': [['Creatinine', 'mg/dL', { high: 1.2 }], ['Urea', 'mg/dL', { high: 45 }], ['eGFR', 'mL/min', { low: 60, critLow: 15 }], ['Potassium', 'mmol/L', { low: 3.5, high: 5.5, critHigh: 6.5 }]],
  'Gynaecologist': [['Haemoglobin', 'g/dL', { low: 11, critLow: 7 }], ['TSH', 'mIU/L', { low: 0.4, high: 4.5 }]],
  'General Physician': [['HbA1c', '%', { high: 6.5 }], ['TSH', 'mIU/L', { low: 0.4, high: 4.5 }], ['Haemoglobin', 'g/dL', { low: 11 }]],
  'Pulmonologist': [['Peak flow', 'L/min', {}]], 'Physiotherapist': [['Pain score', '0–10', { high: 6 }]], 'Orthopaedic': [['Pain score', '0–10', { high: 6 }], ['Uric acid', 'mg/dL', { high: 7 }]],
  'Gastroenterologist': [['SGPT (ALT)', 'U/L', { high: 45 }], ['Bilirubin (total)', 'mg/dL', { high: 1.2 }]], 'Dietitian': [['Waist', 'cm', {}], ['Body fat', '%', {}]]
};
const specTools = () => { const st = settings(); return Array.isArray(st.specTools) ? st.specTools.filter(k => SPEC[k]) : (SPEC_DEFAULT[st.specialisation] || []); };
const specId = (tool, pid) => `sp_${tool}_${pid}`;
const specSum = (tool, pid) => getById('visits', specId(tool, pid));
const specLog = (pid, kind) => col('visits').filter(v => v.patientId === pid && v.kind === kind).sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.created || 0) - (a.created || 0));
const dShort = d => d ? T(fmtShort(d)) : '—';
const nOr = v => v === '' || v == null ? '' : +v;
async function saveSpec(rec, msg) { need('medical', 2); await save('visits', rec, msg); await updateDues(rec.patientId); }
const specCan = () => can('medical', 2);
function specHead(tool, sub, acts = '') { const t = SPEC[tool]; return `<div class="spec-head" style="--c:${t.c}">${ibox(t.icon, t.c)}<div class="grow" style="min-width:0"><b>${T(t.long)}</b>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>${acts}</div>`; }
/* small line chart: pts = [{x: label, y: number}] */
function miniLine(pts, c = '#2563EB', unit = '') {
  pts = pts.filter(p => p.y !== '' && p.y != null && isFinite(+p.y)); if (pts.length < 2) return '';
  const W = 320, H = 110, pad = 22; const ys = pts.map(p => +p.y); const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const x = i => pad + (W - pad * 2) * i / (pts.length - 1); const y = v => H - pad - (H - pad * 2) * (v - lo) / span;
  return `<svg class="mini-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend"><polyline fill="none" stroke="${c}" stroke-width="2.5" points="${pts.map((p, i) => `${x(i)},${y(+p.y)}`).join(' ')}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(+p.y)}" r="3.5" fill="${c}"><title>${esc(p.x)}: ${p.y}${unit}</title></circle>`).join('')}<text x="${pad}" y="13">${esc(String(hi))}${unit}</text><text x="${pad}" y="${H - 4}">${esc(String(lo))}${unit}</text></svg>`;
}
function clinicPrint(p, title, body) {
  const st = settings(); const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', 'bad'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)} · ${esc(title)}</title><style>body{font:15px/1.5 system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 18px}h1{font-size:22px;margin:0}h2{font-size:18px;margin:18px 0 8px}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #C2185B;padding-bottom:10px;margin-bottom:14px}.muted{color:#555;font-size:13px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f4f4f6}.r{text-align:right}.sign{margin-top:44px;text-align:right}@media print{button{display:none}}</style></head><body>
  <div class="top"><div>${st.logo ? `<img src="${esc(st.logo)}" alt="" style="height:54px">` : ''}<h1>${esc(st.bizName || '')}</h1><div class="muted">${esc([st.address, st.city].filter(Boolean).join(', '))}${st.phone ? ' · ' + esc(st.phone) : ''}</div></div>
  <div style="text-align:right"><b>Dr. ${esc(st.doctorName || '')}</b><div class="muted">${esc(st.qualification || '')}${st.specialisation ? ' · ' + esc(st.specialisation) : ''}</div><div class="muted">Reg. No. ${esc(st.regNo || '—')}</div></div></div>
  <div style="display:flex;justify-content:space-between"><div><b>${esc(p.name)}</b> <span class="muted">${esc(ageSex(p))}</span></div><div class="muted">${fmtDate(todayLocal())}</div></div>
  <h2>${esc(title)}</h2>${body}
  <div class="sign">${st.stamp ? `<img src="${esc(st.stamp)}" alt="" style="height:60px"><br>` : ''}Dr. ${esc(st.doctorName || '')}</div>
  <button onclick="print()" style="margin-top:20px;padding:10px 16px">Print / Save as PDF</button></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) { } }, 400);
}

/* ---------- patient page: which tabs, which screen ---------- */
const specTabs = p => can('medical') ? specTools().map(k => ['sp-' + k, SPEC[k].label]) : [];
function specView(tool, p) {
  const f = { dental: dentalTab, eye: eyeTab, onco: oncoTab, preg: pregTab, child: childTab, sessions: sessionsTab, scales: scalesTab, diet: dietTab }[tool];
  return f ? f(p) : '';
}

/* ---------- reminders copied to the patient (shown on the clinic home and in Marketing → Recall) ---------- */
async function updateDues(pid) {
  const p = patientById(pid); if (!p) return; const out = []; const t = todayLocal();
  const on = specSum('onco', pid); const cyc = specLog(pid, 'cycle').find(c => c.nextDate);
  if (on && on.status !== 'done' && cyc?.nextDate) out.push({ k: 'onco', label: 'Next treatment cycle', date: cyc.nextDate });
  const pg = specSum('preg', pid);
  if (pg && pg.status !== 'delivered' && pg.status !== 'ended') { const nx = pregNextAnc(pg, pid); if (nx) out.push({ k: 'anc', label: 'Pregnancy check-up', date: nx }); const edd = pregEdd(pg); if (edd && edd >= t) out.push({ k: 'edd', label: 'Due date (EDD)', date: edd }); }
  const ch = specSum('child', pid); if (ch?.dob) { const nv = childNextVaccine(ch); if (nv) out.push({ k: 'vacc', label: `Vaccine: ${nv.name}`, date: nv.due }); }
  const eyeR = specLog(pid, 'eye').find(x => x.next); if (eyeR?.next && eyeR.next >= addDays(t, -30)) out.push({ k: 'eye', label: 'Eye check-up', date: eyeR.next });
  const pk = activePkg(pid); if (pk && pk.left <= 1) out.push({ k: 'pkg', label: pk.left ? 'Last session of package' : 'Package finished', date: t });
  const old = JSON.stringify(p.dues || []), now = JSON.stringify(out);
  if (old !== now && can('patients', 2)) { try { await save('patients', { ...p, dues: out }); } catch (e) { } }
}
const allDues = (days = 7) => { const lim = addDays(todayLocal(), days); const out = []; col('patients').forEach(p => (p.dues || []).forEach(d => { if (d.date && d.date <= lim) out.push({ ...d, p }); })); return out.sort((a, b) => a.date.localeCompare(b.date)); };
function dueMsg(d) {
  const st = settings(); const day = fmtDate(d.date);
  return I18N.lang === 'hi' ? `नमस्ते ${d.p.name} जी 🙏\n${st.bizName} से याद दिला रहे हैं: आपका ${T(d.label)} ${day} को है। कृपया समय तय करने के लिए जवाब दें।\n${st.phone || ''}`
    : `Namaste ${d.p.name} ji 🙏\nA reminder from ${st.bizName}: your ${d.label.toLowerCase()} is on ${day}. Please reply to fix a time.\n${st.phone || ''}`;
}
function dueCard() {
  const list = allDues(7); if (!list.length || !can('patients')) return '';
  const t = todayLocal();
  return `<div class="sec-h"><h2>${T('Due soon')}${info('c-dues')}</h2></div><div class="card"><div class="rows">${list.slice(0, 12).map(d => `<div class="row" style="flex-wrap:wrap"><button class="avatar linkish" style="background:#FFE4EA;color:#9F1239" onclick="A.go('patient',{id:'${d.p.id}'})">${esc(initials(d.p.name))}</button><div class="main-col" style="min-width:150px"><b>${esc(d.p.name)}</b><div class="sub">${esc(T(d.label))} · ${dShort(d.date)}</div></div>${pill(d.date < t ? T('Overdue') : d.date === t ? T('Today') : dShort(d.date), d.date < t ? 'bad' : d.date === t ? 'warn' : '')}<div class="row-flex" style="gap:6px">${d.p.phone ? waBtn(dueMsg(d), d.p.phone, T('Send reminder')) : ''}${can('appointments', 2) ? `<button class="btn sm" onclick="A.apptForm({patientId:'${d.p.id}',date:'${d.date >= t ? d.date : t}'})">${ic('calendar')} ${T('Book')}</button>` : ''}</div></div>`).join('')}</div></div>`;
}

/* ================= 1. Dentist: teeth chart + treatment plan ================= */
const TEETH_ADULT = [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]];
const TEETH_CHILD = [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65], [85, 84, 83, 82, 81], [71, 72, 73, 74, 75]];
const TOOTH_ST = { ok: ['Healthy', '#FFFFFF'], caries: ['Decay', '#FBBF24'], filled: ['Filled', '#60A5FA'], rct: ['Root canal', '#A78BFA'], crown: ['Crown / cap', '#38BDF8'], bridge: ['Bridge', '#818CF8'],
  implant: ['Implant', '#2DD4BF'], missing: ['Missing', '#CBD5E1'], extract: ['To extract', '#FB7185'], pain: ['Pain / sensitive', '#FB923C'], mobile: ['Loose', '#F472B6'] };
const DENTAL_PROCS = [['Consultation & check-up', 300], ['X-ray (IOPA)', 200], ['OPG X-ray', 600], ['Scaling & polishing', 800], ['Filling (composite)', 1200], ['Root canal (RCT)', 4500], ['Crown – metal ceramic', 5000], ['Crown – zirconia', 10000],
  ['Extraction', 800], ['Wisdom tooth surgery', 3500], ['Implant', 25000], ['Bridge (per unit)', 5000], ['Complete denture', 15000], ['Braces (full)', 35000], ['Teeth whitening', 6000], ['Fluoride / sealant', 600]];
const PLAN_ST = { planned: ['Planned', ''], doing: ['In progress', 'warn'], done: ['Done', 'good'] };
const dentalRec = pid => specSum('dental', pid) || { id: specId('dental', pid), patientId: pid, kind: 'dental', date: todayLocal(), teeth: {}, plan: [], child: false };
function toothBtn(pid, no, rec) {
  const s = rec.teeth?.[no] || {}; const st = TOOTH_ST[s.st] || TOOTH_ST.ok; const inPlan = (rec.plan || []).some(x => x.status !== 'done' && String(x.teeth || '').split(/[ ,]+/).includes(String(no)));
  return `<button class="tooth ${s.st && s.st !== 'ok' ? 'mark' : ''} ${s.st === 'missing' ? 'gone' : ''}" style="--t:${st[1]}" title="${esc(T(st[0]))}${s.note ? ' · ' + esc(s.note) : ''}" ${specCan() ? `onclick="A.toothSheet('${pid}',${no})"` : 'disabled'}><span>${no}</span>${inPlan ? '<i></i>' : ''}</button>`;
}
function dentalTab(p) {
  const rec = dentalRec(p.id); const rows = rec.child ? TEETH_CHILD : TEETH_ADULT; const plan = rec.plan || [];
  const tot = sum(plan, x => +x.fee || 0), done = sum(plan.filter(x => x.status === 'done'), x => +x.fee || 0);
  const used = Object.entries(TOOTH_ST).filter(([k]) => k === 'ok' || Object.values(rec.teeth || {}).some(t => t.st === k));
  return specHead('dental', T('Tap a tooth to mark it or plan its treatment.'), specCan() ? `<button class="btn sm" onclick="A.dentalChild('${p.id}')">${T(rec.child ? 'Adult teeth' : 'Child teeth')}</button>` : '') + `
  <div class="card pad"><div class="teeth">
    <div class="jaw"><div class="q" data-l="${T('Upper right')}">${rows[0].map(n => toothBtn(p.id, n, rec)).join('')}</div><div class="q" data-l="${T('Upper left')}">${rows[1].map(n => toothBtn(p.id, n, rec)).join('')}</div></div>
    <div class="jaw-line"><span>${T('Right')}</span><span>${T('Upper')} ↑ · ↓ ${T('Lower')}</span><span>${T('Left')}</span></div>
    <div class="jaw"><div class="q" data-l="${T('Lower right')}">${rows[2].map(n => toothBtn(p.id, n, rec)).join('')}</div><div class="q" data-l="${T('Lower left')}">${rows[3].map(n => toothBtn(p.id, n, rec)).join('')}</div></div></div>
    <div class="tooth-legend">${used.map(([k, [l, c]]) => `<span><i style="background:${c}"></i>${T(l)}</span>`).join('')}<span><i class="dot"></i>${T('In treatment plan')}</span></div></div>
  <div class="sec-h"><h2>${T('Treatment plan')}</h2><div class="row-flex" style="gap:6px">${plan.length ? `<button class="btn sm" onclick="A.dentalPrint('${p.id}')">${ic('print')} ${T('Estimate')}</button>${p.phone ? waBtn(dentalEstimateText(p, rec), p.phone, T('Send'), 'btn sm wa') : ''}` : ''}${specCan() ? `<button class="btn sm primary" onclick="A.planForm('${p.id}')">${ic('plus')} ${T('Add treatment')}</button>` : ''}</div></div>
  <div class="card">${plan.length ? `<div class="rows">${plan.map(x => `<button class="row click" onclick="A.planForm('${p.id}','${x.id}')"><span class="tooth-no">${esc(x.teeth || '—')}</span><div class="main-col"><b>${esc(T(x.proc))}</b><div class="sub">${x.status === 'done' && x.doneOn ? dShort(x.doneOn) + ' · ' : ''}${esc(x.note || '')}</div></div>${pill(T(PLAN_ST[x.status]?.[0] || 'Planned'), PLAN_ST[x.status]?.[1] || '')}<b class="num">${inr(+x.fee || 0)}</b></button>`).join('')}</div>
    <div class="plan-tot"><span>${T('Total')} <b>${inr(tot)}</b></span><span>${T('Done')} <b>${inr(done)}</b></span><span>${T('Remaining')} <b>${inr(tot - done)}</b></span></div>` : empty('No treatment planned', 'Add fillings, root canal, crowns or cleaning with the fee. Print or send the estimate to the patient.', '', 'tooth', SPEC.dental.c)}</div>`;
}
A.dentalChild = async pid => { const r = dentalRec(pid); try { await saveSpec({ ...r, child: !r.child }); render(); } catch (e) { toast(e.message, 'bad'); } };
A.toothSheet = (pid, no) => {
  const r = dentalRec(pid); const s = r.teeth?.[no] || {};
  modal(`<form class="form" onsubmit="A.saveTooth(event,'${pid}',${no})" novalidate>${sheetHead(`${T('Tooth')} ${no}`, toothName(no))}<div class="sheet-b stack">
    <div class="field"><span>${T('Condition')}</span><div class="chips">${Object.entries(TOOTH_ST).map(([k, [l, c]]) => `<label class="chip-radio"><input type="radio" name="st" value="${k}" ${(s.st || 'ok') === k ? 'checked' : ''}><span><i class="sw" style="background:${c}"></i>${T(l)}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'note', label: 'Note (optional)', value: s.note || '', placeholder: 'e.g. Deep caries distal, sensitive to cold' })}
    <label class="check"><input type="checkbox" name="addPlan"> <span>${T('Also add a treatment for this tooth')}</span></label>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`);
};
const toothName = no => { const n = +no; const child = n > 50; const q = Math.floor(n / 10) % 4 || 4; const pos = n % 10; const side = [1, 4, 5, 8].includes(Math.floor(n / 10)) ? T('Right') : T('Left'); const jaw = [1, 2, 5, 6].includes(Math.floor(n / 10)) ? T('Upper') : T('Lower');
  const names = child ? ['', 'Central incisor', 'Lateral incisor', 'Canine', 'First molar', 'Second molar'] : ['', 'Central incisor', 'Lateral incisor', 'Canine', 'First premolar', 'Second premolar', 'First molar', 'Second molar', 'Third molar (wisdom)']; void q;
  return `${jaw} ${side} · ${T(names[pos] || '')}${child ? ' · ' + T('milk tooth') : ''}`; };
A.saveTooth = (e, pid, no) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const st = f.querySelector('input[name=st]:checked')?.value || 'ok';
  withBtn(e, async () => {
    const r = dentalRec(pid); const teeth = { ...(r.teeth || {}) }; if (st === 'ok' && !v.note) delete teeth[no]; else teeth[no] = { st, note: (v.note || '').trim() };
    await saveSpec({ ...r, teeth }, `Tooth ${no}: ${TOOTH_ST[st][0]}`); A.closeModal(); render();
    if (v.addPlan) setTimeout(() => A.planForm(pid, '', String(no), st), 60);
  });
};
A.planForm = (pid, id, teeth, st) => {
  const r = dentalRec(pid); const x = id ? (r.plan || []).find(y => y.id === id) : { teeth: teeth || '', status: 'planned', proc: { caries: 'Filling (composite)', rct: 'Root canal (RCT)', extract: 'Extraction', missing: 'Implant', pain: 'Consultation & check-up' }[st] || '' };
  const fee = x.fee ?? (DENTAL_PROCS.find(d => d[0] === x.proc)?.[1] || '');
  modal(`<form class="form" onsubmit="A.savePlan(event,'${pid}','${id || ''}')" novalidate>${sheetHead(T(id ? 'Edit treatment' : 'Add treatment'), patientById(pid)?.name || '')}<div class="sheet-b stack">
    <div class="field"><span>${T('Treatment')}</span><select name="proc" onchange="const o=this.selectedOptions[0];if(o.dataset.fee&&!this.form.fee.dataset.touched)this.form.fee.value=o.dataset.fee">${DENTAL_PROCS.map(([n, f]) => `<option value="${esc(n)}" data-fee="${f}" ${x.proc === n ? 'selected' : ''}>${esc(T(n))} · ${inr(f)}</option>`).join('')}${x.proc && !DENTAL_PROCS.some(d => d[0] === x.proc) ? `<option selected value="${esc(x.proc)}">${esc(x.proc)}</option>` : ''}</select></div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'teeth', label: 'Tooth number(s)', value: x.teeth || '', placeholder: 'e.g. 36 or 11, 21' })}${fieldHTML({ name: 'fee', label: 'Fee ₹', type: 'number', min: 0, value: fee }).replace('<input', '<input oninput="this.dataset.touched=1"')}</div>
    <div class="field"><span>${T('Status')}</span><div class="chips">${Object.entries(PLAN_ST).map(([k, [l]]) => `<label class="chip-radio"><input type="radio" name="status" value="${k}" ${(x.status || 'planned') === k ? 'checked' : ''}><span>${T(l)}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'note', label: 'Note (optional)', value: x.note || '', placeholder: 'e.g. 2 sittings, cap after 1 week' })}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.delPlan('${pid}','${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`);
};
A.savePlan = (e, pid, id) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const status = f.querySelector('input[name=status]:checked')?.value || 'planned';
  withBtn(e, async () => {
    const r = dentalRec(pid); const plan = [...(r.plan || [])]; const old = id ? plan.find(y => y.id === id) : null;
    const item = { ...(old || { id: uid('tp_') }), proc: v.proc, teeth: (v.teeth || '').trim(), fee: +v.fee || 0, status, note: (v.note || '').trim(), doneOn: status === 'done' ? (old?.doneOn || todayLocal()) : '' };
    const teeth = { ...(r.teeth || {}) };
    if (status === 'done') { const to = { 'Filling (composite)': 'filled', 'Root canal (RCT)': 'rct', 'Crown – metal ceramic': 'crown', 'Crown – zirconia': 'crown', 'Extraction': 'missing', 'Implant': 'implant', 'Bridge (per unit)': 'bridge' }[v.proc]; if (to) item.teeth.split(/[ ,]+/).filter(Boolean).forEach(n => { teeth[n] = { ...(teeth[n] || {}), st: to }; }); }
    if (old) plan[plan.indexOf(old)] = item; else plan.push(item);
    await saveSpec({ ...r, plan, teeth }, `${item.proc} ${item.teeth ? '(' + item.teeth + ')' : ''}: ${status}`); A.closeModal(); toast('Saved'); render();
  });
};
A.delPlan = (pid, id) => confirmBox('Remove this treatment?', '', 'Remove', async () => { const r = dentalRec(pid); await saveSpec({ ...r, plan: (r.plan || []).filter(x => x.id !== id) }); A.closeModal(); render(); });
function dentalEstimateText(p, r) {
  const st = settings(); const plan = (r.plan || []).filter(x => x.status !== 'done'); const tot = sum(plan, x => +x.fee || 0);
  return `${I18N.lang === 'hi' ? 'नमस्ते' : 'Namaste'} ${p.name} ji 🙏\n${st.bizName} — ${T('Treatment estimate')}\n${plan.map(x => `• ${T(x.proc)}${x.teeth ? ' (' + x.teeth + ')' : ''}: ${inr(+x.fee || 0)}`).join('\n')}\n${T('Total')}: ${inr(tot)}\n${st.phone || ''}`;
}
A.dentalPrint = pid => {
  const p = patientById(pid); const r = dentalRec(pid); const plan = r.plan || []; const marked = Object.entries(r.teeth || {}).filter(([, t]) => t.st && t.st !== 'ok');
  clinicPrint(p, 'Dental treatment estimate', `${marked.length ? `<p><b>Findings:</b> ${marked.map(([n, t]) => `${n} – ${esc(TOOTH_ST[t.st]?.[0] || t.st)}${t.note ? ' (' + esc(t.note) + ')' : ''}`).join('; ')}</p>` : ''}
    <table><thead><tr><th>Tooth</th><th>Treatment</th><th>Status</th><th class="r">Fee</th></tr></thead><tbody>${plan.map(x => `<tr><td>${esc(x.teeth || '—')}</td><td>${esc(x.proc)}${x.note ? `<div class="muted">${esc(x.note)}</div>` : ''}</td><td>${esc(PLAN_ST[x.status]?.[0] || '')}</td><td class="r">${inr(+x.fee || 0)}</td></tr>`).join('')}
    <tr><th colspan="3" class="r">Total</th><th class="r">${inr(sum(plan, x => +x.fee || 0))}</th></tr></tbody></table><p class="muted">Fees are an estimate and may change if the treatment changes.</p>`);
};

/* ================= 2. Eye: vision, glasses power, eye pressure ================= */
const VA_OPTS = ['', '6/5', '6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', '5/60', '3/60', '1/60', 'CF', 'HM', 'PL+', 'NPL'];
const NEAR_OPTS = ['', 'N5', 'N6', 'N8', 'N10', 'N12', 'N18', 'N24', 'N36'];
const pw = v => v === '' || v == null ? '—' : (+v > 0 ? '+' : '') + (+v).toFixed(2);
function eyeRxTable(x) {
  const r = x.rx || {}; const row = s => `<td>${pw(r[s]?.sph)}</td><td>${pw(r[s]?.cyl)}</td><td>${r[s]?.axis ?? '—'}${r[s]?.axis !== '' && r[s]?.axis != null ? '°' : ''}</td><td>${pw(r[s]?.add)}</td>`;
  return `<table class="eye-tbl"><thead><tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr></thead><tbody><tr><th>${T('Right')} (OD)</th>${row('r')}</tr><tr><th>${T('Left')} (OS)</th>${row('l')}</tr></tbody></table>`;
}
function eyeTab(p) {
  const list = specLog(p.id, 'eye'); const last = list[0];
  const iop = list.slice().reverse().map(x => ({ x: fmtShort(x.date), r: x.iop?.r, l: x.iop?.l }));
  return specHead('eye', last ? `${T('Last check')}: ${dShort(last.date)}${last.next ? ` · ${T('Next')}: ${dShort(last.next)}` : ''}` : '', specCan() ? `<button class="btn sm primary" onclick="A.eyeForm('${p.id}')">${ic('plus')} ${T('Eye exam')}</button>` : '') +
  (list.length ? `${iop.filter(x => x.r || x.l).length > 1 ? `<div class="card pad"><b class="small">${T('Eye pressure (IOP) trend')}</b><div class="grid2" style="padding:0">${miniLine(iop.map(x => ({ x: x.x, y: x.r })), '#2563EB', '')}${miniLine(iop.map(x => ({ x: x.x, y: x.l })), '#DB2777', '')}</div><div class="tiny muted">${T('Blue = right eye, pink = left eye (mmHg)')}</div></div>` : ''}
    <div class="stack-sm" style="margin-top:12px">${list.map(x => `<div class="card pad stack-sm"><div class="row-flex" style="justify-content:space-between"><b>${dShort(x.date)}</b><div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.eyePrint('${x.id}')">${ic('print')} ${T('Glasses Rx')}</button>${specCan() ? `<button class="icon-btn" aria-label="Edit" onclick="A.eyeForm('${p.id}','${x.id}')">${ic('edit')}</button>` : ''}</div></div>
      <div class="eye-va"><span>${T('Vision')} R <b>${esc(x.va?.r || '—')}</b> · L <b>${esc(x.va?.l || '—')}</b></span>${x.bcva?.r || x.bcva?.l ? `<span>${T('With glasses')} R <b>${esc(x.bcva?.r || '—')}</b> · L <b>${esc(x.bcva?.l || '—')}</b></span>` : ''}${x.near?.r || x.near?.l ? `<span>${T('Near')} R <b>${esc(x.near?.r || '—')}</b> · L <b>${esc(x.near?.l || '—')}</b></span>` : ''}${x.iop?.r || x.iop?.l ? `<span class="${+x.iop?.r > 21 || +x.iop?.l > 21 ? 'bad-t' : ''}">IOP R <b>${x.iop?.r ?? '—'}</b> · L <b>${x.iop?.l ?? '—'}</b> mmHg</span>` : ''}</div>
      ${eyeRxTable(x)}${x.diagnosis ? `<div class="small"><b>${T('Diagnosis')}:</b> ${esc(x.diagnosis)}</div>` : ''}${x.findings ? `<div class="small muted">${esc(x.findings)}</div>` : ''}${x.advice ? `<div class="small"><b>${T('Advice')}:</b> ${esc(x.advice)}</div>` : ''}</div>`).join('')}</div>`
  : `<div class="card">${empty('No eye exam yet', 'Record vision, glasses power and eye pressure. Print the glasses prescription in one tap.', specCan() ? `<button class="btn primary" onclick="A.eyeForm('${p.id}')">${ic('plus')} ${T('Eye exam')}</button>` : '', 'eye', SPEC.eye.c)}</div>`);
}
A.eyeForm = (pid, id) => {
  const x = id ? getById('visits', id) : { date: todayLocal(), rx: { r: {}, l: {} }, va: {}, bcva: {}, near: {}, iop: {} };
  const sel = (name, opts, val) => `<select name="${name}">${opts.map(o => `<option ${o === (val || '') ? 'selected' : ''} value="${o}">${o || '—'}</option>`).join('')}</select>`;
  const num = (name, val, step = '0.25', min = -30, max = 30) => `<input name="${name}" type="number" step="${step}" min="${min}" max="${max}" inputmode="decimal" value="${val ?? ''}">`;
  const rxRow = s => `<tr><th>${T(s === 'r' ? 'Right' : 'Left')}</th><td>${num(s + '.sph', x.rx?.[s]?.sph)}</td><td>${num(s + '.cyl', x.rx?.[s]?.cyl)}</td><td>${num(s + '.axis', x.rx?.[s]?.axis, '1', 0, 180)}</td><td>${num(s + '.add', x.rx?.[s]?.add, '0.25', 0, 4)}</td></tr>`;
  modal(`<form class="form" onsubmit="A.saveEye(event,'${pid}','${id || ''}')" novalidate>${sheetHead(T('Eye exam'), patientById(pid)?.name || '')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: x.date })}${fieldHTML({ name: 'next', label: 'Next check-up (optional)', type: 'date', value: x.next || '' })}</div>
    <div class="eye-grid"><b></b><b>${T('Right')}</b><b>${T('Left')}</b>
      <span>${T('Vision (without glasses)')}</span>${sel('va.r', VA_OPTS, x.va?.r)}${sel('va.l', VA_OPTS, x.va?.l)}
      <span>${T('Vision with glasses')}</span>${sel('bcva.r', VA_OPTS, x.bcva?.r)}${sel('bcva.l', VA_OPTS, x.bcva?.l)}
      <span>${T('Near vision')}</span>${sel('near.r', NEAR_OPTS, x.near?.r)}${sel('near.l', NEAR_OPTS, x.near?.l)}
      <span>${T('Eye pressure (IOP, mmHg)')}</span>${num('iop.r', x.iop?.r, '1', 0, 80)}${num('iop.l', x.iop?.l, '1', 0, 80)}</div>
    <div class="field"><span>${T('Glasses power')}</span><div class="tbl-wrap"><table class="eye-in"><thead><tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr></thead><tbody>${rxRow('r')}${rxRow('l')}</tbody></table></div></div>
    ${fieldHTML({ name: 'findings', label: 'Findings (anterior segment, fundus)', type: 'textarea', rows: 2, value: x.findings || '' })}
    ${fieldHTML({ name: 'diagnosis', label: 'Diagnosis', value: x.diagnosis || '', placeholder: 'e.g. Myopia, early cataract, glaucoma suspect' })}
    ${fieldHTML({ name: 'advice', label: 'Advice (glasses, lens, drops)', type: 'textarea', rows: 2, value: x.advice || '' })}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
};
A.saveEye = (e, pid, id) => {
  e.preventDefault(); const v = readForm(e.target); const g = k => v[k] ?? '';
  withBtn(e, async () => {
    const base = id ? getById('visits', id) : { id: uid('ey_'), patientId: pid, kind: 'eye', created: Date.now() };
    const rx = s => ({ sph: nOr(g(s + '.sph')), cyl: nOr(g(s + '.cyl')), axis: nOr(g(s + '.axis')), add: nOr(g(s + '.add')) });
    const rec = { ...base, date: v.date || todayLocal(), next: v.next || '', va: { r: g('va.r'), l: g('va.l') }, bcva: { r: g('bcva.r'), l: g('bcva.l') }, near: { r: g('near.r'), l: g('near.l') }, iop: { r: nOr(g('iop.r')), l: nOr(g('iop.l')) }, rx: { r: rx('r'), l: rx('l') }, findings: (v.findings || '').trim(), diagnosis: (v.diagnosis || '').trim(), advice: (v.advice || '').trim() };
    await saveSpec(rec, `Eye exam for ${patientById(pid)?.name}`); A.closeModal(); toast('Saved'); render();
    if (+rec.iop.r > 21 || +rec.iop.l > 21) setTimeout(() => toast(T('Eye pressure is above 21 mmHg'), 'warn'), 600);
  });
};
A.eyePrint = id => { const x = getById('visits', id); const p = patientById(x.patientId); clinicPrint(p, 'Spectacle prescription', `${eyeRxTable(x).replace(/ class="eye-tbl"/, '')}<p>Vision: R ${esc(x.va?.r || '—')} · L ${esc(x.va?.l || '—')}${x.bcva?.r || x.bcva?.l ? ` &nbsp; With glasses: R ${esc(x.bcva?.r || '—')} · L ${esc(x.bcva?.l || '—')}` : ''}</p>${x.diagnosis ? `<p><b>Diagnosis:</b> ${esc(x.diagnosis)}</p>` : ''}${x.advice ? `<p><b>Advice:</b> ${esc(x.advice)}</p>` : ''}${x.next ? `<p><b>Next check-up:</b> ${fmtDate(x.next)}</p>` : ''}`); };
A.delSpecLog = id => confirmBox('Delete this entry?', '', 'Delete', async () => { const x = getById('visits', id); await removeRec('visits', id, 'Deleted a record'); await updateDues(x.patientId); A.closeModal(); render(); });

/* ================= 3. Cancer care ================= */
const ONCO_TYPES = ['Chemo cycle', 'Immunotherapy', 'Targeted therapy', 'Hormone therapy', 'Radiation', 'Surgery', 'Scan / review', 'Follow-up'];
const bsaOf = (h, w) => h && w ? Math.round(Math.sqrt(h * w / 3600) * 100) / 100 : '';
const lowCounts = x => { const out = []; if (x.hb !== '' && x.hb != null && +x.hb < 8) out.push('Hb ' + x.hb); if (x.wbc !== '' && x.wbc != null && +x.wbc < 3) out.push('WBC ' + x.wbc); if (x.anc !== '' && x.anc != null && +x.anc < 1.5) out.push('ANC ' + x.anc); if (x.plt !== '' && x.plt != null && +x.plt < 100) out.push('Platelets ' + x.plt); return out; };
function oncoTab(p) {
  const s = specSum('onco', p.id); const log = specLog(p.id, 'cycle'); const chemo = log.filter(x => x.type === 'Chemo cycle'); const t = todayLocal();
  const next = log.find(x => x.nextDate)?.nextDate; const done = chemo.length; const planned = +s?.cycles || 0;
  const head = specHead('onco', s ? [s.site, s.stage ? T('Stage') + ' ' + s.stage : '', s.intent ? T(s.intent) : ''].filter(Boolean).map(esc).join(' · ') : T('Add the diagnosis first.'), specCan() ? `<button class="btn sm" onclick="A.oncoForm('${p.id}')">${ic('edit')} ${T('Diagnosis')}</button>` : '');
  if (!s) return head + `<div class="card">${empty('No cancer details yet', 'Add site, type, stage, regimen and number of cycles. Then log every cycle with weight, dose and blood counts.', specCan() ? `<button class="btn primary" onclick="A.oncoForm('${p.id}')">${ic('plus')} ${T('Add diagnosis')}</button>` : '', 'ribbon', SPEC.onco.c)}</div>`;
  const lc = log[0] ? lowCounts(log[0]) : [];
  return head + `<div class="today-strip"><div><b>${done}${planned ? '/' + planned : ''}</b><span>${T('Cycles done')}</span></div><div><b>${next ? dShort(next) : '—'}</b><span>${next && next < t ? T('Overdue') : T('Next cycle')}</span></div><div><b>${s.ecog !== '' && s.ecog != null ? s.ecog : '—'}</b><span>ECOG</span></div></div>
    ${planned ? `<div class="card pad"><div class="cyc-bar">${Array.from({ length: planned }, (_, i) => `<i class="${i < done ? 'on' : ''}">${i + 1}</i>`).join('')}</div></div>` : ''}
    ${lc.length ? `<div class="banner bad" style="margin-top:12px">${ic('alert')}<span><b>${T('Low counts in the last entry')}:</b> ${esc(lc.join(', '))}. ${T('Check before the next cycle.')}</span></div>` : ''}
    <div class="card pad stack-sm" style="margin-top:12px"><div class="onco-grid">${[['Type / histology', s.histology], ['Diagnosed on', s.diagDate ? fmtDate(s.diagDate) : ''], ['TNM', s.tnm], ['Markers', s.markers], ['Regimen', s.regimen], ['Every', s.interval ? s.interval + ' ' + T('days') : ''], ['Height', s.height ? s.height + ' cm' : '']].filter(x => x[1]).map(([l, v]) => `<div><span>${T(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>${s.notes ? `<div class="small muted">${esc(s.notes)}</div>` : ''}</div>
    <div class="sec-h"><h2>${T('Treatment log')}</h2>${specCan() ? `<button class="btn sm primary" onclick="A.cycleForm('${p.id}')">${ic('plus')} ${T('Add cycle / treatment')}</button>` : ''}</div>
    <div class="card">${log.length ? `<div class="rows">${log.map(x => { const low = lowCounts(x); return `<button class="row click" onclick="A.cycleForm('${p.id}','${x.id}')">${ibox(x.type === 'Chemo cycle' ? 'drop' : x.type === 'Radiation' ? 'bolt' : x.type === 'Surgery' ? 'wrench' : 'file', SPEC.onco.c, 'sm')}<div class="main-col"><b>${esc(T(x.type))}${x.cycleNo ? ' ' + x.cycleNo : ''}</b><div class="sub">${dShort(x.date)}${x.weight ? ` · ${x.weight} kg` : ''}${x.bsa ? ` · BSA ${x.bsa}` : ''}${x.drugs ? ' · ' + esc(String(x.drugs).split('\n')[0]) : ''}</div>${[x.hb !== '' && x.hb != null ? 'Hb ' + x.hb : '', x.wbc !== '' && x.wbc != null ? 'WBC ' + x.wbc : '', x.plt !== '' && x.plt != null ? 'Plt ' + x.plt : ''].filter(Boolean).length ? `<div class="tiny ${low.length ? 'bad-t' : 'muted'}">${[x.hb !== '' && x.hb != null ? 'Hb ' + x.hb : '', x.wbc !== '' && x.wbc != null ? 'WBC ' + x.wbc : '', x.plt !== '' && x.plt != null ? 'Plt ' + x.plt : ''].filter(Boolean).join(' · ')}</div>` : ''}${x.effects ? `<div class="tiny muted">${T('Side effects')}: ${esc(x.effects)}${x.grade ? ' (G' + x.grade + ')' : ''}</div>` : ''}</div>${x.nextDate ? pill(T('Next') + ' ' + dShort(x.nextDate), x.nextDate < t ? 'bad' : '') : ''}</button>`; }).join('')}</div>` : empty('Nothing logged yet', 'Log each chemo cycle, radiation or surgery here.', '', 'ribbon', SPEC.onco.c)}</div>`;
}
A.oncoForm = pid => {
  const s = specSum('onco', pid) || { intent: 'Curative', interval: 21 };
  formModal({ title: 'Cancer diagnosis', sub: patientById(pid)?.name, fields: [
    { name: 'site', label: 'Cancer site', value: s.site, required: true, placeholder: 'e.g. Breast (left), Lung, Oral cavity' },
    { name: 'histology', label: 'Type / histology', value: s.histology, placeholder: 'e.g. Invasive ductal carcinoma' },
    { name: 'stage', label: 'Stage', type: 'select', options: ['', 'I', 'II', 'III', 'IV', 'Not known'], value: s.stage },
    { name: 'tnm', label: 'TNM', value: s.tnm, placeholder: 'e.g. T2 N1 M0' },
    { name: 'diagDate', label: 'Diagnosed on', type: 'date', value: s.diagDate },
    { name: 'markers', label: 'Markers (ER/PR/HER2, EGFR…)', value: s.markers },
    { name: 'ecog', label: 'ECOG (0–4)', type: 'select', options: [['', '—'], ['0', '0 · Fully active'], ['1', '1 · Light work'], ['2', '2 · Self care, up >50%'], ['3', '3 · Limited self care'], ['4', '4 · Bed bound']], value: s.ecog ?? '' },
    { name: 'intent', label: 'Intent', type: 'select', options: ['Curative', 'Adjuvant', 'Neoadjuvant', 'Palliative'], value: s.intent },
    { name: 'regimen', label: 'Regimen', value: s.regimen, placeholder: 'e.g. AC → Paclitaxel' },
    { name: 'cycles', label: 'Cycles planned', type: 'number', min: 0, max: 60, value: s.cycles },
    { name: 'interval', label: 'Days between cycles', type: 'number', min: 1, max: 90, value: s.interval || 21 },
    { name: 'height', label: 'Height (cm, for BSA)', type: 'number', min: 40, max: 230, value: s.height },
    { name: 'status', label: 'Treatment', type: 'select', options: [['', 'Ongoing'], ['done', 'Completed / on follow-up']], value: s.status || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: s.notes, full: true }],
    onSubmit: async v => { const base = specSum('onco', pid) || { id: specId('onco', pid), patientId: pid, kind: 'onco', created: Date.now() };
      await saveSpec({ ...base, ...v, date: todayLocal(), cycles: nOr(v.cycles), interval: +v.interval || 21, height: nOr(v.height), ecog: v.ecog }, `Cancer details for ${patientById(pid)?.name}`); render(); } });
};
A.cycleForm = (pid, id) => {
  const s = specSum('onco', pid) || {}; const chemo = specLog(pid, 'cycle').filter(x => x.type === 'Chemo cycle');
  const x = id ? getById('visits', id) : { date: todayLocal(), type: 'Chemo cycle', cycleNo: chemo.length + 1, nextDate: addDays(todayLocal(), +s.interval || 21) };
  modal(`<form class="form" onsubmit="A.saveCycle(event,'${pid}','${id || ''}')" novalidate>${sheetHead(T(id ? 'Edit treatment' : 'Add cycle / treatment'), patientById(pid)?.name || '')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'type', label: 'What', type: 'select', options: ONCO_TYPES.map(t => [t, T(t)]), value: x.type })}${fieldHTML({ name: 'cycleNo', label: 'Cycle no.', type: 'number', min: 0, value: x.cycleNo })}
    ${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: x.date })}${fieldHTML({ name: 'nextDate', label: 'Next cycle due', type: 'date', value: x.nextDate || '' })}
    ${fieldHTML({ name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1', min: 1, value: x.weight }).replace('<input', `<input oninput="const h=${+s.height || 0};this.form.querySelector('.bsa').textContent=h&&this.value?'BSA '+Math.round(Math.sqrt(h*this.value/3600)*100)/100+' m²':''"`)}<div class="field"><span>BSA</span><b class="bsa" style="padding:12px 0">${x.bsa ? 'BSA ' + x.bsa + ' m²' : s.height ? '' : T('Add height in the diagnosis for BSA')}</b></div></div>
    ${fieldHTML({ name: 'drugs', label: 'Drugs and doses (one per line)', type: 'textarea', rows: 3, value: x.drugs || '', placeholder: 'e.g. Paclitaxel 175 mg/m² – 300 mg' })}
    <div class="field"><span>${T('Blood counts before this cycle')}</span><div class="grid4">${[['hb', 'Hb g/dL'], ['wbc', 'WBC ×10³'], ['anc', 'ANC ×10³'], ['plt', 'Platelets ×10³']].map(([k, l]) => `<label class="field"><span>${l}</span><input name="${k}" type="number" step="0.1" min="0" inputmode="decimal" value="${x[k] ?? ''}"></label>`).join('')}</div></div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'effects', label: 'Side effects', value: x.effects || '', placeholder: 'e.g. Nausea, mouth ulcers, fatigue' })}${fieldHTML({ name: 'grade', label: 'Worst grade (0–4)', type: 'select', options: ['', '0', '1', '2', '3', '4'], value: x.grade || '' })}</div>
    ${fieldHTML({ name: 'note', label: 'Note', value: x.note || '' })}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
};
A.saveCycle = (e, pid, id) => {
  e.preventDefault(); const v = readForm(e.target); const s = specSum('onco', pid) || {};
  withBtn(e, async () => {
    const base = id ? getById('visits', id) : { id: uid('cy_'), patientId: pid, kind: 'cycle', created: Date.now() };
    const rec = { ...base, type: v.type, cycleNo: nOr(v.cycleNo), date: v.date || todayLocal(), nextDate: v.nextDate || '', weight: nOr(v.weight), bsa: bsaOf(+s.height, +v.weight), drugs: (v.drugs || '').trim(), hb: nOr(v.hb), wbc: nOr(v.wbc), anc: nOr(v.anc), plt: nOr(v.plt), effects: (v.effects || '').trim(), grade: v.grade || '', note: (v.note || '').trim() };
    await saveSpec(rec, `${rec.type} ${rec.cycleNo || ''} for ${patientById(pid)?.name}`); A.closeModal(); toast('Saved'); render();
    const low = lowCounts(rec); if (low.length) setTimeout(() => toast(`${T('Low counts')}: ${low.join(', ')}`, 'warn'), 600);
  });
};

/* ================= 4. Pregnancy ================= */
const PREG_STEPS = [['dating', 'Dating / viability scan', 6, 10], ['nt', 'NT scan + double marker', 11, 14], ['td1', 'Td vaccine – 1st dose', 4, 36], ['ifa', 'Start iron & calcium', 14, 16], ['anomaly', 'Anomaly (level 2) scan', 18, 22],
  ['td2', 'Td vaccine – 2nd dose (4 weeks after 1st)', 8, 36], ['gtt', 'Sugar test (GTT)', 24, 28], ['growth', 'Growth scan', 28, 32], ['doppler', 'Doppler / NST if needed', 32, 37], ['plan', 'Delivery plan & hospital', 36, 38]];
const pregEdd = s => s.eddScan || (s.lmp ? addDays(s.lmp, 280) : '');
const pregGA = (s, on = todayLocal()) => { const edd = pregEdd(s); if (!edd) return null; const d = 280 - daysBetween(on, edd); return d < 0 ? null : { w: Math.floor(d / 7), d: d % 7, days: d }; };
const gaText = g => g ? `${g.w}${T('w')} ${g.d}${T('d')}` : '—';
function pregNextAnc(s, pid) {
  const last = specLog(pid, 'anc')[0]; const g = pregGA(s); if (!g) return '';
  const gap = g.w < 28 ? 28 : g.w < 36 ? 14 : 7; const from = last?.date || todayLocal(); const nx = addDays(from, gap);
  return pregEdd(s) && nx > addDays(pregEdd(s), 14) ? '' : nx;
}
const stepState = (s, k, w1, w2) => { const done = (s.steps || {})[k]; if (done) return ['done', done]; const lmp = s.lmp || (pregEdd(s) ? addDays(pregEdd(s), -280) : ''); if (!lmp) return ['', '']; const a = addDays(lmp, w1 * 7), b = addDays(lmp, w2 * 7); const t = todayLocal(); return [t < a ? 'later' : t <= b ? 'now' : 'missed', t < a ? a : b]; };
function pregTab(p) {
  const s = specSum('preg', p.id); const t = todayLocal();
  if (!s) return specHead('preg', '') + `<div class="card">${empty('No pregnancy record', 'Add the last period date (LMP). The app works out the due date, weeks, scan dates and the next check-up.', specCan() ? `<button class="btn primary" onclick="A.pregForm('${p.id}')">${ic('plus')} ${T('Start pregnancy record')}</button>` : '', 'heart', SPEC.preg.c)}</div>`;
  const g = pregGA(s); const edd = pregEdd(s); const anc = specLog(p.id, 'anc'); const nx = pregNextAnc(s, p.id); const ended = ['delivered', 'ended'].includes(s.status);
  const tri = g ? (g.w < 13 ? T('1st trimester') : g.w < 28 ? T('2nd trimester') : T('3rd trimester')) : '';
  return specHead('preg', ended ? `${T(s.status === 'delivered' ? 'Delivered' : 'Pregnancy ended')}${s.deliveryDate ? ' · ' + dShort(s.deliveryDate) : ''}${s.outcome ? ' · ' + esc(T(s.outcome)) : ''}` : `${gaText(g)} · ${tri}`, specCan() ? `<button class="btn sm" onclick="A.pregForm('${p.id}')">${ic('edit')} ${T('Details')}</button>` : '') + `
    ${ended ? '' : `<div class="today-strip"><div><b>${gaText(g)}</b><span>${T('Weeks now')}</span></div><div><b>${edd ? dShort(edd) : '—'}</b><span>${T('Due date (EDD)')}</span></div><div><b>${nx ? dShort(nx) : '—'}</b><span>${nx && nx < t ? T('Check-up overdue') : T('Next check-up')}</span></div></div>
    ${g ? `<div class="card pad"><div class="preg-bar"><i style="--p:${Math.min(100, Math.round(g.days / 280 * 100))}%"></i><span style="left:${13 / 40 * 100}%">13w</span><span style="left:${28 / 40 * 100}%">28w</span><span style="left:${37 / 40 * 100}%">37w</span></div></div>` : ''}`}
    <div class="card pad stack-sm" style="margin-top:12px"><div class="onco-grid">${[['LMP', s.lmp ? fmtDate(s.lmp) : ''], ['G P A L', [s.g, s.p, s.a, s.l].some(x => x !== '' && x != null) ? `G${s.g || 0} P${s.p || 0} A${s.a || 0} L${s.l || 0}` : ''], ['Blood group', s.blood], ['Risk', s.risk]].filter(x => x[1]).map(([l, v]) => `<div><span>${T(l)}</span><b>${esc(v)}</b></div>`).join('')}</div></div>
    ${ended ? '' : `<div class="sec-h"><h2>${T('Scans & tests')}</h2></div><div class="card"><div class="rows">${PREG_STEPS.map(([k, l, w1, w2]) => { const [st, d] = stepState(s, k, w1, w2); return `<label class="row step-row ${st}"><input type="checkbox" ${st === 'done' ? 'checked' : ''} ${specCan() ? `onchange="A.pregStep('${p.id}','${k}',this.checked)"` : 'disabled'}><div class="main-col"><b>${T(l)}</b><div class="sub">${w1}–${w2} ${T('weeks')}${d ? ` · ${st === 'done' ? T('Done') + ' ' + dShort(d) : st === 'later' ? T('From') + ' ' + dShort(d) : st === 'now' ? T('Due by') + ' ' + dShort(d) : T('Window passed') + ' ' + dShort(d)}` : ''}</div></div>${st === 'now' ? pill(T('Due now'), 'warn') : st === 'missed' ? pill(T('Missed?'), 'bad') : ''}</label>`; }).join('')}</div></div>`}
    <div class="sec-h"><h2>${T('Check-ups (ANC)')}</h2>${specCan() && !ended ? `<button class="btn sm primary" onclick="A.ancForm('${p.id}')">${ic('plus')} ${T('Add check-up')}</button>` : ''}</div>
    <div class="card">${anc.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Date')}</th><th>${T('Weeks')}</th><th>${T('Weight')}</th><th>BP</th><th>FHR</th><th>${T('Fundal ht')}</th><th>Hb</th><th></th></tr></thead><tbody>${anc.map(x => `<tr class="${+x.sys >= 140 || +x.dia >= 90 ? 'row-crit' : ''}"><td>${dShort(x.date)}</td><td>${esc(x.ga || '')}</td><td>${x.weight || '—'}</td><td>${x.sys ? x.sys + '/' + x.dia : '—'}</td><td>${x.fhr || '—'}</td><td>${x.fundal || '—'}</td><td>${x.hb || '—'}</td><td>${specCan() ? `<button class="icon-btn" aria-label="Edit" onclick="A.ancForm('${p.id}','${x.id}')">${ic('edit')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No check-up yet', 'Add weight, BP, baby heart rate and fundal height at every visit.', '', 'heart', SPEC.preg.c)}</div>`;
}
A.pregForm = pid => {
  const s = specSum('preg', pid) || {};
  formModal({ title: 'Pregnancy details', sub: patientById(pid)?.name, fields: [
    { name: 'lmp', label: 'Last period date (LMP)', type: 'date', value: s.lmp, hint: 'Due date = LMP + 280 days' },
    { name: 'eddScan', label: 'Due date by scan (optional)', type: 'date', value: s.eddScan, hint: 'If the scan date differs, this is used' },
    { name: 'g', label: 'Gravida (G)', type: 'number', min: 0, max: 20, value: s.g }, { name: 'p', label: 'Para (P)', type: 'number', min: 0, max: 20, value: s.p },
    { name: 'a', label: 'Abortions (A)', type: 'number', min: 0, max: 20, value: s.a }, { name: 'l', label: 'Living (L)', type: 'number', min: 0, max: 20, value: s.l },
    { name: 'blood', label: 'Blood group', type: 'select', options: ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'], value: s.blood },
    { name: 'risk', label: 'Risk factors', value: s.risk, placeholder: 'e.g. Previous C-section, thyroid, twins' },
    { name: 'status', label: 'Status', type: 'select', options: [['', 'Ongoing'], ['delivered', 'Delivered'], ['ended', 'Pregnancy ended']], value: s.status || '' },
    { name: 'deliveryDate', label: 'Delivery date', type: 'date', value: s.deliveryDate },
    { name: 'outcome', label: 'Delivery', type: 'select', options: ['', 'Normal delivery', 'C-section', 'Assisted delivery'], value: s.outcome },
    { name: 'baby', label: 'Baby (weight, sex)', value: s.baby, placeholder: 'e.g. 3.1 kg, girl' }],
    onSubmit: async v => { if (!v.lmp && !v.eddScan) throw new Error('Add the LMP or the scan due date');
      const base = specSum('preg', pid) || { id: specId('preg', pid), patientId: pid, kind: 'preg', created: Date.now(), steps: {} };
      await saveSpec({ ...base, ...v, date: todayLocal() }, `Pregnancy details for ${patientById(pid)?.name}`); render(); } });
};
A.pregStep = async (pid, k, on) => { const s = specSum('preg', pid); const steps = { ...(s.steps || {}) }; if (on) steps[k] = todayLocal(); else delete steps[k]; try { await saveSpec({ ...s, steps }); render(); } catch (e) { toast(e.message, 'bad'); } };
A.ancForm = (pid, id) => {
  const s = specSum('preg', pid) || {}; const x = id ? getById('visits', id) : { date: todayLocal() };
  formModal({ title: id ? 'Edit check-up' : 'Pregnancy check-up', sub: `${patientById(pid)?.name} · ${gaText(pregGA(s, x.date))}`, fields: [
    { name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1', value: x.weight },
    { name: 'sys', label: 'BP upper', type: 'number', value: x.sys }, { name: 'dia', label: 'BP lower', type: 'number', value: x.dia },
    { name: 'fhr', label: 'Baby heart rate (FHR, bpm)', type: 'number', value: x.fhr }, { name: 'fundal', label: 'Fundal height (cm)', type: 'number', value: x.fundal },
    { name: 'hb', label: 'Hb (g/dL)', type: 'number', step: '0.1', value: x.hb }, { name: 'urine', label: 'Urine albumin / sugar', value: x.urine, placeholder: 'e.g. Nil / Nil' },
    { name: 'note', label: 'Notes', type: 'textarea', value: x.note, full: true }],
    left: id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const base = id ? x : { id: uid('an_'), patientId: pid, kind: 'anc', created: Date.now() };
      const rec = { ...base, ...v, date: v.date || todayLocal(), ga: gaText(pregGA(s, v.date || todayLocal())) }; ['weight', 'sys', 'dia', 'fhr', 'fundal', 'hb'].forEach(k => rec[k] = nOr(v[k]));
      await saveSpec(rec, `Pregnancy check-up for ${patientById(pid)?.name}`); render();
      if (+rec.sys >= 140 || +rec.dia >= 90) setTimeout(() => toast(T('High BP in pregnancy: check for pre-eclampsia'), 'bad'), 500); } });
};

/* ================= 5. Child: growth + vaccines ================= */
const VACCINES = [[0, 'BCG'], [0, 'OPV-0'], [0, 'Hep B-1'], [42, 'DTP-1'], [42, 'IPV-1'], [42, 'Hib-1'], [42, 'Hep B-2'], [42, 'Rotavirus-1'], [42, 'PCV-1'],
  [70, 'DTP-2'], [70, 'IPV-2'], [70, 'Hib-2'], [70, 'Hep B-3'], [70, 'Rotavirus-2'], [70, 'PCV-2'], [98, 'DTP-3'], [98, 'IPV-3'], [98, 'Hib-3'], [98, 'Hep B-4'], [98, 'Rotavirus-3'], [98, 'PCV-3'],
  [183, 'Influenza-1'], [213, 'Influenza-2'], [274, 'MMR-1'], [274, 'Typhoid conjugate'], [365, 'Hep A-1'], [456, 'MMR-2'], [456, 'Varicella-1'], [456, 'PCV booster'],
  [487, 'DTP booster-1'], [487, 'IPV booster'], [487, 'Hib booster'], [548, 'Hep A-2'], [548, 'Varicella-2'], [1643, 'DTP booster-2'], [1643, 'MMR-3'], [3650, 'Tdap'], [3650, 'HPV-1'], [3833, 'HPV-2']];
const vKey = n => n.toLowerCase().replace(/[^a-z0-9]/g, '');
const ageText = (dob, on = todayLocal()) => { const d = daysBetween(dob, on); if (d < 0) return ''; if (d < 60) return `${Math.floor(d / 7)} ${T('weeks')}`; const m = Math.floor(d / 30.44); return m < 24 ? `${m} ${T('months')}` : `${Math.floor(m / 12)} ${T('yrs')} ${m % 12 ? (m % 12) + ' ' + T('months') : ''}`; };
function childNextVaccine(s) { const t = todayLocal(); const g = s.given || {}; const v = VACCINES.find(([d, n]) => !g[vKey(n)] && addDays(s.dob, d) >= addDays(t, -60)); return v ? { name: v[1], due: addDays(s.dob, v[0]) } : null; }
function childTab(p) {
  const s = specSum('child', p.id); const t = todayLocal();
  if (!s?.dob) return specHead('child', '') + `<div class="card">${empty('Add the date of birth', 'The app makes the vaccine chart with dates and shows the growth record.', specCan() ? `<button class="btn primary" onclick="A.childForm('${p.id}')">${ic('plus')} ${T('Date of birth')}</button>` : '', 'baby', SPEC.child.c)}</div>`;
  const gr = specLog(p.id, 'growth'); const last = gr[0]; const g = s.given || {}; const groups = [];
  VACCINES.forEach(([d, n]) => { let gp = groups.find(x => x.d === d); if (!gp) groups.push(gp = { d, list: [] }); gp.list.push(n); });
  const wt = gr.slice().reverse().map(x => ({ x: ageText(s.dob, x.date), y: x.weight })); const ht = gr.slice().reverse().map(x => ({ x: ageText(s.dob, x.date), y: x.height }));
  const nv = childNextVaccine(s);
  return specHead('child', `${T('Age')}: ${ageText(s.dob)} · ${T('Born')} ${dShort(s.dob)}`, specCan() ? `<button class="btn sm" onclick="A.childForm('${p.id}')">${ic('edit')}</button>` : '') + `
    <div class="today-strip"><div><b>${last?.weight ? last.weight + ' kg' : '—'}</b><span>${T('Weight')}</span></div><div><b>${last?.height ? last.height + ' cm' : '—'}</b><span>${T('Height')}</span></div><div><b>${nv ? esc(nv.name) : '✓'}</b><span>${nv ? (nv.due < t ? T('Vaccine overdue') : T('Next vaccine') + ' · ' + dShort(nv.due)) : T('Vaccines up to date')}</span></div></div>
    <div class="sec-h"><h2>${T('Growth')}</h2>${specCan() ? `<button class="btn sm primary" onclick="A.growthForm('${p.id}')">${ic('plus')} ${T('Add weight & height')}</button>` : ''}</div>
    ${gr.length > 1 ? `<div class="card pad"><div class="grid2" style="padding:0"><div><b class="small">${T('Weight')} (kg)</b>${miniLine(wt, '#16A34A', '')}</div><div><b class="small">${T('Height')} (cm)</b>${miniLine(ht, '#2563EB', '')}</div></div></div>` : ''}
    <div class="card">${gr.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Date')}</th><th>${T('Age')}</th><th>${T('Weight')}</th><th>${T('Height')}</th><th>${T('Head')}</th><th>BMI</th><th></th></tr></thead><tbody>${gr.map(x => `<tr><td>${dShort(x.date)}</td><td>${ageText(s.dob, x.date)}</td><td>${x.weight || '—'}</td><td>${x.height || '—'}</td><td>${x.hc || '—'}</td><td>${x.weight && x.height ? (x.weight / Math.pow(x.height / 100, 2)).toFixed(1) : '—'}</td><td>${specCan() ? `<button class="icon-btn" aria-label="Edit" onclick="A.growthForm('${p.id}','${x.id}')">${ic('edit')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted dept-note" style="padding-top:12px">${T('No weight or height yet.')}</p>`}</div>
    <div class="sec-h"><h2>${T('Vaccines')}${info('sp-vacc')}</h2></div>
    <div class="stack-sm">${groups.map(gp => { const due = addDays(s.dob, gp.d); return `<div class="card pad vacc-grp"><div class="row-flex" style="justify-content:space-between"><b>${gp.d === 0 ? T('At birth') : ageText(s.dob, due)}</b><span class="small muted">${dShort(due)}</span></div><div class="chips">${gp.list.map(n => { const on = g[vKey(n)]; const late = !on && due < t; return `<label class="chip-check vacc ${late ? 'late' : ''}"><input type="checkbox" ${on ? 'checked' : ''} ${specCan() ? `onchange="A.vaccTick('${p.id}','${esc(n)}',this.checked)"` : 'disabled'}><span>${esc(n)}${on ? ' · ' + dShort(on) : ''}</span></label>`; }).join('')}</div></div>`; }).join('')}</div>`;
}
A.childForm = pid => { const s = specSum('child', pid) || {}; formModal({ title: 'Child details', sub: patientById(pid)?.name, fields: [{ name: 'dob', label: 'Date of birth', type: 'date', required: true, value: s.dob }, { name: 'birthWeight', label: 'Birth weight (kg)', type: 'number', step: '0.01', value: s.birthWeight }, { name: 'notes', label: 'Notes (birth history, allergies)', type: 'textarea', value: s.notes, full: true }],
  onSubmit: async v => { const base = specSum('child', pid) || { id: specId('child', pid), patientId: pid, kind: 'child', created: Date.now(), given: {} }; await saveSpec({ ...base, ...v, birthWeight: nOr(v.birthWeight), date: todayLocal() }, `Child details for ${patientById(pid)?.name}`); render(); } }); };
A.vaccTick = async (pid, n, on) => { const s = specSum('child', pid); const given = { ...(s.given || {}) }; if (on) given[vKey(n)] = todayLocal(); else delete given[vKey(n)]; try { await saveSpec({ ...s, given }, `${n} ${on ? 'given' : 'unmarked'}`); render(); } catch (e) { toast(e.message, 'bad'); } };
A.growthForm = (pid, id) => { const x = id ? getById('visits', id) : { date: todayLocal() }; formModal({ title: 'Weight & height', sub: patientById(pid)?.name, fields: [{ name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.01', value: x.weight }, { name: 'height', label: 'Height / length (cm)', type: 'number', step: '0.1', value: x.height }, { name: 'hc', label: 'Head size (cm)', type: 'number', step: '0.1', value: x.hc }],
  left: id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : '',
  onSubmit: async v => { if (!v.weight && !v.height && !v.hc) throw new Error('Fill at least one number'); const base = id ? x : { id: uid('gr_'), patientId: pid, kind: 'growth', created: Date.now() }; await saveSpec({ ...base, date: v.date || todayLocal(), weight: nOr(v.weight), height: nOr(v.height), hc: nOr(v.hc) }, `Growth record for ${patientById(pid)?.name}`); render(); } }); };

/* ================= 6. Therapy sessions & packages (physio, skin, ayurveda, dialysis…) ================= */
const SESSION_QUICK = { 'Physiotherapist': ['IFT', 'TENS', 'Ultrasound', 'Hot pack', 'Exercises', 'Traction', 'Manual therapy', 'Taping'], 'Orthopaedic': ['Physiotherapy', 'Plaster check', 'Dressing', 'Injection'],
  'Dermatologist': ['Chemical peel', 'Laser', 'PRP', 'Hydrafacial', 'Microneedling'], 'Ayurveda': ['Abhyanga', 'Shirodhara', 'Swedana', 'Basti', 'Nasya'], 'Nephrologist': ['Dialysis'] };
const activePkg = pid => { const s = specSum('pkg', pid); const pk = (s?.pkgs || []).filter(x => !x.closed).slice(-1)[0]; if (!pk) return null; const used = specLog(pid, 'session').filter(x => x.pkgId === pk.id).length; return { ...pk, used, left: Math.max(0, (+pk.total || 0) - used) }; };
function sessionsTab(p) {
  const s = specSum('pkg', p.id); const pk = activePkg(p.id); const log = specLog(p.id, 'session');
  const pain = log.slice().reverse().filter(x => x.painAfter !== '' && x.painAfter != null).map(x => ({ x: fmtShort(x.date), y: x.painAfter }));
  return specHead('sessions', pk ? `${esc(pk.name)} · ${pk.used}/${pk.total} ${T('used')}` : T('No active package'), specCan() ? `<button class="btn sm" onclick="A.pkgForm('${p.id}')">${ic('plus')} ${T('Package')}</button>` : '') + `
    ${pk ? `<div class="card pad stack-sm"><div class="row-flex" style="justify-content:space-between"><b>${esc(pk.name)}</b><span class="small">${pk.fee ? inr(pk.fee) + ' · ' : ''}${T('from')} ${dShort(pk.start)}</span></div><div class="cyc-bar">${Array.from({ length: Math.min(+pk.total || 0, 40) }, (_, i) => `<i class="${i < pk.used ? 'on' : ''}">${i + 1}</i>`).join('')}</div>${pk.left <= 1 ? `<div class="banner warn">${ic('alert')}<span>${T(pk.left ? 'Only one session left in this package.' : 'This package is finished. Start a new one.')}</span></div>` : ''}</div>` : ''}
    ${pain.length > 1 ? `<div class="card pad" style="margin-top:12px"><b class="small">${T('Pain after session (0–10)')}</b>${miniLine(pain, SPEC.sessions.c, '')}</div>` : ''}
    <div class="sec-h"><h2>${T('Sessions')}</h2>${specCan() ? `<button class="btn sm primary" onclick="A.sessionForm('${p.id}')">${ic('plus')} ${T('Add session')}</button>` : ''}</div>
    <div class="card">${log.length ? `<div class="rows">${log.map(x => `<button class="row click" onclick="A.sessionForm('${p.id}','${x.id}')">${ibox('clock', SPEC.sessions.c, 'sm')}<div class="main-col"><b>${esc(x.therapy || T('Session'))}</b><div class="sub">${dShort(x.date)}${x.area ? ' · ' + esc(x.area) : ''}${x.painBefore !== '' && x.painBefore != null ? ` · ${T('Pain')} ${x.painBefore} → ${x.painAfter ?? '—'}` : ''}</div>${x.note ? `<div class="tiny muted">${esc(x.note)}</div>` : ''}</div></button>`).join('')}</div>` : empty('No session yet', 'Log each session with the therapy and pain score. Sell packages (e.g. 10 sessions) and see how many are left.', '', 'clock', SPEC.sessions.c)}</div>
    ${(s?.pkgs || []).length > 1 ? `<div class="sec-h"><h2>${T('Old packages')}</h2></div><div class="card"><div class="rows">${s.pkgs.filter(x => x.id !== pk?.id).map(x => `<div class="row"><div class="main-col"><b>${esc(x.name)}</b><div class="sub">${x.total} ${T('sessions')} · ${dShort(x.start)}${x.fee ? ' · ' + inr(x.fee) : ''}</div></div></div>`).join('')}</div></div>` : ''}`;
}
A.pkgForm = pid => formModal({ title: 'New package', sub: patientById(pid)?.name, fields: [{ name: 'name', label: 'Package name', required: true, placeholder: 'e.g. Knee physio – 10 sessions' }, { name: 'total', label: 'Number of sessions', type: 'number', min: 1, max: 200, required: true, value: 10 }, { name: 'fee', label: 'Package fee ₹', type: 'number', min: 0 }, { name: 'start', label: 'Start date', type: 'date', value: todayLocal() }],
  onSubmit: async v => { const base = specSum('pkg', pid) || { id: specId('pkg', pid), patientId: pid, kind: 'pkg', created: Date.now(), pkgs: [] }; const pkgs = (base.pkgs || []).map(x => ({ ...x, closed: true })); pkgs.push({ id: uid('pk_'), name: v.name.trim(), total: +v.total || 1, fee: +v.fee || 0, start: v.start || todayLocal() }); await saveSpec({ ...base, pkgs, date: todayLocal() }, `Package ${v.name} for ${patientById(pid)?.name}`); render(); } });
A.sessionForm = (pid, id) => {
  const x = id ? getById('visits', id) : { date: todayLocal() }; const pk = activePkg(pid); const quick = SESSION_QUICK[settings().specialisation] || SESSION_QUICK.Physiotherapist;
  formModal({ title: id ? 'Edit session' : 'Session', sub: `${patientById(pid)?.name}${pk && !id ? ` · ${pk.name} (${pk.used + 1}/${pk.total})` : ''}`, fields: [
    { type: 'html', full: true, html: `<div class="field"><span>${T('Quick pick')}</span><div class="chips">${quick.map(q => `<button type="button" class="chip" onclick="const t=this.form.therapy;t.value=t.value?t.value+', '+this.textContent:this.textContent">${esc(q)}</button>`).join('')}</div></div>` },
    { name: 'therapy', label: 'Therapy / procedure', value: x.therapy, full: true, required: true }, { name: 'area', label: 'Body part / area', value: x.area, placeholder: 'e.g. Right knee, lower back' }, { name: 'date', label: 'Date', type: 'date', value: x.date },
    { name: 'painBefore', label: 'Pain before (0–10)', type: 'number', min: 0, max: 10, value: x.painBefore }, { name: 'painAfter', label: 'Pain after (0–10)', type: 'number', min: 0, max: 10, value: x.painAfter },
    { name: 'note', label: 'Notes / home exercises', type: 'textarea', value: x.note, full: true }],
    left: id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const base = id ? x : { id: uid('ss_'), patientId: pid, kind: 'session', created: Date.now(), pkgId: pk && pk.left > 0 ? pk.id : '' }; await saveSpec({ ...base, therapy: v.therapy.trim(), area: (v.area || '').trim(), date: v.date || todayLocal(), painBefore: nOr(v.painBefore), painAfter: nOr(v.painAfter), note: (v.note || '').trim() }, `Session for ${patientById(pid)?.name}`); render(); } });
};

/* ================= 7. Mood scales (PHQ-9, GAD-7) ================= */
const SCALES = {
  phq9: { name: 'PHQ-9 (depression)', q: ['Little interest or pleasure in doing things', 'Feeling down, depressed, or hopeless', 'Trouble falling or staying asleep, or sleeping too much', 'Feeling tired or having little energy', 'Poor appetite or overeating', 'Feeling bad about yourself, or that you are a failure or have let yourself or your family down', 'Trouble concentrating on things, such as reading the newspaper or watching television', 'Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual', 'Thoughts that you would be better off dead, or of hurting yourself in some way'],
    sev: [[4, 'Minimal', 'good'], [9, 'Mild', ''], [14, 'Moderate', 'warn'], [19, 'Moderately severe', 'bad'], [27, 'Severe', 'bad']] },
  gad7: { name: 'GAD-7 (anxiety)', q: ['Feeling nervous, anxious, or on edge', 'Not being able to stop or control worrying', 'Worrying too much about different things', 'Trouble relaxing', 'Being so restless that it is hard to sit still', 'Becoming easily annoyed or irritable', 'Feeling afraid, as if something awful might happen'],
    sev: [[4, 'Minimal', 'good'], [9, 'Mild', ''], [14, 'Moderate', 'warn'], [21, 'Severe', 'bad']] }
};
const SCALE_ANS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
const sevOf = (k, sc) => SCALES[k].sev.find(([m]) => sc <= m) || SCALES[k].sev.slice(-1)[0];
function scalesTab(p) {
  const log = specLog(p.id, 'scale');
  return specHead('scales', T('Over the last 2 weeks. Fill with the patient, or read the questions to them.'), specCan() ? `<div class="row-flex" style="gap:6px"><button class="btn sm primary" onclick="A.scaleForm('${p.id}','phq9')">PHQ-9</button><button class="btn sm primary" onclick="A.scaleForm('${p.id}','gad7')">GAD-7</button></div>` : '') +
  ['phq9', 'gad7'].map(k => { const xs = log.filter(x => x.scale === k); if (!xs.length) return ''; const pts = xs.slice().reverse().map(x => ({ x: fmtShort(x.date), y: x.score })); return `<div class="card pad stack-sm" style="margin-top:12px"><b>${T(SCALES[k].name)}</b>${miniLine(pts, SPEC.scales.c, '')}<div class="rows">${xs.map(x => { const [, l, tone] = sevOf(k, x.score); return `<button class="row click" onclick="A.scaleForm('${p.id}','${k}','${x.id}')"><div class="main-col"><b>${x.score}</b><div class="sub">${dShort(x.date)}</div></div>${k === 'phq9' && +x.answers?.[8] > 0 ? pill(T('Item 9 positive'), 'bad') : ''}${pill(T(l), tone)}</button>`; }).join('')}</div></div>`; }).join('') +
  (log.length ? '' : `<div class="card">${empty('No scale filled yet', 'PHQ-9 for depression and GAD-7 for anxiety. The score and its trend show here.', '', 'mind', SPEC.scales.c)}</div>`);
}
A.scaleForm = (pid, k, id) => {
  const sc = SCALES[k]; const x = id ? getById('visits', id) : { date: todayLocal(), answers: [] };
  modal(`<form class="form" onsubmit="A.saveScale(event,'${pid}','${k}','${id || ''}')" novalidate>${sheetHead(T(sc.name), patientById(pid)?.name || '')}<div class="sheet-b stack">
    <p class="small muted">${T('Over the last 2 weeks, how often have you been bothered by the following problems?')}</p>
    ${sc.q.map((q, i) => `<div class="scale-q"><b>${i + 1}. ${esc(T(q))}</b><div class="chips">${SCALE_ANS.map((a, j) => `<label class="chip-radio"><input type="radio" name="q${i}" value="${j}" ${+x.answers?.[i] === j && x.answers?.[i] !== undefined ? 'checked' : ''} onchange="A.scaleLive(this.form,'${k}')"><span>${j} · ${T(a)}</span></label>`).join('')}</div></div>`).join('')}
    <div class="scale-total"><span>${T('Score')}</span><b id="scTot">${id ? x.score : 0}</b><span id="scSev"></span></div>
    ${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: x.date })}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
  setTimeout(() => { const f = document.querySelector('#modalRoot form'); if (f) A.scaleLive(f, k); }, 30);
};
A.scaleLive = (f, k) => { const n = SCALES[k].q.length; let s = 0; for (let i = 0; i < n; i++) s += +(f.querySelector(`input[name=q${i}]:checked`)?.value || 0); const el = document.getElementById('scTot'); if (el) el.textContent = s; const sv = document.getElementById('scSev'); if (sv) sv.innerHTML = pill(T(sevOf(k, s)[1]), sevOf(k, s)[2]); };
A.saveScale = (e, pid, k, id) => {
  e.preventDefault(); const f = e.target; const n = SCALES[k].q.length; const answers = []; for (let i = 0; i < n; i++) { const v = f.querySelector(`input[name=q${i}]:checked`)?.value; if (v === undefined) { toast(`${T('Answer question')} ${i + 1}`, 'bad'); return; } answers.push(+v); }
  withBtn(e, async () => {
    const score = answers.reduce((a, b) => a + b, 0); const base = id ? getById('visits', id) : { id: uid('sc_'), patientId: pid, kind: 'scale', created: Date.now() };
    await saveSpec({ ...base, scale: k, answers, score, date: f.date.value || todayLocal() }, `${SCALES[k].name}: ${score}`); A.closeModal(); render();
    if (k === 'phq9' && answers[8] > 0) setTimeout(() => toast(T('PHQ-9 item 9 is positive: assess safety today'), 'bad'), 500);
  });
};

/* ================= 8. Diet plan + body measurements ================= */
const DIET_MEALS = [['early', 'Early morning'], ['breakfast', 'Breakfast'], ['mid', 'Mid-morning'], ['lunch', 'Lunch'], ['evening', 'Evening'], ['dinner', 'Dinner'], ['bed', 'Bedtime']];
const DIET_GOALS = ['Weight loss', 'Weight gain', 'Diabetes control', 'PCOS', 'Thyroid', 'Heart health', 'Kidney diet', 'Pregnancy', 'Sports / muscle gain', 'General healthy eating'];
function dietTab(p) {
  const s = specSum('diet', p.id); const body = specLog(p.id, 'body'); const first = body[body.length - 1], last = body[0];
  const wt = body.slice().reverse().map(x => ({ x: fmtShort(x.date), y: x.weight }));
  return specHead('diet', s ? `${esc(T(s.goal || ''))}${s.kcal ? ' · ' + s.kcal + ' kcal' : ''}${s.updated ? ' · ' + T('updated') + ' ' + dShort(s.updated) : ''}` : '', specCan() ? `<button class="btn sm primary" onclick="A.dietForm('${p.id}')">${ic('edit')} ${T(s ? 'Edit plan' : 'Make diet plan')}</button>` : '') + `
    ${last ? `<div class="today-strip"><div><b>${last.weight ?? '—'} kg</b><span>${T('Weight')}${first && first !== last && last.weight && first.weight ? ` (${(last.weight - first.weight > 0 ? '+' : '') + (last.weight - first.weight).toFixed(1)})` : ''}</span></div><div><b>${last.waist ?? '—'} cm</b><span>${T('Waist')}</span></div><div><b>${last.fat ?? '—'}%</b><span>${T('Body fat')}</span></div></div>` : ''}
    ${wt.length > 1 ? `<div class="card pad"><b class="small">${T('Weight')} (kg)</b>${miniLine(wt, SPEC.diet.c, '')}</div>` : ''}
    ${s ? `<div class="card pad stack-sm" style="margin-top:12px"><div class="row-flex" style="justify-content:space-between"><b>${T('Diet plan')}</b><div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.dietPrint('${p.id}')">${ic('print')}</button>${p.phone ? waBtn(dietText(p, s), p.phone, T('Send'), 'btn sm wa') : ''}</div></div>
      <div class="meal-list">${DIET_MEALS.filter(([k]) => s.meals?.[k]).map(([k, l]) => `<div><span>${T(l)}</span><p>${esc(s.meals[k])}</p></div>`).join('')}</div>${[s.water ? `${T('Water')}: ${s.water} L` : '', s.protein ? `${T('Protein')}: ${s.protein} g` : ''].filter(Boolean).length ? `<div class="small">${[s.water ? `${T('Water')}: ${s.water} L` : '', s.protein ? `${T('Protein')}: ${s.protein} g` : ''].filter(Boolean).join(' · ')}</div>` : ''}${s.avoid ? `<div class="small"><b>${T('Avoid')}:</b> ${esc(s.avoid)}</div>` : ''}${s.notes ? `<div class="small muted">${esc(s.notes)}</div>` : ''}</div>` : `<div class="card">${empty('No diet plan yet', 'Write the meal plan once, then send it on WhatsApp or print it.', '', 'utensils', SPEC.diet.c)}</div>`}
    <div class="sec-h"><h2>${T('Body measurements')}</h2>${specCan() ? `<button class="btn sm primary" onclick="A.bodyForm('${p.id}')">${ic('plus')} ${T('Add')}</button>` : ''}</div>
    <div class="card">${body.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Date')}</th><th>${T('Weight')}</th><th>${T('Waist')}</th><th>${T('Hip')}</th><th>${T('Body fat')}</th><th></th></tr></thead><tbody>${body.map(x => `<tr><td>${dShort(x.date)}</td><td>${x.weight ?? '—'}</td><td>${x.waist ?? '—'}</td><td>${x.hip ?? '—'}</td><td>${x.fat ?? '—'}</td><td>${specCan() ? `<button class="icon-btn" aria-label="Edit" onclick="A.bodyForm('${p.id}','${x.id}')">${ic('edit')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted dept-note" style="padding-top:12px">${T('No measurement yet.')}</p>`}</div>`;
}
const dietText = (p, s) => `${p.name} ji · ${T('Diet plan')} (${settings().bizName})\n${T(s.goal || '')}${s.kcal ? ' · ' + s.kcal + ' kcal' : ''}\n\n${DIET_MEALS.filter(([k]) => s.meals?.[k]).map(([k, l]) => `*${T(l)}:* ${s.meals[k]}`).join('\n')}${s.water ? `\n\n💧 ${T('Water')}: ${s.water} L` : ''}${s.avoid ? `\n🚫 ${T('Avoid')}: ${s.avoid}` : ''}${s.notes ? `\n\n${s.notes}` : ''}`;
A.dietForm = pid => {
  const s = specSum('diet', pid) || { meals: {} };
  formModal({ title: 'Diet plan', sub: patientById(pid)?.name, wide: true, fields: [
    { name: 'goal', label: 'Goal', type: 'select', options: ['', ...DIET_GOALS], value: s.goal }, { name: 'kcal', label: 'Calories per day', type: 'number', min: 0, value: s.kcal },
    { name: 'protein', label: 'Protein (g/day)', type: 'number', min: 0, value: s.protein }, { name: 'water', label: 'Water (litres/day)', type: 'number', step: '0.5', min: 0, value: s.water },
    ...DIET_MEALS.map(([k, l]) => ({ name: 'm_' + k, label: l, type: 'textarea', rows: 2, value: s.meals?.[k] || '', full: true })),
    { name: 'avoid', label: 'Avoid', value: s.avoid, full: true, placeholder: 'e.g. Sugar, maida, fried snacks' }, { name: 'notes', label: 'Notes', type: 'textarea', value: s.notes, full: true }],
    onSubmit: async v => { const base = specSum('diet', pid) || { id: specId('diet', pid), patientId: pid, kind: 'diet', created: Date.now() }; const meals = Object.fromEntries(DIET_MEALS.map(([k]) => [k, (v['m_' + k] || '').trim()]));
      await saveSpec({ ...base, goal: v.goal, kcal: nOr(v.kcal), protein: nOr(v.protein), water: nOr(v.water), meals, avoid: (v.avoid || '').trim(), notes: (v.notes || '').trim(), updated: todayLocal(), date: todayLocal() }, `Diet plan for ${patientById(pid)?.name}`); render(); } });
};
A.dietPrint = pid => { const p = patientById(pid); const s = specSum('diet', pid); clinicPrint(p, 'Diet plan', `<p><b>${esc(s.goal || '')}</b>${s.kcal ? ' · ' + s.kcal + ' kcal/day' : ''}${s.protein ? ' · protein ' + s.protein + ' g' : ''}${s.water ? ' · water ' + s.water + ' L' : ''}</p><table><tbody>${DIET_MEALS.filter(([k]) => s.meals?.[k]).map(([k, l]) => `<tr><th style="width:150px">${l}</th><td>${esc(s.meals[k]).replace(/\n/g, '<br>')}</td></tr>`).join('')}</tbody></table>${s.avoid ? `<p><b>Avoid:</b> ${esc(s.avoid)}</p>` : ''}${s.notes ? `<p>${esc(s.notes)}</p>` : ''}`); };
A.bodyForm = (pid, id) => { const x = id ? getById('visits', id) : { date: todayLocal() }; formModal({ title: 'Body measurements', sub: patientById(pid)?.name, fields: [{ name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1', value: x.weight }, { name: 'waist', label: 'Waist (cm)', type: 'number', step: '0.5', value: x.waist }, { name: 'hip', label: 'Hip (cm)', type: 'number', step: '0.5', value: x.hip }, { name: 'fat', label: 'Body fat (%)', type: 'number', step: '0.1', value: x.fat }],
  left: id ? `<button type="button" class="btn ghost danger" onclick="A.delSpecLog('${id}')">${ic('trash')}</button>` : '',
  onSubmit: async v => { const base = id ? x : { id: uid('bd_'), patientId: pid, kind: 'body', created: Date.now() }; await saveSpec({ ...base, date: v.date || todayLocal(), weight: nOr(v.weight), waist: nOr(v.waist), hip: nOr(v.hip), fat: nOr(v.fat) }, `Measurements for ${patientById(pid)?.name}`); render(); } }); };

/* ---------- quick words in the visit form, per speciality ---------- */
const SPEC_QUICK = {
  dental: ['Toothache', 'Sensitivity', 'Bleeding gums', 'Swelling', 'Broken tooth', 'Dental caries', 'Gingivitis', 'Periapical abscess', 'Impacted wisdom tooth'],
  eye: ['Blurred vision', 'Redness', 'Watering', 'Itching', 'Headache on reading', 'Myopia', 'Presbyopia', 'Cataract', 'Conjunctivitis', 'Dry eye', 'Glaucoma suspect'],
  onco: ['Fatigue', 'Nausea', 'Vomiting', 'Mouth ulcers', 'Fever after chemo', 'Pain', 'Loss of appetite', 'Neuropathy'],
  preg: ['Routine ANC', 'Nausea / vomiting', 'Bleeding PV', 'Pain abdomen', 'Reduced fetal movements', 'Swelling feet', 'Anaemia', 'GDM', 'PIH'],
  child: ['Fever', 'Cough & cold', 'Loose motions', 'Vomiting', 'Not eating well', 'Rash', 'Vaccination visit', 'Growth check'],
  sessions: ['Knee pain', 'Back pain', 'Neck pain', 'Frozen shoulder', 'Sciatica', 'Post-surgery rehab', 'Sports injury'],
  scales: ['Low mood', 'Anxiety', 'Poor sleep', 'Panic attacks', 'Stress', 'Follow-up review'],
  diet: ['Weight loss', 'Weight gain', 'Diabetes diet', 'PCOS diet', 'Thyroid diet', 'Follow-up']
};
const _visitFormSpec = A.visitForm;
A.visitForm = (...a) => {
  _visitFormSpec(...a); const words = [...new Set(specTools().flatMap(k => SPEC_QUICK[k] || []))]; if (!words.length) return;
  const ta = document.querySelector('#modalRoot textarea[name=complaint]'); const fld = ta?.closest('.field'); if (!fld) return;
  const box = document.createElement('div'); box.className = 'field';
  box.innerHTML = `<span>${T('Quick words')}</span><div class="chips">${words.map(w => `<button type="button" class="chip" data-w="${esc(w)}">${esc(T(w))}</button>`).join('')}</div>`;
  box.addEventListener('click', ev => { const b = ev.target.closest('button[data-w]'); if (!b) return; const w = T(b.dataset.w); ta.value = ta.value ? ta.value.replace(/[,\s]*$/, '') + ', ' + w : w; ta.focus(); });
  fld.parentNode.insertBefore(box, fld);
};

/* ---------- Settings: choose the tools ---------- */
function specSettingsCard() {
  const st = settings(); const on = new Set(specTools()); const edit = can('settings', 2);
  const tests = (SPEC_TESTS[st.specialisation] || []).filter(([n]) => !(st.tests || []).some(t => String(t.name).toLowerCase() === n.toLowerCase()));
  return `<div class="card pad stack-sm"><h3>${ic('steth')} ${T('Tools for your speciality')}${info('c-spec')}</h3><p class="small muted">${T('These show as tabs on every patient page. Pick the ones you use; a clinic can use more than one.')}</p>
    <div class="spec-pick">${Object.entries(SPEC).map(([k, t]) => `<label class="spec-opt" style="--c:${t.c}"><input type="checkbox" value="${k}" ${on.has(k) ? 'checked' : ''} ${edit ? `onchange="A.specToggle('${k}',this.checked)"` : 'disabled'}>${ibox(t.icon, t.c, 'sm')}<span><b>${T(t.label)}</b><small>${T(t.long)}</small></span></label>`).join('')}</div>
    ${tests.length && edit ? `<div class="banner">${ic('plus')}<span class="grow">${T('Readings used by')} ${esc(T(st.specialisation))}: ${tests.map(t => esc(t[0])).join(', ')}</span><button class="btn sm primary" onclick="A.addSpecTests()">${T('Add them')}</button></div>` : ''}</div>`;
}
A.specToggle = async (k, on) => { const cur = new Set(specTools()); if (on) cur.add(k); else cur.delete(k); try { await saveSettingsRec({ specTools: [...cur] }); toast(on ? T('Tool turned on') : T('Tool turned off')); render(); } catch (e) { toast(e.message, 'bad'); } };
A.addSpecTests = async () => {
  const st = settings(); const have = st.tests || []; const add = (SPEC_TESTS[st.specialisation] || []).filter(([n]) => !have.some(t => String(t.name).toLowerCase() === n.toLowerCase()));
  const tests = [...have, ...add.map(([name, unit]) => ({ key: 't_' + Math.random().toString(36).slice(2, 8), name, unit, type: 'number' }))];
  const rules = { ...(st.rules || {}) }; tests.slice(have.length).forEach((t, i) => { const r = add[i][2]; if (r && Object.keys(r).length) rules[t.key] = r; });
  try { await saveSettingsRec({ tests, rules }); toast(`${add.length} ${T('readings added')}`); render(); } catch (e) { toast(e.message, 'bad'); }
};
const _clinicSettingsSpec = clinicSettings;
clinicSettings = () => _clinicSettingsSpec().replace('<form class="card" onsubmit="A.saveClinicSettings(event)">', specSettingsCard() + '<form class="card" onsubmit="A.saveClinicSettings(event)">');
const _clinicHomeSpec = clinicHome;
clinicHome = () => { const h = _clinicHomeSpec(); const d = dueCard(); if (!d) return h; const i = h.indexOf('<div class="sec-h"><h2>Today’s queue'); return i > 0 ? h.slice(0, i) + d + h.slice(i) : h + d; };

/* ---------- demo data for the speciality tools that are turned on ---------- */
function specDemo(add, P, dD) {
  const on = new Set(specTools()); const id = p => 'dm_' + p + '_' + Math.random().toString(36).slice(2, 8); const [P1, P2, P3, P4, P5] = P;
  const v = r => add('visits', { created: Date.now(), ...r });
  if (on.has('dental')) v({ id: specId('dental', P2.id), patientId: P2.id, kind: 'dental', date: dD(-7), child: false, teeth: { 16: { st: 'caries', note: 'Deep, sensitive to cold' }, 26: { st: 'rct' }, 36: { st: 'missing' }, 46: { st: 'filled' }, 48: { st: 'extract', note: 'Impacted wisdom tooth' } },
    plan: [{ id: id('tp'), teeth: '16', proc: 'Root canal (RCT)', fee: 4500, status: 'doing', note: '2nd sitting due' }, { id: id('tp'), teeth: '16', proc: 'Crown – zirconia', fee: 10000, status: 'planned' }, { id: id('tp'), teeth: '36', proc: 'Implant', fee: 25000, status: 'planned' }, { id: id('tp'), teeth: '48', proc: 'Wisdom tooth surgery', fee: 3500, status: 'planned' }, { id: id('tp'), teeth: '', proc: 'Scaling & polishing', fee: 800, status: 'done', doneOn: dD(-7) }] });
  if (on.has('eye')) { v({ id: id('ey'), patientId: P3.id, kind: 'eye', date: dD(-180), va: { r: '6/12', l: '6/9' }, bcva: { r: '6/6', l: '6/6' }, near: { r: 'N8', l: 'N8' }, iop: { r: 18, l: 19 }, rx: { r: { sph: -1.25, cyl: -0.5, axis: 180, add: 1.5 }, l: { sph: -1, cyl: '', axis: '', add: 1.5 } }, diagnosis: 'Myopia with presbyopia', advice: 'Bifocal glasses' });
    v({ id: id('ey'), patientId: P3.id, kind: 'eye', date: dD(-2), next: dD(5), va: { r: '6/18', l: '6/12' }, bcva: { r: '6/9', l: '6/6' }, near: { r: 'N10', l: 'N8' }, iop: { r: 23, l: 20 }, rx: { r: { sph: -1.5, cyl: -0.75, axis: 175, add: 2 }, l: { sph: -1.25, cyl: -0.25, axis: 10, add: 2 } }, findings: 'Early nuclear sclerosis both eyes', diagnosis: 'Early cataract, glaucoma suspect (right)', advice: 'New glasses. Repeat IOP and field test in 1 week.' }); }
  if (on.has('onco')) { v({ id: specId('onco', P1.id), patientId: P1.id, kind: 'onco', date: dD(-70), site: 'Oral cavity (left buccal mucosa)', histology: 'Squamous cell carcinoma', stage: 'III', tnm: 'T3 N1 M0', diagDate: dD(-80), markers: '', ecog: '1', intent: 'Curative', regimen: 'Cisplatin + 5-FU', cycles: 6, interval: 21, height: 168 });
    [[-63, 1, 84, 12.1, 6.2, 210], [-42, 2, 83, 11.0, 5.1, 180], [-21, 3, 82, 9.6, 4.2, 150], [0, 4, 81, 7.8, 2.6, 92]].forEach(([n, c, w, hb, wbc, plt]) => v({ id: id('cy'), patientId: P1.id, kind: 'cycle', type: 'Chemo cycle', cycleNo: c, date: dD(n), nextDate: dD(n + 21), weight: w, bsa: bsaOf(168, w), drugs: 'Cisplatin 75 mg/m²\n5-FU 750 mg/m² × 4 days', hb, wbc, anc: '', plt, effects: c > 2 ? 'Nausea, mouth ulcers' : 'Mild nausea', grade: c > 2 ? '2' : '1' })); }
  if (on.has('preg')) { v({ id: specId('preg', P4.id), patientId: P4.id, kind: 'preg', date: dD(-140), lmp: dD(-168), g: 2, p: 1, a: 0, l: 1, blood: 'B+', risk: 'Previous C-section', steps: { dating: dD(-120), nt: dD(-80), td1: dD(-100), ifa: dD(-70), anomaly: dD(-25) } });
    [[-120, 52, 110, 70, ''], [-80, 54, 112, 72, 152], [-50, 56.5, 118, 76, 148], [-20, 58.2, 122, 80, 146]].forEach(([n, w, s, d, f]) => v({ id: id('an'), patientId: P4.id, kind: 'anc', date: dD(n), ga: gaText(pregGA({ lmp: dD(-168) }, dD(n))), weight: w, sys: s, dia: d, fhr: f, fundal: n > -60 ? 24 + (n + 50) / 10 : '', hb: 10.8, urine: 'Nil / Nil' })); }
  if (on.has('child')) { v({ id: specId('child', P5.id), patientId: P5.id, kind: 'child', date: dD(-30), dob: dD(-2950), birthWeight: 3.0, given: Object.fromEntries(VACCINES.filter(([d]) => d <= 1643).map(([d, n]) => [vKey(n), dD(-2950 + d + 2)])) });
    [[-700, 18.5, 108], [-365, 21, 116], [-30, 23.5, 122]].forEach(([n, w, h]) => v({ id: id('gr'), patientId: P5.id, kind: 'growth', date: dD(n), weight: w, height: h, hc: '' })); }
  if (on.has('sessions')) { const pk = id('pk'); v({ id: specId('pkg', P2.id), patientId: P2.id, kind: 'pkg', date: dD(-20), pkgs: [{ id: pk, name: 'Knee physio – 10 sessions', total: 10, fee: 5000, start: dD(-20) }] });
    [[-20, 8, 6], [-17, 7, 6], [-14, 7, 5], [-10, 6, 4], [-6, 5, 3], [-2, 4, 2]].forEach(([n, a, b]) => v({ id: id('ss'), patientId: P2.id, kind: 'session', pkgId: pk, date: dD(n), therapy: 'IFT, Exercises', area: 'Right knee', painBefore: a, painAfter: b, note: '' })); }
  if (on.has('scales')) [[-56, 18, [2, 2, 3, 2, 2, 2, 2, 2, 1]], [-28, 12, [2, 1, 2, 2, 1, 1, 2, 1, 0]], [-1, 7, [1, 1, 1, 1, 1, 1, 1, 0, 0]]].forEach(([n, sc, ans]) => v({ id: id('sc'), patientId: P2.id, kind: 'scale', scale: 'phq9', date: dD(n), answers: ans, score: sc }));
  if (on.has('diet')) { v({ id: specId('diet', P2.id), patientId: P2.id, kind: 'diet', date: dD(-30), updated: dD(-30), goal: 'Weight loss', kcal: 1400, protein: 60, water: 3, meals: { early: 'Warm water with lemon, 5 soaked almonds', breakfast: 'Vegetable poha or 2 besan chilla + curd', mid: '1 fruit (apple / guava)', lunch: '2 multigrain roti, dal, sabzi, salad', evening: 'Green tea + roasted chana', dinner: '1 roti or daliya, sabzi, paneer / dal', bed: 'Haldi milk (toned)' }, avoid: 'Sugar, maida, fried snacks, cold drinks', notes: 'Walk 40 minutes daily.' });
    [[-30, 78.5, 96, 104, 36], [-15, 77.0, 94, 103, 35], [-1, 75.4, 92, 101, 34]].forEach(([n, w, wa, h, f]) => v({ id: id('bd'), patientId: P2.id, kind: 'body', date: dD(n), weight: w, waist: wa, hip: h, fat: f })); }
}
