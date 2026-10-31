/* ================= Clinic business side: Staff & salary, Expenses, Income & expenses, Marketing =================
   The event versions of these pages are about crew duties, bookings and events; clinics get their own versions on the
   same collections (staff, attendance, advances, payouts, expenses), switched by isClinic().
   Clinic staff are paid a monthly salary: salary − (absent days + half days ÷ 2 + leaves above the free ones) × salary ÷ days
   in month + bonus − advance. Income = appointment fees received (appts.paid). */
const CLINIC_STAFF_ROLES = ['Receptionist', 'Nurse', 'Compounder / Pharmacist', 'Assistant', 'Lab technician', 'Dental assistant', 'Optometrist', 'Physiotherapist', 'Cleaner / Ward boy', 'Visiting doctor', 'Other'];
const CLINIC_EXP = ['Rent', 'Electricity & water', 'Medicines & consumables', 'Lab tests (outside)', 'Equipment & repair', 'Staff tea & food', 'Marketing & ads', 'Phone, internet & software', 'Cleaning & laundry', 'Misc'];
const CEXP_STYLE = { 'Rent': ['building', '#7C3AED'], 'Electricity & water': ['bolt', '#F59E0B'], 'Medicines & consumables': ['drop', '#E11D48'], 'Lab tests (outside)': ['file', '#0891B2'], 'Equipment & repair': ['wrench', '#64748B'], 'Staff tea & food': ['pot', '#16A34A'], 'Marketing & ads': ['megaphone', '#9333EA'], 'Phone, internet & software': ['globe', '#2563EB'], 'Cleaning & laundry': ['sparkle', '#0D9488'], 'Misc': ['dots', '#94A3B8'], 'Staff salary': ['users', '#0D9488'] };
const ATT_ST = [['P', 'Present', 'good'], ['H', 'Half day', 'warn'], ['L', 'Leave', 'info'], ['A', 'Absent', 'bad']];
const dim = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
/* Monthly salary for one person and month.
   - Start = joining date, but a day marked (or an advance given) before it counts: the person was already working.
   - Absent, half day and leave above the free ones are cut at salary ÷ days in the month.
   - Days not marked: paid (default) or cut (settings.salaryUnmarked = 'cut'; the weekly off day stays paid); only days up to today count.
   - An advance bigger than the salary is not lost: the rest is cut next month (carry). */
const prevMonth = m => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
function staffStart(s) { const own = [...col('attendance').filter(a => a.staffId === s.id).map(a => a.date), ...col('advances').filter(a => a.staffId === s.id).map(a => a.date)].filter(Boolean).sort()[0] || '';
  return [s.joinDate || '', own].filter(Boolean).sort()[0] || ''; }
function salaryOf(s, month, depth = 0) {
  const att = col('attendance').filter(a => a.staffId === s.id && (a.date || '').startsWith(month)); const c = k => att.filter(a => a.status === k).length;
  const days = dim(month); const start = staffStart(s); const st = settings(); const t = todayLocal();
  const r = { P: c('P'), H: c('H'), L: c('L'), A: c('A'), unmarked: 0, unCut: 0, carryIn: 0, carryOut: 0 };
  let from = 1; if (start && start.slice(0, 7) === month) from = +start.slice(8, 10); const before = start && start.slice(0, 7) > month;
  const salary = +s.salary || 0; const perDay = salary / days; r.base = before ? 0 : Math.round(salary * (days - from + 1) / days);
  const upto = month === t.slice(0, 7) ? +t.slice(8, 10) : month > t.slice(0, 7) ? 0 : days; const off = st.weeklyOff ?? 0; const marked = new Set(att.map(a => a.date));
  if (!before) for (let d = from; d <= upto; d++) { const ds = `${month}-${String(d).padStart(2, '0')}`; if (marked.has(ds)) continue; r.unmarked++; if (st.salaryUnmarked === 'cut' && new Date(ds + 'T00:00').getDay() !== +off) r.unCut++; }
  const free = s.leaves === '' || s.leaves == null ? 2 : +s.leaves; r.paidL = Math.min(r.L, free);
  r.cutDays = r.A + r.H * 0.5 + Math.max(0, r.L - free) + r.unCut; r.cut = Math.min(r.base, Math.round(perDay * r.cutDays));
  const money = col('advances').filter(a => a.staffId === s.id && (a.date || '').startsWith(month));
  r.adv = sum(money.filter(x => smKind(x) === 'advance'), x => +x.amount || 0); r.bonus = sum(money.filter(x => smKind(x) === 'bonus'), x => +x.amount || 0);
  if (depth < 24 && start && prevMonth(month) >= start.slice(0, 7)) r.carryIn = salaryOf(s, prevMonth(month), depth + 1).carryOut;
  const gross = r.base - r.cut + r.bonus, owe = r.adv + r.carryIn;
  r.net = Math.max(0, gross - owe); r.carryOut = Math.max(0, owe - gross); r.cost = Math.max(0, gross); return r;
}
/* the running month counts salary only up to today, so mid-month profit is not shown as a big loss */
const salaryCost = month => { const t = todayLocal(); const k = month === t.slice(0, 7) ? +t.slice(8, 10) / dim(month) : month > t.slice(0, 7) ? 0 : 1; return Math.round(sum(col('staff'), s => salaryOf(s, month).cost) * k); };

/* ---------- Staff & salary ---------- */
function clinicStaff() {
  const tab = S.params.tab || 'roster'; const edit = can('staff', 2); const seeMoney = edit || can('reports');
  const head = pageHead('Staff & salary', 'Your team, daily attendance, monthly salary, advances and salary slips.', edit ? `<button class="btn" onclick="A.cMoneyForm()">${ic('rupee')} ${T('Advance / bonus')}</button><button class="btn primary" onclick="A.cStaffForm()">${ic('plus')} ${T('Add staff')}</button>` : '');
  const tabs = `<div class="tabs">${[['roster', 'Team'], ['attendance', 'Attendance'], ...(seeMoney ? [['salary', 'Salary'], ['money', 'Advances & bonus']] : [])].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${T(l)}</button>`).join('')}${tabHelp('cs-' + tab)}</div>`;
  const staff = col('staff').slice().sort(by('name'));
  if (!staff.length) return head + `<div class="card">${empty('No staff added yet', 'Add your receptionist, nurse, compounder and other staff with their monthly salary. Then mark attendance daily; salary is worked out by itself.', edit ? `<button class="btn primary" onclick="A.cStaffForm()">${ic('plus')} ${T('Add staff')}</button>` : '', 'users', MOD.staff.c)}</div>`;
  if (tab === 'attendance') {
    const date = S.filters.attDate || todayLocal(); const cnt = k => staff.filter(s => (getById('attendance', date + '_' + s.id) || {}).status === k).length;
    return head + tabs + `<div class="toolbar"><input type="date" style="width:auto" value="${date}" onchange="A.setF('attDate',this.value)">${ATT_ST.map(([k, l, tone]) => pill(cnt(k) + ' ' + T(l), tone)).join('')}${edit ? `<button class="btn sm" onclick="A.markAll('${date}')">${T('Mark all present')}</button>` : ''}</div>
    <div class="card"><div class="rows">${staff.map(s => { const a = getById('attendance', date + '_' + s.id) || {}; return `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(s.name))}</div><div class="main-col" style="min-width:130px"><b>${esc(s.name)}</b><div class="sub">${esc(T(s.role || ''))}</div></div><div class="att-chips">${ATT_ST.map(([k, l, tone]) => `<button class="att ${a.status === k ? 'on ' + tone : ''}" ${edit ? `onclick="A.mark('${s.id}','${date}','${k}',null)"` : 'disabled'}>${T(l)}</button>`).join('')}</div></div>`; }).join('')}</div></div>
    <p class="tiny muted" style="margin-top:8px">${T('Leave: the first free leaves in a month are paid (set per person). Absent and extra leave days are cut from salary.')}</p>`;
  }
  if (tab === 'salary' && seeMoney) {
    const month = S.filters.payMonth || todayLocal().slice(0, 7); const rows = staff.map(s => ({ s, r: salaryOf(s, month), paid: getById('payouts', month + '_' + s.id) }));
    return head + tabs + `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('payMonth',this.value)"><b class="num">${T('Total')} ${inr(sum(rows, x => x.r.net))}</b></div>
    <div class="sal-cards">${rows.map(({ s, r, paid }) => { const L = (l, v, cls = '') => v ? `<div class="sal-l ${cls}"><span>${l}</span><b>${v}</b></div>` : '';
      return `<div class="card pad stack-sm sal-c"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><div style="min-width:0"><b>${esc(s.name)}</b><div class="tiny muted">${esc(T(s.role || ''))} · ${inr(s.salary)}/${T('month')}</div></div><div class="sal-pay"><span>${T('To pay')}</span><b>${inr(r.net)}</b></div></div>
        <div class="sal-att">${pill(`${r.P} ${T('Present')}`, 'good')}${r.H ? pill(`${r.H} ${T('Half day')}`, 'warn') : ''}${r.L ? pill(`${r.L} ${T('Leave')} (${r.paidL} ${T('paid')})`, 'info') : ''}${r.A ? pill(`${r.A} ${T('Absent')}`, 'bad') : ''}${r.unmarked ? pill(`${r.unmarked} ${T('not marked')}`, r.unCut ? 'bad' : '') : ''}</div>
        <div class="sal-ls">${L(T('Salary'), inr(r.base))}${L(T('Cut'), r.cut ? '− ' + inr(r.cut) : '', 'bad-t')}${L(T('Bonus'), r.bonus ? '+ ' + inr(r.bonus) : '', 'good-t')}${L(T('Advance'), r.adv ? '− ' + inr(r.adv) : '', 'bad-t')}${L(T('Advance from last month'), r.carryIn ? '− ' + inr(r.carryIn) : '', 'bad-t')}</div>
        ${r.carryOut ? `<div class="tiny warn-t">${T('Advance left')} ${inr(r.carryOut)} · ${T('cut next month')}</div>` : ''}
        <div class="row-flex" style="gap:6px">${paid && +paid.amount >= r.net ? pill(`${T('Paid')} ${inr(paid.amount)} · ${dShort(paid.date)}`, 'good') : paid ? `${pill(`${T('Paid')} ${inr(paid.amount)}`, 'warn')}${edit && r.net > +paid.amount ? `<button class="btn sm primary" onclick="A.payout('${s.id}','${month}',${r.net})">${T('Mark paid')} ${inr(r.net)}</button>` : ''}` : edit && r.net ? `<button class="btn sm primary" onclick="A.payout('${s.id}','${month}',${r.net})">${T('Mark paid')}</button>` : ''}${paid && edit ? `<button class="btn sm ghost" onclick="A.payoutUndo('${month}_${s.id}')">${T('Undo')}</button>` : ''}${s.phone ? waBtn(slipText(s, r, month), s.phone, T('Slip'), 'btn sm wa') : ''}</div></div>`; }).join('')}</div>
    ${edit ? `<div class="card pad row-flex sal-rule" style="margin-top:10px;gap:10px"><span class="small"><b>${T('Days not marked')}</b></span><div class="chips">${[['paid', 'Count as present'], ['cut', 'Cut from salary']].map(([k, l]) => `<button class="chip ${(settings().salaryUnmarked || 'paid') === k ? 'on' : ''}" onclick="A.salRule({salaryUnmarked:'${k}'})">${T(l)}</button>`).join('')}</div>
      ${settings().salaryUnmarked === 'cut' ? `<span class="small"><b>${T('Weekly off')}</b></span><select style="width:auto" onchange="A.salRule({weeklyOff:+this.value})">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'None'].map((d, i) => `<option value="${i === 7 ? 9 : i}" ${(settings().weeklyOff ?? 0) === (i === 7 ? 9 : i) ? 'selected' : ''}>${T(d)}</option>`).join('')}</select>` : ''}</div>` : ''}
    <p class="tiny muted" style="margin-top:8px">${T('To pay = salary − cut for absent / half days / extra leave + bonus − advance. A person who joined this month gets salary from the joining day.')}</p>`;
  }
  if (tab === 'money' && seeMoney) {
    const month = S.filters.cmMonth || todayLocal().slice(0, 7); const list = col('advances').filter(x => (x.date || '').startsWith(month)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return head + tabs + `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('cmMonth',this.value)">${pill(T('Advance') + ' ' + inr(sum(list.filter(x => smKind(x) === 'advance'), x => x.amount)), 'warn')}${pill(T('Bonus') + ' ' + inr(sum(list.filter(x => smKind(x) === 'bonus'), x => x.amount)), 'primary')}</div>
    <div class="card"><div class="rows">${list.map(x => { const s = getById('staff', x.staffId); const k = smKind(x); return `<div class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.cMoneyForm('${x.id}')"` : ''}>${ibox(k === 'bonus' ? 'gift' : 'rupee', k === 'bonus' ? '#DB2777' : '#EA580C')}<div class="main-col"><b>${esc(s?.name || '—')}</b><div class="sub">${dShort(x.date)}${x.note ? ' · ' + esc(x.note) : ''}</div></div>${pill(T(k === 'bonus' ? 'Bonus' : 'Advance'), k === 'bonus' ? 'primary' : 'warn')}<b class="num">${inr(x.amount)}</b></div>`; }).join('') || empty('Nothing this month', 'Advances are cut from the salary; bonus is added.')}</div></div>`;
  }
  const t = todayLocal(); const month = t.slice(0, 7);
  return head + tabs + `<div class="grid g-auto">${staff.map(s => { const a = getById('attendance', t + '_' + s.id); const st = ATT_ST.find(x => x[0] === a?.status); const linked = S.members.find(m => m.staffId === s.id); const r = salaryOf(s, month);
    return `<div class="card pad stack-sm"><div class="row-flex" style="flex-wrap:nowrap"><div class="avatar">${esc(initials(s.name))}</div><div style="min-width:0;flex:1"><b>${esc(s.name)}</b><div class="tiny muted">${esc(T(s.role || ''))}${s.phone ? ' · ' + esc(s.phone) : ''}</div></div>${st ? pill(T(st[1]), st[2]) : pill(T('Not marked'), '')}</div>
      <div class="row-flex small" style="justify-content:space-between"><span class="muted">${seeMoney ? inr(s.salary) + '/' + T('month') + ' · ' : ''}${r.P} ${T('days present this month')}</span>${linked ? pill(T('App login'), 'primary') : ''}</div>
      <div class="row-flex">${s.phone ? `<a class="btn sm" href="tel:${esc(String(s.phone).replace(/\D/g, '').slice(-10))}">${ic('phone')}</a>${waBtn('', s.phone, 'WhatsApp')}` : ''}${edit ? `<button class="btn sm ghost" onclick="A.cStaffForm('${s.id}')">${ic('edit')} ${T('Edit')}</button>` : ''}</div></div>`; }).join('')}</div>`;
}
const slipText = (s, r, month) => { const m = new Date(month + '-01T00:00').toLocaleDateString(I18N.lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' }); return `${settings().bizName} · ${T('Salary slip')} ${m}\n${s.name} (${T(s.role || '')})\n${T('Present')} ${r.P} · ${T('Half day')} ${r.H} · ${T('Leave')} ${r.L} · ${T('Absent')} ${r.A}\n${T('Salary')}: ${inr(r.base)}${r.cut ? `\n${T('Cut')}: − ${inr(r.cut)}` : ''}${r.bonus ? `\n${T('Bonus')}: + ${inr(r.bonus)}` : ''}${r.adv ? `\n${T('Advance')}: − ${inr(r.adv)}` : ''}${r.carryIn ? `\n${T('Advance from last month')}: − ${inr(r.carryIn)}` : ''}\n*${T('To pay')}: ${inr(r.net)}*${r.carryOut ? `\n${T('Advance left')} ${inr(r.carryOut)} · ${T('cut next month')}` : ''}`; };
A.cStaffForm = id => {
  const s = id ? getById('staff', id) : { role: 'Receptionist', leaves: 2, joinDate: '' };
  formModal({ title: id ? 'Edit staff' : 'Add staff', fields: [
    { name: 'name', label: 'Name', required: true, value: s.name }, { name: 'phone', label: 'Mobile', type: 'tel', value: s.phone },
    { name: 'role', label: 'Work', type: 'select', options: CLINIC_STAFF_ROLES.map(r => [r, T(r)]), value: s.role }, { name: 'salary', label: 'Monthly salary ₹', type: 'number', min: 0, required: true, value: s.salary },
    { name: 'leaves', label: 'Free leaves per month', type: 'number', min: 0, max: 31, value: s.leaves ?? 2, hint: 'Leaves up to this number are paid' }, { name: 'joinDate', label: 'Joining date', type: 'date', value: s.joinDate, hint: 'Leave blank if already working' }],
    left: id && can('staff', 3) ? `<button type="button" class="btn danger" onclick="A.delStaff('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { await save('staff', Object.assign(id ? s : { id: uid('st_') }, v, { salary: +v.salary || 0, leaves: v.leaves === '' ? 2 : +v.leaves, payType: 'month' }), `${id ? 'Updated' : 'Added'} staff ${v.name}`); render(); } });
};
A.cMoneyForm = (id, sid) => {
  if (!col('staff').length) { toast('Add your staff first', 'warn'); A.cStaffForm(); return; }
  const x = id ? getById('advances', id) : { kind: 'advance', staffId: sid || '', date: todayLocal() };
  formModal({ title: id ? 'Edit entry' : 'Advance / bonus', fields: [
    { name: 'staffId', label: 'Staff', type: 'select', options: col('staff').map(s => [s.id, s.name]), value: x.staffId, required: true, full: true },
    { name: 'kind', label: 'Type', type: 'select', options: [['advance', T('Advance (cut from salary)')], ['bonus', T('Bonus (added to salary)')]], value: smKind(x) },
    { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: x.amount }, { name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'note', label: 'Note', value: x.note, full: true }],
    left: id && can('staff', 3) ? `<button type="button" class="btn danger" onclick="A.delCrewMoney('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const s = getById('staff', v.staffId); await save('advances', Object.assign(id ? x : { id: uid('ad_') }, v, { amount: +v.amount }), `${v.kind === 'bonus' ? 'Bonus' : 'Advance'} ${inr(v.amount)} to ${s?.name}`); render(); } });
};

/* ---------- Expenses ---------- */
function clinicExpenses() {
  const month = S.filters.expMonth || todayLocal().slice(0, 7); const edit = can('expenses', 2);
  const list = col('expenses').filter(x => (x.date || '').startsWith(month)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sal = can('staff') || can('reports') ? salaryCost(month) : 0; const lines = [...list.map(x => ({ cat: x.category, amount: +x.amount || 0 })), ...(sal ? [{ cat: 'Staff salary', amount: sal }] : [])];
  const tot = sum(lines, x => x.amount); const cats = [...new Set(lines.map(x => x.cat))].map(c => [c, sum(lines.filter(x => x.cat === c), x => x.amount)]).sort((a, b) => b[1] - a[1]);
  const style = c => CEXP_STYLE[c] || CEXP_STYLE.Misc;
  return pageHead('Expenses', 'Rent, bills, medicines, equipment and every other clinic cost. Staff salary comes from Staff by itself.', edit ? `<button class="btn primary" onclick="A.cExpForm()">${ic('plus')} ${T('Add expense')}</button>` : '') +
  `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('expMonth',this.value)"><b class="num">${inr(tot)} ${T('this month')}</b></div>
  <div class="split"><div class="card"><div class="rows">${sal ? `<button class="row click" onclick="A.go('staff',{tab:'salary'})">${ibox('users', '#0D9488')}<div class="main-col"><b>${T('Staff salary')}</b><div class="sub">${T(month === todayLocal().slice(0, 7) ? 'So far this month, from Staff → Salary' : 'From Staff → Salary')}</div></div><b class="num">${inr(sal)}</b></button>` : ''}${list.map(x => { const [i, c] = style(x.category); return `<div class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.cExpForm('${x.id}')"` : ''}>${ibox(i, c)}<div class="main-col"><b>${esc(T(x.category || 'Misc'))}</b><div class="sub">${dShort(x.date)}${x.mode ? ' · ' + esc(T(x.mode)) : ''}${x.note ? ' · ' + esc(x.note) : ''}</div></div><b class="num">${inr(x.amount)}</b></div>`; }).join('') || (sal ? '' : empty('No expenses this month', 'Add rent, electricity, medicines and other costs.'))}</div></div>
  <div class="card pad stack-sm"><h3>${T('By category')}</h3>${cats.map(([c, v]) => `<div><div class="row-flex small" style="justify-content:space-between"><span class="row-flex" style="gap:8px">${ibox(style(c)[0], style(c)[1], 'sm')}${esc(T(c))}</span><b class="num">${inr(v)}</b></div>${prog(tot ? v / tot * 100 : 0)}</div>`).join('') || `<span class="muted small">${T('Nothing yet')}</span>`}</div></div>`;
}
A.cExpForm = id => {
  const x = id ? getById('expenses', id) : { date: todayLocal(), category: CLINIC_EXP[0], mode: 'Cash' };
  formModal({ title: id ? 'Edit expense' : 'Add expense', fields: [{ name: 'category', label: 'Type', type: 'select', options: CLINIC_EXP.map(c => [c, T(c)]), value: x.category }, { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: x.amount },
    { name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'mode', label: 'Paid by', type: 'select', options: ['Cash', 'UPI', 'Bank transfer', 'Card', 'Cheque'].map(m => [m, T(m)]), value: x.mode }, { name: 'note', label: 'Note', value: x.note, full: true, placeholder: 'e.g. October rent, BP machine repair' }],
    left: id && can('expenses', 3) ? `<button type="button" class="btn danger" onclick="A.delExp('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { await save('expenses', Object.assign(id ? x : { id: uid('x_') }, v, { amount: +v.amount, eventId: '' }), `${id ? 'Updated' : 'Added'} expense ${inr(v.amount)} (${v.category})`); render(); } });
};

/* ---------- Income & expenses ---------- */
const feeDay = a => a.paidAt || a.date || '';
function clinicReports() {
  const p = S.filters.period || 'month'; const [a, b] = periodRange(p); const t = todayLocal(); const inR = d => d && d >= a && d <= b;
  const paid = col('appts').filter(x => x.paid && inR(feeDay(x))); const income = sum(paid, x => +x.fee || 0) + sum(ptPaysAll().filter(x => inR(x.date || '')), x => +x.amount || 0);
  const visits = col('appts').filter(x => x.status === 'done' && inR(x.date)).length; const newPts = col('patients').filter(x => x.created && inR(todayLocal(new Date(x.created)))).length;
  const exp = sum(col('expenses').filter(x => inR(x.date)), x => +x.amount || 0);
  const mlist = []; { let m = (a === '0000-01-01' ? (col('appts').map(feeDay).filter(Boolean).sort()[0] || t) : a).slice(0, 7); const end = (b > t ? t : b).slice(0, 7); let guard = 0; while (m <= end && guard++ < 120) { mlist.push(m); const d = new Date(m + '-01T00:00'); m = todayLocal(new Date(d.getFullYear(), d.getMonth() + 1, 1)).slice(0, 7); } }
  const sal = sum(mlist, m => salaryCost(m)); const cost = exp + sal; const net = income - cost;
  const months = []; const base = new Date(t + 'T00:00'); for (let k = 5; k >= 0; k--) months.push(todayLocal(new Date(base.getFullYear(), base.getMonth() - k, 1)).slice(0, 7));
  const minc = months.map(m => sum(col('appts').filter(x => x.paid && feeDay(x).startsWith(m)), x => +x.fee || 0) + sum(ptPaysAll().filter(x => String(x.date || '').startsWith(m)), x => +x.amount || 0));
  const mcost = months.map(m => sum(col('expenses').filter(x => (x.date || '').startsWith(m)), x => +x.amount || 0) + salaryCost(m));
  const byMode = ['clinic', 'video', 'whatsapp'].map(k => [k, sum(paid.filter(x => (x.mode || 'clinic') === k), x => +x.fee || 0), paid.filter(x => (x.mode || 'clinic') === k).length]).filter(x => x[2]);
  const byCat = [...new Set(col('expenses').filter(x => inR(x.date)).map(x => x.category))].map(c => [c, sum(col('expenses').filter(x => inR(x.date) && x.category === c), x => +x.amount || 0)]).concat(sal ? [['Staff salary', sal]] : []).sort((x, y) => y[1] - x[1]);
  const due = sum(col('appts').filter(feeDue), x => +x.fee || 0);
  return pageHead('Income & expenses', `${fmtDate(a === '0000-01-01' ? null : a)} – ${fmtDate(b === '9999-12-31' || b > t ? t : b)}`, `${seg('period', [['month', 'This month'], ['last', 'Last month'], ['fy', 'This FY'], ['all', 'All time']], p, 'A.setF')}${!FRAMED ? `<button class="btn sm" onclick="A.clinicCSV()">${ic('download')} CSV</button>` : ''}`) +
  `<div class="kpis">${kpi('Fees received', inr(income), `${paid.length} ${T('payments')} · ${visits} ${T('visits')}`, 'good', 'rupee', '#0B9B68')}${kpi('Expenses', inr(cost), `${T('Bills')} ${inr(exp)} · ${T('Salary')} ${inr(sal)}`, '', 'wallet', '#EA580C')}${kpi('Profit', inr(net), net < 0 ? T('Loss in this period') : income ? (net / income * 100).toFixed(0) + '% ' + T('of fees') : '', net >= 0 ? 'good' : 'bad', 'chart', '#2563EB')}${kpi('Fees to collect', inr(due), `${newPts} ${T('new patients')}`, due ? 'accent' : '', 'clock', '#D97706')}</div>
  <div class="split"><div class="card pad"><div class="row-flex" style="justify-content:space-between;margin-bottom:8px"><h3>${T('Last 6 months')}</h3><div class="legend"><span><i style="background:var(--primary)"></i>${T('Fees')}</span><span><i style="background:var(--accent)"></i>${T('Expenses')}</span></div></div><div class="chart">${barChart(months, minc, mcost)}</div></div>
  <div class="card pad stack-sm"><h3>${T('Where the money goes')}</h3>${byCat.map(([c, v]) => `<div><div class="row-flex small" style="justify-content:space-between"><span>${esc(T(c || 'Misc'))}</span><b class="num">${inr(v)}</b></div>${prog(cost ? v / cost * 100 : 0)}</div>`).join('') || `<span class="muted small">${T('Nothing yet')}</span>`}
    ${byMode.length ? `<h3 style="margin-top:10px">${T('Fees by type')}</h3>${byMode.map(([k, v, n]) => `<div class="row-flex small" style="justify-content:space-between"><span>${T({ clinic: 'In clinic', video: 'Video call', whatsapp: 'WhatsApp call' }[k])} · ${n}</span><b class="num">${inr(v)}</b></div>`).join('')}` : ''}</div></div>`;
}
A.clinicCSV = () => {
  const p = S.filters.period || 'month'; const [a, b] = periodRange(p); const inR = d => d && d >= a && d <= b; const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [...col('appts').filter(x => x.paid && inR(feeDay(x))).map(x => [feeDay(x), 'Income', 'Fee ' + (x.mode || 'clinic'), x.patientName || '', x.payMode || '', +x.fee || 0]), ...ptPaysAll().filter(x => inR(x.date || '')).map(x => [x.date, 'Income', 'Treatment', x.patientName || '', x.mode || '', +x.amount || 0]),
    ...col('expenses').filter(x => inR(x.date)).map(x => [x.date, 'Expense', x.category, x.note || '', x.mode || '', -(+x.amount || 0)])].sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  downloadFile('clinic-income-expenses.csv', '﻿Date,Type,Head,Details,Mode,Amount\n' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv'); logAct('Downloaded income & expenses');
};

/* ---------- Marketing for clinics ---------- */
const CMK_TABS = [['recall', 'Recall patients'], ['reviews', 'Google reviews'], ['messages', 'Health messages'], ['qr', 'QR poster'], ['share', 'Share clinic']];
const lastVisitOf = pid => col('appts').filter(a => a.patientId === pid && a.status === 'done').map(a => a.date).sort().pop() || '';
const upcomingOf = pid => col('appts').some(a => a.patientId === pid && ['booked', 'requested'].includes(a.status) && a.date >= todayLocal());
function clinicMarketing() {
  const tab = CMK_TABS.find(t => t[0] === S.params.tab) ? S.params.tab : 'recall';
  const head = pageHead('Marketing', 'Free tools to bring patients back: recall reminders, Google reviews, health messages and a QR poster.');
  return head + `<div class="tabs">${CMK_TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${T(l)}</button>`).join('')}${tabHelp('cmk-' + tab)}</div>` + ({ recall: cmkRecall, reviews: cmkReviews, messages: cmkMessages, qr: () => MK.qr(), share: cmkShare })[tab]();
}
function recallMsg(p, days) {
  const st = settings();
  return I18N.lang === 'hi' ? `नमस्ते ${p.name} जी 🙏\n${st.bizName} से। आपकी पिछली जांच को ${days} दिन हो गए हैं। सेहत ठीक रखने के लिए एक बार फ़ॉलो-अप जांच करवा लें। समय बुक करने के लिए जवाब दें।\n${st.timings ? st.timings + '\n' : ''}${st.phone || ''}`
    : `Namaste ${p.name} ji 🙏\nThis is ${st.bizName}. It has been ${days} days since your last check-up. A follow-up visit helps keep your health on track. Reply to book a time.\n${st.timings ? st.timings + '\n' : ''}${st.phone || ''}`;
}
function cmkRecall() {
  const gap = +(S.filters.recallGap || 60); const t = todayLocal(); const edit = can('patients', 2);
  const list = col('patients').map(p => ({ p, last: lastVisitOf(p.id) })).filter(x => x.last && daysBetween(x.last, t) >= gap && !upcomingOf(x.p.id) && !(x.p.recallAt && daysBetween(x.p.recallAt, t) < 15)).sort((a, b) => a.last.localeCompare(b.last));
  const dues = typeof allDues === 'function' ? allDues(7) : [];
  return `${typeof dueCard === 'function' ? dueCard() : ''}
  <div class="sec-h"><h2>${T('Not seen for a while')}</h2></div>
  <div class="toolbar">${seg('recallGap', [['30', '30+ days'], ['60', '60+ days'], ['90', '90+ days'], ['180', '6+ months']], String(gap), 'A.setF')}<span class="small muted">${list.length} ${T('patients')}</span></div>
  <div class="banner" style="margin-bottom:12px">${ic('megaphone')}<span>${T('Patients who had a visit but no check-up since. Send a reminder; tap Done and they hide for 15 days.')}</span></div>
  <div class="card"><div class="rows">${list.map(({ p, last }) => { const d = daysBetween(last, t); return `<div class="row" style="flex-wrap:wrap"><div class="avatar" style="background:#FFE4EA;color:#9F1239">${esc(initials(p.name))}</div><div class="main-col" style="min-width:160px"><b>${esc(p.name)}</b><div class="sub">${T('Last visit')} ${dShort(last)} · ${d} ${T('days')}${p.conditions ? ' · ' + esc(p.conditions) : ''}</div></div><div class="row-flex" style="gap:6px;flex-wrap:wrap">${p.phone ? waBtn(recallMsg(p, d), p.phone, T('Send reminder')) : ''}${can('appointments', 2) ? `<button class="btn sm" onclick="A.apptForm({patientId:'${p.id}'})">${ic('calendar')} ${T('Book')}</button>` : ''}${edit ? `<button class="btn sm ghost" onclick="A.recallDone('${p.id}')">${ic('check')} ${T('Done')}</button>` : ''}</div></div>`; }).join('') || empty('Nobody to recall', 'Patients whose last visit was long ago show here.', '', 'check', '#0B9B68')}</div></div>${dues.length ? '' : ''}`;
}
A.recallDone = async pid => { const p = patientById(pid); try { await save('patients', { ...p, recallAt: todayLocal() }, `Reminded ${p.name} for a check-up`); toast('Done'); render(); } catch (e) { toast(e.message, 'bad'); } };
function cReviewMsg(p) { const st = settings(); return I18N.lang === 'hi' ? `नमस्ते ${p.name} जी 🙏\n${st.bizName} पर आने के लिए धन्यवाद। अगर इलाज से आपको आराम मिला हो, तो गूगल पर 2 लाइन लिख दें। इससे दूसरे मरीज़ों को भी मदद मिलती है:\n${st.googleReview || ''}\nधन्यवाद!` : `Namaste ${p.name} ji 🙏\nThank you for visiting ${st.bizName}. If you are feeling better, please write 2 lines about us on Google. It helps other patients find us:\n${st.googleReview || ''}\nThank you!`; }
function cmkReviews() {
  const st = settings(); const t = todayLocal(); const edit = can('patients', 2);
  const list = col('patients').map(p => ({ p, last: lastVisitOf(p.id) })).filter(x => x.last && daysBetween(x.last, t) <= 15 && !(x.p.reviewAskedAt && daysBetween(x.p.reviewAskedAt, t) < 180)).sort((a, b) => b.last.localeCompare(a.last));
  return `<form class="card pad stack-sm" onsubmit="A.saveReviewLink(event)"><b>${T('Your Google review link')}</b><div class="row-flex" style="flex-wrap:nowrap"><input name="googleReview" value="${esc(st.googleReview || '')}" placeholder="https://g.page/r/…/review" ${can('settings', 2) ? '' : 'disabled'}>${can('settings', 2) ? `<button class="btn primary" type="submit">${T('Save')}</button>` : ''}</div><span class="tiny muted">${T('Google Maps → your clinic → Ask for reviews → copy the link.')}</span></form>
  ${st.googleReview ? '' : `<div class="banner warn" style="margin-top:12px">${ic('alert')}<span>${T('Add your review link first. Then send it to happy patients after their visit.')}</span></div>`}
  <div class="sec-h"><h2>${T('Seen in the last 15 days')}</h2></div>
  <div class="card"><div class="rows">${list.map(({ p, last }) => `<div class="row" style="flex-wrap:wrap"><div class="avatar" style="background:#FEF3C7;color:#92400E">${esc(initials(p.name))}</div><div class="main-col" style="min-width:160px"><b>${esc(p.name)}</b><div class="sub">${T('Visit')} ${dShort(last)}</div></div><div class="row-flex" style="gap:6px">${p.phone && st.googleReview ? waBtn(cReviewMsg(p), p.phone, T('Ask for review')) : ''}${edit ? `<button class="btn sm ghost" onclick="A.cReviewAsked('${p.id}')">${ic('check')} ${T('Asked')}</button>` : ''}</div></div>`).join('') || empty('No recent patient to ask', 'Patients seen in the last 15 days show here.', '', 'star', '#F59E0B')}</div></div>`;
}
A.saveReviewLink = async e => { e.preventDefault(); const v = readForm(e.target); try { await saveSettingsRec({ googleReview: (v.googleReview || '').trim() }); toast('Saved'); render(); } catch (err) { toast(err.message, 'bad'); } };
A.cReviewAsked = async pid => { const p = patientById(pid); try { await save('patients', { ...p, reviewAskedAt: todayLocal() }); render(); } catch (e) { toast(e.message, 'bad'); } };
const HEALTH_MSGS = [
  ['Festival greeting', 'Namaste {name} ji 🙏\n{clinic} wishes you and your family a very happy festival. Stay healthy and safe!\n{phone}', 'नमस्ते {name} जी 🙏\n{clinic} की ओर से आपको और आपके परिवार को त्योहार की हार्दिक शुभकामनाएं। स्वस्थ रहें, सुरक्षित रहें!\n{phone}'],
  ['Free check-up camp', 'Namaste {name} ji 🙏\n{clinic} is holding a FREE health check-up camp (BP, sugar, weight) on ____ from __ to __. Bring your family. Reply to book a slot.\n{phone}', 'नमस्ते {name} जी 🙏\n{clinic} में ____ को __ से __ बजे तक मुफ़्त जांच शिविर (बीपी, शुगर, वज़न) है। परिवार के साथ आएं। समय बुक करने के लिए जवाब दें।\n{phone}'],
  ['Rainy season care', 'Namaste {name} ji 🙏\nRainy season tips from {clinic}: drink boiled or filtered water, keep water from collecting (dengue, malaria), use mosquito nets. Fever for more than 2 days? Please see us.\n{phone}', 'नमस्ते {name} जी 🙏\n{clinic} की ओर से बारिश के मौसम की सलाह: उबला या फ़िल्टर पानी पिएं, कहीं पानी जमा न होने दें (डेंगू, मलेरिया), मच्छरदानी लगाएं। 2 दिन से ज़्यादा बुखार हो तो दिखाने आएं।\n{phone}'],
  ['Winter care', 'Namaste {name} ji 🙏\nWinter care from {clinic}: keep warm, walk daily, check your BP and sugar regularly. Elderly and children: take extra care against cold and cough.\n{phone}', 'नमस्ते {name} जी 🙏\n{clinic} की ओर से सर्दी में सलाह: गर्म कपड़े पहनें, रोज़ टहलें, बीपी और शुगर नियमित जांचें। बुज़ुर्ग और बच्चे सर्दी-खांसी से ख़ास बचें।\n{phone}'],
  ['New timing / service', 'Namaste {name} ji 🙏\nGood news from {clinic}: ________. Timings: {timings}\n{phone}', 'नमस्ते {name} जी 🙏\n{clinic} से ख़ुशख़बरी: ________। समय: {timings}\n{phone}'],
  ['Clinic closed', 'Namaste {name} ji 🙏\n{clinic} will be closed on ____. For emergencies please call {phone}.', 'नमस्ते {name} जी 🙏\n{clinic} ____ को बंद रहेगा। ज़रूरत हो तो {phone} पर कॉल करें।']];
function cmkMessages() {
  const st = settings(); const i = +(S.filters.hmIdx || 0); const who = S.filters.hmWho || 'all'; const cond = (S.filters.hmCond || '').toLowerCase(); const t = todayLocal();
  const tpl = HEALTH_MSGS[i] || HEALTH_MSGS[0]; const raw = (S.filters.hmText ?? '') || (I18N.lang === 'hi' ? tpl[2] : tpl[1]);
  const fill = (s, p) => s.replace(/\{name\}/g, p ? p.name : '…').replace(/\{clinic\}/g, st.bizName || '').replace(/\{phone\}/g, st.phone || '').replace(/\{timings\}/g, st.timings || '');
  let list = col('patients').filter(p => p.phone);
  if (who === 'recent') list = list.filter(p => { const l = lastVisitOf(p.id); return l && daysBetween(l, t) <= 90; });
  if (who === 'cond' && cond) list = list.filter(p => String(p.conditions || '').toLowerCase().includes(cond));
  return `<div class="banner" style="margin-bottom:12px">${ic('wa')}<span>${T('WhatsApp does not allow one-tap bulk messages from a normal number. Tap Send on each patient; the message is ready, you only press send.')}</span></div>
  <div class="split"><div class="card pad stack-sm"><div class="field"><span>${T('Message')}</span><div class="chips">${HEALTH_MSGS.map((m, j) => `<button class="chip ${j === i ? 'on' : ''}" onclick="S.filters.hmText='';A.setF('hmIdx','${j}')">${T(m[0])}</button>`).join('')}</div></div>
    <label class="field"><span>${T('Edit the message ({name} becomes the patient’s name)')}</span><textarea rows="7" onchange="S.filters.hmText=this.value;render()">${esc(raw)}</textarea></label>
    <div class="field"><span>${T('Send to')}</span>${seg('hmWho', [['all', 'All patients'], ['recent', 'Seen in 90 days'], ['cond', 'By illness']], who, 'A.setF')}</div>
    ${who === 'cond' ? `<input placeholder="${T('e.g. diabetes, BP, thyroid')}" value="${esc(S.filters.hmCond || '')}" onchange="A.setF('hmCond',this.value)">` : ''}</div>
  <div class="card"><div class="card-h"><h3>${list.length} ${T('patients')}</h3>${list.length ? `<button class="btn sm" onclick="A.copyNumbers()">${ic('copy')} ${T('Copy numbers')}</button>` : ''}</div><div class="rows" style="max-height:60vh;overflow:auto">${list.slice(0, 300).map(p => `<div class="row"><div class="main-col"><b>${esc(p.name)}</b><div class="sub">${esc(p.phone)}${p.conditions ? ' · ' + esc(p.conditions) : ''}</div></div>${waBtn(fill(raw, p), p.phone, T('Send'))}</div>`).join('') || empty('No patient with a mobile number', '')}</div></div></div>`;
}
A.copyNumbers = () => { const who = S.filters.hmWho || 'all'; const cond = (S.filters.hmCond || '').toLowerCase(); const t = todayLocal(); let list = col('patients').filter(p => p.phone); if (who === 'recent') list = list.filter(p => { const l = lastVisitOf(p.id); return l && daysBetween(l, t) <= 90; }); if (who === 'cond' && cond) list = list.filter(p => String(p.conditions || '').toLowerCase().includes(cond)); const txt = list.map(p => '+91' + String(p.phone).replace(/\D/g, '').slice(-10)).join('\n'); navigator.clipboard?.writeText(txt).then(() => toast(`${list.length} ${T('numbers copied')}`), () => toast('Could not copy', 'bad')); };
function clinicCardText() { const st = settings(); return `*${st.bizName || ''}*\nDr. ${st.doctorName || ''}${st.qualification ? ' (' + st.qualification + ')' : ''}${st.specialisation ? '\n' + T(st.specialisation) : ''}${st.timings ? '\n🕘 ' + st.timings : ''}${st.address || st.city ? '\n📍 ' + [st.address, st.city].filter(Boolean).join(', ') : ''}\n📞 ${st.phone || ''}${st.googleReview ? `\n⭐ ${T('Our reviews')}: ${st.googleReview}` : ''}`; }
function cmkShare() {
  const P = S.platform || DEFAULT_PLATFORM; const link = `https://sabmanage.com/?ref=${refCode(S.org.orgId)}`;
  const msg = I18N.lang === 'hi' ? `नमस्ते डॉक्टर साहब 🙏 मैं अपने क्लिनिक के मरीज़, रीडिंग, अपॉइंटमेंट, फ़ीस और स्टाफ़ का पूरा हिसाब ${P.appName || 'SabManage'} ऐप पर रखता हूं। आप भी देखिए: ${link}` : `Namaste Doctor 🙏 I run my clinic's patients, readings, appointments, fees and staff on ${P.appName || 'SabManage'}. Have a look: ${link}`;
  return `<div class="grid g-auto"><div class="card pad stack">${ibox('share', '#0B9B68', 'lg')}<h3>${T('Share your clinic')}</h3><p class="small muted">${T('Your timings, address, phone and review link in one message. Send to new patients or post in WhatsApp groups.')}</p><pre class="share-pre">${esc(clinicCardText())}</pre><div class="row-flex">${waBtn(clinicCardText(), '', T('Send on WhatsApp'), 'btn wa')}</div></div>
    ${S.role === 'owner' ? `<div class="card pad stack">${ibox('gift', '#E11D74', 'lg')}<h3>${T('Refer another doctor')}</h3><p class="small muted">${T('Know a doctor who could use this? Send them your link.')}${P.referralReward ? ' ' + esc(P.referralReward) : ''}</p>${waBtn(msg, '', T('Send on WhatsApp'), 'btn wa')}</div>` : ''}</div>`;
}

/* ---------- switch the pages for clinics ---------- */
const _vStaff = V.staff, _vExp = V.expenses, _vRep = V.reports, _vMk = V.marketing;
V.staff = () => isClinic() ? clinicStaff() : _vStaff();
V.expenses = () => isClinic() ? clinicExpenses() : _vExp();
V.reports = () => isClinic() ? clinicReports() : _vRep();
V.marketing = () => isClinic() ? clinicMarketing() : _vMk();
const _enquiryLink = enquiryLink; enquiryLink = () => isClinic() ? waLink('Namaste, I want an appointment', settings().phone) : _enquiryLink();

A.salRule = async o => { try { await saveSettingsRec(o); render(); } catch (e) { toast(e.message, 'bad'); } };
A.payoutUndo = id => confirmBox('Undo paid?', '', 'Undo', async () => { await removeRec('payouts', id, 'Undid a salary payment mark'); A.closeModal(); render(); });
