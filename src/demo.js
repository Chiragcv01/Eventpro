/* ================= Demo data (to show the app to someone) =================
   The Super Admin decides who may use it: platform settings `demo` = { all: bool, orgs: [orgId] }.
   An allowed business gets "Demo data" (account menu, and a card on an empty home) to load or remove sample
   records for its kind: event (tent / caterer / planner / venue) or clinic. Every demo record has `demo: true`
   and an id starting 'dm_'; removing deletes only those, the business's own records are never touched. */
const DEMO_COLLS = ['events', 'inventory', 'staff', 'attendance', 'tasks', 'invoices', 'payments', 'expenses', 'vendors', 'reviews', 'leads', 'spaces', 'rooms', 'stays', 'depts', 'checklists', 'patients', 'readings', 'visits', 'appts', 'pmsgs', 'vehicles', 'drivers', 'trips', 'fleetx', 'fbills', 'advances'];
const demoSet = () => S.platform?.demo || {};
const demoOrgOn = id => !!demoSet().all || (demoSet().orgs || []).includes(id);
const demoAllowed = () => !!S.org && (S.super || demoOrgOn(S.org.orgId));
const demoCanUse = () => demoAllowed() && (S.super || S.role === 'owner' || lvl('settings') >= 3);
const demoCount = () => DEMO_COLLS.reduce((n, c) => n + col(c).filter(x => x.demo).length, 0);
const dmId = p => 'dm_' + p + '_' + Math.random().toString(36).slice(2, 8);
const dD = n => addDays(todayLocal(), n);
const dAt = (n, t) => dD(n) + 'T' + t;

function demoEvent() {
  const out = {}; const add = (c, r) => { (out[c] = out[c] || []).push({ ...r, demo: true }); return r; };
  const st = settings(); const city = st.city || 'Jaipur'; const venue = (st.bizTypes || []).includes('venue');
  const S1 = add('staff', { id: dmId('st'), name: 'Ramesh Kumar', phone: '9829000101', role: 'Supervisor', rate: 1000, dutyHours: 8 });
  const S2 = add('staff', { id: dmId('st'), name: 'Suresh Meena', phone: '9829000102', role: 'Rigger', rate: 800, dutyHours: 8 });
  const S3 = add('staff', { id: dmId('st'), name: 'Mahesh Saini', phone: '9829000103', role: 'Waiter', rate: 600, dutyHours: 8 });
  const S4 = add('staff', { id: dmId('st'), name: 'Kailash Sharma', phone: '9829000104', role: 'Halwai', rate: 1200, dutyHours: 10 });
  const S5 = add('staff', { id: dmId('st'), name: 'Raju Prajapat', phone: '9829000105', role: 'Helper', rate: 600, dutyHours: 8 });
  const inv = moduleOn('inventory') ? [['Waterproof German hanger 40×60', 'Tents & Shamiana', 4, 8000, 400], ['Shamiana 20×20', 'Tents & Shamiana', 20, 900, 60], ['Chiavari chair (gold)', 'Furniture', 600, 25, 4], ['Round table 6 ft', 'Furniture', 80, 150, 18],
    ['Maharaja sofa', 'Furniture', 12, 1500, 45], ['LED par light', 'Lighting & Sound', 60, 150, 3], ['Sound system 2000 W', 'Lighting & Sound', 3, 6000, 60], ['Silent generator 125 KVA', 'Power & DG', 2, 9000, 1500],
    ['Red carpet roll', 'Decor & Flooring', 120, 200, 15], ['Buffet chafing dish', 'Catering Utensils', 80, 120, 5]].map(([name, category, total, rate, weightKg], i) => add('inventory', { id: dmId('i'), name, category, total, rate, weightKg, damaged: i === 2 ? 6 : 0, bay: 'Rack ' + String.fromCharCode(65 + (i % 4)) + '-' + (i + 1), unit: 'day' })) : [];
  const items = (...p) => p.filter(([i]) => inv[i]).map(([i, q]) => ({ invId: inv[i].id, qty: q }));
  let SP = []; if (venue) SP = [['Royal Lawn', 'Lawn', 1200, 1500, 150000], ['Crystal Hall', 'Banquet hall', 400, 600, 80000], ['Board Room', 'Conference room', 30, 40, 15000]].map(([name, type, seating, floating, rate]) => add('spaces', { id: dmId('sp'), name, type, seating, floating, rate, notes: '' }));
  const ev = (o) => add('events', { id: dmId('e'), created: Date.now(), items: [], schedule: [], dispatch: {}, menu: { dishIds: [], pax: o.pax }, notes: '', email: '', endDate: '', time: '', ...o });
  const E1 = ev({ title: 'Sharma Wedding', client: 'Vinod Sharma', phone: '9414000201', type: 'Wedding', stage: 'Live', date: dD(0), time: '19:00', pax: 500, dispatch: { out: dD(0), vehicle: 'RJ14 GB 5421', driver: 'Bablu · 9829000110' }, budget: 450000, venue: venue ? 'Royal Lawn' : `Royal Garden, ${city}`, items: items([0, 2], [2, 400], [3, 50], [4, 6], [5, 40], [6, 2], [7, 1], [8, 80]), ...(venue ? { spaceIds: [SP[0].id], roomsNeeded: 6, functions: [{ id: dmId('fn'), date: dD(0), time: '11:00', end: '15:00', name: 'Haldi & lunch', spaceId: SP[1].id, pax: 300, setup: 'Buffet', meal: 'Lunch', menu: 'Rajasthani thali + chaat counter', waiters: '', lights: '', decor: 'Yellow marigold' }, { id: dmId('fn'), date: dD(0), time: '19:30', end: '23:30', name: 'Wedding & dinner', spaceId: SP[0].id, pax: 500, setup: 'Round tables', meal: 'Dinner', menu: '3 live counters, North Indian buffet', waiters: '', lights: 'DJ, warm lights', decor: 'Pink & gold' }] } : {}) });
  const E2 = ev({ title: 'Gupta Reception', client: 'Anil Gupta', phone: '9414000202', type: 'Reception', stage: 'Confirmed', date: dD(3), time: '20:00', pax: 300, budget: 280000, venue: venue ? 'Crystal Hall' : `Hotel Clarks, ${city}`, items: items([2, 300], [3, 30], [5, 20], [6, 1]), ...(venue ? { spaceIds: [SP[1].id] } : {}) });
  const E3 = ev({ title: 'TechSoft Annual Meet', client: 'TechSoft Pvt Ltd', phone: '9414000203', type: 'Corporate Event', stage: 'Quoted', date: dD(10), time: '10:00', pax: 200, budget: 180000, venue: venue ? 'Board Room' : `Convention Centre, ${city}`, ...(venue ? { spaceIds: [SP[2].id] } : {}) });
  ev({ title: 'Mehta Ring Ceremony', client: 'Rakesh Mehta', phone: '9414000204', type: 'Ring Ceremony', stage: 'Enquiry', date: dD(20), pax: 150, budget: 90000, venue: '' });
  const E5 = ev({ title: 'Jain Birthday', client: 'Sunil Jain', phone: '9414000205', type: 'Birthday / Anniversary', stage: 'Completed', date: dD(-6), time: '19:00', pax: 120, budget: 75000, venue: venue ? 'Crystal Hall' : `Jain Bhawan, ${city}`, dispatch: { out: dD(-6), returned: dD(-5) }, ...(venue ? { spaceIds: [SP[1].id] } : {}) });
  ev({ title: 'Agarwal Wedding', client: 'Mukesh Agarwal', phone: '9414000206', type: 'Wedding', stage: 'Confirmed', date: dD(35), endDate: dD(36), pax: 800, budget: 1200000, venue: venue ? 'Royal Lawn' : `Rambagh Lawn, ${city}`, ...(venue ? { spaceIds: [SP[0].id] } : {}) });
  [['Stage & mandap decor', S2, 100], ['Lights & generator ready', S2, 75], ['Chairs and tables set', S3, 50], ['Welcome gate flowers', S1, 25]].forEach(([title, s, progress]) => add('tasks', { id: dmId('t'), eventId: E1.id, title, assignee: s.id, progress, note: '' }));
  if (venue) [['Welcome drinks ready for arrivals', 'welcome', 50], ['Rooms ready for 6 guest families (clean, towels, toiletries)', 'rooms', 100], ['Wedding & dinner: Dinner for 500 pax at 19:30', 'food', 25], ['Sound & mic check before guests arrive', 'lights', 0]].forEach(([title, area, progress]) => add('tasks', { id: dmId('t'), eventId: E1.id, title, area, progress, assignee: '' }));
  [S1, S2, S3, S4].forEach(s => add('attendance', { id: dD(0) + '_' + s.id, staffId: s.id, date: dD(0), status: 'P', eventId: E1.id }));
  const line = (desc, qty, rate, days = 1) => ({ id: uid('l'), desc, qty, rate, days, hsn: settings().sac || '998596' });
  const mk = (o) => add('invoices', { id: dmId('v'), eventId: '', phone: '', email: '', address: '', clientGstin: '', gstMode: 'excl', gstRate: 18, interstate: false, discount: 0, notes: 'Demo', ...o });
  const V1 = mk({ no: 'DEMO/INV/001', type: 'invoice', eventId: E5.id, client: E5.client, phone: E5.phone, date: dD(-6), dueDate: dD(-1), lines: [line('Decor & lighting package', 1, 35000), line('Catering buffet', 120, 300)] });
  const V2 = mk({ no: 'DEMO/INV/002', type: 'invoice', eventId: E2.id, client: E2.client, phone: E2.phone, date: dD(-2), dueDate: dD(3), lines: [line('Reception setup & decor', 1, 120000), line('Catering buffet', 300, 450)] });
  mk({ no: 'DEMO/QT/001', type: 'quotation', eventId: E3.id, client: E3.client, phone: E3.phone, date: dD(-1), dueDate: dD(6), lines: [line('Conference setup (theatre)', 1, 60000), line('Lunch & hi-tea', 200, 550)] });
  add('payments', { id: dmId('p'), invoiceId: V1.id, eventId: E5.id, amount: Math.round(invCalc(V1).total), date: dD(-5), mode: 'UPI', ref: 'Full payment', by: 'Demo' });
  add('payments', { id: dmId('p'), invoiceId: V2.id, eventId: E2.id, amount: 100000, date: dD(-2), mode: 'Bank Transfer', ref: 'Advance', by: 'Demo' });
  [['Diesel / Fuel', 4500, E1], ['Transport', 6000, E2], ['Extra Labour', 3000, E5]].forEach(([category, amount, e]) => add('expenses', { id: dmId('x'), category, amount, date: e.date < dD(0) ? e.date : dD(0), eventId: e.id, note: 'Demo' }));
  add('vendors', { id: dmId('vd'), name: 'Gulab Florists', category: 'Floral & Decor', phone: '9829000301', gstin: '' });
  add('vendors', { id: dmId('vd'), name: 'DJ Rocky Sound', category: 'DJ / Sound / Dhol', phone: '9829000302', gstin: '' });
  add('reviews', { id: dmId('rv'), eventId: E5.id, client: E5.client, stars: 5, comment: 'Very good arrangement, food was excellent. Thank you team!', date: dD(-4) });
  /* leads */
  const now = Date.now(); const L = (o, mins) => add('leads', { id: dmId('ld'), created: now - mins * 60000, createdAt: (() => { const d = new Date(now - mins * 60000); return todayLocal(d) + 'T' + d.toTimeString().slice(0, 5); })(), email: '', city, budget: '', campaign: '', ...o });
  const lg = (mins, type, extra = {}) => { const d = new Date(now - mins * 60000); return { at: todayLocal(d) + 'T' + d.toTimeString().slice(0, 5), type, by: type === 'lead' ? 'Lead link' : 'Demo', ...extra }; };
  L({ name: 'Priya Saxena', phone: '9876500001', eventType: 'Wedding', eventDate: dD(55), guests: 400, source: 'Meta / Facebook', campaign: 'Winter weddings', status: 'New', via: 'link', message: 'Need lawn + catering for 400 guests', log: [lg(18, 'lead', { text: 'Need lawn + catering for 400 guests' })] }, 18);
  L({ name: 'Rohit Verma', phone: '9876500002', eventType: 'Reception', eventDate: dD(70), guests: 250, source: 'Instagram', status: 'New', via: 'link', log: [lg(95, 'lead')] }, 95);
  L({ name: 'Anjali Mathur', phone: '9876500003', eventType: 'Birthday / Anniversary', eventDate: dD(25), guests: 80, source: 'Google Form', status: 'Contacted', lastOutcome: 'call_later', lastNote: 'Busy in office, call after 5 pm', nextAt: dAt(0, '17:00'), firstContactAt: lg(1400, 'call').at, reached: { Contacted: lg(1400, 'call').at }, log: [lg(1500, 'lead'), lg(1400, 'call', { outcome: 'call_later', text: 'Busy in office, call after 5 pm', status: 'Contacted' })] }, 1500);
  L({ name: 'Deepak Choudhary', phone: '9876500004', eventType: 'Wedding', eventDate: dD(90), guests: 600, source: 'Walk-in', status: 'Site visit', lastOutcome: 'visit_planned', lastNote: 'Coming with family on Sunday 11 am', nextAt: dAt(2, '11:00'), firstContactAt: lg(2900, 'visit').at, reached: { Contacted: lg(2900, 'visit').at, 'Site visit': lg(2900, 'visit').at }, log: [lg(3000, 'lead'), lg(2900, 'visit', { outcome: 'visit_planned', text: 'Coming with family on Sunday 11 am', status: 'Site visit' })] }, 3000);
  L({ name: 'Kavita Joshi', phone: '9876500005', eventType: 'Ring Ceremony', eventDate: dD(40), guests: 150, source: 'Phone call', status: 'Quoted', quote: 120000, lastOutcome: 'wants_quote', lastNote: 'Wants veg menu with live jalebi counter', nextAt: dAt(-1, '12:00'), firstContactAt: lg(4300, 'call').at, reached: { Contacted: lg(4300, 'call').at, Quoted: lg(4300, 'call').at }, log: [lg(4400, 'lead'), lg(4300, 'call', { outcome: 'wants_quote', text: 'Wants veg menu with live jalebi counter', status: 'Quoted', amount: 120000 })] }, 4400);
  L({ name: 'Manish Goyal', phone: '9876500006', eventType: 'Corporate Event', eventDate: dD(15), guests: 200, source: 'Referral', status: 'Negotiation', quote: 175000, lastOutcome: 'budget', lastNote: 'Budget is 1.5 lakh, asked for a better rate', nextAt: dAt(1, '11:00'), firstContactAt: lg(5700, 'call').at, reached: { Contacted: lg(5700, 'call').at, Quoted: lg(5000, 'quote').at, Negotiation: lg(2000, 'call').at }, log: [lg(5800, 'lead'), lg(5700, 'call', { outcome: 'wants_quote', status: 'Quoted', amount: 175000 }), lg(2000, 'call', { outcome: 'budget', text: 'Budget is 1.5 lakh, asked for a better rate', status: 'Negotiation' })] }, 5800);
  L({ name: E2.client, phone: E2.phone, eventType: 'Reception', eventDate: E2.date, guests: 300, source: 'Meta / Facebook', status: 'Won', quote: 280000, wonAt: lg(4000, 'status').at, eventId: E2.id, lastOutcome: 'confirmed', firstContactAt: lg(9000, 'call').at, reached: { Contacted: lg(9000, 'call').at, 'Site visit': lg(7000, 'visit').at, Quoted: lg(6000, 'call').at, Won: lg(4000, 'status').at }, log: [lg(9100, 'lead'), lg(9000, 'call', { outcome: 'interested', status: 'Contacted' }), lg(7000, 'visit', { outcome: 'visit_planned', status: 'Site visit' }), lg(6000, 'call', { outcome: 'wants_quote', status: 'Quoted', amount: 280000 }), lg(4000, 'status', { status: 'Won', amount: 280000 })] }, 9100);
  L({ name: 'Sanjay Bansal', phone: '9876500008', eventType: 'Wedding', eventDate: dD(30), guests: 500, source: 'Website', status: 'Lost', lostReason: 'Budget', lostAt: lg(3000, 'status').at, lastOutcome: 'booked_else', firstContactAt: lg(8000, 'call').at, reached: { Contacted: lg(8000, 'call').at, Quoted: lg(7000, 'call').at }, log: [lg(8100, 'lead'), lg(8000, 'call', { outcome: 'wants_quote', status: 'Quoted', amount: 600000 }), lg(3000, 'status', { status: 'Lost', text: 'Budget · Booked a cheaper lawn' })] }, 8100);
  /* rooms and guests */
  if (venue) {
    const k = st_ => 's:' + st_.id;
    [['Housekeeping', 'bed', '#0F766E', [S5, S3], S5, 'Rooms, linen, hall cleaning after every function'], ['Kitchen', 'utensils', '#EA580C', [S4], S4, 'Food for every function'], ['Service / Waiters', 'users', '#2563EB', [S3, S1], S1, 'Welcome drinks, buffet and table service'], ['Decor & lights', 'bulb', '#DB2777', [S2], S2, 'Stage, flowers, lights and sound']]
      .map(([name, icon, color, mem, head, notes]) => add('depts', { id: dmId('dp'), name, icon, color, members: mem.map(k), head: k(head), notes, people: Object.fromEntries(mem.map(x => [k(x), { name: x.name, phone: x.phone, role: x.role }])) }))
      .forEach((d, i) => {
        const items = list => list.map(text => ({ id: dmId('ci'), text }));
        if (i === 0) {
          const it = items(['Change bedsheets and pillow covers', 'Clean the bathroom', 'Fresh towels and toiletries', 'Check AC, TV and lights', 'Dust and mop the floor', 'Refill drinking water']);
          add('checklists', { id: dmId('cl'), deptId: d.id, deptName: d.name, title: 'Room cleaning', kind: 'daily', eventId: '', items: it, assignKey: '', shareWith: [], checks: { [dD(0)]: { [it[0].id]: { by: S3.name, at: '09:10' }, [it[1].id]: { by: S3.name, at: '09:25' }, [it[2].id]: { by: S5.name, at: '09:40' } } }, createdBy: S5.name });
          add('tasks', { id: dmId('t'), deptId: d.id, deptName: d.name, title: 'Rooms 101 to 104 ready for Sharma family', assignee: S3.id, date: dD(0), eventId: E1.id, progress: 50, note: 'Extra mattress in 104', createdBy: S5.name });
          add('tasks', { id: dmId('t'), deptId: d.id, deptName: d.name, title: 'Hall cleaning after Haldi', assignee: S5.id, date: dD(0), eventId: E1.id, progress: 0, createdBy: S5.name });
        }
        if (i === 2) {
          const it = items(['Chairs and tables as per layout', 'Stage and backdrop ready', 'Lights and sound tested', 'AC on one hour before', 'Washrooms clean', 'Entry gate decor ready']);
          add('checklists', { id: dmId('cl'), deptId: d.id, deptName: d.name, title: 'Hall setup before function', kind: 'event', eventId: E1.id, items: it, assignKey: '', shareWith: [], checks: { e: { [it[0].id]: { by: S1.name, at: '16:05' } } }, createdBy: S1.name });
        }
      });
    const R = [['101', 'Deluxe', '1'], ['102', 'Deluxe', '1'], ['103', 'Deluxe', '1'], ['104', 'Deluxe', '1'], ['105', 'Deluxe', '1'], ['106', 'Family', '1'], ['201', 'Suite', '2'], ['202', 'Suite', '2'], ['203', 'Deluxe', '2'], ['204', 'Deluxe', '2']]
      .map(([no, type, floor], i) => add('rooms', { id: dmId('rm'), no, type, floor, beds: type === 'Family' ? 4 : 2, rate: type === 'Suite' ? 6500 : 3500, status: i < 4 ? 'occupied' : i === 4 ? 'cleaning' : i === 9 ? 'blocked' : 'ready', notes: i === 9 ? 'AC repair' : '' }));
    [['Rajesh Sharma (bride’s uncle)', 0, 'in', 3], ['Kamla Devi', 1, 'in', 2], ['Pankaj Sharma', 2, 'in', 2], ['Mama ji family', 3, 'in', 4], ['Neha & Rohan', 6, 'expected', 2], ['Dadi ji', 5, 'expected', 2]].forEach(([guest, ri, status, adults]) =>
      add('stays', { id: dmId('sy'), eventId: E1.id, guest, phone: '', roomId: R[ri].id, from: dD(status === 'in' ? -1 : 0), to: dD(2), status, adults, notes: '', ...(status === 'in' ? { inAt: dAt(-1, '15:00') } : {}) }));
  }
  if ((st.bizTypes || []).includes('transport')) fleetDemo(add);
  return out;
}
function demoTransport() { const out = {}; const add = (c, r) => { (out[c] = out[c] || []).push({ ...r, demo: true }); return r; }; fleetDemo(add, true);
  [['Venue / Rent', 12000, -3, 'Bank transfer'], ['Misc', 1100, -8, 'UPI'], ['Food & Grocery', 700, -1, 'Cash']].forEach(([category, amount, n, mode]) => add('expenses', { id: dmId('x'), category, amount, date: dD(n), mode, note: '' }));
  return out; }

function demoClinic() {
  const out = {}; const add = (c, r) => { (out[c] = out[c] || []).push({ ...r, demo: true }); return r; };
  const P = (o) => add('patients', { id: dmId('pt'), created: Date.now(), allergies: '', notes: '', ...o });
  const P1 = P({ name: 'Ramesh Gupta', phone: '9829011111', age: 58, sex: 'Male', conditions: 'Diabetes, high BP', medAlert: 'yes', medList: ['Diabetes', 'High BP'], meds: 'Metformin 500, Telmisartan 40', habits: ['Tobacco / gutka'], allergyYes: 'yes', address: 'Mansarovar, Jaipur', track: ['bp', 'sugar', 'weight'], allergies: 'Sulpha drugs', unread: 1, lastMsgAt: dAt(0, '08:40'), lastReadingAt: dAt(0, '08:30'), alertLevel: 'emergency', alertText: 'BP upper 186, BP lower 112', alertAt: dAt(0, '08:30') });
  const P2 = P({ name: 'Sunita Sharma', phone: '9829011112', age: 45, sex: 'Female', conditions: 'Thyroid, weight loss', medAlert: 'yes', medList: ['Thyroid'], meds: 'Thyronorm 50', allergyYes: 'no', habits: [], address: 'Vaishali Nagar, Jaipur', track: ['weight', 'pulse'], lastReadingAt: dAt(0, '07:15') });
  const P3 = P({ name: 'Mohd. Salim', phone: '9829011113', age: 62, sex: 'Male', conditions: 'Heart patient', medAlert: 'yes', medList: ['Heart problem', 'On blood thinner'], meds: 'Ecosprin 75', habits: ['Smoking'], habitsOk: { by: 'Doctor', at: dD(-12) }, allergyYes: 'no', track: ['bp', 'pulse', 'spo2'], lastReadingAt: dAt(-1, '19:00') });
  const P4 = P({ name: 'Neha Agarwal', phone: '9829011114', age: 29, sex: 'Female', conditions: 'Pregnancy check-up (6th month)', medAlert: 'yes', medList: ['Pregnant'], allergyYes: 'no', habits: [], track: ['bp', 'weight'] });
  const P5 = P({ name: 'Arjun Singh', phone: '9829011115', age: 8, sex: 'Male', conditions: '', medAlert: 'no', allergyYes: 'no', habits: [], track: ['temp'] });
  const rd = (p, n, t, v) => add('readings', { id: dmId('rd'), patientId: p.id, by: n % 2 ? 'patient' : 'clinic', at: dAt(-n, t), date: dD(-n), ...v });
  [[27, 152, 96, 182], [24, 150, 94, 176], [21, 146, 92, 168], [18, 144, 90, 160], [15, 142, 90, 154], [12, 140, 88, 150], [9, 144, 90, 158], [6, 150, 94, 170], [3, 158, 98, 188], [0, 186, 112, 236]].forEach(([n, sys, dia, sugar], i) => rd(P1, n, '08:30', { sys, dia, sugar, sugarType: 'fasting', weight: 84 - i * 0.3, ...(n === 0 ? { level: 'emergency', flags: ['BP upper 186', 'BP lower 112'] } : {}) }));
  [[28, 78.5, 82], [21, 77.6, 80], [14, 76.9, 78], [7, 76.1, 76], [0, 75.4, 74]].forEach(([n, weight, pulse]) => rd(P2, n, '07:15', { weight, pulse }));
  [[10, 138, 86, 72, 96], [5, 134, 84, 70, 97], [1, 130, 82, 68, 97]].forEach(([n, sys, dia, pulse, spo2]) => rd(P3, n, '19:00', { sys, dia, pulse, spo2 }));
  add('visits', { id: dmId('vs'), patientId: P1.id, date: dD(-20), complaint: 'Giddiness in the morning', diagnosis: 'Type 2 diabetes, hypertension', advice: 'Tab Metformin 500 mg · 1-0-1 · after food · 30 days\nTab Telmisartan 40 mg · 1-0-0 · 30 days\nWalk 30 minutes daily', followUp: dD(10), files: [] });
  add('visits', { id: dmId('vs'), patientId: P3.id, date: dD(-12), complaint: 'Breathless on climbing stairs', diagnosis: 'Stable angina, follow-up', advice: 'Tab Ecosprin 75 mg · 0-1-0 · 30 days\nTab Atorvastatin 20 mg · 0-0-1 · 30 days', followUp: dD(18), files: [] });
  const ap = (p, o) => add('appts', { id: dmId('ap'), created: Date.now(), patientId: p.id, patientName: p.name, phone: p.phone, source: 'clinic', paid: false, reason: '', time: '', ...o });
  ap(P2, { date: dD(0), time: '10:30', mode: 'clinic', status: 'booked', fee: 500, reason: 'Thyroid follow-up' });
  ap(P3, { date: dD(0), time: '11:15', mode: 'video', status: 'booked', fee: 400, room: videoRoom(), reason: 'Heart check-up' });
  ap(P4, { date: dD(0), time: '09:30', mode: 'clinic', status: 'done', fee: 500, paid: true, payMode: 'UPI', paidAt: dD(0), reason: 'Monthly check-up' });
  ap(P5, { date: dD(1), time: '17:00', mode: 'clinic', status: 'requested', source: 'patient', fee: 500, reason: 'Fever for 2 days' });
  ap(P1, { date: dD(-1), time: '12:00', mode: 'clinic', status: 'done', fee: 400, reason: 'BP review' });
  add('pmsgs', { id: dmId('pm'), patientId: P1.id, from: 'patient', at: dAt(0, '08:40'), text: 'Since morning I feel dizzy and have a headache.', files: [], by: P1.name });
  add('pmsgs', { id: dmId('pm'), patientId: P3.id, from: 'patient', at: dAt(-1, '19:05'), text: 'Today’s readings sent. Feeling better.', files: [], by: P3.name });
  add('pmsgs', { id: dmId('pm'), patientId: P3.id, from: 'clinic', at: dAt(-1, '20:10'), text: 'Good. Continue the same medicines. See you on video call tomorrow.', files: [], by: 'Clinic' });
  /* fees from earlier weeks, so Income & expenses has numbers */
  const PP = [P1, P2, P3, P4, P5]; for (let n = -70; n <= -1; n++) { if (new Date(dD(n) + 'T00:00').getDay() === 0) continue; for (let k = 0; k < 6; k++) { const p = PP[(n * 7 + k) % 5 < 0 ? ((n * 7 + k) % 5) + 5 : (n * 7 + k) % 5]; ap(p, { date: dD(n), time: ['10:00', '10:30', '11:15', '12:00', '17:30', '18:15'][k], mode: k === 4 ? 'video' : 'clinic', status: 'done', fee: k === 4 ? 400 : 500, paid: true, payMode: k % 2 ? 'Cash' : 'UPI', paidAt: dD(n), reason: 'Follow-up' }); } }
  /* staff, attendance, salary money and expenses */
  const SF = [['Pooja Verma', 'Receptionist', 12000], ['Sunita Kumari', 'Nurse', 15000], ['Ravi Saini', 'Compounder / Pharmacist', 10000]].map(([name, role, salary], i) => add('staff', { id: dmId('st'), name, role, salary, leaves: 2, payType: 'month', phone: '98290222' + (10 + i), joinDate: dD(-400) }));
  const t0 = new Date(dD(0) + 'T00:00'); for (let d = 1; d <= t0.getDate(); d++) { const day = dD(d - t0.getDate()); if (new Date(day + 'T00:00').getDay() === 0) continue; SF.forEach((s, i) => add('attendance', { id: day + '_' + s.id, staffId: s.id, date: day, status: i === 2 && d === 3 ? 'A' : i === 1 && d === 5 ? 'L' : i === 0 && d === 6 ? 'H' : 'P' })); }
  add('advances', { id: dmId('ad'), staffId: SF[2].id, kind: 'advance', amount: 2000, date: dD(-2), note: 'Family function' });
  [['Rent', 18000, 0, 'Bank transfer'], ['Electricity & water', 3200, -4, 'UPI'], ['Medicines & consumables', 8500, -6, 'Cash'], ['Staff tea & food', 900, -1, 'Cash'], ['Marketing & ads', 1500, -9, 'UPI']].forEach(([category, amount, n, mode]) => add('expenses', { id: dmId('x'), category, amount, date: dD(n), mode, note: 'Demo', eventId: '' }));
  if (typeof specDemo === 'function') specDemo(add, [P1, P2, P3, P4, P5], dD);
  /* case sheet: one visit in the new format, its bill and a payment, and a consent form waiting for signature */
  const pp = id => out.patients.find(x => x.id === id); const dent = typeof isDent === 'function' && isDent();
  if (dent) { const vid = dmId('vs');
    add('visits', { id: vid, v2: true, patientId: P2.id, date: dD(-3), cc: 'Pain in lower right back tooth while eating', complaint: 'Pain in lower right back tooth while eating', since: '1 week', ccTeeth: ['46'], notes: 'Pain at night for 3 days. Explained RCT and cap; patient agreed.', exam: 'Deep caries 46, tender on percussion, calculus present', oral: 'average', diagnosis: 'Irreversible pulpitis 46, chronic gingivitis',
      tx: [{ proc: 'RCT', teeth: ['46'], missing: [], support: [], mat: '', sitting: 'Started', note: '', amount: 4500 }, { proc: 'Scaling & polishing', teeth: [], missing: [], support: [], mat: '', sitting: '', note: '', amount: 800 }],
      rx: [{ name: 'Amoxicillin 500 mg', dose: '1-1-1', when: 'After food', days: 5 }, { name: 'Ibuprofen 400 mg', dose: '1-0-1', when: 'After food', days: 3 }], advice: 'Do not chew on the treated side\nWarm salt-water rinse 3 times a day', followUp: dD(4), consult: 300, charge: 5600, payMode: 'UPI', files: [] });
    Object.assign(pp(P2.id), { oral: 'average', lastVisit: dD(-3), charges: [{ id: 'ch_' + vid, visitId: vid, date: dD(-3), desc: 'RCT · 46 · Started; Scaling & polishing', amount: 5600 }], pays: [{ id: 'py_' + vid, visitId: vid, date: dD(-3), amount: 3000, mode: 'UPI', note: 'visit' }], ccNow: { text: 'Pain in upper left tooth since 2 days', since: '2–3 days', at: dAt(0, '10:05'), by: 'Pooja Verma' } });
    add('visits', { id: dmId('cs'), patientId: P2.id, kind: 'consent', date: dD(0), title: 'Consent for root canal treatment (RCT)', lang: 'en', status: 'pending', via: 'here', createdBy: 'Doctor', text: 'I agree to root canal treatment of tooth 46. The doctor explained that RCT removes the infected nerve, may need 1 to 3 sittings, and that a cap (crown) is usually advised afterwards to protect the tooth. I understand that pain or swelling can occur between sittings, instruments can rarely break inside the canal, and in some cases the tooth may still need extraction later.' });
  } else { const vid = dmId('vs');
    add('visits', { id: vid, v2: true, patientId: P5.id, date: dD(-2), cc: 'Fever and cough for 2 days', complaint: 'Fever and cough for 2 days', since: '2–3 days', notes: 'Fever up to 101 F, eating less.', exam: 'Throat congested, chest clear', diagnosis: 'Viral fever, upper respiratory infection', tx: [], rx: [{ name: 'Paracetamol 250 mg syrup', dose: '1-1-1', when: 'After food', days: 3 }, { name: 'Cetirizine syrup', dose: '0-0-1', when: 'At night', days: 5 }], advice: 'Drink plenty of water\nCome back if fever does not go in 3 days', followUp: dD(1), consult: 400, charge: 400, files: [] });
    Object.assign(pp(P5.id), { lastVisit: dD(-2), charges: [{ id: 'ch_' + vid, visitId: vid, date: dD(-2), desc: 'Consultation', amount: 400 }], pays: [] });
  }
  return out;
}

A.demoLoad = async (quiet) => {
  if (!demoCanUse()) { toast('Demo data is not allowed for this business. Ask SabManage support.', 'bad'); return; }
  if (demoCount()) { toast('Demo data is already loaded', 'warn'); return; }
  try {
    const data = isClinic() ? demoClinic() : transportOnly() ? demoTransport() : demoEvent(); let n = 0; const t = Date.now();
    for (const [c, recs] of Object.entries(data)) {
      const rows = recs.map(r => ({ ...r, demoDay: todayLocal(), updatedAt: t, updatedById: S.user?.id || '', updatedBy: 'Demo' }));
      await S.adapter.putMany(S.org.orgId, c, rows);
      S.data[c] = [...col(c).filter(x => !rows.some(y => y.id === x.id)), ...rows]; n += rows.length;
    }
    if (S.patLoaded) S.patLoaded = {};
    if (isClinic() && typeof updateDues === 'function') for (const p of col('patients').filter(x => x.demo)) { try { await updateDues(p.id); } catch (e) { } }
    if (isClinic() && typeof updateAccount === 'function') for (const p of col('patients').filter(x => x.demo)) { try { await updateAccount(p.id); } catch (e) { } }
    logAct(`Loaded demo data (${n} records)`); A.closeModal(); toast(quiet ? T('Demo dates moved to today') : `${T('Demo data loaded')}: ${n} ${T('records')}`); render();
  } catch (e) { toast(e.message, 'bad'); }
};
A.demoRemove = () => confirmBox('Remove demo data?', 'Only the sample records are removed. Everything your team added stays.', 'Remove demo data', async () => {
  try {
    const n = demoCount(); await S.adapter.delDemo(S.org.orgId, DEMO_COLLS);
    DEMO_COLLS.forEach(c => { if (S.data[c]) S.data[c] = S.data[c].filter(x => !x.demo); }); if (S.patLoaded) S.patLoaded = {};
    logAct(`Removed demo data (${n} records)`); A.closeModal(); toast(T('Demo data removed')); A.go('dashboard');
  } catch (e) { toast(e.message, 'bad'); }
}, 'danger');
/* demo dates are set on the day it is loaded; next day 'Move to today' reloads it so today's event, arrivals etc. show again */
const demoStale = () => { const r = DEMO_COLLS.map(c => col(c).find(x => x.demo)).find(Boolean); return !!r && (r.demoDay || '') !== todayLocal(); };
A.demoRefresh = async () => {
  try { await S.adapter.delDemo(S.org.orgId, DEMO_COLLS); DEMO_COLLS.forEach(c => { if (S.data[c]) S.data[c] = S.data[c].filter(x => !x.demo); }); await A.demoLoad(true); } catch (e) { toast(e.message, 'bad'); }
};
A.demoSheet = () => {
  const n = demoCount(); const clinic = isClinic();
  modal(`${sheetHead('Demo data', S.org?.name || '')}<div class="sheet-b stack">
    ${demoAllowed() ? '' : `<div class="banner warn">${ic('shield')}<span>${T('Demo data is not allowed for this business. Ask SabManage support.')}</span></div>${S.platform?.supportPhone ? waBtn(`Namaste, please allow demo data for ${S.org?.name || 'my business'} on SabManage.`, S.platform.supportPhone, T('Ask support on WhatsApp')) : ''}`}
    ${n ? `<div class="banner good">${ic('check')}<span><b>${T('Demo data is on')}</b> · ${n} ${T('sample records')}. ${T('They are marked as demo and can be removed in one tap.')}</span></div>
      <button class="btn danger block" onclick="A.demoRemove()">${ic('trash')} ${T('Remove demo data')}</button>`
    : `<p class="small">${T(clinic ? 'Adds sample patients with readings and charts, an emergency reading, visits, today’s appointments, a request and messages.' : 'Adds sample bookings, stock, crew with attendance, live setup tasks, bills and payments, expenses, vendors, a review and leads at every stage. Venues also get halls, rooms and guests.')}</p>
      <p class="tiny muted">${T('Your own records are not changed. Remove the demo data any time; only the sample records go.')}</p>
      ${demoCanUse() ? `<button class="btn primary block" style="min-height:50px" onclick="A.demoLoad()">${ic('sparkle')} ${T('Load demo data')}</button>` : ''}`}
  </div>`);
};
function demoBanner() {
  if (!S.org || !demoCanUse()) return '';
  const n = demoCount();
  if (n) return `<div class="banner demo-on" style="margin-bottom:12px">${ic('sparkle')}<span><b>${T('Demo data is on')}</b> · ${T(demoStale() ? 'loaded on an earlier day. Move it to today so today’s work shows.' : 'sample records are shown for a demo.')}</span><div class="demo-acts">${demoStale() ? `<button class="btn sm primary" onclick="A.demoRefresh()">${T('Move to today')}</button>` : ''}<button class="btn sm" onclick="A.demoSheet()">${T('Remove')}</button></div></div>`;
  const empty_ = isClinic() ? !col('patients').length : transportOnly() ? !col('vehicles').length : !col('events').length && !col('leads').length;
  return empty_ || demoOrgOn(S.org.orgId) ? `<div class="card pad row-flex demo-card" style="margin-bottom:14px;flex-wrap:nowrap">${ibox('sparkle', '#9333EA')}<div class="grow" style="min-width:0"><b>${T('Show the app with demo data')}</b><div class="small muted">${T('Load sample records to give a demo. Remove them in one tap later.')}</div></div><button class="btn primary sm" onclick="A.demoLoad()">${T('Load')}</button></div>` : '';
}
const _dashDemo = V.dashboard; V.dashboard = () => demoBanner() + _dashDemo();

/* ---------- Super Admin: who may use demo data ---------- */
A.demoAllowOrg = async (orgId, on) => {
  const P = { ...(S.platform || {}) }; const d = { all: false, orgs: [], ...(P.demo || {}) }; const set = new Set(d.orgs || []);
  on ? set.add(orgId) : set.delete(orgId); P.demo = { ...d, orgs: [...set] };
  try { await S.adapter.savePlatform(P); S.platform = P; toast(on ? T('Demo data allowed for this business') : T('Demo data turned off for this business')); render(); } catch (e) { toast(e.message, 'bad'); }
};
A.demoAllowAll = async on => {
  const P = { ...(S.platform || {}) }; P.demo = { orgs: [], ...(P.demo || {}), all: !!on };
  try { await S.adapter.savePlatform(P); S.platform = P; toast(on ? T('Demo data allowed for every business') : T('Demo data only for the businesses you pick')); render(); } catch (e) { toast(e.message, 'bad'); }
};
A.adminDemo = async id => { await A.adminOpen(id); setTimeout(() => A.demoSheet(), 150); };
function adminDemoCard() {
  const d = demoSet(); const orgs = (S.admin?.orgs || []).filter(o => (d.orgs || []).includes(o.orgId));
  return `<div class="card pad stack-sm" style="margin-top:16px"><h3>${ic('sparkle')} ${T('Demo data')}</h3><p class="small muted">${T('Allowed businesses can load sample records to show the app, and remove them in one tap. Turn it on for a business in its “Plan & access”, or for everyone here.')}</p>
    <label class="check"><input type="checkbox" ${d.all ? 'checked' : ''} onchange="A.demoAllowAll(this.checked)"> <span>${T('Allow demo data for every business')}</span></label>
    ${d.all ? '' : `<div class="small">${orgs.length ? `${T('Allowed for')}: ${orgs.map(o => `<span class="pill">${esc(o.name)} <button class="linkbtn" aria-label="Turn off" onclick="A.demoAllowOrg('${o.orgId}',false)">${ic('x')}</button></span>`).join(' ')}` : `<span class="muted">${T('No business allowed yet.')}</span>`}</div>`}</div>`;
}

I18N.load(`
Demo data | डेमो डेटा
Move to today | आज पर लाएं
Demo dates moved to today | डेमो की तारीख़ें आज पर आ गईं
loaded on an earlier day. Move it to today so today’s work shows. | पहले किसी दिन लोड हुआ था। आज का काम दिखाने के लिए इसे आज पर लाएं।
Demo data is allowed for every business. Tap “Demo data” on a business to load or remove sample records. | हर बिज़नेस के लिए डेमो डेटा चालू है। सैंपल रिकॉर्ड लोड करने या हटाने के लिए किसी बिज़नेस पर “डेमो डेटा” दबाएं।
Ask support on WhatsApp | व्हाट्सऐप पर सपोर्ट से पूछें
Demo data: tap “Allow demo” on a business, then “Demo data” to load or remove sample records. | डेमो डेटा: किसी बिज़नेस पर “डेमो चालू करें” दबाएं, फिर “डेमो डेटा” दबाकर सैंपल रिकॉर्ड लोड करें या हटाएं।
Allow demo | डेमो चालू करें
Demo data · on | डेमो डेटा · चालू
Demo data is not allowed for this business. Ask SabManage support. | इस बिज़नेस के लिए डेमो डेटा की अनुमति नहीं है। SabManage सपोर्ट से पूछें।
Demo data is already loaded | डेमो डेटा पहले से लोड है
Demo data loaded | डेमो डेटा लोड हो गया
records | रिकॉर्ड
Remove demo data? | डेमो डेटा हटाएं?
Only the sample records are removed. Everything your team added stays. | सिर्फ़ सैंपल रिकॉर्ड हटेंगे। आपकी टीम का डाला हुआ सब कुछ रहेगा।
Remove demo data | डेमो डेटा हटाएं
Demo data removed | डेमो डेटा हटा दिया गया
Demo data is on | डेमो डेटा चालू है
sample records | सैंपल रिकॉर्ड
They are marked as demo and can be removed in one tap. | ये डेमो के रूप में चिह्नित हैं और एक टैप में हट सकते हैं।
Adds sample patients with readings and charts, an emergency reading, visits, today’s appointments, a request and messages. | सैंपल मरीज़ जोड़ता है: रीडिंग और चार्ट, एक इमरजेंसी रीडिंग, विज़िट, आज के अपॉइंटमेंट, एक रिक्वेस्ट और मैसेज।
Adds sample bookings, stock, crew with attendance, live setup tasks, bills and payments, expenses, vendors, a review and leads at every stage. Venues also get halls, rooms and guests. | सैंपल बुकिंग, स्टॉक, हाज़िरी के साथ स्टाफ़, लाइव सेटअप काम, बिल और पेमेंट, खर्च, वेंडर, एक रिव्यू और हर स्टेज की लीड जोड़ता है। वेन्यू में हॉल, कमरे और मेहमान भी आते हैं।
Your own records are not changed. Remove the demo data any time; only the sample records go. | आपके अपने रिकॉर्ड नहीं बदलते। डेमो डेटा कभी भी हटाएं; सिर्फ़ सैंपल रिकॉर्ड जाएंगे।
Load demo data | डेमो डेटा लोड करें
sample records are shown for a demo. | डेमो के लिए सैंपल रिकॉर्ड दिख रहे हैं।
Show the app with demo data | डेमो डेटा के साथ ऐप दिखाएं
Load sample records to give a demo. Remove them in one tap later. | डेमो देने के लिए सैंपल रिकॉर्ड लोड करें। बाद में एक टैप में हटा दें।
Load | लोड करें
Demo data allowed for this business | इस बिज़नेस के लिए डेमो डेटा चालू
Demo data turned off for this business | इस बिज़नेस के लिए डेमो डेटा बंद
Demo data allowed for every business | हर बिज़नेस के लिए डेमो डेटा चालू
Demo data only for the businesses you pick | डेमो डेटा सिर्फ़ आपके चुने बिज़नेस के लिए
Allowed businesses can load sample records to show the app, and remove them in one tap. Turn it on for a business in its “Plan & access”, or for everyone here. | अनुमति वाले बिज़नेस ऐप दिखाने के लिए सैंपल रिकॉर्ड लोड कर सकते हैं और एक टैप में हटा सकते हैं। किसी बिज़नेस के लिए उसके “Plan & access” में चालू करें, या यहां सबके लिए।
Allow demo data for every business | हर बिज़नेस के लिए डेमो डेटा की अनुमति दें
Allowed for | अनुमति है
No business allowed yet. | अभी किसी बिज़नेस को अनुमति नहीं है।
Allow demo data for this business (to show the app; load and remove from the app) | इस बिज़नेस के लिए डेमो डेटा की अनुमति दें (ऐप दिखाने के लिए; ऐप से लोड करें और हटाएं)
Demo data is allowed for every business (Platform tab) | हर बिज़नेस के लिए डेमो डेटा की अनुमति है (Platform टैब)
`);
