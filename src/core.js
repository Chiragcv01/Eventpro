'use strict';
/* ================= SabManage v3 — core ================= */
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
  info: 'M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0zM12 11v5M12 7.6v.4',
  megaphone: 'M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8M7 15l1.5 5h2.5l-1.3-4.3',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5h.01',
  share: 'M18 8a3 3 0 1 0-3-3M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-1-3-5-4-5-1.5S10 7 12 7zM12 7c1-3 5-4 5-1.5S14 7 12 7z',
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
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  steth: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 11a1.5 1.5 0 1 0 0-.01',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3', video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z', scale: 'M4 4h16v16H4zM8 9a6 6 0 0 1 8 0M12 9l1.5 3',
  thermo: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v7', lungs: 'M12 4v8M12 12c-2-2-4-3-6-1-2 2-2 8 0 9 2 1 4-1 4-4v-3M12 12c2-2 4-3 6-1 2 2 2 8 0 9-2 1-4-1-4-4v-3',
  play: 'M7 4l12 8-12 8z', stop: 'M6 6h12v12H6z',
  arrow: 'M5 12h14M13 6l6 6-6 6', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'
};
/* the SabManage mark: three tiles and a tick ("sab kaam ho gaya") */
const MARK_SVG = '<svg class="ico mark" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" stroke="none"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/></g><path d="M13.6 16.6l2 2 3.6-4.1" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;

/* ================= Domain constants ================= */
const BIZ_TYPES = [['tent', 'Tent House'], ['caterer', 'Caterer / Halwai'], ['event', 'Event Manager / Planner'], ['venue', 'Venue / Banquet / Resort'], ['transport', 'Transport / Logistics']];
/* 'event' businesses (tent / caterer / event manager) and 'clinic' (doctor) get different sections.
   A module without `kinds` is for event businesses only. */
const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Daily', kinds: ['event', 'clinic'] },
  { key: 'appointments', label: 'Appointments', icon: 'calendar', group: 'Daily', kinds: ['clinic'] },
  { key: 'patients', label: 'Patients', icon: 'heart', group: 'Daily', kinds: ['clinic'] },
  { key: 'medical', label: 'Medical records', icon: 'file', group: 'Daily', kinds: ['clinic'], hidden: true },
  { key: 'bookings', label: 'Bookings', icon: 'calendar', group: 'Daily' },
  { key: 'leads', label: 'Leads & Sales', short: 'Leads', icon: 'megaphone', group: 'Daily' },
  { key: 'venue', label: 'Venue & Rooms', short: 'Venue', icon: 'building', group: 'Daily', biz: ['venue'] },
  { key: 'fleet', label: 'Transport', icon: 'truck', group: 'Daily', biz: ['transport'] },
  { key: 'tasks', label: 'Live Tracker', short: 'Live', icon: 'pulse', group: 'Daily' },
  { key: 'inventory', label: 'Inventory', icon: 'box', group: 'Operations', biz: ['tent', 'event', 'venue'] },
  { key: 'catering', label: 'Catering', icon: 'pot', group: 'Operations', biz: ['caterer', 'event', 'venue'] },
  { key: 'vendors', label: 'Vendors & POs', icon: 'handshake', group: 'Operations' },
  { key: 'staff', label: 'Staff & Wages', el: 'Staff & Wages', cl: 'Staff & Salary', icon: 'users', group: 'Operations', kinds: ['event', 'clinic'] },
  { key: 'tools', label: 'Planner Tools', icon: 'ruler', group: 'Operations', biz: ['tent', 'event'] },
  { key: 'invoices', label: 'Invoices', icon: 'receipt', group: 'Money' },
  { key: 'payments', label: 'Payments', icon: 'rupee', group: 'Money' },
  { key: 'expenses', label: 'Expenses', icon: 'wallet', group: 'Money', kinds: ['event', 'clinic'] },
  { key: 'reports', label: 'Reports & P&L', el: 'Reports & P&L', cl: 'Income & expenses', icon: 'chart', group: 'Money', kinds: ['event', 'clinic'] },
  { key: 'reviews', label: 'Reviews', icon: 'star', group: 'Business' },
  { key: 'marketing', label: 'Marketing', icon: 'megaphone', group: 'Business', kinds: ['event', 'clinic'] },
  { key: 'team', label: 'Team & Access', icon: 'shield', group: 'Business', kinds: ['event', 'clinic'] },
  { key: 'settings', label: 'Settings', icon: 'gear', group: 'Business', kinds: ['event', 'clinic'] }
];
const MOD_COLOR = { fleet: '#C2410C', leads: '#9333EA', venue: '#0F766E', appointments: '#7C3AED', patients: '#E11D48', medical: '#0891B2', dashboard: '#1F5EFF', bookings: '#7C3AED', tasks: '#0EA5E9', inventory: '#2563EB', catering: '#16A34A', vendors: '#D97706', staff: '#0D9488', tools: '#4F46E5', invoices: '#DB2777', payments: '#0B9B68', expenses: '#EA580C', reports: '#0891B2', reviews: '#EAB308', marketing: '#E11D74', team: '#475569', settings: '#64748B' };
MODULES.forEach(m => { m.c = MOD_COLOR[m.key]; });
const MOD = Object.fromEntries(MODULES.map(m => [m.key, m]));
const EV_STYLE = { 'Wedding': ['rings', '#E11D74'], 'Reception': ['sparkle', '#C026D3'], 'Sangeet & Mehendi': ['music', '#F59E0B'], 'Ring Ceremony': ['rings', '#8B5CF6'], 'Corporate Event': ['briefcase', '#2563EB'], 'Birthday / Anniversary': ['cake', '#F97316'], 'Religious / Jagran': ['diya', '#EA580C'], 'Exhibition': ['store', '#0891B2'], 'Other': ['calendar', '#64748B'] };
const evStyle = e => EV_STYLE[e?.type] || EV_STYLE.Other;
const INV_STYLE = { 'Tents & Shamiana': ['tent', '#2563EB'], 'Furniture': ['chair', '#7C3AED'], 'Lighting & Sound': ['bulb', '#F59E0B'], 'Power & DG': ['bolt', '#EA580C'], 'Catering Utensils': ['utensils', '#16A34A'], 'Decor & Flooring': ['sparkle', '#DB2777'], 'Other': ['box', '#64748B'] };
const EXP_STYLE = { 'Diesel / Fuel': ['fuel', '#EA580C'], 'Transport': ['truck', '#2563EB'], 'Extra Labour': ['users', '#0D9488'], 'Food & Grocery': ['cart', '#16A34A'], 'Venue / Rent': ['building', '#7C3AED'], 'Repair & Damage': ['wrench', '#E0344B'], 'Misc': ['dots', '#64748B'] };
const COLL_MODULE = { parties: 'fleet', fbills: 'fleet', vehicles: 'fleet', drivers: 'fleet', trips: 'fleet', fleetx: 'fleet', leads: 'leads', spaces: 'venue', rooms: 'venue', stays: 'venue', depts: 'venue', checklists: 'tasks', events: 'bookings', inventory: 'inventory', dishes: 'catering', mandi: 'catering', invoices: 'invoices', counters: 'invoices', payments: 'payments', vendors: 'vendors', pos: 'vendors', staff: 'staff', attendance: 'staff', advances: 'staff', payouts: 'staff', tasks: 'tasks', expenses: 'expenses', reviews: 'reviews', settings: 'settings', activity: 'team', patients: 'patients', readings: 'patients', pmsgs: 'patients', visits: 'medical', appts: 'appointments' };
const LEVELS = [[0, 'No access'], [1, 'View'], [2, 'Edit'], [3, 'Full']];
const allPerms = l => Object.fromEntries(MODULES.map(m => [m.key, l]));
const ROLE_DEFAULTS = {
  owner: { label: 'Owner', perms: allPerms(3), locked: true },
  manager: { label: 'Manager', perms: { fleet: 3, leads: 3, venue: 3, dashboard: 1, bookings: 3, tasks: 3, inventory: 3, catering: 3, vendors: 2, staff: 2, tools: 2, invoices: 2, payments: 2, expenses: 2, reports: 1, reviews: 2, marketing: 2, team: 1, settings: 1 } },
  accountant: { label: 'Accountant', perms: { fleet: 2, leads: 1, venue: 1, dashboard: 1, bookings: 1, tasks: 0, inventory: 0, catering: 0, vendors: 2, staff: 1, tools: 0, invoices: 3, payments: 3, expenses: 3, reports: 1, reviews: 1, marketing: 0, team: 0, settings: 1 } },
  supervisor: { label: 'Site Supervisor', perms: { fleet: 2, leads: 0, venue: 2, dashboard: 1, bookings: 2, tasks: 3, inventory: 2, catering: 1, vendors: 1, staff: 2, tools: 2, invoices: 0, payments: 0, expenses: 2, reports: 0, reviews: 1, marketing: 0, team: 0, settings: 0 } },
  sales: { label: 'Sales Executive', perms: { fleet: 0, leads: 2, venue: 1, dashboard: 1, bookings: 2, tasks: 1, inventory: 0, catering: 1, vendors: 0, staff: 0, tools: 0, invoices: 1, payments: 0, expenses: 0, reports: 0, reviews: 1, marketing: 2, team: 0, settings: 0 } },
  head: { label: 'Department Head', perms: { fleet: 0, leads: 0, venue: 1, dashboard: 1, bookings: 1, tasks: 2, inventory: 1, catering: 0, vendors: 0, staff: 0, tools: 0, invoices: 0, payments: 0, expenses: 0, reports: 0, reviews: 0, marketing: 0, team: 0, settings: 0 } },
  staff: { label: 'Crew / Staff', perms: { fleet: 2, leads: 0, venue: 1, dashboard: 1, bookings: 1, tasks: 2, inventory: 1, catering: 0, vendors: 0, staff: 0, tools: 0, invoices: 0, payments: 0, expenses: 0, reports: 0, reviews: 0, marketing: 0, team: 0, settings: 0 } }
};
const CLINIC_ROLES = {
  owner: { label: 'Doctor (Owner)', perms: allPerms(3), locked: true },
  manager: { label: 'Associate doctor', perms: { dashboard: 1, appointments: 3, patients: 3, medical: 3, tasks: 2, staff: 2, expenses: 2, reports: 1, marketing: 2, team: 1, settings: 1 } },
  supervisor: { label: 'Receptionist', perms: { dashboard: 1, appointments: 3, patients: 2, medical: 0, tasks: 2, staff: 0, expenses: 2, reports: 0, marketing: 2, team: 0, settings: 0 } },
  staff: { label: 'Nurse / Assistant', perms: { dashboard: 1, appointments: 1, patients: 2, medical: 1, tasks: 1, staff: 0, expenses: 0, reports: 0, marketing: 0, team: 0, settings: 0 } }
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
const DEFAULT_PLATFORM = { appName: 'SabManage', supportName: 'SabManage Support', supportPhone: '', supportEmail: '', trialDays: 14, referralReward: 'You get 1 month free when they take a paid plan.', plans: [{ name: 'Basic', price: 499 }, { name: 'Pro', price: 999 }, { name: 'Enterprise', price: 2499 }] };
const superEmails = () => (CFG.superAdminEmails || []).map(loginId);
function graceDays() { return Math.max(0, Math.min(60, +(S.platform?.graceDays || 0))); }
function orgState(o) { if (!o) return 'active'; if (o.status === 'suspended') return 'suspended'; if (o.kind === 'clinic' && o.verify !== 'approved') return 'verify'; if (o.expires && o.expires < todayLocal()) return addDays(o.expires, graceDays()) < todayLocal() ? 'expired' : 'grace'; return o.status || 'active'; }
const STATE_PILL = { verify: ['Verification pending', 'warn'], trial: ['Trial', 'info'], active: ['Active', 'good'], grace: ['Grace period', 'warn'], expired: ['Expired', 'bad'], suspended: ['Suspended', 'bad'] };

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
    orgMeta(id) { const db = load(); const o = db.orgs[id] || {}; const v = (db.verify || {})[id]; return { status: o.status || 'active', plan: o.plan || 'Pro', expires: o.expires || '', notes: o.notes || '', price: o.price ?? null, kind: o.kind || 'event', verify: v?.status || null, verifyNote: v?.note || '' }; },
    async mfaState() { return null; }, async mfaIsOn() { return false; },
    async mfaEnroll() { throw new Error('Authenticator works only in the live (cloud) app.'); },
    async resetUserMfa() { throw new Error('Authenticator works only in the live (cloud) app.'); },
    async isSuperAdmin(userId) { const u = load().users.find(x => x.id === userId); return !!(u && (u.superAdmin || superEmails().includes(u.email))); },
    async adminOverview() {
      const db = load();
      return Object.entries(db.orgs).map(([id, o]) => { const R = db.records[id] || {}; const st = R.settings?.main || {}; const own = db.members.find(m => m.orgId === id && m.role === 'owner');
        const upd = Math.max(o.created || 0, ...Object.values(R).flatMap(c => Object.values(c).map(r => r.updatedAt || 0)));
        return { orgId: id, name: o.name, created: o.created, ...this.orgMeta(id), ownerName: own?.name, ownerEmail: own?.email, ownerPhone: st.phone, city: st.city, logo: st.logo, referredBy: st.referredBy, members: db.members.filter(m => m.orgId === id).length, bookings: Object.keys(R.events || {}).length, invoices: Object.keys(R.invoices || {}).length, lastActivity: upd }; })
        .sort((a, b) => (b.created || 0) - (a.created || 0));
    },
    async adminUpdateOrg(id, patch) { const o = load().orgs[id]; if (!o) throw new Error('Business not found'); Object.assign(o, patch); persist(); },
    /* clinics: doctor verification, files, patient links and the patient portal (offline copies for testing) */
    async submitVerification(orgId, v) { const db = load(); db.verify = db.verify || {}; if (db.verify[orgId]?.status === 'approved') throw new Error('Already verified'); if (!(v.files || []).length) throw new Error('Upload your registration certificate'); db.verify[orgId] = { org_id: orgId, ...v, status: 'pending', note: null, submitted_at: new Date().toISOString() }; persist(); },
    async myVerification(orgId) { return (load().verify || {})[orgId] || null; },
    async adminVerifications() { const db = load(); return Object.values(db.verify || {}).map(v => ({ ...v, orgName: db.orgs[v.org_id]?.name })); },
    async adminSetVerify(orgId, status, note) { const db = load(); db.verify = db.verify || {}; db.verify[orgId] = { ...(db.verify[orgId] || { org_id: orgId, files: [] }), status, note: note || null, reviewed_at: new Date().toISOString() }; persist(); },
    async uploadFile(bucket, path, blob) { const db = load(); db.files = db.files || {}; db.files[bucket + ':' + path] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); persist(); return path; },
    async fileUrl(bucket, path) { return (load().files || {})[bucket + ':' + path] || ''; },
    async loadPatient() { return null; },
    async patientLink(orgId, pid, reset) { const db = load(); db.plinks = db.plinks || []; if (reset) db.plinks.forEach(l => { if (l.orgId === orgId && l.pid === pid) l.revoked = true; }); let l = db.plinks.find(x => x.orgId === orgId && x.pid === pid && !x.revoked); if (!l) { l = { token: guestToken() + guestToken().slice(0, 6), orgId, pid, consent: null }; db.plinks.push(l); } const p = db.records[orgId]?.patients?.[pid]; if (p) p.linkToken = l.token; persist(); return l.token; },
    _pl(token) { const db = load(); const l = (db.plinks || []).find(x => x.token === String(token || '').trim().toLowerCase() && !x.revoked); if (!l) throw new Error('This link is not active. Please ask your clinic for a new link.'); const o = db.orgs[l.orgId]; if (!o || orgState({ ...o, ...this.orgMeta(l.orgId) }) !== 'trial' && orgState({ ...o, ...this.orgMeta(l.orgId) }) !== 'active' && orgState({ ...o, ...this.orgMeta(l.orgId) }) !== 'grace') throw new Error('This clinic is not taking online requests right now. Please call the clinic.'); return { l, R: db.records[l.orgId] }; },
    _notify(orgId, title, body, kind = 'patient', extra = {}) { const l = LS.get('ep_alerts_' + orgId, []); l.unshift({ id: uid('al_'), org_id: orgId, from_user: 'patient', from_name: 'Patient', title, body, kind, to_role: 'managers', urgent: false, acks: {}, created_at: new Date().toISOString(), ...extra }); LS.set('ep_alerts_' + orgId, l.slice(0, 200)); },
    _put(R, coll, rec) { (R[coll] = R[coll] || {})[rec.id] = rec; },
    async portalView(token) { const { l, R } = this._pl(token); const st = R.settings?.main || {}; const pt = R.patients?.[l.pid]; if (!pt) throw new Error('Patient not found. Please ask your clinic for a new link.'); const of = c => Object.values(R[c] || {}).filter(x => x.patientId === l.pid);
      return { clinic: { bizName: st.bizName, doctor: st.doctorName, spec: st.specialisation, qual: st.qualification, regNo: st.regNo, council: st.council, phone: st.phone, logo: st.logo, upi: st.upi, address: st.address, city: st.city, timings: st.timings, feeClinic: st.feeClinic, feeVideo: st.feeVideo, tests: st.tests || [], tellPatient: st.tellPatient !== false },
        patient: { id: pt.id, name: pt.name, age: pt.age, sex: pt.sex, track: pt.track, medAlert: pt.medAlert, account: pt.account }, consents: of('visits').filter(x => x.kind === 'consent').map(({ signImg, ...x }) => x).sort((a, b) => String(b.date).localeCompare(String(a.date))), consent: !!l.consent, rules: mergeRules(clinicRules(st), pt.rules), alerts: (load().palerts || []).filter(a => a.orgId === l.orgId && a.pid === l.pid && !a.seenAt && !a.cancelledAt).reverse(), readings: of('readings').sort((a, b) => String(b.at).localeCompare(String(a.at))), appts: of('appts').filter(a => a.status !== 'cancelled'), msgs: of('pmsgs').sort((a, b) => String(a.at).localeCompare(String(b.at))) }; },
    async portalConsent(token, name) { const { l } = this._pl(token); l.consent = { at: new Date().toISOString(), name }; persist(); },
    async portalSignConsent(token, id, name, img) { const { l, R } = this._pl(token); const c = R.visits?.[id]; if (!c || c.kind !== 'consent' || c.patientId !== l.pid) throw new Error('This form was not found. Please ask your clinic.'); if (c.status === 'signed') throw new Error('This form is already signed.'); if (!/^data:image\/(png|jpeg);base64,/.test(img || '')) throw new Error('Please sign again'); const now = new Date(); Object.assign(c, { status: 'signed', signedAt: todayLocal(now) + 'T' + now.toTimeString().slice(0, 5), signName: String(name || '').slice(0, 120), signBy: 'patient', signImg: img, signVia: 'link' }); persist(); },
    async portalReading(token, p) {
      const { l, R } = this._pl(token); if (!l.consent) throw new Error('Please give your consent first'); const now = new Date(); const pt = R.patients[l.pid]; const st = R.settings?.main || {};
      const rec = { id: uid('rd_'), patientId: l.pid, by: 'patient', at: todayLocal(now) + 'T' + now.toTimeString().slice(0, 5), date: todayLocal(now), ...cleanReading(p) }; if (!readingHas(rec)) throw new Error('Fill at least one reading');
      const ev = readingLevel(rec, mergeRules(clinicRules(st), pt.rules)); if (ev.level) Object.assign(rec, { level: ev.level, flags: ev.flags });
      this._put(R, 'readings', rec); pt.lastReadingAt = rec.at;
      if (ev.level === 'emergency' || (ev.level === 'alert' && pt.alertLevel !== 'emergency')) Object.assign(pt, { alertLevel: ev.level, alertText: ev.flags.join(', '), alertAt: rec.at, alertReading: rec.id });
      if (ev.level === 'emergency') this._notify(l.orgId, 'EMERGENCY: ' + pt.name, ev.flags.join(', '), 'emergency', { urgent: true, to_role: st.alarmTo === 'all' ? null : st.alarmTo === 'managers' ? 'managers' : 'doctors', event_id: 'pt:' + l.pid });
      else if (ev.level === 'alert') this._notify(l.orgId, 'Reading to check: ' + pt.name, ev.flags.join(', '), 'reading', { event_id: 'pt:' + l.pid });
      persist(); return rec;
    },
    async clinicAlertPatient(orgId, pid, level, text) {
      const db = load(); const R = db.records[orgId]; const pt = R?.patients?.[pid]; if (!pt) throw new Error('Patient not found'); const txt = String(text || '').trim().slice(0, 500); if (!txt) throw new Error('Write the message for the patient');
      if (!(db.plinks || []).some(x => x.orgId === orgId && x.pid === pid && !x.revoked)) throw new Error('Send the patient link first. The alert shows on the patient link.');
      db.palerts = db.palerts || []; db.palerts.forEach(a => { if (a.orgId === orgId && a.pid === pid && !a.seenAt && !a.cancelledAt) a.cancelledAt = new Date().toISOString(); });
      const now = new Date(); const at = todayLocal(now) + 'T' + now.toTimeString().slice(0, 5); const a = { id: uid('pa_'), orgId, pid, level: level === 'amber' ? 'amber' : 'red', text: txt, by: S.me?.name || 'Clinic', at };
      db.palerts.push(a); this._put(R, 'pmsgs', { id: uid('pm_'), patientId: pid, from: 'clinic', at, text: txt, files: [], flag: a.level, alertId: a.id, by: a.by });
      pt.flag = { id: a.id, level: a.level, text: txt, at, by: a.by }; persist(); return { ...a, devices: 0 };
    },
    async clinicCancelAlert(orgId, id) { const db = load(); const a = (db.palerts || []).find(x => x.id === id && x.orgId === orgId); if (a && !a.cancelledAt) { a.cancelledAt = new Date().toISOString(); const pt = db.records[orgId]?.patients?.[a.pid]; if (pt?.flag?.id === id) pt.flag.cancelledAt = a.cancelledAt.slice(0, 16); persist(); } },
    async portalAck(token, id) { const { l, R } = this._pl(token); const db = load(); const a = (db.palerts || []).find(x => x.id === id && x.orgId === l.orgId && x.pid === l.pid && !x.seenAt && !x.cancelledAt); if (!a) return; const now = new Date(); a.seenAt = todayLocal(now) + 'T' + now.toTimeString().slice(0, 5); const pt = R.patients[l.pid]; if (pt?.flag?.id === id) pt.flag.seenAt = a.seenAt; this._notify(l.orgId, (pt?.name || 'Patient') + ' has seen your alert', a.text.slice(0, 120)); persist(); },
    async portalSavePush() { },
    async leadKey(orgId, reset) { const db = load(); db.leadKeys = db.leadKeys || {}; if (reset || !db.leadKeys[orgId]) db.leadKeys[orgId] = guestToken() + guestToken(); persist(); return db.leadKeys[orgId]; },
    async leadIntake(key, p) { const db = load(); const orgId = Object.keys(db.leadKeys || {}).find(o => db.leadKeys[o] === key); if (!orgId) throw new Error('This lead link is not active'); const now = new Date(); const at = todayLocal(now) + 'T' + now.toTimeString().slice(0, 5); const R = db.records[orgId] = db.records[orgId] || {}; const rec = { id: uid('ld_'), created: Date.now(), createdAt: at, status: 'New', via: 'link', ...p, log: [{ at, type: 'lead', by: 'Lead link', text: p.message || '' }] }; (R.leads = R.leads || {})[rec.id] = rec; this._notify(orgId, 'New lead: ' + (p.name || p.phone), p.source || '', 'lead', { to_role: 'sales', event_id: 'ld:' + rec.id }); persist(); if (S.org?.orgId === orgId) S.data.leads = [...col('leads'), rec]; return { ok: true, id: rec.id }; },
    async portalMessage(token, p) { const { l, R } = this._pl(token); if (!l.consent) throw new Error('Please give your consent first'); const now = new Date(); if (!(p.text || '').trim() && !(p.files || []).length) throw new Error('Write something, or add a photo or voice note'); const pt = R.patients[l.pid]; const rec = { id: uid('pm_'), patientId: l.pid, from: 'patient', at: todayLocal(now) + 'T' + now.toTimeString().slice(0, 5), text: (p.text || '').trim(), files: p.files || [], by: pt.name }; this._put(R, 'pmsgs', rec); pt.unread = (+pt.unread || 0) + 1; pt.lastMsgAt = rec.at; this._notify(l.orgId, 'Message from ' + pt.name, rec.text || 'Photo / voice'); persist(); return rec; },
    async portalBook(token, p) { const { l, R } = this._pl(token); if (!l.consent) throw new Error('Please give your consent first'); if (!p.date || p.date < todayLocal()) throw new Error('Pick a date within the next 90 days'); const pt = R.patients[l.pid]; const st = R.settings?.main || {}; const mode = ['clinic', 'video', 'whatsapp'].includes(p.mode) ? p.mode : 'clinic'; const rec = { id: uid('ap_'), patientId: l.pid, patientName: pt.name, phone: pt.phone, date: p.date, time: p.time || '', mode, status: 'requested', source: 'patient', reason: p.reason || '', fee: +(mode === 'clinic' ? st.feeClinic : st.feeVideo) || 0, paid: false, created: Date.now() }; this._put(R, 'appts', rec); this._notify(l.orgId, 'Appointment request: ' + pt.name, rec.date + ' ' + rec.time); persist(); return rec; },
    async portalPaid(token, apptId, utr) { const { l, R } = this._pl(token); const a = R.appts?.[apptId]; if (!a || a.patientId !== l.pid) throw new Error('Appointment not found'); a.payClaim = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), utr: utr || '' }; this._notify(l.orgId, 'Fee paid by ' + a.patientName + ' (check UPI)', inr(a.fee)); persist(); },
    async adminUsers() { const db = load(); return db.users.map(u => ({ userId: u.id, email: u.email, name: u.name, created: u.created, blocked: !!u.blocked, super: !!(u.superAdmin || superEmails().includes(u.email)), orgs: db.members.filter(m => m.userId === u.id).map(m => ({ name: db.orgs[m.orgId]?.name, role: m.role })) })); },
    async adminSetSuper(email, on) { const db = load(); const u = db.users.find(x => x.email === loginId(email)); if (!u) throw new Error('No account with this email or mobile. Ask them to sign up first.'); if (!on && u.id === db.session?.userId) throw new Error('You cannot remove your own Super Admin access.'); u.superAdmin = !!on; persist(); },
    async getPlatform() { return { ...DEFAULT_PLATFORM, ...(load().platform || {}) }; },
    async savePlatform(p) { load().platform = p; persist(); },
    async createOrg(userId, name, displayName, roles, settings) {
      const db = load(); const id = uid('o_'); db.orgs[id] = { name, created: Date.now(), status: 'trial', plan: 'Trial', kind: (settings?.bizTypes || []).includes('clinic') ? 'clinic' : 'event', expires: addDays(todayLocal(), +(S.platform?.trialDays || DEFAULT_PLATFORM.trialDays)) };
      db.members.push({ orgId: id, userId, role: 'owner', name: displayName, email: db.users.find(u => u.id === userId)?.email });
      db.roles[id] = roles; db.records[id] = { settings: { main: settings } }; persist(); return id;
    },
    async loadOrg(orgId) {
      const db = load(); const recs = db.records[orgId] || {}; const data = {};
      for (const [c, m] of Object.entries(recs)) data[c] = Object.values(m);
      return { data, roles: JSON.parse(JSON.stringify(db.roles[orgId] || {})), members: db.members.filter(m => m.orgId === orgId).map(m => ({ ...m })) };
    },
    async put(orgId, coll, rec) { const db = load(); db.records[orgId] = db.records[orgId] || {}; (db.records[orgId][coll] = db.records[orgId][coll] || {})[rec.id] = JSON.parse(JSON.stringify(rec)); if (coll === 'settings' && rec.bizName) db.orgs[orgId].name = rec.bizName; persist(); },
    async putMany(orgId, coll, recs) { for (const r of recs) await this.put(orgId, coll, r); },
    async del(orgId, coll, id) { const db = load(); if (db.records[orgId]?.[coll]) delete db.records[orgId][coll][id]; persist(); },
    async delDemo(orgId, colls) { const db = load(); colls.forEach(c => { const m = db.records[orgId]?.[c]; if (m) Object.keys(m).forEach(id => { if (m[id]?.demo) delete m[id]; }); }); persist(); },
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
    async joinWithCode(code, email, password, name) { const db = load(); code = String(code).toUpperCase().trim(); const inv = db.invites.find(i => i.code === code && !i.usedBy && i.expires > Date.now()); if (!inv) throw new Error('Invite code not found, expired or already used.'); const u = await this.signUp({ email, password, name, phone: '' }); return this.acceptInvite(u.id, code, name); },
    async inviteUsedBy(code) { return load().invites.find(i => i.code === code)?.usedBy || null; },
    async deptNames(orgId) { return Object.values(load().records[orgId]?.depts || {}).map(d => ({ id: d.id, name: d.name })); },
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
    /* website: blog + enquiries (offline copies, for testing) */
    async blogList() { return (load().blog || []).slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))); },
    async blogGet(id) { return (load().blog || []).find(p => p.id === id) || null; },
    async blogSave(p) { const db = load(); db.blog = db.blog || []; if ((db.blog || []).some(x => x.slug === p.slug && x.id !== p.id)) throw new Error('Another post already uses this web address (slug).');
      const now = new Date().toISOString(); const rec = { ...p, id: p.id || uid('bp_'), updated_at: now, created_at: p.created_at || now, published_at: p.status === 'published' ? (p.published_at || now) : p.published_at || null };
      const i = db.blog.findIndex(x => x.id === rec.id); if (i >= 0) db.blog[i] = rec; else db.blog.unshift(rec); persist(); return rec; },
    async blogDelete(id) { const db = load(); db.blog = (db.blog || []).filter(p => p.id !== id); persist(); },
    async uploadImage(blob) { return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); },
    async leadsList() { return (load().leads || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); },
    async leadUpdate(id, patch) { const l = (load().leads || []).find(x => x.id === id); if (l) Object.assign(l, patch); persist(); },
    async leadDelete(id) { const db = load(); db.leads = (db.leads || []).filter(x => x.id !== id); persist(); },
    async submitEnquiry(v) { const db = load(); db.leads = db.leads || []; db.leads.unshift({ id: uid('ld_'), status: 'new', note: '', created_at: new Date().toISOString(), name: v.name, phone: v.phone, email: v.email || '', business: v.business || '', city: v.city || '', biz_type: v.bizType || '', message: v.message || '', source: v.source || 'website' }); persist(); },
    async requestDeletion(reason) { const db = load(); const u = db.users.find(x => x.id === db.session?.userId); db.deletions = db.deletions || []; if (db.deletions.some(d => d.user_id === u.id && d.status === 'pending')) return; db.deletions.unshift({ id: uid('dl_'), user_id: u.id, login_id: u.email, name: u.name, business: db.members.filter(m => m.userId === u.id).map(m => db.orgs[m.orgId]?.name).join(', '), phone: u.phone || '', reason, source: 'app', status: 'pending', created_at: new Date().toISOString() }); persist(); },
    async myDeletion() { const db = load(); return (db.deletions || []).find(d => d.user_id === db.session?.userId && d.status === 'pending') || null; },
    async deletionsList() { return (load().deletions || []).slice(); },
    async deletionUpdate(id, patch) { const d = (load().deletions || []).find(x => x.id === id); if (d) Object.assign(d, patch); persist(); },
    async adminDeleteAccount(userId, reqId) { const db = load(); const u = db.users.find(x => x.id === userId); if (!u) throw new Error('Login not found');
      const owned = db.members.filter(m => m.userId === userId && m.role === 'owner').map(m => m.orgId).filter(o => !db.members.some(m => m.orgId === o && m.role === 'owner' && m.userId !== userId));
      owned.forEach(id => { delete db.orgs[id]; delete db.records[id]; delete db.roles[id]; }); db.members = db.members.filter(m => m.userId !== userId && !owned.includes(m.orgId)); db.users = db.users.filter(x => x.id !== userId);
      (db.deletions || []).forEach(d => { if ((d.id === reqId || d.user_id === userId) && d.status === 'pending') Object.assign(d, { status: 'done', done_at: new Date().toISOString(), user_id: null }); }); persist(); return { businesses: owned.length, login: u.email }; },
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
  err(e) { const x = new Error(e?.message || String(e)); if (e?.code) x.code = e.code; return x; },
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
    const { data, error } = await this.sb.from('org_members').select('org_id, role, perms, orgs(name,status,plan,expires_at,price,kind,org_verifications(status,note))').eq('user_id', userId);
    if (error) throw this.err(error); return data.map(r => { const v = [].concat(r.orgs?.org_verifications || [])[0]; return { orgId: r.org_id, name: r.orgs?.name || 'Business', role: r.role, perms: r.perms || null, status: r.orgs?.status, plan: r.orgs?.plan, price: r.orgs?.price ?? null, expires: (r.orgs?.expires_at || '').slice(0, 10), kind: r.orgs?.kind || 'event', verify: v?.status || null, verifyNote: v?.note || '' }; });
  },
  async isSuperAdmin() { const { data, error } = await this.sb.rpc('is_super_admin'); return !error && !!data; },
  async adminOverview() { const { data, error } = await this.sb.rpc('admin_overview'); if (error) throw this.err(error); return (data || []).map(o => ({ ...o, created: Date.parse(o.created), lastActivity: Date.parse(o.lastActivity || o.created) })); },
  async adminUpdateOrg(id, p) { const row = {}; if (p.status) row.status = p.status; if (p.plan) row.plan = p.plan; if ('expires' in p) row.expires_at = p.expires ? p.expires + 'T23:59:59+05:30' : null; if ('notes' in p) row.notes = p.notes; if ('price' in p) row.price = p.price === '' || p.price == null ? null : +p.price; const { error } = await this.sb.from('orgs').update(row).eq('id', id); if (error) throw this.err(error); },
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
      this.sb.from('records').select('collection,id,data').eq('org_id', orgId).not('collection', 'in', '(readings,pmsgs,visits)').limit(20000),
      this.sb.from('org_roles').select('role,label,perms').eq('org_id', orgId),
      this.sb.from('org_members').select('user_id,role,display_name,email,staff_id,perms').eq('org_id', orgId)]);
    for (const r of [r1, r2, r3]) if (r.error) throw this.err(r.error);
    const data = {}; r1.data.forEach(x => (data[x.collection] = data[x.collection] || []).push(x.data));
    const roles = {}; r2.data.forEach(x => roles[x.role] = { label: x.label, perms: x.perms, locked: x.role === 'owner' });
    return { data, roles, members: r3.data.map(m => ({ orgId, userId: m.user_id, role: m.role, name: m.display_name, email: m.email, staffId: m.staff_id, perms: m.perms || null })) };
  },
  async put(orgId, coll, rec) { const { error } = await this.sb.from('records').upsert({ org_id: orgId, collection: coll, id: rec.id, data: rec, updated_at: new Date().toISOString() }); if (error) throw this.err(error); if (coll === 'settings' && rec.bizName) this.sb.from('orgs').update({ name: rec.bizName }).eq('id', orgId).then(() => { }); },
  async putMany(orgId, coll, recs) { const now = new Date().toISOString(); for (let i = 0; i < recs.length; i += 200) { const { error } = await this.sb.from('records').upsert(recs.slice(i, i + 200).map(rec => ({ org_id: orgId, collection: coll, id: rec.id, data: rec, updated_at: now }))); if (error) throw this.err(error); } },
  async del(orgId, coll, id) { const { error } = await this.sb.from('records').delete().match({ org_id: orgId, collection: coll, id }); if (error) throw this.err(error); },
  async delDemo(orgId, colls) { const { error } = await this.sb.from('records').delete().eq('org_id', orgId).in('collection', colls).eq('data->>demo', 'true'); if (error) throw this.err(error); },
  async saveRoles(orgId, roles) { const rows = Object.entries(roles).filter(([k]) => k !== 'owner').map(([role, r]) => ({ org_id: orgId, role, label: r.label, perms: r.perms })); const { error } = await this.sb.from('org_roles').upsert(rows); if (error) throw this.err(error); },
  async createInvite(orgId, role, name) { const code = inviteCode(); const { error } = await this.sb.from('invites').insert({ code, org_id: orgId, role, display_name: name, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }); if (error) throw this.err(error); return code; },
  async acceptInvite(userId, code, displayName) { const { data, error } = await this.sb.rpc('accept_invite', { p_code: String(code).toUpperCase().trim(), p_display_name: displayName || null }); if (error) throw this.err(error); return data; },
  async listInvites(orgId) { const { data, error } = await this.sb.from('invites').select('*').eq('org_id', orgId).is('used_by', null).gt('expires_at', new Date().toISOString()); if (error) return []; return data.map(i => ({ code: i.code, role: i.role, name: i.display_name })); },
  async revokeInvite(code) { await this.sb.from('invites').delete().eq('code', code); },
  async joinWithCode(code, email, password, name) { return this.rpc('join_with_code', { p_code: String(code).toUpperCase().trim(), p_email: email, p_password: password, p_name: name }); },
  async inviteUsedBy(code) { const { data } = await this.sb.from('invites').select('used_by').eq('code', code).maybeSingle(); return data?.used_by || null; },
  async deptNames(orgId) { const { data, error } = await this.sb.rpc('dept_names', { p_org: orgId }); if (error) throw this.err(error); return data || []; },
  async updateMember(orgId, userId, patch) { const p = {}; if (patch.role) p.role = patch.role; if ('staffId' in patch) p.staff_id = patch.staffId || null; if ('perms' in patch) p.perms = patch.perms && Object.keys(patch.perms).length ? patch.perms : null; const { error } = await this.sb.from('org_members').update(p).match({ org_id: orgId, user_id: userId }); if (error) throw this.err(error); },
  async removeMember(orgId, userId) { const { error } = await this.sb.from('org_members').delete().match({ org_id: orgId, user_id: userId }); if (error) throw this.err(error); },
  async createGuest(orgId, eventId, days) { const token = guestToken(); const { error } = await this.sb.from('guest_links').insert({ token, org_id: orgId, event_id: eventId, expires_at: new Date(Date.now() + days * 864e5).toISOString() }); if (error) throw this.err(error); return token; },
  async guestView(token) { const { data, error } = await this.sb.rpc('guest_view', { p_token: String(token).trim().toLowerCase() }); if (error) throw this.err(error); if (!data) throw new Error('This guest code is invalid or has expired.'); return data; },
  /* clinics */
  async submitVerification(orgId, v) { return this.rpc('submit_verification', { p_org: orgId, p: v }); },
  async myVerification(orgId) { const { data } = await this.sb.from('org_verifications').select('*').eq('org_id', orgId).maybeSingle(); return data || null; },
  async adminVerifications() { const { data, error } = await this.sb.from('org_verifications').select('*, orgs(name)').order('submitted_at', { ascending: false }).limit(300); if (error) throw this.err(error); return (data || []).map(v => ({ ...v, orgName: v.orgs?.name })); },
  async adminSetVerify(orgId, status, note) { const { error } = await this.sb.from('org_verifications').update({ status, note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: S.user?.id || null }).eq('org_id', orgId); if (error) throw this.err(error); },
  async uploadFile(bucket, path, blob) { const { error } = await this.sb.storage.from(bucket).upload(path, blob, { contentType: (blob.type || 'application/octet-stream').split(';')[0], upsert: false }); if (error) throw this.err(error); return path; },
  async fileUrl(bucket, path) { const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, 3600); if (error) return ''; return data.signedUrl; },
  async loadPatient(orgId, pid) { const { data, error } = await this.sb.from('records').select('collection,data').eq('org_id', orgId).in('collection', ['readings', 'pmsgs', 'visits']).eq('data->>patientId', pid).limit(5000); if (error) throw this.err(error); const out = { readings: [], pmsgs: [], visits: [] }; (data || []).forEach(r => out[r.collection].push(r.data)); return out; },
  async patientLink(orgId, pid, reset) { return this.rpc('patient_link', { p_org: orgId, p_patient: pid, p_reset: !!reset }); },
  async portalView(token) { return this.rpc('patient_view', { p_token: String(token).trim().toLowerCase() }); },
  async portalConsent(token, name) { return this.rpc('patient_consent', { p_token: token, p_name: name || '' }); },
  async portalSignConsent(token, id, name, img) { return this.rpc('patient_sign_consent', { p_token: token, p_id: id, p_name: name || '', p_sign: img || '' }); },
  async portalReading(token, p) { return this.rpc('patient_add_reading', { p_token: token, p }); },
  async portalMessage(token, p) { return this.rpc('patient_message', { p_token: token, p }); },
  async clinicAlertPatient(orgId, pid, level, text) { return this.rpc('clinic_alert_patient', { p_org: orgId, p_patient: pid, p_level: level, p_text: text }); },
  async clinicCancelAlert(orgId, id) { return this.rpc('clinic_cancel_patient_alert', { p_org: orgId, p_id: id }); },
  async portalAck(token, id) { return this.rpc('patient_ack_alert', { p_token: token, p_id: id }); },
  async leadKey(orgId, reset) { return this.rpc('lead_key', { p_org: orgId, p_reset: !!reset }); },
  async leadIntake(key, p) { return this.rpc('lead_intake', { p_key: key, p }); },
  async portalSavePush(token, sub) { return this.rpc('patient_save_push', { p_token: token, p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth }); },
  async portalBook(token, p) { return this.rpc('patient_book', { p_token: token, p }); },
  async portalPaid(token, apptId, utr) { return this.rpc('patient_paid', { p_token: token, p_appt: apptId, p_utr: utr || '' }); },
  async guestReview(token, review) { const { error } = await this.sb.rpc('guest_review', { p_token: String(token).trim().toLowerCase(), p_review: review }); if (error) throw this.err(error); },
  async mfaState() { try { const { data, error } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel(); return error ? null : data; } catch (e) { return null; } },
  async mfaFactors() { const { data, error } = await this.sb.auth.mfa.listFactors(); if (error) throw this.err(error); return data; },
  async mfaIsOn() { const f = await this.mfaFactors(); return (f.totp || []).length > 0; },
  async mfaEnroll() {
    const f = await this.mfaFactors();
    for (const x of (f.all || []).filter(x => x.factor_type === 'totp' && x.status !== 'verified')) await this.sb.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await this.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SabManage ' + new Date().toISOString().slice(0, 16), issuer: S.platform?.appName || 'SabManage' });
    if (error) throw this.err(error);
    let svg = String(data.totp.qr_code || ''); svg = svg.replace(/^data:image\/svg\+xml;[^,]*,/, '');
    try { if (/^%3C/i.test(svg)) svg = decodeURIComponent(svg); } catch (e) { }
    return { id: data.id, qr: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), secret: data.totp.secret };
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
  async changeOwnPassword(password) { const { error } = await this.sb.auth.updateUser({ password }); if (error) throw this.err(error); },
  /* website: blog + enquiries */
  async blogList() { const { data, error } = await this.sb.from('blog_posts').select('id,slug,title,excerpt,cover_url,status,published_at,updated_at,created_at,tags,lang,author').order('updated_at', { ascending: false }).limit(500); if (error) throw this.err(error); return data; },
  async blogGet(id) { const { data, error } = await this.sb.from('blog_posts').select('*').eq('id', id).maybeSingle(); if (error) throw this.err(error); return data; },
  async blogSave(p) {
    const row = { slug: p.slug, title: p.title, excerpt: p.excerpt || '', content: p.content || '', cover_url: p.cover_url || '', tags: p.tags || [], lang: p.lang || 'en', status: p.status || 'draft', seo_title: p.seo_title || '', seo_description: p.seo_description || '', author: p.author || '', published_at: p.published_at || null };
    const q = p.id ? this.sb.from('blog_posts').update(row).eq('id', p.id) : this.sb.from('blog_posts').insert(row);
    const { data, error } = await q.select('*').single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Another post already uses this web address (slug).' : /slug/i.test(error.message) ? 'The web address (slug) can use only small letters, numbers and dashes.' : error.message);
    return data;
  },
  async blogDelete(id) { const { error } = await this.sb.from('blog_posts').delete().eq('id', id); if (error) throw this.err(error); },
  async uploadImage(blob, ext = 'jpg') {
    const path = `posts/${new Date().toISOString().slice(0, 7)}/${uid('img_')}.${ext}`;
    const { error } = await this.sb.storage.from('blog').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (error) throw this.err(error);
    return this.sb.storage.from('blog').getPublicUrl(path).data.publicUrl;
  },
  async leadsList() { const { data, error } = await this.sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500); if (error) throw this.err(error); return data; },
  async leadUpdate(id, patch) { const { error } = await this.sb.from('contact_messages').update(patch).eq('id', id); if (error) throw this.err(error); },
  async leadDelete(id) { const { error } = await this.sb.from('contact_messages').delete().eq('id', id); if (error) throw this.err(error); },
  async submitEnquiry(v) { return this.rpc('submit_enquiry', { p: v }); },
  async requestDeletion(reason) { return this.rpc('request_account_deletion', { p_reason: reason || '' }); },
  async myDeletion() { const { data } = await this.sb.from('account_deletions').select('id,created_at,status').eq('status', 'pending').limit(1).maybeSingle(); return data || null; },
  async deletionsList() { const { data, error } = await this.sb.from('account_deletions').select('*').order('created_at', { ascending: false }).limit(300); if (error) throw this.err(error); return data; },
  async deletionUpdate(id, patch) { const { error } = await this.sb.from('account_deletions').update(patch).eq('id', id); if (error) throw this.err(error); },
  async adminDeleteAccount(userId, reqId) {
    try { return await this.rpc('admin_delete_account', { p_user: userId, p_request: reqId || null }); }
    catch (e) { if (/could not find the function|does not exist/i.test(e.message)) throw new Error('Account erase is not switched on in the database yet. Run supabase/account_deletion.sql once in Supabase.'); throw e; }
  }
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

const kindModules = () => MODULES.filter(m => (m.kinds || ['event']).includes(orgKind()));
const orgKind = () => (S.org?.kind === 'clinic' ? 'clinic' : 'event');
const isClinic = () => !!S.org && orgKind() === 'clinic';
const TRANSPORT_HIDE = ['bookings', 'leads', 'tasks', 'reviews', 'marketing', 'reports'];
function moduleOn(key) {
  const m = MOD[key]; const st = settings();
  if (!(m?.kinds || ['event']).includes(orgKind())) return false;
  if (st.modules && st.modules[key] === false) return false;
  if (st.modules && st.modules[key] === true) return true;
  if (TRANSPORT_HIDE.includes(key) && typeof transportOnly === 'function' && transportOnly()) return false;
  if (!m?.biz) return true;
  return m.biz.some(b => (st.bizTypes || []).includes(b));
}
function lvl(mod) { if (S.super) return 3; let v = S.role === 'owner' ? 3 : Number(S.perms?.[mod] || 0); if (S.org && ['expired', 'suspended'].includes(orgState(S.org))) v = 0; return v; }
function can(mod, l = 1) { return !!S.org && moduleOn(mod) && lvl(mod) >= l; }
function need(mod, l = 2) { if (lvl(mod) < l) throw new Error(S.org && orgState(S.org) === 'expired' ? 'Your plan has ended. Renew to use the app again.' : 'Your role does not have permission for this. Ask the owner to update access.'); }

/* document numbers that must not repeat inside one business (the database refuses a repeat too: records_uniq_* indexes).
   Demo records do not count; a cancelled trip frees its bilty number. */
const UNIQ_NOS = { invoices: [['no', 'Invoice no.']], fbills: [['no', 'Bill no.']], trips: [['lr', 'Bilty / LR no.'], ['invNo', 'Invoice no.']] };
const noKey = x => String(x || '').trim().toUpperCase();
const noFree = (coll, f, r) => !(coll === 'trips' && f === 'lr' && r.status === 'cancelled');
function dupNo(coll, rec, prev) {
  if (rec.demo) return null;
  for (const [f, label] of UNIQ_NOS[coll] || []) {
    const k = noKey(rec[f]); if (!k || !noFree(coll, f, rec) || (prev && noKey(prev[f]) === k && noFree(coll, f, prev))) continue;
    if (col(coll).some(x => x.id !== rec.id && !x.demo && noKey(x[f]) === k && noFree(coll, f, x))) return [f, label];
  }
  return null;
}
function dupError(coll, f, rec) { const label = ((UNIQ_NOS[coll] || []).find(x => x[0] === f) || [])[1] || 'Number'; const e = new Error(`${T(label)} ${rec[f]}: ${T('this number is already used. Write a different number.')}`); e.code = 'dup'; e.field = f; return e; }
async function save(coll, rec, msg) {
  need(COLL_MODULE[coll] || 'settings', 2);
  const arr = col(coll); const i = arr.findIndex(x => x.id === rec.id); const prev = i >= 0 ? arr[i] : null;
  const d = dupNo(coll, rec, prev !== rec ? prev : null); if (d) throw dupError(coll, d[0], rec);
  rec.updatedAt = Date.now(); rec.updatedBy = S.me?.name || S.user?.name; rec.updatedById = S.user?.id;
  if (i >= 0) arr[i] = rec; else arr.unshift(rec);
  try { await S.adapter.put(S.org.orgId, coll, rec); }
  catch (e) { /* not saved: put the old copy back so the screen shows what is really stored */
    const j = arr.findIndex(x => x.id === rec.id); if (prev && j >= 0) arr[j] = prev; else if (!prev && j >= 0) arr.splice(j, 1);
    if (e.code === '23505' || /records_uniq/.test(e.message || '')) throw dupError(coll, /records_uniq_lr/.test(e.message) ? 'lr' : /records_uniq_trip_inv/.test(e.message) ? 'invNo' : 'no', rec);
    throw e;
  }
  if (msg) logAct(msg);
  return rec;
}
/* 'INV/2026-27/007' -> 'INV/2026-27/008', 'LR-012' -> 'LR-013' */
const bumpNo = s => { const m = String(s || '').match(/^(.*?)(\d+)(\D*)$/); return m ? m[1] + String(+m[2] + 1).padStart(m[2].length, '0') + m[3] : String(s || '') + '-2'; };
/* saves a record whose number the app made; if another phone took that number a moment ago, the next free number is used */
async function saveNumbered(coll, rec, f, msg) {
  for (let k = 0; ; k++) {
    try { return await save(coll, rec, typeof msg === 'function' ? msg(rec) : msg); }
    catch (e) { if (e.code !== 'dup' || e.field !== f || k >= 30) throw e; rec = { ...rec, [f]: bumpNo(rec[f]) }; }
  }
}
async function saveMany(coll, recs, msg) {
  need(COLL_MODULE[coll] || 'settings', 2);
  const who = S.me?.name || S.user?.name; const now = Date.now();
  recs.forEach(r => { r.updatedAt = now; r.updatedBy = who; });
  await S.adapter.putMany(S.org.orgId, coll, recs);
  const arr = col(coll); recs.forEach(r => { const i = arr.findIndex(x => x.id === r.id); if (i >= 0) arr[i] = r; else arr.unshift(r); });
  if (msg) logAct(msg);
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
  return `${back ? `<button class="back" onclick="${back}">${ic('back')} Back</button>` : ''}<div class="phead"><div class="t">${ibox(i, c, 'lg')}<div style="min-width:0"><h1>${esc(title)}${typeof info === 'function' ? info(isClinic() && typeof HELP !== 'undefined' && HELP['c-' + S.view] ? 'c-' + S.view : S.view) : ''}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div><div class="row-flex">${actions}</div></div>`;
}
function kpi(label, value, sub = '', tone = '', icon = '', c = '') { return `<div class="kpi ${tone}"><div class="kt">${icon ? ibox(icon, c, 'sm') : ''}<div class="eyebrow">${esc(label)}</div></div><div class="v">${value}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; }
const waBtn = (text, phone, label = 'WhatsApp', cls = 'btn wa sm') => `<a class="${cls}" href="${esc(waLink(text, phone))}" target="_blank" rel="noopener">${ic('wa')} ${esc(label)}</a>`;
function seg(key, opts, cur, fn) { return `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" class="${v === cur ? 'on' : ''}" onclick="${fn}('${key}','${v}')">${esc(l)}</button>`).join('')}</div>`; }

function modal(html, { wide = false } = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="scrim" onclick="if(event.target===this)A.closeModal()"><div class="sheet fade ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root.hidden = false; afterRender(); hModalOpen();
  setTimeout(() => { const f = root.querySelector('[autofocus]') || root.querySelector('input:not([type=checkbox]),select,textarea'); if (f && window.innerWidth > 700) f.focus(); }, 60);
}
const closeModalRaw = () => { const r = $('#modalRoot'); r.hidden = true; r.innerHTML = ''; FORM_CB = null; };
A.closeModal = () => { const open = !$('#modalRoot').hidden; closeModalRaw(); if (open) hModalClosed(); };
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
    if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; else if (!(el.name in v)) v[el.name] = ''; continue; }
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

A.toggleLang = () => { const to = I18N.lang === 'hi' ? 'en' : 'hi'; I18N.set(to); A.closeModal(); render(); if (typeof pushIsOn === 'function' && pushIsOn()) ensurePush(false); toast(to === 'hi' ? 'भाषा: हिंदी' : 'Language: English'); };

/* ================= Boot & session ================= */
async function boot() {
  applyTheme(); I18N.start();
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js'); } catch (e) { }
  const forceLocal = LS.get('ep3_mode', 'auto') === 'local';
  S.adapter = cloudReady() && !forceLocal ? CloudDB : LocalDB;
  try { await S.adapter.init(); }
  catch (e) { if (S.adapter === CloudDB) { $('#app').innerHTML = `<div class="auth"><section class="auth-side"><div class="auth-card"><div class="card pad stack">${ibox('alert', '#E0344B', 'lg')}<h2>Cannot connect</h2><p class="muted">Check your internet connection and try again.</p><button class="btn primary" onclick="location.reload()">Try again</button></div></div></section></div>`; return; } }
  try { S.platform = await S.adapter.getPlatform(); } catch (e) { S.platform = { ...DEFAULT_PLATFORM }; }
  try { const ref = new URLSearchParams(location.search).get('ref'); if (ref && /^[a-z0-9]{6,12}$/i.test(ref)) localStorage.setItem('ep_ref', ref.toLowerCase()); } catch (e) { }
  const h = location.hash.replace('#', '');
  if (h.startsWith('alert-') || h.startsWith('lead-')) { if (h.startsWith('lead-')) S.pendingLead = h.slice(5); try { history.replaceState(null, '', location.pathname); } catch (e) { } }
  if (h.startsWith('p-')) { try { await A.openPortal(h.slice(2)); return; } catch (e) { S.portal = null; S.portalError = e.message; $('#app').innerHTML = portalErrorScreen(e.message); return; } }
  if (h.startsWith('guest-')) { try { await A.openGuest(h.slice(6)); return; } catch (e) { try { history.replaceState(null, '', location.pathname); } catch (x) { } S.authTab = 'guest'; render(); setTimeout(() => toast(e.message, 'bad'), 50); return; } }
  if (h === 'signup-clinic') { S.preKind = 'clinic'; }
  if (/^join-[A-Z0-9-]{6,12}$/i.test(h)) { S.authTab = 'join'; S.joinCode = h.slice(5).toUpperCase(); try { history.replaceState(null, '', location.pathname); } catch (e) { } }
  if (h === 'signup' || h === 'login' || h === 'signup-clinic') { S.authTab = h.startsWith('signup') && S.platform?.allowSignup !== false ? 'signup' : 'login'; try { history.replaceState(null, '', location.pathname); } catch (e) { } }
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
  if (!S.orgs.length) { S.org = null; if (S.super) { S.view = 'admin'; S.params = {}; } render(); if (typeof maybeAskPush === 'function') maybeAskPush(); return; }
  const last = LS.get('ep3_lastOrg', null);
  await openOrg((S.orgs.find(o => o.orgId === last) || S.orgs[0]).orgId);
}
async function openOrg(orgId, override) {
  const o = override || S.orgs.find(x => x.orgId === orgId); if (!o) return;
  if (['suspended', 'expired', 'verify'].includes(orgState(o)) && !S.super) { S.org = o; S.data = {}; S.roles = JSON.parse(JSON.stringify(ROLE_DEFAULTS)); S.members = []; S.me = { name: S.user.name, role: o.role }; S.role = o.role; S.perms = {}; LS.set('ep3_lastOrg', orgId); render(); return; }
  const { data, roles, members } = await S.adapter.loadOrg(orgId);
  S.org = o; S.data = data; S.roles = Object.keys(roles).length ? roles : JSON.parse(JSON.stringify(ROLE_DEFAULTS)); S.members = members;
  const meM = members.find(m => m.userId === S.user.id);
  S.me = meM || { name: S.user.name + (S.super ? ' (Super Admin)' : ''), role: 'owner' };
  S.role = meM ? meM.role : (S.super ? 'owner' : o.role);
  S.perms = S.role === 'owner' ? allPerms(3) : { ...(S.roles[S.role]?.perms || {}), ...(S.me.perms || {}) };
  ['tasks', 'checklists'].forEach(c => { if (S.data[c]) S.data[c] = S.data[c].filter(x => !x.archived); });
  MODULES.forEach(m => { if (m.cl) m.label = (o.kind || 'event') === 'clinic' ? m.cl : m.el; });
  if (typeof applyDeptScope === 'function') applyDeptScope();
  S.patLoaded = {};
  S.invites = []; S.invitesLoaded = false; S.draft = null; S.dirty = false;
  if (!o.viewAs) LS.set('ep3_lastOrg', orgId);
  S.view = MODULES.find(m => can(m.key))?.key || 'dashboard'; S.params = {};
  if (S.pendingLead) { S.view = 'lead'; S.params = { id: S.pendingLead }; S.pendingLead = null; }
  initCatering();
  render();
  if (typeof startAlerts === 'function') startAlerts();
  maybeAskTerms();
}
/* Terms: the owner accepts at signup; when TERMS_VERSION changes, owners are asked once to accept the new version */
const TERMS_VERSION = '2026-10-17.2';
function maybeAskTerms() {
  const meOwner = S.members.some(m => m.userId === S.user?.id && m.role === 'owner');
  if (!S.org || !meOwner || settings().termsVersion === TERMS_VERSION) return;
  setTimeout(() => {
    if (document.getElementById('alertRoot')) return;
    modal(`<form class="form terms-sheet" onsubmit="A.acceptTerms(event)">${sheetHead('Updated terms of use', 'Please read and accept to continue')}<div class="sheet-b stack">
      <p>We have updated our Terms of use and Privacy policy so they match everything the app does now, including the new clinic features: patient records, the patient link, photos and voice notes, and online consultations.</p>
      <ul class="terms-points"><li>Your business data stays yours. We do not sell it.</li><li>You are responsible for client, crew and patient details you add, for their consent, and for messages you send.</li><li>${isClinic() ? 'Medical decisions are yours. The app only stores and shows records; it does not diagnose.' : 'Bills, GST and wage figures are a help; please check them.'}</li><li>Notifications can be late; do not depend on them in an emergency.</li><li>When a plan ends, the app stops until you renew. Data is kept safe for 90 days.</li></ul>
      <div class="row-flex"><a class="btn sm" href="/terms" target="_blank" rel="noopener">${ic('receipt')} Terms of use</a><a class="btn sm" href="/privacy" target="_blank" rel="noopener">${ic('shield')} Privacy policy</a></div>
      <label class="check terms"><input type="checkbox" name="ok" value="1"> <span>I have read and agree to the Terms of use and Privacy policy for my business.</span></label>
    </div><footer class="sheet-f"><span class="grow"></span><button class="btn primary" type="submit">${ic('check')} I agree</button></footer></form>`);
  }, 600);
}
A.acceptTerms = async e => {
  e.preventDefault(); if (!e.target.querySelector('[name=ok]')?.checked) { toast('Please tick the box to agree', 'bad'); return; }
  try { await save('settings', { ...settings(), id: 'main', termsAcceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION }); logAct('Accepted updated terms of use'); A.closeModal(); toast('Thank you'); S.pushAsked = false; if (typeof maybeAskPush === 'function') maybeAskPush(); }
  catch (err) { toast(err.message, 'bad'); }
};
A.switchOrg = async id => { A.closeModal(); await openOrg(id); };
A.logout = async () => {
  A.closeModal(); if (typeof stopPush === 'function') { await stopPush(); LS.set('ep_push_on', false); }
  try { if (typeof alertChan !== 'undefined' && alertChan && S.adapter.sb) S.adapter.sb.removeChannel(alertChan); } catch (e) { }
  try { if (typeof liveChan !== 'undefined' && liveChan && S.adapter.sb) S.adapter.sb.removeChannel(liveChan); } catch (e) { }
  document.getElementById('alertRoot')?.remove(); S.teamAlerts = [];
  await S.adapter.signOut();
  Object.assign(S, { user: null, org: null, me: null, role: null, data: {}, orgs: [], view: 'dashboard', params: {}, super: false, admin: null, authTab: 'login', mfaPending: null, mfaOn: false });
  if (LS.get('ep3_mode', 'auto') === 'local' && cloudReady()) { LS.set('ep3_mode', 'auto'); S.adapter = CloudDB; try { await CloudDB.init(); } catch (e) { S.adapter = LocalDB; } }
  render();
};

/* ================= Router & shell ================= */
A.go = (view, params = {}) => {
  if (view === 'admin' && !S.super) { toast('Super Admin access only', 'bad'); return; }
  if (MOD[view] && !can(view)) { toast('You do not have access to ' + MOD[view].label, 'bad'); return; }
  const same = S.view === view && JSON.stringify(S.params || {}) === JSON.stringify(params || {});
  S.view = view; S.params = params; A.closeModal(); render(); window.scrollTo({ top: 0 });
  if (!same) hNav();
};
/* ---- Phone back button: walks back through screens and closes open sheets, instead of closing the app.
   Every screen change is a history entry; an open sheet adds one more. At the home screen the first back
   shows 'Press back again to exit', the second one leaves the app. ---- */
const H = { init: false, modal: false, ignore: 0, backT: null, pendingPush: false, armed: 0 };
const hState = o => ({ sm: 1, v: S.view, p: S.params || {}, ...o });
const hReady = () => H.init && !S.portal && !S.guest && !!S.user;
function hInit() { if (H.init) return; H.init = true; try { history.replaceState({ sm: 1, v: S.view, p: S.params || {}, root: 1 }, ''); history.pushState(hState(), ''); } catch (e) { } }
function hNav() { if (!hReady()) return; try { if (H.backT) { clearTimeout(H.backT); H.backT = null; history.replaceState(hState(), ''); } else history.pushState(hState(), ''); } catch (e) { } }
function hModalOpen() { if (!hReady()) return; if (H.backT) { clearTimeout(H.backT); H.backT = null; H.modal = true; return; } if (H.modal) return; if (H.ignore) { H.pendingPush = true; return; } try { history.pushState(hState({ m: 1 }), ''); H.modal = true; } catch (e) { } }
function hModalClosed() { if (!H.modal) return; H.modal = false; H.backT = setTimeout(() => { H.backT = null; H.ignore++; try { history.back(); } catch (e) { H.ignore--; } }, 0); }
window.addEventListener('popstate', e => {
  if (H.ignore) { H.ignore--; if (H.pendingPush) { H.pendingPush = false; if (!$('#modalRoot').hidden) { try { history.pushState(hState({ m: 1 }), ''); H.modal = true; } catch (x) { } } } return; }
  if (!hReady()) return;
  if (!$('#modalRoot').hidden) { H.modal = false; closeModalRaw(); if (e.state?.sm && !e.state.m) return; }
  const st = e.state;
  if (!st || !st.sm || st.root) {
    const home = S.org ? 'dashboard' : S.super ? 'admin' : S.view;
    if (S.view !== home) { S.view = home; S.params = {}; render(); window.scrollTo({ top: 0 }); try { history.pushState(hState(), ''); } catch (x) { } return; }
    if (Date.now() - H.armed < 2500) { H.armed = 0; try { history.back(); } catch (x) { } return; }
    H.armed = Date.now(); toast(T('Press back again to exit')); try { history.pushState(hState(), ''); } catch (x) { } return;
  }
  if (st.m) { try { history.back(); } catch (x) { } return; }
  S.view = st.v; S.params = st.p || {}; render(); window.scrollTo({ top: 0 });
});
A.setP = (k, v) => { S.params[k] = v; render(); };
A.setF = (k, v) => { S.filters[k] = v; render(); };

function render() {
  const root = $('#app');
  if (S.portal) { root.innerHTML = V.portal(); afterRender(); return; }
  if (S.guest) { root.innerHTML = V.guest(); return; }
  if (S.mfaPending) { root.innerHTML = V.mfa(); return; }
  if (!S.user) { root.innerHTML = V.auth(); return; }
  if (!S.org) { if (S.super) { S.view = 'admin'; } else { root.innerHTML = V.noOrg(); return; } }
  else if (orgState(S.org) === 'verify' && !S.super) { root.innerHTML = V.verify(); return; }
  else if (['suspended', 'expired'].includes(orgState(S.org)) && !S.super) { root.innerHTML = V.blocked(); return; }
  const view = V[S.view] ? S.view : 'dashboard';
  let body;
  try { body = V[view](); } catch (e) { console.error(e); body = `<div class="banner bad">${ic('alert')} Something went wrong on this screen: ${esc(e.message)}</div>`; }
  root.innerHTML = shell(body);
  afterRender(); if (!H.init) hInit();
}
/* things that must run after the screen is drawn (e.g. load signed URLs of private photos / voice notes) */
const AFTER_RENDER = [];
function afterRender() { AFTER_RENDER.forEach(f => { try { f(); } catch (e) { } }); }
/* big numbers (₹2,00,900) shrink to fit their small boxes on phones instead of spilling out */
function fitNums() {
  document.querySelectorAll('.today-strip b, .kpi .v').forEach(el => {
    el.style.fontSize = ''; let fs = parseFloat(getComputedStyle(el).fontSize) || 24; let n = 0;
    while (el.scrollWidth > el.clientWidth && fs > 12 && n++ < 30) { fs -= 1; el.style.fontSize = fs + 'px'; }
  });
}
AFTER_RENDER.push(fitNums, () => setTimeout(fitNums, 400));
window.addEventListener('resize', () => { clearTimeout(window._fitT); window._fitT = setTimeout(fitNums, 150); });
if (document.fonts?.ready) document.fonts.ready.then(fitNums);
function navItems() { return MODULES.filter(m => !m.hidden && can(m.key)); }
function currentModule() { const map = { event: 'bookings', invoice: 'invoices', trip: 'fleet', vehicle: 'fleet', fbill: 'fleet' }; return map[S.view] || S.view; }
function bizLogo(st, cls = 'logo') { return st.logo ? `<div class="${cls} has-img"><img src="${esc(st.logo)}" alt=""></div>` : `<div class="${cls}">${ic('tent')}</div>`; }
function planBanner() {
  if (!S.org) return '';
  const P = S.platform || DEFAULT_PLATFORM; const st = orgState(S.org);
  const sup = P.supportPhone ? waBtn(`Namaste, I want to renew ${P.appName} for ${settings().bizName || S.org.name}.`, P.supportPhone, 'Contact support') : '';
  if (S.org.viewAs) return `<div class="banner" style="margin-bottom:16px;align-items:center">${ic('shield')}<span class="grow">Super Admin view of <b>${esc(S.org.name)}</b>. Anything you change is saved to this business.</span><button class="btn sm" onclick="A.exitOrg()">Back to console</button></div>`;
  if (st === 'grace') return `<div class="banner bad" style="margin-bottom:16px;align-items:center">${ic('alert')}<span class="grow"><b>Your plan ended on ${fmtDate(S.org.expires)}.</b> The app will stop working after ${fmtDate(addDays(S.org.expires, graceDays()))}. Renew now to keep using it.</span>${sup}</div>`;
  if (S.org.expires) { const d = daysBetween(todayLocal(), S.org.expires); if (d <= 5) return `<div class="banner warn" style="margin-bottom:16px;align-items:center">${ic('clock')}<span class="grow"><b>${S.org.plan === 'Trial' ? 'Free trial' : 'Your ' + esc(S.org.plan) + ' plan'} ends ${d === 0 ? 'today' : `in ${d} day${d > 1 ? 's' : ''}`}</b> (${fmtDate(S.org.expires)}). Renew to keep adding bookings and bills.</span>${sup}</div>`; }
  return '';
}
function shell(body) {
  const st = settings(); const items = navItems(); const cur = currentModule();
  const groups = [...new Set(items.map(m => m.group))];
  const alerts = computeAlerts(); const bellN = alerts.length + (typeof pendingForMe === 'function' ? pendingForMe().length : 0);
  const pri = (isClinic() ? ['dashboard', 'appointments', 'patients'] : ['dashboard', ...(typeof isTransport === 'function' && isTransport() ? ['fleet', ...(transportOnly() ? ['payments'] : [])] : []), 'bookings', 'tasks', 'invoices', 'inventory', 'catering', 'payments']).filter(k => can(k));
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
    <div class="brand">${S.org ? bizLogo(st) : `<div class="logo" style="background:#0F172A">${ic('shield')}</div>`}<div style="min-width:0"><b title="${esc(bizName)}">${esc(bizName)}</b><span>${S.org ? 'on ' + esc(S.platform?.appName || 'SabManage') : esc(S.platform?.appName || 'SabManage') + ' platform'}</span></div></div>
    <nav class="nav" aria-label="Main">${adminBtn}${groups.map(g => `<div class="nav-group">${g}</div>` + items.filter(m => m.group === g).map(m => `<button style="--c:${m.c}" class="${cur === m.key ? 'on' : ''}" onclick="A.go('${m.key}')">${ibox(m.icon, m.c, 'sm')}${esc(m.label)}</button>`).join('')).join('')}</nav>
    <div class="side-foot"><div class="avatar">${esc(initials(name))}</div><div style="min-width:0;flex:1"><b style="display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b><span class="tiny muted">${esc(roleLabel)}</span></div><button class="icon-btn" title="Account" onclick="A.accountMenu()">${ic('gear')}</button></div>
  </aside>
  <div class="main">
    <header class="topbar">
      <button class="avatar mobile-only" style="border:0;cursor:pointer" onclick="A.accountMenu()" aria-label="Account">${esc(initials(name))}</button>
      <div class="org grow">${isHome ? `<b class="mobile-only">Namaste, ${esc(first)}</b><b class="desk-only">${esc(bizName)}</b>` : `<b>${esc(bizName)}</b>`}<span class="tiny muted sub1">${isHome ? `<span class="mob-inline">${esc(bizName)} · </span>` : ''}${S.org ? esc(roleLabel || '') : 'All businesses'}${S.super ? ' · Super Admin' : ''}${S.adapter.mode === 'local' ? ' · Offline' : ' · Synced'}</span></div>
      ${creates.length ? `<button class="btn primary sm desk-only" onclick="A.createSheet()">${ic('plus')} Create</button>` : ''}
      ${langSwitch()}
      <button class="icon-btn" aria-label="Alerts" onclick="A.alertsSheet()">${ic('bell')}${bellN ? `<span class="dot">${bellN}</span>` : ''}</button>
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
  if (isClinic()) return [
    can('appointments', 2) && ['Book appointment', 'calendar', MOD.appointments.c, 'A.apptForm()'],
    can('patients', 2) && ['New patient', 'user', MOD.patients.c, 'A.patientForm()'],
    can('patients', 2) && ['Add reading', 'pulse', '#0EA5E9', "A.pickPatient('reading')"],
    can('medical', 2) && ['Visit / report', 'file', MOD.medical.c, "A.pickPatient('visit')"],
    can('tasks', 2) && ['Alert to team', 'bell', '#E11D74', 'A.alertForm()'],
    lvl('team') >= 2 && ['Add employee', 'users', MOD.team.c, 'A.memberForm()']
  ].filter(Boolean);
  return [
    can('bookings', 2) && ['New booking', 'calendar', MOD.bookings.c, 'A.newBooking()'],
    can('invoices', 2) && ['Quotation / bill', 'receipt', MOD.invoices.c, 'A.newInvoice()'],
    can('payments', 2) && ['Payment received', 'rupee', MOD.payments.c, 'A.paymentForm()'],
    can('expenses', 2) && ['Expense', 'wallet', MOD.expenses.c, 'A.expenseForm()'],
    can('tasks', 2) && ['Setup task', 'pulse', MOD.tasks.c, 'A.taskForm()'],
    can('tasks', 2) && ['Alert to team', 'bell', '#E11D74', 'A.alertForm()'],
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
      ${typeof inAndroidApp === 'function' && !inAndroidApp() ? `<a class="tile" href="https://sabmanage.com/download" target="_blank" rel="noopener">${ibox('download', '#16A34A')}<span>Android app</span></a>` : ''}
      <button class="tile" onclick="A.notifSheet()">${ibox('bell', typeof notifState === 'function' && notifState() === 'on' ? '#0B9B68' : '#E11D74')}<span>Notifications ${typeof notifState === 'function' && notifState() === 'on' ? 'on' : 'off'}</span></button>
      <button class="tile" onclick="A.toggleLang()">${ibox('globe', '#DB2777')}<span translate="no">${I18N.lang === 'hi' ? 'English' : 'हिंदी'}</span></button>
      <button class="tile" onclick="A.newPasswordModal()">${ibox('key', '#0D9488')}<span>Change password</span></button>
      ${S.adapter.mode === 'cloud' ? `<button class="tile" onclick="A.mfaSheet()">${ibox('shield', S.mfaOn ? '#0B9B68' : '#E0344B')}<span>Authenticator ${S.mfaOn ? 'on' : 'off'}</span></button>` : ''}
      ${S.org && typeof demoCanUse === 'function' && (S.super || S.role === 'owner') ? `<button class="tile" onclick="A.demoSheet()">${ibox('sparkle', '#9333EA')}<span>Demo data${demoCount() ? ' · on' : ''}</span></button>` : ''}
      ${can('settings') ? `<button class="tile" onclick="A.go('settings')">${ibox('gear', '#64748B')}<span>Settings</span></button>` : ''}
    </div>
    <button class="btn danger block" onclick="A.logout()">${ic('logout')} Log out</button>
    <button class="linkbtn" style="align-self:center;color:var(--muted);font-weight:600" onclick="A.deleteAccountSheet()">${ic('trash')} Delete my account</button>
    <p class="tiny" style="text-align:center"><a href="/terms" target="_blank" rel="noopener">Terms of use</a> · <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></p>
    <p class="tiny muted" style="text-align:center">SabManage v${APP_VERSION} · ${S.adapter.mode === 'local' ? 'Offline mode: data is saved on this device only.' : 'Cloud sync is on.'}</p></div>`);
};
const ALERT_STYLE = { Overdue: ['rupee', '#E0344B'], Shortage: ['box', '#E0344B'], Confirm: ['calendar', '#D97706'], Dispatch: ['truck', '#1F5EFF'], Return: ['truck', '#D97706'], 'Follow up': ['megaphone', '#E11D74'] };
function alertCard(a) { const [i, c] = ALERT_STYLE[a.tag] || ['alert', '#E0344B']; return `<div class="alert" style="--c:${c}" onclick="${a.go}">${ibox(i, c, 'sm')}<div class="grow" style="min-width:0"><b>${esc(a.title)}</b><div class="sub">${esc(a.sub || '')}</div></div>${ic('chev', 'go')}</div>`; }
A.alertsSheet = () => {
  const al = computeAlerts(); const team = (S.teamAlerts || []).slice(0, 15); const pend = typeof pendingForMe === 'function' ? pendingForMe().length : 0;
  modal(`${sheetHead('Alerts & reminders', al.length + pend ? (al.length + pend) + ' things need attention' : 'All clear')}<div class="sheet-b stack-sm">
    ${typeof pushCard === 'function' ? pushCard() : ''}
    ${S.org ? `<div class="row-flex" style="justify-content:space-between;margin-top:4px"><h3 style="font-size:16px">Team alerts${info('team-alerts')}</h3><div class="row-flex" style="gap:6px"><button class="btn sm ghost" onclick="A.testTune()">${ic('bell')} Test tune</button>${typeof canSendAlert === 'function' && canSendAlert() ? `<button class="btn sm primary" onclick="A.alertForm()">${ic('send')} Send alert</button>` : ''}</div></div>
    <div class="card"><div class="rows">${team.map(teamAlertRow).join('') || `<div class="row"><span class="small muted">No team alerts yet. Owners and supervisors can send an alert that rings on the phone of the person.</span></div>`}</div></div>
    <h3 style="font-size:16px;margin-top:8px">Reminders</h3>` : ''}
    ${al.length ? al.map(alertCard).join('') : empty('Nothing pending', 'Overdue payments, stock shortages and dispatches will show here.', '', 'check', '#0B9B68')}</div>`);
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
  const paid = sum(pays, p => p.amount) + (inv.tripIds?.length && typeof tripPaidFor === 'function' ? tripPaidFor(inv) : 0);
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
/* Crew pay for one attendance mark. Full day = the person's duty hours (default 8).
   Hours worked beyond the duty start a new shift; leftover hours are paid as overtime. */
const dutyHrs = s => +s?.dutyHours > 0 ? +s.dutyHours : 8;
const otRateOf = s => +s?.otRate > 0 ? +s.otRate : Math.round((+s?.rate || 0) / dutyHrs(s));
function attPay(a, s) {
  const r = { shifts: 0, otHours: 0, wage: 0, ot: 0 }; if (!a || !s) return r;
  if (a.status === 'A') return r;
  if (a.status === 'H') { r.shifts = .5; r.wage = .5 * (+s.rate || 0); return r; }
  const h = +a.hours || 0, d = dutyHrs(s);
  if (h > d) { r.shifts = Math.floor(h / d); r.otHours = Math.round((h - r.shifts * d) * 10) / 10; } else r.shifts = 1;
  r.wage = r.shifts * (+s.rate || 0); r.ot = Math.round(r.otHours * otRateOf(s)); return r;
}
function wageCost(filter) { const staff = Object.fromEntries(col('staff').map(s => [s.id, s])); return sum(col('attendance').filter(filter), a => { const p = attPay(a, staff[a.staffId]); return p.wage + p.ot; }); }
/* money given to crew (collection 'advances'): advance = cut from pay; food/travel = company cost; bonus = added to pay */
const STAFF_MONEY = [['advance', 'Advance (cut from pay)'], ['food', 'Food / khuraki at the event'], ['travel', 'Travel / other spend'], ['bonus', 'Bonus / inaam (added to pay)']];
const smKind = x => x.kind || 'advance';
function crewSpend(filter) { return sum(col('advances').filter(x => smKind(x) !== 'advance' && filter(x)), x => x.amount); }
function eventMoney(e) {
  const invs = eventInvoices(e.id).filter(i => i.type === 'invoice');
  const billed = sum(invs, i => invCalc(i).total);
  const received = sum(col('payments').filter(p => p.eventId === e.id), p => p.amount);
  const revenue = billed || (+e.budget || 0);
  const po = sum(col('pos').filter(p => p.eventId === e.id), p => p.amount);
  const exp = sum(col('expenses').filter(x => x.eventId === e.id), x => x.amount);
  const wages = wageCost(a => a.eventId === e.id);
  const crew = crewSpend(x => x.eventId === e.id);
  const cost = po + exp + wages + crew;
  return { billed, received, revenue, po, exp, wages, crew, cost, profit: revenue - cost, margin: revenue ? (revenue - cost) / revenue * 100 : 0, due: (billed || +e.budget || 0) - received };
}
function eventProgress(e) { const t = col('tasks').filter(x => x.eventId === e.id); return t.length ? sum(t, x => x.progress) / t.length : null; }
/* enquiry / quotation that nobody has followed up for 2+ days */
function followDue(e) {
  if (!['Enquiry', 'Quoted'].includes(e.stage)) return false;
  const t = todayLocal(); if (e.date && eventEnd(e) < t) return false;
  const last = e.followUpAt || (e.created ? todayLocal(new Date(e.created)) : null); if (!last) return true;
  return daysBetween(last, t) >= 2;
}
const EXTRA_ALERTS = []; /* other files add their own reminders (leads, venue) */
function computeAlerts() {
  if (!S.org) return [];
  if (isClinic()) return typeof clinicAlerts === 'function' ? clinicAlerts() : [];
  const out = []; const t = todayLocal();
  if (can('invoices')) col('invoices').filter(i => i.type === 'invoice').forEach(i => { const c = invCalc(i); if (c.balance > 0 && i.dueDate && i.dueDate < t) out.push({ tag: 'Overdue', tone: 'bad', title: `${i.client || 'Client'} owes ${inr(c.balance)}`, sub: `${i.no} · due ${fmtDate(i.dueDate)} (${daysBetween(i.dueDate, t)} days late)`, go: `A.go('invoice',{id:'${i.id}'})` }); });
  if (can('inventory')) shortages().forEach(s => out.push({ tag: 'Shortage', tone: 'bad', title: `${s.short} × ${s.item.name} short`, sub: `${s.ev.title} on ${fmtDate(s.ev.date)}. Rent from a partner or move a booking.`, go: `A.go('event',{id:'${s.ev.id}',tab:'items'})` }));
  if (can('bookings')) col('events').forEach(e => {
    const d = daysBetween(t, e.date);
    if (['Enquiry', 'Quoted'].includes(e.stage) && d >= 0 && d <= 5) out.push({ tag: 'Confirm', tone: 'warn', title: `${e.title} not confirmed yet`, sub: `${fmtDate(e.date)} · ${d} day(s) left. Call ${e.client}.`, go: `A.go('event',{id:'${e.id}'})` });
    if (RESERVING.includes(e.stage) && (e.items || []).length && !e.dispatch?.out && d >= 0 && d <= 1) out.push({ tag: 'Dispatch', tone: 'accent', title: `Load truck for ${e.title}`, sub: `${(e.items || []).length} item types · ${fmtDate(e.date)}`, go: `A.go('event',{id:'${e.id}',tab:'items'})` });
    if (followDue(e) && !(d >= 0 && d <= 5)) out.push({ tag: 'Follow up', tone: 'info', title: `Follow up with ${e.client}`, sub: `${e.stage} · ${e.title}${e.date ? ' · ' + fmtDate(e.date) : ''}`, go: can('marketing') ? `A.go('marketing',{tab:'followup'})` : `A.go('event',{id:'${e.id}'})` });
    if (e.dispatch?.out && !e.dispatch?.returned && eventEnd(e) < t) out.push({ tag: 'Return', tone: 'warn', title: `Material not back from ${e.title}`, sub: `Event ended ${fmtDate(eventEnd(e))}. Mark the return and log damage.`, go: `A.go('event',{id:'${e.id}',tab:'items'})` });
  });
  EXTRA_ALERTS.forEach(f => { try { out.push(...f()); } catch (e) { } });
  return out;
}

/* ================= Catering state ================= */
function initCatering() {
  const st = settings();
  S.cat = S.cat && S.cat.orgId === S.org.orgId ? S.cat : { orgId: S.org.orgId, pax: 500, buffer: 10, markup: +st.markup || 30, selected: col('dishes').filter(d => d.default).map(d => d.id), eventId: '' };
}
