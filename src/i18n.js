/* ================= Language: English / हिंदी =================
   The screens are written in English. When Hindi is on, every text node,
   placeholder and tooltip is swapped from the dictionary below as it appears
   (a MutationObserver, so toasts and pop-ups are covered too).
   Common words people already say in English (Booking, Invoice, GST, Payment,
   Login…) are kept in English on purpose.
   Bills / challans / receipts (.paper) and anything marked translate="no"
   are never changed. */
const I18N = (() => {
  const KEY = 'ep_lang';
  let lang = 'en';
  try { lang = localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en'; } catch (e) { }
  const exact = new Map(); const pats = []; const memo = new Map();
  const norm = s => s.replace(/\s+/g, ' ').trim();
  function load(text) {
    for (const line of text.split('\n')) {
      const i = line.indexOf(' | '); if (i < 1 || line.startsWith('#')) continue;
      const en = norm(line.slice(0, i)), hi = line.slice(i + 3).trim(); if (!hi) continue;
      if (!en.includes('{}')) { exact.set(en, hi); continue; }
      const src = '^' + en.split('{}').map(p => p.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('(.+?)') + '$';
      pats.push([new RegExp(src), hi, en.split('{}')[0].length]);
    }
  }
  function lookup(k, depth = 0) {
    if (memo.has(k)) return memo.get(k);
    let out = exact.get(k);
    if (out === undefined) {
      out = null;
      for (const [re, hi] of pats) { const m = k.match(re); if (m) { out = hi.replace(/\{(\d)\}/g, (_, n) => { const g = m[+n] ?? ''; return (depth < 2 ? lookup(norm(g), depth + 1) : null) ?? g; }); break; } }
    }
    if (out == null && depth < 3) {
      let m = k.match(/^(.+?)(\s*(?:\*|→|:|…|·))$/);
      if (m) { const t = lookup(m[1], depth + 1); if (t != null) out = t + m[2]; }
      if (out == null && (m = k.match(/^([+·=]\s*)(.+)$/))) { const t = lookup(m[2], depth + 1); if (t != null) out = m[1] + t; }
      if (out == null && k.includes(' · ')) {
        let any = false; const parts = k.split(' · ').map(p => { const t = p ? lookup(p.trim(), depth + 1) : null; if (t != null) { any = true; return t; } return p; });
        if (any) out = parts.join(' · ');
      }
    }
    memo.set(k, out); return out;
  }
  function tr(s) {
    if (lang !== 'hi' || !s) return s;
    const k = norm(s); if (!k || !/[A-Za-z]/.test(k)) return s;
    const out = lookup(k);
    if (out == null) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + out + trail;
  }
  const SKIP = 'script,style,textarea,code,pre,.paper,[translate="no"],[contenteditable="true"],.notr';
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function doEl(el) {
    if (el.closest && el.closest(SKIP)) return;
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  }
  function doText(n) {
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t;
  }
  function walk(root) {
    if (lang !== 'hi' || !root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (root.closest(SKIP)) return; doEl(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  let obs = null;
  function start() {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    if (lang !== 'hi' || obs || !document.body) return;
    obs = new MutationObserver(list => { for (const m of list) { if (m.type === 'characterData') doText(m.target); else if (m.type === 'attributes') doEl(m.target); else m.addedNodes.forEach(walk); } });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
    walk(document.body);
  }
  function set(l) {
    lang = l === 'hi' ? 'hi' : 'en'; memo.clear();
    try { localStorage.setItem(KEY, lang); } catch (e) { }
    if (lang === 'hi') start(); else { if (obs) { obs.disconnect(); obs = null; } document.documentElement.lang = 'en'; }
  }
  /* QA helper: list visible English text that has no Hindi entry */
  function missing(root = document.body) {
    const out = new Set(); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
      const k = norm(n.nodeValue); if (!/[A-Za-z]{2}/.test(k)) continue;
      if (lookup(k) == null) out.add(k);
    }
    root.querySelectorAll && root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => { if (el.closest(SKIP)) return; for (const a of ATTRS) { const v = el.getAttribute(a); if (v && /[A-Za-z]{2}/.test(v) && lookup(norm(v)) == null) out.add('@' + a + ': ' + v); } });
    return [...out];
  }
  return { load, tr, start, set, walk, missing, get lang() { return lang; } };
})();
window.I18N = I18N;
const T = s => I18N.tr(s);
const langSwitch = (cls = 'langsw') => `<button type="button" class="${cls}" translate="no" onclick="A.toggleLang()" aria-label="Change language">${I18N.lang === 'hi' ? '<b>हिं</b><span>EN</span>' : '<span>हिं</span><b>EN</b>'}</button>`;

I18N.load(`
# ---------- navigation & sections ----------
Dashboard | Dashboard
Bookings | Bookings
Booking | Booking
Live Tracker | Live Tracker
Live tracker | Live tracker
Live | Live
Inventory | Inventory
Catering | Catering
Vendors & POs | Vendors और PO
Staff & Wages | Staff और मज़दूरी
Staff & wages | Staff और मज़दूरी
Planner Tools | Planner Tools
Planner tools | Planner tools
Invoices | Invoices
Payments | Payments
Expenses | खर्च
Reports & P&L | Reports और P&L
Reviews | Reviews
Team & Access | Team और Access
Team & access | Team और access
Settings | Settings
Daily | रोज़ का काम
Operations | Operations
Money | पैसा
Business | Business
Platform | Platform
Super Admin | Super Admin
More | और
Create | बनाएं
Create new | नया बनाएं
What do you want to add? | क्या जोड़ना है?
All services | सभी सेवाएं
Account | Account
Switch business | Business बदलें
New business | नया Business
Change password | Password बदलें
Log out | Log out
Alerts | Alerts
Alerts & reminders | Alerts और याद-दिहानी
All clear | सब ठीक है
Nothing pending | कुछ बाकी नहीं
Overdue payments, stock shortages and dispatches will show here. | बकाया payment, stock की कमी और dispatch यहां दिखेंगे।
Overdue bills, stock shortages and dispatches show here. | बकाया bill, stock की कमी और dispatch यहां दिखते हैं।
All businesses | सभी Businesses
· Super Admin | · Super Admin
· Offline | · Offline
· Synced | · Synced
Cloud sync is on. | Cloud sync चालू है।
Offline mode: data is saved on this device only. | Offline mode: data सिर्फ़ इसी device पर save है।
Quick | जल्दी
Back | वापस
Close | बंद करें
Cancel | Cancel
Save | Save करें
Saved | Save हो गया
Edit | Edit
Delete | Delete
Deleted | Delete हो गया
Remove | हटाएं
Add | जोड़ें
Added | जोड़ा गया
Updated | Update हो गया
Open | खोलें
View | देखें
See all | सब देखें
Search | खोजें
Share | Share
Send | भेजें
Copy | Copy
Copied | Copy हो गया
Print | Print
Preview | Preview
Refresh | Refresh
Upload | Upload
Change | बदलें
Clear | साफ़ करें
Exit | बाहर निकलें
Try again | फिर से कोशिश करें
OK | ठीक है
Confirm | पक्का करें
Join | Join करें
Escape | Escape
New | नया
Details | विवरण
Overview | सारांश
None | कोई नहीं
None yet | अभी कोई नहीं
Nothing here | यहां कुछ नहीं
Nothing yet | अभी कुछ नहीं
Empty | खाली
Low | कम
Short | कम
Today | आज
Tomorrow | कल
Upcoming | आने वाले
Running now | अभी चल रहा
Running today | आज चल रहे
This month | इस महीने
Last month | पिछला महीना
Next month | अगला महीना
Previous month | पिछला महीना
This FY | इस वित्त वर्ष
Last 6 months | पिछले 6 महीने
All time | शुरू से अब तक
Next 7 days | अगले 7 दिन
30 days | 30 दिन
90 days | 90 दिन
1 year | 1 साल
Mon | सोम
Tue | मंगल
Wed | बुध
Thu | गुरु
Fri | शुक्र
Sat | शनि
Sun | रवि
Calendar | Calendar
List | List
Date | तारीख
Time | समय
When | कब
Name | नाम
Phone | Phone
Mobile | Mobile
Email | Email
Email: | Email:
Address | पता
City | शहर
State | राज्य
Notes | Notes
Note | Note
Status | Status
Type | प्रकार
Category | Category
Amount | रकम
Amount ₹ | रकम ₹
Total | कुल
Grand total | कुल रकम
Subtotal | Subtotal
Quantity | मात्रा
Qty | मात्रा
Rate | Rate
Days | दिन
Item | Item
Items | Items
Description | विवरण
Label | Label
Message | Message
Mode | तरीका
Reason | कारण
Section | Section
Access | Access
Role | Role
Members | Members
Link | Link
Code: | Code:
Pending | बाकी
Paid | Paid
Unpaid | Unpaid
Partial | आंशिक
Overdue | बकाया
Settled | चुकता
Received | मिला
Issued | जारी
Delivered | पहुंच गया
Returned | वापस आया
Collected | वसूली
Billed | Bill बना
Cost | लागत
Costs | लागत
Revenue | कमाई
Profit | मुनाफ़ा
Margin | Margin
Due | बाकी
Balance | Balance
Balance due | बाकी रकम
Advance | Advance
Discount | Discount
Discount ₹ | Discount ₹
Someone | कोई
Work | काम
Free | खाली
Booked | Booked
Main | मुख्य
Other | अन्य
Misc | अन्य
Something went wrong on this screen: {} | इस screen पर कुछ गड़बड़ हुई: {1}

# ---------- login, sign-up, forgot password ----------
Log in | Log in
Client | Client
Login ID (email or mobile number) | Login ID (email या mobile नंबर)
you@business.in or 98290 12345 | you@business.in या 98290 12345
Password | Password
Forgot password? | Password भूल गए?
Your name | आपका नाम
Business name | Business का नाम
e.g. Shree Ganesh Tent House | जैसे: श्री गणेश टेंट हाउस
What do you do? Pick all that apply | आप क्या काम करते हैं? जो भी लागू हो, सब चुनें
Your login ID: email or mobile number | आपकी Login ID: email या mobile नंबर
You will use this to log in every time | हर बार login करने के लिए यही लगेगी
Password (min 6 characters) | Password (कम से कम 6 अक्षर)
Create my business account | मेरा Business account बनाएं
You become the Owner with full access. Inside the app you create login IDs and passwords for your manager, accountant and staff, and decide what each person can see. | आप पूरे access के साथ Owner बनेंगे। App के अंदर आप अपने manager, accountant और staff की login ID और password बनाएंगे और तय करेंगे कि कौन क्या देख सकता है।
See your own event only: setup progress, programme, bill, balance and how to pay. No login needed. | सिर्फ़ अपना event देखें: setup कितना हुआ, programme, bill, बाकी रकम और payment कैसे करें। Login की ज़रूरत नहीं।
Event code from your organiser | आपके organiser से मिला Event code
e.g. k3m9xq2p7a | जैसे: k3m9xq2p7a
View my event | मेरा Event देखें
Bookings, godown stock, halwai ration, GST bills, payment reminders, crew attendance and profit for every event. | Bookings, godown stock, हलवाई का राशन, GST bill, payment की याद-दिहानी, crew की हाज़िरी और हर event का मुनाफ़ा।
Tent, catering aur event ka | Tent, catering और event का
poora hisaab | पूरा हिसाब
, ek app mein. | , एक app में।
Tent · Catering · Events | Tent · Catering · Events
Tent stock | Tent stock
GST bills | GST bills
Live setup | Live setup
Crew | Crew
Reports | Reports
Need help? | मदद चाहिए?
Secure login. Your data is saved in the cloud and shared only with your team. | सुरक्षित login। आपका data cloud में save है और सिर्फ़ आपकी team को दिखता है।
Offline mode: accounts and data stay on this device only. | Offline mode: accounts और data सिर्फ़ इसी device पर रहते हैं।
Pick at least one business type | कम से कम एक business type चुनें
Enter an email or a 10-digit mobile number | Email या 10 अंकों का mobile नंबर डालें
Enter a 10-digit mobile number or an email | 10 अंकों का mobile नंबर या email डालें
Password must be at least 6 characters | Password कम से कम 6 अक्षर का होना चाहिए
Password needs 6+ characters | Password में 6 या ज़्यादा अक्षर चाहिए
Use at least 6 characters | कम से कम 6 अक्षर रखें
Business created. You are the Owner. | Business बन गया। आप Owner हैं।
Business created | Business बन गया
Welcome back, | फिर से स्वागत है,
Welcome back, {} | फिर से स्वागत है, {1}
Login ID or password is wrong. | Login ID या password गलत है।
This login is blocked. Contact Super Admin. | यह login block है। Super Admin से संपर्क करें।
This email or mobile already has an account. Log in instead. | इस email या mobile का account पहले से है। Login करें।
This login ID is already in use. | यह Login ID पहले से इस्तेमाल में है।
This login ID is already in use. Use another email or mobile number. | यह Login ID पहले से इस्तेमाल में है। दूसरा email या mobile नंबर डालें।
New business sign-ups are closed. Please contact support. | नए business का sign-up अभी बंद है। Support से संपर्क करें।
Staff / employee | Staff / कर्मचारी
Ask your business owner. They can set a new password for you from Team & Access. | अपने business owner से कहें। वे Team और Access से आपका नया password बना सकते हैं।
Business owner | Business owner
Contact {}. For your safety, only the Super Admin can reset an owner's password. | {1} से संपर्क करें। आपकी सुरक्षा के लिए owner का password सिर्फ़ Super Admin ही reset कर सकते हैं।
Lost the phone with your Authenticator app? The same people can switch it off for you, then you can set it up again. | Authenticator app वाला phone खो गया? यही लोग उसे बंद कर देंगे, फिर आप दोबारा set up कर सकते हैं।
Set a new password | नया password बनाएं
New password | नया password
Update password | Password update करें
Password updated | Password update हो गया
Your login works, but you are not part of any business yet. Start your own business, or ask your employer to add you from their Team & Access screen. | आपका login सही है, पर आप अभी किसी business में नहीं हैं। अपना business शुरू करें, या अपने मालिक से कहें कि वे Team और Access से आपको जोड़ें।
Get started | शुरू करें
Create my business | मेरा Business बनाएं
You become the Owner | आप Owner बनेंगे
Create a business | Business बनाएं
You will be the Owner. | आप Owner होंगे।
Business phone | Business phone
Join a team | Team join करें
Invite code | Invite code
Your name as the team sees it | Team को दिखने वाला आपका नाम
You joined | आप जुड़ गए
You joined {} | आप {1} से जुड़ गए
Invite code not found, expired or already used. | Invite code नहीं मिला, expire हो गया या पहले ही इस्तेमाल हो चुका है।
You are already part of this business. | आप पहले से इस business में हैं।
Confirm your email, then log in. You will join the team automatically. | अपना email confirm करें, फिर login करें। आप अपने आप team में जुड़ जाएंगे।
Cannot connect | Connect नहीं हो पा रहा
Check your internet connection and try again. | अपना internet connection देखें और फिर से कोशिश करें।
Tent House | Tent House
Caterer / Halwai | Caterer / हलवाई
Event Manager / Planner | Event Manager / Planner

# ---------- Authenticator ----------
One more | बस एक
step | कदम
Your account is protected with an Authenticator app. Open Google Authenticator (or Microsoft Authenticator) on your phone and type the 6-digit code for {}. | आपका account Authenticator app से सुरक्षित है। अपने phone में Google Authenticator (या Microsoft Authenticator) खोलें और {1} का 6 अंकों का code डालें।
Enter your 6-digit code | अपना 6 अंकों का code डालें
Logging in as | Login हो रहे हैं:
Verify and continue | Verify करके आगे बढ़ें
Lost your phone? Employees: ask your business owner. Owners: contact {}{}. | Phone खो गया? कर्मचारी: अपने business owner से कहें। Owners: {1}{2} से संपर्क करें।
Use a different login | दूसरे login से आएं
Authenticator | Authenticator
Authenticator on | Authenticator चालू
Authenticator off | Authenticator बंद
Authenticator {} | Authenticator {1}
on | चालू
off | बंद
Two-step login | दो-कदम वाला login
On. | चालू है।
Every login asks for the 6-digit code from your Authenticator app. Even if someone learns your password, they cannot open your account. | हर login पर Authenticator app का 6 अंकों का code मांगा जाता है। अगर किसी को आपका password पता चल भी जाए, तो भी वह आपका account नहीं खोल सकता।
Turn off authenticator | Authenticator बंद करें
Protect your login with a 6-digit code | 6 अंकों के code से अपना login सुरक्षित करें
1. Install | 1. Play Store / App Store से
from Play Store / App Store. | install करें।
Google Authenticator | Google Authenticator
Microsoft Authenticator | Microsoft Authenticator
2. Tap Start below and scan the QR code with that app. | 2. नीचे Start दबाएं और उस app से QR code scan करें।
3. Type the 6-digit code it shows. Done. | 3. App में दिख रहा 6 अंकों का code डालें। हो गया।
Start setup | Setup शुरू करें
QR code | QR code
Can't scan? Type this key in the app: | Scan नहीं हो रहा? App में यह key डालें:
Copy key | Key copy करें
6-digit code | 6 अंकों का code
Verify and turn on | Verify करके चालू करें
Authenticator is on. You will need the code at every login. | Authenticator चालू हो गया। अब हर login पर code लगेगा।
Turn off authenticator? | Authenticator बंद करें?
Your login will need only the password again. You can turn it back on any time. | Login में फिर से सिर्फ़ password लगेगा। आप कभी भी इसे दोबारा चालू कर सकते हैं।
Turn off | बंद करें
Turn on | चालू करें
Authenticator turned off | Authenticator बंद हो गया
Reset authenticator? | Authenticator reset करें?
Reset authenticator | Authenticator reset करें
{} will log in with just the password next time, and can set up the authenticator again on their new phone. | {1} अगली बार सिर्फ़ password से login करेंगे, और अपने नए phone पर authenticator दोबारा set up कर सकते हैं।
This person | यह व्यक्ति
Authenticator reset | Authenticator reset हो गया
They did not have an authenticator on | इनका authenticator चालू नहीं था
Authenticator works only in the live app | Authenticator सिर्फ़ live app में चलता है
Authenticator works only in the live (cloud) app. | Authenticator सिर्फ़ live (cloud) app में चलता है।
Wrong or expired code. Type the latest 6-digit code from your app. | Code गलत है या expire हो गया। App में दिख रहा नया 6 अंकों का code डालें।
No authenticator found for this login. | इस login पर कोई authenticator नहीं मिला।
Protect your Super Admin login. | अपना Super Admin login सुरक्षित करें।
Turn on the Authenticator so nobody can open the console with just your password. | Authenticator चालू करें, ताकि सिर्फ़ password से कोई console न खोल सके।

# ---------- client (guest) portal ----------
Your event team | आपकी Event team
Setup progress | Setup कितना हुआ
Programme | Programme
Bill & payment | Bill और payment
Fully paid | पूरा paid
Bill total | Bill की कुल रकम
Quotation shared: | Quotation भेजा गया:
Your bill will appear here once it is issued. | Bill बनते ही यहां दिखेगा।
Pay by UPI: | UPI से pay करें:
Send {} and share the screenshot with {}. | {1} भेजें और screenshot {2} को भेजें।
Thank you for your review! | आपके review के लिए धन्यवाद!
It helps {} serve more families. | इससे {1} को और परिवारों की सेवा करने में मदद मिलती है।
How was your experience? | आपका अनुभव कैसा रहा?
Rating | Rating
Your words | आपकी बात
Food, decor, staff behaviour, timing… | खाना, सजावट, staff का व्यवहार, समय…
Submit review | Review भेजें
Thank you! Review submitted. | धन्यवाद! Review भेज दिया गया।
Powered by EventPro OS | Powered by EventPro OS
★★★★★ Excellent | ★★★★★ बहुत बढ़िया
★★★★ Very good | ★★★★ बहुत अच्छा
★★★ Okay | ★★★ ठीक-ठाक
★★ Poor | ★★ कमज़ोर
★ Bad | ★ खराब
This guest code is invalid or has expired. | यह code गलत है या expire हो गया है।
This guest code is invalid or has expired. Ask your event team for a fresh link. | यह code गलत है या expire हो गया है। अपनी event team से नया link मांगें।
Invalid guest code | गलत code
Event not found. | Event नहीं मिला।
{} guests | {1} मेहमान

# ---------- shell, plan banners ----------
Namaste, {} | नमस्ते, {1}
Namaste, | नमस्ते,
Namaste | नमस्ते
on {} | {1} पर
Contact support | Support से बात करें
Super Admin view of | Super Admin view:
Anything you change is saved to this business. | आप जो भी बदलेंगे, वह इसी business में save होगा।
. Anything you change is saved to this business. | . आप जो भी बदलेंगे, वह इसी business में save होगा।
Back to console | Console पर वापस
Your plan expired on {}. | आपका plan {1} को खत्म हो गया।
You can see all your data, but adding or changing anything is locked until you renew. | आप अपना पूरा data देख सकते हैं, पर renew होने तक कुछ जोड़ना या बदलना बंद है।
Free trial | Free trial
Your {} plan | आपका {1} plan
{} plan | {1} plan
ends | खत्म होगा
{} ends | {1} खत्म होगा
today | आज
in {} days | {1} दिन में
in {} day | {1} दिन में
({}). Renew to keep adding bookings and bills. | ({1})। Bookings और bill जोड़ते रहने के लिए renew करें।
Your plan has expired, so the app is read-only. Renew to make changes. | आपका plan खत्म हो गया है, इसलिए app सिर्फ़ देखने के लिए है। बदलाव के लिए renew करें।
Your role does not have permission for this. Ask the owner to update access. | आपके role को इसकी अनुमति नहीं है। Owner से access बदलवाएं।
Super Admin access only | सिर्फ़ Super Admin के लिए
You do not have access to {} | आपको {1} का access नहीं है
Change language | भाषा बदलें
Language | भाषा

# ---------- alerts ----------
{} owes {} | {1} पर {2} बाकी
{} · due {} ({} days late) | {1} · {2} तक देना था ({3} दिन late)
{} × {} short | {1} × {2} कम है
{} on {}. Rent from a partner or move a booking. | {1}, {2}। किसी partner से किराए पर लें या booking आगे-पीछे करें।
{} not confirmed yet | {1} अभी पक्का नहीं हुआ
{} · {} day(s) left. Call {}. | {1} · {2} दिन बाकी। {3} को call करें।
Load truck for {} | {1} के लिए truck load करें
{} item types · {} | {1} तरह के items · {2}
Material not back from {} | {1} से सामान वापस नहीं आया
Event ended {}. Mark the return and log damage. | Event {1} को खत्म हुआ। वापसी mark करें और नुकसान लिखें।
{} things need attention | {1} चीज़ों पर ध्यान देना है
Needs attention | ध्यान देना है
Tap the bell to see | देखने के लिए घंटी दबाएं

# ---------- dashboard ----------
My tasks | मेरे काम
My open tasks | मेरे बाकी काम
assigned to you and still open | आपको दिए गए और अभी बाकी
events running today | आज चल रहे events
{} · {} in the next 7 days | {1} · अगले 7 दिनों में {2}
{} in the next 7 days | अगले 7 दिनों में {1}
· {} in the next 7 days | · अगले 7 दिनों में {1}
Collected this month | इस महीने की वसूली
Events in 7 days | 7 दिनों में Events
{} events | {1} events
{} guests to serve | {1} मेहमानों को खिलाना है
Pending from clients | Clients से बाकी
Out on rent now | अभी किराए पर बाहर
Upcoming events | आने वाले Events
No upcoming events | कोई आने वाला event नहीं
New bookings will appear here. | नई bookings यहां दिखेंगी।
Pipeline | Pipeline
Enquiry / quoted | Enquiry / quoted
{} confirmed | {1} पक्के
{} this month | इस महीने {1}
Received · {} this month | मिला · इस महीने {1}
Where the money goes | पैसा कहां जा रहा है
Assigned to you | आपको दिया गया
No active setup tasks | कोई चालू setup task नहीं
Activity log | Activity log
No activity yet | अभी कोई activity नहीं
{} task | {1} काम
{} tasks | {1} काम
{} live | {1} live
Crew update progress from their phones | Crew अपने phone से progress update करती है
Open tracker | Tracker खोलें

# ---------- bookings / events ----------
New booking | नई Booking
Add booking | Booking जोड़ें
Edit booking | Booking edit करें
Booking saved | Booking save हो गई
Booking not found | Booking नहीं मिली
Delete booking | Booking delete करें
Delete booking? | Booking delete करें?
Deleted booking | Booking delete की
Back to bookings | Bookings पर वापस
Every enquiry, quotation and confirmed event in one diary. | हर enquiry, quotation और पक्का event एक ही diary में।
Enquiry, quotation or confirmed event | Enquiry, quotation या पक्का event
Search client, venue or phone | Client, venue या phone खोजें
Search client or number | Client या नंबर खोजें
No bookings here | यहां कोई booking नहीं
Try another filter or add a new booking. | कोई और filter चुनें या नई booking जोड़ें।
No bookings on this day. | इस दिन कोई booking नहीं।
No events in this period | इस समय में कोई event नहीं
Event | Event
Event name | Event का नाम
Event type | Event type
Auto: client + event type | अपने आप: client + event type
Client name | Client का नाम
Client email | Client का email
Client GSTIN (for B2B) | Client GSTIN (B2B के लिए)
Venue | Venue
e.g. Rambagh Lawn, Jaipur | जैसे: रामबाग लॉन, जयपुर
Start date | शुरू की तारीख
End date (multi-day) | आखिरी तारीख (कई दिन का event)
End date cannot be before the start date | आखिरी तारीख शुरू की तारीख से पहले नहीं हो सकती
Start time | शुरू का समय
Guests | मेहमान
Guests (pax) | मेहमान (pax)
Package value | Package की रकम
Package value (₹) | Package की रकम (₹)
Stage | Stage
Notes for team | Team के लिए notes
Enquiry | Enquiry
Quoted | Quoted
Confirmed | पक्का
Setup | Setup
Completed | पूरा हुआ
Closed | बंद
Cancelled | Cancel हुआ
Cancel event | Event cancel करें
Wedding | शादी
Reception | Reception
Sangeet & Mehendi | संगीत और मेहंदी
Ring Ceremony | सगाई
Corporate Event | Corporate Event
Birthday / Anniversary | जन्मदिन / सालगिरह
Religious / Jagran | धार्मिक / जागरण
Exhibition | प्रदर्शनी
Saved. Note: {} other booking(s) on these dates. | Save हो गया। ध्यान दें: इन तारीखों पर {1} और booking हैं।
{} and its schedule will be removed. Invoices and payments stay in Money. | {1} और उसका schedule हट जाएगा। Invoices और payments पैसा section में रहेंगे।
Items & dispatch | Items और dispatch
Booked items | Booked items
Reserved items | Reserved items
Add from godown | Godown से जोड़ें
Add tents, chairs, lights and DG sets for this event. | इस event के लिए tent, कुर्सियां, lights और DG set जोड़ें।
No items reserved | कोई item reserve नहीं
Reserve item | Item reserve करें
Free on date | उस तारीख को खाली
Rate/day | Rate/दिन
Free quantity shown for {} | {1} के लिए खाली मात्रा दिखाई गई है
Free stock is checked against every other confirmed booking on {}. | {1} की हर दूसरी पक्की booking से मिलाकर खाली stock देखा जाता है।
Stock is held only when the booking is Confirmed, Setup or Live. Right now it is {}. | Stock तभी रोका जाता है जब booking Confirmed, Setup या Live हो। अभी यह {1} है।
Stock short: {} | Stock कम: {1}
Short {} | {1} कम
{} (free {}) | {1} (खाली {2})
{} needed · {} free today | {1} चाहिए · आज {2} खाली
Bill these items | इन items का bill बनाएं
Dispatch | Dispatch
Dispatch & return | Dispatch और वापसी
Dispatch to site | Site पर भेजें
Mark dispatched | Dispatch mark करें
Mark returned | वापसी mark करें
Material return | सामान की वापसी
Count everything back into the godown | सब कुछ गिनकर godown में वापस रखें
Confirm return | वापसी पक्की करें
Qty sent | भेजी मात्रा
Qty returned | वापस आई मात्रा
No damage | कोई नुकसान नहीं
Add damage charges to the client invoice | नुकसान का charge client के invoice में जोड़ें
Return saved | वापसी save हो गई
Return saved. Damage charges added to {} | वापसी save हो गई। नुकसान का charge {1} में जोड़ा गया
Damaged / missing: {} (sent {}) | टूटा / गुम: {1} ({2} भेजे थे)
Vehicle | गाड़ी
Vehicle number | गाड़ी नंबर
Vehicle: | गाड़ी:
Driver & mobile | Driver और mobile
Driver: | Driver:
RJ14 GB 5421 | RJ14 GB 5421
On site since | Site पर कब से
Delivery challan | Delivery challan
Send to driver | Driver को भेजें
Received by (client) | प्राप्तकर्ता (client)
Print / Save PDF | Print / PDF save करें
Print and PDF work on your deployed site. | Print और PDF आपकी live site पर चलते हैं।
Run-sheet | Run-sheet
No run-sheet yet | अभी कोई run-sheet नहीं
Add run-sheet entry | Run-sheet entry जोड़ें
Add sound check, baarat, dinner and phera timings. | Sound check, बारात, खाना और फेरों का समय जोड़ें।
Minute-by-minute plan for crew, halwai and coordinators | Crew, हलवाई और coordinators के लिए मिनट-दर-मिनट plan
Day label | दिन का नाम
Day 1 | Day 1
Day 1 · Sangeet | Day 1 · संगीत
What happens | क्या होगा
Person in charge | ज़िम्मेदार व्यक्ति
Edit entry | Entry edit करें
Updated run-sheet for {} | {1} की run-sheet update की
Setup tasks | Setup के काम
Add setup tasks inside a booking. | Booking के अंदर setup के काम जोड़ें।
Break the setup into tasks and assign crew. | Setup को कामों में बांटें और crew को दें।
Open a booking and add tasks like rigging, sound check, kitchen prep. | कोई booking खोलें और rigging, sound check, रसोई की तैयारी जैसे काम जोड़ें।
No tasks | कोई काम नहीं
No tasks yet | अभी कोई काम नहीं
Client link | Client link
Share a client link | Client को link भेजें
The client sees only this event: stage, setup progress, run-sheet, bill, balance with your UPI, and a review form. They cannot see other clients, costs or margins. | Client को सिर्फ़ यही event दिखेगा: stage, setup progress, run-sheet, bill, बाकी रकम आपके UPI के साथ, और review form। दूसरे clients, लागत या margin नहीं दिखेंगे।
Link valid for | Link कितने दिन चले
Create link | Link बनाएं
Copy link | Link copy करें
Send to client | Client को भेजें
Offline mode: a client link only opens on this same device. Connect Supabase so clients can open it on their own phone. | Offline mode: client link सिर्फ़ इसी device पर खुलेगा। Supabase जोड़ें ताकि client अपने phone पर खोल सकें।
Created client link for {} | {1} के लिए client link बनाया
Using package | Package से:
Using package {} | Package से: {1}
Profit est. | अनुमानित मुनाफ़ा
Costs so far | अब तक की लागत
Menu | Menu
No menu saved on this booking yet | इस booking पर अभी कोई menu save नहीं
Pick dishes in the catering calculator and save them to this event. | Catering calculator में dishes चुनें और इस event में save करें।
Plan dishes in the catering calculator | Catering calculator में dishes का plan बनाएं
Open calculator | Calculator खोलें
Menu for {} guests | {1} मेहमानों का menu
{} · {} pax | {1} · {2} pax
{} · {} · {} pax | {1} · {2} · {3} pax
{}% setup | {1}% setup
· {}% setup | · {1}% setup
{} tasks · {} item types reserved · {} run-sheet entries | {1} काम · {2} तरह के items reserve · {3} run-sheet entries
Peak saaya / muhurat dates | साया / मुहूर्त की तारीखें
Peak saaya date | साया की तारीख
Add peak date | साया की तारीख जोड़ें
Add the wedding muhurat dates from your panchang. | अपने पंचांग से शादी के मुहूर्त की तारीखें जोड़ें।
Highlighted on the calendar so you price high-demand dates right | Calendar पर अलग दिखेंगी ताकि भीड़ वाली तारीखों का सही rate लगा सकें
e.g. Dev Uthani Ekadashi | जैसे: देव उठनी एकादशी
No dates added | कोई तारीख नहीं जोड़ी
Add date | तारीख जोड़ें
In {} days | {1} दिन में
{} days left | {1} दिन बाकी
Moved {} from {} to {} | {1} को {2} से {3} में किया

# ---------- inventory ----------
Godown stock with date-wise availability. Stock is held automatically for confirmed bookings. | तारीख के हिसाब से godown stock। पक्की bookings के लिए stock अपने आप रुक जाता है।
Add your tents, chairs, lights, DG sets and utensils. | अपने tent, कुर्सियां, lights, DG set और बर्तन जोड़ें।
Add inventory item | Inventory item जोड़ें
Add item | Item जोड़ें
Add stock | Stock जोड़ें
Reduce stock | Stock घटाएं
Edit item | Item edit करें
Delete item? | Item delete करें?
Deleted inventory | Inventory item delete किया
{} will be removed from inventory. Bookings that reserved it will lose that line. | {1} inventory से हट जाएगा। जिन bookings में यह reserve है, उनसे यह line हट जाएगी।
Godown item | Godown item
Item name | Item का नाम
e.g. Maharaja velvet sofa | जैसे: महाराजा वेलवेट सोफ़ा
Total owned | कुल अपने पास
Total pieces | कुल pieces
Damaged / repair | टूटा / मरम्मत में
Under repair / damaged | मरम्मत में / टूटा
In godown | Godown में
Out on rent | किराए पर बाहर
Godown location | Godown में जगह
Rack B-4 | Rack B-4
Main godown | मुख्य godown
Rent per day (₹) | रोज़ का किराया (₹)
Weight per piece (kg) | एक piece का वज़न (kg)
Used for truck loading | Truck loading में काम आता है
Search chairs, tent, DG… | कुर्सी, tent, DG… खोजें
Free on | इस दिन खाली:
Stock free on this date | इस तारीख को खाली stock
Item types | Items के प्रकार
Tents & Shamiana | Tent और शामियाना
Furniture | Furniture
Lighting & Sound | Light और Sound
Power & DG | Power और DG
Catering Utensils | Catering के बर्तन
Decor & Flooring | सजावट और फ़र्श
No items | कोई item नहीं
Added {} items to {} | {2} में {1} items जोड़े
{} items added to {} | {2} में {1} items जोड़े
Reserved {} × {} for {} | {3} के लिए {1} × {2} reserve किए
{} × {} damaged at {} | {3} पर {1} × {2} टूटे

# ---------- catering ----------
Catering & ration calculator | Catering और राशन calculator
Pick the menu, set guests and buffer. Get the halwai’s samagri list, raw cost and a per-plate price. | Menu चुनें, मेहमान और buffer डालें। हलवाई की सामग्री list, कच्चे माल की लागत और प्रति plate rate पाएं।
Select dishes | Dishes चुनें
Add dish | Dish जोड़ें
Edit dish | Dish edit करें
Delete dish? | Dish delete करें?
Dish name | Dish का नाम
Course | Course
Selected by default | पहले से चुना हुआ
Ingredient | सामग्री
Ingredients add up here. | सामग्री यहां जुड़ती जाएगी।
No dishes yet | अभी कोई dish नहीं
Add your standard dishes with ingredient quantity per guest. | अपनी रोज़ की dishes, प्रति मेहमान सामग्री के साथ जोड़ें।
Quantity is per guest, in kg (or litres for milk). | मात्रा प्रति मेहमान है, kg में (दूध के लिए लीटर)।
Use the same names as your mandi rates (e.g. Pure Desi Ghee, Milk (L)) so cost is calculated. | मंडी rate वाले नाम ही लिखें (जैसे Pure Desi Ghee, Milk (L)) ताकि लागत निकल सके।
guests to serve | मेहमानों को खिलाना है
Halwai buffer | हलवाई buffer
Samagri list | सामग्री list
Total raw material | कुल कच्चा माल
Mandi ₹/unit | मंडी ₹/unit
Suggested price per plate | प्रति plate सुझाया गया rate
Margin on cost | लागत पर margin
Gas, labour, disposables | Gas, मज़दूरी, disposables
For {} plates including buffer | Buffer मिलाकर {1} plates के लिए
for {} plates · {} dishes | {1} plates · {2} dishes
Raw {} + overhead {} = cost {} · {}% margin | कच्चा माल {1} + overhead {2} = लागत {3} · {4}% margin
Save menu to booking | Menu booking में save करें
Menu saved to | Menu save हुआ:
Saved {}-dish menu for {} | {2} के लिए {1} dishes का menu save किया
Catering added to | Catering जोड़ा गया:
Added catering to {} | {1} में catering जोड़ा
Welcome Drinks & Chaat | Welcome Drinks और चाट
Starters & Live Counters | Starters और Live Counters
Main Course | Main Course
Breads & Rice | रोटी और चावल
Sweets | मिठाई
Veg | Veg
Fresh Paneer | ताज़ा पनीर
Pure Desi Ghee | शुद्ध देसी घी
Milk (L) | दूध (L)
Basmati Rice | बासमती चावल
Maida | मैदा
Wheat Atta | गेहूं का आटा
Besan | बेसन
Sugar | चीनी
Urad Dal | उड़द दाल
Moong Dal | मूंग दाल
Cooking Oil | खाने का तेल
Dahi | दही
Fresh Cream | फ्रेश क्रीम
Tomato | टमाटर
Onion | प्याज़
Capsicum | शिमला मिर्च
Dry Fruits | ड्राई फ्रूट्स
Mawa | मावा
Butter | मक्खन
Spices & Masala | मसाले
Seasonal Veg | मौसमी सब्ज़ी
Catering buffet: {} | Catering buffet: {1}
Catering buffet: {} dishes ({}{}) | Catering buffet: {1} dishes ({2}{3})

# ---------- vendors & POs ----------
Vendors & purchase orders | Vendors और purchase orders
Florists, DJ, dairy, crockery partners. Issue POs and track what you owe. | फूल वाले, DJ, dairy, crockery partners। PO जारी करें और देखें कितना देना है।
Florist, DJ, dairy and other partners. | फूल वाले, DJ, dairy और दूसरे partners।
Add your regular partners once, then issue POs in seconds. | अपने रोज़ के partners एक बार जोड़ें, फिर सेकंडों में PO बनाएं।
Vendor | Vendor
Vendors | Vendors
Vendor list | Vendor list
Add vendor | Vendor जोड़ें
Edit vendor | Vendor edit करें
Delete vendor? | Vendor delete करें?
Deleted vendor | Vendor delete किया
Add a vendor first | पहले vendor जोड़ें
Vendor / firm name | Vendor / firm का नाम
Notes (rates, bank, UPI) | Notes (rate, bank, UPI)
Vendor PO | Vendor PO
Vendor POs | Vendor POs
Purchase order | Purchase order
Purchase orders | Purchase orders
Issue PO | PO जारी करें
Issue purchase order | Purchase order जारी करें
Issue a PO when you book a florist, DJ or supplier. | फूल वाले, DJ या supplier को book करते समय PO जारी करें।
Save PO | PO save करें
Send PO | PO भेजें
PO | PO
PO date | PO की तारीख
Open POs | खुले PO
No POs | कोई PO नहीं
No POs yet | अभी कोई PO नहीं
What is ordered | क्या order किया
e.g. Stage & floral mandap | जैसे: Stage और फूलों का मंडप
Agreed amount ₹ | तय रकम ₹
Paid so far ₹ | अब तक दिया ₹
Paid cannot be more than the PO amount | दी गई रकम PO की रकम से ज़्यादा नहीं हो सकती
Paid to vendors | Vendors को दिया
You owe vendors | Vendors को देना है
Owe | देना है
Mark paid | Paid mark करें
For booking | किस booking के लिए
— General — | — सामान्य —
— General / overhead — | — सामान्य / overhead —
— None — | — कोई नहीं —
— Walk-in / no booking — | — बिना booking —
— Not linked — | — नहीं जुड़ा —
Floral & Decor | फूल और सजावट
DJ / Sound / Dhol | DJ / Sound / ढोल
Grocery & Dairy | किराना और dairy
Crockery Partner | Crockery partner
Generator / Diesel | Generator / डीज़ल
Photo & Video | Photo और Video
{} POs · {} total | {1} PO · कुल {2}

# ---------- staff ----------
Crew roster, daily attendance by event, advances and monthly payout. | Crew की list, event के हिसाब से रोज़ की हाज़िरी, advance और महीने की तनख्वाह।
Add your labour and staff first. | पहले अपने मज़दूर और staff जोड़ें।
Add riggers, halwai, waiters, DG techs and helpers. | Riggers, हलवाई, waiters, DG वाले और helpers जोड़ें।
Add crew | Crew जोड़ें
Add crew member | Crew member जोड़ें
Edit crew member | Crew member edit करें
Remove crew member? | Crew member हटाएं?
Removed crew | Crew हटाया
{} will be removed. Past attendance stays in reports. | {1} हट जाएंगे। पुरानी हाज़िरी reports में रहेगी।
No crew | कोई crew नहीं
No crew added | कोई crew नहीं जोड़ा
No crew yet | अभी कोई crew नहीं
Crew / Staff | Crew / Staff
Rigger, halwai, waiter… | Rigger, हलवाई, waiter…
Daily wage ₹ | रोज़ की मज़दूरी ₹
Attendance | हाज़िरी
Mark all present | सबको हाज़िर mark करें
Present | हाज़िर
Half | आधा दिन
Absent | गैरहाज़िर
Roster | Roster
Payroll | तनख्वाह
Earned | कमाया
Net pay | देनी है
Crew wages | Crew की मज़दूरी
Cash advance | नकद advance
Half day counts as 0.5. Advances given this month are deducted. | आधा दिन 0.5 गिना जाता है। इस महीने दिया advance कट जाता है।
Marked attendance for {} crew on {} | {2} को {1} crew की हाज़िरी लगाई
Paid {} wages to {} for {} | {3} के लिए {2} को {1} मज़दूरी दी
Advance {} to {} | {2} को {1} advance
{}{} days this month | इस महीने {1}{2} दिन
{} ({}/day) | {1} ({2}/दिन)
{}/day | {1}/दिन
· crew: | · crew:

# ---------- live tracker / tasks ----------
Tracker | Tracker
Tasks | काम
Task | काम
Setup task | Setup का काम
New setup task | नया setup का काम
Edit task | काम edit करें
Delete task? | काम delete करें?
Assigned to | किसको दिया
Unassigned | किसी को नहीं दिया
Progress | Progress
Progress % | Progress %
Note / blocker | Note / रुकावट
My tasks only | सिर्फ़ मेरे काम
You can update only your own tasks | आप सिर्फ़ अपने काम update कर सकते हैं
No event on site | Site पर कोई event नहीं
Setup style | Setup का तरीका

# ---------- invoices ----------
GST tax invoices, estimates and bills of supply. | GST tax invoice, estimate और bill of supply।
Invoices & quotations | Invoices और quotations
Invoices & quotes | Invoices और quotes
New quotation or invoice | नया quotation या invoice
Quotation / bill | Quotation / bill
Quotation | Quotation
Quotations | Quotations
Quotation / Estimate | Quotation / Estimate
Invoice | Invoice
Tax invoice | Tax invoice
Converted | Convert हो गया
Client approved: make tax invoice | Client ने मान लिया: tax invoice बनाएं
Tax invoice {} created | Tax invoice {1} बन गया
Converted {} to {} | {1} को {2} में बदला
Create a quotation for this event. | इस event का quotation बनाएं।
Create a quotation from a booking or tap New. | किसी booking से quotation बनाएं या नया दबाएं।
Invoice not found | Invoice नहीं मिला
It may have been deleted. | शायद delete हो गया है।
Document | Document
Document type | Document type
New document | नया document
Delete document | Document delete करें
Discard changes | बदलाव छोड़ दें
Leave without saving? | बिना save किए निकलें?
Your changes to this document are not saved yet. | इस document के बदलाव अभी save नहीं हुए हैं।
Bill to | Bill किसके नाम
Billing address | Billing पता
Link to booking | Booking से जोड़ें
Pick a booking | Booking चुनें
Line items | Items की list
Add line | Line जोड़ें
Remove line | Line हटाएं
Add a line, or import booked items / the menu. | Line जोड़ें, या booked items / menu import करें।
No lines yet | अभी कोई line नहीं
GST treatment | GST कैसे लगे
No GST | GST नहीं
Incl. GST | GST सहित
+ GST | + GST
(incl. GST) | (GST सहित)
GST rate % | GST rate %
Place of supply | Supply की जगह
Client outside {} (IGST) | Client {1} से बाहर का (IGST)
Due date | आखिरी तारीख
Payment due in (days) | Payment कितने दिन में (दिन)
Notes printed on the bill | Bill पर छपने वाले notes
Taxable value | Taxable value
GST collected | वसूला गया GST
Output tax on invoices | Invoices पर output tax
Not yet due | अभी समय बाकी
Record payment | Payment दर्ज करें
Send reminders | याद दिलाएं
Taqaza | तकाज़ा
Every invoice is fully paid. Shabaash! | हर invoice पूरा paid है। शाबाश!
No invoice is past its due date | कोई invoice late नहीं है
Receivables ({}) | लेना बाकी ({1})
{} invoices past due date | {1} invoice late
{} invoice past due date | {1} invoice late
1–30 days late | 1–30 दिन late
31–60 days late | 31–60 दिन late
60+ days | 60+ दिन
{} · {} · due {} | {1} · {2} · {3} तक
Total {} · paid {} | कुल {1} · paid {2}
Created {} {}{} | {1} {2}{3} बनाया

# ---------- payments ----------
Payment | Payment
Payment received | Payment मिला
Payments received | मिले payments
Record payment received | मिला हुआ payment दर्ज करें
Record advances and balances as they come in. | Advance और बाकी रकम जैसे-जैसे आए, दर्ज करते जाएं।
Advance and balance payments show here. | Advance और बाकी के payments यहां दिखेंगे।
Collections, receipts and polite taqaza reminders. | वसूली, रसीदें और विनम्र तकाज़ा।
Enter the amount received | मिली रकम डालें
Advance / other (no invoice) | Advance / अन्य (बिना invoice)
Advance for this booking (no invoice yet) | इस booking का advance (अभी invoice नहीं)
Booking (for advances) | Booking (advance के लिए)
Against | किसके बदले
against {} | {1} के बदले
UTR / cheque / note | UTR / cheque / note
Balance after this payment: | इस payment के बाद बाकी:
Save payment | Payment save करें
Delete payment? | Payment delete करें?
Deleted payment {} | Payment {1} delete किया
Payments linked to it stay in Payments but lose the link. | इससे जुड़े payments, Payments में रहेंगे पर link हट जाएगा।
No payments | कोई payment नहीं
No payments yet | अभी कोई payment नहीं
No pending payments | कोई payment बाकी नहीं
Payment receipt | Payment की रसीद
Send receipt | रसीद भेजें
Recorded payment {}{} | Payment {1}{2} दर्ज किया
Pay | Pay करें
Pay to | किसको देना
UPI | UPI
Cash | Cash
Bank Transfer | Bank Transfer
Cheque | Cheque
Card | Card
{} · {}/month | {1} · {2}/महीना
UPI {} | UPI {1}

# ---------- expenses ----------
Expense | खर्च
Add expense | खर्च जोड़ें
Edit expense | खर्च edit करें
Delete expense? | खर्च delete करें?
No expenses | कोई खर्च नहीं
No expenses this month | इस महीने कोई खर्च नहीं
Diesel, transport, extra labour, repairs. Tag to a booking to see true event profit. | डीज़ल, transport, extra मज़दूर, मरम्मत। Booking से जोड़ें ताकि event का असली मुनाफ़ा दिखे।
Diesel, transport, extra labour. | डीज़ल, transport, extra मज़दूर।
Add fuel, transport and other running costs. | डीज़ल, transport और दूसरे रोज़ के खर्च जोड़ें।
Diesel / Fuel | डीज़ल / ईंधन
Transport | Transport
Extra Labour | Extra मज़दूर
Food & Grocery | खाना और किराना
Venue / Rent | Venue / किराया
Repair & Damage | मरम्मत और नुकसान
By category | Category के हिसाब से
{} expense {} ({}) | {1} खर्च {2} ({3})

# ---------- reports ----------
Reports | Reports
Profit by event | Event के हिसाब से मुनाफ़ा
Completed events | पूरे हुए events
Billed (all time) | कुल bill (शुरू से)
Billed vs costs, last six months | Bill बनाम लागत, पिछले छह महीने
Net profit (ex-GST) | शुद्ध मुनाफ़ा (GST के बिना)
Revenue uses invoices, or package value until invoiced | कमाई invoices से गिनी जाती है, invoice बनने तक package की रकम से
POs {} · Exp {} · Wages {} | PO {1} · खर्च {2} · मज़दूरी {3}
Vendors {} · Exp {} · Wages {} | Vendors {1} · खर्च {2} · मज़दूरी {3}
Billed {} | Bill बना {1}
Costs {} | लागत {1}
GST {} | GST {1}
% margin | % margin
CSV | CSV

# ---------- reviews ----------
Client reviews | Client reviews
Collect feedback after every event and reuse the best ones for Google and Instagram. | हर event के बाद राय लें और सबसे अच्छी Google और Instagram पर इस्तेमाल करें।
Average rating | औसत rating
Awaiting review | Review का इंतज़ार
Log a review | Review लिखें
Log review | Review लिखें
Logged review from {} | {1} का review लिखा
Stars | Stars
What they said | उन्होंने क्या कहा
Verified client | पक्का client
From client links | Client links से
Copy for Google | Google के लिए copy करें
No reviews yet | अभी कोई review नहीं
Share a client link after the event to collect ratings. | Rating लेने के लिए event के बाद client link भेजें।
{} completed event(s) have no review yet: | {1} पूरे हुए events का अभी review नहीं:

# ---------- planner tools ----------
Quick calculators for site planning and loading. | Site planning और loading के लिए तुरंत calculator।
Seating & lawn | बैठक और lawn
Area (sq ft) | जगह (sq ft)
Theatre / conference rows | Theatre / conference की लाइनें
Round tables | गोल tables
Round Table | गोल table
Full banquet (tables of 8) | पूरा banquet (8 वाली tables)
Wedding mix (50% dining, lounges) | शादी mix (50% खाना, lounges)
VIP sofas | VIP sofa
Chairs | कुर्सियां
Chair | कुर्सी
Sofa | Sofa
Tent | Tent
Comfortable | आराम से
Tight but workable | थोड़ा तंग पर चलेगा
Too crowded | बहुत भीड़
{} sq ft per guest | प्रति मेहमान {1} sq ft
· {}. Keep 20+ for weddings with buffet counters and a 6 ft fire exit corridor. | · {1}। Buffet counter वाली शादियों में 20+ रखें और 6 ft का fire exit रास्ता छोड़ें।
Truck loading | Truck loading
Loading order | Loading का क्रम
Heavy base first, delicate lights last | भारी सामान पहले, नाज़ुक lights आखिर में
Load | Load
Within capacity for one trip. | एक चक्कर की क्षमता में है।
Over capacity: plan {} trips or a bigger vehicle to avoid overloading fines. | क्षमता से ज़्यादा: {1} चक्कर लगाएं या बड़ी गाड़ी लें, वरना overloading का जुर्माना।
Approx. load {} kg | लगभग {1} kg load
{} / {} kg | {1} / {2} kg
{} · {} kg | {1} · {2} kg
set weight in inventory | inventory में वज़न डालें
Nothing to load | Load करने को कुछ नहीं
Reserve items in a booking first. | पहले किसी booking में items reserve करें।
No bookings with items | Items वाली कोई booking नहीं
Bolero Pickup | Bolero Pickup
Tata 407 | Tata 407
Eicher 14 ft | Eicher 14 ft
Heavy Truck (10 wheel) | भारी Truck (10 पहिया)

# ---------- team & access ----------
Who can log in, what each role can see and change, and a log of every action. | कौन login कर सकता है, हर role क्या देख और बदल सकता है, और हर काम का log।
Add employee | कर्मचारी जोड़ें
Create their login. You decide what they can see and do. | उनका login बनाएं। आप तय करें कि वे क्या देख और कर सकते हैं।
Full name | पूरा नाम
Login ID: mobile number or email | Login ID: mobile नंबर या email
They type this on the login screen | Login screen पर यही डालेंगे
Change it if you like. Minimum 6 characters. | चाहें तो बदल दें। कम से कम 6 अक्षर।
Link to crew record (for “My tasks”) | Crew record से जोड़ें (“मेरे काम” के लिए)
After adding, tap | जोड़ने के बाद, उनके नाम के आगे
next to their name to give or remove access to any section. | दबाकर किसी भी section का access दें या हटाएं।
Create login | Login बनाएं
Login created | Login बन गया
Password changed | Password बदल गया
Password reset | Password reset हो गया
Login ID | Login ID
Save or send this now. For safety the password is not shown again. You can always set a new one. | इसे अभी save करें या भेज दें। सुरक्षा के लिए password दोबारा नहीं दिखेगा। नया कभी भी बना सकते हैं।
Send on WhatsApp | WhatsApp पर भेजें
Roles & permissions | Roles और permissions
Custom role | अपना role
Create custom role | अपना role बनाएं
Role name | Role का नाम
e.g. Decor Head, Store Keeper | जैसे: Decor Head, Store Keeper
Copy permissions from | Permissions यहां से copy करें
Starts with view-only access. Adjust the matrix after. | शुरुआत सिर्फ़ देखने के access से। बाद में table में बदलें।
A role with this name exists | इस नाम का role पहले से है
Created role | Role बनाया
Role updated | Role update हो गया
No access | Access नहीं
View only | सिर्फ़ देखें
Full | पूरा
Full access to everything | सब कुछ का पूरा access
Can change: | बदल सकते हैं:
· views {} more | · {1} और देख सकते हैं
Custom access | अलग access
App login | App login
Remove member | Member हटाएं
They lose access to this business immediately. Their past activity stays in the log. | इनका इस business का access तुरंत बंद हो जाएगा। पुरानी activity log में रहेगी।
Removed {} from the team | {1} को team से हटाया
Added {} as {} | {1} को {2} बनाकर जोड़ा
Changed {}'s role to {} | {1} का role {2} किया
Updated access for {} | {1} का access बदला
Access updated | Access update हो गया
What {} can do | {1} क्या कर सकते हैं
Role default · {} | Role के हिसाब से · {1}
Change only what is different for this person. Everything else follows their role. | इस व्यक्ति के लिए सिर्फ़ वही बदलें जो अलग है। बाकी सब उनके role के हिसाब से चलेगा।
Set a new password (leave empty to keep) | नया password डालें (पुराना रखना हो तो खाली छोड़ें)
Use this when they forget their password. Then share it with them. | जब वे password भूल जाएं तब इसे इस्तेमाल करें। फिर उन्हें बता दें।
These rules are enforced by the server, not just hidden in the app. | ये नियम server पर लागू होते हैं, सिर्फ़ app में छुपाए नहीं जाते।
= also delete. Owner always has full access. {} | = delete भी। Owner के पास हमेशा पूरा access होता है। {1}
Owner | Owner (मालिक)
Manager | Manager
Accountant | Accountant
Site Supervisor | Site Supervisor
(you) | (आप)
(Super Admin) | (Super Admin)
Turned off in Settings | Settings में बंद है

# ---------- settings ----------
Business profile | Business की जानकारी
Business profile, billing defaults, modules and data. | Business की जानकारी, bill की सेटिंग, sections और data।
Settings saved | Settings save हो गईं
Save settings | Settings save करें
Changes save instantly | बदलाव तुरंत save होते हैं
Updated business settings | Business settings update कीं
Tagline under your name | आपके नाम के नीचे tagline
e.g. Tent · Catering · Royal Weddings since 1998 | जैसे: Tent · Catering · शाही शादियां 1998 से
Website / Instagram | Website / Instagram
e.g. utsavevents.in | जैसे: utsavevents.in
Printed on invoices, challans, receipts and the client portal | Invoices, challans, रसीदों और client page पर छपता है
GSTIN | GSTIN
State code (GST) | State code (GST)
Bank & branch | Bank और branch
Account number | Account नंबर
IFSC | IFSC
UPI ID | UPI ID
Invoice prefix | Invoice prefix
Quotation prefix | Quotation prefix
Default GST % | Default GST %
Default SAC code | Default SAC code
Default catering margin % | Default catering margin %
Catering overhead per plate ₹ | प्रति plate catering overhead ₹
Terms | शर्तें
Terms printed on bills | Bill पर छपने वाली शर्तें
Business type & sections | Business type और sections
Hide what you don’t use. A tent house can switch off catering, a caterer can switch off inventory. | जो काम में नहीं आता उसे छुपा दें। Tent house catering बंद कर सकता है, caterer inventory बंद कर सकता है।
Your branding on bills | Bills पर आपकी branding
Logo, stamp and colour appear on every invoice, quotation, challan, receipt and your client page. | Logo, stamp और रंग हर invoice, quotation, challan, रसीद और आपके client page पर दिखते हैं।
Business logo | Business logo
PNG or JPG. Square or round logos look best. | PNG या JPG। चौकोर या गोल logo सबसे अच्छे लगते हैं।
Stamp / signature | Stamp / signature
Printed above “Authorised signatory”. | “Authorised signatory” के ऊपर छपता है।
Bill colour | Bill का रंग
Used for your name, headings and table on bills | Bill पर आपके नाम, headings और table में लगता है
Pick any colour | कोई भी रंग चुनें
Colour {} | रंग {1}
Live preview | Live preview
Choose an image file (PNG or JPG) | Image file चुनें (PNG या JPG)
This image is over 5 MB. Choose a smaller one. | यह image 5 MB से बड़ी है। छोटी चुनें।
Could not read this image. Try a PNG or JPG. | यह image पढ़ी नहीं जा सकी। PNG या JPG try करें।
Logo saved. It now shows on all bills. | Logo save हो गया। अब सभी bills पर दिखेगा।
Stamp saved | Stamp save हो गया
Updated business logo | Business logo update किया
Updated stamp / signature | Stamp / signature update किया
Data & backup | Data और backup
Download backup | Backup download करें
Copy backup | Backup copy करें
Restore | Restore करें
Restore from file | File से restore करें
Restore backup? | Backup restore करें?
{} records from {} ({}) will be merged in. Records with the same ID are replaced. | {2} ({3}) के {1} records जुड़ जाएंगे। एक जैसी ID वाले records बदल जाएंगे।
Backup restored | Backup restore हो गया
Restored backup | Backup restore किया
That file is not an EventPro backup | यह EventPro का backup file नहीं है
Exported data backup | Data backup निकाला
a backup | एक backup
Cloud sync is on. Data is stored in your Supabase project. | Cloud sync चालू है। Data आपके Supabase project में है।
To let your team log in from their own phones, connect a free Supabase project. Steps are in the README that comes with the app (about 10 minutes). | Team अपने phone से login कर सके, इसके लिए free Supabase project जोड़ें। तरीका app के README में है (लगभग 10 मिनट)।
Copy this text | यह text copy करें
Long-press or select all, then copy. | देर तक दबाएं या सब select करें, फिर copy करें।
Could not load | Load नहीं हो सका

# ---------- plan card, blocked screen ----------
Valid till | कब तक valid
Valid till {} · {} days left | {1} तक valid · {2} दिन बाकी
Valid till {} · {} day left | {1} तक valid · {2} दिन बाकी
Expired on {} | {1} को खत्म हुआ
No expiry date | कोई आखिरी तारीख नहीं
· Support {} | · Support {1}
Renew / upgrade | Renew / upgrade करें
Manage in console | Console में बदलें
Access is | Access अभी
paused | रुका हुआ है
for this business. | इस business के लिए।
Your data is safe. {} has paused this account, usually because of a pending renewal. Contact support to restore access. | आपका data सुरक्षित है। {1} ने यह account रोका है, आमतौर पर renewal बाकी होने की वजह से। Access वापस पाने के लिए support से बात करें।
Get access back | Access वापस पाएं
Your other businesses | आपके दूसरे businesses
Trial | Trial
Active | चालू
Expired | खत्म
Suspended | रुका हुआ
Basic | Basic
Pro | Pro
Enterprise | Enterprise

# ---------- Super Admin console ----------
Every business on your platform: plans, renewals, users and access. | आपके platform का हर business: plans, renewals, users और access।
Add business | Business जोड़ें
Loading all businesses… | सभी businesses load हो रहे हैं…
Fetching plans, users and activity. | Plans, users और activity ला रहे हैं।
Businesses | Businesses
Businesses ({}) | Businesses ({1})
Users ({}) | Users ({1})
Plans & support | Plans और support
{} users in total | कुल {1} users
Paid & active | Paid और चालू
Monthly value {} | महीने की कमाई {1}
On free trial | Free trial पर
{} expire within 7 days | {1} का 7 दिन में खत्म
Expired / paused | खत्म / रुके हुए
Read-only or blocked | सिर्फ़ देखने लायक या बंद
Search business, owner, phone or city | Business, owner, phone या शहर खोजें
All | सभी
Paid | Paid
Expiring soon | जल्द खत्म होने वाले
No businesses here | यहां कोई business नहीं
Try another filter. New sign-ups appear here automatically. | कोई और filter चुनें। नए sign-up यहां अपने आप दिखेंगे।
{}{}since {} | {1}{2}{3} से
Plan | Plan
Team · Bookings | Team · Bookings
ended {}d ago | {1} दिन पहले खत्म
no expiry | कोई आखिरी तारीख नहीं
Plan & access | Plan और access
Last activity {} · {} bills | आखिरी activity {1} · {2} bills
Plan, expiry and access for this business | इस business का plan, आखिरी तारीख और access
Active (paid) | चालू (paid)
Suspended (block login) | रोका गया (login बंद)
Or extend by | या इतना बढ़ाएं
No change | कोई बदलाव नहीं
+1 month | +1 महीना
+3 months | +3 महीने
+6 months | +6 महीने
+1 year | +1 साल
Private note (only Super Admins see this) | निजी note (सिर्फ़ Super Admin को दिखेगा)
e.g. Paid ₹9,999 by UPI on 12 Oct, yearly plan | जैसे: 12 Oct को UPI से ₹9,999 मिले, सालाना plan
After expiry the business can still log in and see data, but cannot add or change anything. Suspended blocks the app completely. | खत्म होने के बाद business login करके data देख सकता है, पर कुछ जोड़ या बदल नहीं सकता। Suspended करने पर app पूरा बंद हो जाता है।
Search name, email, mobile or business | नाम, email, mobile या business खोजें
Add Super Admin | Super Admin जोड़ें
Add a Super Admin | Super Admin जोड़ें
They must have signed up already. | उनका account पहले से बना होना चाहिए।
Their email or mobile number | उनका email या mobile नंबर
Give access | Access दें
Super Admin added | Super Admin जोड़ा गया
· last login | · आखिरी login
· never logged in | · कभी login नहीं किया
Not in any business | किसी business में नहीं
Blocked | Block है
Reset password | Password reset करें
Make Super Admin | Super Admin बनाएं
Remove Super Admin | Super Admin हटाएं
Block login | Login block करें
Unblock | Unblock करें
No users found | कोई user नहीं मिला
Give Super Admin access? | Super Admin access दें?
Remove Super Admin access? | Super Admin access हटाएं?
{} will see and change every business on the platform. | {1} platform का हर business देख और बदल सकेंगे।
{} will lose access to the Super Admin console. | {1} का Super Admin console का access हट जाएगा।
You cannot remove your own Super Admin access. | आप अपना Super Admin access खुद नहीं हटा सकते।
No account with this email or mobile. Ask them to sign up first. | इस email या mobile का कोई account नहीं। पहले उनसे sign up करवाएं।
Block this login? | यह login block करें?
Unblock this login? | यह login unblock करें?
{} ({}) will not be able to log in until you unblock. Their data stays. | {1} ({2}) तब तक login नहीं कर पाएंगे जब तक आप unblock न करें। उनका data रहेगा।
{} will be able to log in again. | {1} फिर से login कर पाएंगे।
Login blocked | Login block हो गया
Login unblocked | Login unblock हो गया
Login not found | Login नहीं मिला
User not found | User नहीं मिला
Business not found | Business नहीं मिला
Shown to businesses on renewal reminders, expiry screens and the Settings page. | Renewal की याद, expiry screen और Settings page पर businesses को दिखता है।
Platform name | Platform का नाम
Free trial for new sign-ups (days) | नए sign-up के लिए free trial (दिन)
Support name | Support का नाम
Support WhatsApp number | Support का WhatsApp नंबर
Businesses tap “Renew” and it opens WhatsApp to this number | Businesses “Renew” दबाएंगे तो इसी नंबर पर WhatsApp खुलेगा
Support email | Support email
Let new businesses sign up on their own (free trial). Turn off to add businesses only from here. | नए businesses खुद sign up कर सकें (free trial)। बंद करने पर businesses सिर्फ़ यहीं से जुड़ेंगे।
Plan {} name | Plan {1} का नाम
Plan {} price per month (₹) | Plan {1} की महीने की कीमत (₹)
New businesses start on a {}-day free trial. | नए businesses {1} दिन के free trial से शुरू होते हैं।
Platform settings saved | Platform settings save हो गईं
Add a business | Business जोड़ें
Creates the business and its owner login. | Business और उसके owner का login बनाता है।
Owner name | Owner का नाम
Owner mobile | Owner का mobile
Owner login ID: mobile or email | Owner की login ID: mobile या email
Owner password | Owner का password
Create business | Business बनाएं
Set password | Password set करें
Share it with them on WhatsApp after saving. | Save करने के बाद उन्हें WhatsApp पर भेज दें।
Jaipur | Jaipur
Rajasthan | Rajasthan
Support | Support
Updated | Update हो गया
`);
I18N.load(`
# ---------- second pass (found by the screen crawler) ----------
Home | मुख्य पेज
Item name | Item का नाम
Setup progress by event. Crew update their own tasks; supervisors see everything. | हर event का setup कितना हुआ। Crew अपने काम update करती है; supervisor सब देखते हैं।
Quoted amount; used until an invoice is made | बताई गई रकम; invoice बनने तक यही गिनी जाएगी
Offline mode. Data is stored in this browser only; take backups regularly. | Offline mode. Data सिर्फ़ इसी browser में है; नियमित backup लेते रहें।
Ingredients, one per line: Name = kg per guest | सामग्री, हर line में एक: नाम = प्रति मेहमान kg
(usual) | (आम तौर पर)
+10% (usual) | +10% (आम तौर पर)
{}/{} picked | {1}/{2} चुनी
Add to invoice | Invoice में जोड़ें
From godown | Godown से
Line | Line
Book | Book करें
Free date | खाली तारीख
Move back | पीछे करें
No event | कोई event नहीं
No menu yet | अभी कोई menu नहीं
No vendors | कोई vendor नहीं
Record | दर्ज करें
Return | वापसी
Shortage | कमी
Service | सेवा
Advance paid | Advance दिया
You need | आपको चाहिए
Outside | बाहर
To: | किसको:
Your business name | आपके business का नाम
Created | बनाया
WhatsApp | WhatsApp
English | English
Language: English | Language: English
on WhatsApp | WhatsApp पर
{} open | {1} बाकी
{} pcs | {1} pieces
{} site | {1} site
{} sites | {1} sites
{} present | {1} हाज़िर
{} half day | {1} आधा दिन
{} absent | {1} गैरहाज़िर
{} reviews | {1} reviews
{} review | {1} review
5-star | 5-star
Pay {} | {1} देना है
Owe {} | {1} देना है
{} (you) | {1} (आप)
= see only. | = सिर्फ़ देखें।
= add and change. | = जोड़ें और बदलें।
= also delete. Owner always has full access. | = delete भी। Owner के पास हमेशा पूरा access होता है।
{} invoice is past due date | {1} invoice late है
{} invoices are past due date | {1} invoices late हैं
{} Rupees only | {1} रुपये मात्र
Tax invoice {} | Tax invoice {1}
Quotation {} | Quotation {1}
Saved {} | {1} save हो गया
Saved {} ({}) | {1} save किया ({2})
{} · Today | {1} · आज
{} · Tomorrow | {1} · कल
{} · In {} days | {1} · {2} दिन में
{} · Running now | {1} · अभी चल रहा
{} margin | {1} margin
{} on {} will be removed. | {2} का {1} हट जाएगा।
will be removed. Past attendance stays in reports. | हट जाएगा। पुरानी हाज़िरी reports में रहेगी।
{} package: {} | {1} package: {2}
{} to {} | {1} से {2}
— to {} | — से {1}
{}, {} events | {1}, {2} events
{} × {} | {1} × {2}
Jan | जन
Feb | फ़र
Mar | मार्च
Apr | अप्रैल
May | मई
Jun | जून
Jul | जुलाई
Aug | अग
Sep | सित
Sept | सित
Oct | अक्टू
Nov | नव
Dec | दिस
# activity log
Added dish {} | Dish जोड़ी: {1}
Updated dish {} | Dish update की: {1}
Created booking {} | Booking बनाई: {1}
Updated booking {} | Booking update की: {1}
Added inventory: {} | Inventory जोड़ी: {1}
Updated inventory: {} | Inventory update की: {1}
Deleted inventory {} | Inventory delete की: {1}
Added task {} | काम जोड़ा: {1}
Updated task {} | काम update किया: {1}
Added vendor {} | Vendor जोड़ा: {1}
Updated vendor {} | Vendor update किया: {1}
Deleted vendor {} | Vendor delete किया: {1}
Added crew {} | Crew जोड़ा: {1}
Updated crew {} | Crew update किया: {1}
Removed crew {} | Crew हटाया: {1}
Issued {} to {} | {2} को {1} जारी किया
Updated {} to {} | {2} का {1} update किया
Deleted booking {} | Booking delete की: {1}
Deleted {} | {1} delete किया
{} confirmed | {1} पक्का हुआ
Dispatched material for {} | {1} का सामान भेजा
Material returned from {} | {1} से सामान वापस आया
Added damage charges to {} | {1} में नुकसान का charge जोड़ा
Created {} {} for {} | {3} के लिए {1} {2} बनाया
Created quotation {} | Quotation {1} बनाया
Created invoice {} | Invoice {1} बनाया
Created role {} | Role बनाया: {1}
Added {} expense {} | {1} खर्च जोड़ा {2}
{}: {}% | {1}: {2}%
{}: {} → {} | {1}: {2} → {3}
Damage recovery: {} | नुकसान की वसूली: {1}
Can change: {} | बदल सकते हैं: {1}
31–60 days | 31–60 दिन
{} invoices | {1} invoices
{} invoice | {1} invoice
January {} | जनवरी {1}
February {} | फ़रवरी {1}
March {} | मार्च {1}
April {} | अप्रैल {1}
May {} | मई {1}
June {} | जून {1}
July {} | जुलाई {1}
August {} | अगस्त {1}
September {} | सितंबर {1}
October {} | अक्टूबर {1}
November {} | नवंबर {1}
December {} | दिसंबर {1}
Valid till {} | {1} तक valid
views {} more | {1} और देख सकते हैं
`);
I18N.load(`
# ---------- website, blog, enquiries ----------
Website | Website
Blog | Blog
Enquiries | Enquiries (पूछताछ)
This is what visitors see on your website's home, About and Contact sections. Prices come from | यही visitors को आपकी website के home, About और Contact में दिखता है। Prices यहां से आते हैं:
Open website | Website खोलें
Website content | Website का content
Changes show on the website within about a minute. | बदलाव लगभग एक मिनट में website पर दिख जाते हैं।
Brand name on the website | Website पर brand का नाम
Company / legal name (for Terms & Privacy) | Company / legal नाम (Terms और Privacy के लिए)
Headline | Headline
The big line at the top of the home page | Home page के सबसे ऊपर की बड़ी line
About us (English) | About us (English)
About us (Hindi, optional) | About us (हिंदी, ज़रूरी नहीं)
Shown when a visitor switches the website to Hindi. Leave empty to show the English text. | जब visitor website को हिंदी में करे तब दिखेगा। खाली छोड़ें तो English text दिखेगा।
Phone number | Phone नंबर
WhatsApp number | WhatsApp नंबर
The green WhatsApp buttons open a chat with this number | हरे WhatsApp buttons इसी नंबर पर chat खोलेंगे
Working hours | काम का समय
Office address | Office का पता
Google Maps link | Google Maps link
Instagram link | Instagram link
Facebook link | Facebook link
YouTube link | YouTube link
LinkedIn link | LinkedIn link
Show plans and prices on the website | Website पर plans और prices दिखाएं
Free trial shown on the website: {} days · Sign-up button {} | Website पर free trial: {1} दिन · Sign-up button {2}
shown | दिख रहा है
hidden (sign-ups are off) | छुपा है (sign-up बंद है)
Save website | Website save करें
Website saved | Website save हो गई
Links must start with https:// | Links https:// से शुरू होने चाहिए
Loading posts… | Posts load हो रहे हैं…
Search posts | Posts खोजें
Open blog | Blog खोलें
New post | नई post
Published | Published (live)
Drafts | Drafts
Draft | Draft
Edited {} | {1} को बदला
No posts here | यहां कोई post नहीं
No blog posts yet | अभी कोई blog post नहीं
Try another filter. | कोई और filter चुनें।
Write tips, wedding season guides or customer stories. Posts help your website show up on Google. | Tips, शादी के season की guides या customers की कहानियां लिखें। Posts से आपकी website Google पर दिखने लगती है।
Write your first post | अपनी पहली post लिखें
Post not found | Post नहीं मिली
Delete this post? | यह post delete करें?
“{}” will be removed from the website. This cannot be undone. | “{1}” website से हट जाएगी। यह वापस नहीं होगा।
Delete post | Post delete करें
Post deleted | Post delete हो गई
All posts | सभी posts
Not saved yet | अभी save नहीं हुई
Post title | Post का title
post-address | post-address
Cover image | Cover image
Wide photo, 1600 × 900 looks best | चौड़ी photo, 1600 × 900 सबसे अच्छी लगती है
Upload cover | Cover upload करें
Change cover | Cover बदलें
Short summary | छोटा सारांश
One or two lines shown on the blog list and on Google | एक-दो lines जो blog list और Google पर दिखेंगी
Post | Post
Heading | Heading
Small heading | छोटी heading
Normal text | सामान्य text
Bold | Bold
Italic | Italic
Underline | Underline
Bullet list | Bullet list
Numbered list | नंबर वाली list
Quote | Quote
Add link | Link जोड़ें
Add picture | Picture जोड़ें
Divider | Divider
Clear formatting | Formatting हटाएं
Publish | Publish करें
Live at | यहां live है:
Drafts are visible only to Super Admins. | Drafts सिर्फ़ Super Admins को दिखते हैं।
Update post | Post update करें
Move back to draft | वापस draft में करें
Save draft | Draft save करें
Language of this post | इस post की भाषा
Tags | Tags
wedding, catering, tips | wedding, catering, tips
Separate with commas | Comma से अलग करें
Author | लेखक
Google & sharing (SEO) | Google और sharing (SEO)
Google title | Google title
Same as the post title | Post के title जैसा
Best under 60 letters | 60 अक्षरों से कम सबसे अच्छा
Google description | Google description
Same as the short summary | छोटे सारांश जैसा
Best under 155 letters | 155 अक्षरों से कम सबसे अच्छा
Paste the link (https://…) | Link paste करें (https://…)
Uploading… | Upload हो रहा है…
Cover uploaded | Cover upload हो गया
Picture added | Picture जुड़ गई
Picture caption (optional) | Picture का caption (ज़रूरी नहीं)
This image is over 15 MB. Choose a smaller one. | यह image 15 MB से बड़ी है। छोटी चुनें।
GIF must be under 3 MB | GIF 3 MB से छोटी होनी चाहिए
Add a title first | पहले title डालें
Write something before publishing | Publish करने से पहले कुछ लिखें
Published on your website | आपकी website पर publish हो गई
Draft saved | Draft save हो गया
Another post already uses this web address (slug). | यह web address (slug) किसी और post में पहले से है।
The web address (slug) can use only small letters, numbers and dashes. | Web address (slug) में सिर्फ़ छोटे अक्षर, नंबर और dash हो सकते हैं।
Loading enquiries… | Enquiries load हो रही हैं…
Contacted | बात हो गई
New ({}) | नई ({1})
Contacted ({}) | बात हो गई ({1})
Closed ({}) | बंद ({1})
All ({}) | सभी ({1})
No enquiries yet | अभी कोई enquiry नहीं
When someone fills the contact form on your website, it shows up here. | जब कोई आपकी website पर contact form भरेगा, वह यहां दिखेगा।
Call | Call करें
Update | Update करें
Private note | निजी note
e.g. Called on 18 Oct, demo fixed for Monday | जैसे: 18 Oct को call किया, सोमवार को demo तय
Delete this enquiry? | यह enquiry delete करें?
It will be removed permanently. | यह हमेशा के लिए हट जाएगी।
`);
I18N.load(`
# ---------- account deletion ----------
Delete my account | मेरा account delete करें
Account deletion | Account delete
Why are you leaving? (optional) | आप क्यों छोड़ रहे हैं? (ज़रूरी नहीं)
I understand my account and data will be erased | मैं समझता हूं कि मेरा account और data हमेशा के लिए हट जाएगा
Request deletion | Delete का request भेजें
Download a backup first | पहले backup download करें
Tick the box to confirm | पक्का करने के लिए box पर tick करें
Request sent. We will contact you before erasing. | Request भेज दिया। हटाने से पहले हम आपसे बात करेंगे।
Your login will be erased. The business data you worked on stays with the business owner. | आपका login हट जाएगा। जिस business में आपने काम किया, उसका data owner के पास रहेगा।
This cannot be undone. | यह वापस नहीं होगा।
Your login and the business | आपका login और business
with all its bookings, bills, stock, staff logins and records will be erased permanently. | की सभी bookings, bills, stock, staff logins और records हमेशा के लिए हट जाएंगे।
Your request goes to the {} team. We confirm with you and erase within 7 days. Some invoice records may be kept where the law requires. | आपका request {1} team के पास जाएगा। हम आपसे पुष्टि करके 7 दिन में हटा देंगे। कानून के हिसाब से कुछ bill records रखे जा सकते हैं।
We received your request on {}. The {} team will confirm with you and erase the account within 7 days. | आपका request {1} को मिला। {2} team आपसे पुष्टि करके 7 दिन में account हटा देगी।
Changed your mind? Contact support before it is processed. | मन बदल गया? Request पूरा होने से पहले support से बात करें।
Pending | बाकी
Erased | हटाया गया
Rejected | मना किया
Pending ({}) | बाकी ({1})
Erased ({}) | हटाए गए ({1})
Rejected ({}) | मना किए ({1})
From the website form | Website के form से
From inside the app | App के अंदर से
Matches login | यह login मिला:
No login found with this ID. Confirm with the person, or mark as done. | इस ID का कोई login नहीं मिला। व्यक्ति से पुष्टि करें, या done mark करें।
Erase account | Account हटाएं
Mark done | Done mark करें
Reject | मना करें
Reject request | Request मना करें
Mark as done | Done mark करें
Erase this account? | यह account हटाएं?
Type ERASE to confirm | पक्का करने के लिए ERASE लिखें
Erase permanently | हमेशा के लिए हटाएं
Note (only Super Admins see this) | Note (सिर्फ़ Super Admin को दिखेगा)
No requests here | यहां कोई request नहीं
Account deletion requests appear here. | Account delete के requests यहां दिखेंगे।
Account erase is not switched on in the database yet. Run supabase/account_deletion.sql once in Supabase. | Database में account हटाने की सुविधा अभी चालू नहीं है। Supabase में supabase/account_deletion.sql एक बार चलाएं।
with all its bookings, bills, stock, staff logins and records will be erased permanently. This cannot be undone. | की सभी bookings, bills, stock, staff logins और records हमेशा के लिए हट जाएंगे। यह वापस नहीं होगा।
Your login will be erased. The business data you worked on stays with the business owner. This cannot be undone. | आपका login हट जाएगा। जिस business में आपने काम किया, उसका data owner के पास रहेगा। यह वापस नहीं होगा।
Google Play requires a way to delete accounts. People ask from the app (Account → Delete my account) or the website page | Google Play के नियम से account delete करने का तरीका होना चाहिए। लोग app से (Account → मेरा account delete करें) या website के इस page से request भेजते हैं:
. Call them to confirm, then erase. | । उन्हें call करके पुष्टि करें, फिर हटाएं।
`);
