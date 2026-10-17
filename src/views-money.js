const VENDOR_ICON = { 'Floral & Decor': 'sparkle', 'DJ / Sound / Dhol': 'music', 'Grocery & Dairy': 'cart', 'Crockery Partner': 'utensils', 'Generator / Diesel': 'bolt', 'Photo & Video': 'eye', 'Transport': 'truck', 'Other': 'handshake' };
/* ================= Invoices ================= */
function invRow(i) { const c = invCalc(i); const [s, tone] = invStatus(i, c); return `<div class="row click" onclick="A.go('invoice',{id:'${i.id}'})">${ibox(i.type === 'quotation' ? 'edit' : 'receipt', i.type === 'quotation' ? '#7C3AED' : '#DB2777')}<div class="main-col"><b>${esc(i.client || 'Client')}</b><div class="sub"><span class="mono tiny">${esc(i.no)}</span> · ${fmtShort(i.date)}${i.type === 'invoice' && c.balance > 0 ? ' · due ' + inr(c.balance) : ''}</div></div><div class="end stack-sm" style="align-items:flex-end;gap:4px"><b class="num">${inr(c.total)}</b>${pill(s, tone)}</div></div>`; }
async function createInvoiceFor(e, type, lines) {
  need('invoices', 2); const st = settings();
  const cnt = getById('counters', 'main') || { id: 'main', inv: 0, qt: 0 }; const k = type === 'invoice' ? 'inv' : 'qt'; cnt[k] = (+cnt[k] || 0) + 1;
  const no = `${type === 'invoice' ? st.invPrefix : st.qtPrefix}/${fyOf()}/${String(cnt[k]).padStart(3, '0')}`;
  await save('counters', cnt);
  const inv = { id: uid('v_'), no, type, eventId: e?.id || '', client: e?.client || '', phone: e?.phone || '', email: e?.email || '', address: '', clientGstin: '', date: todayLocal(), dueDate: addDays(todayLocal(), +st.dueDays || 7), gstMode: 'excl', gstRate: +st.gstRate || 18, interstate: false, discount: 0, lines: lines || [], notes: '' };
  await save('invoices', inv, `Created ${type} ${no}${e ? ' for ' + e.title : ''}`); return inv;
}
A.newInvoice = evId => {
  const evs = col('events').filter(e => e.stage !== 'Cancelled').sort(by('date'));
  formModal({ title: 'New quotation or invoice', fields: [
    { name: 'type', label: 'Document', type: 'select', options: [['quotation', 'Quotation / Estimate'], ['invoice', 'Tax invoice']], value: 'quotation' },
    { name: 'eventId', label: 'For booking', type: 'select', options: [['', '— Walk-in / no booking —'], ...evs.map(e => [e.id, `${e.title} (${fmtShort(e.date)})`])], value: evId || '' }],
    submit: 'Create', onSubmit: async v => { const e = v.eventId ? evById(v.eventId) : null; const inv = await createInvoiceFor(e, v.type, e && e.budget && !(e.items || []).length ? [{ id: uid('l'), desc: `${e.type} package: ${e.title}`, qty: 1, rate: +e.budget, days: 1, hsn: settings().sac }] : []); A.go('invoice', { id: inv.id }); } });
};
V.invoices = () => {
  const f = S.filters.invF || 'All';
  const list = col('invoices').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const inv = list.filter(i => i.type === 'invoice'); const calcs = inv.map(i => invCalc(i));
  const billed = sum(calcs, c => c.total), due = sum(calcs, c => Math.max(0, c.balance)), gst = sum(calcs, c => c.gst);
  const over = inv.filter(i => invStatus(i)[0] === 'Overdue');
  return pageHead('Invoices & quotations', 'GST tax invoices, estimates and bills of supply.', can('invoices', 2) ? `<button class="btn primary" onclick="A.newInvoice()">${ic('plus')} New</button>` : '') +
  `<div class="kpis">${kpi('Billed (all time)', inr(billed), '', '', 'receipt', '#DB2777')}${kpi('Pending', inr(due), inv.filter(i => invCalc(i).balance > 0).length + ' invoices', due ? 'bad' : '', 'clock', '#E0344B')}${kpi('Overdue', over.length, over.length ? inr(sum(over, i => invCalc(i).balance)) : 'None', over.length ? 'bad' : 'good')}${kpi('GST collected', inr(gst), 'Output tax on invoices', '', 'building', '#0891B2')}</div>
  <div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search client or number" value="${esc(S.filters.invQ2 || '')}" oninput="A.invQ(this.value)"></div></div>
  <div class="chips" style="margin-bottom:12px">${['All', 'Quotations', 'Unpaid', 'Overdue', 'Paid'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('invF','${c}')">${c}</button>`).join('')}</div>
  <div class="card"><div class="rows" id="invList">${invListRows()}</div></div>`;
};
function invListRows() {
  const f = S.filters.invF || 'All'; const q = (S.filters.invQ2 || '').toLowerCase();
  let list = col('invoices').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (f === 'Quotations') list = list.filter(i => i.type === 'quotation');
  if (f === 'Unpaid') list = list.filter(i => i.type === 'invoice' && invCalc(i).balance > 0);
  if (f === 'Overdue') list = list.filter(i => invStatus(i)[0] === 'Overdue');
  if (f === 'Paid') list = list.filter(i => invStatus(i)[0] === 'Paid');
  if (q) list = list.filter(i => (i.client + ' ' + i.no).toLowerCase().includes(q));
  return list.map(invRow).join('') || empty('Nothing here', 'Create a quotation from a booking or tap New.');
}
A.invQ = v => { S.filters.invQ2 = v; $('#invList').innerHTML = invListRows(); };

/* Editor */
V.invoice = () => {
  const rec = getById('invoices', S.params.id); if (!rec) return empty('Invoice not found', '', `<button class="btn" onclick="A.go('invoices')">Back</button>`);
  if (!S.draft || S.draft.id !== rec.id) S.draft = JSON.parse(JSON.stringify(rec));
  const d = S.draft; const edit = can('invoices', 2); const ro = edit ? '' : 'disabled'; const c = invCalc(d); const [st, tone] = invStatus(d, c);
  const evs = col('events').sort(by('date'));
  const inp = (k, label, type = 'text', extra = '') => `<label class="field"><span>${label}</span><input ${ro} type="${type}" value="${esc(d[k] ?? '')}" oninput="A.dset('${k}',this.value)" ${extra}></label>`;
  return pageHead(`${d.type === 'quotation' ? 'Quotation' : 'Tax invoice'} ${d.no}`, d.client || 'New document',
    `${pill(st, tone)}<button class="btn sm" onclick="A.previewInv()">${ic('eye')} Preview</button>${waBtn(invShareText(d), d.phone, 'Send')}${edit ? `<button class="btn primary sm" onclick="A.saveInv()">${ic('check')} Save</button>` : ''}`, `A.leaveInv()`) +
  `<div class="split"><div class="stack">
    <div class="card pad"><div class="grid2" style="padding:0">
      ${inp('client', 'Client name')}${inp('phone', 'Mobile', 'tel')}
      ${inp('address', 'Billing address')}${inp('clientGstin', 'Client GSTIN (for B2B)', 'text', 'maxlength="15" style="text-transform:uppercase"')}
      ${inp('date', 'Date', 'date')}${inp('dueDate', 'Due date', 'date')}
      <label class="field"><span>Booking</span><select ${ro} onchange="A.dset('eventId',this.value)"><option value="">— None —</option>${evs.map(e => `<option value="${e.id}" ${d.eventId === e.id ? 'selected' : ''}>${esc(e.title)} (${fmtShort(e.date)})</option>`).join('')}</select></label>
      <label class="field"><span>Document type</span><select ${ro} onchange="A.dset('type',this.value)"><option value="quotation" ${d.type === 'quotation' ? 'selected' : ''}>Quotation / Estimate</option><option value="invoice" ${d.type === 'invoice' ? 'selected' : ''}>Tax invoice</option></select></label>
    </div></div>
    <div class="card"><div class="card-h"><h3>Line items</h3>${edit ? `<div class="row-flex">${d.eventId ? `<button class="btn sm" onclick="A.importLines('items')">Booked items</button><button class="btn sm" onclick="A.importLines('menu')">Menu</button>` : ''}<button class="btn sm" onclick="A.pickInv()">From godown</button><button class="btn sm primary" onclick="A.addLine()">${ic('plus')} Line</button></div>` : ''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="min-width:260px">Description</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Days</th><th class="r">Rate</th><th class="r">Amount</th><th></th></tr></thead><tbody>
    ${d.lines.map((l, i) => `<tr><td><input ${ro} class="inline-in" value="${esc(l.desc)}" oninput="A.lset(${i},'desc',this.value)"></td><td><input ${ro} class="inline-in mono" style="width:84px" value="${esc(l.hsn || '')}" oninput="A.lset(${i},'hsn',this.value)"></td><td class="r"><input ${ro} class="inline-in num" type="number" min="0" style="width:74px;text-align:right" value="${l.qty}" oninput="A.lset(${i},'qty',this.value)"></td><td class="r"><input ${ro} class="inline-in num" type="number" min="1" style="width:58px;text-align:right" value="${l.days || 1}" oninput="A.lset(${i},'days',this.value)"></td><td class="r"><input ${ro} class="inline-in num" type="number" min="0" style="width:96px;text-align:right" value="${l.rate}" oninput="A.lset(${i},'rate',this.value)"></td><td class="r"><b id="lt${i}">${inr((+l.qty || 0) * (+l.rate || 0) * (+l.days || 1))}</b></td><td>${edit ? `<button class="btn sm ghost" onclick="A.delLine(${i})" aria-label="Remove line">${ic('trash')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${empty('No lines yet', 'Add a line, or import booked items / the menu.')}</td></tr>`}
    </tbody></table></div></div>
    <div class="card pad"><label class="field"><span>Notes printed on the bill</span><textarea ${ro} rows="2" oninput="A.dset('notes',this.value)">${esc(d.notes || '')}</textarea></label></div>
  </div>
  <div class="stack"><div class="card pad stack">
    <div class="field"><span>GST treatment</span>${seg('gstMode', [['excl', '+ GST'], ['incl', 'Incl. GST'], ['none', 'No GST']], d.gstMode, edit ? 'A.dsetSeg' : 'void')}</div>
    <div class="grid2" style="padding:0"><label class="field"><span>GST rate %</span><select ${ro} onchange="A.dset('gstRate',this.value)">${[0, 5, 12, 18, 28].map(r => `<option ${+d.gstRate === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label class="field"><span>Discount ₹</span><input ${ro} type="number" min="0" value="${d.discount || 0}" oninput="A.dset('discount',this.value)"></label></div>
    <label class="check"><input type="checkbox" ${ro} ${d.interstate ? 'checked' : ''} onchange="A.dset('interstate',this.checked)"> <span>Client outside ${esc(settings().state || 'state')} (IGST)</span></label>
    <div id="invTotals">${totalsHTML(d)}</div>
    ${d.type === 'quotation' && !d.converted && edit ? `<button class="btn accent block" onclick="A.convertQuote()">${ic('check')} Client approved: make tax invoice</button>` : ''}
    ${d.type === 'invoice' && can('payments', 2) && c.balance > 0 ? `<button class="btn primary block" onclick="A.paymentForm('${d.id}')">${ic('rupee')} Record payment</button>` : ''}
    ${can('invoices', 3) ? `<button class="btn ghost danger sm" onclick="A.delInv('${d.id}')">${ic('trash')} Delete document</button>` : ''}
  </div>
  ${c.pays.length ? `<div class="card"><div class="card-h"><h3>Payments</h3></div><div class="rows">${c.pays.map(payRow).join('')}</div></div>` : ''}</div></div>`;
};
function totalsHTML(d) {
  const c = invCalc(d); const r = +d.gstRate || 0;
  const line = (l, v, b = '') => `<div class="row-flex" style="justify-content:space-between;${b}"><span class="muted">${l}</span><b class="num">${v}</b></div>`;
  return `<div class="stack-sm">${line('Subtotal', inr(c.sub))}${c.disc ? line('Discount', '− ' + inr(c.disc)) : ''}${d.gstMode !== 'none' ? line('Taxable value', inr(c.taxable)) + (d.interstate ? line(`IGST ${r}%`, inr(c.igst)) : line(`CGST ${r / 2}%`, inr(c.cgst)) + line(`SGST ${r / 2}%`, inr(c.sgst))) : ''}
  <div class="row-flex" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:8px"><b>Grand total</b><b class="num" style="font:800 22px var(--f-display)">${inr(c.total)}</b></div>
  ${d.type === 'invoice' ? line('Received', inr(c.paid)) + `<div class="row-flex" style="justify-content:space-between"><b>Balance due</b><b class="num" style="color:${c.balance > 0 ? 'var(--bad)' : 'var(--good)'}">${inr(Math.max(0, c.balance))}</b></div>` : ''}
  <span class="tiny muted">${esc(inWords(c.total))} Rupees only</span></div>`;
}
const refreshTotals = () => { const d = S.draft; const el = $('#invTotals'); if (el) el.innerHTML = totalsHTML(d); d.lines.forEach((l, i) => { const t = $('#lt' + i); if (t) t.textContent = inr((+l.qty || 0) * (+l.rate || 0) * (+l.days || 1)); }); S.dirty = true; };
A.dset = (k, v) => { const d = S.draft; const numK = ['gstRate', 'discount']; d[k] = numK.includes(k) ? (+v || 0) : v; if (k === 'eventId' && v) { const e = evById(v); if (e && !d.client) Object.assign(d, { client: e.client, phone: e.phone }); } if (['type', 'eventId'].includes(k)) { S.dirty = true; render(); } else refreshTotals(); };
A.dsetSeg = (k, v) => { S.draft[k] = v; S.dirty = true; render(); };
A.lset = (i, k, v) => { S.draft.lines[i][k] = ['qty', 'rate', 'days'].includes(k) ? (+v || 0) : v; refreshTotals(); };
A.addLine = () => { S.draft.lines.push({ id: uid('l'), desc: '', qty: 1, days: 1, rate: 0, hsn: settings().sac }); S.dirty = true; render(); };
A.delLine = i => { S.draft.lines.splice(i, 1); S.dirty = true; render(); };
A.importLines = kind => {
  const d = S.draft; const e = evById(d.eventId); if (!e) return;
  if (kind === 'items') { const days = Math.max(1, daysBetween(e.date, eventEnd(e)) + 1); (e.items || []).forEach(it => { const item = getById('inventory', it.invId); if (item) d.lines.push({ id: uid('l'), desc: item.name, qty: it.qty, rate: +item.rate || 0, days, hsn: settings().sac }); }); }
  else { const m = e.menu || {}; if (!m.dishIds?.length) { toast('No menu saved on this booking yet', 'warn'); return; } const ds = col('dishes').filter(x => m.dishIds.includes(x.id)); d.lines.push({ id: uid('l'), desc: `Catering buffet: ${ds.map(x => x.name).join(', ')}`, qty: m.pax || e.pax, rate: m.perPlate || 0, days: 1, hsn: '996334' }); }
  S.dirty = true; render();
};
A.pickInv = () => formModal({ title: 'Add from godown', fields: [{ name: 'id', label: 'Item', type: 'select', full: true, options: col('inventory').map(i => [i.id, `${i.name} (${inr(i.rate)}/day)`]) }, { name: 'qty', label: 'Qty', type: 'number', min: 1, value: 1 }, { name: 'days', label: 'Days', type: 'number', min: 1, value: 1 }], submit: 'Add line', onSubmit: v => { const i = getById('inventory', v.id); S.draft.lines.push({ id: uid('l'), desc: i.name, qty: +v.qty, days: +v.days, rate: +i.rate, hsn: settings().sac }); S.dirty = true; setTimeout(render); } });
A.saveInv = async () => { try { const d = S.draft; d.lines = d.lines.filter(l => l.desc || l.rate); await save('invoices', JSON.parse(JSON.stringify(d)), `Saved ${d.no} (${inr(invCalc(d).total)})`); S.dirty = false; toast('Saved ' + d.no); render(); } catch (err) { toast(err.message, 'bad'); } };
A.leaveInv = () => { if (S.dirty && can('invoices', 2)) { confirmBox('Leave without saving?', 'Your changes to this document are not saved yet.', 'Discard changes', () => { S.dirty = false; S.draft = null; A.go('invoices'); }); return; } S.draft = null; A.go('invoices'); };
A.convertQuote = async () => {
  try { const q = S.draft; await A.saveInv(); const e = q.eventId ? evById(q.eventId) : null;
    const inv = await createInvoiceFor(e, 'invoice', JSON.parse(JSON.stringify(q.lines)));
    Object.assign(inv, { client: q.client, phone: q.phone, address: q.address, clientGstin: q.clientGstin, gstMode: q.gstMode, gstRate: q.gstRate, discount: q.discount, interstate: q.interstate, notes: q.notes, fromQuote: q.no });
    await save('invoices', inv); const qr = getById('invoices', q.id); qr.converted = inv.no; await save('invoices', qr, `Converted ${q.no} to ${inv.no}`);
    if (e && ['Enquiry', 'Quoted'].includes(e.stage) && can('bookings', 2)) { e.stage = 'Confirmed'; await save('events', e, `${e.title} confirmed`); }
    S.draft = null; A.go('invoice', { id: inv.id }); toast(`Tax invoice ${inv.no} created`);
  } catch (err) { toast(err.message, 'bad'); }
};
A.delInv = id => { const i = getById('invoices', id); confirmBox('Delete ' + i.no + '?', 'Payments linked to it stay in Payments but lose the link.', 'Delete', async () => { await removeRec('invoices', id, 'Deleted ' + i.no); S.draft = null; S.dirty = false; A.go('invoices'); }); };
function invShareText(d) { const c = invCalc(d); const st = settings(); return `Namaste ${d.client || ''} ji,\n${d.type === 'quotation' ? 'Quotation' : 'Invoice'} ${d.no} from ${st.bizName}\nTotal: ${inr(c.total)}${d.gstMode === 'excl' ? ' (incl. GST)' : ''}${d.type === 'invoice' ? `\nReceived: ${inr(c.paid)}\nBalance: ${inr(Math.max(0, c.balance))}` : ''}${st.upi ? `\nUPI: ${st.upi}` : ''}\nDhanyawad!`; }
function invoicePaper(d) {
  const st = settings(); const c = invCalc(d); const r = +d.gstRate || 0; const title = d.type === 'quotation' ? 'QUOTATION / ESTIMATE' : d.gstMode === 'none' ? 'BILL OF SUPPLY' : 'TAX INVOICE';
  return `<div class="paper" style="--pb:${esc(brandColor(st))}">${paperHead(st, title, `<div class="mono">${esc(d.no)}</div><div class="pm">Date ${fmtDate(d.date)}</div>${d.dueDate ? `<div class="pm">${d.type === 'quotation' ? 'Valid till' : 'Due'} ${fmtDate(d.dueDate)}</div>` : ''}`)}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0;padding:12px;border:1px solid var(--paper-line);border-radius:8px"><div><div class="pm" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Bill to</div><b>${esc(d.client)}</b><div class="pm">${esc(d.address || '')}</div><div class="pm">${esc(d.phone || '')}</div>${d.clientGstin ? `<div class="pm mono">GSTIN ${esc(d.clientGstin)}</div>` : ''}</div>
  ${d.eventId && evById(d.eventId) ? (e => `<div><div class="pm" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Event</div><b>${esc(e.title)}</b><div class="pm">${esc(e.venue || '')}</div><div class="pm">${fmtDate(e.date)}${e.endDate && e.endDate !== e.date ? ' – ' + fmtDate(e.endDate) : ''} · ${num(e.pax)} pax</div></div>`)(evById(d.eventId)) : ''}
  <div><div class="pm" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Place of supply</div><b>${d.interstate ? 'Outside ' + esc(st.state) : esc(st.state) + ' (' + esc(st.stateCode) + ')'}</b></div></div>
  <div class="paper-wrap"><table><thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Days</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${d.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.desc)}</td><td class="mono">${esc(l.hsn || '')}</td><td class="r">${num(l.qty)}</td><td class="r">${l.days || 1}</td><td class="r">${num(l.rate)}</td><td class="r">${num((+l.qty || 0) * (+l.rate || 0) * (+l.days || 1))}</td></tr>`).join('')}</tbody></table>
  <table style="margin-top:8px;max-width:340px;margin-left:auto" class="tot"><tbody><tr><td>Subtotal</td><td class="r">${inr(c.sub)}</td></tr>${c.disc ? `<tr><td>Discount</td><td class="r">− ${inr(c.disc)}</td></tr>` : ''}${d.gstMode !== 'none' ? `<tr><td>Taxable value</td><td class="r">${inr(c.taxable)}</td></tr>${d.interstate ? `<tr><td>IGST @ ${r}%</td><td class="r">${inr(c.igst)}</td></tr>` : `<tr><td>CGST @ ${r / 2}%</td><td class="r">${inr(c.cgst)}</td></tr><tr><td>SGST @ ${r / 2}%</td><td class="r">${inr(c.sgst)}</td></tr>`}` : ''}<tr class="grand"><td>Grand total</td><td class="r">${inr(c.total)}</td></tr>${d.type === 'invoice' && c.paid ? `<tr><td>Received</td><td class="r">${inr(c.paid)}</td></tr><tr><td><b>Balance due</b></td><td class="r"><b>${inr(Math.max(0, c.balance))}</b></td></tr>` : ''}</tbody></table></div>
  <p style="margin-top:8px"><b>Amount in words:</b> ${esc(inWords(c.total))} Rupees only</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:18px;font-size:12px"><div><b>Terms</b><div class="pm" style="white-space:pre-line">${esc(d.notes ? d.notes + '\n' : '')}${esc(st.terms || '')}</div></div>
  <div><b>Pay to</b><div class="pm">${esc(st.bizName)}</div>${st.bank ? `<div class="pm">${esc(st.bank)}</div>` : ''}${st.account ? `<div class="pm mono">A/c ${esc(st.account)} · IFSC ${esc(st.ifsc || '')}</div>` : ''}${st.upi ? `<div class="pm mono">UPI ${esc(st.upi)}</div>` : ''}${signBlock(st)}</div></div></div>`;
}
A.previewInv = () => { const d = S.draft || getById('invoices', S.params.id); modal(`${sheetHead('Preview', d.no)}<div class="sheet-b"><div id="printArea">${invoicePaper(d)}</div></div><footer class="sheet-f no-print">${waBtn(invShareText(d), d.phone, 'Send on WhatsApp')}<span class="grow"></span>${!FRAMED ? `<button class="btn primary" onclick="window.print()">${ic('print')} Print / Save PDF</button>` : `<span class="tiny muted">Print and PDF work on your deployed site.</span>`}</footer>`, { wide: true }); };

/* ================= Payments ================= */
function payRow(p) { const inv = getById('invoices', p.invoiceId); return `<div class="row click" onclick="A.receipt('${p.id}')">${ibox(p.mode === 'Cash' ? 'wallet' : 'rupee', '#0B9B68')}<div class="main-col"><b class="num">${inr(p.amount)}</b><div class="sub">${fmtShort(p.date)} · ${esc(p.mode)}${p.ref ? ' · ' + esc(p.ref) : ''}${inv ? ' · ' + esc(inv.no) : ''}</div></div>${pill(inv?.client || evById(p.eventId)?.client || 'Advance', 'good')}</div>`; }
V.payments = () => {
  const tab = S.params.tab || 'due';
  const pays = col('payments').slice().sort((a, b) => b.date.localeCompare(a.date));
  const ms = todayLocal().slice(0, 8) + '01';
  const dueList = col('invoices').filter(i => i.type === 'invoice').map(i => ({ i, c: invCalc(i) })).filter(x => x.c.balance > 0).sort((a, b) => (a.i.dueDate || '').localeCompare(b.i.dueDate || ''));
  const aging = [[0, 0], [1, 30], [31, 60], [61, 9999]].map(([a, b]) => sum(dueList.filter(x => { const d = x.i.dueDate ? daysBetween(x.i.dueDate, todayLocal()) : 0; return a === 0 ? d <= 0 : d >= a && d <= b; }), x => x.c.balance));
  return pageHead('Payments', 'Collections, receipts and polite payment reminders.', can('payments', 2) ? `<button class="btn primary" onclick="A.paymentForm()">${ic('plus')} Record payment</button>` : '') +
  `<div class="kpis">${kpi('Not yet due', inr(aging[0]))}${kpi('1–30 days late', inr(aging[1]), '', aging[1] ? 'bad' : '')}${kpi('31–60 days', inr(aging[2]), '', aging[2] ? 'bad' : '')}${kpi('60+ days', inr(aging[3]), '', aging[3] ? 'bad' : '')}</div>
  <div class="tabs"><button class="${tab === 'due' ? 'on' : ''}" onclick="A.setP('tab','due')">Receivables (${dueList.length})</button><button class="${tab === 'recv' ? 'on' : ''}" onclick="A.setP('tab','recv')">Received · ${inr(sum(pays.filter(p => p.date >= ms), p => p.amount))} this month</button>${tabHelp('pay-' + tab)}</div>
  ${tab === 'due' ? `<div class="card"><div class="rows">${dueList.map(({ i, c }) => { const late = i.dueDate ? daysBetween(i.dueDate, todayLocal()) : 0; const st = settings();
    const msg = `Namaste ${i.client} ji 🙏\nGentle reminder from ${st.bizName}: ${inr(c.balance)} is pending against ${i.no}${i.dueDate ? ' (due ' + fmtDate(i.dueDate) + ')' : ''}.${st.upi ? `\nUPI: ${st.upi}` : ''}${st.account ? `\nBank: ${st.bank} A/c ${st.account} IFSC ${st.ifsc}` : ''}\nPlease share the payment screenshot once done. Dhanyawad!`;
    return `<div class="row">${ibox(late > 0 ? 'alert' : 'clock', late > 0 ? '#E0344B' : '#D97706')}<div class="main-col"><b>${esc(i.client)}</b><div class="sub"><span class="mono tiny">${esc(i.no)}</span><br>Total ${inr(c.total)} · paid ${inr(c.paid)}</div></div><div class="end stack-sm" style="align-items:flex-end;gap:6px"><b class="num" style="color:var(--bad)">${inr(c.balance)}</b>${late > 0 ? pill(late + ' days late', 'bad') : pill('Due ' + fmtShort(i.dueDate), 'warn')}<div class="row-flex" style="gap:4px">${waBtn(msg, i.phone, 'Remind')}${can('payments', 2) ? `<button class="btn sm" onclick="A.paymentForm('${i.id}')">Received</button>` : ''}</div></div></div>`; }).join('') || empty('No pending payments', 'Every invoice is fully paid. Shabaash!')}</div></div>`
    : `<div class="card"><div class="rows">${pays.map(payRow).join('') || empty('No payments yet', 'Record advances and balances as they come in.')}</div></div>`}`;
};
A.paymentForm = (invoiceId, evId) => {
  const open = col('invoices').filter(i => i.type === 'invoice' && (invoiceId ? i.id === invoiceId : invCalc(i).balance > 0) && (!evId || i.eventId === evId));
  const opts = [...open.map(i => [i.id, `${i.no} · ${i.client} · due ${inr(invCalc(i).balance)}`]), ['', evId ? 'Advance for this booking (no invoice yet)' : 'Advance / other (no invoice)']];
  const first = open[0]; const evs = col('events').filter(e => e.stage !== 'Cancelled').sort(by('date'));
  formModal({ title: 'Record payment received', fields: [
    { name: 'invoiceId', label: 'Against', type: 'select', options: opts, value: invoiceId || first?.id || '', full: true },
    ...(evId || invoiceId ? [] : [{ name: 'eventId', label: 'Booking (for advances)', type: 'select', options: [['', '—'], ...evs.map(e => [e.id, e.title])] }]),
    { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: first ? Math.max(0, invCalc(first).balance) : '' },
    { name: 'date', label: 'Date', type: 'date', value: todayLocal(), required: true }, { name: 'mode', label: 'Mode', type: 'select', options: PAY_MODES },
    { name: 'ref', label: 'UTR / cheque / note', full: true }],
    submit: 'Save payment', onSubmit: async v => { if (!(+v.amount > 0)) throw new Error('Enter the amount received'); const inv = getById('invoices', v.invoiceId);
      const p = { id: uid('p_'), invoiceId: v.invoiceId || '', eventId: inv?.eventId || v.eventId || evId || '', amount: +v.amount, date: v.date, mode: v.mode, ref: v.ref, by: S.me?.name };
      await save('payments', p, `Recorded payment ${inr(p.amount)}${inv ? ' for ' + inv.no : ''}`); if (S.draft && inv && S.draft.id === inv.id) S.draft = null; render(); setTimeout(() => A.receipt(p.id), 50); } });
};
A.receipt = id => {
  const p = getById('payments', id); const inv = getById('invoices', p.invoiceId); const e = evById(p.eventId); const st = settings(); const client = inv?.client || e?.client || '';
  const msg = `Payment receipt · ${st.bizName}\nReceived ${inr(p.amount)} from ${client} on ${fmtDate(p.date)} via ${p.mode}${p.ref ? ' (' + p.ref + ')' : ''}${inv ? `\nAgainst ${inv.no}. Balance now ${inr(Math.max(0, invCalc(inv).balance))}` : ''}\nDhanyawad!`;
  modal(`${sheetHead('Payment receipt', `RCPT-${id.slice(-6).toUpperCase()}`)}<div class="sheet-b"><div class="paper" style="--pb:${esc(brandColor(st))}">${paperHead(st, 'PAYMENT RECEIPT', `<div class="mono">RCPT-${esc(id.slice(-6).toUpperCase())}</div><div class="pm">${fmtDate(p.date)}</div>`)}<p style="margin-top:14px">Received with thanks from <b>${esc(client)}</b> the sum of <b>${inr(p.amount)}</b> (${esc(inWords(p.amount))} Rupees only) by ${esc(p.mode)}${p.ref ? ' · ' + esc(p.ref) : ''} on ${fmtDate(p.date)}${inv ? ` against ${esc(inv.no)}` : ''}.</p>${inv ? `<p class="pm" style="margin-top:8px">Balance after this payment: <b>${inr(Math.max(0, invCalc(inv).balance))}</b></p>` : ''}${signBlock(st)}</div></div>
  <footer class="sheet-f">${waBtn(msg, inv?.phone || e?.phone, 'Send receipt')}<span class="grow"></span>${can('payments', 3) ? `<button class="btn danger sm" onclick="A.delPay('${id}')">${ic('trash')} Delete</button>` : ''}</footer>`);
};
A.delPay = id => { const p = getById('payments', id); confirmBox('Delete payment?', `${inr(p.amount)} on ${fmtDate(p.date)} will be removed.`, 'Delete', async () => { await removeRec('payments', id, `Deleted payment ${inr(p.amount)}`); render(); }); };

/* ================= Vendors & POs ================= */
function poRow(p) { const v = getById('vendors', p.vendorId); const bal = (+p.amount || 0) - (+p.paid || 0); return `<div class="row click" onclick="A.poForm('${p.id}')">${ibox('handshake', '#D97706')}<div class="main-col"><b>${esc(v?.name || 'Vendor')}</b><div class="sub"><span class="mono">${esc(p.no)}</span> · ${esc(p.desc || '')}${p.eventId ? ' · ' + esc(evById(p.eventId)?.title || '') : ''}</div></div><div class="end stack-sm" style="align-items:flex-end;gap:4px"><b class="num">${inr(p.amount)}</b>${bal > 0 ? pill('Pay ' + inr(bal), 'warn') : pill('Settled', 'good')}</div></div>`; }
V.vendors = () => {
  const tab = S.params.tab || 'pos'; const pos = col('pos').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const owed = sum(pos, p => (+p.amount || 0) - (+p.paid || 0));
  return pageHead('Vendors & purchase orders', 'Florists, DJ, dairy, crockery partners. Issue POs and track what you owe.', can('vendors', 2) ? `${importBtn('vendors')}<button class="btn" onclick="A.vendorForm()">${ic('plus')} Vendor</button><button class="btn primary" onclick="A.poForm()">${ic('plus')} Issue PO</button>` : '') +
  `<div class="kpis">${kpi('Vendors', col('vendors').length)}${kpi('Open POs', pos.filter(p => (+p.amount || 0) > (+p.paid || 0)).length)}${kpi('You owe vendors', inr(owed), '', owed ? 'bad' : 'good')}${kpi('Paid to vendors', inr(sum(pos, p => p.paid)))}</div>
  <div class="tabs"><button class="${tab === 'pos' ? 'on' : ''}" onclick="A.setP('tab','pos')">Purchase orders</button><button class="${tab === 'list' ? 'on' : ''}" onclick="A.setP('tab','list')">Vendor list</button>${tabHelp(tab === 'list' ? 'ven-list' : 'ven-pos')}</div>
  ${tab === 'pos' ? `<div class="card"><div class="rows">${pos.map(poRow).join('') || empty('No POs yet', 'Issue a PO when you book a florist, DJ or supplier.')}</div></div>`
    : `<div class="grid g-auto">${col('vendors').map(v => { const vp = col('pos').filter(p => p.vendorId === v.id); const bal = sum(vp, p => (+p.amount || 0) - (+p.paid || 0)); return `<div class="card pad stack-sm"><div class="row-flex" style="justify-content:space-between;flex-wrap:nowrap">${ibox(VENDOR_ICON[v.category] || 'handshake', '#D97706')}<div style="min-width:0;flex:1"><b>${esc(v.name)}</b><div class="tiny muted">${esc(v.category)} · ${esc(v.phone || '')}</div></div>${bal > 0 ? pill('Owe ' + inr(bal), 'warn') : pill('Clear', 'good')}</div><span class="small muted">${vp.length} POs · ${inr(sum(vp, p => p.amount))} total</span><div class="row-flex">${v.phone ? waBtn('Namaste ' + v.name + ' ji, ', v.phone, 'Message') : ''}${can('vendors', 2) ? `<button class="btn sm" onclick="A.vendorForm('${v.id}')">${ic('edit')} Edit</button>` : ''}</div></div>`; }).join('') || `<div class="card">${empty('No vendors', 'Add your regular partners once, then issue POs in seconds.')}</div>`}</div>`}`;
};
A.vendorForm = id => { const v = id ? getById('vendors', id) : {}; formModal({ title: id ? 'Edit vendor' : 'Add vendor', fields: [{ name: 'name', label: 'Vendor / firm name', value: v.name, required: true, full: true }, { name: 'category', label: 'Service', type: 'select', options: VENDOR_CATS, value: v.category }, { name: 'phone', label: 'Mobile', type: 'tel', value: v.phone }, { name: 'gstin', label: 'GSTIN', value: v.gstin }, { name: 'notes', label: 'Notes (rates, bank, UPI)', value: v.notes }],
  left: id && can('vendors', 3) ? `<button type="button" class="btn danger" onclick="A.delVendor('${id}')">${ic('trash')}</button>` : '', onSubmit: async x => { await save('vendors', Object.assign(id ? v : { id: uid('vd_') }, x), `${id ? 'Updated' : 'Added'} vendor ${x.name}`); render(); } }); };
A.delVendor = id => { const v = getById('vendors', id); confirmBox('Delete vendor?', v.name, 'Delete', async () => { await removeRec('vendors', id, 'Deleted vendor ' + v.name); render(); }); };
A.poForm = (id, evId) => {
  if (!col('vendors').length) { toast('Add a vendor first', 'warn'); A.vendorForm(); return; }
  const p = id ? getById('pos', id) : { eventId: evId || '', date: todayLocal(), amount: '', paid: 0 }; const edit = can('vendors', 2);
  const v = getById('vendors', p.vendorId); const ev = evById(p.eventId); const st = settings();
  const slip = id ? `Work order ${p.no} from ${st.bizName}\nService: ${p.desc}\nEvent: ${ev?.title || '-'} on ${fmtDate(ev?.date)} at ${ev?.venue || '-'}\nAmount: ${inr(p.amount)} · Advance paid: ${inr(p.paid)} · Balance: ${inr(p.amount - p.paid)}` : '';
  formModal({ title: id ? 'Purchase order ' + p.no : 'Issue purchase order', fields: [
    { name: 'vendorId', label: 'Vendor', type: 'select', options: col('vendors').map(x => [x.id, x.name]), value: p.vendorId, full: true },
    { name: 'eventId', label: 'For booking', type: 'select', options: [['', '— General —'], ...col('events').sort(by('date')).map(e => [e.id, e.title])], value: p.eventId, full: true },
    { name: 'desc', label: 'What is ordered', value: p.desc, required: true, full: true }, { name: 'amount', label: 'Agreed amount ₹', type: 'number', min: 0, value: p.amount, required: true },
    { name: 'paid', label: 'Paid so far ₹', type: 'number', min: 0, value: p.paid }, { name: 'date', label: 'PO date', type: 'date', value: p.date },
    { name: 'status', label: 'Status', type: 'select', options: ['Issued', 'Confirmed', 'Advance paid', 'Delivered', 'Settled'], value: p.status || 'Issued' }],
    submit: edit ? 'Save PO' : 'Close',
    left: id ? `${waBtn(slip, v?.phone, 'Send PO')}${can('vendors', 3) ? `<button type="button" class="btn danger sm" onclick="A.delPO('${id}')">${ic('trash')}</button>` : ''}` : '',
    onSubmit: async x => { if (!edit) return; if (+x.paid > +x.amount) throw new Error('Paid cannot be more than the PO amount'); const rec = Object.assign(id ? p : { id: uid('po_'), no: 'PO-' + (100 + col('pos').length + 1) }, x, { amount: +x.amount, paid: +x.paid || 0 }); await save('pos', rec, `${id ? 'Updated' : 'Issued'} ${rec.no} to ${getById('vendors', rec.vendorId)?.name}`); render(); } });
};
A.delPO = id => { const p = getById('pos', id); confirmBox('Delete ' + p.no + '?', p.desc, 'Delete', async () => { await removeRec('pos', id, 'Deleted ' + p.no); render(); }); };

/* ================= Staff, attendance, payroll ================= */
V.staff = () => {
  const tab = S.params.tab || 'roster'; const edit = can('staff', 2); const seeRates = can('reports') || edit;
  const head = pageHead('Staff & wages', 'Crew roster, duty hours, overtime, attendance by event, advances, kharcha and monthly payout.', edit ? `${importBtn('staff')}<button class="btn" onclick="A.crewMoneyForm()">${ic('rupee')} Crew money</button><button class="btn primary" onclick="A.staffForm()">${ic('plus')} Add crew</button>` : '');
  const tabs = `<div class="tabs">${[['roster', 'Roster'], ['attendance', 'Attendance'], ['money', 'Crew money'], ['payroll', 'Payroll']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}</button>`).join('')}${tabHelp('staff-' + tab)}</div>`;
  if (tab === 'attendance') {
    const date = S.filters.attDate || todayLocal(); const evs = col('events').filter(e => e.date <= addDays(date, 1) && eventEnd(e) >= addDays(date, -1) && e.stage !== 'Cancelled');
    const rows = col('staff').map(s => { const a = getById('attendance', date + '_' + s.id) || {}; const p = attPay(a.status ? a : null, s);
      const extra = a.status === 'P' && (p.shifts > 1 || p.otHours) ? pill(`${p.shifts > 1 ? p.shifts + ' shifts' : '1 shift'}${p.otHours ? ' + ' + p.otHours + ' hrs overtime' : ''}`, 'accent') : '';
      return `<div class="row" style="flex-wrap:wrap"><div class="main-col" style="min-width:140px"><b>${esc(s.name)}</b><div class="sub">${esc(s.role || '')} · duty ${dutyHrs(s)} hrs</div>${extra ? `<div style="margin-top:4px">${extra}</div>` : ''}</div><div class="row-flex" style="gap:6px;justify-content:flex-end;flex-wrap:wrap">${edit ? `<select class="inline-in" style="width:auto;max-width:150px" onchange="A.mark('${s.id}','${date}',null,this.value)" aria-label="Event"><option value="">No event</option>${evs.map(e => `<option value="${e.id}" ${a.eventId === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select>` : ''}<div class="seg">${[['P', 'Present'], ['H', 'Half'], ['A', 'Absent']].map(([k, l]) => `<button class="${a.status === k ? 'on' : ''}" ${edit ? `onclick="A.mark('${s.id}','${date}','${k}')"` : 'disabled'} title="${l}">${k}</button>`).join('')}</div>${edit ? `<label class="hrs-in"><input class="inline-in" type="number" min="0" max="48" step="0.5" inputmode="decimal" value="${a.hours || ''}" placeholder="${dutyHrs(s)}" onchange="A.markHours('${s.id}','${date}',this.value)" aria-label="Hours worked"><span>hrs</span></label><button class="btn sm ghost" onclick="A.crewMoneyForm(null,'${s.id}','${a.eventId || ''}','${date}')" title="Give kharcha / advance">+ ₹</button>` : ''}</div></div>`; }).join('');
    const present = col('attendance').filter(a => a.date === date); const cnt = k => present.filter(a => a.status === k).length;
    return head + tabs + `<div class="toolbar"><input type="date" style="width:auto" value="${date}" onchange="A.setF('attDate',this.value)">${pill(cnt('P') + ' present', 'good')}${pill(cnt('H') + ' half day', 'warn')}${pill(cnt('A') + ' absent', 'bad')}${edit ? `<button class="btn sm" onclick="A.markAll('${date}')">Mark all present</button>` : ''}</div>
    <div class="banner" style="margin-bottom:12px">${ic('clock')}<span>Write the hours only when someone works more than their duty. Extra hours become overtime; a full extra duty becomes one more shift.</span></div>
    <div class="card"><div class="rows">${rows || empty('No crew added', 'Add your labour and staff first.')}</div></div>`;
  }
  if (tab === 'money') {
    const month = S.filters.cmMonth || todayLocal().slice(0, 7);
    const list = col('advances').filter(x => (x.date || '').startsWith(month)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const byKind = k => sum(list.filter(x => smKind(x) === k), x => x.amount);
    return head + tabs + `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('cmMonth',this.value)"></div>
    <div class="kpis">${kpi('Advance', inr(byKind('advance')), 'Cut from pay', '', 'rupee', '#EA580C')}${kpi('Food / khuraki', inr(byKind('food')), 'Company kharcha', '', 'pot', '#16A34A')}${kpi('Travel / other', inr(byKind('travel')), 'Company kharcha', '', 'truck', '#2563EB')}${kpi('Bonus', inr(byKind('bonus')), 'Added to pay', '', 'gift', '#DB2777')}</div>
    <div class="card"><div class="rows">${list.map(crewMoneyRow).join('') || empty('No crew money this month', 'Advances, food at the event, travel and bonus show here.')}</div></div>`;
  }
  if (tab === 'payroll') {
    const month = S.filters.payMonth || todayLocal().slice(0, 7);
    const rows = col('staff').map(s => { const pay = payrollOf(s, month); const paid = getById('payouts', month + '_' + s.id);
      return `<tr><td><b>${esc(s.name)}</b><div class="tiny muted">${inr(s.rate)}/duty · duty ${dutyHrs(s)} hrs · OT ${inr(otRateOf(s))}/hr</div>${pay.company ? `<div class="tiny muted">Kharcha (company) ${inr(pay.company)}</div>` : ''}</td><td class="r">${pay.shifts}</td><td class="r">${pay.otHours || '—'}</td><td class="r">${inr(pay.wage)}</td><td class="r">${pay.ot ? inr(pay.ot) : '—'}</td><td class="r">${pay.bonus ? '+ ' + inr(pay.bonus) : '—'}</td><td class="r" style="color:var(--bad)">${pay.adv ? '− ' + inr(pay.adv) : '—'}</td><td class="r"><b>${inr(pay.net)}</b></td><td class="r">${paid ? pill('Paid ' + fmtShort(paid.date), 'good') : edit ? `<button class="btn sm" onclick="A.payout('${s.id}','${month}',${pay.net})">Mark paid</button>` : pill('Pending', 'warn')}</td><td>${edit ? `<button class="btn sm ghost" onclick="A.crewMoneyForm(null,'${s.id}')">+ ₹</button>` : ''}</td></tr>`; }).join('');
    return head + tabs + `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('payMonth',this.value)"><span class="small muted">Net pay = wages + overtime + bonus − advance. Food and travel kharcha is the company’s cost, not cut from pay.</span></div><div class="card"><div class="tbl-wrap"><table class="tbl payroll"><thead><tr><th>Crew</th><th class="r">Shifts</th><th class="r">OT hrs</th><th class="r">Wages</th><th class="r">Overtime</th><th class="r">Bonus</th><th class="r">Advance</th><th class="r">Net pay</th><th class="r">Status</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="10">${empty('No crew', '')}</td></tr>`}</tbody></table></div></div>`;
  }
  return head + tabs + `<div class="grid g-auto">${col('staff').map(s => { const linked = S.members.find(m => m.staffId === s.id); const month = todayLocal().slice(0, 7); const pay = payrollOf(s, month);
    return `<div class="card pad stack-sm"><div class="row-flex" style="flex-wrap:nowrap"><div class="avatar">${esc(initials(s.name))}</div><div style="min-width:0;flex:1"><b>${esc(s.name)}</b><div class="tiny muted">${esc(s.role || '')} · ${esc(s.phone || '')}</div></div></div><div class="row-flex small" style="justify-content:space-between"><span class="muted">${seeRates ? inr(s.rate) + '/duty · ' : ''}duty ${dutyHrs(s)} hrs · ${pay.shifts} shifts this month</span>${linked ? pill('App login', 'primary') : ''}</div><div class="row-flex">${s.phone ? waBtn('Namaste ' + s.name.split(' ')[0] + ' ji, ', s.phone, 'Message') : ''}${edit ? `<button class="btn sm" onclick="A.staffForm('${s.id}')">${ic('edit')} Edit</button><button class="btn sm ghost" onclick="A.crewMoneyForm(null,'${s.id}')">+ ₹</button>` : ''}</div></div>`; }).join('') || `<div class="card">${empty('No crew yet', 'Add riggers, halwai, waiters, DG techs and helpers.')}</div>`}</div>`;
};
function payrollOf(s, month) {
  const att = col('attendance').filter(a => a.staffId === s.id && (a.date || '').startsWith(month));
  const r = { shifts: 0, otHours: 0, wage: 0, ot: 0 }; att.forEach(a => { const p = attPay(a, s); r.shifts += p.shifts; r.otHours += p.otHours; r.wage += p.wage; r.ot += p.ot; });
  const money = col('advances').filter(a => a.staffId === s.id && (a.date || '').startsWith(month));
  const k = kind => sum(money.filter(x => smKind(x) === kind), x => x.amount);
  r.adv = k('advance'); r.bonus = k('bonus'); r.company = k('food') + k('travel');
  r.otHours = Math.round(r.otHours * 10) / 10; r.net = r.wage + r.ot + r.bonus - r.adv; return r;
}
function crewMoneyRow(x) {
  const s = getById('staff', x.staffId); const k = smKind(x); const [label, tone, icon, c] = { advance: ['Advance', 'warn', 'rupee', '#EA580C'], food: ['Food / khuraki', 'good', 'pot', '#16A34A'], travel: ['Travel / other', 'info', 'truck', '#2563EB'], bonus: ['Bonus', 'primary', 'gift', '#DB2777'] }[k];
  const ev = x.eventId ? evById(x.eventId) : null; const edit = can('staff', 2);
  return `<div class="row ${edit ? 'click' : ''}" ${edit ? `onclick="A.crewMoneyForm('${x.id}')"` : ''}>${ibox(icon, c)}<div class="main-col"><b>${esc(s?.name || 'Crew')}</b><div class="sub">${fmtShort(x.date)}${ev ? ' · ' + esc(ev.title) : ''}${x.note ? ' · ' + esc(x.note) : ''}</div></div>${pill(label, tone)}<b class="num">${inr(x.amount)}</b></div>`;
}
A.staffForm = id => { const s = id ? getById('staff', id) : { rate: 800, dutyHours: 8 }; formModal({ title: id ? 'Edit crew member' : 'Add crew member', fields: [{ name: 'name', label: 'Name', value: s.name, required: true }, { name: 'phone', label: 'Mobile', type: 'tel', value: s.phone }, { name: 'role', label: 'Work', value: s.role, placeholder: 'Rigger, halwai, waiter…' }, { name: 'rate', label: 'Wage for one duty (₹)', type: 'number', min: 0, value: s.rate }, { name: 'dutyHours', label: 'Duty hours (one shift)', type: 'number', min: 1, max: 24, step: '0.5', value: s.dutyHours || 8, hint: 'Work beyond this is overtime; a full extra duty is one more shift' }, { name: 'otRate', label: 'Overtime ₹ per extra hour', type: 'number', min: 0, value: s.otRate || '', placeholder: 'Auto', hint: 'Leave blank to use wage ÷ duty hours' }],
  left: id && can('staff', 3) ? `<button type="button" class="btn danger" onclick="A.delStaff('${id}')">${ic('trash')}</button>` : '', onSubmit: async v => { await save('staff', Object.assign(id ? s : { id: uid('st_') }, v, { rate: +v.rate || 0, dutyHours: +v.dutyHours || 8, otRate: +v.otRate || 0 }), `${id ? 'Updated' : 'Added'} crew ${v.name}`); render(); } }); };
A.delStaff = id => { const s = getById('staff', id); confirmBox('Remove crew member?', s.name + ' will be removed. Past attendance stays in reports.', 'Remove', async () => { await removeRec('staff', id, 'Removed crew ' + s.name); render(); }); };
A.mark = async (sid, date, status, eventId) => { try { const id = date + '_' + sid; const a = getById('attendance', id) || { id, staffId: sid, date, status: 'P', eventId: '' }; if (status) a.status = status; if (eventId != null) a.eventId = eventId; await save('attendance', a); render(); } catch (err) { toast(err.message, 'bad'); } };
A.markHours = async (sid, date, hrs) => { try { const id = date + '_' + sid; const a = getById('attendance', id) || { id, staffId: sid, date, status: 'P', eventId: '' }; const h = Math.max(0, Math.min(48, +hrs || 0)); a.hours = h || ''; if (h && a.status === 'A') a.status = 'P'; await save('attendance', a); render(); } catch (err) { toast(err.message, 'bad'); } };
A.markAll = async date => { try { for (const s of col('staff')) { const id = date + '_' + s.id; const a = getById('attendance', id) || { id, staffId: s.id, date, eventId: '' }; a.status = 'P'; await save('attendance', a); } logAct(`Marked attendance for ${col('staff').length} crew on ${fmtDate(date)}`); render(); } catch (err) { toast(err.message, 'bad'); } };
A.advanceForm = sid => A.crewMoneyForm(null, sid);
A.crewMoneyForm = (id, sid, evId, date) => {
  if (!col('staff').length) { toast('Add your crew first', 'warn'); A.staffForm(); return; }
  const x = id ? getById('advances', id) : { kind: 'advance', staffId: sid || '', eventId: evId || '', date: date || todayLocal() };
  formModal({ title: id ? 'Edit crew money' : 'Crew money', sub: 'Advance, food at the event, travel or bonus', fields: [
    { name: 'staffId', label: 'Crew member', type: 'select', options: col('staff').map(s => [s.id, s.name]), value: x.staffId, required: true, full: true },
    { name: 'kind', label: 'Type', type: 'select', options: STAFF_MONEY, value: smKind(x), full: true },
    { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: x.amount }, { name: 'date', label: 'Date', type: 'date', value: x.date },
    { name: 'eventId', label: 'For booking', type: 'select', options: [['', '— None —'], ...col('events').filter(e => e.stage !== 'Cancelled').sort(by('date')).map(e => [e.id, `${e.title} (${fmtShort(e.date)})`])], value: x.eventId, full: true },
    { name: 'note', label: 'Note', value: x.note, full: true, placeholder: 'e.g. Dinner for 6 crew at site' }],
    left: id && can('staff', 3) ? `<button type="button" class="btn danger" onclick="A.delCrewMoney('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { const s = getById('staff', v.staffId); const rec = Object.assign(id ? x : { id: uid('ad_') }, v, { amount: +v.amount }); const lab = (STAFF_MONEY.find(k => k[0] === v.kind) || STAFF_MONEY[0])[1];
      await save('advances', rec, `${lab}: ${inr(v.amount)} to ${s?.name}`); render(); } });
};
A.delCrewMoney = id => confirmBox('Delete this entry?', '', 'Delete', async () => { await removeRec('advances', id); render(); });
A.payout = async (sid, month, amount) => { try { await save('payouts', { id: month + '_' + sid, staffId: sid, month, amount, date: todayLocal() }, `Paid ${inr(amount)} wages to ${getById('staff', sid)?.name} for ${month}`); render(); } catch (err) { toast(err.message, 'bad'); } };

/* ================= Live tracker ================= */
function canTask(t) { if (lvl('tasks') >= 3) return true; if (lvl('tasks') < 2) return false; return !S.me?.staffId || t.assignee === S.me.staffId; }
function taskRow(t) {
  const s = getById('staff', t.assignee); const ok = canTask(t);
  return `<div class="row" style="flex-wrap:wrap">${ibox(t.progress >= 100 ? 'check' : 'pulse', t.progress >= 100 ? '#0B9B68' : '#0EA5E9', 'sm')}<div class="main-col" style="min-width:160px"><b>${esc(t.title)}</b><div class="sub">${esc(s?.name || 'Unassigned')}${t.note ? ' · ' + esc(t.note) : ''}</div></div>
  <div class="row-flex" style="flex:1;min-width:200px;flex-wrap:nowrap">${ok ? `<input type="range" min="0" max="100" step="10" value="${t.progress}" aria-label="Progress" onchange="A.taskProg('${t.id}',this.value)">` : `<div style="flex:1">${prog(t.progress)}</div>`}<b class="num" style="width:44px;text-align:right">${t.progress}%</b>${ok && t.progress < 100 ? `<button class="btn sm" onclick="A.taskProg('${t.id}',100)">${ic('check')}</button>` : ''}${lvl('tasks') >= 2 && (lvl('tasks') >= 3 || canTask(t)) ? `<button class="btn sm ghost" onclick="A.taskForm('${t.id}')" aria-label="Edit task">${ic('edit')}</button>` : ''}</div></div>`;
}
V.tasks = () => {
  const mine = S.filters.mine && S.me?.staffId; const t = todayLocal();
  const evs = col('events').filter(e => col('tasks').some(x => x.eventId === e.id) && !['Cancelled', 'Closed'].includes(e.stage) && (eventEnd(e) >= addDays(t, -2))).sort(by('date'));
  return pageHead('Live tracker', 'Setup progress by event. Crew update their own tasks; supervisors see everything.', `${S.me?.staffId ? `<button class="chip ${mine ? 'on' : ''}" onclick="A.setF('mine',${!mine})">My tasks only</button>` : ''}${can('tasks', 2) ? `<button class="btn primary" onclick="A.taskForm()">${ic('plus')} Task</button>` : ''}`) +
  `<div class="grid g2">${evs.map(e => { let ts = col('tasks').filter(x => x.eventId === e.id); if (mine) ts = ts.filter(x => x.assignee === S.me.staffId); if (!ts.length) return ''; const p = Math.round(eventProgress(e));
    const msg = `Setup status: ${e.title} (${e.venue})\nOverall ${p}% done\n` + col('tasks').filter(x => x.eventId === e.id).map(x => `${x.progress === 100 ? '✅' : '⏳'} ${x.title}: ${x.progress}%`).join('\n');
    return `<div class="card"><div class="card-h"><div style="min-width:0"><h3>${esc(e.title)}</h3><p>${fmtDay(e.date)} · ${esc(e.venue || '')}</p></div><div class="row-flex">${pill(p + '%', p >= 80 ? 'good' : 'accent')}${waBtn(msg, '', 'Status')}</div></div><div style="padding:0 16px 10px">${prog(p)}</div><div class="rows">${ts.map(taskRow).join('')}</div></div>`; }).join('') || `<div class="card">${empty('No active setup tasks', 'Open a booking and add tasks like rigging, sound check, kitchen prep.')}</div>`}</div>`;
};
A.taskProg = async (id, v) => { const t = getById('tasks', id); if (!canTask(t)) { toast('You can update only your own tasks', 'bad'); return; } t.progress = +v; try { await save('tasks', t, `${t.title}: ${v}%`); render(); } catch (err) { toast(err.message, 'bad'); } };
A.taskForm = (id, evId) => {
  const t = id ? getById('tasks', id) : { eventId: evId || '', progress: 0 };
  const evs = col('events').filter(e => !['Cancelled', 'Closed', 'Completed'].includes(e.stage) || e.id === t.eventId).sort(by('date'));
  formModal({ title: id ? 'Edit task' : 'New setup task', fields: [{ name: 'eventId', label: 'Booking', type: 'select', required: true, full: true, options: evs.map(e => [e.id, `${e.title} (${fmtShort(e.date)})`]), value: t.eventId }, { name: 'title', label: 'Task', value: t.title, required: true, full: true, placeholder: 'e.g. Stage & floral mandap' }, { name: 'assignee', label: 'Assigned to', type: 'select', options: [['', 'Unassigned'], ...col('staff').map(s => [s.id, s.name])], value: t.assignee }, { name: 'progress', label: 'Progress %', type: 'number', min: 0, max: 100, step: 5, value: t.progress }, { name: 'note', label: 'Note / blocker', value: t.note, full: true }],
    left: id && can('tasks', 3) ? `<button type="button" class="btn danger" onclick="A.delTask('${id}')">${ic('trash')}</button>` : '',
    onSubmit: async v => { if (!v.eventId) throw new Error('Pick a booking'); await save('tasks', Object.assign(id ? t : { id: uid('t_') }, v, { progress: Math.min(100, Math.max(0, +v.progress || 0)) }), `${id ? 'Updated' : 'Added'} task ${v.title}`); render(); } });
};
A.delTask = id => { const t = getById('tasks', id); confirmBox('Delete task?', t.title, 'Delete', async () => { await removeRec('tasks', id); render(); }); };

/* ================= Expenses ================= */
function expRow(x) { const [xi, xc] = EXP_STYLE[x.category] || EXP_STYLE.Misc; return `<div class="row ${can('expenses', 2) ? 'click' : ''}" ${can('expenses', 2) ? `onclick="A.expenseForm('${x.id}')"` : ''}>${ibox(xi, xc)}<div class="main-col"><b>${esc(x.category)}</b><div class="sub">${fmtShort(x.date)}${x.note ? ' · ' + esc(x.note) : ''}${x.eventId ? ' · ' + esc(evById(x.eventId)?.title || '') : ''}</div></div><b class="num">${inr(x.amount)}</b></div>`; }
/* Every cost of the month in one list: expenses typed here + crew wages/overtime + crew kharcha + vendor POs.
   The crew and vendor lines are read from Staff and Vendors (never typed twice), so Reports and event profit match. */
function monthCosts(month) {
  const out = col('expenses').filter(x => (x.date || '').startsWith(month)).map(x => ({ src: 'exp', date: x.date, amount: +x.amount || 0, cat: x.category, x }));
  if (can('staff')) {
    col('staff').forEach(s => { const p = payrollOf(s, month); if (p.wage + p.ot > 0) out.push({ src: 'wage', date: month + '-' + String(new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate()).padStart(2, '0'), amount: p.wage + p.ot, cat: 'Crew wages', s, p }); });
    col('advances').filter(x => smKind(x) !== 'advance' && (x.date || '').startsWith(month)).forEach(x => out.push({ src: 'crew', date: x.date, amount: +x.amount || 0, cat: 'Crew kharcha', x }));
  }
  if (can('vendors')) col('pos').filter(x => (x.date || '').startsWith(month)).forEach(x => out.push({ src: 'po', date: x.date, amount: +x.amount || 0, cat: 'Vendor POs', x }));
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
const COST_STYLE = { 'Crew wages': ['users', '#0D9488'], 'Crew kharcha': ['pot', '#16A34A'], 'Vendor POs': ['handshake', '#D97706'] };
function costRow(c) {
  if (c.src === 'exp') return expRow(c.x);
  const [i, col_] = COST_STYLE[c.cat];
  if (c.src === 'wage') return `<div class="row click" onclick="A.go('staff',{tab:'payroll'})">${ibox(i, col_)}<div class="main-col"><b>Wages: ${esc(c.s.name)}</b><div class="sub">${c.p.shifts} shifts${c.p.otHours ? ' + ' + c.p.otHours + ' hrs overtime' : ''} · from Staff</div></div><b class="num">${inr(c.amount)}</b></div>`;
  if (c.src === 'crew') { const s = getById('staff', c.x.staffId); const ev = c.x.eventId ? evById(c.x.eventId) : null; return `<div class="row click" onclick="A.go('staff',{tab:'money'})">${ibox(i, col_)}<div class="main-col"><b>${smKind(c.x) === 'bonus' ? 'Bonus' : smKind(c.x) === 'food' ? 'Food / khuraki' : 'Crew travel / other'}: ${esc(s?.name || 'Crew')}</b><div class="sub">${fmtShort(c.date)}${ev ? ' · ' + esc(ev.title) : ''}${c.x.note ? ' · ' + esc(c.x.note) : ''} · from Staff</div></div><b class="num">${inr(c.amount)}</b></div>`; }
  const v = getById('vendors', c.x.vendorId); const ev = c.x.eventId ? evById(c.x.eventId) : null;
  return `<div class="row click" onclick="A.poForm('${c.x.id}')">${ibox(i, col_)}<div class="main-col"><b>${esc(c.x.no)}: ${esc(v?.name || 'Vendor')}</b><div class="sub">${fmtShort(c.date)} · ${esc(c.x.desc || '')}${ev ? ' · ' + esc(ev.title) : ''} · paid ${inr(c.x.paid)}</div></div><b class="num">${inr(c.amount)}</b></div>`;
}
V.expenses = () => {
  const month = S.filters.expMonth || todayLocal().slice(0, 7); const show = S.filters.expShow || 'all';
  const all = monthCosts(month); const list = all.filter(c => show === 'all' || (show === 'exp' ? c.src === 'exp' : show === 'crew' ? ['wage', 'crew'].includes(c.src) : c.src === 'po'));
  const cats = [...new Set(all.map(c => c.cat))]; const tot = sum(all, c => c.amount);
  const byCat = cats.map(c => [c, sum(all.filter(x => x.cat === c), x => x.amount)]).sort((a, b) => b[1] - a[1]);
  const style = c => COST_STYLE[c] || EXP_STYLE[c] || EXP_STYLE.Misc;
  return pageHead('Expenses', 'Every cost in one place: your expenses, crew wages, overtime and kharcha, and vendor POs.', can('expenses', 2) ? `<button class="btn primary" onclick="A.expenseForm()">${ic('plus')} Add expense</button>` : '') +
  `<div class="toolbar"><input type="month" style="width:auto" value="${month}" onchange="A.setF('expMonth',this.value)">${seg('expShow', [['all', 'All'], ['exp', 'Expenses'], ['crew', 'Crew'], ['po', 'Vendors']], show, 'A.setF')}<b class="num">${inr(tot)} this month</b></div>
  <div class="split"><div class="card"><div class="rows">${list.map(costRow).join('') || empty('No expenses this month', 'Add fuel, transport and other running costs.')}</div></div>
  <div class="card pad stack-sm"><h3>By category</h3>${byCat.map(([c, v]) => `<div><div class="row-flex small" style="justify-content:space-between"><span class="row-flex" style="gap:8px">${ibox(style(c)[0], style(c)[1], 'sm')}${esc(c)}</span><b class="num">${inr(v)}</b></div>${prog(tot ? v / tot * 100 : 0)}</div>`).join('') || '<span class="muted small">Nothing yet</span>'}
  <p class="tiny muted" style="margin-top:6px">Crew lines come from Staff (attendance, overtime, food, travel, bonus). Vendor lines come from purchase orders. Advances are not a cost; they are cut from pay.</p></div></div>`;
};
A.expenseForm = (id, evId) => { const x = id ? getById('expenses', id) : { date: todayLocal(), eventId: evId || '', category: EXP_CATS[0] }; formModal({ title: id ? 'Edit expense' : 'Add expense', fields: [{ name: 'category', label: 'Type', type: 'select', options: EXP_CATS, value: x.category }, { name: 'amount', label: 'Amount ₹', type: 'number', min: 1, required: true, value: x.amount }, { name: 'date', label: 'Date', type: 'date', value: x.date }, { name: 'eventId', label: 'Booking', type: 'select', options: [['', '— General / overhead —'], ...col('events').sort(by('date')).map(e => [e.id, e.title])], value: x.eventId }, { name: 'note', label: 'Note', value: x.note, full: true }],
  left: id && can('expenses', 3) ? `<button type="button" class="btn danger" onclick="A.delExp('${id}')">${ic('trash')}</button>` : '', onSubmit: async v => { await save('expenses', Object.assign(id ? x : { id: uid('x_') }, v, { amount: +v.amount }), `${id ? 'Updated' : 'Added'} expense ${inr(v.amount)} (${v.category})`); render(); } }); };
A.delExp = id => confirmBox('Delete expense?', '', 'Delete', async () => { await removeRec('expenses', id); render(); });

/* ================= Reports ================= */
function periodRange(p) {
  const t = todayLocal(); const d = new Date(t + 'T00:00');
  if (p === 'month') return [t.slice(0, 8) + '01', t];
  if (p === 'last') { const s = todayLocal(new Date(d.getFullYear(), d.getMonth() - 1, 1)); const e = todayLocal(new Date(d.getFullYear(), d.getMonth(), 0)); return [s, e]; }
  if (p === 'fy') { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return [`${y}-04-01`, `${y + 1}-03-31`]; }
  return ['0000-01-01', '9999-12-31'];
}
V.reports = () => {
  const p = S.filters.period || 'fy'; const [a, b] = periodRange(p); const inR = d => d && d >= a && d <= b;
  const invs = col('invoices').filter(i => i.type === 'invoice' && inR(i.date)); const billed = sum(invs, i => invCalc(i).total); const gst = sum(invs, i => invCalc(i).gst);
  const collected = sum(col('payments').filter(x => inR(x.date)), x => x.amount);
  const po = sum(col('pos').filter(x => inR(x.date)), x => x.amount); const exp = sum(col('expenses').filter(x => inR(x.date)), x => x.amount); const wages = wageCost(x => inR(x.date)); const crew = crewSpend(x => inR(x.date));
  const cost = po + exp + wages + crew; const net = billed - gst - cost;
  const months = []; const base = new Date(todayLocal() + 'T00:00'); for (let k = 5; k >= 0; k--) { const m = todayLocal(new Date(base.getFullYear(), base.getMonth() - k, 1)).slice(0, 7); months.push(m); }
  const mrev = months.map(m => sum(col('invoices').filter(i => i.type === 'invoice' && (i.date || '').startsWith(m)), i => invCalc(i).total));
  const mcost = months.map(m => sum(col('pos').filter(x => (x.date || '').startsWith(m)), x => x.amount) + sum(col('expenses').filter(x => x.date.startsWith(m)), x => x.amount) + wageCost(x => x.date.startsWith(m)) + crewSpend(x => (x.date || '').startsWith(m)));
  const evs = col('events').filter(e => inR(e.date) && e.stage !== 'Cancelled').map(e => ({ e, m: eventMoney(e) })).sort((x, y) => y.m.revenue - x.m.revenue);
  return pageHead('Reports & P&L', `${fmtDate(a === '0000-01-01' ? null : a)} to ${fmtDate(b === '9999-12-31' ? todayLocal() : b)}`, `${seg('period', [['month', 'This month'], ['last', 'Last month'], ['fy', 'This FY'], ['all', 'All time']], p, 'A.setF')}${!FRAMED ? `<button class="btn sm" onclick="A.dl('pnl.csv')">${ic('download')} CSV</button>` : ''}`) +
  `<div class="kpis">${kpi('Billed', inr(billed), `GST ${inr(gst)}`)}${kpi('Collected', inr(collected), '', 'good', 'rupee', '#0B9B68')}${kpi('Costs', inr(cost), `Vendors ${inr(po)} · Exp ${inr(exp)} · Crew ${inr(wages + crew)}`)}${kpi('Net profit (ex-GST)', inr(net), billed ? (net / (billed - gst) * 100).toFixed(1) + '% margin' : '', net >= 0 ? 'good' : 'bad')}</div>
  <div class="split"><div class="card pad"><div class="row-flex" style="justify-content:space-between;margin-bottom:8px"><h3>Last 6 months</h3><div class="legend"><span><i style="background:var(--primary)"></i>Billed</span><span><i style="background:var(--accent)"></i>Costs</span></div></div><div class="chart">${barChart(months, mrev, mcost)}</div></div>
  <div class="card pad stack-sm"><h3>Where the money goes</h3>${[['Vendor POs', po], ['Expenses', exp], ['Crew wages & overtime', wages], ['Crew kharcha & bonus', crew]].map(([l, v]) => `<div><div class="row-flex small" style="justify-content:space-between"><span>${l}</span><b class="num">${inr(v)}</b></div>${prog(cost ? v / cost * 100 : 0)}</div>`).join('')}</div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><h3>Profit by event</h3><span class="tiny muted">Revenue uses invoices, or package value until invoiced</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th class="r">Revenue</th><th class="r">Costs</th><th class="r">Profit</th><th class="r">Margin</th></tr></thead><tbody>${evs.map(({ e, m }) => `<tr onclick="A.go('event',{id:'${e.id}',tab:'money'})" style="cursor:pointer"><td><b>${esc(e.title)}</b><div class="tiny muted">${fmtShort(e.date)} · ${num(e.pax)} pax</div></td><td class="r">${inr(m.revenue)}</td><td class="r">${inr(m.cost)}</td><td class="r" style="color:${m.profit >= 0 ? 'var(--good)' : 'var(--bad)'}"><b>${inr(m.profit)}</b></td><td class="r">${m.revenue ? m.margin.toFixed(1) + '%' : '—'}</td></tr>`).join('') || `<tr><td colspan="5">${empty('No events in this period', '')}</td></tr>`}</tbody></table></div></div>`;
};
A.dl = name => { const p = S.filters.period || 'fy'; const [a, b] = periodRange(p); const evs = col('events').filter(e => e.date >= a && e.date <= b && e.stage !== 'Cancelled'); downloadFile(name, 'Event,Date,Client,Revenue,Costs,Profit,Margin %\n' + evs.map(e => { const m = eventMoney(e); return `"${e.title}",${e.date},"${e.client}",${Math.round(m.revenue)},${Math.round(m.cost)},${Math.round(m.profit)},${m.margin.toFixed(1)}`; }).join('\n'), 'text/csv'); };
function barChart(labels, s1, s2) {
  const W = 560, H = 220, pl = 52, pb = 26, pt = 10; const max = Math.max(1, ...s1, ...s2); const nice = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / nice) * nice;
  const y = v => pt + (H - pt - pb) * (1 - v / top); const gw = (W - pl) / labels.length; const bw = Math.min(26, gw / 3);
  const fmt = v => v >= 1e7 ? (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : v;
  let g = ''; for (let k = 0; k <= 4; k++) { const v = top * k / 4; g += `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">₹${fmt(v)}</text>`; }
  labels.forEach((m, i) => { const x = pl + gw * i + gw / 2; g += `<rect x="${x - bw - 1}" y="${y(s1[i])}" width="${bw}" height="${H - pb - y(s1[i])}" rx="3" fill="var(--primary)"><title>Billed ${inr(s1[i])}</title></rect><rect x="${x + 1}" y="${y(s2[i])}" width="${bw}" height="${H - pb - y(s2[i])}" rx="3" fill="var(--accent)"><title>Costs ${inr(s2[i])}</title></rect><text x="${x}" y="${H - 8}" text-anchor="middle">${new Date(m + '-01T00:00').toLocaleDateString('en-IN', { month: 'short' })}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Billed vs costs, last six months">${g}</svg>`;
}

/* ================= Reviews ================= */
V.reviews = () => {
  const list = col('reviews').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); const avg = list.length ? sum(list, r => r.stars) / list.length : 0;
  const done = col('events').filter(e => ['Completed', 'Closed'].includes(e.stage) && !list.some(r => r.eventId === e.id));
  return pageHead('Client reviews', 'Collect feedback after every event and reuse the best ones for Google and Instagram.', can('reviews', 2) ? `<button class="btn primary" onclick="A.reviewForm()">${ic('plus')} Log review</button>` : '') +
  `<div class="kpis">${kpi('Average rating', avg ? avg.toFixed(1) + ' ★' : '—', list.length + ' reviews', 'accent', 'star', '#EAB308')}${kpi('5-star', list.filter(r => r.stars === 5).length)}${kpi('From client links', list.filter(r => r.source === 'guest').length)}${kpi('Awaiting review', done.length, 'Completed events')}</div>
  ${done.length && can('bookings', 2) ? `<div class="banner" style="margin-bottom:14px">${ic('star')}<span>${done.length} completed event(s) have no review yet: ${done.slice(0, 3).map(e => `<a href="#" onclick="event.preventDefault();A.go('event',{id:'${e.id}',tab:'guest'})">${esc(e.title)}</a>`).join(', ')}. Send them the client link to rate you.</span></div>` : ''}
  <div class="grid g-auto">${list.map(r => `<div class="card pad stack-sm"><div class="row-flex" style="justify-content:space-between"><b>${esc(r.client || 'Client')}</b><span style="color:var(--accent);letter-spacing:2px">${'★'.repeat(r.stars)}<span style="color:var(--line)">${'★'.repeat(5 - r.stars)}</span></span></div><p class="small">${esc(r.comment || '')}</p><div class="row-flex tiny muted" style="justify-content:space-between"><span>${esc(evById(r.eventId)?.title || '')} · ${fmtShort(r.date)}</span>${r.source === 'guest' ? pill('Verified client', 'good') : ''}</div><button class="btn sm ghost" onclick="A.copy(${esc(JSON.stringify(`"${r.comment}" — ${r.client}`))})">${ic('copy')} Copy for Google</button></div>`).join('') || `<div class="card">${empty('No reviews yet', 'Share a client link after the event to collect ratings.')}</div>`}</div>`;
};
A.reviewForm = () => formModal({ title: 'Log a review', fields: [{ name: 'eventId', label: 'Event', type: 'select', options: [['', '—'], ...col('events').map(e => [e.id, e.title])], full: true }, { name: 'client', label: 'Client name', required: true }, { name: 'stars', label: 'Stars', type: 'select', options: [[5, '5 ★'], [4, '4 ★'], [3, '3 ★'], [2, '2 ★'], [1, '1 ★']] }, { name: 'comment', label: 'What they said', type: 'textarea', full: true }], onSubmit: async v => { await save('reviews', { id: uid('rv_'), ...v, stars: +v.stars, date: todayLocal(), source: 'manual' }, `Logged review from ${v.client}`); render(); } });

/* ================= Planner tools ================= */
V.tools = () => {
  const tab = S.params.tab || 'seating';
  return pageHead('Planner tools', 'Quick calculators for site planning and loading.') + `<div class="tabs"><button class="${tab === 'seating' ? 'on' : ''}" onclick="A.setP('tab','seating')">Seating & lawn</button><button class="${tab === 'truck' ? 'on' : ''}" onclick="A.setP('tab','truck')">Truck loading</button>${tabHelp(tab === 'truck' ? 'tools-truck' : 'tools-seating')}</div>` + (tab === 'truck' ? truckTool() : seatingTool());
};
function seatingTool() {
  const f = S.seat = S.seat || { pax: 500, area: 12000, style: 'royal' };
  let tables, chairs, sofas; if (f.style === 'royal') { tables = Math.ceil(f.pax * .5 / 8); chairs = Math.ceil(f.pax * .85); sofas = Math.ceil(f.pax * .1 / 2); } else if (f.style === 'banquet') { tables = Math.ceil(f.pax / 8); chairs = f.pax; sofas = 10; } else { tables = 6; chairs = f.pax; sofas = 12; }
  const dens = f.pax ? f.area / f.pax : 0; const verdict = dens >= 20 ? ['Comfortable', 'good'] : dens >= 12 ? ['Tight but workable', 'warn'] : ['Too crowded', 'bad'];
  return `<div class="split"><div class="card pad stack"><div class="grid2" style="padding:0"><label class="field"><span>Guests</span><input type="number" min="1" value="${f.pax}" onchange="A.seat('pax',this.value)"></label><label class="field"><span>Area (sq ft)</span><input type="number" min="100" value="${f.area}" onchange="A.seat('area',this.value)"></label><label class="field full"><span>Setup style</span><select onchange="A.seat('style',this.value)"><option value="royal" ${f.style === 'royal' ? 'selected' : ''}>Wedding mix (50% dining, lounges)</option><option value="banquet" ${f.style === 'banquet' ? 'selected' : ''}>Full banquet (tables of 8)</option><option value="theatre" ${f.style === 'theatre' ? 'selected' : ''}>Theatre / conference rows</option></select></label></div>
  <div class="banner ${verdict[1]}">${ic('ruler')}<span><b>${dens.toFixed(1)} sq ft per guest</b> · ${verdict[0]}. Keep 20+ for weddings with buffet counters and a 6 ft fire exit corridor.</span></div></div>
  <div class="card pad stack"><h3>You need</h3><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin:0">${kpi('Round tables', tables)}${kpi('Chairs', chairs)}${kpi('VIP sofas', sofas)}</div>${can('inventory') ? `<div class="stack-sm small">${[['Round Table', tables], ['Chair', chairs], ['Sofa', sofas]].map(([k, n]) => { const it = col('inventory').find(i => i.name.toLowerCase().includes(k.toLowerCase())); return it ? `<div class="row-flex" style="justify-content:space-between"><span>${esc(it.name)}</span><span class="num">${num(n)} needed · ${num(availableOn(it, todayLocal()))} free today</span></div>` : ''; }).join('')}</div>` : ''}</div></div>`;
}
A.seat = (k, v) => { S.seat[k] = k === 'style' ? v : Math.max(1, +v || 1); render(); };
function truckTool() {
  const evs = col('events').filter(e => (e.items || []).length && !['Cancelled', 'Closed'].includes(e.stage)).sort(by('date'));
  const evId = S.filters.truckEv || evs[0]?.id; const e = evById(evId); const cap = +(S.filters.truckCap || 4000);
  const order = ['Tents & Shamiana', 'Power & DG', 'Decor & Flooring', 'Furniture', 'Catering Utensils', 'Lighting & Sound', 'Other'];
  const rows = (e?.items || []).map(it => ({ it, item: getById('inventory', it.invId) })).filter(x => x.item).map(x => ({ ...x, w: (+x.item.weightKg || 0) * x.it.qty })).sort((a, b) => order.indexOf(a.item.category) - order.indexOf(b.item.category));
  const total = sum(rows, r => r.w); const trips = Math.max(1, Math.ceil(total / cap)); const pct = Math.min(100, total / cap * 100);
  const msg = e ? `Loading list: ${e.title} → ${e.venue}\nTotal ~${num(total)} kg (${trips} trip${trips > 1 ? 's' : ''})\nLoad heavy first:\n` + rows.map((r, i) => `${i + 1}. ${r.item.name} × ${r.it.qty} (~${num(r.w)} kg)`).join('\n') : '';
  return `<div class="split"><div class="card pad stack"><label class="field"><span>Booking</span><select onchange="A.setF('truckEv',this.value)">${evs.map(x => `<option value="${x.id}" ${x.id === evId ? 'selected' : ''}>${esc(x.title)} (${fmtShort(x.date)})</option>`).join('') || '<option>No bookings with items</option>'}</select></label><label class="field"><span>Vehicle</span><select onchange="A.setF('truckCap',this.value)">${VEHICLES.map(([n, c]) => `<option value="${c}" ${c === cap ? 'selected' : ''}>${n} · ${num(c)} kg</option>`).join('')}</select></label>
  <div><div class="row-flex" style="justify-content:space-between"><b>Load</b><b class="num">${num(total)} / ${num(cap)} kg</b></div>${prog(pct)}<p class="small" style="margin-top:6px;color:${total > cap ? 'var(--bad)' : 'var(--good)'}">${total > cap ? `Over capacity: plan ${trips} trips or a bigger vehicle to avoid overloading fines.` : 'Within capacity for one trip.'}</p></div>${e ? waBtn(msg, '', 'Send to driver') : ''}</div>
  <div class="card"><div class="card-h"><h3>Loading order</h3><span class="tiny muted">Heavy base first, delicate lights last</span></div><div class="rows">${rows.map((r, i) => `<div class="row"><span class="pill ${i < 2 ? 'primary' : ''} num">${i + 1}</span><div class="main-col"><b>${esc(r.item.name)} × ${num(r.it.qty)}</b><div class="sub">${esc(r.item.category)}</div></div><span class="num small">${r.w ? '~' + num(r.w) + ' kg' : 'set weight in inventory'}</span></div>`).join('') || empty('Nothing to load', 'Reserve items in a booking first.')}</div></div></div>`;
}

/* ================= Team & access ================= */
V.team = () => {
  const tab = S.params.tab || 'members'; const owner = lvl('team') >= 3; const roleOpts = Object.entries(S.roles).filter(([k]) => k !== 'owner').map(([k, r]) => [k, r.label]);
  const head = pageHead('Team & access', 'Who can log in, what each role can see and change, and a log of every action.', lvl('team') >= 2 ? `<button class="btn wa" onclick="A.shareAppLink()">${ic('wa')} Send app to team</button><button class="btn primary" onclick="A.memberForm()">${ic('plus')} Add employee</button>` : '');
  const tabs = `<div class="tabs">${[['members', 'Members'], ['roles', 'Roles & permissions'], ['activity', 'Activity log']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}</button>`).join('')}${tabHelp('team-' + tab)}</div>`;
  if (tab === 'roles') {
    const roles = Object.entries(S.roles);
    return head + tabs + `<div class="banner" style="margin-bottom:12px">${ic('shield')}<span><b>View</b> = see only. <b>Edit</b> = add and change. <b>Full</b> = also delete. Owner always has full access. ${S.adapter.mode === 'cloud' ? 'These rules are enforced by the server, not just hidden in the app.' : ''}</span></div>
    <div class="card"><div class="tbl-wrap perm"><table class="tbl"><thead><tr><th>Section</th>${roles.map(([k, r]) => `<th>${esc(r.label)}</th>`).join('')}</tr></thead><tbody>${kindModules().map(m => `<tr><td><b>${esc(m.label)}</b>${!moduleOn(m.key) ? '<div class="tiny muted">Turned off in Settings</div>' : ''}</td>${roles.map(([k, r]) => k === 'owner' ? `<td><span class="lvl3">Full</span></td>` : `<td>${owner ? `<select onchange="A.setPerm('${k}','${m.key}',this.value)">${LEVELS.map(([v, l]) => `<option value="${v}" ${+(r.perms[m.key] || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<span class="lvl${r.perms[m.key] || 0}">${LEVELS[r.perms[m.key] || 0][1]}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${owner ? `<div class="sheet-f" style="position:static"><button class="btn" onclick="A.roleForm()">${ic('plus')} Custom role</button><span class="grow"></span><span class="tiny muted">Changes save instantly</span></div>` : ''}</div>`;
  }
  if (tab === 'activity') return head + tabs + `<div class="card"><div class="rows">${col('activity').slice().sort((a, b) => b.ts - a.ts).slice(0, 150).map(a => `<div class="row"><div class="avatar" style="width:30px;height:30px;font-size:12px">${esc(initials(a.who))}</div><div class="main-col"><b style="font-weight:600">${esc(a.msg)}</b><div class="sub">${esc(a.who)} · ${new Date(a.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div></div>`).join('') || empty('No activity yet', '')}</div></div>`;
  return head + tabs + `<div class="card" style="margin-bottom:14px"><div class="rows">${S.members.map(m => { const self = m.userId === S.user.id; const isOwner = m.role === 'owner'; const st = getById('staff', m.staffId);
    return `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(m.name))}</div><div class="main-col" style="min-width:160px"><b>${esc(m.name || m.email)}${self ? ' (you)' : ''}</b><div class="sub">${esc(displayId(m.email || ''))}${st ? ' · crew: ' + esc(st.name) : ''}</div><div class="tiny muted" style="margin-top:3px">${esc(accessSummary(m))}${m.perms && Object.keys(m.perms).length ? ' ' + pill('Custom access', 'accent') : ''}</div></div>
    <div class="row-flex" style="gap:6px">${owner && !isOwner && !self ? `<select class="inline-in" style="width:auto" onchange="A.setRole('${m.userId}',this.value)">${roleOpts.map(([k, l]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="btn sm" onclick="A.accessSheet('${m.userId}')">${ic('key')} What they see</button>` : pill(S.roles[m.role]?.label || m.role, isOwner ? 'accent' : 'primary')}</div></div>`; }).join('')}</div></div>`;
};
A.revoke = async code => { await S.adapter.revokeInvite(code); S.invitesLoaded = false; render(); };
A.setRole = async (uidv, role) => { try { need('team', 3); await S.adapter.updateMember(S.org.orgId, uidv, { role }); const m = S.members.find(x => x.userId === uidv); m.role = role; logAct(`Changed ${m.name}'s role to ${S.roles[role]?.label}`); toast('Role updated'); } catch (err) { toast(err.message, 'bad'); render(); } };
A.removeMember = uidv => { const m = S.members.find(x => x.userId === uidv); confirmBox('Remove ' + m.name + '?', 'They lose access to this business immediately. Their past activity stays in the log.', 'Remove member', async () => { await S.adapter.removeMember(S.org.orgId, uidv); S.members = S.members.filter(x => x.userId !== uidv); logAct(`Removed ${m.name} from the team`); render(); }); };
A.setPerm = async (role, mod, v) => { try { need('team', 3); S.roles[role].perms[mod] = +v; await S.adapter.saveRoles(S.org.orgId, S.roles); logAct(`${S.roles[role].label}: ${MOD[mod].label} → ${LEVELS[+v][1]}`); toast('Saved'); } catch (err) { toast(err.message, 'bad'); } };
A.roleForm = () => formModal({ title: 'Create custom role', sub: 'Starts with view-only access. Adjust the matrix after.', fields: [{ name: 'label', label: 'Role name', required: true, placeholder: 'e.g. Decor Head, Store Keeper', full: true }, { name: 'copy', label: 'Copy permissions from', type: 'select', options: Object.entries(S.roles).filter(([k]) => k !== 'owner').map(([k, r]) => [k, r.label]), full: true }], onSubmit: async v => { const key = v.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24) || 'role'; if (S.roles[key]) throw new Error('A role with this name exists'); S.roles[key] = { label: v.label, perms: { ...S.roles[v.copy].perms } }; await S.adapter.saveRoles(S.org.orgId, S.roles); logAct('Created role ' + v.label); render(); } });

/* ================= Settings ================= */
V.settings = () => {
  const st = settings(); const edit = can('settings', 2); const ro = edit ? '' : 'disabled';
  const f = (name, label, extra = {}) => fieldHTML({ name, label, value: st[name], ...extra }).replace('<input', `<input ${ro}`).replace('<textarea', `<textarea ${ro}`).replace('<select', `<select ${ro}`);
  return pageHead('Settings', 'Business profile, billing defaults, modules and data.') +
  `<div class="stack">${planCard()}${brandingCard()}
  <form class="card" onsubmit="A.saveSettings(event)"><div class="card-h"><div><h3>Business profile${info('set-profile')}</h3><p>Printed on invoices, challans, receipts and the client portal</p></div></div><div class="grid2" style="padding:14px 16px">
    ${f('bizName', 'Business name', { required: true })}${f('owner', 'Owner name')}${f('phone', 'Phone', { type: 'tel' })}${f('email', 'Email', { type: 'email' })}${f('tagline', 'Tagline under your name', { placeholder: 'e.g. Tent · Catering · Royal Weddings since 1998' })}${f('website', 'Website / Instagram', { placeholder: 'e.g. utsavevents.in' })}
    ${f('address', 'Address', { full: true })}${f('city', 'City')}${f('state', 'State')}${f('stateCode', 'State code (GST)')}${f('gstin', 'GSTIN')}
    ${f('bank', 'Bank & branch')}${f('account', 'Account number')}${f('ifsc', 'IFSC')}${f('upi', 'UPI ID')}</div>
  <div class="grid2" style="padding:0 16px 14px;border-top:1px solid var(--line);padding-top:14px">
    ${f('invPrefix', 'Invoice prefix')}${f('qtPrefix', 'Quotation prefix')}${f('gstRate', 'Default GST %', { type: 'number', min: 0 })}${f('sac', 'Default SAC code')}${f('dueDays', 'Payment due in (days)', { type: 'number', min: 0 })}${f('overheadPerPlate', 'Catering overhead per plate ₹', { type: 'number', min: 0, hint: 'Gas, labour, disposables' })}
    ${f('markup', 'Default catering margin %', { type: 'number', min: 0 })}<div></div>${f('terms', 'Terms printed on bills', { type: 'textarea', full: true })}</div>
  ${edit ? `<footer class="sheet-f" style="position:static"><span class="grow"></span><button class="btn primary" type="submit">Save settings</button></footer>` : ''}</form>

  ${packagesCard()}
  <div class="card"><div class="card-h"><div><h3>Business type & sections${info('set-modules')}</h3><p>Hide what you don’t use. A tent house can switch off catering, a caterer can switch off inventory.</p></div></div><div class="sheet-b stack" style="padding-top:12px">
    <div class="row-flex">${BIZ_TYPES.map(([k, l]) => `<label class="check"><input type="checkbox" ${ro} ${(st.bizTypes || []).includes(k) ? 'checked' : ''} onchange="A.bizType('${k}',this.checked)"> <span>${l}</span></label>`).join('')}</div>
    <div class="grid g3" style="gap:8px">${MODULES.filter(m => !['dashboard', 'settings', 'team'].includes(m.key)).map(m => `<label class="check"><input type="checkbox" ${ro} ${moduleOn(m.key) ? 'checked' : ''} onchange="A.modToggle('${m.key}',this.checked)"> <span>${esc(m.label)}</span></label>`).join('')}</div></div></div>

  <div class="card"><div class="card-h"><div><h3>Peak saaya / muhurat dates${info('set-saaya')}</h3><p>Highlighted on the calendar so you price high-demand dates right</p></div>${edit ? `<button class="btn sm" onclick="A.saayaForm()">${ic('plus')} Add date</button>` : ''}</div><div class="rows">${(st.saaya || []).slice().sort(by('date')).map((s, i) => `<div class="row"><span class="pill accent">${fmtShort(s.date)}</span><div class="main-col">${esc(s.label || '')}</div>${edit ? `<button class="btn sm ghost" onclick="A.delSaaya('${s.date}')">${ic('trash')}</button>` : ''}</div>`).join('') || empty('No dates added', 'Add the wedding muhurat dates from your panchang.')}</div></div>

  ${importCard()}
  <div class="card"><div class="card-h"><div><h3>Data & backup${info('set-data')}</h3><p>${S.adapter.mode === 'cloud' ? 'Cloud sync is on. Data is stored in your Supabase project.' : 'Offline mode. Data is stored in this browser only; take backups regularly.'}</p></div></div><div class="sheet-b row-flex" style="padding-top:12px">
    ${!FRAMED ? `<button class="btn" onclick="A.exportBackup()">${ic('download')} Download backup</button>` : `<button class="btn" onclick="A.exportBackup()">${ic('copy')} Copy backup</button>`}
    ${lvl('settings') >= 3 ? `<label class="btn">${ic('upload')} Restore from file<input type="file" accept=".json,application/json" hidden onchange="A.importBackup(this.files[0])"></label>` : ''}</div>
    ${S.adapter.mode === 'local' ? `<div class="banner warn" style="margin:0 16px 16px">${ic('alert')}<span>To let your team log in from their own phones, connect a free Supabase project. Steps are in the README that comes with the app (about 10 minutes).</span></div>` : ''}</div>
  </div>`;
};
async function saveSettingsRec(patch) { const st = { ...settings(), ...patch, id: 'main' }; await save('settings', st); return st; }
A.saveSettings = async e => { e.preventDefault(); try { const v = readForm(e.target); ['gstRate', 'dueDays', 'overheadPerPlate', 'markup'].forEach(k => v[k] = +v[k] || 0); v.gstin = (v.gstin || '').toUpperCase(); await saveSettingsRec(v); logAct('Updated business settings'); S.org.name = v.bizName; toast('Settings saved'); render(); } catch (err) { toast(err.message, 'bad'); } };
A.bizType = async (k, on) => { try { const st = settings(); const t = new Set(st.bizTypes || []); on ? t.add(k) : t.delete(k); await saveSettingsRec({ bizTypes: [...t] }); render(); } catch (err) { toast(err.message, 'bad'); } };
A.modToggle = async (k, on) => { try { const st = settings(); await saveSettingsRec({ modules: { ...(st.modules || {}), [k]: on } }); render(); } catch (err) { toast(err.message, 'bad'); } };
A.saayaForm = () => formModal({ title: 'Add peak date', fields: [{ name: 'date', label: 'Date', type: 'date', required: true }, { name: 'label', label: 'Label', placeholder: 'e.g. Dev Uthani Ekadashi' }], onSubmit: async v => { const st = settings(); await saveSettingsRec({ saaya: [...(st.saaya || []).filter(s => s.date !== v.date), v] }); render(); } });
A.delSaaya = async d => { try { await saveSettingsRec({ saaya: (settings().saaya || []).filter(s => s.date !== d) }); render(); } catch (err) { toast(err.message, 'bad'); } };
A.exportBackup = () => { const data = { app: 'SabManage', version: APP_VERSION, exported: new Date().toISOString(), business: S.org.name, data: S.data, roles: S.roles }; downloadFile(`eventpro_backup_${todayLocal()}.json`, JSON.stringify(data, null, 1), 'application/json'); logAct('Exported data backup'); };
A.importBackup = file => { if (!file) return; const r = new FileReader(); r.onload = () => { let b; try { b = JSON.parse(r.result); if (!b.data) throw 0; } catch (e) { toast('That file is not an SabManage backup', 'bad'); return; }
  const n = Object.values(b.data).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
  confirmBox('Restore backup?', `${n} records from ${b.business || 'a backup'} (${(b.exported || '').slice(0, 10)}) will be merged in. Records with the same ID are replaced.`, 'Restore', async () => { need('settings', 3); for (const [c, arr] of Object.entries(b.data)) { if (!Array.isArray(arr) || !COLL_MODULE[c]) continue; for (const rec of arr) { if (rec && rec.id) await S.adapter.put(S.org.orgId, c, rec); } } logAct('Restored backup'); await openOrg(S.org.orgId); toast('Backup restored'); }, 'primary'); }; r.readAsText(file); };
