'use strict';
/* ================= EventPro OS v3 — core ================= */
const APP_VERSION = '3.0.0';
const CFG = window.EVENTPRO_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => (n < 0 ? '-₹' : '₹') + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');
const num = n => Math.round(Number(n) || 0).toLocaleString('en-IN');
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
function todayLocal(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addDays(s, n) { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return todayLocal(d); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5); }
const fmtDate = s => s ? new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtShort = s => s ? new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const fmtDay = s => s ? new Date(s + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—';
const by = k => (a, b) => String(a[k] || '').localeCompare(String(b[k] || ''));
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
function fyOf(date) { const d = new Date((date || todayLocal()) + 'T00:00'); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return String(y % 100).padStart(2, '0') + '-' + String((y + 1) % 100).padStart(2, '0'); }
function inviteCode() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s.slice(0, 4) + '-' + s.slice(4); }
function guestToken() { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
function waLink(text, phone) { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return 'https://wa.me/' + (d || '') + '?text=' + encodeURIComponent(text); }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
function inWords(n) {
  n = Math.round(Math.abs(n)); if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const out = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) out.push(three(cr) + ' Crore'); if (lk) out.push(two(lk) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (n) out.push(three(n));
  return out.join(' ');
}

/* Safe storage (falls back to memory when blocked) */
const LS = (() => { const mem = {}; return {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : (k in mem ? mem[k] : d); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
}; })();

/* Icons */
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  pot: 'M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-1 1-2 1-3M14 6c0-1 1-2 1-3',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  rupee: 'M7 4h10M7 8h10M7 4c6 0 6 8 0 8H6l8 8',
  handshake: 'M2 12l4-4h4l2 2 2-2h4l4 4M6 8l6 7 6-7M4 14l4 4M20 14l-4 4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  progress: 'M4 6h16M4 12h11M4 18h6',
  wallet: 'M3 7h17v13H3zM3 7l3-4h11v4M15 13.5h2',
  chart: 'M4 20V11M10 20V5M16 20v-7M2 20h20',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  plus: 'M12 5v14M5 12h14', more: 'M4 6h16M4 12h16M4 18h16', back: 'M15 18l-6-6 6-6', x: 'M18 6L6 18M6 6l12 12',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  wa: 'M21 12a9 9 0 0 1-13.5 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12zM9 9.5c.5 2.5 2.5 4.5 5 5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', truck: 'M2 6h12v10H2zM14 9h4l3 3v4h-7M6 19.5a1.5 1.5 0 1 0 0-.1M17 19.5a1.5 1.5 0 1 0 0-.1',
  check: 'M5 12l5 5L20 7', link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z', download: 'M12 3v12M7 10l5 5 5-5M4 21h16', upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z', key: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z',
  tent: 'M3 20L12 4l9 16zM12 4v16M8 20l4-6 4 6', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  chair: 'M7 3v9M17 3v9M7 7h10M5 12h14v3H5zM6 15v6M18 15v6', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', utensils: 'M4 3v8a2 2 0 0 0 4 0V3M6 13v8M18 21V3c-2 0-4 2-4 6v4h4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z',
  fuel: 'M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 8h5M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3',
  cart: 'M3 4h2l2.4 11h10.2L20 7H6.2M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01', building: 'M4 21V4h10v17M14 9h6v12M2 21h20M7 8h4M7 12h4M7 16h4',
  wrench: 'M14 6l4 4M4 20l9-9M13 7a4 4 0 1 1 4 4', dots: 'M5 12h.01M12 12h.01M19 12h.01',
  rings: 'M4 14a5 5 0 1 0 10 0a5 5 0 1 0-10 0M10 14a5 5 0 1 0 10 0a5 5 0 1 0-10 0M10 6l2-3 2 3', cake: 'M4 21h16M5 21v-7h14v7M5 17c2 1 3-1 4.5 0s3 1 4.5 0 3-1 5 0M12 14V9M12 5.5v.01',
  briefcase: 'M3 7h18v13H3zM9 7V4h6v3M3 12h18', music: 'M9 18V5l11-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  diya: 'M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8zM4 17h16l-2 4H6z', store: 'M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', pulse: 'M3 12h4l3-8 4 16 3-8h4', chev: 'M9 6l6 6-6 6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', pin: 'M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  arrow: 'M5 12h14M13 6l6 6-6 6', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'
};
const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;

/* ================= Domain constants ================= */
const BIZ_TYPES = [['tent', 'Tent House'], ['caterer', 'Caterer / Halwai'], ['event', 'Event Manager / Planner']];
const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Daily' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar', group: 'Daily' },
  { key: 'tasks', label: 'Live Tracker', short: 'Live', icon: 'pulse', group: 'Daily' },
  { key: 'inventory', label: 'Inventory', icon: 'box', group: 'Operations', biz: ['tent', 'event'] },
  { key: 'catering', label: 'Catering', icon: 'pot', group: 'Operations', biz: ['caterer', 'event'] },
  { key: 'vendors', label: 'Vendors & POs', icon: 'handshake', group: 'Operations' },
  { key: 'staff', label: 'Staff & Wages', icon: 'users', group: 'Operations' },
  { key: 'tools', label: 'Planner Tools', icon: 'ruler', group: 'Operations', biz: ['tent', 'event'] },
  { key: 'invoices', label: 'Invoices', icon: 'receipt', group: 'Money' },
  { key: 'payments', label: 'Payments', icon: 'rupee', group: 'Money' },
  { key: 'expenses', label: 'Expenses', icon: 'wallet', group: 'Money' },
  { key: 'reports', label: 'Reports & P&L', icon: 'chart', group: 'Money' },
  { key: 'reviews', label: 'Reviews', icon: 'star', group: 'Business' },
  { key: 'team', label: 'Team & Access', icon: 'shield', group: 'Business' },
  { key: 'settings', label: 'Settings', icon: 'gear', group: 'Business' }
];
const MOD_COLOR = { dashboard: '#1F5EFF', bookings: '#7C3AED', tasks: '#0EA5E9', inventory: '#2563EB', catering: '#16A34A', vendors: '#D97706', staff: '#0D9488', tools: '#4F46E5', invoices: '#DB2777', payments: '#0B9B68', expenses: '#EA580C', reports: '#0891B2', reviews: '#EAB308', team: '#475569', settings: '#64748B' };
MODULES.forEach(m => { m.c = MOD_COLOR[m.key]; });
const MOD = Object.fromEntries(MODULES.map(m => [m.key, m]));
const EV_STYLE = { 'Wedding': ['rings', '#E11D74'], 'Reception': ['sparkle', '#C026D3'], 'Sangeet & Mehendi': ['music', '#F59E0B'], 'Ring Ceremony': ['rings', '#8B5CF6'], 'Corporate Event': ['briefcase', '#2563EB'], 'Birthday / Anniversary': ['cake', '#F97316'], 'Religious / Jagran': ['diya', '#EA580C'], 'Exhibition': ['store', '#0891B2'], 'Other': ['calendar', '#64748B'] };
const evStyle = e => EV_STYLE[e?.type] || EV_STYLE.Other;
const INV_STYLE = { 'Tents & Shamiana': ['tent', '#2563EB'], 'Furniture': ['chair', '#7C3AED'], 'Lighting & Sound': ['bulb', '#F59E0B'], 'Power & DG': ['bolt', '#EA580C'], 'Catering Utensils': ['utensils', '#16A34A'], 'Decor & Flooring': ['sparkle', '#DB2777'], 'Other': ['box', '#64748B'] };
const EXP_STYLE = { 'Diesel / Fuel': ['fuel', '#EA580C'], 'Transport': ['truck', '#2563EB'], 'Extra Labour': ['users', '#0D9488'], 'Food & Grocery': ['cart', '#16A34A'], 'Venue / Rent': ['building', '#7C3AED'], 'Repair & Damage': ['wrench', '#E0344B'], 'Misc': ['dots', '#64748B'] };
const COLL_MODULE = { events: 'bookings', inventory: 'inventory', dishes: 'catering', mandi: 'catering', invoices: 'invoices', counters: 'invoices', payments: 'payments', vendors: 'vendors', pos: 'vendors', staff: 'staff', attendance: 'staff', advances: 'staff', payouts: 'staff', tasks: 'tasks', expenses: 'expenses', reviews: 'reviews', settings: 'settings', activity: 'team' };
const LEVELS = [[0, 'No access'], [1, 'View'], [2, 'Edit'], [3, 'Full']];
const allPerms = l => Object.fromEntries(MODULES.map(m => [m.key, l]));
const ROLE_DEFAULTS = {
  owner: { label: 'Owner', perms: allPerms(3), locked: true },
  manager: { label: 'Manager', perms: { dashboard: 1, bookings: 3, tasks: 3, inventory: 3, catering: 3, vendors: 2, staff: 2, tools: 2, invoices: 2, payments: 2, expenses: 2, reports: 1, reviews: 2, team: 1, settings: 1 } },
  accountant: { label: 'Accountant', perms: { dashboard: 1, bookings: 1, tasks: 0, inventory: 0, catering: 0, vendors: 2, staff: 1, tools: 0, invoices: 3, payments: 3, expenses: 3, reports: 1, reviews: 1, team: 0, settings: 1 } },
  supervisor: { label: 'Site Supervisor', perms: { dashboard: 1, bookings: 2, tasks: 3, inventory: 2, catering: 1, vendors: 1, staff: 2, tools: 2, invoices: 0, payments: 0, expenses: 2, reports: 0, reviews: 1, team: 0, settings: 0 } },
  staff: { label: 'Crew / Staff', perms: { dashboard: 1, bookings: 1, tasks: 2, inventory: 1, catering: 0, vendors: 0, staff: 0, tools: 0, invoices: 0, payments: 0, expenses: 0, reports: 0, reviews: 0, team: 0, settings: 0 } }
};
const STAGES = ['Enquiry', 'Quoted', 'Confirmed', 'Setup', 'Live', 'Completed', 'Closed', 'Cancelled'];
const RESERVING = ['Confirmed', 'Setup', 'Live'];
const STAGE_TONE = { Enquiry: '', Quoted: 'info', Confirmed: 'primary', Setup: 'accent', Live: 'accent', Completed: 'good', Closed: 'good', Cancelled: 'bad' };
const EVENT_TYPES = ['Wedding', 'Reception', 'Sangeet & Mehendi', 'Ring Ceremony', 'Corporate Event', 'Birthday / Anniversary', 'Religious / Jagran', 'Exhibition', 'Other'];
const INV_CATS = ['Tents & Shamiana', 'Furniture', 'Lighting & Sound', 'Power & DG', 'Catering Utensils', 'Decor & Flooring', 'Other'];
const EXP_CATS = ['Diesel / Fuel', 'Transport', 'Extra Labour', 'Food & Grocery', 'Venue / Rent', 'Repair & Damage', 'Misc'];
const VENDOR_CATS = ['Floral & Decor', 'DJ / Sound / Dhol', 'Grocery & Dairy', 'Crockery Partner', 'Generator / Diesel', 'Photo & Video', 'Transport', 'Other'];
const PAY_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const DISH_CATS = ['Welcome Drinks & Chaat', 'Starters & Live Counters', 'Main Course', 'Breads & Rice', 'Sweets'];
const DEFAULT_MANDI = { 'Fresh Paneer': 340, 'Pure Desi Ghee': 580, 'Milk (L)': 55, 'Basmati Rice': 95, 'Maida': 38, 'Wheat Atta': 36, 'Besan': 85, 'Sugar': 44, 'Urad Dal': 120, 'Moong Dal': 115, 'Cooking Oil': 150, 'Dahi': 70, 'Fresh Cream': 260, 'Tomato': 30, 'Onion': 30, 'Capsicum': 60, 'Dry Fruits': 900, 'Mawa': 360, 'Butter': 520, 'Spices & Masala': 400, 'Seasonal Veg': 40 };
const VEHICLES = [['Bolero Pickup', 1500], ['Tata 407', 4000], ['Eicher 14 ft', 6000], ['Heavy Truck (10 wheel)', 9000]];

function defaultSettings(o = {}) {
  return {
    id: 'main', bizName: o.bizName || '', owner: o.owner || '', phone: o.phone || '', email: o.email || '', gstin: '', pan: '',
    address: '', city: 'Jaipur', state: 'Rajasthan', stateCode: '08', bank: '', account: '', ifsc: '', upi: '',
    invPrefix: 'INV', qtPrefix: 'QT', gstRate: 18, sac: '998596', dueDays: 7,
    terms: '50% advance at booking, 40% at setup, balance on completion.\nDamaged or missing items are charged at replacement cost.',
    bizTypes: o.bizTypes && o.bizTypes.length ? o.bizTypes : ['tent', 'caterer', 'event'], modules: {}, saaya: [], markup: 30, overheadPerPlate: 60
  };
}

/* ================= Login IDs & platform ================= */
const MOBILE_DOMAIN = 'mobile.eventpro.app';
function loginId(v) { v = String(v || '').trim(); if (v.includes('@')) return v.toLowerCase(); const d = v.replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) + '@' + MOBILE_DOMAIN : v.toLowerCase(); }
function displayId(e) { e = String(e || ''); return e.endsWith('@' + MOBILE_DOMAIN) ? '+91 ' + e.split('@')[0] : e; }
const DEFAULT_PLATFORM = { appName: 'EventPro', supportName: 'EventPro Support', supportPhone: '', supportEmail: '', trialDays: 14, plans: [{ name: 'Basic', price: 499 }, { name: 'Pro', price: 999 }, { name: 'Enterprise', price: 2499 }] };
const superEmails = () => (CFG.superAdminEmails || []).map(loginId);
function orgState(o) { if (!o) return 'active'; if (o.status === 'suspended') return 'suspended'; if (o.expires && o.expires < todayLocal()) return 'expired'; return o.status || 'active'; }
const STATE_PILL = { trial: ['Trial', 'info'], active: ['Active', 'good'], expired: ['Expired', 'bad'], suspended: ['Suspended', 'bad'] };

/* ================= Data adapters ================= */
const LocalDB = (() => {
  const KEY = 'eventpro_v3_db'; let mem = null;
  const load = () => mem || (mem = LS.get(KEY, null) || { users: [], orgs: {}, members: [], roles: {}, records: {}, invites: [], guests: [], session: null });
  const persist = () => LS.set(KEY, mem);
  return {
    mode: 'local',
    async init() { load(); },
    async hash(p) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ep3:' + p)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 7; for (const c of 'ep3:' + p) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + h; } },
    async signUp({ email, password, name, phone }) {
      const db = load(); email = email.toLowerCase().trim();
      if (db.users.find(u => u.email === email)) throw new Error('This email or mobile already has an account. Log in instead.');
      const u = { id: uid('u_'), email, name, phone, pass: await this.hash(password), created: Date.now(), superAdmin: superEmails().includes(email) };
      db.users.push(u); db.session = { userId: u.id }; persist(); return { id: u.id, email, name };
    },
    async signIn(email, password) {
      const db = load(); const u = db.users.find(x => x.email === email.toLowerCase().trim());
      if (!u || u.pass !== await this.hash(password)) throw new Error('Login ID or password is wrong.');
      if (u.blocked) throw new Error('This login is blocked. Contact Super Admin.');
      db.session = { userId: u.id }; persist(); return { id: u.id, email: u.email, name: u.name };
    },
    async signOut() { load().session = null; persist(); },
    async current() { const db = load(); if (!db.session) return null; const u = db.users.find(x => x.id === db.session.userId); return u ? { id: u.id, email: u.email, name: u.name } : null; },
    async myOrgs(userId) { const db = load(); return db.members.filter(m => m.userId === userId).map(m => ({ orgId: m.orgId, name: db.orgs[m.orgId]?.name || 'Business', role: m.role, perms: m.perms, ...this.orgMeta(m.orgId) })); },
    orgMeta(id) { const o = load().orgs[id] || {}; return { status: o.status || 'active', plan: o.plan || 'Pro', expires: o.expires || '', notes: o.notes || '' }; },
    async mfaState() { return null; }, async mfaIsOn() { return false; },
    async mfaEnroll() { throw new Error('Authenticator works only in the live (cloud) app.'); },
    async resetUserMfa() { throw new Error('Authenticator works only in the live (cloud) app.'); },
    async isSuperAdmin(userId) { const u = load().users.find(x => x.id === userId); return !!(u && (u.superAdmin || superEmails().includes(u.email))); },
    async adminOverview() {
      const db = load();
      return Object.entries(db.orgs).map(([id, o]) => { const R = db.records[id] || {}; const st = R.settings?.main || {}; const own = db.members.find(m => m.orgId === id && m.role === 'owner');
        const upd = Math.max(o.created || 0, ...Object.values(R).flatMap(c => Object.values(c).map(r => r.updatedAt || 0)));
        return { orgId: id, name: o.name, created: o.created, ...this.orgMeta(id), ownerName: own?.name, ownerEmail: own?.email, ownerPhone: st.phone, city: st.city, logo: st.logo, members: db.members.filter(m => m.orgId === id).length, bookings: Object.keys(R.events || {}).length, invoices: Object.keys(R.invoices || {}).length, lastActivity: upd }; })
        .sort((a, b) => (b.created || 0) - (a.created || 0));
    },
    async adminUpdateOrg(id, patch) { const o = load().orgs[id]; if (!o) throw new Error('Business not found'); Object.assign(o, patch); persist(); },
    async adminUsers() { const db = load(); return db.users.map(u => ({ userId: u.id, email: u.email, name: u.name, created: u.created, blocked: !!u.blocked, super: !!(u.superAdmin || superEmails().includes(u.email)), orgs: db.members.filter(m => m.userId === u.id).map(m => ({ name: db.orgs[m.orgId]?.name, role: m.role })) })); },
    async adminSetSuper(email, on) { const db = load(); const u = db.users.find(x => x.email === loginId(email)); if (!u) throw new Error('No account with this email or mobile. Ask them to sign up first.'); if (!on && u.id === db.session?.userId) throw new Error('You cannot remove your own Super Admin access.'); u.superAdmin = !!on; persist(); },
    async getPlatform() { return { ...DEFAULT_PLATFORM, ...(load().platform || {}) }; },
    async savePlatform(p) { load().platform = p; persist(); },
    async createOrg(userId, name, displayName, roles, settings) {
      const db = load(); const id = uid('o_'); db.orgs[id] = { name, created: Date.now(), status: 'trial', plan: 'Trial', expires: addDays(todayLocal(), +(S.platform?.trialDays || DEFAULT_PLATFORM.trialDays)) };
      db.members.push({ orgId: id, userId, role: 'owner', name: displayName, email: db.users.find(u => u.id === userId)?.email });
      db.roles[id] = roles; db.records[id] = { settings: { main: settings } }; persist(); return id;
    },
    async loadOrg(orgId) {
      const db = load(); const recs = db.records[orgId] || {}; const data = {};
      for (const [c, m] of Object.entries(recs)) data[c] = Object.values(m);
      return { data, roles: JSON.parse(JSON.stringify(db.roles[orgId] || {})), members: db.members.filter(m => m.orgId === orgId).map(m => ({ ...m })) };
    },
    async put(orgId, coll, rec) { const db = load(); db.records[orgId] = db.records[orgId] || {}; (db.records[orgId][coll] = db.records[orgId][coll] || {})[rec.id] = JSON.parse(JSON.stringify(rec)); if (coll === 'settings' && rec.bizName) db.orgs[orgId].name = rec.bizName; persist(); },
    async del(orgId, coll, id) { const db = load(); if (db.records[orgId]?.[coll]) delete db.records[orgId][coll][id]; persist(); },
    async saveRoles(orgId, roles) { load().roles[orgId] = JSON.parse(JSON.stringify(roles)); persist(); },
    async createInvite(orgId, role, name) { const db = load(); const code = inviteCode(); db.invites.push({ code, orgId, role, name, created: Date.now(), expires: Date.now() + 7 * 864e5 }); persist(); return code; },
    async acceptInvite(userId, code, displayName) {
      const db = load(); code = String(code).toUpperCase().trim();
      const inv = db.invites.find(i => i.code === code && !i.usedBy && i.expires > Date.now());
      if (!inv) throw new Error('Invite code not found, expired or already used.');
      if (db.members.find(m => m.orgId === inv.orgId && m.userId === userId)) throw new Error('You are already part of this business.');
      const u = db.users.find(x => x.id === userId);
      db.members.push({ orgId: inv.orgId, userId, role: inv.role, name: displayName || inv.name || u?.name, email: u?.email }); inv.usedBy = userId; persist(); return inv.orgId;
    },
    async listInvites(orgId) { return load().invites.filter(i => i.orgId === orgId && !i.usedBy && i.expires > Date.now()); },
    async revokeInvite(code) { const db = load(); db.invites = db.invites.filter(i => i.code !== code); persist(); },
    async updateMember(orgId, userId, patch) { const db = load(); const m = db.members.find(x => x.orgId === orgId && x.userId === userId); if (m) Object.assign(m, patch); persist(); },
    async removeMember(orgId, userId) { const db = load(); db.members = db.members.filter(x => !(x.orgId === orgId && x.userId === userId)); persist(); },
    async signUpBusiness({ email, password, name, phone, bizName, roles, settings }) {
      if ((S.platform?.allowSignup) === false) throw new Error('New business sign-ups are closed. Please contact support.');
      const u = await this.signUp({ email, password, name, phone }); await this.createOrg(u.id, bizName, name, roles, settings); load().session = null; persist();
    },
    async createMember(orgId, { name, email, password, role, perms, staffId }) {
      const db = load(); email = loginId(email); if (!email.includes('@')) throw new Error('Enter an email or a 10-digit mobile number');
      if ((password || '').length < 6) throw new Error('Password must be at least 6 characters');
      if (db.users.find(u => u.email === email)) throw new Error('This login ID is already in use. Use another email or mobile number.');
      const u = { id: uid('u_'), email, name, phone: '', pass: await this.hash(password), created: Date.now() }; db.users.push(u);
      const m = { orgId, userId: u.id, role, name, email, perms: perms && Object.keys(perms).length ? perms : null, staffId: staffId || '' }; db.members.push(m); persist(); return { ...m };
    },
    async adminCreateBusiness({ email, password, name, phone, bizName, roles, settings, plan, status, expires }) {
      const db = load(); email = loginId(email); if (db.users.find(u => u.email === email)) throw new Error('This login ID is already in use.');
      const u = { id: uid('u_'), email, name, phone, pass: await this.hash(password), created: Date.now() }; db.users.push(u);
      const id = await this.createOrg(u.id, bizName, name, roles, settings); Object.assign(db.orgs[id], { plan, status, expires }); persist(); return id;
    },
    async adminBlockUser(userId, block) { const u = load().users.find(x => x.id === userId); if (!u) throw new Error('Login not found'); u.blocked = !!block; persist(); },
    userIdByEmail(email) { return load().users.find(u => u.email === email)?.id; },
    async createGuest(orgId, eventId, days, fixed) { const db = load(); const token = fixed || guestToken(); db.guests.push({ token, orgId, eventId, expires: Date.now() + days * 864e5 }); persist(); return token; },
    async guestView(token) {
      const db = load(); const g = db.guests.find(x => x.token === String(token).trim().toLowerCase());
      if (!g || g.expires < Date.now()) throw new Error('This guest code is invalid or has expired. Ask your event team for a fresh link.');
      const R = db.records[g.orgId] || {}; const ev = R.events?.[g.eventId]; if (!ev) throw new Error('Event not found.');
      const pick = c => Object.values(R[c] || {}).filter(x => x.eventId === g.eventId);
      return { settings: R.settings?.main || {}, event: ev, invoices: pick('invoices'), payments: pick('payments'), tasks: pick('tasks'), reviews: pick('reviews') };
    },
    async guestReview(token, review) {
      const db = load(); const g = db.guests.find(x => x.token === String(token).trim().toLowerCase()); if (!g) throw new Error('Invalid guest code');
      const R = db.records[g.orgId]; R.reviews = R.reviews || {};
      const rec = { ...review, id: uid('rv_'), eventId: g.eventId, source: 'guest', date: todayLocal() }; R.reviews[rec.id] = rec; persist();
    },

    async setPasswordFor(userId, password) { if ((password || '').length < 6) throw new Error('Password must be at least 6 characters'); const db = load(); const u = db.users.find(x => x.id === userId); if (!u) throw new Error('User not found'); u.pass = await this.hash(password); persist(); },
    async changeOwnPassword(password) { const db = load(); return this.setPasswordFor(db.session.userId, password); },
    hasUser(email) { return !!load().users.find(u => u.email === email); },
    purgeDemo() { const db = load(); const demoU = new Set(db.users.filter(u => u.email.endsWith('@demo.in')).map(u => u.id)); if (!demoU.size) return;
      const demoOrgs = new Set(db.members.filter(m => m.role === 'owner' && demoU.has(m.userId)).map(m => m.orgId));
      db.users = db.users.filter(u => !demoU.has(u.id)); db.members = db.members.filter(m => !demoU.has(m.userId) && !demoOrgs.has(m.orgId));
      demoOrgs.forEach(id => { delete db.orgs[id]; delete db.records[id]; delete db.roles[id]; }); db.invites = db.invites.filter(i => !demoOrgs.has(i.orgId)); db.guests = db.guests.filter(g => !demoOrgs.has(g.orgId)); if (db.session && demoU.has(db.session.userId)) db.session = null; persist(); },
    findOrgByName(name) { const db = load(); return Object.entries(db.orgs).find(([, o]) => o.name === name)?.[0]; }
  };
})();

const CloudDB = {
  mode: 'cloud', sb: null,
  async init() {
    if (this.sb) return;
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    this.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') setTimeout(() => A.newPasswordModal(), 300); });
  },
  err(e) { return new Error(e?.message || String(e)); },
  async signUp({ email, password, name, phone }) {
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { name, phone }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw this.err(error);
    if (!data.session) return { pendingConfirm: true };
    return { id: data.user.id, email, name };
  },
  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(/banned/i.test(error.message) ? 'This login is blocked. Contact Super Admin.' : /invalid/i.test(error.message) ? 'Login ID or password is wrong.' : error.message);
    return { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || email };
  },
  async signOut() { await this.sb.auth.signOut(); },
  async current() { const { data } = await this.sb.auth.getSession(); const u = data.session?.user; return u ? { id: u.id, email: u.email, name: u.user_metadata?.name || u.email } : null; },
  async myOrgs(userId) {
    const { data, error } = await this.sb.from('org_members').select('org_id, role, perms, orgs(name,status,plan,expires_at)').eq('user_id', userId);
    if (error) throw this.err(error); return data.map(r => ({ orgId: r.org_id, name: r.orgs?.name || 'Business', role: r.role, perms: r.perms || null, status: r.orgs?.status, plan: r.orgs?.plan, expires: (r.orgs?.expires_at || '').slice(0, 10) }));
  },
  async isSuperAdmin() { const { data, error } = await this.sb.rpc('is_super_admin'); return !error && !!data; },
  async adminOverview() { const { data, error } = await this.sb.rpc('admin_overview'); if (error) throw this.err(error); return (data || []).map(o => ({ ...o, created: Date.parse(o.created), lastActivity: Date.parse(o.lastActivity || o.created) })); },
  async adminUpdateOrg(id, p) { const row = {}; if (p.status) row.status = p.status; if (p.plan) row.plan = p.plan; if ('expires' in p) row.expires_at = p.expires ? p.expires + 'T23:59:59+05:30' : null; if ('notes' in p) row.notes = p.notes; const { error } = await this.sb.from('orgs').update(row).eq('id', id); if (error) throw this.err(error); },
  async adminUsers() { const { data, error } = await this.sb.rpc('admin_users'); if (error) throw this.err(error); return (data || []).map(u => ({ ...u, created: Date.parse(u.created) })); },
  async adminSetSuper(email, on) { const { error } = await this.sb.rpc('admin_set_super', { p_email: loginId(email), p_on: !!on }); if (error) throw this.err(error); },
  async getPlatform() { const { data } = await this.sb.from('platform_settings').select('data').eq('id', 1).maybeSingle(); return { ...DEFAULT_PLATFORM, ...(data?.data || {}) }; },
  async savePlatform(p) { const { error } = await this.sb.from('platform_settings').update({ data: p }).eq('id', 1); if (error) throw this.err(error); },
  async createOrg(userId, name, displayName, roles, settings) {
    const { data, error } = await this.sb.rpc('create_org', { p_name: name, p_display_name: displayName, p_roles: roles, p_settings: settings });
    if (error) throw this.err(error); return data;
  },
  async loadOrg(orgId) {
    const [r1, r2, r3] = await Promise.all([
      this.sb.from('records').select('collection,id,data').eq('org_id', orgId).limit(20000),
      this.sb.from('org_roles').select('role,label,perms').eq('org_id', orgId),
      this.sb.from('org_members').select('user_id,role,display_name,email,staff_id,perms').eq('org_id', orgId)]);
    for (const r of [r1, r2, r3]) if (r.error) throw this.err(r.error);
    const data = {}; r1.data.forEach(x => (data[x.collection] = data[x.collection] || []).push(x.data));
    const roles = {}; r2.data.forEach(x => roles[x.role] = { label: x.label, perms: x.perms, locked: x.role === 'owner' });
    return { data, roles, members: r3.data.map(m => ({ orgId, userId: m.user_id, role: m.role, name: m.display_name, email: m.email, staffId: m.staff_id, perms: m.perms || null })) };
  },
  async put(orgId, coll, rec) { const { error } = await this.sb.from('records').upsert({ org_id: orgId, collection: coll, id: rec.id, data: rec, updated_at: new Date().toISOString() }); if (error) throw this.err(error); if (coll === 'settings' && rec.bizName) this.sb.from('orgs').update({ name: rec.bizName }).eq('id', orgId).then(() => { }); },
  async del(orgId, coll, id) { const { error } = await this.sb.from('records').delete().match({ org_id: orgId, collection: coll, id }); if (error) throw this.err(error); },
  async saveRoles(orgId, roles) { const rows = Object.entries(roles).filter(([k]) => k !== 'owner').map(([role, r]) => ({ org_id: orgId, role, label: r.label, perms: r.perms })); const { error } = await this.sb.from('org_roles').upsert(rows); if (error) throw this.err(error); },
  async createInvite(orgId, role, name) { const code = inviteCode(); const { error } = await this.sb.from('invites').insert({ code, org_id: orgId, role, display_name: name, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }); if (error) throw this.err(error); return code; },
  async acceptInvite(userId, code, displayName) { const { data, error } = await this.sb.rpc('accept_invite', { p_code: String(code).toUpperCase().trim(), p_display_name: displayName || null }); if (error) throw this.err(error); return data; },
  async listInvites(orgId) { const { data, error } = await this.sb.from('invites').select('*').eq('org_id', orgId).is('used_by', null).gt('expires_at', new Date().toISOString()); if (error) return []; return data.map(i => ({ code: i.code, role: i.role, name: i.display_name })); },
  async revokeInvite(code) { await this.sb.from('invites').delete().eq('code', code); },
  async updateMember(orgId, userId, patch) { const p = {}; if (patch.role) p.role = patch.role; if ('staffId' in patch) p.staff_id = patch.staffId || null; if ('perms' in patch) p.perms = patch.perms && Object.keys(patch.perms).length ? patch.perms : null; const { error } = await this.sb.from('org_members').update(p).match({ org_id: orgId, user_id: userId }); if (error) throw this.err(error); },
  async removeMember(orgId, userId) { const { error } = await this.sb.from('org_members').delete().match({ org_id: orgId, user_id: userId }); if (error) throw this.err(error); },
  async createGuest(orgId, eventId, days) { const token = guestToken(); const { error } = await this.sb.from('guest_links').insert({ token, org_id: orgId, event_id: eventId, expires_at: new Date(Date.now() + days * 864e5).toISOString() }); if (error) throw this.err(error); return token; },
  async guestView(token) { const { data, error } = await this.sb.rpc('guest_view', { p_token: String(token).trim().toLowerCase() }); if (error) throw this.err(error); if (!data) throw new Error('This guest code is invalid or has expired.'); return data; },
  async guestReview(token, review) { const { error } = await this.sb.rpc('guest_review', { p_token: String(token).trim().toLowerCase(), p_review: review }); if (error) throw this.err(error); },
  async mfaState() { try { const { data, error } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel(); return error ? null : data; } catch (e) { return null; } },
  async mfaFactors() { const { data, error } = await this.sb.auth.mfa.listFactors(); if (error) throw this.err(error); return data; },
  async mfaIsOn() { const f = await this.mfaFactors(); return (f.totp || []).length > 0; },
  async mfaEnroll() {
    const f = await this.mfaFactors();
    for (const x of (f.all || []).filter(x => x.factor_type === 'totp' && x.status !== 'verified')) await this.sb.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await this.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'EventPro ' + new Date().toISOString().slice(0, 16), issuer: S.platform?.appName || 'EventPro' });
    if (error) throw this.err(error); return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  },
  async mfaVerify(factorId, code) { const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code: String(code).replace(/\D/g, '') }); if (error) throw new Error(/invalid|expired|code/i.test(error.message) ? 'Wrong or expired code. Type the latest 6-digit code from your app.' : error.message); },
  async mfaLoginVerify(code) { const f = await this.mfaFactors(); const t = (f.totp || [])[0]; if (!t) throw new Error('No authenticator found for this login.'); return this.mfaVerify(t.id, code); },
  async mfaDisable() { const f = await this.mfaFactors(); for (const x of f.totp || []) { const { error } = await this.sb.auth.mfa.unenroll({ factorId: x.id }); if (error) throw this.err(error); } await this.sb.auth.refreshSession(); },
  async resetUserMfa(userId, orgId) { return this.rpc('reset_user_mfa', { p_user: userId, p_org: orgId || null }); },
  async rpc(fn, args) { const { data, error } = await this.sb.rpc(fn, args); if (error) throw this.err(error); return data; },
  async signUpBusiness({ email, password, name, phone, bizName, roles, settings }) { return this.rpc('public_signup', { p_email: email, p_password: password, p_name: name, p_phone: phone || '', p_biz: bizName, p_roles: roles, p_settings: settings }); },
  async createMember(orgId, { name, email, password, role, perms, staffId }) {
    const id = await this.rpc('create_member', { p_org: orgId, p_name: name, p_email: loginId(email), p_password: password, p_role: role, p_perms: perms && Object.keys(perms).length ? perms : null, p_staff: staffId || null });
    return { orgId, userId: id, role, name, email: loginId(email), perms: perms || null, staffId: staffId || '' };
  },
  async setPasswordFor(userId, password, orgId) { return this.rpc('set_user_password', { p_user: userId, p_password: password, p_org: orgId || null }); },
  async adminCreateBusiness({ email, password, name, phone, bizName, roles, settings, plan, status, expires }) { return this.rpc('admin_create_business', { p_email: loginId(email), p_password: password, p_name: name, p_phone: phone || '', p_biz: bizName, p_roles: roles, p_settings: settings, p_plan: plan, p_status: status, p_expires: expires ? expires + 'T23:59:59+05:30' : null }); },
  async adminBlockUser(userId, block) { return this.rpc('admin_block_user', { p_user: userId, p_block: !!block }); },
  async changeOwnPassword(password) { const { error } = await this.sb.auth.updateUser({ password }); if (error) throw this.err(error); }
};

/* ================= App state ================= */
const S = { adapter: null, user: null, orgs: [], org: null, me: null, role: null, perms: {}, roles: {}, members: [], data: {}, view: 'dashboard', params: {}, filters: {}, guest: null, authTab: 'login' };
const A = {}; window.A = A;
let FORM_CB = null;
const col = c => S.data[c] || (S.data[c] = []);
const getById = (c, id) => col(c).find(x => x.id === id);
const settings = () => getById('settings', 'main') || defaultSettings();
const mandi = () => getById('mandi', 'rates')?.rates || settings().mandi || DEFAULT_MANDI;
const cloudReady = () => !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

function moduleOn(key) {
  const m = MOD[key]; const st = settings();
  if (st.modules && st.modules[key] === false) return false;
  if (st.modules && st.modules[key] === true) return true;
  if (!m?.biz) return true;
  return m.biz.some(b => (st.bizTypes || []).includes(b));
}
function lvl(mod) { if (S.super) return 3; let v = S.role === 'owner' ? 3 : Number(S.perms?.[mod] || 0); if (S.org && orgState(S.org) === 'expired') v = Math.min(v, 1); return v; }
function can(mod, l = 1) { return !!S.org && moduleOn(mod) && lvl(mod) >= l; }
function need(mod, l = 2) { if (lvl(mod) < l) throw new Error(S.org && orgState(S.org) === 'expired' ? 'Your plan has expired, so the app is read-only. Renew to make changes.' : 'Your role does not have permission for this. Ask the owner to update access.'); }

async function save(coll, rec, msg) {
  need(COLL_MODULE[coll] || 'settings', 2);
  rec.updatedAt = Date.now(); rec.updatedBy = S.me?.name || S.user?.name;
  const arr = col(coll); const i = arr.findIndex(x => x.id === rec.id);
  if (i >= 0) arr[i] = rec; else arr.unshift(rec);
  await S.adapter.put(S.org.orgId, coll, rec);
  if (msg) logAct(msg);
  return rec;
}
async function removeRec(coll, id, msg) {
  need(COLL_MODULE[coll] || 'settings', 3);
  S.data[coll] = col(coll).filter(x => x.id !== id);
  await S.adapter.del(S.org.orgId, coll, id);
  if (msg) logAct(msg);
}
function logAct(msg) {
  const rec = { id: uid('a_'), ts: Date.now(), who: S.me?.name || S.user?.name || 'Someone', role: S.role, msg };
  col('activity').unshift(rec); S.data.activity = col('activity').slice(0, 400);
  S.adapter.put(S.org.orgId, 'activity', rec).catch(() => { });
}

/* ================= UI primitives ================= */
let toastTimer;
function toast(msg, tone = '') {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.className = 'toast fade ' + tone; t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}
const pill = (t, tone = '') => `<span class="pill ${tone}">${esc(t)}</span>`;
const stagePill = s => pill(s, STAGE_TONE[s] || '');
const prog = p => `<div class="prog" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
const ibox = (icon, c, size = '') => `<span class="ibox ${size}" style="--c:${c || '#1F5EFF'}">${ic(icon)}</span>`;
const datebox = (d, c) => `<span class="datebox" style="--c:${c || '#1F5EFF'}"><b>${d ? +d.slice(8) : '–'}</b><span>${d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { month: 'short' }) : ''}</span></span>`;
const empty = (title, text, action = '', icon = 'sparkle', c = '#94A3B8') => `<div class="empty">${ibox(icon, c, 'lg')}<b>${esc(title)}</b><span>${esc(text)}</span>${action}</div>`;
function pageHead(title, sub, actions = '', back = '', icon) {
  const m = MOD[currentModule()]; const [i, c] = icon || (m ? [m.icon, m.c] : ['grid', '#1F5EFF']);
  return `${back ? `<button class="back" onclick="${back}">${ic('back')} Back</button>` : ''}<div class="phead"><div class="t">${ibox(i, c, 'lg')}<div style="min-width:0"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div><div class="row-flex">${actions}</div></div>`;
}
function kpi(label, value, sub = '', tone = '', icon = '', c = '') { return `<div class="kpi ${tone}"><div class="kt">${icon ? ibox(icon, c, 'sm') : ''}<div class="eyebrow">${esc(label)}</div></div><div class="v">${value}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; }
const waBtn = (text, phone, label = 'WhatsApp', cls = 'btn wa sm') => `<a class="${cls}" href="${esc(waLink(text, phone))}" target="_blank" rel="noopener">${ic('wa')} ${esc(label)}</a>`;
function seg(key, opts, cur, fn) { return `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" class="${v === cur ? 'on' : ''}" onclick="${fn}('${key}','${v}')">${esc(l)}</button>`).join('')}</div>`; }

function modal(html, { wide = false } = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="scrim" onclick="if(event.target===this)A.closeModal()"><div class="sheet fade ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root.hidden = false;
  setTimeout(() => { const f = root.querySelector('[autofocus]') || root.querySelector('input:not([type=checkbox]),select,textarea'); if (f && window.innerWidth > 700) f.focus(); }, 60);
}
A.closeModal = () => { const r = $('#modalRoot'); r.hidden = true; r.innerHTML = ''; FORM_CB = null; };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modalRoot').hidden) A.closeModal(); });
const sheetHead = (title, sub = '') => `<header class="sheet-h"><div><h3>${esc(title)}</h3>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}</div><button type="button" class="icon-btn" onclick="A.closeModal()" aria-label="Close">${ic('x')}</button></header>`;

function fieldHTML(f) {
  const id = 'f_' + f.name; const v = f.value ?? ''; const req = f.required ? 'required' : '';
  if (f.type === 'checkbox') return `<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> <span>${esc(f.label)}</span></label>`;
  if (f.type === 'html') return `<div class="${f.full ? 'full' : ''}">${f.html}</div>`;
  let input;
  if (f.type === 'select') input = `<select id="${id}" name="${f.name}" ${req}>${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" ${req} placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
  else input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || (f.type === 'number' ? 'any' : '')}" placeholder="${esc(f.placeholder || '')}" ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''} ${f.autofocus ? 'autofocus' : ''} ${f.minlength ? `minlength="${f.minlength}"` : ''}>`;
  return `<label class="field ${f.full ? 'full' : ''}"><span>${esc(f.label)}${f.required ? ' *' : ''}</span>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}
function readForm(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') { if (el.dataset.multi) { (v[el.name] = v[el.name] || []); if (el.checked) v[el.name].push(el.value); } else v[el.name] = el.checked; }
    else if (el.type === 'number') v[el.name] = el.value === '' ? '' : Number(el.value);
    else if (el.type === 'password') v[el.name] = el.value;
    else v[el.name] = (el.value || '').trim();
  }
  return v;
}
function formModal({ title, sub, fields, submit = 'Save', onSubmit, extra = '', left = '', wide = false }) {
  FORM_CB = onSubmit;
  modal(`<form class="form" onsubmit="A.submitForm(event)" novalidate>${sheetHead(title, sub)}<div class="grid2">${fields.map(fieldHTML).join('')}</div>${extra}<footer class="sheet-f">${left}<span class="grow"></span><button type="button" class="btn ghost" onclick="A.closeModal()">Cancel</button><button class="btn primary" type="submit">${esc(submit)}</button></footer></form>`, { wide });
}
A.submitForm = async e => {
  e.preventDefault(); const form = e.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const cb = FORM_CB; const btn = form.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
  try { const r = await cb(readForm(form), form); if (r !== false) { A.closeModal(); } }
  catch (err) { toast(err.message || String(err), 'bad'); }
  finally { if (btn) btn.disabled = false; }
};
function confirmBox(title, text, yesLabel, onYes, tone = 'danger') {
  FORM_CB = async () => { await onYes(); };
  modal(`<form onsubmit="A.submitForm(event)">${sheetHead(title)}<div class="sheet-b"><p class="muted">${esc(text)}</p></div><footer class="sheet-f"><span class="grow"></span><button type="button" class="btn ghost" onclick="A.closeModal()">Cancel</button><button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" type="submit">${esc(yesLabel)}</button></footer></form>`);
}
A.copy = (text, btn) => {
  const done = () => toast('Copied');
  try { navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text)); } catch (e) { fallbackCopy(text); }
};
function fallbackCopy(text) { modal(`${sheetHead('Copy this text')}<div class="sheet-b"><textarea id="copyBox" rows="5" readonly>${esc(text)}</textarea><p class="muted small" style="margin-top:6px">Long-press or select all, then copy.</p></div>`); setTimeout(() => { const t = $('#copyBox'); if (t) { t.focus(); t.select(); } }, 80); }

/* Theme */
function applyTheme() { document.documentElement.setAttribute('data-theme', 'light'); }
A.setTheme = t => { LS.set('ep3_theme', t); applyTheme(); render(); };

/* ================= Boot & session ================= */
async function boot() {
  applyTheme();
  const forceLocal = LS.get('ep3_mode', 'auto') === 'local';
  S.adapter = cloudReady() && !forceLocal ? CloudDB : LocalDB;
  try { await S.adapter.init(); }
  catch (e) { if (S.adapter === CloudDB) { $('#app').innerHTML = `<div class="auth"><section class="auth-side"><div class="auth-card"><div class="card pad stack">${ibox('alert', '#E0344B', 'lg')}<h2>Cannot connect</h2><p class="muted">Check your internet connection and try again.</p><button class="btn primary" onclick="location.reload()">Try again</button></div></div></section></div>`; return; } }
  try { S.platform = await S.adapter.getPlatform(); } catch (e) { S.platform = { ...DEFAULT_PLATFORM }; }
  const h = location.hash.replace('#', '');
  if (h.startsWith('guest-')) { await A.openGuest(h.slice(6)); return; }
  try { const u = await S.adapter.current(); if (u) { if (await needsMfa()) { S.mfaPending = u; render(); return; } S.user = u; await afterLogin(); return; } } catch (e) { }
  render();
}
async function needsMfa() { const a = await S.adapter.mfaState?.(); return !!(a && a.nextLevel === 'aal2' && a.currentLevel !== 'aal2'); }
async function afterLogin() {
  S.super = await S.adapter.isSuperAdmin(S.user.id).catch(() => false);
  S.mfaOn = await S.adapter.mfaIsOn().catch(() => false);
  S.orgs = await S.adapter.myOrgs(S.user.id);
  const pend = LS.get('ep3_pending', null);
  if (pend && pend.email === S.user.email) {
    LS.del('ep3_pending');
    try {
      if (pend.kind === 'create') { const id = await S.adapter.createOrg(S.user.id, pend.bizName, pend.name, ROLE_DEFAULTS, defaultSettings(pend)); LS.set('ep3_lastOrg', id); }
      if (pend.kind === 'join') { const id = await S.adapter.acceptInvite(S.user.id, pend.code, pend.name); LS.set('ep3_lastOrg', id); }
      S.orgs = await S.adapter.myOrgs(S.user.id);
    } catch (e) { toast(e.message, 'bad'); }
  }
  if (!S.orgs.length) { S.org = null; if (S.super) { S.view = 'admin'; S.params = {}; } render(); return; }
  const last = LS.get('ep3_lastOrg', null);
  await openOrg((S.orgs.find(o => o.orgId === last) || S.orgs[0]).orgId);
}
async function openOrg(orgId, override) {
  const o = override || S.orgs.find(x => x.orgId === orgId); if (!o) return;
  const { data, roles, members } = await S.adapter.loadOrg(orgId);
  S.org = o; S.data = data; S.roles = Object.keys(roles).length ? roles : JSON.parse(JSON.stringify(ROLE_DEFAULTS)); S.members = members;
  const meM = members.find(m => m.userId === S.user.id);
  S.me = meM || { name: S.user.name + (S.super ? ' (Super Admin)' : ''), role: 'owner' };
  S.role = meM ? meM.role : (S.super ? 'owner' : o.role);
  S.perms = S.role === 'owner' ? allPerms(3) : { ...(S.roles[S.role]?.perms || {}), ...(S.me.perms || {}) };
  S.invites = []; S.invitesLoaded = false; S.draft = null; S.dirty = false;
  if (!o.viewAs) LS.set('ep3_lastOrg', orgId);
  S.view = MODULES.find(m => can(m.key))?.key || 'dashboard'; S.params = {};
  initCatering();
  render();
}
A.switchOrg = async id => { A.closeModal(); await openOrg(id); };
A.logout = async () => {
  A.closeModal(); await S.adapter.signOut();
  Object.assign(S, { user: null, org: null, me: null, role: null, data: {}, orgs: [], view: 'dashboard', params: {}, super: false, admin: null, authTab: 'login', mfaPending: null, mfaOn: false });
  if (LS.get('ep3_mode', 'auto') === 'local' && cloudReady()) { LS.set('ep3_mode', 'auto'); S.adapter = CloudDB; try { await CloudDB.init(); } catch (e) { S.adapter = LocalDB; } }
  render();
};

/* ================= Router & shell ================= */
A.go = (view, params = {}) => {
  if (view === 'admin' && !S.super) { toast('Super Admin access only', 'bad'); return; }
  if (MOD[view] && !can(view)) { toast('You do not have access to ' + MOD[view].label, 'bad'); return; }
  S.view = view; S.params = params; A.closeModal(); render(); window.scrollTo({ top: 0 });
};
A.setP = (k, v) => { S.params[k] = v; render(); };
A.setF = (k, v) => { S.filters[k] = v; render(); };

function render() {
  const root = $('#app');
  if (S.guest) { root.innerHTML = V.guest(); return; }
  if (S.mfaPending) { root.innerHTML = V.mfa(); return; }
  if (!S.user) { root.innerHTML = V.auth(); return; }
  if (!S.org) { if (S.super) { S.view = 'admin'; } else { root.innerHTML = V.noOrg(); return; } }
  else if (orgState(S.org) === 'suspended' && !S.super) { root.innerHTML = V.blocked(); return; }
  const view = V[S.view] ? S.view : 'dashboard';
  let body;
  try { body = V[view](); } catch (e) { console.error(e); body = `<div class="banner bad">${ic('alert')} Something went wrong on this screen: ${esc(e.message)}</div>`; }
  root.innerHTML = shell(body);
}
function navItems() { return MODULES.filter(m => can(m.key)); }
function currentModule() { const map = { event: 'bookings', invoice: 'invoices' }; return map[S.view] || S.view; }
function bizLogo(st, cls = 'logo') { return st.logo ? `<div class="${cls} has-img"><img src="${esc(st.logo)}" alt=""></div>` : `<div class="${cls}">${ic('tent')}</div>`; }
function planBanner() {
  if (!S.org) return '';
  const P = S.platform || DEFAULT_PLATFORM; const st = orgState(S.org);
  const sup = P.supportPhone ? waBtn(`Namaste, I want to renew ${P.appName} for ${settings().bizName || S.org.name}.`, P.supportPhone, 'Contact support') : '';
  if (S.org.viewAs) return `<div class="banner" style="margin-bottom:16px;align-items:center">${ic('shield')}<span class="grow">Super Admin view of <b>${esc(S.org.name)}</b>. Anything you change is saved to this business.</span><button class="btn sm" onclick="A.exitOrg()">Back to console</button></div>`;
  if (st === 'expired') return `<div class="banner bad" style="margin-bottom:16px;align-items:center">${ic('alert')}<span class="grow"><b>Your plan expired on ${fmtDate(S.org.expires)}.</b> You can see all your data, but adding or changing anything is locked until you renew.</span>${sup}</div>`;
  if (S.org.expires) { const d = daysBetween(todayLocal(), S.org.expires); if (d <= 5) return `<div class="banner warn" style="margin-bottom:16px;align-items:center">${ic('clock')}<span class="grow"><b>${S.org.plan === 'Trial' ? 'Free trial' : 'Your ' + esc(S.org.plan) + ' plan'} ends ${d === 0 ? 'today' : `in ${d} day${d > 1 ? 's' : ''}`}</b> (${fmtDate(S.org.expires)}). Renew to keep adding bookings and bills.</span>${sup}</div>`; }
  return '';
}
function shell(body) {
  const st = settings(); const items = navItems(); const cur = currentModule();
  const groups = [...new Set(items.map(m => m.group))];
  const alerts = computeAlerts();
  const pri = ['dashboard', 'bookings', 'tasks', 'invoices', 'inventory', 'catering', 'payments'].filter(k => can(k));
  const left = pri.slice(0, 2), right = pri.slice(2, 3);
  const roleLabel = S.org ? (S.roles[S.role]?.label || S.role) : '';
  const name = S.me?.name || S.user.name; const first = (name || '').split(' ')[0];
  const bizName = S.org ? (st.bizName || S.org.name) : 'Super Admin';
  const adminBtn = S.super ? `<div class="nav-group">Platform</div><button style="--c:#0F172A" class="${S.view === 'admin' ? 'on' : ''}" onclick="A.go('admin')">${ibox('shield', '#0F172A', 'sm')}Super Admin</button>` : '';
  const creates = createActions();
  const navBtn = k => `<button class="${cur === k ? 'on' : ''}" onclick="A.go('${k}')">${ic(MOD[k].icon)}<span>${esc(MOD[k].short || MOD[k].label.split(' ')[0])}</span></button>`;
  const isHome = S.view === 'dashboard';
  return `<div class="app">
  <aside class="side">
    <div class="brand">${S.org ? bizLogo(st) : `<div class="logo" style="background:#0F172A">${ic('shield')}</div>`}<div style="min-width:0"><b title="${esc(bizName)}">${esc(bizName)}</b><span>${S.org ? 'on ' + esc(S.platform?.appName || 'EventPro') : esc(S.platform?.appName || 'EventPro') + ' platform'}</span></div></div>
    <nav class="nav" aria-label="Main">${adminBtn}${groups.map(g => `<div class="nav-group">${g}</div>` + items.filter(m => m.group === g).map(m => `<button style="--c:${m.c}" class="${cur === m.key ? 'on' : ''}" onclick="A.go('${m.key}')">${ibox(m.icon, m.c, 'sm')}${esc(m.label)}</button>`).join('')).join('')}</nav>
    <div class="side-foot"><div class="avatar">${esc(initials(name))}</div><div style="min-width:0;flex:1"><b style="display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b><span class="tiny muted">${esc(roleLabel)}</span></div><button class="icon-btn" title="Account" onclick="A.accountMenu()">${ic('gear')}</button></div>
  </aside>
  <div class="main">
    <header class="topbar">
      <button class="avatar mobile-only" style="border:0;cursor:pointer" onclick="A.accountMenu()" aria-label="Account">${esc(initials(name))}</button>
      <div class="org grow">${isHome ? `<b class="mobile-only">Namaste, ${esc(first)}</b><b class="desk-only">${esc(bizName)}</b>` : `<b>${esc(bizName)}</b>`}<span class="tiny muted sub1">${isHome ? `<span class="mob-inline">${esc(bizName)} · </span>` : ''}${S.org ? esc(roleLabel || '') : 'All businesses'}${S.super ? ' · Super Admin' : ''}${S.adapter.mode === 'local' ? ' · Offline' : ' · Synced'}</span></div>
      ${creates.length ? `<button class="btn primary sm desk-only" onclick="A.createSheet()">${ic('plus')} Create</button>` : ''}
      <button class="icon-btn" aria-label="Alerts" onclick="A.alertsSheet()">${ic('bell')}${alerts.length ? `<span class="dot">${alerts.length}</span>` : ''}</button>
    </header>
    <main class="content fade">${planBanner()}${body}</main>
  </div>
  <nav class="bnav" aria-label="Quick">${left.map(navBtn).join('')}
    ${creates.length ? `<div class="fabwrap"><button class="fab" onclick="A.createSheet()" aria-label="Create new">${ic('plus')}</button><span>Create</span></div>` : ''}
    ${right.map(navBtn).join('')}<button onclick="A.moreSheet()" class="${[...left, ...right].includes(cur) ? '' : 'on'}">${ic('grid')}<span>More</span></button></nav>
</div>`;
}
function createActions() {
  if (!S.org) return [];
  return [
    can('bookings', 2) && ['New booking', 'calendar', MOD.bookings.c, 'A.eventForm()'],
    can('invoices', 2) && ['Quotation / bill', 'receipt', MOD.invoices.c, 'A.newInvoice()'],
    can('payments', 2) && ['Payment received', 'rupee', MOD.payments.c, 'A.paymentForm()'],
    can('expenses', 2) && ['Expense', 'wallet', MOD.expenses.c, 'A.expenseForm()'],
    can('tasks', 2) && ['Setup task', 'pulse', MOD.tasks.c, 'A.taskForm()'],
    can('inventory', 2) && ['Godown item', 'box', MOD.inventory.c, 'A.itemForm()'],
    can('vendors', 2) && ['Vendor PO', 'handshake', MOD.vendors.c, 'A.poForm()'],
    can('staff', 2) && ['Attendance', 'users', MOD.staff.c, `A.go('staff',{tab:'attendance'})`],
    lvl('team') >= 2 && ['Add employee', 'users', MOD.team.c, 'A.memberForm()']
  ].filter(Boolean);
}
const tileBtn = ([label, icon, c, fn]) => `<button class="tile" onclick="A.closeModal();setTimeout(()=>{${fn}},30)">${ibox(icon, c)}<span>${esc(label)}</span></button>`;
A.createSheet = () => modal(`${sheetHead('Create new', 'What do you want to add?')}<div class="sheet-b"><div class="tiles">${createActions().map(tileBtn).join('')}</div></div>`);
A.moreSheet = () => {
  const items = navItems(); const groups = [...new Set(items.map(m => m.group))];
  modal(`${sheetHead('All services')}<div class="sheet-b stack">${S.super ? `<div><div class="eyebrow" style="margin-bottom:10px">Platform</div><div class="tiles"><button class="tile" onclick="A.go('admin')">${ibox('shield', '#0F172A')}<span>Super Admin</span></button>${S.org ? '' : ''}</div></div>` : ''}${groups.map(g => `<div><div class="eyebrow" style="margin-bottom:10px">${g}</div><div class="tiles">${items.filter(m => m.group === g).map(m => `<button class="tile" onclick="A.go('${m.key}')">${ibox(m.icon, m.c)}<span>${esc(m.label)}</span></button>`).join('')}</div></div>`).join('')}</div>`);
};
A.accountMenu = () => {
  const name = S.me?.name || S.user.name;
  modal(`${sheetHead('Account')}<div class="sheet-b stack">
    <div class="row-flex" style="flex-wrap:nowrap"><div class="avatar" style="width:52px;height:52px;font-size:18px">${esc(initials(name))}</div><div style="min-width:0"><b style="font:700 18px var(--f-display);display:block">${esc(name)}</b><span class="small muted">${esc(displayId(S.user.email))}${S.org ? ' · ' + esc(S.roles[S.role]?.label || S.role) : ''}${S.super ? ' · Super Admin' : ''}</span></div></div>
    ${S.orgs.length > 1 ? `<div class="stack-sm"><div class="eyebrow">Switch business</div>${S.orgs.map(o => `<button class="btn ${o.orgId === S.org.orgId ? 'soft' : ''}" style="justify-content:space-between" onclick="A.switchOrg('${o.orgId}')"><span>${esc(o.name)}</span><span class="tiny">${esc(o.role)}</span></button>`).join('')}</div>` : ''}
    <div class="tiles">
      ${S.super ? `<button class="tile" onclick="A.go('admin')">${ibox('shield', '#0F172A')}<span>Super Admin</span></button>` : ''}
      ${S.super || S.platform?.allowSignup !== false ? `<button class="tile" onclick="A.newOrgModal()">${ibox('store', '#1F5EFF')}<span>New business</span></button>` : ''}
      <button class="tile" onclick="A.newPasswordModal()">${ibox('key', '#0D9488')}<span>Change password</span></button>
      ${S.adapter.mode === 'cloud' ? `<button class="tile" onclick="A.mfaSheet()">${ibox('shield', S.mfaOn ? '#0B9B68' : '#E0344B')}<span>Authenticator ${S.mfaOn ? 'on' : 'off'}</span></button>` : ''}
      ${can('settings') ? `<button class="tile" onclick="A.go('settings')">${ibox('gear', '#64748B')}<span>Settings</span></button>` : ''}
    </div>
    <button class="btn danger block" onclick="A.logout()">${ic('logout')} Log out</button>
    <p class="tiny muted" style="text-align:center">EventPro OS v${APP_VERSION} · ${S.adapter.mode === 'local' ? 'Offline mode: data is saved on this device only.' : 'Cloud sync is on.'}</p></div>`);
};
const ALERT_STYLE = { Overdue: ['rupee', '#E0344B'], Shortage: ['box', '#E0344B'], Confirm: ['calendar', '#D97706'], Dispatch: ['truck', '#1F5EFF'], Return: ['truck', '#D97706'] };
function alertCard(a) { const [i, c] = ALERT_STYLE[a.tag] || ['alert', '#E0344B']; return `<div class="alert" style="--c:${c}" onclick="${a.go}">${ibox(i, c, 'sm')}<div class="grow" style="min-width:0"><b>${esc(a.title)}</b><div class="sub">${esc(a.sub || '')}</div></div>${ic('chev', 'go')}</div>`; }
A.alertsSheet = () => {
  const al = computeAlerts();
  modal(`${sheetHead('Alerts & reminders', al.length ? al.length + ' things need attention' : 'All clear')}<div class="sheet-b stack-sm">${al.length ? al.map(alertCard).join('') : empty('Nothing pending', 'Overdue payments, stock shortages and dispatches will show here.', '', 'check', '#0B9B68')}</div>`);
};

/* ================= Business logic ================= */
function evById(id) { return getById('events', id); }
function eventEnd(e) { return e.endDate && e.endDate >= e.date ? e.endDate : e.date; }
function reservedOn(invId, date, exceptEv) {
  return sum(col('events').filter(e => e.id !== exceptEv && RESERVING.includes(e.stage) && e.date <= date && eventEnd(e) >= date), e => (e.items || []).filter(i => i.invId === invId).reduce((s, i) => s + (+i.qty || 0), 0));
}
function availableOn(item, date, exceptEv) { return (+item.total || 0) - (+item.damaged || 0) - reservedOn(item.id, date, exceptEv); }
function onRent(item) { return sum(col('events').filter(e => e.dispatch?.out && !e.dispatch?.returned), e => (e.items || []).filter(i => i.invId === item.id).reduce((s, i) => s + (+i.qty || 0), 0)); }
function shortages() {
  const out = []; const t = todayLocal();
  col('events').filter(e => RESERVING.includes(e.stage) && eventEnd(e) >= t).forEach(e => (e.items || []).forEach(it => {
    const item = getById('inventory', it.invId); if (!item) return;
    const a = availableOn(item, e.date); if (a < 0) out.push({ ev: e, item, short: -a });
  }));
  return out;
}
function invCalc(inv, payments) {
  const lines = inv.lines || [];
  const sub = lines.reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0) * (+l.days || 1), 0);
  const disc = +inv.discount || 0; const base = Math.max(0, sub - disc); const r = (+inv.gstRate || 0) / 100;
  let taxable, gst, total;
  if (inv.gstMode === 'none') { taxable = base; gst = 0; total = base; }
  else if (inv.gstMode === 'incl') { total = base; taxable = base / (1 + r); gst = base - taxable; }
  else { taxable = base; gst = base * r; total = base + gst; }
  total = Math.round(total);
  const pays = (payments || col('payments')).filter(p => p.invoiceId === inv.id);
  const paid = sum(pays, p => p.amount);
  return { sub, disc, taxable, gst, cgst: inv.interstate ? 0 : gst / 2, sgst: inv.interstate ? 0 : gst / 2, igst: inv.interstate ? gst : 0, total, paid, balance: total - paid, pays };
}
function invStatus(inv, c) {
  c = c || invCalc(inv);
  if (inv.type === 'quotation') return inv.converted ? ['Converted', ''] : ['Quotation', 'info'];
  if (c.total > 0 && c.balance <= 0) return ['Paid', 'good'];
  if (inv.dueDate && inv.dueDate < todayLocal()) return ['Overdue', 'bad'];
  if (c.paid > 0) return ['Partial', 'warn'];
  return ['Unpaid', 'warn'];
}
function eventInvoices(evId) { return col('invoices').filter(i => i.eventId === evId); }
function wageCost(filter) { const staff = Object.fromEntries(col('staff').map(s => [s.id, s])); return sum(col('attendance').filter(filter), a => (a.status === 'P' ? 1 : a.status === 'H' ? .5 : 0) * (+staff[a.staffId]?.rate || 0)); }
function eventMoney(e) {
  const invs = eventInvoices(e.id).filter(i => i.type === 'invoice');
  const billed = sum(invs, i => invCalc(i).total);
  const received = sum(col('payments').filter(p => p.eventId === e.id), p => p.amount);
  const revenue = billed || (+e.budget || 0);
  const po = sum(col('pos').filter(p => p.eventId === e.id), p => p.amount);
  const exp = sum(col('expenses').filter(x => x.eventId === e.id), x => x.amount);
  const wages = wageCost(a => a.eventId === e.id);
  const cost = po + exp + wages;
  return { billed, received, revenue, po, exp, wages, cost, profit: revenue - cost, margin: revenue ? (revenue - cost) / revenue * 100 : 0, due: (billed || +e.budget || 0) - received };
}
function eventProgress(e) { const t = col('tasks').filter(x => x.eventId === e.id); return t.length ? sum(t, x => x.progress) / t.length : null; }
function computeAlerts() {
  if (!S.org) return [];
  const out = []; const t = todayLocal();
  if (can('invoices')) col('invoices').filter(i => i.type === 'invoice').forEach(i => { const c = invCalc(i); if (c.balance > 0 && i.dueDate && i.dueDate < t) out.push({ tag: 'Overdue', tone: 'bad', title: `${i.client || 'Client'} owes ${inr(c.balance)}`, sub: `${i.no} · due ${fmtDate(i.dueDate)} (${daysBetween(i.dueDate, t)} days late)`, go: `A.go('invoice',{id:'${i.id}'})` }); });
  if (can('inventory')) shortages().forEach(s => out.push({ tag: 'Shortage', tone: 'bad', title: `${s.short} × ${s.item.name} short`, sub: `${s.ev.title} on ${fmtDate(s.ev.date)}. Rent from a partner or move a booking.`, go: `A.go('event',{id:'${s.ev.id}',tab:'items'})` }));
  if (can('bookings')) col('events').forEach(e => {
    const d = daysBetween(t, e.date);
    if (['Enquiry', 'Quoted'].includes(e.stage) && d >= 0 && d <= 5) out.push({ tag: 'Confirm', tone: 'warn', title: `${e.title} not confirmed yet`, sub: `${fmtDate(e.date)} · ${d} day(s) left. Call ${e.client}.`, go: `A.go('event',{id:'${e.id}'})` });
    if (RESERVING.includes(e.stage) && (e.items || []).length && !e.dispatch?.out && d >= 0 && d <= 1) out.push({ tag: 'Dispatch', tone: 'accent', title: `Load truck for ${e.title}`, sub: `${(e.items || []).length} item types · ${fmtDate(e.date)}`, go: `A.go('event',{id:'${e.id}',tab:'items'})` });
    if (e.dispatch?.out && !e.dispatch?.returned && eventEnd(e) < t) out.push({ tag: 'Return', tone: 'warn', title: `Material not back from ${e.title}`, sub: `Event ended ${fmtDate(eventEnd(e))}. Mark the return and log damage.`, go: `A.go('event',{id:'${e.id}',tab:'items'})` });
  });
  return out;
}

/* ================= Catering state ================= */
function initCatering() {
  const st = settings();
  S.cat = S.cat && S.cat.orgId === S.org.orgId ? S.cat : { orgId: S.org.orgId, pax: 500, buffer: 10, markup: +st.markup || 30, selected: col('dishes').filter(d => d.default).map(d => d.id), eventId: '' };
}
