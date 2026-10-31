/* ================= Clinic case sheet (29 Oct 2026) =================
   The doctor's case paper, step by step, and only the parts a patient needs:
   - Patient profile: Medical alert yes/no (only "yes" shows readings and charts), allergies yes/no, habits
     (smoking, tobacco, alcohol… front desk ticks, doctor confirms), current medicines, address.
   - Front desk can note the complaint on arrival (patient.ccNow); the doctor's visit form starts with it.
   - Visit (collection visits, no kind): chief complaint in the patient's words, doctor's notes, examination
     (+ oral health for dentists), diagnosis, treatment done (per tooth, bridge = missing + support teeth,
     cap material, RCT sitting), medicines (Rx rows, only if given), advice, next visit, reports, charges.
     Sections are switched on with chips; nothing shows unless it is used.
   - Money: patient.charges [{id, visitId, date, desc, amount}] + patient.pays [{id, date, amount, mode, note}]
     + appointment fees → patient.account {charged, paid, due, lines, pays} (also shown on the patient link).
   - Consent: visits with kind 'consent' {title, text, lang, status pending|signed, via here|link, signName,
     signBy, signImg (PNG/JPEG data URL), signedAt, witness}. Signed on this phone, or on the patient link
     (RPC patient_sign_consent).
   - Timeline of everything, Rx print, full case-sheet print with signature lines. */
const isDent = () => typeof specTools === 'function' && specTools().includes('dental');
const isDoc = () => !!S.super || ['owner', 'manager'].includes(S.role);
const medAlertOn = p => p ? (p.medAlert ? p.medAlert === 'yes' : !!(p.lastReadingAt || String(p.conditions || '').trim() || (p.medList || []).length)) : false;
const MED_CONDS = ['Diabetes', 'High BP', 'Heart problem', 'Asthma', 'Thyroid', 'Fits / epilepsy', 'Bleeding problem', 'Kidney problem', 'Liver problem', 'Pregnant', 'On blood thinner', 'Hepatitis / HIV'];
const HABITS = ['Smoking', 'Tobacco / gutka', 'Alcohol', 'Supari / paan'];
const HABITS_DENT = ['Teeth grinding', 'Nail biting', 'Mouth breathing'];
const ORAL = [['good', 'Good', '#0B9B68'], ['average', 'Average', '#D97706'], ['poor', 'Poor', '#EA580C'], ['vpoor', 'Very poor', '#E0344B']];
const SINCE = ['Today', '2–3 days', '1 week', '2 weeks', '1 month', 'More than a month'];
const CC_DENT = ['Toothache', 'Sensitivity to cold / hot', 'Swelling', 'Bleeding gums', 'Broken / chipped tooth', 'Missing tooth', 'Loose tooth', 'Bad breath', 'Food getting stuck', 'Yellow / stained teeth', 'Wants braces', 'Routine check-up'];
const CC_GEN = ['Fever', 'Cough', 'Cold', 'Headache', 'Body ache', 'Stomach pain', 'Vomiting', 'Loose motions', 'Weakness', 'BP check', 'Sugar check', 'Follow-up'];
const EXAM_DENT = ['Caries', 'Deep caries', 'Tender on percussion', 'Mobility', 'Gingivitis', 'Calculus / tartar', 'Fractured tooth', 'Abscess / swelling', 'Root stump', 'Impacted tooth', 'Missing tooth', 'Stains'];
const EXAM_GEN = ['Temperature normal', 'Fever present', 'Throat congested', 'Chest clear', 'Wheeze', 'Abdomen soft', 'Tenderness', 'BP normal', 'Pallor', 'Dehydrated'];
const DX_DENT = ['Dental caries', 'Irreversible pulpitis', 'Periapical abscess', 'Chronic gingivitis', 'Chronic periodontitis', 'Fractured tooth', 'Impacted third molar', 'Missing teeth', 'Dentin hypersensitivity', 'Malocclusion'];
const DX_GEN = ['Viral fever', 'Upper respiratory infection', 'Acute gastroenteritis', 'Hypertension', 'Type 2 diabetes', 'Acidity / gastritis', 'Migraine', 'Allergy'];
/* dentist treatments: [name, usual fee, tooth chart status, kind: teeth | bridge | none] */
const TX_DENT = [['Check-up / consultation', 300, '', 'none'], ['X-ray (IOPA)', 200, '', 'teeth'], ['OPG X-ray', 600, '', 'none'], ['Scaling & polishing', 800, '', 'none'], ['Filling (GIC)', 800, 'filled', 'teeth'], ['Filling (composite)', 1200, 'filled', 'teeth'],
  ['RCT', 4500, 'rct', 'teeth'], ['RCT with cap', 9500, 'crown', 'teeth'], ['Cap / crown', 5000, 'crown', 'teeth'], ['Bridge', 5000, 'bridge', 'bridge'], ['Extraction', 800, 'missing', 'teeth'], ['Wisdom tooth surgery', 3500, 'missing', 'teeth'],
  ['Implant', 25000, 'implant', 'teeth'], ['Denture (partial)', 6000, '', 'teeth'], ['Denture (complete)', 15000, '', 'none'], ['Pulpectomy (child)', 2000, 'rct', 'teeth'], ['Braces / adjustment', 1000, '', 'none'], ['Teeth whitening', 6000, '', 'none'], ['Re-RCT', 6000, 'rct', 'teeth'], ['Cap re-fix', 500, 'crown', 'teeth'], ['Additional doctor fee', 500, '', 'none'], ['Other', '', '', 'teeth']];
const TX_GEN = [['Consultation', '', '', 'none'], ['Dressing', '', '', 'none'], ['Injection', '', '', 'none'], ['IV drip', '', '', 'none'], ['Nebulisation', '', '', 'none'], ['ECG', '', '', 'none'], ['Plaster', '', '', 'none'], ['Minor procedure', '', '', 'none'], ['Physiotherapy session', '', '', 'none'], ['Additional doctor fee', '', '', 'none'], ['Other', '', '', 'none']];
const txCustom = () => (settings().txCustom || []).filter(c => c.name).map(c => [c.name, c.price === '' ? '' : +c.price || 0, '', c.kind === 'teeth' ? 'teeth' : 'none']);
const txDefs = () => { const b = isDent() ? TX_DENT : TX_GEN; return [...b.filter(x => x[0] !== 'Other'), ...txCustom(), ...b.filter(x => x[0] === 'Other')]; };
const txDef = n => txDefs().find(x => x[0] === n) || TX_DENT.find(x => x[0] === n);
const CAP_MAT = ['Metal-ceramic (PFM)', 'Zirconia', 'E-max', 'Metal', 'Temporary'];
const RCT_ST = ['Started', 'Sitting 2', 'Sitting 3', 'Completed'];
const RX_DENT = ['Amoxicillin 500 mg', 'Amoxicillin + Clavulanic acid 625 mg', 'Metronidazole 400 mg', 'Ibuprofen 400 mg', 'Aceclofenac + Paracetamol', 'Ketorolac 10 mg', 'Paracetamol 650 mg', 'Pantoprazole 40 mg', 'Chlorhexidine mouthwash', 'Betadine gargle', 'Desensitising toothpaste'];
const RX_GEN = ['Paracetamol 650 mg', 'Azithromycin 500 mg', 'Amoxicillin 500 mg', 'Cetirizine 10 mg', 'Pantoprazole 40 mg', 'Ondansetron 4 mg', 'ORS sachet', 'Vitamin D3 60000 IU', 'Multivitamin', 'Cough syrup'];
const RX_DOSE = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'SOS'];
const RX_WHEN = ['After food', 'Before food', 'At night', 'When needed'];
const ADV_DENT = ['Do not eat for 1 hour', 'Soft, cold food for 24 hours', 'Warm salt-water rinse 3 times a day', 'Do not spit or use a straw for 24 hours', 'Do not chew on the treated side', 'Brush twice a day', 'Avoid very hot or cold food', 'Come back if pain or swelling increases'];
const ADV_GEN = ['Drink plenty of water', 'Rest for 2 days', 'Light home food', 'Steam inhalation twice a day', 'Check BP / sugar at home', 'Come back if fever does not go in 3 days'];
const VF_SECS = [ /* older code paths only */['cc', 'Complaint'], ['notes', 'Doctor’s notes'], ['exam', 'Examination'], ['dx', 'Diagnosis'], ['tx', 'Treatment done'], ['rx', 'Medicines (Rx)'], ['adv', 'Advice'], ['files', 'Reports / photos'], ['bill', 'Charges']];
const splitT = s => String(s || '').split(/[ ,]+/).map(x => x.trim()).filter(Boolean);
const teethTxt = a => (Array.isArray(a) ? a : splitT(a)).join(', ');
function txText(t) {
  if (!t?.proc) return '';
  if (t.proc === 'Bridge') { const m = splitT(t.missing), s = splitT(t.support); return `Bridge${m.length ? ` · ${m.join(', ')} missing` : ''}${s.length ? ` · support ${s.join(', ')}` : ''}${m.length + s.length ? ` (${m.length + s.length} units)` : ''}${t.mat ? ' · ' + t.mat : ''}`; }
  const tt = teethTxt(t.teeth); return `${t.proc}${tt ? ' · ' + (isDentTx(t) ? tt : tt) : ''}${t.mat ? ' · ' + t.mat : ''}${t.sitting ? ' · ' + t.sitting : ''}`;
}
const sinceTxt = x => 'since ' + x; /* the Hindi pattern 'since {}' makes it '… से' */
const isDentTx = t => !!TX_DENT.find(x => x[0] === t.proc);
/* the same text for the screen, in the app language */
function txUI(t) {
  if (!t?.proc) return '';
  if (t.proc === 'Bridge') { const m = splitT(t.missing), s = splitT(t.support); return `${T('Bridge')}${m.length ? ` · ${T('missing')}: ${m.join(', ')}` : ''}${s.length ? ` · ${T('support')}: ${s.join(', ')}` : ''}${m.length + s.length ? ` (${m.length + s.length} ${T('units')})` : ''}${t.mat ? ' · ' + T(t.mat) : ''}`; }
  const tt = teethTxt(t.teeth); return `${T(t.proc)}${tt ? ' · ' + T('tooth') + ' ' + tt : ''}${t.mat ? ' · ' + T(t.mat) : ''}${t.sitting ? ' · ' + T(t.sitting) : ''}`;
}

/* ---------- tooth picker (FDI numbers) ---------- */
function teethPick(name, sel) {
  const s = new Set(splitT(sel)); const g = rows => rows.map(r => `<div class="tp-r">${r.map(n => `<button type="button" class="${s.has(String(n)) ? 'on' : ''}" onclick="A.tpTog(this)">${n}</button>`).join('')}</div>`).join('');
  const child = [...s].some(n => +n >= 51);
  return `<div class="tp"><input type="hidden" name="${name}" value="${esc([...s].join(', '))}"><div class="tp-g" ${child ? 'hidden' : ''}><div class="tp-j">${T('Upper')}</div>${g(TEETH_ADULT.slice(0, 2))}<div class="tp-j">${T('Lower')}</div>${g(TEETH_ADULT.slice(2))}</div><div class="tp-g" ${child ? '' : 'hidden'}><div class="tp-j">${T('Upper')}</div>${g(TEETH_CHILD.slice(0, 2))}<div class="tp-j">${T('Lower')}</div>${g(TEETH_CHILD.slice(2))}</div>
    <button type="button" class="linkbtn tiny" onclick="A.tpSwap(this)">${child ? T('Adult teeth') : T('Child teeth')}</button></div>`;
}
A.tpTog = b => { b.classList.toggle('on'); const box = b.closest('.tp'); box.querySelector('input[type=hidden]').value = [...box.querySelectorAll('.tp-r button.on')].map(x => x.textContent).join(', '); };
A.tpSwap = b => { const gs = b.closest('.tp').querySelectorAll('.tp-g'); gs.forEach(g => g.hidden = !g.hidden); b.textContent = gs[0].hidden ? T('Adult teeth') : T('Child teeth'); };

/* ---------- small building blocks ---------- */
const ynField = (name, label, val, onch) => `<div class="field yn-field"><span>${T(label)}</span><div class="chips">${[['yes', 'Yes'], ['no', 'No']].map(([k, l]) => `<label class="chip-radio yn-${k}"><input type="radio" name="${name}" value="${k}" ${val === k ? 'checked' : ''} onchange="${onch || ''}"><span>${T(l)}</span></label>`).join('')}</div></div>`;
const checkChips = (name, list, sel) => `<div class="chips">${list.map(x => `<label class="chip-check"><input type="checkbox" name="${name}" value="${esc(x)}" data-multi="1" ${(sel || []).includes(x) ? 'checked' : ''}><span>${esc(T(x))}</span></label>`).join('')}</div>`;
const addChips = (field, list) => `<div class="chips qk">${list.map(w => `<button type="button" class="chip" onclick="A.qAdd(this,'${field}')" data-w="${esc(w)}">${esc(T(w))}</button>`).join('')}</div>`;
A.qAdd = (b, field) => { const ta = b.closest('form').querySelector(`[name="${field}"]`); if (!ta) return; const w = T(b.dataset.w); const parts = ta.value.split(/\s*[,\n]\s*/).filter(Boolean); if (parts.includes(w)) return; ta.value = ta.value ? ta.value.replace(/[,\s]*$/, '') + (ta.tagName === 'TEXTAREA' && field === 'advice' ? '\n' : ', ') + w : w; b.classList.add('on'); };
const oralPill = k => { const o = ORAL.find(x => x[0] === k); return o ? `<span class="pill" style="background:${o[2]}22;color:${o[2]}">${T('Oral health')}: ${T(o[1])}</span>` : ''; };

/* ---------- patient profile (flow: only what applies) ---------- */
A.patientForm = (id, then) => {
  const p = id ? patientById(id) : { track: ['bp', 'sugar', 'weight'], medAlert: '', allergyYes: '' };
  const med = p.medAlert || (id ? (medAlertOn(p) ? 'yes' : 'no') : ''); const allY = p.allergyYes || (p.allergies ? 'yes' : (id ? 'no' : ''));
  const habits = isDent() ? [...HABITS, ...HABITS_DENT] : HABITS;
  modal(`<form class="form pf" onsubmit="A.savePatient(event,'${id || ''}','${then || ''}')" novalidate>${sheetHead(id ? 'Edit patient' : 'New patient', id ? p.name : 'Only the name is needed. Add the rest when you like.')}<div class="sheet-b stack">
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'name', label: 'Patient name', required: true, value: p.name, autofocus: !id })}${fieldHTML({ name: 'phone', label: 'Mobile (WhatsApp)', type: 'tel', value: p.phone, placeholder: '98290 12345' })}
    ${fieldHTML({ name: 'age', label: 'Age', type: 'number', min: 0, max: 120, value: p.age })}
    <div class="field"><span>Gender</span><div class="chips">${['Male', 'Female', 'Other'].map(x => `<label class="chip-radio"><input type="radio" name="sex" value="${x}" ${p.sex === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'address', label: 'Address (optional)', value: p.address, full: true })}</div>
    <div class="pf-box">${ynField('medAlert', 'Any medical problem? (sugar, BP, heart, asthma, pregnancy, bleeding…)', med, "this.form.querySelector('.pf-med').hidden=this.value!=='yes'")}
      <div class="pf-med stack-sm" ${med === 'yes' ? '' : 'hidden'}>${checkChips('medList', MED_CONDS, p.medList)}
        ${fieldHTML({ name: 'conditions', label: 'Other problem / details', value: p.conditions, placeholder: 'e.g. Diabetes for 5 years' })}
        ${fieldHTML({ name: 'meds', label: 'Medicines the patient takes now', value: p.meds, placeholder: 'e.g. Ecosprin 75, Metformin 500' })}
        <div class="field"><span>Readings to track</span><div class="chips">${[...VITALS.map(([k, l]) => [k, l]), ...curTests().map(t => [t.key, t.name])].map(([k, l]) => `<label class="chip-check"><input type="checkbox" name="track" value="${k}" data-multi="1" ${trackOf(p).includes(k) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div><small>${T('Readings and charts show only for patients with a medical problem.')}</small></div></div></div>
    <div class="pf-box">${ynField('allergyYes', 'Any allergy?', allY, "this.form.querySelector('.pf-all').hidden=this.value!=='yes'")}
      <div class="pf-all" ${allY === 'yes' ? '' : 'hidden'}>${fieldHTML({ name: 'allergies', label: 'Allergic to', value: p.allergies, placeholder: 'e.g. Penicillin, sulpha, latex' })}</div></div>
    <div class="pf-box"><div class="field"><span>${T('Habits')}</span>${checkChips('habits', habits, p.habits)}</div>
      ${isDoc() ? `<label class="check"><input type="checkbox" name="habitsOk" ${p.habitsOk ? 'checked' : ''}> <span>${T('I asked the patient and confirm these habits')}</span></label>` : `<small class="muted">${T('The doctor will confirm these with the patient.')}</small>`}</div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'discPct', label: 'Regular discount % (optional)', type: 'number', min: 0, max: 100, value: p.discPct || '' })}</div>
    ${fieldHTML({ name: 'notes', label: 'Private note', type: 'textarea', rows: 2, value: p.notes })}
  </div><footer class="sheet-f">${id && lvl('patients') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delPatient('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} Save</button></footer></form>`);
};
A.savePatient = (e, id, then) => {
  e.preventDefault(); const v = readForm(e.target); if (!(v.name || '').trim()) { toast('Write the patient name', 'bad'); return; }
  withBtn(e, async () => {
    const base = id ? patientById(id) : { id: uid('pt_'), created: Date.now() }; const med = v.medAlert || 'no';
    const habits = v.habits || []; const sameHabits = JSON.stringify(habits) === JSON.stringify(base.habits || []);
    const rec = { ...base, name: v.name.trim(), phone: (v.phone || '').replace(/[^\d+ ]/g, '').trim(), age: v.age === '' ? '' : +v.age, sex: v.sex || '', address: (v.address || '').trim(),
      medAlert: med, medList: med === 'yes' ? (v.medList || []) : [], conditions: med === 'yes' ? (v.conditions || '') : '', meds: med === 'yes' ? (v.meds || '') : '', track: med === 'yes' && (v.track || []).length ? v.track : (base.track || ['bp']),
      allergyYes: v.allergyYes || 'no', allergies: v.allergyYes === 'yes' ? (v.allergies || '') : '', habits, notes: v.notes || '', discPct: v.discPct === '' ? '' : Math.min(100, Math.max(0, +v.discPct || 0)),
      habitsOk: isDoc() ? (v.habitsOk ? { by: S.me?.name || S.user?.name || '', at: todayLocal() } : null) : (sameHabits ? base.habitsOk || null : null) };
    await save('patients', rec, id ? `Updated patient ${rec.name}` : `Added patient ${rec.name}`); A.closeModal(); toast('Saved');
    if (then === 'reading') return A.readingForm(rec.id); if (then === 'appt') return A.apptForm({ patientId: rec.id });
    A.go('patient', { id: rec.id });
  });
};
A.habitsOk = async pid => { const p = patientById(pid); try { await save('patients', { ...p, habitsOk: { by: S.me?.name || S.user?.name || '', at: todayLocal() } }, `Confirmed habits of ${p.name}`); toast(T('Confirmed')); render(); } catch (e) { toast(e.message, 'bad'); } };

/* front desk notes the complaint on arrival; the doctor's visit form starts with it */
A.ccNote = pid => { const p = patientById(pid); const c = p.ccNow || {};
  modal(`<form class="form" onsubmit="A.saveCcNote(event,'${pid}')" novalidate>${sheetHead(T('Note the complaint'), p.name)}<div class="sheet-b stack">
    ${fieldHTML({ name: 'cc', label: 'What the patient says (in their words)', type: 'textarea', rows: 3, value: c.text || '', autofocus: true })}${addChips('cc', isDent() ? CC_DENT : CC_GEN)}
    <div class="field"><span>${T('Since when')}</span><div class="chips">${SINCE.map(x => `<label class="chip-radio"><input type="radio" name="since" value="${esc(x)}" ${c.since === x ? 'checked' : ''}><span>${T(x)}</span></label>`).join('')}</div></div>
  </div><footer class="sheet-f">${c.text ? `<button type="button" class="btn ghost" onclick="A.saveCcNote(null,'${pid}',true)">${T('Clear')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`); };
A.saveCcNote = async (e, pid, clear) => { if (e) e.preventDefault(); const v = e ? readForm(e.target) : {}; const p = patientById(pid);
  try { await save('patients', { ...p, ccNow: clear ? null : { text: (v.cc || '').trim(), since: v.since || '', at: nowAt(), by: S.me?.name || S.user?.name || '' } }, clear ? '' : `Complaint noted for ${p.name}`); A.closeModal(); toast(T('Saved')); render(); } catch (err) { toast(err.message, 'bad'); } };

/* ---------- money: charges, payments, account (also shown on the patient link) ---------- */
function accountOf(p) {
  const ap = pAppts(p.id).filter(a => +a.fee > 0 && ['booked', 'done'].includes(a.status));
  const lines = [...(p.charges || []).map(c => ({ date: c.date, desc: c.desc, amount: +c.amount || 0, ...(c.saved ? { saved: c.saved, pct: c.pct } : {}) })), ...ap.map(a => ({ date: a.date, desc: T(MODE_L[a.mode] || 'Consultation') + ' · ' + T('fee'), amount: +a.fee }))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const pays = [...(p.pays || []).map(x => ({ date: x.date, amount: +x.amount || 0, mode: x.mode || '', note: x.note || '' })), ...ap.filter(a => a.paid).map(a => ({ date: a.paidAt || a.date, amount: +a.fee, mode: a.payMode || '', note: T('fee') }))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const charged = sum(lines, x => x.amount), paid = sum(pays, x => x.amount); return { charged, paid, due: Math.max(0, charged - paid), lines: lines.slice(0, 30), pays: pays.slice(0, 30) };
}
async function updateAccount(pid) { const p = patientById(pid); if (!p) return; const a = accountOf(p); if (JSON.stringify(a) === JSON.stringify(p.account || null)) return; try { await save('patients', { ...patientById(pid), account: a }); } catch (e) { } }
A.ptPay = pid => { const p = patientById(pid); const a = accountOf(p);
  formModal({ title: 'Payment received', sub: `${p.name} · ${T('Due')} ${inr(a.due)}`, fields: [{ name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: a.due || '' }, { name: 'date', label: 'Date', type: 'date', value: todayLocal() }, { name: 'mode', label: 'Mode', type: 'select', options: PAY_MODES }, { name: 'note', label: 'Note' }],
    onSubmit: async v => { let left = +v.amount;
      /* unpaid appointment fees are closed first (oldest first), so the appointment list stays right */
      for (const ap of pAppts(pid).filter(x => feeDue(x)).sort((x, y) => String(x.date).localeCompare(String(y.date)))) { if (left < +ap.fee) break; left -= +ap.fee; await save('appts', { ...ap, paid: true, payMode: v.mode, paidAt: v.date || todayLocal() }); }
      if (left > 0) { const fresh = patientById(pid); await save('patients', { ...fresh, pays: [...(fresh.pays || []), { id: uid('py_'), date: v.date || todayLocal(), amount: left, mode: v.mode, note: (v.note || '').trim(), by: S.me?.name || S.user?.name || '' }] }); }
      logAct(`Payment ${inr(v.amount)} from ${p.name}`); await updateAccount(pid); toast(T('Saved')); render(); } }); };
A.ptPayDel = (pid, id) => confirmBox('Delete this payment?', '', 'Delete', async () => { const p = patientById(pid); await save('patients', { ...p, pays: (p.pays || []).filter(x => x.id !== id) }, `Deleted a payment of ${p.name}`); await updateAccount(pid); render(); });
const billMsg = (p, a) => I18N.lang === 'hi' ? `नमस्ते ${p.name} जी 🙏\n${settings().bizName}\nकुल बिल ${inr(a.charged)} · मिला ${inr(a.paid)} · बाकी ${inr(a.due)}${settings().upi ? '\nUPI: ' + settings().upi : ''}` : `Namaste ${p.name} ji 🙏\n${settings().bizName}\nTotal bill ${inr(a.charged)} · Paid ${inr(a.paid)} · Due ${inr(a.due)}${settings().upi ? '\nUPI: ' + settings().upi : ''}`;
function billsTab(p) {
  const a = accountOf(p); const ph = String(p.phone || '').replace(/\D/g, '').slice(-10); const appts = pAppts(p.id);
  if (JSON.stringify(a) !== JSON.stringify(p.account || null) && can('patients', 2)) setTimeout(() => updateAccount(p.id), 300);
  return `<div class="card pad stack-sm"><div class="money-grid"><div><span>${T('Total bill')}</span><b>${inr(a.charged)}</b></div><div><span>${T('Paid')}</span><b class="good-t">${inr(a.paid)}</b></div><div><span>${T('Due')}</span><b class="${a.due ? 'bad-t' : ''}">${inr(a.due)}</b></div></div>
    <div class="row-flex" style="gap:6px">${can('patients', 2) ? `<button class="btn sm primary" onclick="A.ptPay('${p.id}')">${ic('rupee')} ${T('Payment received')}</button>` : ''}${a.due && ph ? waBtn(billMsg(p, a), ph, T('Send bill')) : ''}${can('appointments', 2) ? `<button class="btn sm" onclick="A.apptForm({patientId:'${p.id}'})">${ic('plus')} Appointment</button>` : ''}</div>
    <p class="tiny muted">${T('The patient sees the same total, paid and due on their link.')}</p></div>
  <div class="split" style="margin-top:12px"><div class="card"><div class="card-h"><h3>${T('Charges')}</h3></div>${a.lines.length ? `<div class="rows">${a.lines.map(l => `<div class="row"><div class="main-col"><b>${esc(l.desc)}</b><div class="sub">${dShortC(l.date)}${l.saved ? ` · <span class="good-t">${T('Discount')} ${l.pct}% (${inr(l.saved)})</span>` : ''}</div></div><b class="num">${inr(l.amount)}</b></div>`).join('')}</div>` : `<p class="pad small muted">${T('Nothing charged yet')}</p>`}</div>
    <div class="card"><div class="card-h"><h3>${T('Payments')}</h3></div>${a.pays.length ? `<div class="rows">${[...(p.pays || []).map(x => ({ ...x, own: 1 })), ...appts.filter(x => x.paid && +x.fee).map(x => ({ date: x.paidAt || x.date, amount: x.fee, mode: x.payMode, note: T('fee') }))].sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 30).map(x => `<div class="row"><div class="main-col"><b class="good-t">${inr(x.amount)}</b><div class="sub">${dShortC(x.date)} · ${esc(T(x.mode || ''))}${x.note ? ' · ' + esc(x.note) : ''}</div></div>${x.own && lvl('patients') >= 3 ? `<button class="icon-btn" aria-label="Delete" onclick="A.ptPayDel('${p.id}','${x.id}')">${ic('x')}</button>` : ''}</div>`).join('')}</div>` : `<p class="pad small muted">${T('No payment yet')}</p>`}</div></div>
  <div class="sec-h"><h2>${T('Appointments')}</h2></div><div class="card">${appts.length ? `<div class="rows">${appts.map(apptRow).join('')}</div>` : empty('No appointments yet', '', '', 'calendar', MOD.appointments.c)}</div>`;
}
const dShortC = d => d ? T(fmtShort(String(d).slice(0, 10))) : '';

/* ---------- the visit form (case paper) ----------
   One screen, top to bottom: complaint · examination · diagnosis · treatment tiles · medicine tiles · charges.
   Notes, advice, reports and next visit open from small chips. A treatment tile adds a card with the tooth chart
   (dentist); Bridge = tap the missing tooth, the teeth on both sides become the support (cap) teeth by themselves.
   Fees: usual fee × teeth (bridge: per unit × units) until the doctor types an amount. */
const TX_TILES_DENT = [['RCT', 'RCT'], ['RCT with cap', 'RCT + Cap'], ['Cap / crown', 'Cap'], ['Bridge', 'Bridge'], ['Filling (composite)', 'Filling'], ['Extraction', 'Extraction'], ['Scaling & polishing', 'Scaling'], ['X-ray (IOPA)', 'X-ray'], ['Implant', 'Implant']];
const ARCHES = [[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]].map(a => a.map(String));
/* support teeth = the tooth just before and just after every gap of missing teeth, in the same jaw */
function autoSupport(missing) {
  const m = new Set(missing.map(String)); const out = new Set();
  ARCHES.forEach(a => a.forEach((n, i) => { if (!m.has(n)) return; [a[i - 1], a[i + 1]].forEach(x => { if (x && !m.has(x)) out.add(x); }); }));
  return [...out];
}
const archSort = list => { const order = ARCHES.flat(); return [...list].map(String).sort((x, y) => order.indexOf(x) - order.indexOf(y)); };
const txUnitPrice = proc => { const st = settings().txPrices || {}; if (proc === 'Bridge') return st['Bridge/unit'] ?? 5000; return st[proc] ?? (txDef(proc) || [])[1] ?? ''; };
const chipRadios = (name, list, sel, lab) => `<div class="chips tight">${list.map(x => `<label class="chip-radio"><input type="radio" name="${name}" value="${esc(x)}" ${sel === x ? 'checked' : ''}><span>${esc(T(lab ? lab(x) : x))}</span></label>`).join('')}</div>`;
function bridgeGrid(i, missing, support) {
  const m = new Set(splitT(missing)), s = new Set(splitT(support)); const child = [...m, ...s].some(n => +n >= 51);
  const g = rows => rows.map(r => `<div class="tp-r">${r.map(n => `<button type="button" data-n="${n}" class="${m.has(String(n)) ? 'mis' : s.has(String(n)) ? 'sup' : ''}" onclick="A.brTap(this)">${n}</button>`).join('')}</div>`).join('');
  return `<div class="tp br" data-mode="mis"><input type="hidden" name="tx_${i}_missing" value="${esc([...m].join(', '))}"><input type="hidden" name="tx_${i}_support" value="${esc([...s].join(', '))}">
    <div class="tp-g" ${child ? 'hidden' : ''}>${g(TEETH_ADULT.slice(0, 2))}<div class="tp-mid"></div>${g(TEETH_ADULT.slice(2))}</div><div class="tp-g" ${child ? '' : 'hidden'}>${g(TEETH_CHILD.slice(0, 2))}<div class="tp-mid"></div>${g(TEETH_CHILD.slice(2))}</div>
    <div class="br-sum"></div>
    <div class="row-flex" style="gap:10px"><button type="button" class="linkbtn tiny br-mode" onclick="A.brMode(this)">${T('Change support teeth')}</button><button type="button" class="linkbtn tiny" onclick="A.tpSwap(this)">${child ? T('Adult teeth') : T('Child teeth')}</button></div></div>`;
}
function brSync(box, auto) {
  const card = box.closest('.tx-card'); const mis = [...box.querySelectorAll('.tp-r button.mis')].map(b => b.dataset.n);
  if (auto) { const sup = new Set(autoSupport(mis)); box.querySelectorAll('.tp-r button').forEach(b => { if (!b.classList.contains('mis')) b.classList.toggle('sup', sup.has(b.dataset.n)); }); }
  const sup = [...box.querySelectorAll('.tp-r button.sup')].map(b => b.dataset.n);
  box.querySelector('input[name$="_missing"]').value = mis.join(', '); box.querySelector('input[name$="_support"]').value = sup.join(', ');
  const units = archSort([...mis, ...sup]); box.querySelector('.br-sum').innerHTML = units.length ? `${units.map(n => `<span class="${mis.includes(n) ? 'u-mis' : 'u-sup'}">${n}</span>`).join('')}<b>${units.length} ${T('units')}</b>` : `<span class="tiny muted">${T('Tap the missing tooth')}</span>`;
  txFee(card, units.length);
}
A.brTap = b => { const box = b.closest('.tp'); if (box.dataset.mode === 'sup') { if (!b.classList.contains('mis')) b.classList.toggle('sup'); box.dataset.manual = '1'; brSync(box, false); return; }
  b.classList.toggle('mis'); if (b.classList.contains('mis')) b.classList.remove('sup'); brSync(box, !box.dataset.manual); };
A.brMode = b => { const box = b.closest('.tp'); const sup = box.dataset.mode !== 'sup'; box.dataset.mode = sup ? 'sup' : 'mis'; b.textContent = T(sup ? 'Done' : 'Change support teeth'); box.classList.toggle('sup-mode', sup); };
/* fee = unit price × count, until the doctor types an amount */
function txFee(card, count) { if (!card) return; const amt = card.querySelector('input[name$="_amt"]'); if (!amt) return; const u = +card.dataset.unit || 0; const list = u ? u * Math.max(1, count || 0) : 0; card.dataset.list = list || '';
  if (!amt.dataset.manual) amt.value = list || ''; txDisc(card); A.vfTotal(card.closest('form')); }
/* under each treatment: list price, and the discount (or extra) when the doctor changes the amount for this patient */
const pctOf = (part, whole) => whole ? Math.round(part / whole * 100) : 0;
function txDisc(card) { const out = card?.querySelector('.tx-disc'); if (!out) return; const list = +card.dataset.list || 0, amt = +(card.querySelector('input[name$="_amt"]')?.value || 0);
  out.innerHTML = list && amt < list ? `${T('List')} ${inr(list)} · <b class="good-t">${T('Discount')} ${pctOf(list - amt, list)}% (${inr(list - amt)})</b>` : list && amt > list ? `${T('List')} ${inr(list)} · <b class="warn-t">${inr(amt - list)} ${T('more')}</b>` : ''; }
const tpCount = card => card.querySelector('.tp:not(.br)') ? [...card.querySelectorAll('.tp:not(.br) .tp-r button.on')].length : 1;
function txRow(i, t = {}, extra = {}) {
  const proc = t.proc || ''; const d = txDef(proc) || []; const kind = d[3] || 'none'; const dent = isDent(); const cap = /cap|crown|bridge|implant/i.test(proc); const rct = /RCT|Pulpectomy/.test(proc);
  const tile = (TX_TILES_DENT.find(x => x[0] === proc) || [])[1] || proc; const manual = t.amount !== undefined && t.amount !== '' ? 'data-manual="1"' : '';
  return `<div class="tx-card" data-i="${i}" data-unit="${esc(String(extra.unit ?? txUnitPrice(proc) ?? ''))}" data-list="${t.list ?? ''}"><input type="hidden" name="tx_${i}_proc" value="${esc(proc)}">
    <div class="tx-top"><b class="grow">${esc(T(tile))}${extra.cont ? ` <span class="pill info">${T('continues')}</span>` : ''}</b><span class="tx-rs">₹</span><input name="tx_${i}_amt" type="number" min="0" inputmode="numeric" value="${t.amount ?? ''}" ${manual} oninput="this.dataset.manual='1';txDisc(this.closest('.tx-card'));A.vfTotal(this.form)" aria-label="Amount"><button type="button" class="icon-btn" aria-label="Remove" onclick="const f=this.form;this.closest('.tx-card').remove();A.vfTotal(f)">${ic('x')}</button></div><div class="tx-disc tiny"></div>
    ${dent && kind === 'teeth' ? teethPick(`tx_${i}_teeth`, t.teeth) : ''}
    ${dent && kind === 'bridge' ? bridgeGrid(i, t.missing, t.support) : ''}
    ${dent && cap ? `<div class="tx-o"><span>${T('Cap')}</span>${chipRadios(`tx_${i}_mat`, CAP_MAT, t.mat || '', x => ({ 'Metal-ceramic (PFM)': 'PFM' })[x] || x)}</div>` : ''}
    ${rct ? `<div class="tx-o"><span>${T('Sitting')}</span>${chipRadios(`tx_${i}_sitting`, RCT_ST, t.sitting || 'Started', x => ({ 'Sitting 2': '2nd', 'Sitting 3': '3rd', Started: '1st', Completed: 'Done' })[x] || x)}</div>` : ''}
    ${proc === 'Other' || t.note ? `<input name="tx_${i}_note" placeholder="${T(proc === 'Other' ? 'Which treatment?' : 'Note')}" value="${esc(t.note || '')}">` : ''}</div>`;
}
A.txTile = (b, proc, preset) => {
  const f = b.form; const i = +(f.dataset.txn || 0); f.dataset.txn = i + 1; const box = f.querySelector('.tx-cards');
  const cc = splitT(f.ccTeeth?.value); const d = txDef(proc) || []; const t = { proc, ...(preset || {}) };
  if (!preset && d[3] === 'teeth' && cc.length) t.teeth = cc;   /* the tooth the patient showed */
  box.insertAdjacentHTML('beforeend', txRow(i, t, preset ? { cont: 1, unit: 0 } : {})); const card = box.lastElementChild;
  if (card.querySelector('.br')) brSync(card.querySelector('.br'), true); else if (!preset) txFee(card, tpCount(card)); A.vfTotal(f);
  if (preset) b.remove(); else card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
A.txMore = b => { b.closest('.tx-tiles').classList.add('all'); b.remove(); };
A.tpTog = b => { b.classList.toggle('on'); const box = b.closest('.tp'); box.querySelector('input[type=hidden]').value = [...box.querySelectorAll('.tp-r button.on')].map(x => x.textContent).join(', '); const card = b.closest('.tx-card'); if (card) txFee(card, tpCount(card)); };
/* an RCT not finished in an earlier visit: one tap adds the next sitting (no fee again) */
function openRct(pid) {
  const last = {}; pVisits(pid).filter(v => v.v2).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(v => (v.tx || []).forEach(t => { if (/RCT|Pulpectomy/.test(t.proc)) (t.teeth || []).forEach(n => { last[n] = t; }); }));
  const g = {}; Object.entries(last).forEach(([n, t]) => { if (t.sitting === 'Completed') return; const nx = RCT_ST[Math.min(RCT_ST.length - 1, RCT_ST.indexOf(t.sitting || 'Started') + 1)]; const k = t.proc + '|' + nx; (g[k] = g[k] || { proc: t.proc, sitting: nx, teeth: [], mat: t.mat || '' }).teeth.push(n); });
  return Object.values(g);
}
function rxRow(i, r = {}) {
  return `<div class="rx-row"><div class="tx-top"><input name="rx_${i}_name" list="rxList" placeholder="${T('Medicine name')}" value="${esc(r.name || '')}" aria-label="Medicine"><button type="button" class="icon-btn" aria-label="Remove" onclick="this.closest('.rx-row').remove()">${ic('x')}</button></div>
    <div class="rx-opts"><select name="rx_${i}_dose" aria-label="Dose">${RX_DOSE.map(x => `<option value="${x}" ${(r.dose || '1-0-1') === x ? 'selected' : ''}>${x === 'SOS' ? T('When needed') : x}</option>`).join('')}</select><select name="rx_${i}_when" aria-label="When">${RX_WHEN.map(x => `<option value="${x}" ${(r.when || 'After food') === x ? 'selected' : ''}>${esc(T(x))}</option>`).join('')}</select><label class="rx-days"><input name="rx_${i}_days" type="number" min="0" inputmode="numeric" value="${r.days ?? ''}" aria-label="Days"><span>${T('days')}</span></label></div></div>`;
}
/* usual dose for a tapped medicine; the doctor's last use wins (settings.rxDose) */
const RX_USUAL = [[/Amoxicillin \+|Clavulanic/i, '1-0-1', 'After food', 5], [/Amoxicillin|Metronidazole/i, '1-1-1', 'After food', 5], [/Azithromycin/i, '1-0-0', 'After food', 3], [/Pantoprazole|Omeprazole/i, '1-0-0', 'Before food', 5], [/Cetirizine/i, '0-0-1', 'At night', 5], [/Ondansetron/i, 'SOS', 'When needed', 3], [/Ketorolac/i, 'SOS', 'When needed', 3], [/Ibuprofen|Aceclofenac|Paracetamol/i, '1-0-1', 'After food', 3], [/mouthwash|gargle|toothpaste/i, '1-0-1', 'After food', 7], [/Vitamin D3/i, '1-0-0', 'After food', 8]];
function rxDefault(name) { const own = (settings().rxDose || {})[name]; if (own) return { name, ...own }; const u = RX_USUAL.find(x => x[0].test(name)); return u ? { name, dose: u[1], when: u[2], days: u[3] } : { name, dose: '1-0-1', when: 'After food', days: 5 }; }
A.rxAdd = (btn, name) => { const f = btn.form; const box = f.querySelector('.rx-rows');
  if (name) { const ex = [...box.querySelectorAll('input[name$="_name"]')].find(x => x.value === name); if (ex) { ex.closest('.rx-row').classList.add('flash'); setTimeout(() => ex.closest('.rx-row')?.classList.remove('flash'), 600); return; } }
  const i = +(f.dataset.rxn || 0); f.dataset.rxn = i + 1; box.insertAdjacentHTML('beforeend', rxRow(i, name ? rxDefault(name) : {}));
  if (!name) box.lastElementChild.querySelector('input').focus(); if (name) btn.classList.add('on'); };
A.vfSec = (b, k) => { const f = b.form; const sec = f.querySelector(`.vf-sec[data-sec="${k}"]`); if (!sec) return; sec.hidden = false; b.remove(); setTimeout(() => { sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); sec.querySelector('textarea,input:not([type=hidden])')?.focus(); }, 30); };
/* money of the visit: subtotal, discount (% or ₹), total; 'saved' = list prices − total */
function vfMoney(f) {
  const cards = [...f.querySelectorAll('.tx-card')]; const tx = sum(cards, c => +(c.querySelector('input[name$="_amt"]')?.value || 0)); const txList = sum(cards, c => +c.dataset.list || +(c.querySelector('input[name$="_amt"]')?.value || 0));
  const fee = +(f.consult?.value || 0); const feeList = fee ? Math.max(fee, +f.consult.dataset.list || 0) : 0; const sub = tx + fee;
  const dt = f.querySelector('input[name=discT]:checked')?.value || 'pct'; const dv = +(f.discV?.value || 0); const dAmt = Math.min(sub, Math.max(0, dt === 'pct' ? Math.round(sub * dv / 100) : dv));
  const total = sub - dAmt; const list = txList + feeList; const saved = Math.max(0, list - total);
  return { sub, dt, dv, dAmt, total, list, saved, pct: pctOf(saved, list), paid: +(f.paidNow?.value || 0) };
}
A.vfTotal = f => { if (!f) return; const m = vfMoney(f); const q = c => f.querySelector(c);
  if (q('.vf-sub')) q('.vf-sub').textContent = inr(m.sub); if (q('.vf-tot')) q('.vf-tot').textContent = inr(m.total); if (q('.vf-due')) q('.vf-due').textContent = inr(Math.max(0, m.total - m.paid));
  if (q('.vf-save')) { q('.vf-save').hidden = !m.saved; q('.vf-save').innerHTML = `${ic('check')} ${T('Discount')} ${m.pct}% · ${inr(m.saved)}`; } };
A.vfDisc = (b, n) => { const f = b.form; f.querySelector('input[name=discT][value=pct]').checked = true; f.discV.value = n || ''; f.querySelectorAll('.vf-dq .chip').forEach(c => c.classList.toggle('on', c === b)); A.vfTotal(f); };
/* treatments done for a patient: here (from visits, kept on the patient as txSum) and at other clinics (pastTx) */
function txSumOf(pid) { return pVisits(pid).filter(v => v.v2 && (v.tx || []).length).flatMap(v => v.tx.filter(t => t.proc).map(t => ({ d: v.date, p: t.proc, t: t.proc === 'Bridge' ? archSort([...(t.missing || []), ...(t.support || [])]).join(', ') : teethTxt(t.teeth || []), v: v.id, a: +t.amount || 0, s: t.sitting || '' }))).sort((a, b) => String(b.d).localeCompare(String(a.d))); }
const txHistory = p => [...(p.txSum || []), ...(p.pastTx || []).map(x => ({ ...x, w: 'outside' }))].sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')));
async function updateTxSum(pid) { const p = patientById(pid); if (!p) return; const t = txSumOf(pid); if (JSON.stringify(t) === JSON.stringify(p.txSum || [])) return; try { await save('patients', { ...patientById(pid), txSum: t }); } catch (e) { } }
const txLine = x => `${T(x.p)}${x.t ? ' ' + x.t : ''}`;
const OUT_TX = ['RCT', 'Cap / crown', 'Filling (composite)', 'Bridge', 'Implant', 'Extraction', 'Denture (partial)', 'Braces / adjustment'];
A.oldTx = b => { const f = b.form; const box = b.closest('.vf-old'); const inp = box.querySelector('input[name=ccOld]'); let list = []; try { list = JSON.parse(inp.value || '[]'); } catch (e) { }
  const o = JSON.parse(b.dataset.o); const k = JSON.stringify([o.p, o.t, o.d, o.w]); const on = !b.classList.contains('on'); b.classList.toggle('on', on);
  list = list.filter(x => JSON.stringify([x.p, x.t, x.d, x.w]) !== k); if (on) list.push(o); inp.value = JSON.stringify(list);
  if (on) { const ta = f.cc; const add = `${T('Problem in old')} ${txLine(o)} (${o.w === 'outside' ? T('done at another clinic') : T('done here') + ' ' + dShortC(o.d)})`; if (!ta.value.includes(add)) ta.value = (ta.value.trim() ? ta.value.trim() + '. ' : '') + add;
    splitT(o.t).forEach(n => { const tb = [...f.querySelectorAll('[data-sec=cc] .tp-r button')].find(x => x.textContent === n && !x.classList.contains('on')); if (tb) A.tpTog(tb); }); } };
A.oldOut = b => { b.closest('.vf-old').querySelector('.old-out').hidden = false; b.remove(); };
A.oldOutPick = (b, proc) => { const f = b.form; const teeth = splitT(f.ccTeeth?.value).join(', '); const o = { p: proc, t: teeth, w: 'outside', d: '' };
  const chips = b.closest('.vf-old').querySelector('.old-list'); chips.insertAdjacentHTML('beforeend', `<button type="button" class="chip" data-o="${esc(JSON.stringify(o))}" onclick="A.oldTx(this)">${esc(txLine(o))} · ${T('other clinic')}</button>`); A.oldTx(chips.lastElementChild);
  if (!teeth && isDent()) { const d = f.querySelector('[data-sec=cc] details'); if (d) d.open = true; toast(T('Tap the tooth too'), 'warn'); } };
A.visitForm = (pid, id, preset) => {
  const p = patientById(pid); if (!p) return; const v = id ? getById('visits', id) : { date: todayLocal(), files: [], ...(preset || {}) }; const dent = isDent(); const st = settings();
  const old = id && !v.v2; if (!id && p.ccNow?.text && !v.cc) { v.cc = p.ccNow.text; v.since = p.ccNow.since; }
  const ccTxt = v.cc ?? v.complaint ?? ''; const dxTxt = v.diagnosis || ''; const advTxt = old ? '' : (v.advice || '');
  const todayFee = !id && pAppts(pid).some(a => a.date === v.date && +a.fee > 0 && a.status !== 'cancelled');
  const paidNow = id ? sum((p.pays || []).filter(x => x.visitId === id), x => +x.amount || 0) : '';
  const more = [['notes', 'Notes', v.notes], ['adv', 'Advice', advTxt], ['files', 'X-ray / photo', (v.files || []).length], ['next', 'Next visit', v.followUp]];
  PEND.visit = [];
  const sec = (k, html, hide) => `<section class="vf-sec" data-sec="${k}" ${hide ? 'hidden' : ''}>${html}</section>`;
  const rxNames = [...new Set([...(st.rxUsed || []), ...(dent ? RX_DENT : RX_GEN)])]; const rxUsedNow = new Set((v.rx || []).map(r => r.name));
  const cont = id ? [] : openRct(pid); const tiles = dent ? TX_TILES_DENT : txDefs().map(x => [x[0], x[0]]); const rest = dent ? txDefs().filter(x => !TX_TILES_DENT.some(y => y[0] === x[0])).map(x => [x[0], x[0]]) : [];
  const past = txHistory(p).filter(x => x.v !== id).slice(0, 10); const ccOld = v.ccOld || []; const isOn = o => ccOld.some(x => x.p === o.p && x.t === o.t && (x.d || '') === (o.d || '') && (x.w || '') === (o.w || ''));
  const disc = id ? (v.disc || {}) : (+p.discPct ? { t: 'pct', v: +p.discPct } : {}); const feeList = todayFee ? '' : (st.feeClinic || '');
  const lab = (t, extra = '') => `<div class="vf-l">${T(t)}${extra}</div>`;
  modal(`<form class="form vf" onsubmit="A.saveVisit(event,'${pid}','${id || ''}')" novalidate data-txn="${(v.tx || []).length}" data-rxn="${(v.rx || []).length}">${sheetHead(p.name, `${[p.age ? p.age + ' ' + T('yrs') : '', p.sex ? T(p.sex) : ''].filter(Boolean).join(' · ')}`)}<div class="sheet-b stack vf-b">
    ${medAlertOn(p) && ((p.medList || []).length || p.conditions) || p.allergies ? `<div class="vf-warn">${ic('alert')} ${[medAlertOn(p) ? [...new Set([...(p.medList || []).map(x => T(x)), ...String(p.conditions || '').split(',').map(x => x.trim())].filter(Boolean))].join(', ') : '', p.allergies ? T('Allergy') + ': ' + esc(p.allergies) : ''].filter(Boolean).join(' · ')}</div>` : ''}
    ${sec('cc', `${lab('C/C — Chief complaint')}<textarea name="cc" rows="2" placeholder="${T('In the patient’s words')}">${esc(ccTxt)}</textarea>${addChips('cc', dent ? CC_DENT : CC_GEN)}
      <div class="vf-since">${chipRadios('since', SINCE, v.since || '')}</div>
      <div class="vf-in vf-old"><span>${T('Problem in an old treatment?')}</span><div class="chips tight old-list">${[...past.map(x => ({ p: x.p, t: x.t, d: x.d || '', w: x.w || 'here' })), ...ccOld.filter(o => !past.some(x => x.p === o.p && x.t === o.t && (x.d || '') === (o.d || '')))].map(o => `<button type="button" class="chip ${isOn(o) ? 'on' : ''}" data-o="${esc(JSON.stringify(o))}" onclick="A.oldTx(this)">${esc(txLine(o))} · ${o.w === 'outside' ? T('other clinic') : dShortC(o.d)}</button>`).join('')}${dent ? `<button type="button" class="chip" onclick="A.oldOut(this)">${ic('plus')} ${T('Done at another clinic')}</button>` : ''}</div>
        ${dent ? `<div class="old-out chips tight" hidden>${OUT_TX.map(n => `<button type="button" class="chip" onclick="A.oldOutPick(this,'${esc(n)}')">${esc(T(n))}</button>`).join('')}</div>` : ''}<input type="hidden" name="ccOld" value="${esc(JSON.stringify(ccOld))}"></div>
      ${dent ? `<details class="more-box" ${(v.ccTeeth || []).length ? 'open' : ''}><summary>${T('Tooth')}${(v.ccTeeth || []).length ? ': ' + esc(teethTxt(v.ccTeeth)) : ''}</summary>${teethPick('ccTeeth', v.ccTeeth)}</details>` : ''}`)}
    ${sec('exam', `${lab('On examination')}${addChips('exam', dent ? EXAM_DENT : EXAM_GEN)}<textarea name="exam" rows="1">${esc(v.exam || '')}</textarea>
      ${dent ? `<div class="vf-in"><span>${T('Oral health')}</span><div class="chips tight">${ORAL.map(([k, l, c]) => `<label class="chip-radio oral"><input type="radio" name="oral" value="${k}" ${v.oral === k ? 'checked' : ''}><span style="--c:${c}">${T(l)}</span></label>`).join('')}</div></div>` : ''}`)}
    ${sec('dx', `${lab('Diagnosis')}${addChips('diagnosis', dent ? DX_DENT : DX_GEN)}<textarea name="diagnosis" rows="1">${esc(dxTxt)}</textarea>`)}
    ${sec('tx', `${lab('Treatment')}${cont.map(c => `<button type="button" class="btn sm tx-cont" onclick='A.txTile(this,${JSON.stringify(c.proc)},${JSON.stringify({ teeth: c.teeth, sitting: c.sitting, mat: c.mat, amount: 0 })})'>${ic('plus')} ${esc(T(c.proc))} · ${esc(c.teeth.join(', '))} · ${esc(T(c.sitting))}</button>`).join('')}
      <div class="tx-tiles">${tiles.map(([n, l]) => `<button type="button" class="tx-tile" onclick="A.txTile(this,'${esc(n)}')">${esc(T(l))}</button>`).join('')}${rest.map(([n, l]) => `<button type="button" class="tx-tile more" onclick="A.txTile(this,'${esc(n)}')">${esc(T(l))}</button>`).join('')}${rest.length ? `<button type="button" class="tx-tile ghost" onclick="A.txMore(this)">${T('More')} …</button>` : ''}</div>
      <div class="tx-cards">${(v.tx || []).map((t, i) => txRow(i, t)).join('')}</div>`)}
    ${sec('rx', `${lab('Medicines (Rx)')}<datalist id="rxList">${rxNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist><div class="chips tight rx-tiles">${rxNames.slice(0, 12).map(n => `<button type="button" class="chip ${rxUsedNow.has(n) ? 'on' : ''}" onclick="A.rxAdd(this,${esc(JSON.stringify(n))})">${esc(n)}</button>`).join('')}<button type="button" class="chip" onclick="A.rxAdd(this)">${ic('plus')} ${T('Other')}</button></div>
      <div class="rx-rows">${(v.rx || []).map((r, i) => rxRow(i, r)).join('')}</div>${old && v.advice ? fieldHTML({ name: 'oldRx', label: 'Medicines (written earlier)', type: 'textarea', rows: 3, value: v.advice }) : ''}`)}
    ${sec('notes', `${lab('Notes')}<textarea name="notes" rows="3">${esc(v.notes || '')}</textarea>`, !v.notes)}
    ${sec('adv', `${lab('Advice')}${addChips('advice', dent ? ADV_DENT : ADV_GEN)}<textarea name="advice" rows="2">${esc(advTxt)}</textarea>`, !advTxt)}
    ${sec('files', `${lab('X-ray / photo')}${(v.files || []).length ? `<div class="files-row">${v.files.map(f => fileChip(f)).join('')}</div>` : ''}${attachBar('visit', true)}`, !(v.files || []).length)}
    ${sec('next', `${lab('Next visit')}<div class="chips tight">${[[1, 'Tomorrow'], [3, '3 days'], [7, '1 week'], [15, '15 days'], [30, '1 month']].map(([n, l]) => `<button type="button" class="chip" onclick="this.form.followUp.value=addDays(todayLocal(),${n});this.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===this))">${T(l)}</button>`).join('')}</div><input type="date" name="followUp" value="${esc(v.followUp || '')}">`, !v.followUp)}
    <div class="chips tight vf-more">${more.filter(m => !m[2]).map(([k, l]) => `<button type="button" class="chip" onclick="A.vfSec(this,'${k}')">${ic('plus')} ${T(l)}</button>`).join('')}</div>
    ${sec('bill', `<div class="vf-bill"><label><span>${T(todayFee ? 'Extra fee ₹' : 'Fee ₹')}</span><input name="consult" type="number" min="0" inputmode="numeric" data-list="${id ? (v.consultList ?? '') : feeList}" value="${id ? (v.consult ?? '') : feeList}" oninput="A.vfTotal(this.form)"></label><div><span>${T('Subtotal')}</span><b class="vf-sub">₹0</b></div></div>
      <div class="vf-in"><span>${T('Discount')}</span><div class="vf-disc"><div class="chips tight vf-dq">${[0, 5, 10, 15, 20].map(n => `<button type="button" class="chip ${disc.t !== 'amt' && (+disc.v || 0) === n ? 'on' : ''}" onclick="A.vfDisc(this,${n})">${n ? n + '%' : T('None')}</button>`).join('')}</div>
        <div class="vf-dv"><input name="discV" type="number" min="0" inputmode="numeric" value="${disc.v || ''}" oninput="this.form.querySelectorAll('.vf-dq .chip').forEach(c=>c.classList.remove('on'));A.vfTotal(this.form)" aria-label="Discount">${chipRadios('discT', ['pct', 'amt'], disc.t === 'amt' ? 'amt' : 'pct', x => x === 'pct' ? '%' : '₹')}</div></div></div>
      <div class="vf-bill"><div><span>${T('Total')}</span><b class="vf-tot">₹0</b></div><label><span>${T('Received ₹')}</span><input name="paidNow" type="number" min="0" inputmode="numeric" value="${paidNow}" oninput="A.vfTotal(this.form)"></label><div><span>${T('Due')}</span><b class="vf-due bad-t">₹0</b></div><div class="vf-save good-t" hidden></div></div>
      ${chipRadios('payMode', ['Cash', 'UPI', 'Card'], v.payMode || 'Cash')}
      <input type="hidden" name="sign" id="vfSign" value=""><div class="vf-sign" data-for="vfSign">${v.signImg ? `<img src="${esc(v.signImg)}" alt="${T('Patient signature')}">` : ''}<button type="button" class="btn sm" onclick="A.sigOpen('vfSign','${esc(p.name)}')">${ic('edit')} ${T(v.signImg ? 'Sign again' : 'Patient signature')}</button></div>`)}
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Date', type: 'date', value: v.date })}</div>
  </div><footer class="sheet-f">${id && lvl('medical') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delVisit('${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
  setTimeout(() => { const f = $('#modalRoot form.vf'); if (!f) return; f.querySelectorAll('.tx-card .br').forEach(b => brSync(b, false)); f.querySelectorAll('.tx-card').forEach(txDisc); f.addEventListener('change', e => { if (e.target.name === 'discT') A.vfTotal(f); }); A.vfTotal(f); }, 30);
};
A.saveVisit = (e, pid, id) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const dent = isDent();
  withBtn(e, async () => {
    const base = id ? getById('visits', id) : { id: uid('vs_'), patientId: pid, files: [], created: Date.now() };
    const files = await uploadPending('visit', `m/${S.org.orgId}/${pid}`);
    const tx = [...f.querySelectorAll('.tx-card')].map(r => { const i = r.dataset.i; const g = n => String(v[`tx_${i}_${n}`] ?? '').trim(); const proc = g('proc'); if (!proc) return null; const kind = (txDef(proc) || [])[3] || 'none';
      return { proc, amount: nOr(g('amt')), list: +r.dataset.list || '', teeth: dent && kind === 'teeth' ? splitT(g('teeth')) : [], missing: dent && kind === 'bridge' ? archSort(splitT(g('missing'))) : [], support: dent && kind === 'bridge' ? archSort(splitT(g('support'))) : [], mat: /cap|crown|bridge|implant/i.test(proc) ? g('mat') : '', sitting: /RCT|Pulpectomy/.test(proc) ? g('sitting') : '', note: g('note') }; }).filter(Boolean);
    const bad = tx.find(t => dent && ((txDef(t.proc) || [])[3] === 'teeth' && !t.teeth.length && !['X-ray (IOPA)', 'Other', 'Denture (partial)'].includes(t.proc) || t.proc === 'Bridge' && !t.missing.length));
    if (bad) throw new Error(`${T(bad.proc)}: ${T(bad.proc === 'Bridge' ? 'tap the missing tooth' : 'tap the tooth')}`);
    const rx = [...f.querySelectorAll('.rx-row')].map(r => { const nm = r.querySelector('input[name$="_name"]'); const i = nm.name.split('_')[1]; const g = n => String(v[`rx_${i}_${n}`] ?? '').trim(); return g('name') ? { name: g('name'), dose: g('dose'), when: g('when'), days: nOr(g('days')) } : null; }).filter(Boolean);
    const m = vfMoney(f); const consult = +v.consult || 0; const charge = m.total; let ccOld = []; try { ccOld = JSON.parse(v.ccOld || '[]'); } catch (er) { }
    const rec = { ...base, v2: true, date: v.date || todayLocal(), followUp: v.followUp || '',
      cc: (v.cc || '').trim(), since: v.since || '', ccTeeth: dent ? splitT(v.ccTeeth) : [],
      notes: (v.notes || '').trim(), exam: (v.exam || '').trim(), oral: v.oral || '', diagnosis: (v.diagnosis || '').trim(),
      tx, rx, advice: (v.advice || '').trim(), oldRx: (v.oldRx || '').trim(), consult, consultList: consult ? Math.max(consult, +f.consult.dataset.list || 0) : 0, sub: m.sub, disc: m.dAmt ? { t: m.dt, v: m.dv, amt: m.dAmt } : null, listTotal: m.list, saved: m.saved, ccOld, charge, payMode: v.payMode || '', files: [...(base.files || []), ...files],
      ...(v.sign ? { signImg: v.sign, signedAt: nowAt() } : {}) };
    rec.complaint = rec.cc; /* older screens read 'complaint' */
    if (!rec.cc && !rec.notes && !rec.exam && !rec.diagnosis && !tx.length && !rx.length && !rec.advice && !rec.oldRx && !rec.files.length && !charge) throw new Error('Write something or add a file');
    await save('visits', rec, `${id ? 'Updated' : 'Saved'} visit of ${patientById(pid)?.name}`);
    /* bill line + payment for this visit, profile bits, dental chart */
    const p = patientById(pid); const desc = tx.length ? tx.map(t => txUI(t)).join('; ') : T('Consultation'); const cid = 'ch_' + rec.id;
    let charges = (p.charges || []).filter(c => c.id !== cid); if (charge > 0 || m.saved) charges.push({ id: cid, visitId: rec.id, date: rec.date, desc, amount: charge, ...(m.saved ? { list: m.list, saved: m.saved, pct: m.pct } : {}) });
    const outside = ccOld.filter(o => o.w === 'outside'); const pastTx = [...(p.pastTx || [])]; outside.forEach(o => { if (!pastTx.some(x => x.p === o.p && x.t === o.t)) pastTx.push({ p: o.p, t: o.t, d: '', added: rec.date, note: '' }); });
    const paidNow = +v.paidNow || 0; let pays = (p.pays || []).filter(x => x.visitId !== rec.id); if (paidNow > 0) pays.push({ id: 'py_' + rec.id, visitId: rec.id, date: rec.date, amount: paidNow, mode: v.payMode || 'Cash', note: T('visit'), by: S.me?.name || S.user?.name || '' });
    await save('patients', { ...p, charges, pays, pastTx, txSum: txSumOf(pid), lastVisit: rec.date > (p.lastVisit || '') ? rec.date : p.lastVisit, ...(rec.oral ? { oral: rec.oral } : {}), ...(p.ccNow && !id ? { ccNow: null } : {}) });
    await updateAccount(pid);
    if (dent && typeof dentalRec === 'function' && tx.length) { try { const r = dentalRec(pid); const teeth = { ...(r.teeth || {}) }; let ch = false;
      tx.forEach(t => { const stt = (txDef(t.proc) || [])[2]; if (!stt) return; if (t.proc === 'Bridge') { t.missing.forEach(n => { teeth[n] = { ...(teeth[n] || {}), st: 'bridge' }; ch = true; }); t.support.forEach(n => { teeth[n] = { ...(teeth[n] || {}), st: 'crown' }; ch = true; }); } else t.teeth.forEach(n => { teeth[n] = { ...(teeth[n] || {}), st: t.sitting && t.sitting !== 'Completed' && stt === 'crown' ? 'rct' : stt }; ch = true; }); });
      if (ch) await saveSpec({ ...r, teeth }, ''); } catch (err) { } }
    if (can('settings', 2)) { try { const st = settings(); const prices = { ...(st.txPrices || {}) }; let chg = false;
      const used = [...new Set([...rx.map(r => r.name), ...(st.rxUsed || [])])].slice(0, 60); const dose = { ...(st.rxDose || {}) }; rx.forEach(r => { const d = { dose: r.dose, when: r.when, days: r.days }; if (JSON.stringify(dose[r.name]) !== JSON.stringify(d)) { dose[r.name] = d; chg = true; } }); if (chg || used.join() !== (st.rxUsed || []).join()) await saveSettingsRec({ txPrices: prices, rxUsed: used, rxDose: dose }); } catch (err) { } }
    A.closeModal(); toast(T('Visit saved')); if (S.view === 'patient' && S.params.id === pid) { S.params.tab = 'records'; render(); } else A.go('patient', { id: pid, tab: 'records' });
  });
};
A.delVisit = id => confirmBox('Delete this visit?', 'Its charge and payment are removed from the bill too.', 'Delete', async () => { const v = getById('visits', id); await removeRec('visits', id, 'Deleted a visit'); const p = patientById(v?.patientId); if (p) { await save('patients', { ...p, txSum: txSumOf(p.id), charges: (p.charges || []).filter(c => c.visitId !== id), pays: (p.pays || []).filter(x => x.visitId !== id) }); await updateAccount(p.id); } A.closeModal(); render(); });

/* ---------- timeline (case history) ---------- */
function visitBody(v, forPrint) {
  const L = (lab, html) => html ? `<div class="vb"><span class="eyebrow">${forPrint ? lab : T(lab)}</span><div>${html}</div></div>` : '';
  const t = x => forPrint ? x : T(x);
  const cc = (v.cc ?? v.complaint) ? `<span translate="no">${esc(v.cc ?? v.complaint)}</span>${v.since ? ` <span class="muted">· ${esc(sinceTxt(v.since, forPrint))}</span>` : ''}${(v.ccTeeth || []).length ? ` <span class="muted">· ${t('tooth')} ${esc(teethTxt(v.ccTeeth))}</span>` : ''}` : '';
  const oral = ORAL.find(o => o[0] === v.oral);
  const rxT = (v.rx || []).length ? `<ol class="rx-l">${v.rx.map(r => `<li><b>${esc(r.name)}</b><span class="muted"> · <span class="nowrap">${esc(r.dose || '')}</span> · ${esc(t(r.when || ''))}${r.days ? ' · ' + esc(String(r.days)) + ' ' + t('days') : ''}</span></li>`).join('')}</ol>` : '';
  const old = (v.ccOld || []).map(o => `${esc(forPrint ? `${o.p}${o.t ? ' ' + o.t : ''}` : txLine(o))} <span class="muted">(${o.w === 'outside' ? t('done at another clinic') : t('done here') + ' ' + (forPrint ? fmtShort(o.d) : dShortC(o.d))})</span>`).join(', ');
  const dTxt = v.saved ? `${t('Discount')} ${pctOf(v.saved, v.listTotal)}% · ${inr(v.saved)} <span class="muted">(${t('List')} ${inr(v.listTotal)} → ${inr(v.charge)})</span>` : '';
  return `${L('Chief complaint', cc)}${L('Problem in old treatment', old)}${L('Doctor’s notes', v.notes ? `<span class="pre">${esc(v.notes)}</span>` : '')}${L('On examination', [v.exam ? esc(v.exam) : '', oral ? `${t('Oral health')}: <b style="color:${oral[2]}">${t(oral[1])}</b>` : ''].filter(Boolean).join(' · '))}
    ${L('Diagnosis', esc(v.diagnosis || ''))}${L('Treatment done', (v.tx || []).length ? `<ul class="tx-list">${v.tx.map(x => `<li>${esc(forPrint ? txText(x) : txUI(x))}${x.note ? ` <span class="muted">(${esc(x.note)})</span>` : ''}${x.amount !== '' && x.amount !== undefined ? ` <b class="num">${inr(x.amount)}</b>` : ''}${x.list && +x.amount < +x.list ? ` <span class="muted"><s>${inr(x.list)}</s></span>` : ''}</li>`).join('')}</ul>` : '')}
    ${L('Medicines (Rx)', rxT + ((v.oldRx || (!v.v2 && v.advice)) ? `<span class="pre">${esc(v.oldRx || v.advice)}</span>` : ''))}${L('Advice', v.v2 && v.advice ? `<span class="pre">${esc(v.advice)}</span>` : '')}
    ${v.followUp ? `<div class="tiny">${ic('calendar')} ${t('Next visit')} ${fmtDate(v.followUp)}</div>` : ''}${v.charge || v.saved ? `<div class="tiny">${t('Charge')}: <b>${inr(v.charge)}</b>${dTxt ? ` · <span class="good-t">${dTxt}</span>` : ''}</div>` : ''}${v.signImg ? `<div class="tiny vb-sign"><img src="${esc(v.signImg)}" alt="" style="height:38px;vertical-align:middle;background:#fff;border:1px solid #ddd;border-radius:6px"> ${t('Patient signature')}</div>` : ''}`;
}
function caseTab(p) {
  const vs = pVisits(p.id); const cons = col('visits').filter(x => x.patientId === p.id && x.kind === 'consent'); const a = accountOf(p); const f = S.filters.caseF || 'tl'; const edit = can('medical', 2);
  const items = [...(f === 'all' || f === 'visits' ? vs.map(v => ({ d: v.date, k: 'visit', v })) : []), ...(f === 'all' || f === 'consents' ? cons.map(c => ({ d: (c.signedAt || c.date || '').slice(0, 10), k: 'consent', v: c })) : []),
    ...(f === 'all' || f === 'pays' ? (p.pays || []).map(x => ({ d: x.date, k: 'pay', v: x })) : [])].sort((x, y) => String(y.d).localeCompare(String(x.d)) || (y.k === 'visit') - (x.k === 'visit'));
  const habitsTxt = (p.habits || []).length ? (p.habits || []).map(h => T(h)).join(', ') : '';
  if (can('patients', 2) && JSON.stringify(txSumOf(p.id)) !== JSON.stringify(p.txSum || [])) setTimeout(() => updateTxSum(p.id), 300);
  return `<div class="card pad case-top"><div class="case-facts">
      <div><span class="eyebrow">${T('Medical alert')}</span><b class="${medAlertOn(p) ? 'bad-t' : ''}">${medAlertOn(p) ? `${T('Yes')}${(p.medList || []).length ? ' · ' + p.medList.map(x => T(x)).join(', ') : ''}${p.conditions ? ' · ' + esc(p.conditions) : ''}` : T('No')}</b>${p.meds ? `<div class="tiny muted">${T('Takes')}: ${esc(p.meds)}</div>` : ''}</div>
      <div><span class="eyebrow">${T('Allergy')}</span><b class="${p.allergies ? 'bad-t' : ''}">${p.allergies ? esc(p.allergies) : T('None')}</b></div>
      <div><span class="eyebrow">${T('Habits')}</span><b>${habitsTxt || T('None')}</b>${habitsTxt ? `<div class="tiny ${p.habitsOk ? 'good-t' : 'warn-t'}">${p.habitsOk ? `${T('Confirmed by')} ${esc(p.habitsOk.by || '')}` : T('Not confirmed by the doctor yet')}${!p.habitsOk && isDoc() ? ` <button class="linkbtn" onclick="A.habitsOk('${p.id}')">${T('Confirm')}</button>` : ''}</div>` : ''}</div>
      ${isDent() && p.oral ? `<div><span class="eyebrow">${T('Oral health')}</span><b>${oralPill(p.oral)}</b></div>` : ''}
      <div><span class="eyebrow">${T('Bill')}</span><b>${inr(a.charged)}</b><div class="tiny ${a.due ? 'bad-t' : 'good-t'}">${a.due ? `${T('Due')} ${inr(a.due)}` : T('No dues')}</div></div></div>
    ${p.ccNow?.text ? `<div class="banner" style="margin-top:10px">${ic('mic')}<span class="grow"><b>${T('Complaint noted today')}:</b> <span translate="no">${esc(p.ccNow.text)}</span>${p.ccNow.since ? ` · ${esc(sinceTxt(p.ccNow.since))}` : ''} <span class="tiny muted">${esc(p.ccNow.by || '')}</span></span></div>` : ''}
    <div class="row-flex" style="gap:6px;margin-top:10px">${edit ? `<button class="btn primary" onclick="A.visitForm('${p.id}')">${ic('plus')} ${T('New visit')}</button><button class="btn" onclick="A.consentNew('${p.id}')">${ic('file')} ${T('Consent form')}</button>` : ''}<button class="btn" onclick="A.printCase('${p.id}')">${ic('print')} ${T('Print case sheet')}</button></div></div>
  ${treatCard(p)}
  <div class="toolbar" style="margin-top:12px">${seg('caseF', [['tl', 'Timeline'], ['all', 'Everything'], ['visits', 'Visits'], ['consents', 'Consents'], ['pays', 'Payments']], f, 'A.setF')}</div>
  ${f === 'tl' ? timelineHTML(p) : items.length ? `<div class="case-tl">${items.map(it => it.k === 'visit' ? `<div class="card pad tl-v"><div class="tl-h">${datebox(it.v.date, MOD.medical.c)}<div class="grow" style="min-width:0"><b>${esc((it.v.tx || []).map(t => T(t.proc)).join(', ') || it.v.diagnosis || it.v.cc || it.v.complaint || T('Visit'))}</b><div class="tiny muted">${esc(it.v.updatedBy || '')}</div></div>
        <div class="row-flex" style="gap:4px">${(it.v.rx || []).length || it.v.advice || it.v.diagnosis ? `<button class="icon-btn" aria-label="Print prescription" onclick="A.printVisit('${it.v.id}')">${ic('print')}</button>` : ''}${edit ? `<button class="icon-btn" aria-label="Edit" onclick="A.visitForm('${p.id}','${it.v.id}')">${ic('edit')}</button>` : ''}</div></div>
        <div class="tl-b">${visitBody(it.v)}${(it.v.files || []).length ? `<div class="files-row">${it.v.files.map(x => fileChip(x, 'clinic')).join('')}</div>` : ''}</div></div>`
      : it.k === 'consent' ? `<div class="card pad tl-c">${ibox('file', it.v.status === 'signed' ? '#0B9B68' : '#D97706', 'sm')}<div class="grow" style="min-width:0"><b>${esc(it.v.title)}</b><div class="tiny muted">${it.v.status === 'signed' ? `${T('Signed by')} ${esc(it.v.signName || '')} · ${atText(it.v.signedAt)}${it.v.signVia === 'link' ? ' · ' + T('on the patient link') : ''}` : `${T('Waiting for signature')} · ${T(it.v.via === 'link' ? 'sent to the patient link' : 'to sign here')}`}</div></div>
        ${it.v.status === 'signed' ? `<button class="btn sm" onclick="A.printConsent('${it.v.id}')">${ic('print')}</button>` : edit ? `<button class="btn sm primary" onclick="A.consentSign('${it.v.id}')">${ic('edit')} ${T('Sign now')}</button>${it.v.via === 'link' ? `<button class="btn sm" onclick="A.consentSend('${it.v.id}')">${ic('wa')}</button>` : ''}` : ''}</div>`
      : `<div class="card pad tl-c">${ibox('rupee', '#0B9B68', 'sm')}<div class="grow"><b class="good-t">${T('Paid')} ${inr(it.v.amount)}</b><div class="tiny muted">${dShortC(it.v.date)} · ${esc(T(it.v.mode || ''))}${it.v.note ? ' · ' + esc(it.v.note) : ''}</div></div></div>`).join('')}</div>`
    : `<div class="card">${empty('Nothing here yet', 'Tap “New visit”. Note the complaint, what you found, the diagnosis, the treatment and medicines. Everything stays here, date-wise.', edit ? `<button class="btn primary" onclick="A.visitForm('${p.id}')">${ic('plus')} ${T('New visit')}</button>` : '', 'file', MOD.medical.c)}</div>`}`;
}

/* ---------- price list: every fee and treatment price, the doctor's own treatments ---------- */
const plOwn = (c = {}) => `<div class="pl-own"><input name="on_name" placeholder="${T('Treatment name')}" value="${esc(c.name || '')}"><input name="on_price" type="number" min="0" inputmode="numeric" placeholder="₹" value="${c.price ?? ''}"><select name="on_kind">${[['none', 'Once'], ['teeth', 'Per tooth']].map(([k, l]) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select><button type="button" class="icon-btn" aria-label="Remove" onclick="this.parentElement.remove()">${ic('x')}</button></div>`;
A.priceList = () => {
  const st = settings(); const pr = st.txPrices || {}; const defs = (isDent() ? TX_DENT : TX_GEN).filter(x => x[0] !== 'Other'); const per = k => k === 'teeth' ? T('per tooth') : k === 'bridge' ? T('per unit') : '';
  const key = n => n === 'Bridge' ? 'Bridge/unit' : n; const row = (k, label, val, unit) => `<label class="pl-row"><span>${esc(label)}${unit ? ` <small>${unit}</small>` : ''}</span><input type="number" min="0" inputmode="numeric" data-k="${esc(k)}" value="${val ?? ''}"></label>`;
  modal(`<form class="form" onsubmit="A.savePriceList(event)" novalidate>${sheetHead(T('Fees & treatment prices'), st.bizName || '')}<div class="sheet-b stack-sm">
    ${row('__feeClinic', T('Consultation fee'), st.feeClinic, '')}${row('__feeVideo', T('Video / WhatsApp call fee'), st.feeVideo, '')}
    ${defs.map(d => row(key(d[0]), T(d[0]), pr[key(d[0])] ?? d[1], per(d[3]))).join('')}
    <div class="vf-l" style="margin-top:8px">${T('Your own treatments')}</div><div class="pl-owns">${(st.txCustom || []).map(plOwn).join('')}</div>
    <button type="button" class="btn sm" onclick="this.previousElementSibling.insertAdjacentHTML('beforeend',plOwn())">${ic('plus')} ${T('Add treatment')}</button>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
};
A.savePriceList = e => { e.preventDefault(); const f = e.target; withBtn(e, async () => {
  const prices = { ...(settings().txPrices || {}) }; const extra = {};
  f.querySelectorAll('input[data-k]').forEach(i => { const k = i.dataset.k; const val = i.value === '' ? '' : Math.max(0, +i.value || 0); if (k.startsWith('__')) extra[k.slice(2)] = val; else if (val === '') delete prices[k]; else prices[k] = val; });
  const own = [...f.querySelectorAll('.pl-own')].map(r => ({ name: r.querySelector('[name=on_name]').value.trim(), price: r.querySelector('[name=on_price]').value === '' ? '' : +r.querySelector('[name=on_price]').value || 0, kind: r.querySelector('[name=on_kind]').value })).filter(x => x.name);
  await saveSettingsRec({ ...extra, txPrices: prices, txCustom: own }); logAct('Updated fees & treatment prices'); A.closeModal(); toast(T('Saved')); render(); }); };

/* ---------- treatments done (here and at other clinics) ---------- */
function treatCard(p) {
  const h = txHistory(p); const edit = can('medical', 2);
  const r = x => `<div class="tr-r"><span class="tr-d">${x.w === 'outside' ? T('Other clinic') + (x.when ? ' · ' + esc(x.when) : '') : dShortC(x.d)}</span><b class="grow">${esc(txLine(x))}${x.s ? ` <span class="muted tiny">${esc(T(x.s))}</span>` : ''}</b>${x.a ? `<span class="num tiny">${inr(x.a)}</span>` : ''}${x.w === 'outside' && edit ? `<button class="icon-btn sm" aria-label="Remove" onclick="A.pastTxDel('${p.id}',${esc(JSON.stringify(JSON.stringify([x.p, x.t, x.added || ''])))})">${ic('x')}</button>` : ''}</div>`;
  return `<div class="card pad stack-sm tr-card"><div class="row-flex" style="justify-content:space-between;gap:6px"><b>${T('Treatments done')} (${h.length})</b><div class="row-flex" style="gap:6px">${edit ? `<button class="btn sm ghost" onclick="A.pastTxForm('${p.id}')">${ic('plus')} ${T('Done at another clinic')}</button>` : ''}${can('settings', 2) ? `<button class="btn sm ghost" onclick="A.priceList()">₹ ${T('Prices')}</button>` : ''}</div></div>
    ${h.length ? `<div class="tr-list">${h.slice(0, 6).map(r).join('')}</div>${h.length > 6 ? `<details><summary class="small">${T('See all')} (${h.length})</summary><div class="tr-list">${h.slice(6).map(r).join('')}</div></details>` : ''}` : `<span class="small muted">${T('No treatment yet')}</span>`}</div>`;
}
A.pastTxForm = pid => { const dent = isDent();
  formModal({ title: 'Done at another clinic', sub: patientById(pid)?.name, fields: [{ name: 'proc', label: 'Treatment', type: 'select', options: [...(dent ? OUT_TX : TX_GEN.map(x => x[0]).filter(x => x !== 'Other')), 'Other'].map(x => [x, T(x)]) },
    ...(dent ? [{ type: 'html', full: true, html: `<div class="field"><span>${T('Tooth')}</span>${teethPick('teeth', [])}</div>` }] : []), { name: 'when', label: 'When (about)', placeholder: 'e.g. 2 years ago' }, { name: 'note', label: 'Note', full: true }],
    onSubmit: async v => { const p = patientById(pid); const o = { p: v.proc === 'Other' && v.note ? v.note.trim() : v.proc, t: splitT(v.teeth).join(', '), d: '', when: (v.when || '').trim(), note: (v.note || '').trim(), added: todayLocal() };
      await save('patients', { ...p, pastTx: [...(p.pastTx || []), o] }, `Old treatment noted for ${p.name}`); toast(T('Saved')); render(); } }); };
A.pastTxDel = (pid, k) => confirmBox('Remove this?', '', 'Remove', async () => { const p = patientById(pid); await save('patients', { ...p, pastTx: (p.pastTx || []).filter(x => JSON.stringify([x.p, x.t, x.added || '']) !== k) }); A.closeModal(); render(); });

/* ---------- timeline: everything with date and time ---------- */
const msAt = ms => { const d = new Date(ms); return todayLocal(d) + 'T' + d.toTimeString().slice(0, 5); };
function caseEvents(p, forPrint) {
  const t = x => forPrint ? x : T(x); const ev = []; const add = (at, title, sub, c, by) => { if (at) ev.push({ at: String(at), title, sub: sub || '', c, by: by || '' }); };
  const vAt = v => v.created && todayLocal(new Date(v.created)) === v.date ? msAt(v.created) : v.date; const tl = x => forPrint ? `${x.p}${x.t ? ' ' + x.t : ''}` : txLine(x);
  pVisits(p.id).forEach(v => { const at = vAt(v);
    add(at, (v.tx || []).map(x => forPrint ? txText(x) : txUI(x)).join(' · ') || v.diagnosis || v.cc || v.complaint || t('Visit'), [v.cc || v.complaint ? `${t('Complaint')}: ${v.cc || v.complaint}` : '', (v.ccOld || []).length && !String(v.cc || '').includes(t('Problem in old')) ? `${t('Problem in old treatment')}: ${v.ccOld.map(tl).join(', ')}` : '', v.diagnosis ? `${t('Diagnosis')}: ${v.diagnosis}` : '', v.charge || v.saved ? `${t('Charge')}: ${inr(v.charge)}${v.saved ? ` · ${t('Discount')} ${pctOf(v.saved, v.listTotal)}% (${inr(v.saved)})` : ''}` : ''].filter(Boolean).join('\n'), '#C2185B', v.updatedBy);
    if ((v.rx || []).length) add(at, t('Medicines given'), v.rx.map(r => `${r.name} ${r.dose || ''}${r.days ? ' × ' + r.days + ' ' + t('days') : ''}`).join(', '), '#0891B2');
    if (v.v2 && v.advice) add(at, t('Advice given'), v.advice, '#16A34A');
    if (v.signImg) add(v.signedAt || at, t('Patient signed'), '', '#475569');
    if (v.followUp) add(at, t('Next visit fixed'), forPrint ? fmtDate(v.followUp) : T(fmtDate(v.followUp)), '#7C3AED'); });
  col('visits').filter(x => x.patientId === p.id && x.kind === 'consent').forEach(c => {
    add(c.created ? msAt(c.created) : c.date, `${t('Consent form made')}: ${c.title}`, c.via === 'link' ? t('Sent on the patient link') : t('To sign here'), '#D97706', c.createdBy);
    if (c.status === 'signed') add(c.signedAt, `${t('Consent signed')}: ${c.title}`, `${c.signName || ''}${c.signBy === 'guardian' ? ' (' + t('Parent / guardian') + ')' : ''} · ${c.signVia === 'link' ? t('on the patient link') : t('here')}${c.witness ? ' · ' + t('witness') + ' ' + c.witness : ''}`, '#0B9B68'); });
  (p.pays || []).forEach(x => add(x.date, `${t('Paid')} ${inr(x.amount)}`, [t(x.mode || ''), x.note].filter(Boolean).join(' · '), '#0B9B68', x.by));
  pAppts(p.id).filter(a => a.date >= todayLocal() && a.status !== 'cancelled').forEach(a => add(a.date + (a.time ? 'T' + a.time : ''), `${t('Appointment')}${a.status === 'cancelled' ? ' · ' + t('Cancelled') : ''}${+a.fee ? ' · ' + inr(a.fee) + (a.paid ? ' ' + t('paid') : '') : ''}`, a.reason || '', '#7C3AED'));
  (p.pastTx || []).forEach(x => add(x.added, `${t('Old treatment (other clinic)')}: ${tl(x)}`, [x.when, x.note].filter(Boolean).join(' · '), '#94A3B8'));
  if (p.created) add(typeof p.created === 'number' ? msAt(p.created) : p.created, t('Patient added'), '', '#64748B');
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}
function timelineHTML(p) {
  const ev = caseEvents(p); if (!ev.length) return `<div class="card">${empty('Nothing here yet', '', '', 'file', MOD.medical.c)}</div>`; let day = '';
  const all = S.filters.tlAll; const shown = all ? ev : ev.slice(0, 40);
  return `<div class="card pad ctl">${shown.map(e => { const [d, tm] = e.at.split('T'); const head = d !== day ? `<div class="ctl-day">${T(fmtDate(d))}</div>` : ''; day = d;
    return `${head}<div class="ctl-e"><span class="ctl-t">${tm ? tm.slice(0, 5) : ''}</span><i style="--c:${e.c}"></i><div class="ctl-x" translate="no"><b>${esc(e.title)}</b>${e.sub ? `<div class="ctl-s">${esc(e.sub)}</div>` : ''}${e.by ? `<div class="tiny muted">${esc(e.by)}</div>` : ''}</div></div>`; }).join('')}${ev.length > shown.length ? `<button class="btn sm ghost" style="margin-top:8px" onclick="A.setF('tlAll',1)">${T('See all')} (${ev.length})</button>` : ''}</div>`;
}

/* ---------- patients list: search by treatment too, treatments under the name ---------- */
const ptTxText = p => (p.txSum || []).concat(p.pastTx || []).map(x => `${x.p} ${T(x.p)} ${x.t || ''}`).join(' ').toLowerCase();
function patientRow2(p, q) {
  const h = txHistory(p); const hit = q ? h.filter(x => `${x.p} ${T(x.p)} ${x.t || ''}`.toLowerCase().includes(q)) : []; const show = (hit.length ? hit : h).slice(0, 4);
  return `<button class="row click" onclick="A.go('patient',{id:'${p.id}'${+p.unread > 0 ? ",tab:'messages'" : ''}})"><div class="avatar" style="background:#FFE4EA;color:#9F1239">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b>${p.ccNow?.text ? ` <span class="pill info">${T('Complaint noted')}</span>` : ''}${(p.account?.due || 0) > 0 ? ` <span class="pill bad">${T('Due')} ${inr(p.account.due)}</span>` : ''}
    <div class="sub">${[ageSex(p), p.phone ? esc(p.phone) : '', p.conditions ? esc(p.conditions) : ''].filter(Boolean).join(' · ')}</div>
    ${show.length ? `<div class="pt-tx">${show.map(x => `<span class="${hit.includes(x) ? 'hit' : ''}">${esc(txLine(x))} <small>${x.w === 'outside' ? T('other clinic') : dShortC(x.d)}</small></span>`).join('')}${h.length > show.length ? `<span>+${h.length - show.length}</span>` : ''}</div>` : ''}</div>${+p.unread ? `<span class="tabn">${p.unread}</span>` : ''}${ic('chev', 'go')}</button>`;
}
V.patients = () => {
  const q = (S.filters.patQ || '').toLowerCase().trim(); const f = S.filters.patF || 'All';
  let list = col('patients').slice().sort((a, b) => String(b.lastVisit || b.lastMsgAt || b.lastReadingAt || b.created || '').localeCompare(String(a.lastVisit || a.lastMsgAt || a.lastReadingAt || a.created || '')));
  if (q) list = list.filter(p => [p.name, p.phone, p.conditions].join(' ').toLowerCase().includes(q) || ptTxText(p).includes(q));
  if (f === 'New messages') list = list.filter(p => +p.unread > 0);
  if (f === 'On the patient link') list = list.filter(p => p.linkToken);
  if (f === 'Due') list = list.filter(p => (p.account?.due || 0) > 0);
  return pageHead('Patients', `${col('patients').length} ${T('patients')}`, can('patients', 2) ? `<button class="btn primary" onclick="A.patientForm()">${ic('plus')} ${T('New patient')}</button>` : '') +
  `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="${T('Search name, mobile or treatment (e.g. RCT, 46)')}" value="${esc(S.filters.patQ || '')}" oninput="clearTimeout(window._pq);window._pq=setTimeout(()=>A.setF('patQ',this.value),350)"></div></div>
  <div class="chips" style="margin-bottom:14px">${['All', 'Due', 'New messages', 'On the patient link'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('patF','${c}')">${T(c)}</button>`).join('')}</div>
  <div class="card">${list.length ? `<div class="rows">${list.map(p => patientRow2(p, q)).join('')}</div>` : empty(q ? 'No patient found' : 'No patients yet', '', can('patients', 2) && !q ? `<button class="btn primary" onclick="A.patientForm()">${ic('plus')} ${T('New patient')}</button>` : '', 'heart', MOD.patients.c)}</div>`;
};

/* ---------- patient page ---------- */
V.patient = () => {
  const p = patientById(S.params.id); if (!p) return pageHead('Patient', '', '', "A.go('patients')") + empty('Patient not found', '');
  loadPatientData(p.id); const loading = S.adapter.mode === 'cloud' && S.patLoaded?.[p.id] !== true; RN = rulesFor(p); const med = medAlertOn(p);
  const rd = pReadings(p.id); const msgs = pMsgs(p.id); const unread = +p.unread || 0;
  const tabs = [...(can('medical') ? [['records', 'Case history']] : []), ...(med ? [['health', 'Health'], ['readings', 'Readings']] : []), ...(typeof specTabs === 'function' ? specTabs(p) : []), ['messages', 'Messages', unread], ...(can('appointments') || can('patients') ? [['fees', 'Bills & payments']] : [])];
  let tab = S.params.tab || (can('medical') ? 'records' : med ? 'health' : 'fees'); if (!tabs.some(t => t[0] === tab)) tab = tabs[0][0];
  const phone = p.phone ? String(p.phone).replace(/\D/g, '').slice(-10) : ''; const a = p.account || accountOf(p);
  const head = `<button class="back" onclick="A.go('patients')">${ic('back')} Patients</button>
  <div class="card pad pat-head"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar" style="width:54px;height:54px;font-size:19px;background:#FFE4EA;color:#9F1239">${esc(initials(p.name))}</div>
    <div style="min-width:0;flex:1"><h1 style="font:800 22px/1.2 var(--f-display)">${esc(p.name)}${info('patient')}</h1><div class="small muted">${[ageSex(p), p.phone ? esc(p.phone) : ''].filter(Boolean).join(' · ')}</div>
    <div class="row-flex" style="gap:6px;margin-top:6px">${med ? `<span class="pill bad">${ic('alert')} ${T('Medical alert')}${(p.medList || []).length ? ': ' + esc(p.medList.map(x => T(x)).join(', ')) : p.conditions ? ': ' + esc(p.conditions) : ''}</span>` : ''}${p.allergies ? `<span class="pill bad">${T('Allergy')}: ${esc(p.allergies)}</span>` : ''}${(p.habits || []).length ? `<span class="pill warn">${esc(p.habits.map(x => T(x)).join(', '))}${p.habitsOk ? ' ✓' : ''}</span>` : ''}${isDent() && p.oral ? oralPill(p.oral) : ''}${a.due ? `<span class="pill bad">${T('Due')} ${inr(a.due)}</span>` : ''}${p.consentAt ? `<span class="pill good">${T('On the patient link')}</span>` : ''}</div></div>
    ${can('patients', 2) ? `<button class="icon-btn" aria-label="Edit patient" onclick="A.patientForm('${p.id}')">${ic('edit')}</button>` : ''}</div>
    <div class="row-flex" style="gap:6px;margin-top:12px">${can('medical', 2) ? `<button class="btn sm primary" onclick="A.visitForm('${p.id}')">${ic('plus')} ${T('New visit')}</button>` : can('patients', 2) ? `<button class="btn sm primary" onclick="A.ccNote('${p.id}')">${ic('mic')} ${T('Note complaint')}</button>` : ''}${phone ? `<a class="btn sm" href="tel:${phone}">${ic('phone')} Call</a>${waBtn('', phone, 'WhatsApp')}` : ''}${can('patients', 2) ? `<button class="btn sm" onclick="A.patientLinkSheet('${p.id}')">${ic('link')} Patient link</button>` : ''}${can('appointments', 2) ? `<button class="btn sm" onclick="A.apptForm({patientId:'${p.id}'})">${ic('calendar')} Appointment</button>` : ''}${can('patients', 2) ? `<button class="btn sm flag-btn" onclick="A.flagPatient('${p.id}')">${ic('flag')} Alert patient</button>` : ''}</div>
    ${p.ccNow?.text && !can('medical') ? `<div class="banner" style="margin-top:10px">${ic('mic')}<span class="grow">${T('Complaint noted')}: ${esc(p.ccNow.text)}</span><button class="btn sm" onclick="A.ccNote('${p.id}')">${ic('edit')}</button></div>` : ''}</div>
  ${patientBanners(p)}
  <div class="tabs">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${T(l)}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('pt-' + tab)}</div>`;
  if (loading) return head + `<div class="card">${empty('Loading…', '', '', 'pulse', '#94A3B8')}</div>`;
  if (tab.startsWith('sp-') && can('medical') && typeof specView === 'function') return head + specView(tab.slice(3), p);
  if (tab === 'readings') return head + readingsTab(p, rd);
  if (tab === 'records' && can('medical')) return head + caseTab(p);
  if (tab === 'messages') { if (unread && can('patients', 2)) setTimeout(() => A.markRead(p.id), 600); return head + messagesTab(p, msgs); }
  if (tab === 'fees') return head + billsTab(p);
  return head + healthTab(p, rd);
};
A.saveToRecords = (pid, msgId) => { const m = getById('pmsgs', msgId); if (!m) return; A.visitForm(pid, '', { date: String(m.at).slice(0, 10), cc: m.text || '', files: m.files || [] }); };

/* ---------- prints ---------- */
const PRINT_CSS = `body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:760px;margin:20px auto;padding:0 16px}h1{font-size:21px;margin:0}h2{font-size:16px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #C2185B;padding-bottom:10px;margin-bottom:12px}.muted{color:#555;font-size:12.5px}.eyebrow{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-top:6px}.vb{margin:4px 0}.pre{white-space:pre-wrap}.rx-t{border-collapse:collapse;width:100%;margin:4px 0}.rx-t td{border-bottom:1px solid #ddd;padding:4px 6px}.tx-list{margin:2px 0 0;padding-left:18px}table.kv{border-collapse:collapse;width:100%}table.kv td,table.kv th{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}table.kv th{background:#f4f4f6;width:32%}.visit{border:1px solid #ccc;border-radius:8px;padding:8px 12px;margin:8px 0;page-break-inside:avoid}.signs{display:flex;justify-content:space-between;gap:24px;margin-top:46px}.signs div{border-top:1px solid #111;padding-top:4px;min-width:200px;text-align:center;font-size:13px}.rx{font:700 26px serif;color:#C2185B}.num{float:right}@media print{button{display:none}}`;
function printDoc(title, body) {
  const st = settings(); const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', 'bad'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>
  <div class="top"><div>${st.logo ? `<img src="${esc(st.logo)}" alt="" style="height:52px">` : ''}<h1>${esc(st.bizName || '')}</h1><div class="muted">${esc([st.address, st.city].filter(Boolean).join(', '))}${st.phone ? ' · ' + esc(st.phone) : ''}</div>${st.timings ? `<div class="muted">${esc(st.timings)}</div>` : ''}</div>
  <div style="text-align:right"><b>Dr. ${esc(st.doctorName || '')}</b><div class="muted">${esc(st.qualification || '')}${st.specialisation ? ' · ' + esc(st.specialisation) : ''}</div><div class="muted">Reg. No. ${esc(st.regNo || '—')}${st.council ? ' · ' + esc(st.council) : ''}</div></div></div>
  ${body}<button onclick="print()" style="margin-top:20px;padding:10px 16px">Print / Save as PDF</button></body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) { } }, 450);
}
const ptLine = (p, date) => `<div style="display:flex;justify-content:space-between;gap:10px"><div><b>${esc(p.name)}</b> <span class="muted">${esc([p.age ? p.age + ' yrs' : '', p.sex || ''].filter(Boolean).join(' · '))}${p.phone ? ' · ' + esc(p.phone) : ''}</span></div><div class="muted">${fmtDate(date)}</div></div>${p.allergies ? `<div class="muted">Allergies: <b>${esc(p.allergies)}</b></div>` : ''}${medAlertOn(p) ? `<div class="muted">Medical alert: <b>${esc([...(p.medList || []), p.conditions].filter(Boolean).join(', '))}</b></div>` : ''}`;
A.printVisit = id => {
  const v = getById('visits', id); const p = patientById(v.patientId); const st = settings();
  const rx = (v.rx || []).length ? `<div class="vb"><span class="rx">℞</span><table class="rx-t"><tbody>${v.rx.map((r, i) => `<tr><td>${i + 1}.</td><td><b>${esc(r.name)}</b></td><td>${esc(r.dose || '')}</td><td>${esc(r.when || '')}</td><td>${r.days ? esc(String(r.days)) + ' days' : ''}</td></tr>`).join('')}</tbody></table></div>` : (v.oldRx || (!v.v2 && v.advice)) ? `<div class="vb"><span class="rx">℞</span><div class="pre">${esc(v.oldRx || v.advice)}</div></div>` : '';
  const body = `${ptLine(p, v.date)}
    ${(v.cc ?? v.complaint) ? `<div class="vb"><span class="eyebrow">Complaint</span>${esc(v.cc ?? v.complaint)}${v.since ? ' · since ' + esc(v.since) : ''}</div>` : ''}${v.exam ? `<div class="vb"><span class="eyebrow">On examination</span>${esc(v.exam)}</div>` : ''}${v.diagnosis ? `<div class="vb"><span class="eyebrow">Diagnosis</span>${esc(v.diagnosis)}</div>` : ''}
    ${(v.tx || []).length ? `<div class="vb"><span class="eyebrow">Treatment done</span><ul class="tx-list">${v.tx.map(t => `<li>${esc(txText(t))}</li>`).join('')}</ul></div>` : ''}
    ${rx}${v.v2 && v.advice ? `<div class="vb"><span class="eyebrow">Advice</span><div class="pre">${esc(v.advice)}</div></div>` : ''}${v.followUp ? `<div class="vb"><b>Next visit:</b> ${fmtDate(v.followUp)}</div>` : ''}
    <div style="margin-top:44px;text-align:right">${st.stamp ? `<img src="${esc(st.stamp)}" alt="" style="height:60px"><br>` : ''}Dr. ${esc(st.doctorName || '')}</div>`;
  printDoc(`${p.name} ${v.date}`, body); logAct(`Printed prescription for ${p.name}`);
};
A.printCase = pid => {
  const p = patientById(pid); const vs = pVisits(pid).slice().reverse(); const cons = col('visits').filter(x => x.patientId === pid && x.kind === 'consent' && x.status === 'signed'); const a = accountOf(p);
  const body = `<h2 style="border:0;text-align:center;font-size:18px;margin-top:0">CASE SHEET</h2>
  <table class="kv"><tbody><tr><th>Patient</th><td><b>${esc(p.name)}</b> ${esc([p.age ? p.age + ' yrs' : '', p.sex || ''].filter(Boolean).join(' · '))}</td></tr><tr><th>Mobile / address</th><td>${esc([p.phone, p.address].filter(Boolean).join(' · ') || '—')}</td></tr>
    <tr><th>Medical alert</th><td>${medAlertOn(p) ? `<b>Yes</b> · ${esc([...(p.medList || []), p.conditions].filter(Boolean).join(', '))}` : 'No'}</td></tr>${p.meds ? `<tr><th>Current medicines</th><td>${esc(p.meds)}</td></tr>` : ''}
    <tr><th>Allergy</th><td>${esc(p.allergies || 'None')}</td></tr><tr><th>Habits</th><td>${esc((p.habits || []).join(', ') || 'None')}${(p.habits || []).length ? (p.habitsOk ? ` <span class="muted">(confirmed by ${esc(p.habitsOk.by || 'doctor')})</span>` : ' <span class="muted">(not confirmed)</span>') : ''}</td></tr>
    ${p.oral ? `<tr><th>Oral health</th><td>${esc((ORAL.find(o => o[0] === p.oral) || [])[1] || '')}</td></tr>` : ''}<tr><th>First visit</th><td>${vs[0] ? fmtDate(vs[0].date) : '—'}</td></tr></tbody></table>
  <h2>Visits and treatment</h2>${vs.map(v => `<div class="visit"><b>${fmtDate(v.date)}</b><span class="muted"> · ${esc(v.updatedBy || '')}</span>${visitBody(v, true)}</div>`).join('') || '<p class="muted">No visits</p>'}
  ${txHistory(p).length ? `<h2>Treatments done</h2><table class="kv"><tbody>${txHistory(p).map(x => `<tr><th>${x.w === 'outside' ? 'Other clinic' + (x.when ? ' · ' + esc(x.when) : '') : fmtDate(x.d)}</th><td>${esc(x.p)}${x.t ? ' · ' + esc(x.t) : ''}${x.s ? ' · ' + esc(x.s) : ''}${x.a ? ' · ' + inr(x.a) : ''}</td></tr>`).join('')}</tbody></table>` : ''}
  <h2>Timeline</h2><table class="kv"><tbody>${caseEvents(p, true).map(e => `<tr><th>${fmtDate(e.at.slice(0, 10))}${e.at.length > 10 ? ' ' + e.at.slice(11, 16) : ''}</th><td><b>${esc(e.title)}</b>${e.sub ? `<div class="muted pre">${esc(e.sub)}</div>` : ''}</td></tr>`).join('')}</tbody></table>
  ${cons.length ? `<h2>Consent forms</h2><table class="kv"><tbody>${cons.map(c => `<tr><th>${esc(c.title)}</th><td>Signed by ${esc(c.signName || '')} on ${atText(c.signedAt)}</td></tr>`).join('')}</tbody></table>` : ''}
  <h2>Bill</h2><table class="kv"><tbody><tr><th>Total</th><td>${inr(a.charged)}</td></tr><tr><th>Paid</th><td>${inr(a.paid)}</td></tr><tr><th>Due</th><td><b>${inr(a.due)}</b></td></tr></tbody></table>
  <p class="muted" style="margin-top:14px">I confirm that the details above are correct and that the treatment was explained to me.</p>
  <div class="signs"><div>Patient / guardian signature<br><span class="muted">Name & date</span></div><div>Dr. ${esc(settings().doctorName || '')}<br><span class="muted">Signature & stamp</span></div></div>`;
  printDoc(`Case sheet ${p.name}`, body); logAct(`Printed case sheet of ${p.name}`);
};

/* ---------- consent forms ---------- */
const CONSENT_TPL = [
  { k: 'general', t: 'Consent for examination and treatment', all: 1,
    en: 'I, {patient}, agree to be examined and treated by Dr. {doctor} at {clinic}. The doctor has explained my problem, the treatment ({procedure}), its benefits, possible risks and other choices in a language I understand. I have told the doctor about my illnesses, medicines and allergies truthfully. I understand that results can differ from person to person and no result is guaranteed. I had the chance to ask questions and all were answered.',
    hi: 'मैं, {patient}, {clinic} में डॉ. {doctor} से जांच और इलाज ({procedure}) कराने के लिए सहमत हूं। डॉक्टर ने मेरी समस्या, इलाज, उसके फ़ायदे, संभावित जोखिम और दूसरे विकल्प मुझे मेरी समझ की भाषा में बताए हैं। मैंने अपनी बीमारियां, दवाइयां और एलर्जी सच-सच बताई हैं। मैं समझता/समझती हूं कि हर व्यक्ति में नतीजा अलग हो सकता है और किसी नतीजे की गारंटी नहीं है। मुझे सवाल पूछने का मौका मिला और सभी के जवाब मिले।' },
  { k: 'la', t: 'Consent for local anaesthesia (injection)', all: 1,
    en: 'I agree to receive local anaesthesia (numbing injection) for {procedure}. I understand that numbness may last a few hours, and rarely there can be swelling, bruising, allergy or longer numbness. I have told the doctor about any heart problem, BP, diabetes, pregnancy and allergies.',
    hi: 'मैं {procedure} के लिए सुन्न करने वाला इंजेक्शन (लोकल एनेस्थीसिया) लगवाने के लिए सहमत हूं। मैं समझता/समझती हूं कि सुन्नपन कुछ घंटे रह सकता है, और कभी-कभी सूजन, नीला निशान, एलर्जी या ज़्यादा देर तक सुन्नपन हो सकता है। मैंने डॉक्टर को दिल की बीमारी, बीपी, शुगर, गर्भावस्था और एलर्जी के बारे में बता दिया है।' },
  { k: 'rct', t: 'Consent for root canal treatment (RCT)', dent: 1,
    en: 'I agree to root canal treatment of tooth {teeth}. The doctor explained that RCT removes the infected nerve, may need 1 to 3 sittings, and that a cap (crown) is usually advised afterwards to protect the tooth. I understand that pain or swelling can occur between sittings, instruments can rarely break inside the canal, and in some cases the tooth may still need extraction later.',
    hi: 'मैं दांत {teeth} के रूट कैनाल इलाज (आरसीटी) के लिए सहमत हूं। डॉक्टर ने बताया है कि आरसीटी में संक्रमित नस निकाली जाती है, इसमें 1 से 3 बार आना पड़ सकता है, और बाद में दांत को बचाने के लिए कैप (क्राउन) लगवाने की सलाह दी जाती है। मैं समझता/समझती हूं कि बीच में दर्द या सूजन हो सकती है, कभी-कभी औज़ार नली में टूट सकता है, और कुछ मामलों में बाद में दांत निकालना पड़ सकता है।' },
  { k: 'ext', t: 'Consent for tooth extraction', dent: 1,
    en: 'I agree to extraction of tooth {teeth}. The doctor explained why it is needed and the other choices. I understand that pain, swelling, bleeding, dry socket, injury to nearby teeth or rarely numbness of the lip or tongue can happen. I will follow the after-care advice given to me.',
    hi: 'मैं दांत {teeth} निकलवाने के लिए सहमत हूं। डॉक्टर ने बताया है कि यह क्यों ज़रूरी है और दूसरे विकल्प क्या हैं। मैं समझता/समझती हूं कि दर्द, सूजन, खून आना, ड्राई सॉकेट, पास के दांत को चोट या कभी-कभी होंठ या जीभ में सुन्नपन हो सकता है। मुझे दी गई देखभाल की सलाह का मैं पालन करूंगा/करूंगी।' },
  { k: 'implant', t: 'Consent for dental implant / bridge', dent: 1,
    en: 'I agree to {procedure} for tooth {teeth}. The doctor explained the steps, the time it takes, the cost, and that success depends on bone, gums, oral hygiene and habits such as smoking. I understand that the implant or bridge may fail or need repair, and that I must come for follow-up visits.',
    hi: 'मैं दांत {teeth} के लिए {procedure} कराने के लिए सहमत हूं। डॉक्टर ने इलाज के चरण, लगने वाला समय, खर्च बताया है, और यह भी कि सफलता हड्डी, मसूड़ों, मुंह की सफ़ाई और धूम्रपान जैसी आदतों पर निर्भर है। मैं समझता/समझती हूं कि इम्प्लांट या ब्रिज खराब हो सकता है या उसकी मरम्मत करनी पड़ सकती है, और मुझे जांच के लिए आते रहना होगा।' },
  { k: 'photo', t: 'Consent for photos and records', all: 1,
    en: 'I agree that the clinic may take photos, X-rays and reports of my treatment and keep them safely in my record. They will be used only for my treatment and will not be shared with anyone else without my permission, except where the law requires.',
    hi: 'मैं सहमत हूं कि क्लिनिक मेरे इलाज की फ़ोटो, एक्स-रे और रिपोर्ट ले सकता है और उन्हें मेरे रिकॉर्ड में सुरक्षित रख सकता है। इनका उपयोग सिर्फ़ मेरे इलाज के लिए होगा और कानून की ज़रूरत के अलावा मेरी इजाज़त के बिना किसी से साझा नहीं किया जाएगा।' }];
const consentTpls = () => CONSENT_TPL.filter(t => t.all || (t.dent && isDent())).concat((settings().consentTpls || []).map(t => ({ ...t, own: 1 })));
function fillTpl(txt, p, o) { const st = settings(); return String(txt || '').replace(/\{patient\}/g, p.name || '').replace(/\{doctor\}/g, st.doctorName || '').replace(/\{clinic\}/g, st.bizName || '').replace(/\{procedure\}/g, o.procedure || (I18N.lang === 'hi' ? 'इलाज' : 'the treatment')).replace(/\{teeth\}/g, o.teeth || '—').replace(/\{date\}/g, fmtDate(todayLocal())); }
A.consentNew = (pid, k, lang) => {
  const p = patientById(pid); const list = consentTpls(); const t = list.find(x => x.k === k) || list[0]; const lg = lang || (I18N.lang === 'hi' ? 'hi' : 'en');
  const last = pVisits(pid)[0]; const lastTx = (last?.tx || [])[0]; const o = { procedure: lastTx ? lastTx.proc : '', teeth: lastTx ? teethTxt(lastTx.proc === 'Bridge' ? [...(lastTx.missing || []), ...(lastTx.support || [])] : lastTx.teeth) : '' };
  modal(`<form class="form" onsubmit="A.consentCreate(event,'${pid}')" novalidate>${sheetHead(T('Consent form'), p.name)}<div class="sheet-b stack">
    ${fieldHTML({ name: 'tpl', label: 'Form', type: 'select', value: t.k, options: list.map(x => [x.k, T(x.t)]) }).replace('<select', `<select onchange="A.consentNew('${pid}',this.value,this.form.lang.value)"`)}
    <div class="field"><span>${T('Language for the patient')}</span><div class="chips">${[['en', 'English'], ['hi', 'हिंदी']].map(([v, l]) => `<label class="chip-radio"><input type="radio" name="lang" value="${v}" ${lg === v ? 'checked' : ''} onchange="A.consentNew('${pid}',this.form.tpl.value,'${v}')"><span translate="no">${l}</span></label>`).join('')}</div></div>
    ${fieldHTML({ name: 'title', label: 'Title', value: T(t.t) })}
    ${fieldHTML({ name: 'text', label: 'Text the patient will read (you can change it)', type: 'textarea', rows: 9, value: fillTpl(lg === 'hi' ? t.hi || t.en : t.en, p, o) })}
    <label class="check"><input type="checkbox" name="keep"> <span>${T('Save this text as my own form')}</span></label>
    <input type="hidden" name="how" value="here">
  </div><footer class="sheet-f"><button class="btn" type="submit" onclick="this.form.how.value='link'">${ic('wa')} ${T('Send to patient link')}</button><span class="grow"></span><button class="btn primary" type="submit" onclick="this.form.how.value='here'">${ic('edit')} ${T('Patient signs here')}</button></footer></form>`, { wide: true });
};
A.consentCreate = (e, pid) => { e.preventDefault(); const v = readForm(e.target); withBtn(e, async () => {
  if ((v.text || '').trim().length < 20) throw new Error('Write the consent text'); const p = patientById(pid);
  const rec = { id: uid('cs_'), patientId: pid, kind: 'consent', date: todayLocal(), title: (v.title || '').trim() || T('Consent form'), text: v.text.trim(), lang: v.lang || 'en', status: 'pending', via: v.how === 'link' ? 'link' : 'here', createdBy: S.me?.name || S.user?.name || '', created: Date.now() };
  await save('visits', rec, `Consent form for ${p.name}: ${rec.title}`);
  if (v.keep && can('settings', 2)) { const own = settings().consentTpls || []; await saveSettingsRec({ consentTpls: [...own.filter(x => x.t !== rec.title), { k: 'own_' + Math.random().toString(36).slice(2, 7), t: rec.title, en: rec.lang === 'en' ? rec.text : '', hi: rec.lang === 'hi' ? rec.text : '' }].slice(-12) }); }
  A.closeModal(); if (rec.via === 'here') setTimeout(() => A.consentSign(rec.id), 60); else setTimeout(() => A.consentSend(rec.id), 60); render(); }); };
A.consentSend = async id => { const c = getById('visits', id); const p = patientById(c.patientId); try { if (!p.linkToken) { p.linkToken = await S.adapter.patientLink(S.org.orgId, p.id, false); await save('patients', { ...patientById(p.id), linkToken: p.linkToken }); } } catch (e) { toast(e.message, 'bad'); return; }
  const ph = String(p.phone || '').replace(/\D/g, '').slice(-10); const msg = c.lang === 'hi' ? `नमस्ते ${p.name} जी 🙏\n${settings().bizName} की ओर से "${c.title}" फ़ॉर्म। कृपया पढ़ें, सहमति दें और हस्ताक्षर करें:\n${portalUrl(p.linkToken)}` : `Namaste ${p.name} ji 🙏\nPlease read and sign "${c.title}" from ${settings().bizName}:\n${portalUrl(p.linkToken)}`;
  if (ph) window.open(waLink(msg, ph), '_blank', 'noopener'); else A.copy(msg); toast(T('Sent to the patient link')); };
/* signature: draw with a finger, or upload a photo of the signature */
/* ---------- signature: a full-screen white pad, sign with a finger (or a photo of the signature) ---------- */
const sigBox = (id, who) => `<div class="sig-box" data-sig-for="${id}"><input type="hidden" id="${id}" value=""><button type="button" class="sig-tap" onclick="A.sigOpen('${id}',${esc(JSON.stringify(who || ''))})"><span class="sig-ph">${ic('edit')} ${T('Tap here and sign with your finger')}</span></button>
  <label class="linkbtn tiny">${ic('camera')} ${T('or upload a photo of the signature')}<input type="file" accept="image/*" hidden onchange="A.sigUpload('${id}',this)"></label></div>`;
function sigSet(id, url) {
  const inp = document.getElementById(id); if (!inp) return; inp.value = url || '';
  const box = document.querySelector(`[data-sig-for="${id}"]`); const tap = box?.querySelector('.sig-tap');
  if (tap) tap.innerHTML = url ? `<img src="${url}" alt="${T('Signature')}"><span class="sig-again">${ic('edit')} ${T('Sign again')}</span>` : `<span class="sig-ph">${ic('edit')} ${T('Tap here and sign with your finger')}</span>`;
  const vf = document.querySelector(`.vf-sign[data-for="${id}"]`); if (vf) { vf.querySelector('img')?.remove(); if (url) vf.insertAdjacentHTML('afterbegin', `<img src="${url}" alt="">`); }
  inp.dispatchEvent(new Event('ink', { bubbles: true }));
}
const SIG = { open: null, swallow: 0 };
window.popHook = e => { if (SIG.swallow) { SIG.swallow--; return true; } if (SIG.open) { SIG.open(false, true); return true; } return false; };
A.sigOpen = (id, who) => {
  if (SIG.open) return; const o = document.createElement('div'); o.className = 'sig-full';
  o.innerHTML = `<div class="sig-bar"><div class="grow" style="min-width:0"><b>${T('Sign here')}</b>${who ? `<div class="tiny muted">${esc(who)}</div>` : ''}</div><button type="button" class="btn sm ghost" data-a="clear">${T('Clear')}</button><button type="button" class="btn sm primary" data-a="done" disabled>${ic('check')} ${T('Done')}</button><button type="button" class="icon-btn" data-a="close" aria-label="Close">${ic('x')}</button></div><div class="sig-area"><canvas></canvas><div class="sig-line"><span>✕</span></div></div>`;
  document.body.appendChild(o); document.body.classList.add('sig-on');
  const area = o.querySelector('.sig-area'), c = o.querySelector('canvas'), done = o.querySelector('[data-a=done]'); const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r0 = area.getBoundingClientRect(); c.width = Math.round(r0.width * dpr); c.height = Math.round(r0.height * dpr); const x = c.getContext('2d');
  x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0E1A33'; x.lineWidth = 2.6 * dpr; let ink = false, pts = [], box = [1e9, 1e9, -1, -1];
  const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };
  const grow = ([a, b]) => { box = [Math.min(box[0], a), Math.min(box[1], b), Math.max(box[2], a), Math.max(box[3], b)]; };
  c.addEventListener('pointerdown', e => { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (er) { } pts = [pt(e)]; grow(pts[0]); x.beginPath(); x.arc(pts[0][0], pts[0][1], x.lineWidth / 2, 0, 7); x.fillStyle = '#0E1A33'; x.fill(); });
  c.addEventListener('pointermove', e => { if (!pts.length) return; e.preventDefault(); const q = pt(e); grow(q); const p = pts[pts.length - 1]; const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    x.beginPath(); x.moveTo(pts.length > 1 ? (pts[pts.length - 2][0] + p[0]) / 2 : p[0], pts.length > 1 ? (pts[pts.length - 2][1] + p[1]) / 2 : p[1]); x.quadraticCurveTo(p[0], p[1], m[0], m[1]); x.stroke(); pts.push(q);
    if (!ink) { ink = true; done.disabled = false; } });
  const up = () => { pts = []; }; c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('pointerleave', up);
  const finish = (keep, fromBack) => {
    if (keep && ink) { const pad = 14 * dpr; const sx = Math.max(0, box[0] - pad), sy = Math.max(0, box[1] - pad), sw = Math.min(c.width, box[2] + pad) - sx, sh = Math.min(c.height, box[3] + pad) - sy;
      const k = Math.min(1, 900 / sw, 320 / sh); const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k)); const ox = out.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, out.width, out.height); ox.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
      sigSet(id, out.toDataURL('image/png')); }
    o.remove(); document.body.classList.remove('sig-on'); SIG.open = null; if (!fromBack) { SIG.swallow++; try { history.back(); } catch (er) { SIG.swallow--; } } };
  SIG.open = finish; try { history.pushState({ sig: 1 }, ''); } catch (er) { }
  o.querySelector('[data-a=clear]').onclick = () => { x.clearRect(0, 0, c.width, c.height); ink = false; done.disabled = true; box = [1e9, 1e9, -1, -1]; };
  done.onclick = () => finish(true); o.querySelector('[data-a=close]').onclick = () => finish(false);
};
A.sigUpload = (id, input) => { const file = input.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); const img = new Image();
  img.onload = () => { const k = Math.min(1, 900 / img.width, 400 / img.height); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); sigSet(id, c.toDataURL('image/jpeg', 0.75)); }; img.src = url; };
const sigData = id => document.getElementById(id)?.value || '';
const signReady = f => { const ok = f.agree?.checked && sigData('sigC') && (f.signName?.value || '').trim().length > 1; const b = f.querySelector('button[type=submit]'); if (b) b.disabled = !ok; };
function consentSheet(c, nameVal, onsubmit, sub) {
  modal(`<form class="form" onsubmit="${onsubmit}" novalidate oninput="signReady(this)" onchange="signReady(this)">${sheetHead(c.title, sub || '')}<div class="sheet-b stack">
    <div class="consent-text" translate="no">${esc(c.text)}</div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'signName', label: 'Name of the person signing', value: nameVal || '' })}<div class="field"><span>${T('Signing as')}</span><div class="chips">${[['patient', 'Patient'], ['guardian', 'Parent / guardian']].map(([k, l]) => `<label class="chip-radio"><input type="radio" name="signBy" value="${k}" ${k === 'patient' ? 'checked' : ''}><span>${T(l)}</span></label>`).join('')}</div></div></div>
    <label class="check consent-agree"><input type="checkbox" name="agree"> <span>${T('I have read this form (or it was read to me) and I understand it. I agree.')}</span></label>
    <div class="field"><span>${T('Signature')}</span>${sigBox('sigC', nameVal)}</div>
  </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit" disabled>${ic('check')} ${T('Final submit')}</button></footer></form>`, { wide: true });
  setTimeout(() => { const f = $('#modalRoot form'); document.getElementById('sigC')?.addEventListener('ink', () => signReady(f)); }, 40);
}
A.consentSign = id => { const c = getById('visits', id); const p = patientById(c.patientId); consentSheet(c, p.name, `A.consentSave(event,'${id}')`, `${p.name} · ${T('Hand the phone to the patient')}`); };
A.consentSave = (e, id) => { e.preventDefault(); const f = e.target; const v = readForm(f); const img = sigData('sigC'); if (!v.agree || !img) { toast('Tick “I agree” and sign', 'bad'); return; }
  withBtn(e, async () => { const c = getById('visits', id); await save('visits', { ...c, status: 'signed', signedAt: nowAt(), signName: (v.signName || '').trim(), signBy: v.signBy || 'patient', signImg: img, signVia: 'here', witness: S.me?.name || S.user?.name || '' }, `Consent signed: ${c.title}`); A.closeModal(); toast(T('Consent saved')); render(); }); };
A.printConsent = id => { const c = getById('visits', id); const p = patientById(c.patientId);
  printDoc(`${c.title} ${p.name}`, `${ptLine(p, (c.signedAt || c.date || '').slice(0, 10))}<h2 style="text-align:center;border:0">${esc(c.title)}</h2><div class="pre" style="font-size:15px;line-height:1.7">${esc(c.text)}</div>
    <p>☑ I have read this form (or it was read to me) and I understand it. I agree.</p>
    <div class="signs"><div>${c.signImg ? `<img src="${c.signImg}" alt="" style="max-height:70px;display:block;margin:0 auto">` : ''}${esc(c.signName || '')} (${c.signBy === 'guardian' ? 'parent / guardian' : 'patient'})<br><span class="muted">${atText(c.signedAt)}${c.signVia === 'link' ? ' · signed on the patient link' : ''}</span></div><div>Dr. ${esc(settings().doctorName || '')}${c.witness ? `<br><span class="muted">Witness: ${esc(c.witness)}</span>` : ''}</div></div>`); };

/* ---------- patient link: bill and forms to sign ---------- */
function portalCaseCards() {
  const P = S.portal; const a = P.patient?.account; const cons = P.consents || []; const pend = cons.filter(c => c.status !== 'signed'); const c = P.clinic || {}; let out = '';
  if (pend.length) out += `<div class="card pad stack-sm portal-forms" style="margin-bottom:14px"><b>${ic('file')} ${T('Form to read and sign')}</b><div class="rows">${pend.map(x => `<button class="row click" onclick="A.portalConsentOpen('${x.id}')"><div class="main-col"><b>${esc(x.title)}</b><div class="sub">${T('Tap to read, agree and sign')}</div></div>${ic('chev')}</button>`).join('')}</div></div>`;
  if (a && (a.charged || a.paid)) out += `<div class="card pad stack-sm" style="margin-bottom:14px"><b>${ic('rupee')} ${T('My bill')}</b><div class="money-grid"><div><span>${T('Total bill')}</span><b>${inr(a.charged)}</b></div><div><span>${T('Paid')}</span><b class="good-t">${inr(a.paid)}</b></div><div><span>${T('Due')}</span><b class="${a.due ? 'bad-t' : ''}">${inr(a.due)}</b></div></div>
    <details><summary class="small">${T('See details')}</summary><div class="rows tight">${(a.lines || []).map(l => `<div class="row"><div class="main-col"><b>${esc(l.desc)}</b><div class="sub">${dShortC(l.date)}${l.saved ? ` · <span class="good-t">${T('Discount')} ${l.pct}% (${inr(l.saved)})</span>` : ''}</div></div><b class="num">${inr(l.amount)}</b></div>`).join('')}${(a.pays || []).map(x => `<div class="row"><div class="main-col"><b class="good-t">${T('Paid')}</b><div class="sub">${dShortC(x.date)} · ${esc(T(x.mode || ''))}</div></div><b class="num good-t">${inr(x.amount)}</b></div>`).join('')}</div></details>
    ${a.due && c.upi ? `<a class="btn primary block" href="${esc(`upi://pay?pa=${encodeURIComponent(c.upi)}&pn=${encodeURIComponent(c.bizName || 'Clinic')}&am=${(+a.due).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + (P.patient?.name || ''))}`)}">${ic('rupee')} ${T('Pay with any UPI app')} ${inr(a.due)}</a><p class="tiny muted">${T('After paying, send the screenshot in Messages so the clinic can mark it paid.')}</p>` : ''}</div>`;
  const signed = cons.filter(x => x.status === 'signed'); if (signed.length) out += `<details class="card pad" style="margin-bottom:14px"><summary class="small"><b>${T('Forms I have signed')}</b> (${signed.length})</summary><div class="rows tight">${signed.map(x => `<div class="row"><div class="main-col"><b>${esc(x.title)}</b><div class="sub">${atText(x.signedAt)}</div></div></div>`).join('')}</div></details>`;
  return out;
}
A.portalConsentOpen = id => { const c = (S.portal.consents || []).find(x => x.id === id); if (!c) return; consentSheet(c, S.portal.patient?.name || '', `A.portalConsentSave(event,'${id}')`, S.portal.clinic?.bizName || ''); };
A.portalConsentSave = (e, id) => { e.preventDefault(); const v = readForm(e.target); const img = sigData('sigC'); if (!v.agree || !img) { toast('Tick “I agree” and sign', 'bad'); return; }
  withBtn(e, async () => { await S.adapter.portalSignConsent(S.portal.token, id, `${(v.signName || '').trim()}${v.signBy === 'guardian' ? ' (guardian)' : ''}`, img); A.closeModal(); toast(T('Thank you. The form is signed.')); await portalReload(); }); };

/* clinic income now also counts payments written on the patient (visit charges) */
const ptPaysAll = () => col('patients').flatMap(p => (p.pays || []).map(x => ({ ...x, patientName: p.name })));
