/* ================= Departments (venue)
   Owner / manager make departments, put people in them, choose a head. The head gets the app (login made by the owner
   or an invite code), gives work to the team, makes checklists (every day, or for one event) and alerts the team.
   Privacy: anyone except owner / manager / Super Admin sees only the departments they are in, and only the work and
   checklists of those departments, plus items another department shared with them (read only).
   The database enforces this (public.dept_ok + restrictive policies, supabase/dept_heads.sql); applyDeptScope mirrors it.
   Collections:
   depts      { id, name, icon, color, head (person key), members: [person key], people: {key: snapshot}, notes, invite }
   tasks      (+ deptId, assigneeUser, date, createdBy, shareWith, archived)
   checklists { id, deptId, deptName, title, kind: daily|event, eventId, items: [{id, text}], assignKey, shareWith: [deptId],
                checks: {<day or 'e'>: {<itemId>: {by, at}}}, createdBy, archived }
   Person key = 's:<staff id>' (crew record; alerts go to its linked app login) or 'u:<user id>' (app login without a crew record). */
const DEPT_PRESETS = [['Housekeeping', 'bed', '#0F766E'], ['Kitchen', 'utensils', '#EA580C'], ['Service / Waiters', 'users', '#2563EB'], ['Front office', 'door', '#7C3AED'],
  ['Decor & lights', 'bulb', '#DB2777'], ['Maintenance', 'wrench', '#64748B'], ['Security', 'shield', '#0F172A'], ['Sales', 'megaphone', '#9333EA'], ['Accounts', 'rupee', '#0B9B68'], ['Parking & valet', 'truck', '#D97706']];
const DEPT_COLORS = ['#0F766E', '#2563EB', '#EA580C', '#7C3AED', '#DB2777', '#0B9B68', '#D97706', '#9333EA', '#E0344B', '#64748B'];
const LIST_TEMPLATES = [
  ['Room cleaning', ['Change bedsheets and pillow covers', 'Clean the bathroom', 'Fresh towels and toiletries', 'Check AC, TV and lights', 'Dust and mop the floor', 'Refill drinking water']],
  ['Hall setup before function', ['Chairs and tables as per layout', 'Stage and backdrop ready', 'Lights and sound tested', 'AC on one hour before', 'Washrooms clean', 'Entry gate decor ready']],
  ['Kitchen closing', ['Gas cylinders off', 'Leftover food stored', 'Utensils washed', 'Floor cleaned', 'Fridge temperature checked', 'Waste taken out']],
  ['Guest arrival', ['Welcome drinks ready', 'Room keys ready', 'Luggage help ready', 'Guest list at reception']],
  ['Security round', ['Main gate checked', 'Parking checked', 'CCTV working', 'Fire extinguishers in place']]];
const deptById = id => col('depts').find(d => d.id === id);
const memberPhone = m => String(m.email || '').endsWith('@' + MOBILE_DOMAIN) ? m.email.split('@')[0] : '';

/* ---------- who am I in the departments ---------- */
const deptAdmin = () => !!S.org && (S.super || ['owner', 'manager'].includes(S.role));
const myKeys = () => ['u:' + (S.user?.id || ''), ...(S.me?.staffId ? ['s:' + S.me.staffId] : [])];
const inDept = d => { const k = myKeys(); return !!d && ((d.members || []).some(x => k.includes(x)) || k.includes(d.head)); };
const isDeptHead = id => { const d = deptById(id); return !!d && (deptAdmin() || myKeys().includes(d.head)); };
const myDepts = () => col('depts').filter(inDept);
const headDepts = () => deptAdmin() ? [] : col('depts').filter(d => myKeys().includes(d.head));
const visibleDepts = () => (deptAdmin() ? col('depts') : myDepts()).slice().sort(by('name'));
function applyDeptScope() {
  if (deptAdmin()) return;
  const mine = new Set(myDepts().map(d => d.id));
  S.data.depts = col('depts').filter(d => mine.has(d.id));
  ['tasks', 'checklists'].forEach(c => { S.data[c] = col(c).filter(x => !x.deptId || mine.has(x.deptId) || (x.shareWith || []).some(id => mine.has(id))); });
}

/* ---------- people ---------- */
function deptPeople() {
  const out = []; const linked = new Set();
  col('staff').forEach(s => { const m = S.members.find(x => x.staffId === s.id && x.userId); if (m) linked.add(m.userId); out.push({ key: 's:' + s.id, name: s.name || '—', phone: s.phone || (m ? memberPhone(m) : ''), role: s.role || (m ? S.roles[m.role]?.label || m.role : ''), userId: m?.userId || '', appRole: m?.role || '' }); });
  S.members.filter(m => m.userId && !linked.has(m.userId)).forEach(m => out.push({ key: 'u:' + m.userId, name: m.name || displayId(m.email), phone: memberPhone(m), role: S.roles[m.role]?.label || m.role, userId: m.userId, appRole: m.role }));
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
/* heads and crew cannot read the Staff list, so a department keeps a small copy of its people's names */
function personFromSnap(d, k) {
  const p = (d.people || {})[k]; const m = k.startsWith('s:') ? S.members.find(x => x.staffId === k.slice(2)) : S.members.find(x => 'u:' + x.userId === k);
  if (!p && !m) return null;
  return { key: k, name: p?.name || m?.name || '—', phone: p?.phone || (m ? memberPhone(m) : ''), role: p?.role || (m ? S.roles[m.role]?.label || m.role : ''), userId: m?.userId || p?.userId || '', appRole: m?.role || p?.appRole || '' };
}
const deptMembersOf = (d, people = deptPeople()) => (d.members || []).map(k => people.find(p => p.key === k) || personFromSnap(d, k)).filter(Boolean);
const deptHeadOf = (d, people = deptPeople()) => d.head ? (people.find(p => p.key === d.head) || personFromSnap(d, d.head)) : null;
function snapPeople(keys, people = deptPeople()) { const o = {}; keys.forEach(k => { const p = people.find(x => x.key === k); if (p) o[k] = { name: p.name, phone: p.phone || '', role: p.role || '', userId: p.userId || '', appRole: p.appRole || '' }; }); return o; }
const deptsOfPerson = key => col('depts').filter(d => (d.members || []).includes(key));
/* who can get a personal alert from me: anyone (tasks Edit+) or only seniors */
const canAlertPerson = p => !!p.userId && p.userId !== S.user?.id && canSendAlert() && (canAlertAll() || ROLE_GROUPS.managers.includes(p.appRole));

/* ---------- Venue → Departments tab ---------- */
function deptsTab() {
  const list = visibleDepts(); const admin = deptAdmin() && can('venue', 2); const people = deptPeople();
  if (deptAdmin()) deptInviteSync();
  const add = admin ? `<button class="btn primary" onclick="A.deptForm()">${ic('plus')} ${T('New department')}</button>` : '';
  if (!list.length) return `<div class="card">${deptAdmin() ? empty('No departments yet', 'Make your own departments like Housekeeping, Kitchen or Service, add people to each, and send an alert to a whole department or to one person.', add, 'users', MOD.venue.c) : empty('You are not in a department yet', 'The owner can add you to a department.', '', 'users', MOD.venue.c)}</div>`;
  const loose = deptAdmin() ? people.filter(p => !list.some(d => (d.members || []).includes(p.key))) : [];
  return `${admin || canAlertAll() ? `<div class="row-flex" style="gap:8px;margin-bottom:12px">${add}${canAlertAll() && deptAdmin() ? `<button class="btn" onclick="A.alertForm()">${ic('bell')} ${T('Alert one person')}</button>` : ''}</div>` : ''}
  ${deptAdmin() ? '' : `<div class="banner" style="margin-bottom:12px">${ic('shield')}<span>${T('You see only your own department. Other departments cannot see your work.')}</span></div>`}
  <div class="grid g-auto dept-grid">${list.map(d => deptCard(d, people)).join('')}</div>
  ${loose.length ? `<div class="card pad" style="margin-top:14px"><b class="small">${T('Not in any department')} (${loose.length})</b><div class="chips" style="margin-top:8px">${loose.map(p => `<span class="chip static">${esc(p.name)}</span>`).join('')}</div>${admin ? `<p class="tiny muted" style="margin-top:8px">${T('Open a department and tap “Add / remove people” to put them in.')}</p>` : ''}</div>` : ''}`;
}
function deptCard(d, people) {
  const mem = deptMembersOf(d, people); const head = deptHeadOf(d, people); const admin = deptAdmin() && can('venue', 2); const c = d.color || MOD.venue.c;
  const reach = mem.filter(p => p.userId && p.userId !== S.user?.id).length;
  const open = col('tasks').filter(t => t.deptId === d.id && (t.progress || 0) < 100).length; const lists = col('checklists').filter(x => x.deptId === d.id).length;
  const headApp = deptAdmin() && can('team', 2) && head ? (head.userId ? (head.appRole === 'head' ? `<span class="pill good">${ic('check')} ${T('Head has the app')}</span>` : `<button class="btn sm ghost" onclick="A.deptHeadApp('${d.id}')">${ic('key')} ${T('Make head in the app')}</button>`) : d.invite && !d.invite.done ? `<button class="btn sm ghost" onclick="A.deptHeadApp('${d.id}')">${ic('clock')} ${T('Invite sent')} · ${esc(d.invite.code)}</button>` : `<button class="btn sm ghost" onclick="A.deptHeadApp('${d.id}')">${ic('key')} ${T('Give app to head')}</button>`) : '';
  return `<div class="card dept-card" style="--c:${c}">
    <div class="dept-h">${ibox(d.icon || 'users', c)}<button class="main-col linkish" onclick="A.go('dept',{id:'${d.id}'})"><b>${esc(T(d.name))}</b><div class="sub">${mem.length} ${T(mem.length === 1 ? 'person' : 'people')}${head ? ` · ${T('Head')}: ${esc(head.name)}` : ''}</div></button>${admin ? `<button class="icon-btn" aria-label="Edit department" onclick="A.deptForm('${d.id}')">${ic('edit')}</button>` : ''}</div>
    ${d.notes ? `<p class="tiny muted dept-note">${esc(d.notes)}</p>` : ''}
    <button class="dept-stats" onclick="A.go('dept',{id:'${d.id}'})"><span><b>${open}</b> ${T('work open')}</span><span><b>${lists}</b> ${T('checklists')}</span><span class="go">${T('Open')} ${ic('chev')}</span></button>
    ${mem.length ? `<div class="rows">${mem.map(p => deptMemberRow(d, p)).join('')}</div>` : `<p class="small muted dept-note">${T('No one in this department yet.')}</p>`}
    <div class="dept-f">${admin ? `<button class="btn sm" onclick="A.deptMembers('${d.id}')">${ic('users')} ${T('Add / remove people')}</button>` : ''}${canAlertAll() && reach && isDeptHead(d.id) ? `<button class="btn sm primary" onclick="A.deptAlert('${d.id}')">${ic('bell')} ${T('Alert department')}</button>` : ''}${headApp}</div></div>`;
}
function deptMemberRow(d, p) {
  const ph = String(p.phone || '').replace(/\D/g, '').slice(-10);
  return `<div class="row dept-row"><div class="avatar">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${d.head === p.key ? `<span class="pill primary">${T('Head')}</span> ` : ''}${esc(T(p.role || ''))}${p.userId ? '' : ` · ${T('no app login')}`}</div></div>
    <div class="row-acts">${canAlertPerson(p) ? `<button class="icon-btn bell-ic" aria-label="Send alert" title="${T('Send alert')}" onclick="A.alertForm('${p.userId}')">${ic('bell')}</button>` : ''}${ph ? `<a class="icon-btn" aria-label="Call" href="tel:${ph}">${ic('phone')}</a><a class="icon-btn wa-ic" aria-label="WhatsApp" href="${esc(waLink('', ph))}" target="_blank" rel="noopener">${ic('wa')}</a>` : ''}${deptAdmin() && can('venue', 2) ? `<button class="icon-btn" aria-label="Remove from department" title="${T('Remove from department')}" onclick="A.deptRemove('${d.id}','${p.key}')">${ic('x')}</button>` : ''}</div></div>`;
}

/* ---------- owner: make / edit departments and their people ---------- */
A.deptForm = id => {
  if (!deptAdmin()) { toast('Only the owner or a manager can change departments', 'bad'); return; }
  const d = id ? deptById(id) : { color: DEPT_COLORS[col('depts').length % DEPT_COLORS.length], icon: 'users', members: [] };
  const people = deptPeople(); const mem = deptMembersOf(d, people);
  const used = new Set(col('depts').map(x => String(x.name).toLowerCase()));
  formModal({ title: id ? 'Edit department' : 'New department', sub: id ? d.name : 'Pick one or write your own name', fields: [
    { type: 'html', full: true, html: `<input type="hidden" name="icon" value="${esc(d.icon || 'users')}">${id ? '' : `<div class="field"><span>${T('Quick pick')}</span><div class="chips">${DEPT_PRESETS.filter(([n]) => !used.has(n.toLowerCase())).map(([n, icn, c]) => `<button type="button" class="chip" onclick="const f=this.form;f.name.value=${esc(JSON.stringify(n))};f.icon.value='${icn}';f.color.value='${c}'">${ic(icn)} ${esc(T(n))}</button>`).join('')}</div></div>`}` },
    { name: 'name', label: 'Department name', required: true, value: d.name || '', placeholder: 'e.g. Housekeeping', full: true },
    { name: 'color', label: 'Colour', type: 'select', value: d.color, options: DEPT_COLORS.map((c, i) => [c, ['Teal', 'Blue', 'Orange', 'Violet', 'Pink', 'Green', 'Amber', 'Purple', 'Red', 'Grey'][i]]) },
    { name: 'head', label: 'Head of department (optional)', type: 'select', value: d.head || '', options: [['', '—'], ...(id && mem.length ? mem : people).map(p => [p.key, p.name])] },
    { name: 'notes', label: 'Work of this department (optional)', type: 'textarea', value: d.notes || '', full: true, placeholder: 'e.g. Rooms, linen, hall cleaning after every function' }],
    left: id && lvl('venue') >= 3 ? `<button type="button" class="btn ghost danger" onclick="A.delDept('${id}')">${ic('trash')}</button>` : '',
    submit: id ? 'Save' : 'Next: add people', onSubmit: async v => {
      const name = (v.name || '').trim(); if (!name) throw new Error('Write the department name');
      if (col('depts').some(x => x.id !== id && String(x.name).toLowerCase() === name.toLowerCase())) throw new Error('A department with this name already exists');
      const preset = DEPT_PRESETS.find(([n]) => n.toLowerCase() === name.toLowerCase());
      const rec = { ...(id ? d : { id: uid('dp_'), members: [] }), name, icon: v.icon && v.icon !== 'users' ? v.icon : preset ? preset[1] : d.icon || 'users', color: v.color || d.color, head: v.head || '', notes: (v.notes || '').trim() };
      if (rec.head && !rec.members.includes(rec.head)) rec.members = [...rec.members, rec.head];
      rec.people = snapPeople(rec.members, people);
      await save('depts', rec, `${id ? 'Updated' : 'Made'} department ${name}`); toast(id ? 'Saved' : 'Department made');
      if (!id) setTimeout(() => A.deptMembers(rec.id), 60); else render();
    } });
};
A.delDept = id => { const d = deptById(id); confirmBox(`${T('Delete')} ${d.name}?`, 'Only the department goes. The people stay in Staff and Team.', 'Delete', async () => { await removeRec('depts', id, `Deleted department ${d.name}`); A.closeModal(); if (S.view === 'dept') A.go('venue', { tab: 'depts' }); else render(); }); };
A.deptMembers = id => {
  const d = deptById(id); if (!d || !deptAdmin()) return; const people = deptPeople(); const on = new Set(d.members || []);
  modal(`<form class="form" onsubmit="A.saveDeptMembers(event,'${id}')" novalidate>${sheetHead(T('Add / remove people'), T(d.name))}<div class="sheet-b stack">
    ${people.length ? `<div class="search">${ic('search')}<input placeholder="${T('Search name')}" oninput="const q=this.value.toLowerCase();this.form.querySelectorAll('.pick-row').forEach(r=>r.hidden=!r.dataset.n.includes(q))"></div>
    <div class="pick-list">${people.map(p => { const other = deptsOfPerson(p.key).filter(x => x.id !== id).map(x => x.name); return `<label class="pick-row" data-n="${esc(String(p.name).toLowerCase())}"><input type="checkbox" name="m" value="${p.key}" data-multi="1" ${on.has(p.key) ? 'checked' : ''}><div class="avatar sm">${esc(initials(p.name))}</div><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${esc(T(p.role || ''))}${p.userId ? '' : ` · ${T('no app login')}`}${other.length ? ` · ${T('also in')} ${other.map(x => esc(T(x))).join(', ')}` : ''}</div></div></label>`; }).join('')}</div>`
    : `<div class="banner warn">${ic('alert')}<span>${T('No people yet. Add crew in Staff or app logins in Team & access, then put them in departments.')}</span></div>`}
    <p class="tiny muted">${T('People with an app login get alerts on their phone. For others use Call or WhatsApp.')}</p>
  </div><footer class="sheet-f">${can('staff', 2) ? `<button type="button" class="btn ghost" onclick="A.closeModal();setTimeout(()=>A.go('staff'),40)">${ic('plus')} ${T('New crew member')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`);
};
A.saveDeptMembers = (e, id) => {
  e.preventDefault(); const d = deptById(id); const keys = [...e.target.querySelectorAll('input[name=m]:checked')].map(x => x.value);
  withBtn(e, async () => { const rec = { ...d, members: keys, head: keys.includes(d.head) ? d.head : '', people: snapPeople(keys) }; await save('depts', rec, `${d.name}: ${keys.length} people`); A.closeModal(); toast(`${d.name}: ${keys.length} ${T(keys.length === 1 ? 'person' : 'people')}`); render(); });
};
A.deptRemove = (id, key) => {
  const d = deptById(id); const p = deptMembersOf(d).find(x => x.key === key);
  confirmBox(`${T('Remove')} ${p?.name || ''}?`, `${T('They will not be in')} ${d.name}. ${T('Nothing else changes.')}`, 'Remove', async () => {
    const members = (d.members || []).filter(k => k !== key);
    await save('depts', { ...d, members, head: d.head === key ? '' : d.head, people: snapPeople(members) }, `Removed ${p?.name || 'a person'} from ${d.name}`); toast('Removed'); render(); });
};

/* ---------- owner: give the app to the head ---------- */
A.deptHeadApp = id => {
  const d = deptById(id); const head = deptHeadOf(d);
  if (!head) { toast('Choose the head of this department first', 'warn'); A.deptForm(id); return; }
  const P = S.platform || DEFAULT_PLATFORM; const app = `${location.origin}/download`;
  if (head.userId) {
    const m = S.members.find(x => x.userId === head.userId);
    confirmBox(`${T('Make')} ${head.name} ${T('the head in the app?')}`, T('Their login becomes “Department Head”: they see only this department, give work to its people and make checklists.'), 'Make head', async () => {
      await S.adapter.updateMember(S.org.orgId, head.userId, { role: 'head' }); if (m) m.role = 'head'; logAct(`${head.name} is now Department Head of ${d.name}`); toast('Done'); render(); }, 'primary');
    return;
  }
  const ph = String(head.phone || '').replace(/\D/g, '').slice(-10);
  const inv = d.invite && !d.invite.done ? d.invite : null;
  const invMsg = code => `Namaste ${head.name}, you are the head of ${d.name} at ${settings().bizName || S.org.name}.\n\nOpen this link and make your login (your mobile + a password):\n${location.origin}/app#join-${code}\n\nInvite code: ${code}\nAndroid app: ${app}\n\nThen you can give work to your team and make checklists.`;
  modal(`${sheetHead(T('Give app to head'), `${head.name} · ${T(d.name)}`)}<div class="sheet-b stack">
    <p class="small">${T('The head sees only this department, gives work to its people, makes checklists and alerts the team.')}</p>
    ${inv ? `<div class="card pad stack-sm"><b>${T('Invite code')}: <span class="mono" translate="no">${esc(inv.code)}</span></b><div class="tiny muted">${T('When they join with this code, they become the head here automatically.')}</div>${waBtn(invMsg(inv.code), ph, T('Send again on WhatsApp'), 'btn wa block')}</div>` : ''}
    <div class="card pad stack-sm"><b>${ic('send')} ${T('Send an invite code')}</b><div class="tiny muted">${T('They download the app, sign up with their own mobile and password, and type the code.')}</div><button class="btn block" onclick="A.deptInvite('${id}')">${ic('send')} ${T(inv ? 'Make a new code' : 'Make invite code')}</button></div>
    <div class="card pad stack-sm"><b>${ic('key')} ${T('Or make their login now')}</b><div class="tiny muted">${T('You set the mobile and password and tell them.')}</div><button class="btn block" onclick="A.deptHeadLogin('${id}')">${ic('user')} ${T('Make login')}</button></div>
  </div>`);
};
A.deptInvite = async id => {
  const d = deptById(id); const head = deptHeadOf(d);
  try {
    const code = await S.adapter.createInvite(S.org.orgId, 'head', head.name);
    await save('depts', { ...d, invite: { code, key: d.head, at: Date.now() } }, `Invite code for head of ${d.name}`);
    A.deptHeadApp(id);
  } catch (e) { toast(e.message, 'bad'); }
};
A.deptHeadLogin = id => {
  const d = deptById(id); const head = deptHeadOf(d);
  formModal({ title: 'Make login for the head', sub: `${head.name} · ${d.name}`, fields: [
    { name: 'mobile', label: 'Their mobile number (login ID)', type: 'tel', required: true, value: String(head.phone || '').replace(/\D/g, '').slice(-10), full: true },
    { name: 'password', label: 'Password (at least 6 letters)', type: 'text', required: true, full: true, placeholder: 'e.g. head1234' }],
    submit: 'Make login', onSubmit: async v => {
      const mob = String(v.mobile || '').replace(/\D/g, '').slice(-10); if (mob.length !== 10) throw new Error('Write a 10-digit mobile number');
      if (String(v.password || '').length < 6) throw new Error('Password must be at least 6 letters');
      const m = await S.adapter.createMember(S.org.orgId, { name: head.name, email: loginId(mob), password: v.password, role: 'head', staffId: head.key.startsWith('s:') ? head.key.slice(2) : '' });
      S.members.push(m); if (!head.key.startsWith('s:')) await save('depts', { ...d, head: 'u:' + m.userId, members: [...new Set([...(d.members || []).filter(k => k !== head.key), 'u:' + m.userId])] });
      await save('depts', { ...deptById(id), people: snapPeople(deptById(id).members) });
      logAct(`Made app login for ${head.name} (Department Head, ${d.name})`); toast('Login made. Tell them their mobile and password.'); render();
    } });
};
/* when the head joins with the invite code, link their login to this department (owner's app does it) */
async function deptInviteSync() {
  if (S._invSync && Date.now() - S._invSync < 60000) return; S._invSync = Date.now();
  for (const d of col('depts').filter(x => x.invite && !x.invite.done)) {
    try {
      const uid_ = await S.adapter.inviteUsedBy(d.invite.code); if (!uid_) continue;
      const key = d.invite.key || d.head; let rec = { ...d, invite: { ...d.invite, done: true, userId: uid_ } };
      if (key && key.startsWith('s:')) { await S.adapter.updateMember(S.org.orgId, uid_, { staffId: key.slice(2) }); }
      else { rec.head = 'u:' + uid_; rec.members = [...new Set([...(d.members || []).filter(k => k !== key), 'u:' + uid_])]; }
      const { members } = await S.adapter.loadOrg(S.org.orgId); S.members = members; rec.people = snapPeople(rec.members);
      await save('depts', rec, `Head of ${d.name} joined the app`); render();
    } catch (e) { }
  }
}

/* ---------- alert a whole department: one alert per person with an app login ---------- */
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
/* a quiet ping to one person (new work, checklist done) */
async function deptPing(userId, title, body, ring) {
  if (!userId || userId === S.user?.id) return;
  try { const a = await AlertsDB.send({ kind: ring ? 'alert' : 'update', title: title.slice(0, 140), body: body ? String(body).slice(0, 600) : null, urgent: false, to_user: userId, from_name: S.me?.name || S.user.name }); await AlertsDB.push(a.id); } catch (e) { }
}

/* ---------- one department: work, checklists, team ---------- */
const listKey = c => c.kind === 'event' ? 'e' : todayLocal();
const listDone = c => Object.keys((c.checks || {})[listKey(c)] || {}).filter(k => (c.items || []).some(i => i.id === k)).length;
const personName = (d, key) => key ? (deptMembersOf(d).find(p => p.key === key)?.name || '') : '';
const taskPersonKey = t => t.assignee ? 's:' + t.assignee : t.assigneeUser ? 'u:' + t.assigneeUser : '';
const upcomingEvents = () => col('events').filter(e => !['Cancelled', 'Closed'].includes(e.stage) && eventEnd(e) >= addDays(todayLocal(), -1) && e.date <= addDays(todayLocal(), 90)).sort(by('date'));
V.dept = () => {
  const d = deptById(S.params.id);
  if (!d) return pageHead('Department', '', '', "A.go('venue',{tab:'depts'})") + `<div class="card">${empty('This department is not open for you', 'You see only the departments you are in.', '', 'shield', '#94A3B8')}</div>`;
  const head = isDeptHead(d.id); const tab = S.params.tab || 'work'; const mem = deptMembersOf(d); const hd = deptHeadOf(d); const c = d.color || MOD.venue.c;
  const work = col('tasks').filter(t => t.deptId === d.id); const lists = col('checklists').filter(x => x.deptId === d.id);
  const shared = [...col('checklists'), ...col('tasks')].filter(x => x.deptId && x.deptId !== d.id && (x.shareWith || []).includes(d.id));
  const openW = work.filter(t => (t.progress || 0) < 100);
  const tabs = [['work', 'Work', openW.length], ['lists', 'Checklists', lists.length], ['team', 'Team', mem.length], ...(shared.length ? [['shared', 'Shared with us', shared.length]] : [])];
  const acts = head ? `<button class="btn primary" onclick="A.deptTaskForm('${d.id}')">${ic('plus')} ${T('Give work')}</button><button class="btn" onclick="A.checklistForm('${d.id}')">${ic('check')} ${T('New checklist')}</button>${canAlertAll() && mem.some(p => p.userId && p.userId !== S.user.id) ? `<button class="btn" onclick="A.deptAlert('${d.id}')">${ic('bell')} ${T('Alert team')}</button>` : ''}` : '';
  return pageHead(T(d.name), `${mem.length} ${T(mem.length === 1 ? 'person' : 'people')}${hd ? ` · ${T('Head')}: ${hd.name}` : ''}`, acts, deptAdmin() || can('venue') ? "A.go('venue',{tab:'depts'})" : "A.go('dashboard')", [d.icon || 'users', c]) +
    `<div class="dept-band" style="--c:${c}">${ibox(d.icon || 'users', c)}<span>${d.notes ? esc(d.notes) : T(head ? 'Give work to your team and make checklists. Only this department sees them.' : 'Your work and checklists from this department.')}</span></div>
    <div class="tabs">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${T(l)}${n ? ` <span class="tabn">${n}</span>` : ''}</button>`).join('')}${tabHelp('dp-' + tab)}</div>` +
    (tab === 'lists' ? deptListsTab(d, lists, head) : tab === 'team' ? `<div class="card"><div class="rows">${mem.map(p => deptMemberRow(d, p)).join('') || `<p class="small muted dept-note">${T('No one in this department yet.')}</p>`}</div></div>` : tab === 'shared' ? deptSharedTab(shared) : deptWorkTab(d, work, head));
};
function deptWorkTab(d, work, head) {
  const t = todayLocal(); const open = work.filter(x => (x.progress || 0) < 100).sort((a, b) => String(a.date || '9').localeCompare(String(b.date || '9')));
  const done = work.filter(x => (x.progress || 0) >= 100).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 15);
  if (!work.length) return `<div class="card">${empty('No work given yet', head ? 'Tap “Give work”, pick a person, the work and the day. It shows on their phone.' : 'Work given to you shows here.', head ? `<button class="btn primary" onclick="A.deptTaskForm('${d.id}')">${ic('plus')} ${T('Give work')}</button>` : '', 'pulse', MOD.tasks.c)}</div>`;
  return `<div class="stack-sm">${open.map(x => deptTaskCard(d, x, head, t)).join('')}</div>
    ${done.length ? `<div class="sec-h"><h2>${T('Done')}</h2></div><div class="stack-sm">${done.map(x => deptTaskCard(d, x, head, t)).join('')}</div>` : ''}`;
}
function deptTaskCard(d, x, head, t = todayLocal()) {
  const who = personName(d, taskPersonKey(x)); const e = x.eventId ? evById(x.eventId) : null; const p = +x.progress || 0; const late = p < 100 && x.date && x.date < t;
  const mine = (x.assigneeUser && x.assigneeUser === S.user?.id) || (S.me?.staffId && x.assignee === S.me.staffId);
  return `<div class="card pad dtask ${p >= 100 ? 'done' : ''}"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start;gap:10px"><div class="main-col" style="min-width:0;flex:1"><b>${esc(x.title)}</b>
    <div class="small muted">${who ? `${ic('user')} ${esc(who)}` : T('Not given to anyone')}${x.date ? ` · ${T(x.date === t ? 'Today' : x.date === addDays(t, 1) ? 'Tomorrow' : '') || T(fmtShort(x.date))}` : ''}${e ? ` · ${esc(e.title)}` : ''}</div>${x.note ? `<div class="tiny muted">${esc(x.note)}</div>` : ''}${(x.shareWith || []).length ? `<div class="tiny muted">${ic('share')} ${T('Shared with')} ${(x.shareWith || []).length} ${T('department(s)')}</div>` : ''}</div>
    ${pill(p >= 100 ? T('Done') : late ? T('Late') : p + '%', p >= 100 ? 'good' : late ? 'bad' : '')}${head ? `<button class="icon-btn" aria-label="Edit work" onclick="A.deptTaskForm('${d.id}','${x.id}')">${ic('edit')}</button>` : ''}</div>
    ${mine && p < 100 ? `<div class="pct-btns">${[25, 50, 75].map(v => `<button class="${p >= v ? 'on' : ''}" onclick="A.crewProg('${x.id}',${v})">${v}%</button>`).join('')}<button class="done" onclick="A.crewProg('${x.id}',100)">${ic('check')} ${T('Done')}</button></div>` : ''}</div>`;
}
function deptListsTab(d, lists, head) {
  if (!lists.length) return `<div class="card">${empty('No checklists yet', head ? 'Make a checklist for every day (like room cleaning) or for one event (like hall setup for a wedding).' : 'Checklists from your head show here.', head ? `<button class="btn primary" onclick="A.checklistForm('${d.id}')">${ic('plus')} ${T('New checklist')}</button>` : '', 'check', MOD.tasks.c)}</div>`;
  const daily = lists.filter(x => x.kind !== 'event'); const ev = lists.filter(x => x.kind === 'event').sort((a, b) => String(evById(a.eventId)?.date || '').localeCompare(String(evById(b.eventId)?.date || '')));
  return `${daily.length ? `<div class="sec-h"><h2>${T('Every day')}</h2></div><div class="card"><div class="rows">${daily.map(x => checklistRow(x)).join('')}</div></div>` : ''}
    ${ev.length ? `<div class="sec-h"><h2>${T('For events')}</h2></div><div class="card"><div class="rows">${ev.map(x => checklistRow(x)).join('')}</div></div>` : ''}`;
}
function checklistRow(x, showDept) {
  const n = (x.items || []).length; const dn = listDone(x); const e = x.eventId ? evById(x.eventId) : null; const full = n && dn >= n;
  return `<button class="row click" onclick="A.checklistOpen('${x.id}')">${ibox(full ? 'check' : 'file', full ? '#0B9B68' : MOD.tasks.c, 'sm')}<div class="main-col"><b>${esc(x.title)}</b><div class="sub">${showDept ? `${T('Shared by')} ${esc(T(x.deptName || ''))} · ` : ''}${x.kind === 'event' ? (e ? `${esc(e.title)} · ${T(fmtShort(e.date))}` : T('Event')) : T('Every day')}${x.assignKey && deptById(x.deptId) ? ` · ${esc(personName(deptById(x.deptId), x.assignKey))}` : ''}</div></div><span class="list-prog ${full ? 'full' : ''}"><b>${dn}/${n}</b><i style="--p:${n ? Math.round(dn / n * 100) : 0}%"></i></span></button>`;
}
function deptSharedTab(items) {
  return `<div class="banner" style="margin-bottom:12px">${ic('eye')}<span>${T('Another department shared these with you. You can see them but not change them.')}</span></div>
    <div class="card"><div class="rows">${items.map(x => x.items ? checklistRow(x, true) : `<div class="row">${ibox('pulse', MOD.tasks.c, 'sm')}<div class="main-col"><b>${esc(x.title)}</b><div class="sub">${T('Shared by')} ${esc(T(x.deptName || ''))}${x.date ? ' · ' + T(fmtShort(x.date)) : ''}</div></div>${pill((+x.progress || 0) >= 100 ? T('Done') : (+x.progress || 0) + '%', (+x.progress || 0) >= 100 ? 'good' : '')}</div>`).join('')}</div></div>`;
}

/* share with other departments: the head cannot read other departments, so names come from public.dept_names */
async function loadDeptNames() {
  if (deptAdmin()) return col('depts').map(d => ({ id: d.id, name: d.name }));
  if (S.deptNames && S.deptNamesAt > Date.now() - 120000) return S.deptNames;
  try { S.deptNames = await S.adapter.deptNames(S.org.orgId); S.deptNamesAt = Date.now(); } catch (e) { S.deptNames = []; }
  return S.deptNames;
}
async function fillShareBox(deptId, chosen) {
  const box = document.getElementById('shareBox'); if (!box) return;
  const list = (await loadDeptNames()).filter(x => x.id !== deptId);
  box.innerHTML = list.length ? `<div class="chips">${list.map(x => `<label class="chip-check"><input type="checkbox" name="share" value="${esc(x.id)}" data-multi="1" ${(chosen || []).includes(x.id) ? 'checked' : ''}><span>${esc(T(x.name))}</span></label>`).join('')}</div>` : `<span class="tiny muted">${T('No other department yet.')}</span>`;
}
const shareField = () => `<div class="field full"><span>${T('Let other departments see this (optional)')}</span><div id="shareBox"><span class="tiny muted">${T('Loading…')}</span></div><small>${T('They can only see it, not change it. Nothing else of your department is shown to them.')}</small></div>`;
const shareVals = form => [...form.querySelectorAll('input[name=share]:checked')].map(x => x.value);

/* ---------- give work ---------- */
A.deptTaskForm = (deptId, id) => {
  const d = deptById(deptId); if (!d || !isDeptHead(deptId)) { toast('Only the head of this department can give work', 'bad'); return; }
  const x = id ? getById('tasks', id) : { date: todayLocal(), progress: 0 }; const mem = deptMembersOf(d); const evs = upcomingEvents();
  modal(`<form class="form" onsubmit="A.saveDeptTask(event,'${deptId}','${id || ''}')" novalidate>${sheetHead(T(id ? 'Edit work' : 'Give work'), T(d.name))}<div class="sheet-b stack">
    ${fieldHTML({ name: 'title', label: 'What work', required: true, value: x.title || '', placeholder: 'e.g. Clean rooms 101 to 108', autofocus: !id })}
    <div class="field"><span>${T('Who will do it')}</span><div class="chips">${mem.map(p => `<label class="chip-radio"><input type="radio" name="who" value="${p.key}" ${taskPersonKey(x) === p.key ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('') || `<span class="tiny muted">${T('No one in this department yet.')}</span>`}</div></div>
    <div class="grid2" style="padding:0">${fieldHTML({ name: 'date', label: 'Day', type: 'date', value: x.date || '' })}${fieldHTML({ name: 'event', label: 'For event (optional)', type: 'select', value: x.eventId || '', options: [['', '—'], ...evs.map(e => [e.id, `${e.title} (${T(fmtShort(e.date))})`])] })}</div>
    ${fieldHTML({ name: 'note', label: 'Details (optional)', type: 'textarea', rows: 2, value: x.note || '' })}
    ${shareField()}
    ${id ? '' : `<label class="check"><input type="checkbox" name="ping" checked> <span>${T('Tell them on the phone')}</span></label>`}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.archiveDeptItem('tasks','${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T(id ? 'Save' : 'Give work')}</button></footer></form>`);
  fillShareBox(deptId, x.shareWith);
};
A.saveDeptTask = (e, deptId, id) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const d = deptById(deptId);
  withBtn(e, async () => {
    if (!(v.title || '').trim()) throw new Error('Write the work');
    const who = f.querySelector('input[name=who]:checked')?.value || ''; const p = who ? deptMembersOf(d).find(x => x.key === who) : null;
    const base = id ? getById('tasks', id) : { id: uid('t_'), progress: 0, createdBy: S.me?.name || S.user.name, created: Date.now() };
    const rec = { ...base, deptId, deptName: d.name, title: v.title.trim().slice(0, 160), assignee: who.startsWith('s:') ? who.slice(2) : '', assigneeUser: p?.userId || '', date: v.date || '', eventId: v.event || '', note: (v.note || '').trim(), shareWith: shareVals(f) };
    await save('tasks', rec, `${id ? 'Updated' : 'Gave'} work: ${rec.title}${p ? ' → ' + p.name : ''}`); A.closeModal(); toast(id ? 'Saved' : 'Work given'); render();
    if (!id && v.ping && p?.userId) deptPing(p.userId, `${T('New work')}: ${rec.title}`, [T(d.name), rec.date ? T(fmtShort(rec.date)) : ''].filter(Boolean).join(' · '), true);
  });
};
/* the head cannot delete (only owner / manager can), so removed work and checklists are archived */
A.archiveDeptItem = (coll, id) => confirmBox('Remove this?', 'It will not show anywhere any more.', 'Remove', async () => {
  const x = getById(coll, id); if (!x) return;
  if (lvl('tasks') >= 3) await removeRec(coll, id, `Removed ${x.title}`);
  else { await save(coll, { ...x, archived: true }, `Removed ${x.title}`); S.data[coll] = col(coll).filter(y => y.id !== id); }
  A.closeModal(); toast('Removed'); render();
});

/* ---------- checklists ---------- */
A.checklistForm = (deptId, id) => {
  const d = deptById(deptId); if (!d || !isDeptHead(deptId)) { toast('Only the head of this department can make checklists', 'bad'); return; }
  const x = id ? getById('checklists', id) : { kind: 'daily', items: [] }; const mem = deptMembersOf(d); const evs = upcomingEvents();
  modal(`<form class="form" onsubmit="A.saveChecklist(event,'${deptId}','${id || ''}')" novalidate>${sheetHead(T(id ? 'Edit checklist' : 'New checklist'), T(d.name))}<div class="sheet-b stack">
    ${id ? '' : `<div class="field"><span>${T('Start from')}</span><div class="chips">${LIST_TEMPLATES.map(([n, items], i) => `<button type="button" class="chip" onclick="const f=this.form;f.title.value=${esc(JSON.stringify(T(n)))};f.items.value=${esc(JSON.stringify(items.map(t => T(t)).join('\n')))}">${esc(T(n))}</button>`).join('')}</div></div>`}
    ${fieldHTML({ name: 'title', label: 'Checklist name', required: true, value: x.title || '', placeholder: 'e.g. Room cleaning' })}
    <div class="field"><span>${T('When')}</span><div class="chips"><label class="chip-radio"><input type="radio" name="kind" value="daily" ${x.kind !== 'event' ? 'checked' : ''} onchange="this.form.querySelector('.ev-pick').hidden=true"><span>${ic('clock')} ${T('Every day (always)')}</span></label><label class="chip-radio"><input type="radio" name="kind" value="event" ${x.kind === 'event' ? 'checked' : ''} onchange="this.form.querySelector('.ev-pick').hidden=false"><span>${ic('calendar')} ${T('For one event')}</span></label></div><small>${T('Every day: ticks start fresh each morning. For one event: tick once for that event.')}</small></div>
    <div class="ev-pick" ${x.kind === 'event' ? '' : 'hidden'}>${fieldHTML({ name: 'event', label: 'Which event', type: 'select', value: x.eventId || '', options: [['', '—'], ...evs.map(e => [e.id, `${e.title} (${T(fmtShort(e.date))})`])] })}</div>
    ${fieldHTML({ name: 'items', label: 'Points to check (one per line)', type: 'textarea', rows: 7, value: (x.items || []).map(i => i.text).join('\n'), placeholder: 'Change bedsheets\nClean the bathroom\nFresh towels' })}
    ${fieldHTML({ name: 'assign', label: 'Who fills it (optional)', type: 'select', value: x.assignKey || '', options: [['', T('Anyone in the department')], ...mem.map(p => [p.key, p.name])] })}
    ${shareField()}
  </div><footer class="sheet-f">${id ? `<button type="button" class="btn ghost danger" onclick="A.archiveDeptItem('checklists','${id}')">${ic('trash')}</button>` : ''}<span class="grow"></span><button class="btn primary" type="submit">${ic('check')} ${T('Save')}</button></footer></form>`, { wide: true });
  fillShareBox(deptId, x.shareWith);
};
A.saveChecklist = (e, deptId, id) => {
  e.preventDefault(); const f = e.target; const v = readForm(f); const d = deptById(deptId);
  withBtn(e, async () => {
    const title = (v.title || '').trim(); if (!title) throw new Error('Write the checklist name');
    const kind = f.querySelector('input[name=kind]:checked')?.value === 'event' ? 'event' : 'daily';
    if (kind === 'event' && !v.event) throw new Error('Pick the event');
    const base = id ? getById('checklists', id) : { id: uid('cl_'), checks: {}, createdBy: S.me?.name || S.user.name, created: Date.now() };
    const old = base.items || [];
    const items = String(v.items || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60).map(text => old.find(i => i.text === text) || { id: uid('ci_'), text: text.slice(0, 160) });
    if (!items.length) throw new Error('Write at least one point to check');
    const rec = { ...base, deptId, deptName: d.name, title: title.slice(0, 120), kind, eventId: kind === 'event' ? v.event : '', items, assignKey: v.assign || '', shareWith: shareVals(f) };
    await save('checklists', rec, `${id ? 'Updated' : 'Made'} checklist ${title}`); A.closeModal(); toast(id ? 'Saved' : 'Checklist made'); render();
    if (!id && rec.assignKey) { const p = deptMembersOf(d).find(x => x.key === rec.assignKey); if (p?.userId) deptPing(p.userId, `${T('New checklist')}: ${title}`, T(d.name), false); }
  });
};
A.checklistOpen = id => {
  const x = getById('checklists', id); if (!x) return; const d = deptById(x.deptId); const k = listKey(x); const ch = (x.checks || {})[k] || {};
  const canTick = !!d && inDept(d) || (deptAdmin() && !!d); const head = d && isDeptHead(d.id); const n = (x.items || []).length; const dn = listDone(x); const e = x.eventId ? evById(x.eventId) : null;
  modal(`${sheetHead(x.title, `${T(x.deptName || d?.name || '')} · ${x.kind === 'event' ? (e ? `${e.title} · ${T(fmtShort(e.date))}` : T('Event')) : `${T('Every day')} · ${T('Today')}`}`)}<div class="sheet-b stack">
    <div class="list-head"><b>${dn}/${n}</b> ${T('done')}<span class="list-bar"><i style="--p:${n ? Math.round(dn / n * 100) : 0}%"></i></span></div>
    ${canTick ? '' : `<div class="banner">${ic('eye')}<span>${T('Shared with your department to see only.')}</span></div>`}
    <div class="check-list">${(x.items || []).map(it => { const c = ch[it.id]; return `<label class="check-item ${c ? 'on' : ''}"><input type="checkbox" ${c ? 'checked' : ''} ${canTick ? `onchange="A.tickItem('${x.id}','${it.id}',this.checked)"` : 'disabled'}><span class="ci-t">${esc(it.text)}</span>${c ? `<span class="ci-by">${esc(c.by || '')} · ${esc(c.at || '')}</span>` : ''}</label>`; }).join('')}</div>
  </div>${head ? `<footer class="sheet-f"><button type="button" class="btn ghost" onclick="A.closeModal();A.checklistForm('${x.deptId}','${x.id}')">${ic('edit')} ${T('Edit')}</button><span class="grow"></span><button class="btn primary" onclick="A.closeModal()">${T('Close')}</button></footer>` : ''}`);
};
A.tickItem = async (id, itemId, on) => {
  const x = getById('checklists', id); if (!x) return; const k = listKey(x); const checks = { ...(x.checks || {}) };
  const day = { ...(checks[k] || {}) }; if (on) day[itemId] = { by: S.me?.name || S.user.name, at: new Date().toTimeString().slice(0, 5) }; else delete day[itemId];
  checks[k] = day; if (x.kind !== 'event') Object.keys(checks).sort().slice(0, -14).forEach(z => delete checks[z]);
  const was = listDone(x); const rec = { ...x, checks };
  try {
    await save('checklists', rec); Object.assign(x, rec);
    const n = (x.items || []).length; const now = listDone(x);
    if (now >= n && was < n) { toast(T('Checklist complete')); const d = deptById(x.deptId); const hd = d && deptHeadOf(d); if (hd?.userId) deptPing(hd.userId, `${T('Checklist complete')}: ${x.title}`, `${S.me?.name || S.user.name} · ${n}/${n}`, false); }
    A.checklistOpen(id); render();
  } catch (e) { toast(e.message, 'bad'); A.checklistOpen(id); }
};

/* ---------- home for a department head, and the department part of the crew home ---------- */
function headHome() {
  const ds = headDepts(); const t = todayLocal();
  return `<div class="sec-h" style="margin-top:0"><h2>${T('My department')}${info('dp-home')}</h2></div>` + ds.map(d => {
    const work = col('tasks').filter(x => x.deptId === d.id); const open = work.filter(x => (x.progress || 0) < 100); const late = open.filter(x => x.date && x.date < t);
    const today = open.filter(x => !x.date || x.date <= t); const lists = col('checklists').filter(x => x.deptId === d.id && (x.kind !== 'event' || (evById(x.eventId) && eventEnd(evById(x.eventId)) >= t)));
    const mem = deptMembersOf(d); const c = d.color || MOD.venue.c;
    return `<div class="card dept-card" style="--c:${c};margin-bottom:14px"><div class="dept-h">${ibox(d.icon || 'users', c)}<button class="main-col linkish" onclick="A.go('dept',{id:'${d.id}'})"><b>${esc(T(d.name))}</b><div class="sub">${mem.length} ${T(mem.length === 1 ? 'person' : 'people')}</div></button></div>
      <div class="today-strip" style="padding:0 14px"><div><b>${today.length}</b><span>${T('Work for today')}</span></div><div><b>${late.length}</b><span>${T('Late')}</span></div><div><b>${lists.filter(x => listDone(x) >= (x.items || []).length && (x.items || []).length).length}/${lists.length}</b><span>${T('Checklists done')}</span></div></div>
      <div class="big-grid" style="padding:0 14px 14px">${bigBtn(T('Give work'), 'plus', '#2563EB', `A.deptTaskForm('${d.id}')`)}${bigBtn(T('New checklist'), 'check', '#0B9B68', `A.checklistForm('${d.id}')`)}${canAlertAll() ? bigBtn(T('Alert my team'), 'bell', '#E11D74', `A.deptAlert('${d.id}')`) : ''}${bigBtn(T('Open department'), 'users', c, `A.go('dept',{id:'${d.id}'})`)}</div>
      ${open.length ? `<div class="rows">${open.slice(0, 5).map(x => `<button class="row click" onclick="A.go('dept',{id:'${d.id}'})"><div class="main-col"><b>${esc(x.title)}</b><div class="sub">${esc(personName(d, taskPersonKey(x)) || T('Not given to anyone'))}${x.date ? ' · ' + T(fmtShort(x.date)) : ''}</div></div>${pill(x.date && x.date < t ? T('Late') : (+x.progress || 0) + '%', x.date && x.date < t ? 'bad' : '')}</button>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}
function deptCrewExtra() {
  const ds = myDepts().filter(d => !myKeys().includes(d.head)); if (!ds.length) return '';
  const t = todayLocal(); const k = myKeys();
  const lists = col('checklists').filter(x => ds.some(d => d.id === x.deptId) && (!x.assignKey || k.includes(x.assignKey)) && (x.kind !== 'event' || (evById(x.eventId) && evById(x.eventId).date <= addDays(t, 1) && eventEnd(evById(x.eventId)) >= t)));
  const heads = ds.map(d => deptHeadOf(d)).filter(p => p?.userId && p.userId !== S.user.id);
  return `<div class="sec-h"><h2>${T('My checklists')}</h2>${ds.length === 1 ? `<button class="linkbtn" onclick="A.go('dept',{id:'${ds[0].id}'})">${esc(T(ds[0].name))} ${ic('chev')}</button>` : ''}</div>
    ${lists.length ? `<div class="card"><div class="rows">${lists.map(x => checklistRow(x)).join('')}</div></div>` : `<div class="card pad small muted">${T('No checklist for today.')}</div>`}
    ${heads.length && canSendAlert() ? `<div class="big-grid two" style="margin-top:14px">${heads.slice(0, 2).map(h => bigBtn(`${T('Alert my head')}: ${h.name}`, 'bell', '#7C3AED', `A.alertForm('${h.userId}')`)).join('')}</div>` : ''}`;
}
const _crewHomeBase = crewHome; crewHome = () => _crewHomeBase() + deptCrewExtra();
const _dashDept = V.dashboard;
V.dashboard = () => (S.org && !isClinic() && !deptAdmin() && headDepts().length ? `${headHome()}${isCrewUser() ? `<div class="sec-h"><h2>${T('My own work')}</h2></div>` + crewHome() : ''}` : _dashDept());

/* work marked done → tell the head of that department (others still get the manager update) */
const _crewProgBase = A.crewProg;
A.crewProg = async (id, v) => {
  const t = getById('tasks', id); const was = +t?.progress || 0; await _crewProgBase(id, v);
  if (t?.deptId && v >= 100 && was < 100) { const d = deptById(t.deptId); const hd = d && deptHeadOf(d); if (hd?.userId) deptPing(hd.userId, `${T('Work done')}: ${t.title}`, S.me?.name || S.user.name, false); }
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

I18N.load(`
You are not in a department yet | आप अभी किसी विभाग में नहीं हैं
The owner can add you to a department. | मालिक आपको किसी विभाग में जोड़ सकते हैं।
You see only your own department. Other departments cannot see your work. | आपको सिर्फ़ अपना विभाग दिखता है। दूसरे विभाग आपका काम नहीं देख सकते।
Head has the app | प्रमुख के पास ऐप है
Make head in the app | ऐप में प्रमुख बनाएं
Invite sent | इनवाइट भेजा
Give app to head | प्रमुख को ऐप दें
work open | काम बाकी
checklists | चेकलिस्ट
Open | खोलें
Only the owner or a manager can change departments | विभाग सिर्फ़ मालिक या मैनेजर बदल सकते हैं
Choose the head of this department first | पहले इस विभाग का प्रमुख चुनें
Make | बनाएं
the head in the app? | को ऐप में प्रमुख बनाएं?
Their login becomes “Department Head”: they see only this department, give work to its people and make checklists. | उनका लॉगिन “विभाग प्रमुख” बन जाएगा: उन्हें सिर्फ़ यही विभाग दिखेगा, वे इसके लोगों को काम देंगे और चेकलिस्ट बनाएंगे।
Make head | प्रमुख बनाएं
Done | हो गया
The head sees only this department, gives work to its people, makes checklists and alerts the team. | प्रमुख को सिर्फ़ यही विभाग दिखता है, वह इसके लोगों को काम देता है, चेकलिस्ट बनाता है और टीम को अलर्ट भेजता है।
Invite code | इनवाइट कोड
When they join with this code, they become the head here automatically. | इस कोड से जुड़ते ही वे यहां अपने आप प्रमुख बन जाएंगे।
Send again on WhatsApp | व्हाट्सऐप पर फिर भेजें
Send an invite code | इनवाइट कोड भेजें
They download the app, sign up with their own mobile and password, and type the code. | वे ऐप डाउनलोड करें, अपने मोबाइल और पासवर्ड से साइन अप करें और कोड डालें।
Make a new code | नया कोड बनाएं
Make invite code | इनवाइट कोड बनाएं
Or make their login now | या अभी उनका लॉगिन बनाएं
You set the mobile and password and tell them. | आप मोबाइल और पासवर्ड रखें और उन्हें बता दें।
Make login | लॉगिन बनाएं
Make login for the head | प्रमुख का लॉगिन बनाएं
Their mobile number (login ID) | उनका मोबाइल नंबर (लॉगिन आईडी)
Password (at least 6 letters) | पासवर्ड (कम से कम 6 अक्षर)
e.g. head1234 | जैसे head1234
Write a 10-digit mobile number | 10 अंकों का मोबाइल नंबर लिखें
Password must be at least 6 letters | पासवर्ड कम से कम 6 अक्षर का हो
Login made. Tell them their mobile and password. | लॉगिन बन गया। उन्हें मोबाइल और पासवर्ड बता दें।
This department is not open for you | यह विभाग आपके लिए खुला नहीं है
You see only the departments you are in. | आपको सिर्फ़ वही विभाग दिखते हैं जिनमें आप हैं।
Work | काम
Team | टीम
Shared with us | हमारे साथ शेयर
Give work | काम दें
New checklist | नई चेकलिस्ट
Alert team | टीम को अलर्ट
Give work to your team and make checklists. Only this department sees them. | अपनी टीम को काम दें और चेकलिस्ट बनाएं। इन्हें सिर्फ़ यही विभाग देखता है।
Your work and checklists from this department. | इस विभाग से आपका काम और चेकलिस्ट।
No work given yet | अभी कोई काम नहीं दिया गया
Tap “Give work”, pick a person, the work and the day. It shows on their phone. | “काम दें” दबाएं, व्यक्ति, काम और दिन चुनें। यह उनके फ़ोन पर दिखेगा।
Work given to you shows here. | आपको दिया गया काम यहां दिखेगा।
Not given to anyone | किसी को नहीं दिया
Shared with | शेयर किया
department(s) | विभाग
Late | देर
Edit work | काम बदलें
No checklists yet | अभी कोई चेकलिस्ट नहीं
Make a checklist for every day (like room cleaning) or for one event (like hall setup for a wedding). | हर दिन के लिए (जैसे कमरे की सफ़ाई) या किसी एक इवेंट के लिए (जैसे शादी का हॉल सेटअप) चेकलिस्ट बनाएं।
Checklists from your head show here. | आपके प्रमुख की चेकलिस्ट यहां दिखेंगी।
Every day | हर दिन
For events | इवेंट के लिए
From | से
Event | इवेंट
Another department shared these with you. You can see them but not change them. | दूसरे विभाग ने ये आपके साथ शेयर किए हैं। आप देख सकते हैं, बदल नहीं सकते।
No other department yet. | अभी कोई दूसरा विभाग नहीं।
Let other departments see this (optional) | दूसरे विभागों को यह दिखाएं (ज़रूरी नहीं)
Loading… | लोड हो रहा है…
They can only see it, not change it. Nothing else of your department is shown to them. | वे सिर्फ़ देख सकते हैं, बदल नहीं सकते। आपके विभाग का और कुछ उन्हें नहीं दिखता।
Only the head of this department can give work | काम सिर्फ़ इस विभाग का प्रमुख दे सकता है
What work | क्या काम
e.g. Clean rooms 101 to 108 | जैसे कमरे 101 से 108 साफ़ करें
Who will do it | कौन करेगा
Day | दिन
For event (optional) | किस इवेंट के लिए (ज़रूरी नहीं)
Tell them on the phone | फ़ोन पर बता दें
Write the work | काम लिखें
Work given | काम दे दिया
New work | नया काम
Remove this? | इसे हटाएं?
It will not show anywhere any more. | यह अब कहीं नहीं दिखेगा।
Only the head of this department can make checklists | चेकलिस्ट सिर्फ़ इस विभाग का प्रमुख बना सकता है
Edit checklist | चेकलिस्ट बदलें
Start from | यहां से शुरू करें
Checklist name | चेकलिस्ट का नाम
e.g. Room cleaning | जैसे कमरे की सफ़ाई
When | कब
Every day (always) | हर दिन (हमेशा)
For one event | एक इवेंट के लिए
Every day: ticks start fresh each morning. For one event: tick once for that event. | हर दिन: हर सुबह टिक नए सिरे से। एक इवेंट: उस इवेंट के लिए एक बार टिक।
Which event | कौन-सा इवेंट
Points to check (one per line) | जांचने वाली बातें (हर लाइन में एक)
Who fills it (optional) | कौन भरेगा (ज़रूरी नहीं)
Anyone in the department | विभाग में कोई भी
Write the checklist name | चेकलिस्ट का नाम लिखें
Pick the event | इवेंट चुनें
Write at least one point to check | जांचने की कम से कम एक बात लिखें
Checklist made | चेकलिस्ट बन गई
done | हुए
Shared with your department to see only. | आपके विभाग के साथ सिर्फ़ देखने के लिए शेयर।
Edit | बदलें
Close | बंद करें
Checklist complete | चेकलिस्ट पूरी
My department | मेरा विभाग
Work for today | आज का काम
Checklists done | पूरी चेकलिस्ट
Alert my team | मेरी टीम को अलर्ट
Open department | विभाग खोलें
My checklists | मेरी चेकलिस्ट
No checklist for today. | आज की कोई चेकलिस्ट नहीं।
Alert my head | मेरे प्रमुख को अलर्ट
My own work | मेरा अपना काम
Work done | काम पूरा
Department Head | विभाग प्रमुख
Room cleaning | कमरे की सफ़ाई
Change bedsheets and pillow covers | चादर और तकिए के कवर बदलें
Clean the bathroom | बाथरूम साफ़ करें
Fresh towels and toiletries | नए तौलिए और साबुन-शैम्पू रखें
Check AC, TV and lights | एसी, टीवी और लाइट जांचें
Dust and mop the floor | धूल झाड़ें और पोंछा लगाएं
Refill drinking water | पीने का पानी भरें
Hall setup before function | फ़ंक्शन से पहले हॉल सेटअप
Chairs and tables as per layout | लेआउट के हिसाब से कुर्सी-टेबल
Stage and backdrop ready | स्टेज और बैकड्रॉप तैयार
Lights and sound tested | लाइट और साउंड जांचे
AC on one hour before | एक घंटे पहले एसी चालू
Washrooms clean | वॉशरूम साफ़
Entry gate decor ready | एंट्री गेट की सजावट तैयार
Kitchen closing | किचन बंद करना
Gas cylinders off | गैस सिलेंडर बंद
Leftover food stored | बचा खाना रखा
Utensils washed | बर्तन धुले
Floor cleaned | फ़र्श साफ़
Fridge temperature checked | फ़्रिज का तापमान जांचा
Waste taken out | कचरा बाहर
Guest arrival | मेहमानों का आगमन
Welcome drinks ready | वेलकम ड्रिंक तैयार
Room keys ready | कमरों की चाबियां तैयार
Luggage help ready | सामान उठाने वाले तैयार
Guest list at reception | रिसेप्शन पर मेहमानों की लिस्ट
Security round | सिक्योरिटी राउंड
Main gate checked | मुख्य गेट जांचा
Parking checked | पार्किंग जांची
CCTV working | सीसीटीवी चालू
Fire extinguishers in place | आग बुझाने के सिलेंडर अपनी जगह
`);
I18N.load(`
Have an invite code from your team? Join here | टीम से इनवाइट कोड मिला है? यहां जुड़ें
For people whose owner or head sent them an invite code. You make your own login here. | जिन्हें मालिक या प्रमुख ने इनवाइट कोड भेजा है, उनके लिए। यहां अपना लॉगिन खुद बनाएं।
Your login ID: mobile number or email | आपकी लॉगिन आईडी: मोबाइल नंबर या ईमेल
Join my team | मेरी टीम से जुड़ें
Back to log in | लॉगिन पर वापस
Welcome! You joined your team. | स्वागत है! आप अपनी टीम से जुड़ गए।
I have an invite code | मेरे पास इनवाइट कोड है
Join the team that invited you | जिस टीम ने बुलाया है उससे जुड़ें
`);
