/* ================= Departments (venue): the owner makes own departments, adds / removes people,
   alerts a whole department or one person. Collection 'depts' (module venue):
   { id, name, icon, color, head (person key), members: [person key], notes }
   Person key = 's:<staff id>' (crew record; alerts go to its linked app login) or 'u:<user id>' (app login without a crew record). */
const DEPT_PRESETS = [['Housekeeping', 'bed', '#0F766E'], ['Kitchen', 'utensils', '#EA580C'], ['Service / Waiters', 'users', '#2563EB'], ['Front office', 'door', '#7C3AED'],
  ['Decor & lights', 'bulb', '#DB2777'], ['Maintenance', 'wrench', '#64748B'], ['Security', 'shield', '#0F172A'], ['Sales', 'megaphone', '#9333EA'], ['Accounts', 'rupee', '#0B9B68'], ['Parking & valet', 'truck', '#D97706']];
const DEPT_COLORS = ['#0F766E', '#2563EB', '#EA580C', '#7C3AED', '#DB2777', '#0B9B68', '#D97706', '#9333EA', '#E0344B', '#64748B'];
const deptById = id => col('depts').find(d => d.id === id);
const memberPhone = m => String(m.email || '').endsWith('@' + MOBILE_DOMAIN) ? m.email.split('@')[0] : '';
function deptPeople() {
  const out = []; const linked = new Set();
  col('staff').forEach(s => { const m = S.members.find(x => x.staffId === s.id && x.userId); if (m) linked.add(m.userId); out.push({ key: 's:' + s.id, name: s.name || '—', phone: s.phone || (m ? memberPhone(m) : ''), role: s.role || (m ? S.roles[m.role]?.label || m.role : ''), userId: m?.userId || '', appRole: m?.role || '' }); });
  S.members.filter(m => m.userId && !linked.has(m.userId)).forEach(m => out.push({ key: 'u:' + m.userId, name: m.name || displayId(m.email), phone: memberPhone(m), role: S.roles[m.role]?.label || m.role, userId: m.userId, appRole: m.role }));
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
const deptMembersOf = (d, people = deptPeople()) => (d.members || []).map(k => people.find(p => p.key === k)).filter(Boolean);
const deptsOfPerson = key => col('depts').filter(d => (d.members || []).includes(key));
/* who can get a personal alert from me: anyone (tasks Edit+) or only seniors */
const canAlertPerson = p => !!p.userId && p.userId !== S.user?.id && canSendAlert() && (canAlertAll() || ROLE_GROUPS.managers.includes(p.appRole));

function deptsTab() {
  const list = col('depts').slice().sort(by('name')); const edit = can('venue', 2); const people = deptPeople();
  const loose = people.filter(p => !list.some(d => (d.members || []).includes(p.key)));
  const add = edit ? `<button class="btn primary" onclick="A.deptForm()">${ic('plus')} ${T('New department')}</button>` : '';
  if (!list.length) return `<div class="card">${empty('No departments yet', 'Make your own departments like Housekeeping, Kitchen or Service, add people to each, and send an alert to a whole department or to one person.', add, 'users', MOD.venue.c)}</div>`;
  return `${edit || canAlertAll() ? `<div class="row-flex" style="gap:8px;margin-bottom:12px">${add}${canAlertAll() ? `<button class="btn" onclick="A.alertForm()">${ic('bell')} ${T('Alert one person')}</button>` : ''}</div>` : ''}
  <div class="grid g-auto dept-grid">${list.map(d => deptCard(d, people)).join('')}</div>
  ${loose.length ? `<div class="card pad" style="margin-top:14px"><b class="small">${T('Not in any department')} (${loose.length})</b><div class="chips" style="margin-top:8px">${loose.map(p => `<span class="chip static">${esc(p.name)}</span>`).join('')}</div>${edit ? `<p class="tiny muted" style="margin-top:8px">${T('Open a department and tap “Add / remove people” to put them in.')}</p>` : ''}</div>` : ''}`;
}
function deptCard(d, people) {
  const mem = deptMembersOf(d, people); const head = d.head ? people.find(p => p.key === d.head) : null; const edit = can('venue', 2); const c = d.color || MOD.venue.c;
  const reach = mem.filter(p => p.userId && p.userId !== S.user?.id).length;
  return `<div class="card dept-card" style="--c:${c}">
    <div class="dept-h">${ibox(d.icon || 'users', c)}<div class="main-col"><b>${esc(T(d.name))}</b><div class="sub">${mem.length} ${T(mem.length === 1 ? 'person' : 'people')}${head ? ` · ${T('Head')}: ${esc(head.name)}` : ''}</div></div>${edit ? `<button class="icon-btn" aria-label="Edit department" onclick="A.deptForm('${d.id}')">${ic('edit')}</button>` : ''}</div>
    ${d.notes ? `<p class="tiny muted dept-note">${esc(d.notes)}</p>` : ''}
    ${mem.length ? `<div class="rows">${mem.map(p => deptMemberRow(d, p)).join('')}</div>` : `<p class="small muted dept-note">${T('No one in this department yet.')}</p>`}
    <div class="dept-f">${edit ? `<button class="btn sm" onclick="A.deptMembers('${d.id}')">${ic('users')} ${T('Add / remove people')}</button>` : ''}${canAlertAll() && reach ? `<button class="btn sm primary" onclick="A.deptAlert('${d.id}')">${ic('bell')} ${T('Alert department')}</button>` : ''}</div></div>`;
}
function deptMemberRow(d, p) {
  const ph = String(p.phone || '').replace(/\D/g, '').slice(-10);
  return `<div class="row dept-row"><div class="avatar">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${d.head === p.key ? `<span class="pill primary">${T('Head')}</span> ` : ''}${esc(T(p.role || ''))}${p.userId ? '' : ` · ${T('no app login')}`}</div></div>
    <div class="row-acts">${canAlertPerson(p) ? `<button class="icon-btn bell-ic" aria-label="Send alert" title="${T('Send alert')}" onclick="A.alertForm('${p.userId}')">${ic('bell')}</button>` : ''}${ph ? `<a class="icon-btn" aria-label="Call" href="tel:${ph}">${ic('phone')}</a><a class="icon-btn wa-ic" aria-label="WhatsApp" href="${esc(waLink('', ph))}" target="_blank" rel="noopener">${ic('wa')}</a>` : ''}${can('venue', 2) ? `<button class="icon-btn" aria-label="Remove from department" title="${T('Remove from department')}" onclick="A.deptRemove('${d.id}','${p.key}')">${ic('x')}</button>` : ''}</div></div>`;
}

A.deptForm = id => {
  const d = id ? deptById(id) : { color: DEPT_COLORS[col('depts').length % DEPT_COLORS.length], icon: 'users', members: [] };
  const people = deptPeople(); const mem = deptMembersOf(d, people);
  const used = new Set(col('depts').map(x => String(x.name).toLowerCase()));
  formModal({ title: id ? 'Edit department' : 'New department', sub: id ? d.name : 'Pick one or write your own name', fields: [
    { type: 'html', full: true, html: `<input type="hidden" name="icon" value="${esc(d.icon || 'users')}">${id ? '' : `<div class="field"><span>${T('Quick pick')}</span><div class="chips">${DEPT_PRESETS.filter(([n]) => !used.has(n.toLowerCase())).map(([n, icn, c]) => `<button type="button" class="chip" onclick="const f=this.form;f.name.value=${esc(JSON.stringify(n))};f.icon.value='${icn}';f.color.value='${c}'">${ic(icn)} ${esc(T(n))}</button>`).join('')}</div></div>`}` },
    { name: 'name', label: 'Department name', required: true, value: d.name || '', placeholder: 'e.g. Housekeeping', full: true },
    { name: 'color', label: 'Colour', type: 'select', value: d.color, options: DEPT_COLORS.map((c, i) => [c, ['Teal', 'Blue', 'Orange', 'Violet', 'Pink', 'Green', 'Amber', 'Purple', 'Red', 'Grey'][i]]) },
    { name: 'head', label: 'Head of department (optional)', type: 'select', value: d.head || '', options: [['', '—'], ...(id ? mem : people).map(p => [p.key, p.name])] },
    { name: 'notes', label: 'Work of this department (optional)', type: 'textarea', value: d.notes || '', full: true, placeholder: 'e.g. Rooms, linen, hall cleaning after every function' }],
    left: id && lvl('venue') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delDept('${id}')">${ic('trash')}</button>` : '',
    submit: id ? 'Save' : 'Next: add people', onSubmit: async v => {
      const name = (v.name || '').trim(); if (!name) throw new Error('Write the department name');
      if (col('depts').some(x => x.id !== id && String(x.name).toLowerCase() === name.toLowerCase())) throw new Error('A department with this name already exists');
      const preset = DEPT_PRESETS.find(([n]) => n.toLowerCase() === name.toLowerCase());
      const rec = { ...(id ? d : { id: uid('dp_'), members: [] }), name, icon: v.icon && v.icon !== 'users' ? v.icon : preset ? preset[1] : d.icon || 'users', color: v.color || d.color, head: v.head || '', notes: (v.notes || '').trim() };
      if (rec.head && !rec.members.includes(rec.head)) rec.members = [...rec.members, rec.head];
      await save('depts', rec, `${id ? 'Updated' : 'Made'} department ${name}`); toast(id ? 'Saved' : 'Department made');
      if (!id) setTimeout(() => A.deptMembers(rec.id), 60); else render();
    } });
};
A.delDept = id => { const d = deptById(id); confirmBox(`${T('Delete')} ${d.name}?`, 'Only the department goes. The people stay in Staff and Team.', 'Delete', async () => { await removeRec('depts', id, `Deleted department ${d.name}`); A.closeModal(); render(); }); };
A.deptMembers = id => {
  const d = deptById(id); if (!d) return; const people = deptPeople(); const on = new Set(d.members || []);
  modal(`<form class="form" onsubmit="A.saveDeptMembers(event,'${id}')" novalidate>${sheetHead(T('Add / remove people'), T(d.name))}<div class="sheet-b stack">
    ${people.length ? `<div class="search">${ic('search')}<input placeholder="${T('Search name')}" oninput="const q=this.value.toLowerCase();this.form.querySelectorAll('.pick-row').forEach(r=>r.hidden=!r.dataset.n.includes(q))"></div>
    <div class="pick-list">${people.map(p => { const other = deptsOfPerson(p.key).filter(x => x.id !== id).map(x => x.name); return `<label class="pick-row" data-n="${esc(String(p.name).toLowerCase())}"><input type="checkbox" name="m" value="${p.key}" data-multi="1" ${on.has(p.key) ? 'checked' : ''}><div class="avatar sm">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${esc(T(p.role || ''))}${p.userId ? '' : ` · ${T('no app login')}`}${other.length ? ` · ${T('also in')} ${other.map(x => esc(T(x))).join(', ')}` : ''}</div></div></label>`; }).join('')}</div>`
    : `<div class="banner warn">${ic('alert')}<span>${T('No people yet. Add crew in Staff or app logins in Team & access, then put them in departments.')}</span></div>`}
    <p class="tiny muted">${T('People with an app login get alerts on their phone. For others use Call or WhatsApp.')}</p>
  </div><footer class="sheet-f">${can('staff', 2) ? `<button type="button" class="btn ghost" onclick="A.closeModal();setTimeout(()=>A.go('staff'),40)">${ic('plus')} ${T('New crew member')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`);
};
A.saveDeptMembers = (e, id) => {
  e.preventDefault(); const d = deptById(id); const keys = [...e.target.querySelectorAll('input[name=m]:checked')].map(x => x.value);
  withBtn(e, async () => { const rec = { ...d, members: keys, head: keys.includes(d.head) ? d.head : '' }; await save('depts', rec, `${d.name}: ${keys.length} people`); A.closeModal(); toast(`${d.name}: ${keys.length} ${T(keys.length === 1 ? 'person' : 'people')}`); render(); });
};
A.deptRemove = (id, key) => {
  const d = deptById(id); const p = deptPeople().find(x => x.key === key);
  confirmBox(`${T('Remove')} ${p?.name || ''}?`, `${T('They will not be in')} ${d.name}. ${T('Nothing else changes.')}`, 'Remove', async () => {
    await save('depts', { ...d, members: (d.members || []).filter(k => k !== key), head: d.head === key ? '' : d.head }, `Removed ${p?.name || 'a person'} from ${d.name}`); toast('Removed'); render(); });
};

/* alert a whole department: one alert per person with an app login (rings on each phone) */
async function sendDeptAlert(d, base) {
  if (!canAlertAll()) throw new Error('Your role cannot alert a department. Ask the owner.');
  const to = deptMembersOf(d).filter(p => p.userId && p.userId !== S.user.id);
  if (!to.length) throw new Error('No one in this department has an app login yet');
  let sent = 0; const out = [];
  for (const p of to) { const a = await AlertsDB.send({ ...base, to_user: p.userId, to_name: `${p.name} · ${d.name}` }); out.push(a); const r = await AlertsDB.push(a.id); sent += +r.sent || 0; }
  S.teamAlerts = [...out, ...(S.teamAlerts || [])]; logAct(`Alert to ${d.name}: ${base.title}`);
  return { people: to.length, sent };
}
A.deptAlert = id => {
  const d = deptById(id); const to = deptMembersOf(d).filter(p => p.userId && p.userId !== S.user.id);
  modal(`<form class="form" onsubmit="A.sendDeptAlertForm(event,'${id}')" novalidate>${sheetHead(T('Alert department'), `${T(d.name)} · ${to.length} ${T(to.length === 1 ? 'person' : 'people')}`)}<div class="sheet-b stack">
    <div class="chips">${to.map(p => `<span class="chip static">${esc(p.name)}</span>`).join('')}</div>
    <div class="field"><span>${T('Quick message')}</span><div class="chips">${quickAlerts().map(q => `<button type="button" class="chip" onclick="this.form.title.value=this.textContent">${esc(q)}</button>`).join('')}</div></div>
    ${fieldHTML({ name: 'title', label: 'Alert', required: true, maxlength: 140, placeholder: 'e.g. Hall 2 cleaning now' })}
    ${fieldHTML({ name: 'body', label: 'Details (optional)', type: 'textarea', maxlength: 600 })}
    <label class="check urgent-check"><input type="checkbox" name="urgent" checked> <span><b>${T('Urgent')}</b>: ${T('keeps ringing until they tap “Seen”')}</span></label>
  </div><footer class="sheet-f"><span class="grow"></span><button type="button" class="btn ghost" onclick="A.closeModal()">${T('Cancel')}</button><button class="btn primary" type="submit">${ic('send')} ${T('Send to department')}</button></footer></form>`);
};
A.sendDeptAlertForm = (e, id) => {
  e.preventDefault(); const v = readForm(e.target); if (!(v.title || '').trim()) { toast('Write the alert', 'bad'); return; }
  withBtn(e, async () => {
    const r = await sendDeptAlert(deptById(id), { title: v.title.trim().slice(0, 140), body: (v.body || '').trim().slice(0, 600) || null, urgent: !!v.urgent, from_name: S.me?.name || S.user.name, event_id: null });
    A.closeModal(); toast(`${T('Alert sent to')} ${r.people} ${T(r.people === 1 ? 'person' : 'people')}${r.sent ? ` · ${T('ringing on')} ${r.sent} ${T(r.sent === 1 ? 'phone' : 'phones')}` : ''}`); render();
  });
};

I18N.load(`
Departments | विभाग
Department | विभाग
New department | नया विभाग
Edit department | विभाग बदलें
Alert one person | एक व्यक्ति को अलर्ट
Not in any department | किसी विभाग में नहीं
Open a department and tap “Add / remove people” to put them in. | विभाग में “लोग जोड़ें / हटाएं” दबाकर इन्हें जोड़ें।
person | व्यक्ति
people | लोग
Head | प्रमुख
No one in this department yet. | इस विभाग में अभी कोई नहीं है।
Add / remove people | लोग जोड़ें / हटाएं
Alert department | विभाग को अलर्ट
no app login | ऐप लॉगिन नहीं
Send alert | अलर्ट भेजें
Remove from department | विभाग से हटाएं
Pick one or write your own name | एक चुनें या अपना नाम लिखें
Quick pick | झट से चुनें
Housekeeping | हाउसकीपिंग
Kitchen | किचन
Service / Waiters | सर्विस / वेटर
Front office | फ्रंट ऑफ़िस
Decor & lights | सजावट और लाइट
Maintenance | मेंटेनेंस
Security | सिक्योरिटी
Sales | सेल्स
Accounts | अकाउंट्स
Parking & valet | पार्किंग और वैले
Department name | विभाग का नाम
e.g. Housekeeping | जैसे हाउसकीपिंग
Colour | रंग
Teal | हरा-नीला
Blue | नीला
Orange | नारंगी
Violet | बैंगनी
Pink | गुलाबी
Green | हरा
Amber | पीला
Purple | जामुनी
Red | लाल
Grey | स्लेटी
Head of department (optional) | विभाग प्रमुख (ज़रूरी नहीं)
Work of this department (optional) | इस विभाग का काम (ज़रूरी नहीं)
e.g. Rooms, linen, hall cleaning after every function | जैसे कमरे, चादर-तौलिए, हर फ़ंक्शन के बाद हॉल की सफ़ाई
Next: add people | आगे: लोग जोड़ें
Write the department name | विभाग का नाम लिखें
A department with this name already exists | इस नाम का विभाग पहले से है
Department made | विभाग बन गया
Only the department goes. The people stay in Staff and Team. | सिर्फ़ विभाग हटेगा। लोग स्टाफ़ और टीम में रहेंगे।
Search name | नाम खोजें
also in | इसमें भी
No people yet. Add crew in Staff or app logins in Team & access, then put them in departments. | अभी कोई व्यक्ति नहीं है। स्टाफ़ में क्रू या टीम और एक्सेस में ऐप लॉगिन जोड़ें, फिर उन्हें विभाग में डालें।
People with an app login get alerts on their phone. For others use Call or WhatsApp. | ऐप लॉगिन वालों के फ़ोन पर अलर्ट आता है। बाकी के लिए कॉल या व्हाट्सऐप करें।
New crew member | नया स्टाफ़
They will not be in | ये अब इसमें नहीं रहेंगे:
Nothing else changes. | बाकी कुछ नहीं बदलेगा।
Removed | हटा दिया
Your role cannot alert a department. Ask the owner. | आपका रोल विभाग को अलर्ट नहीं भेज सकता। मालिक से पूछें।
No one in this department has an app login yet | इस विभाग में अभी किसी के पास ऐप लॉगिन नहीं है
e.g. Hall 2 cleaning now | जैसे हॉल 2 की सफ़ाई अभी करें
Urgent | ज़रूरी
keeps ringing until they tap “Seen” | जब तक वे “देख लिया” न दबाएं, घंटी बजती रहेगी
Send to department | विभाग को भेजें
Alert sent to | अलर्ट भेजा गया:
ringing on | घंटी बज रही है:
phone | फ़ोन
phones | फ़ोन
No departments yet | अभी कोई विभाग नहीं
Make your own departments like Housekeeping, Kitchen or Service, add people to each, and send an alert to a whole department or to one person. | हाउसकीपिंग, किचन या सर्विस जैसे अपने विभाग बनाएं, हर एक में लोग जोड़ें, और पूरे विभाग को या किसी एक व्यक्ति को अलर्ट भेजें।
{} people | {} लोग
{} person | {} व्यक्ति
Department: {} ({}) | विभाग: {1} ({2})
`);
