/* ================= Marketing: free tools to get more bookings =================
   Everything here runs inside the app with the business's own data: no paid service,
   no extra hosting. Tabs: follow-ups, Google reviews, posters, rate card, clients
   (export, anniversaries, muhurat campaigns), QR poster, refer & share. */
const QR_SRC = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const MK_TABS = [['followup', 'Follow-ups'], ['reviews', 'Google reviews'], ['posters', 'Posters'], ['ratecard', 'Rate card'], ['clients', 'Clients'], ['qr', 'QR poster'], ['share', 'Refer & share']];
const HI = () => I18N.lang === 'hi';
const refCode = orgId => String(orgId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
const phoneDigits = p => { const d = String(p || '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };

function clientsList() {
  const map = new Map();
  col('events').filter(e => e.client).forEach(e => {
    const k = phoneDigits(e.phone) || e.client.trim().toLowerCase(); const c = map.get(k) || { name: e.client, phone: phoneDigits(e.phone), email: e.email || '', events: [], billed: 0 };
    c.events.push(e); if (!c.email && e.email) c.email = e.email; map.set(k, c);
  });
  const billedBy = {}; col('invoices').filter(i => i.type === 'invoice' && i.eventId).forEach(i => { billedBy[i.eventId] = (billedBy[i.eventId] || 0) + invCalc(i).total; });
  return [...map.values()].map(c => { c.events.sort((a, b) => (b.date || '').localeCompare(a.date || '')); c.last = c.events[0]; c.billed = sum(c.events, e => billedBy[e.id] || 0); return c; }).sort((a, b) => (b.last?.date || '').localeCompare(a.last?.date || ''));
}
function bizLine() { const st = settings(); return `${st.bizName || ''}${st.phone ? ' · ' + st.phone : ''}`; }

V.marketing = () => {
  const tab = MK_TABS.find(t => t[0] === S.params.tab) ? S.params.tab : 'followup';
  const due = col('events').filter(followDue).length;
  const head = pageHead('Marketing', 'Free tools to get more bookings: follow-ups, Google reviews, posters, rate card, client list and QR code.');
  const tabs = `<div class="tabs">${MK_TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="A.setP('tab','${k}')">${l}${k === 'followup' && due ? ` <span class="tabn">${due}</span>` : ''}</button>`).join('')}${tabHelp('mk-' + tab)}</div>`;
  return head + tabs + MK[tab]();
};
const MK = {};

/* ---------- 1. Follow-ups ---------- */
function followMsg(e) {
  const st = settings(); const d = e.date ? fmtDate(e.date) : '';
  if (HI()) return e.stage === 'Quoted'
    ? `नमस्ते ${e.client} जी 🙏\n${st.bizName} से बात कर रहे हैं। ${d ? d + ' के ' : ''}${e.type || 'इवेंट'} के लिए भेजा गया कोटेशन आपने देखा? कोई सवाल हो या कुछ बदलना हो तो बताइए। तारीख अभी खाली है, जल्दी पक्का करने पर हम आपके लिए रोक लेंगे।\n${bizLine()}`
    : `नमस्ते ${e.client} जी 🙏\n${st.bizName} से बात कर रहे हैं। आपने ${d ? d + ' के ' : ''}${e.type || 'इवेंट'} के लिए पूछा था। क्या हम आपको पैकेज और दाम भेज दें? मिलने या साइट देखने का समय भी बता सकते हैं।\n${bizLine()}`;
  return e.stage === 'Quoted'
    ? `Namaste ${e.client} ji 🙏\nThis is ${st.bizName}. Did you get a chance to look at our quotation for your ${e.type || 'event'}${d ? ' on ' + d : ''}? Happy to change anything you need. The date is still free; confirm soon and we will hold it for you.\n${bizLine()}`
    : `Namaste ${e.client} ji 🙏\nThis is ${st.bizName}. You had asked about your ${e.type || 'event'}${d ? ' on ' + d : ''}. Shall we send you our packages and prices? We can also visit the venue at a time that suits you.\n${bizLine()}`;
}
MK.followup = () => {
  const t = todayLocal();
  const list = col('events').filter(e => ['Enquiry', 'Quoted'].includes(e.stage) && !(e.date && eventEnd(e) < t)).sort((a, b) => (followDue(b) - followDue(a)) || (a.date || '9').localeCompare(b.date || '9'));
  const edit = can('bookings', 2);
  const rows = list.map(e => {
    const last = e.followUpAt; const dueNow = followDue(e);
    return `<div class="row" style="flex-wrap:wrap">${ibox(dueNow ? 'bell' : 'check', dueNow ? '#E11D74' : '#0B9B68')}<div class="main-col" style="min-width:170px"><b>${esc(e.client)}</b><div class="sub">${esc(e.title)}${e.date ? ' · ' + fmtShort(e.date) : ''} · ${last ? `Last follow-up ${fmtShort(last)}` : 'Never followed up'}${e.followCount ? ` · ${e.followCount}×` : ''}</div></div>
    <div class="row-flex" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${stagePill(e.stage)}${dueNow ? pill('Due today', 'bad') : ''}${waBtn(followMsg(e), e.phone, 'Message')}${e.phone ? `<a class="btn sm" href="tel:${esc(phoneDigits(e.phone))}">${ic('phone')} Call</a>` : ''}${edit ? `<button class="btn sm" onclick="A.followDone('${e.id}')">${ic('check')} Done</button><button class="btn sm ghost" onclick="A.go('event',{id:'${e.id}'})">Open</button>` : ''}</div></div>`;
  }).join('');
  return `<div class="banner" style="margin-bottom:12px">${ic('megaphone')}<span>Most bookings are lost because nobody called back. Every enquiry and quotation shows here; after you follow up, tap Done and it comes back after 2 days if the client has still not confirmed.</span></div>
  <div class="card"><div class="rows">${rows || empty('No open enquiries', 'New enquiries and quotations will show here for follow-up.', can('bookings', 2) ? `<button class="btn primary sm" onclick="A.eventForm()">${ic('plus')} New booking</button>` : '', 'megaphone', '#E11D74')}</div></div>`;
};
A.followDone = async id => { try { need('bookings', 2); const e = evById(id); e.followUpAt = todayLocal(); e.followCount = (+e.followCount || 0) + 1; await save('events', e, `Followed up with ${e.client}`); toast('Done. It will come back in 2 days if not confirmed.'); render(); } catch (err) { toast(err.message, 'bad'); } };

/* ---------- 2. Google reviews ---------- */
function reviewMsg(e) {
  const st = settings(); const link = st.googleReview || '';
  if (HI()) return `नमस्ते ${e.client} जी 🙏\n${st.bizName} की तरफ़ से आपके ${e.type || 'इवेंट'} में साथ देने के लिए धन्यवाद। अगर आपको हमारा काम पसंद आया हो तो गूगल पर 2 लाइन का रिव्यू ज़रूर लिखें, इससे हमें बहुत मदद मिलती है:\n${link}\nधन्यवाद!`;
  return `Namaste ${e.client} ji 🙏\nThank you for choosing ${st.bizName} for your ${e.type || 'event'}. If you liked our work, please write 2 lines on Google. It helps us a lot:\n${link}\nThank you!`;
}
MK.reviews = () => {
  const st = settings(); const t = todayLocal(); const editSt = can('settings', 2);
  const done = col('events').filter(e => e.client && ['Completed', 'Closed', 'Live'].includes(e.stage) && e.date && daysBetween(eventEnd(e), t) >= 0 && daysBetween(eventEnd(e), t) <= 120).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Your Google review link${info('mk-glink')}</h3><p>Get it from Google: open your business on Google Maps → Ask for reviews → Share review form → copy the link.</p></div></div>
  ${editSt ? `<form class="grid2" style="padding:14px 16px" onsubmit="A.saveMkLinks(event)">${fieldHTML({ name: 'googleReview', label: 'Google review link', value: st.googleReview, placeholder: 'https://g.page/r/…/review', full: true })}${fieldHTML({ name: 'instagram', label: 'Instagram page (optional)', value: st.instagram, placeholder: 'https://instagram.com/yourpage' })}<div class="field" style="align-self:end"><button class="btn primary" type="submit">Save links</button></div></form>`
    : `<div class="sheet-b small">${st.googleReview ? `<a href="${esc(st.googleReview)}" target="_blank" rel="noopener">${esc(st.googleReview)}</a>` : '<span class="muted">Ask the owner to add the Google review link in Marketing.</span>'}</div>`}</div>
  ${!st.googleReview ? `<div class="banner warn" style="margin-bottom:12px">${ic('alert')}<span>Add your Google review link above. Until then the message asks for a review without a link.</span></div>` : ''}
  <div class="card"><div class="card-h"><h3>Ask past clients</h3><span class="tiny muted">Events finished in the last 4 months</span></div><div class="rows">${done.map(e => `<div class="row" style="flex-wrap:wrap">${datebox(e.date, evStyle(e)[1])}<div class="main-col" style="min-width:160px"><b>${esc(e.client)}</b><div class="sub">${esc(e.title)}${e.reviewAskedAt ? ' · Asked ' + fmtShort(e.reviewAskedAt) : ''}</div></div><div class="row-flex" style="gap:6px">${e.reviewAskedAt ? pill('Asked', 'good') : ''}<a class="btn wa sm" href="${esc(waLink(reviewMsg(e), e.phone))}" target="_blank" rel="noopener" onclick="A.reviewAsked('${e.id}')">${ic('star')} Ask for review</a></div></div>`).join('') || empty('No finished events yet', 'After an event is marked Completed, ask the client for a Google review from here.', '', 'star', '#EAB308')}</div></div>`;
};
A.saveMkLinks = async ev => { ev.preventDefault(); try { need('settings', 2); const v = readForm(ev.target); const ok = u => !u || /^https?:\/\/\S+$/i.test(u); if (!ok(v.googleReview) || !ok(v.instagram)) throw new Error('Links must start with https://'); await saveSettingsRec({ googleReview: (v.googleReview || '').trim(), instagram: (v.instagram || '').trim() }); toast('Links saved'); render(); } catch (err) { toast(err.message, 'bad'); } };
A.reviewAsked = id => { setTimeout(async () => { try { if (!can('bookings', 2)) return; const e = evById(id); e.reviewAskedAt = todayLocal(); await save('events', e); render(); } catch (err) { } }, 300); };

/* ---------- 3. Posters (drawn on a canvas, saved as PNG) ---------- */
const POSTERS = [
  { k: 'diwali', name: 'Diwali', c: ['#4A0D1F', '#C2410C'], a: '#FCD34D', m: 'diya', head: ['Happy Diwali', 'शुभ दीपावली'], sub: ['Light up your celebrations with us', 'आपकी हर खुशी को रोशन करें हम'] },
  { k: 'season', name: 'Wedding season', c: ['#7F1D1D', '#DC2626'], a: '#FDE68A', m: 'marigold', head: ['Shaadi season bookings open', 'शादी के सीज़न की बुकिंग शुरू'], sub: ['Tent, lights, decor and catering. Book your date today.', 'टेंट, लाइट, डेकोर और खाना। आज ही अपनी तारीख बुक करें।'] },
  { k: 'dates', name: 'Muhurat dates', c: ['#581C87', '#C026D3'], a: '#FDE68A', m: 'marigold', head: ['Big muhurat dates', 'बड़े मुहूर्त की तारीखें'], sub: ['Book early, dates fill fast', 'जल्दी बुक करें, तारीखें तेज़ी से भर रही हैं'] },
  { k: 'offer', name: 'Special offer', c: ['#1E3A8A', '#0891B2'], a: '#FDE047', m: 'tag', head: ['Special offer', 'स्पेशल ऑफ़र'], sub: ['10% off on bookings made this month', 'इस महीने बुकिंग पर 10% छूट'] },
  { k: 'navratri', name: 'Navratri', c: ['#9D174D', '#EA580C'], a: '#FDE68A', m: 'rangoli', head: ['Happy Navratri', 'नवरात्रि की शुभकामनाएं'], sub: ['Garba, dandiya and jagran setups', 'गरबा, डांडिया और जागरण के सेटअप'] },
  { k: 'holi', name: 'Holi', c: ['#7C3AED', '#DB2777'], a: '#FDE047', m: 'colors', head: ['Happy Holi', 'होली की शुभकामनाएं'], sub: ['Colours, music and food for your party', 'आपकी पार्टी के लिए रंग, म्यूज़िक और खाना'] },
  { k: 'newyear', name: 'New Year', c: ['#0F172A', '#1E3A8A'], a: '#FCD34D', m: 'stars', head: ['Happy New Year', 'नया साल मुबारक'], sub: ['Thank you for a wonderful year', 'शानदार साल के लिए आपका धन्यवाद'] },
  { k: 'thanks', name: 'Thank you', c: ['#065F46', '#0D9488'], a: '#FDE68A', m: 'rangoli', head: ['Thank you for trusting us', 'आपके भरोसे के लिए धन्यवाद'], sub: ['500+ happy families and counting', 'सैकड़ों खुश परिवार'] }
];
function posterState() {
  if (!S.poster) { const p = POSTERS[0]; S.poster = { k: p.k, size: 'square', head: p.head[HI() ? 1 : 0], sub: p.sub[HI() ? 1 : 0], extra: '' }; }
  return S.poster;
}
function nextSaaya(limit = 6) { const t = todayLocal(); return (settings().saaya || []).filter(s => s.date >= t).sort(by('date')).slice(0, limit); }
MK.posters = () => {
  const ps = posterState(); const tpl = POSTERS.find(p => p.k === ps.k) || POSTERS[0];
  setTimeout(drawPosterNow, 30);
  return `<div class="split poster-split"><div class="card pad stack">
    <div><div class="eyebrow" style="margin-bottom:8px">Pick a design</div><div class="tpl-grid">${POSTERS.map(p => `<button class="tpl ${p.k === tpl.k ? 'on' : ''}" style="--c1:${p.c[0]};--c2:${p.c[1]}" onclick="A.posterTpl('${p.k}')"><span>${p.name}</span></button>`).join('')}</div></div>
    ${fieldHTML({ name: 'ph', label: 'Big line', value: ps.head })}
    ${fieldHTML({ name: 'ps', label: 'Small line', value: ps.sub })}
    ${fieldHTML({ name: 'px', label: tpl.k === 'dates' ? 'Dates (filled from your peak dates in Settings)' : 'Extra line (optional)', value: ps.extra, placeholder: tpl.k === 'offer' ? 'e.g. Valid till 30 November' : '' })}
    <div class="field"><span>Size</span>${seg('size', [['square', 'Post (square)'], ['story', 'Status / story']], ps.size, 'A.posterSet')}</div>
    <p class="tiny muted">Your logo, business name and phone are added from Settings. Change the words to Hindi or English as you like.</p>
  </div>
  <div class="card pad stack" style="align-items:center"><canvas id="posterCv" class="poster-cv ${ps.size}" width="1080" height="${ps.size === 'story' ? 1920 : 1080}" role="img" aria-label="Poster preview"></canvas>
    <div class="row-flex" style="justify-content:center"><button class="btn primary" onclick="A.posterSave()">${ic('download')} Download</button>${navigator.share ? `<button class="btn wa" onclick="A.posterShare()">${ic('share')} Share</button>` : ''}</div></div></div>`;
};
A.posterTpl = k => { const p = POSTERS.find(x => x.k === k); const ps = posterState(); ps.k = k; ps.head = p.head[HI() ? 1 : 0]; ps.sub = p.sub[HI() ? 1 : 0]; ps.extra = k === 'dates' ? nextSaaya(4).map(s => T(fmtShort(s.date))).join(' · ') : ''; render(); };
A.posterSet = (k, v) => { posterState()[k] = v; render(); };
document.addEventListener('input', ev => { const n = ev.target?.name; if (!S.poster || !['ph', 'ps', 'px'].includes(n) || !ev.target.closest('.poster-split')) return; S.poster[{ ph: 'head', ps: 'sub', px: 'extra' }[n]] = ev.target.value; drawPosterNow(); });
const imgCache = {};
function loadImg(src) { if (!src) return Promise.resolve(null); if (imgCache[src]) return imgCache[src]; return (imgCache[src] = new Promise(res => { const i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; })); }
async function fontsReady(text) { try { await Promise.all(['800 80px "Baloo 2"', '600 40px Mukta', '700 40px Mukta'].map(f => document.fonts.load(f, text))); } catch (e) { } }
function wrapLines(ctx, text, maxW) { const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
function seeded(n) { let x = n; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
function drawMotif(ctx, m, W, H, a) {
  const rnd = seeded(7); ctx.save();
  if (m === 'diya') { for (let i = 0; i < 5; i++) { const x = W * (0.12 + i * 0.19), y = H - 250; ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.ellipse(x, y, 62, 26, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#B45309'; ctx.fillRect(x - 62, y - 4, 124, 8); const g = ctx.createRadialGradient(x, y - 50, 4, x, y - 50, 70); g.addColorStop(0, 'rgba(253,224,71,.9)'); g.addColorStop(1, 'rgba(253,224,71,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 50, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#FDE047'; ctx.beginPath(); ctx.moveTo(x, y - 82); ctx.quadraticCurveTo(x + 18, y - 40, x, y - 16); ctx.quadraticCurveTo(x - 18, y - 40, x, y - 82); ctx.fill(); } }
  if (m === 'marigold') { for (let r = 0; r < 2; r++) for (let i = 0; i <= 22; i++) { const x = W * i / 22, y = 40 + r * 48 + Math.sin(i / 22 * Math.PI) * 90; ctx.fillStyle = (i + r) % 2 ? '#F59E0B' : '#FB923C'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); } }
  if (m === 'rangoli') { [[0, 0], [W, H]].forEach(([cx, cy]) => { for (let ring = 0; ring < 4; ring++) { const n = 12 + ring * 6, rr = 90 + ring * 70; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; ctx.fillStyle = ['rgba(253,224,71,.55)', 'rgba(255,255,255,.35)', 'rgba(251,146,60,.5)', 'rgba(244,114,182,.45)'][ring]; ctx.beginPath(); ctx.ellipse(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, 22, 10, t, 0, 7); ctx.fill(); } } }); }
  if (m === 'colors') { const cs = ['#F472B6', '#FDE047', '#34D399', '#60A5FA', '#FB923C', '#A78BFA']; for (let i = 0; i < 26; i++) { ctx.fillStyle = cs[i % cs.length] + 'AA'; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 20 + rnd() * 90, 0, 7); ctx.fill(); } }
  if (m === 'stars') { for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 5; ctx.fillStyle = i % 5 ? 'rgba(255,255,255,.7)' : a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } }
  if (m === 'tag') { ctx.translate(W - 190, 210); ctx.rotate(-0.25); ctx.fillStyle = a; ctx.beginPath(); ctx.arc(0, 0, 140, 0, 7); ctx.fill(); ctx.fillStyle = '#1E3A8A'; ctx.font = '800 92px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('%', 0, 8); }
  ctx.restore();
}
let posterBusy = 0;
async function drawPosterNow() {
  const cv = document.getElementById('posterCv'); if (!cv) return; const my = ++posterBusy;
  const ps = posterState(); const tpl = POSTERS.find(p => p.k === ps.k) || POSTERS[0]; const st = settings();
  await fontsReady(ps.head + ps.sub + ps.extra + (st.bizName || '')); const logo = await loadImg(st.logo); if (my !== posterBusy) return;
  const W = 1080, H = ps.size === 'story' ? 1920 : 1080; cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, tpl.c[0]); g.addColorStop(1, tpl.c[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(W * 0.85, H * 0.18, 300, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(W * 0.1, H * 0.75, 240, 0, 7); ctx.fill();
  drawMotif(ctx, tpl.m, W, H, tpl.a);
  const footH = 190; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // logo + name on top
  let y = tpl.m === 'marigold' ? 230 : 120;
  if (logo) { const s = 150; ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y + s / 2, s / 2 + 8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(W / 2, y + s / 2, s / 2, 0, 7); ctx.clip(); const r = Math.max(s / logo.width, s / logo.height); ctx.drawImage(logo, W / 2 - logo.width * r / 2, y + s / 2 - logo.height * r / 2, logo.width * r, logo.height * r); ctx.restore(); y += s + 60; }
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '700 40px Mukta, sans-serif'; ctx.fillText((st.bizName || '').toUpperCase(), W / 2, y); y += 40;
  // headline block centred in the free space
  const top = y, bottom = H - footH - (tpl.m === 'diya' ? 330 : 80);
  let fs = 128; ctx.font = `800 ${fs}px "Baloo 2", sans-serif`; let hl = wrapLines(ctx, ps.head, W - 140);
  while ((hl.length > 3 || hl.some(l => ctx.measureText(l).width > W - 140)) && fs > 60) { fs -= 6; ctx.font = `800 ${fs}px "Baloo 2", sans-serif`; hl = wrapLines(ctx, ps.head, W - 140); }
  ctx.font = '600 50px Mukta, sans-serif'; const sl = wrapLines(ctx, ps.sub, W - 180);
  ctx.font = '700 46px Mukta, sans-serif'; const xl = ps.extra ? wrapLines(ctx, ps.extra, W - 200) : [];
  const blockH = hl.length * fs * 1.08 + 30 + sl.length * 64 + (xl.length ? 40 + xl.length * 62 + 30 : 0);
  let by = top + Math.max(20, (bottom - top - blockH) / 2) + fs * 0.85;
  ctx.fillStyle = tpl.a; ctx.font = `800 ${fs}px "Baloo 2", sans-serif`; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18;
  hl.forEach(l => { ctx.fillText(l, W / 2, by); by += fs * 1.08; }); ctx.shadowBlur = 0; by += 10;
  ctx.fillStyle = '#fff'; ctx.font = '600 50px Mukta, sans-serif'; sl.forEach(l => { ctx.fillText(l, W / 2, by); by += 64; });
  if (xl.length) { by += 20; ctx.font = '700 46px Mukta, sans-serif'; const bw = Math.min(W - 120, Math.max(...xl.map(l => ctx.measureText(l).width)) + 80); const bh = xl.length * 62 + 30; ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(ctx, W / 2 - bw / 2, by - 50, bw, bh, 28); ctx.fill(); ctx.fillStyle = tpl.c[0]; xl.forEach(l => { ctx.fillText(l, W / 2, by); by += 62; }); }
  // footer band
  ctx.fillStyle = '#fff'; ctx.fillRect(0, H - footH, W, footH); ctx.fillStyle = tpl.c[0];
  ctx.font = '800 54px "Baloo 2", sans-serif'; ctx.fillText(st.phone ? '📞 ' + st.phone : (st.bizName || ''), W / 2, H - footH + 88);
  ctx.font = '600 34px Mukta, sans-serif'; ctx.fillStyle = '#475569'; ctx.fillText([st.city, st.instagram ? st.instagram.replace(/^https?:\/\/(www\.)?/, '') : ''].filter(Boolean).join('  ·  ') || (HI() ? 'कॉल या व्हाट्सऐप करें' : 'Call or WhatsApp'), W / 2, H - footH + 145);
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function posterBlob() { return new Promise(res => { const cv = document.getElementById('posterCv'); if (!cv) return res(null); cv.toBlob(b => res(b), 'image/png'); }); }
const posterName = () => `${(settings().bizName || 'poster').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${S.poster?.k || 'poster'}.png`;
A.posterSave = async () => { try { await drawPosterNow(); const b = await posterBlob(); if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = posterName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); toast('Poster saved'); } catch (err) { toast('Could not save the poster on this device. Take a screenshot instead.', 'bad'); } };
A.posterShare = async () => { try { await drawPosterNow(); const b = await posterBlob(); const f = new File([b], posterName(), { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: settings().bizName }); else A.posterSave(); } catch (err) { if (err?.name !== 'AbortError') A.posterSave(); } };

/* ---------- 4. Rate card / catalogue ---------- */
MK.ratecard = () => {
  const st = settings(); const rc = S.rc = S.rc || { inv: true, menu: true, note: '' };
  const inv = col('inventory').filter(i => +i.rate > 0).sort(by('name')); const cats = [...new Set(inv.map(i => i.category || 'Other'))];
  const dishes = col('dishes'); const courses = [...new Set(dishes.map(d => d.category || 'Other'))];
  const card = `<div class="paper ratecard" style="--pb:${esc(brandColor(st))}">${paperHead(st, T('RATE CARD'), `<div class="pm">${fmtDate(todayLocal())}</div>`)}
    ${rc.inv && moduleOn('inventory') && inv.length ? cats.map(c => `<h4 class="rc-h">${esc(T(c))}</h4><table class="rc-t"><tbody>${inv.filter(i => (i.category || 'Other') === c).map(i => `<tr><td>${esc(i.name)}</td><td class="r">${inr(i.rate)} <span class="muted">/ ${esc(T('day'))}</span></td></tr>`).join('')}</tbody></table>`).join('') : ''}
    ${rc.menu && moduleOn('catering') && dishes.length ? `<h4 class="rc-h">${esc(T('Menu'))}</h4>${courses.map(c => `<div class="rc-menu"><b>${esc(T(c))}</b><span>${dishes.filter(d => (d.category || 'Other') === c).map(d => esc(d.name)).join(' · ')}</span></div>`).join('')}` : ''}
    ${rc.note ? `<div class="rc-note">${esc(rc.note)}</div>` : ''}
    <div class="rc-foot">${esc(st.bizName || '')}${st.phone ? ' · ' + esc(st.phone) : ''}${st.city ? ' · ' + esc(st.city) : ''}<br><span class="muted">${esc(T('Rates are per day, before GST. Final price depends on date, quantity and venue.'))}</span></div></div>`;
  return `<div class="split"><div class="card pad stack">
    <label class="check"><input type="checkbox" ${rc.inv ? 'checked' : ''} onchange="A.rcSet('inv',this.checked)"> <span>Show godown items with rent per day (${inv.length})</span></label>
    <label class="check"><input type="checkbox" ${rc.menu ? 'checked' : ''} onchange="A.rcSet('menu',this.checked)"> <span>Show menu dishes (${dishes.length})</span></label>
    ${fieldHTML({ name: 'rcnote', label: 'Packages / offer note (optional)', type: 'textarea', value: rc.note, placeholder: 'e.g. Wedding package for 500 guests from ₹2,50,000. Free DJ on bookings this month.' })}
    <button class="btn" onclick="A.rcSet('note',document.querySelector('[name=rcnote]').value)">Update card</button>
    <p class="tiny muted">Only items with a rent filled in are shown. Rates come from Inventory; dishes from Catering.</p>
    <div class="row-flex">${!FRAMED ? `<button class="btn primary" onclick="window.print()">${ic('print')} Print / save PDF</button>` : ''}${waBtn(rateCardText(), '', 'Send as text')}</div></div>
  <div><div id="printArea">${card}</div></div></div>`;
};
A.rcSet = (k, v) => { S.rc[k] = v; render(); };
function rateCardText() {
  const st = settings(); const inv = col('inventory').filter(i => +i.rate > 0); const dishes = col('dishes'); const rc = S.rc || {};
  let t = `*${st.bizName || ''}*\n${HI() ? 'रेट कार्ड' : 'Rate card'}\n`;
  if (rc.inv !== false && inv.length) t += '\n' + inv.map(i => `• ${i.name}: ${inr(i.rate)}/${HI() ? 'दिन' : 'day'}`).join('\n') + '\n';
  if (rc.menu !== false && dishes.length) t += `\n${HI() ? 'मेन्यू' : 'Menu'}: ` + dishes.map(d => d.name).join(', ') + '\n';
  if (rc.note) t += '\n' + rc.note + '\n';
  return t + `\n📞 ${st.phone || ''}`;
}

/* ---------- 5. Clients: list, export, anniversaries, muhurat campaigns ---------- */
function anniversaries(days = 30) {
  const t = todayLocal(); const y = +t.slice(0, 4);
  return col('events').filter(e => e.date && ['Wedding', 'Ring Ceremony'].includes(e.type) && e.stage !== 'Cancelled' && +e.date.slice(0, 4) < y).map(e => {
    let next = y + e.date.slice(4); if (next < t) next = (y + 1) + e.date.slice(4); return { e, next, d: daysBetween(t, next), years: +next.slice(0, 4) - +e.date.slice(0, 4) };
  }).filter(x => x.d >= 0 && x.d <= days).sort((a, b) => a.d - b.d);
}
function anniMsg(x) {
  const st = settings(); const e = x.e;
  if (HI()) return `नमस्ते ${e.client} जी 🙏\nशादी की ${x.years}वीं सालगिरह की ढेर सारी शुभकामनाएं! ${fmtDate(e.date)} को आपकी खुशियों में शामिल होना ${st.bizName} के लिए सौभाग्य था। परिवार के किसी भी फ़ंक्शन के लिए हमें याद करें।\n${bizLine()}`;
  return `Namaste ${e.client} ji 🙏\nHappy ${x.years}${x.years === 1 ? 'st' : x.years === 2 ? 'nd' : x.years === 3 ? 'rd' : 'th'} wedding anniversary! It was an honour for ${st.bizName} to be part of your wedding on ${fmtDate(e.date)}. For any family function, we are just a call away.\n${bizLine()}`;
}
function campaignMsg(s) {
  const st = settings();
  if (HI()) return `नमस्ते 🙏\n${fmtDate(s.date)}${s.label ? ' (' + s.label + ')' : ''} का बड़ा मुहूर्त आ रहा है और तारीखें तेज़ी से भर रही हैं। टेंट, लाइट, डेकोर और खाने की बुकिंग के लिए आज ही संपर्क करें। पुराने ग्राहकों के लिए खास दाम।\n${bizLine()}`;
  return `Namaste 🙏\nThe big muhurat on ${fmtDate(s.date)}${s.label ? ' (' + s.label + ')' : ''} is coming and dates are filling fast. Call us today for tent, lights, decor and catering. Special rates for our old clients.\n${bizLine()}`;
}
MK.clients = () => {
  const q = (S.filters.mkq || '').toLowerCase(); const all = clientsList(); const list = all.filter(c => !q || (c.name + ' ' + c.phone).toLowerCase().includes(q));
  const ann = anniversaries(30); const sa = nextSaaya(3).filter(s => daysBetween(todayLocal(), s.date) <= 60); const money = can('invoices');
  return `<div class="split" style="margin-bottom:14px">
    <div class="card"><div class="card-h"><div><h3>Anniversaries in the next 30 days${info('mk-anni')}</h3><p>Weddings you did in earlier years. A wish brings the next booking.</p></div></div><div class="rows">${ann.map(x => `<div class="row" style="flex-wrap:wrap">${datebox(x.next, '#E11D74')}<div class="main-col" style="min-width:150px"><b>${esc(x.e.client)}</b><div class="sub">${x.d === 0 ? 'Today' : x.d === 1 ? 'Tomorrow' : `In ${x.d} days`} · ${x.years} years · ${esc(x.e.title)}</div></div>${waBtn(anniMsg(x), x.e.phone, 'Send wish')}</div>`).join('') || empty('None in the next 30 days', 'Wedding anniversaries of your past clients show here.', '', 'gift', '#E11D74')}</div></div>
    <div class="card"><div class="card-h"><div><h3>Muhurat campaign${info('mk-campaign')}</h3><p>From the peak dates in Settings.</p></div>${can('settings', 2) ? `<button class="btn sm" onclick="A.go('settings')">Peak dates</button>` : ''}</div><div class="rows">${sa.map(s => `<div class="row" style="flex-wrap:wrap">${datebox(s.date, '#7C3AED')}<div class="main-col" style="min-width:150px"><b>${esc(s.label || 'Peak date')}</b><div class="sub">${daysBetween(todayLocal(), s.date)} days left · ${all.length} past clients</div></div><div class="row-flex" style="gap:6px"><button class="btn sm" onclick="A.copy(${esc(JSON.stringify(campaignMsg(s)))})">${ic('copy')} Copy message</button><button class="btn sm" onclick="A.posterTpl('dates');A.setP('tab','posters')">${ic('image')} Poster</button></div></div>`).join('') || empty('No peak date in the next 60 days', 'Add muhurat dates in Settings to get a reminder here.', '', 'calendar', '#7C3AED')}</div></div></div>
  <div class="card"><div class="card-h"><div><h3>All clients (${all.length})${info('mk-clients')}</h3><p>Made from your bookings. Download the list for a WhatsApp broadcast or Facebook / Instagram ads.</p></div>${all.length && !FRAMED ? `<button class="btn" onclick="A.exportClients()">${ic('download')} Download list</button>` : ''}</div>
    <div class="sheet-b" style="padding-top:12px"><div class="search"><input type="search" placeholder="Search name or phone" value="${esc(S.filters.mkq || '')}" oninput="A.setF('mkq',this.value)"></div></div>
    <div class="rows">${list.slice(0, 200).map(c => `<div class="row" style="flex-wrap:wrap"><div class="avatar">${esc(initials(c.name))}</div><div class="main-col" style="min-width:160px"><b>${esc(c.name)}</b><div class="sub">${esc(c.phone || '—')} · ${c.events.length} booking${c.events.length > 1 ? 's' : ''}${c.last?.type ? ' · ' + esc(c.last.type) : ''}${c.last?.date ? ' · ' + fmtShort(c.last.date) : ''}${money && c.billed ? ' · ' + inr(c.billed) : ''}</div></div>${c.phone ? waBtn(`Namaste ${c.name} ji 🙏\n`, c.phone, 'Message') : ''}</div>`).join('') || empty('No clients yet', 'Clients are added automatically from your bookings.', '', 'users', '#0D9488')}</div></div>`;
};
A.exportClients = () => {
  const csvq = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = clientsList().map(c => [c.name, c.phone ? '+91' + c.phone : '', c.email, c.last?.type || '', c.last?.date || '', c.events.length, can('invoices') ? Math.round(c.billed) : ''].map(csvq).join(','));
  downloadFile('clients.csv', '﻿' + ['Name,Phone,Email,Last event,Last event date,Bookings,Total billed', ...rows].join('\n'), 'text/csv'); logAct('Downloaded client list');
};

/* ---------- 6. QR poster ---------- */
async function qrLib() { if (!window.qrcode) await loadScript(QR_SRC); return window.qrcode; }
/* kept short and in Latin letters so the QR stays small and easy to scan */
function enquiryLink() { return waLink('Namaste, booking enquiry', settings().phone); }
MK.qr = () => {
  const st = settings(); const kind = S.filters.qrKind || 'wa';
  setTimeout(drawQrNow, 30);
  if (!st.phone && kind === 'wa') return `<div class="card">${empty('Add your mobile number first', 'The QR code opens a WhatsApp chat with this number. Add it in Settings → Business profile.', can('settings', 2) ? `<button class="btn primary sm" onclick="A.go('settings')">Open Settings</button>` : '', 'qr', '#E11D74')}</div>`;
  return `<div class="split poster-split"><div class="card pad stack">
    <div class="field"><span>QR code opens</span>${seg('qrKind', [['wa', 'WhatsApp enquiry'], ['review', 'Google review']], kind, 'A.setF')}</div>
    ${kind === 'review' && !st.googleReview ? `<div class="banner warn">${ic('alert')}<span>Add your Google review link in the Google reviews tab first.</span></div>` : ''}
    <p class="small">${kind === 'wa' ? 'Print it and put it at your shop, godown, on vehicles and at every event entrance. Anyone who scans it lands in a WhatsApp chat with you, with a message already typed.' : 'Keep it at the buffet counter or exit. Happy guests scan it and write a Google review on the spot.'}</p>
    <div class="row-flex"><button class="btn primary" onclick="A.qrSave()">${ic('download')} Download</button>${!FRAMED ? `<button class="btn" onclick="A.qrPrint()">${ic('print')} Print</button>` : ''}</div></div>
  <div class="card pad" style="display:grid;place-items:center"><canvas id="qrCv" class="poster-cv a4" width="1240" height="1754" role="img" aria-label="QR poster preview"></canvas></div></div>`;
};
async function drawQrNow() {
  const cv = document.getElementById('qrCv'); if (!cv) return; const st = settings(); const kind = S.filters.qrKind || 'wa';
  const url = kind === 'review' ? (st.googleReview || '') : enquiryLink(); if (!url) { const c = cv.getContext('2d'); c.fillStyle = '#F3F5FA'; c.fillRect(0, 0, cv.width, cv.height); return; }
  let qr; try { const lib = await qrLib(); qr = lib(0, 'M'); qr.addData(url); qr.make(); } catch (e) { toast('Could not load the QR maker. Check the internet and try again.', 'bad'); return; }
  const head = kind === 'review' ? (HI() ? 'हमारा काम पसंद आया?' : 'Liked our work?') : (HI() ? 'बुकिंग के लिए स्कैन करें' : 'Scan to book with us');
  const sub = kind === 'review' ? (HI() ? 'स्कैन करें और गूगल पर रिव्यू लिखें' : 'Scan and write us a Google review') : (HI() ? 'सीधे व्हाट्सऐप पर बात करें' : 'Chat with us directly on WhatsApp');
  await fontsReady(head + sub + (st.bizName || '')); const logo = await loadImg(st.logo);
  const W = 1240, H = 1754, ctx = cv.getContext('2d'); const c1 = brandColor(st) || '#1F5EFF';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = c1; ctx.fillRect(0, 0, W, 360); ctx.textAlign = 'center';
  let y = 90; if (logo) { const s = 140; ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y + s / 2, s / 2 + 8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(W / 2, y + s / 2, s / 2, 0, 7); ctx.clip(); const r = Math.max(s / logo.width, s / logo.height); ctx.drawImage(logo, W / 2 - logo.width * r / 2, y + s / 2 - logo.height * r / 2, logo.width * r, logo.height * r); ctx.restore(); y += s + 70; } else y = 200;
  ctx.fillStyle = '#fff'; ctx.font = '800 64px "Baloo 2", sans-serif'; ctx.fillText(st.bizName || '', W / 2, y);
  ctx.fillStyle = '#121831'; ctx.font = '800 92px "Baloo 2", sans-serif'; ctx.fillText(head, W / 2, 500);
  ctx.fillStyle = '#475569'; ctx.font = '600 48px Mukta, sans-serif'; ctx.fillText(sub, W / 2, 575);
  const n = qr.getModuleCount(), box = 760, cell = Math.floor(box / (n + 8)), size = cell * (n + 8), x0 = (W - size) / 2, y0 = 640;
  ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, size, size); ctx.strokeStyle = c1; ctx.lineWidth = 10; roundRect(ctx, x0 - 20, y0 - 20, size + 40, size + 40, 40); ctx.stroke();
  ctx.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x0 + (c + 4) * cell, y0 + (r + 4) * cell, cell, cell);
  ctx.fillStyle = c1; ctx.font = '800 72px "Baloo 2", sans-serif'; ctx.fillText(st.phone ? '📞 ' + st.phone : '', W / 2, y0 + size + 140);
  ctx.fillStyle = '#64748B'; ctx.font = '600 40px Mukta, sans-serif'; ctx.fillText([st.address, st.city].filter(Boolean).join(', ').slice(0, 60), W / 2, y0 + size + 210);
}
A.qrSave = async () => { await drawQrNow(); const cv = document.getElementById('qrCv'); if (!cv) return; cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qr-poster.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }, 'image/png'); };
A.qrPrint = async () => { await drawQrNow(); const cv = document.getElementById('qrCv'); if (!cv) return; modal(`${sheetHead('QR poster')}<div class="sheet-b"><div id="printArea"><img src="${cv.toDataURL('image/png')}" alt="QR poster" style="width:100%;display:block"></div></div><footer class="sheet-f no-print"><span class="grow"></span><button class="btn primary" onclick="window.print()">${ic('print')} Print</button></footer>`, { wide: true }); };

/* ---------- 7. Refer & share ---------- */
function shareBizText() {
  const st = settings(); const types = (st.bizTypes || []).map(t => ({ tent: HI() ? 'टेंट और डेकोर' : 'Tent & decor', caterer: HI() ? 'कैटरिंग' : 'Catering', event: HI() ? 'इवेंट मैनेजमेंट' : 'Event management' }[t])).filter(Boolean).join(', ');
  return `*${st.bizName || ''}*${st.tagline ? '\n' + st.tagline : ''}\n${types}${st.city ? ' · ' + st.city : ''}\n📞 ${st.phone || ''}${st.googleReview ? `\n⭐ ${HI() ? 'हमारे रिव्यू' : 'Our reviews'}: ${st.googleReview}` : ''}${st.instagram ? `\n📸 ${st.instagram}` : ''}`;
}
MK.share = () => {
  const P = S.platform || DEFAULT_PLATFORM; const code = refCode(S.org.orgId); const link = `https://sabmanage.com/?ref=${code}`;
  const msg = HI() ? `नमस्ते 🙏 मैं अपने बिज़नेस की बुकिंग, स्टॉक, बिल और स्टाफ़ का पूरा हिसाब ${P.appName || 'SabManage'} ऐप पर रखता हूं। टेंट, कैटरिंग और इवेंट वालों के लिए बहुत काम का है। आप भी आज़माएं: ${link}` : `Namaste 🙏 I run my bookings, stock, bills and staff on ${P.appName || 'SabManage'}. Very useful for tent, catering and event businesses. Try it: ${link}`;
  return `<div class="grid g-auto">
    <div class="card pad stack">${ibox('share', '#0B9B68', 'lg')}<h3>Share your business${info('mk-sharebiz')}</h3><p class="small muted">A ready message with your services, phone, Google reviews and Instagram. Send it to new enquiries or post it in WhatsApp groups.</p><pre class="share-pre">${esc(shareBizText())}</pre><div class="row-flex">${waBtn(shareBizText(), '', 'Send on WhatsApp', 'btn wa')}<button class="btn" onclick="A.copy(${esc(JSON.stringify(shareBizText()))})">${ic('copy')} Copy</button></div></div>
    ${S.role === 'owner' ? `<div class="card pad stack">${ibox('gift', '#E11D74', 'lg')}<h3>Refer another business${info('mk-refer')}</h3><p class="small muted">Know another tent house, caterer or event manager? Send them your link. When they join, we know you referred them.${P.referralReward ? ' ' + esc(P.referralReward) : ''}</p><div class="banner"><span class="mono small" style="overflow-wrap:anywhere">${esc(link)}</span></div><div class="row-flex">${waBtn(msg, '', 'Send on WhatsApp', 'btn wa')}<button class="btn" onclick="A.copy('${link}')">${ic('copy')} Copy link</button></div></div>` : ''}</div>`;
};
