/* SabManage lead link: POST (or GET) https://sabmanage.com/api/lead?key=<business lead key>
   Used by Make / Zapier / Pabbly (Meta lead ads), the Google Form script, websites and any form.
   The fields are read the same way as in the app (src/leads.js normLead — keep both in sync)
   and saved through the database function lead_intake (checks the key, throttles, notifies the team). */
const SB_URL = process.env.SUPABASE_URL || 'https://uregwtavhkjowiltukiq.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWd3dGF2aGtqb3dpbHR1a2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTA1MjksImV4cCI6MjEwNzcyNjUyOX0.bVRTpmkE_c30j-_pegk0HLdGaSeSNqQ3pwtBjeRoAIw';
const LEAD_SRC = ['Meta / Facebook', 'Instagram', 'Google Form', 'Website', 'Google Ads', 'Phone call', 'WhatsApp', 'Walk-in', 'Referral', 'Wedding portal', 'Other'];
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


function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = Object.fromEntries(new URLSearchParams(b)); } }
  if (Buffer.isBuffer && Buffer.isBuffer(b)) { const t = b.toString('utf8'); try { b = JSON.parse(t); } catch (e) { b = Object.fromEntries(new URLSearchParams(t)); } }
  if (Array.isArray(b)) b = b[0] || {};
  return b && typeof b === 'object' ? b : {};
}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {}; const key = String(q.key || '').trim();
  if (!/^[a-z0-9]{16,64}$/i.test(key)) return res.status(400).json({ ok: false, error: 'Lead link key is missing or wrong' });
  const raw = req.method === 'GET' ? { ...q } : { ...q, ...readBody(req) }; delete raw.key;
  const lead = normLead(raw, q.source ? srcName(q.source) : 'Website');
  if (!lead.name && !lead.phone && !lead.email) return res.status(200).json({ ok: false, error: 'No name, phone or email in the lead' });
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/lead_intake`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: key, p: lead }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status === 400 ? 400 : 502).json({ ok: false, error: j.message || 'Could not save the lead' });
    return res.status(200).json({ ok: true, id: j && j.id, duplicate: !!(j && j.duplicate) });
  } catch (e) { return res.status(502).json({ ok: false, error: 'Could not reach the database' }); }
};
module.exports.normLead = normLead;
