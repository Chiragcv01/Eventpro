/* ================= Language: English / हिंदी =================
   The screens are written in English. When Hindi is on, every text node,
   placeholder and tooltip is swapped from the dictionary below as it appears
   (a MutationObserver, so toasts and pop-ups are covered too).
   Hindi is written fully in Devanagari so people who cannot read English
   letters can use the app. Words people already say in English are written
   the way they are spoken: बुकिंग, इनवॉइस, जीएसटी, पेमेंट, लॉगिन.
   Dates ("17 Oct 2026", "Fri, 17 Oct") get Hindi month and day names.
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
      pats.push([new RegExp(src), hi, en.split('{}')[0].length, en.replace(/\{\}/g, '').length]);
    }
    /* the most specific pattern wins: "Menu for {} guests" before "{} guests" */
    pats.sort((a, b) => b[3] - a[3]); memo.clear();
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
    if (out == null) out = dateHi(k);
    memo.set(k, out); return out;
  }
  const MON = { jan: 'जन', feb: 'फ़र', mar: 'मार्च', apr: 'अप्रैल', may: 'मई', jun: 'जून', jul: 'जुलाई', aug: 'अग', sep: 'सित', sept: 'सित', oct: 'अक्टू', nov: 'नव', dec: 'दिस',
    january: 'जनवरी', february: 'फ़रवरी', march: 'मार्च', april: 'अप्रैल', june: 'जून', july: 'जुलाई', august: 'अगस्त', september: 'सितंबर', october: 'अक्टूबर', november: 'नवंबर', december: 'दिसंबर',
    sun: 'रवि', mon: 'सोम', tue: 'मंगल', wed: 'बुध', thu: 'गुरु', fri: 'शुक्र', sat: 'शनि',
    am: 'पूर्वाह्न', pm: 'अपराह्न', sunday: 'रविवार', monday: 'सोमवार', tuesday: 'मंगलवार', wednesday: 'बुधवार', thursday: 'गुरुवार', friday: 'शुक्रवार', saturday: 'शनिवार' };
  /* "17 Oct 2026", "Fri, 17 Oct", "October 2026", "Oct": only when every word is a month/day name */
  function dateHi(k) {
    const words = k.match(/[A-Za-z]+/g) || [];
    if (!words.length || words.length > 4 || !/^[A-Za-z0-9 ,.:–-]+$/.test(k) || !words.every(w => MON[w.toLowerCase()])) return null;
    return k.replace(/[A-Za-z]+/g, w => MON[w.toLowerCase()]);
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
Dashboard | डैशबोर्ड
Bookings | बुकिंग
Booking | बुकिंग
Live Tracker | लाइव ट्रैकर
Live tracker | लाइव ट्रैकर
Live | लाइव
Inventory | इन्वेंटरी
Catering | कैटरिंग
Vendors & POs | वेंडर और पीओ
Staff & Wages | स्टाफ़ और मज़दूरी
Staff & wages | स्टाफ़ और मज़दूरी
Planner Tools | प्लानर टूल्स
Planner tools | प्लानर टूल्स
Invoices | इनवॉइस
Payments | पेमेंट
Expenses | खर्च
Reports & P&L | रिपोर्ट और पी एंड एल
Reviews | रिव्यू
Team & Access | टीम और एक्सेस
Team & access | टीम और एक्सेस
Settings | सेटिंग्स
Daily | रोज़ का काम
Operations | ऑपरेशंस
Money | पैसा
Business | बिज़नेस
Platform | प्लेटफ़ॉर्म
Super Admin | सुपर एडमिन
More | और
Create | बनाएं
Create new | नया बनाएं
What do you want to add? | क्या जोड़ना है?
All services | सभी सेवाएं
Account | अकाउंट
Switch business | बिज़नेस बदलें
New business | नया बिज़नेस
Change password | पासवर्ड बदलें
Log out | लॉग आउट
Alerts | अलर्ट
Alerts & reminders | अलर्ट और याद-दिहानी
All clear | सब ठीक है
Nothing pending | कुछ बाकी नहीं
Overdue payments, stock shortages and dispatches will show here. | बकाया पेमेंट, स्टॉक की कमी और डिस्पैच यहां दिखेंगे।
Overdue bills, stock shortages and dispatches show here. | बकाया बिल, स्टॉक की कमी और डिस्पैच यहां दिखते हैं।
All businesses | सभी बिज़नेस
· Super Admin | · सुपर एडमिन
· Offline | · ऑफ़लाइन
· Synced | · सिंक
Cloud sync is on. | क्लाउड सिंक चालू है।
Offline mode: data is saved on this device only. | ऑफ़लाइन मोड: डेटा सिर्फ़ इसी डिवाइस पर सेव है।
Quick | जल्दी
Back | वापस
Close | बंद करें
Cancel | कैंसल
Save | सेव करें
Saved | सेव हो गया
Edit | एडिट
Delete | डिलीट
Deleted | डिलीट हो गया
Remove | हटाएं
Add | जोड़ें
Added | जोड़ा गया
Updated | अपडेट हो गया
Open | खोलें
View | देखें
See all | सब देखें
Search | खोजें
Share | शेयर
Send | भेजें
Copy | कॉपी
Copied | कॉपी हो गया
Print | प्रिंट
Preview | प्रीव्यू
Refresh | रिफ़्रेश
Upload | अपलोड
Change | बदलें
Clear | साफ़ करें
Exit | बाहर निकलें
Try again | फिर से कोशिश करें
OK | ठीक है
Confirm | पक्का करें
Join | जुड़ें
Escape | एस्केप
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
Calendar | कैलेंडर
List | लिस्ट
Date | तारीख
Time | समय
When | कब
Name | नाम
Phone | फ़ोन
Mobile | मोबाइल
Email | ईमेल
Email: | ईमेल:
Address | पता
City | शहर
State | राज्य
Notes | नोट्स
Note | नोट
Status | स्टेटस
Type | प्रकार
Category | कैटेगरी
Amount | रकम
Amount ₹ | रकम ₹
Total | कुल
Grand total | कुल रकम
Subtotal | सबटोटल
Quantity | मात्रा
Qty | मात्रा
Rate | रेट
Days | दिन
Item | आइटम
Items | आइटम
Description | विवरण
Label | लेबल
Message | मैसेज
Mode | तरीका
Reason | कारण
Section | सेक्शन
Access | एक्सेस
Role | रोल
Members | मेंबर
Link | लिंक
Code: | कोड:
Pending | बाकी
Paid | पेड
Unpaid | अनपेड
Partial | आंशिक
Overdue | बकाया
Settled | चुकता
Received | मिला
Issued | जारी
Delivered | पहुंच गया
Returned | वापस आया
Collected | वसूली
Billed | बिल बना
Cost | लागत
Costs | लागत
Revenue | कमाई
Profit | मुनाफ़ा
Margin | मार्जिन
Due | बाकी
Balance | बैलेंस
Balance due | बाकी रकम
Advance | एडवांस
Discount | डिस्काउंट
Discount ₹ | डिस्काउंट ₹
Someone | कोई
Work | काम
Free | खाली
Booked | बुक्ड
Main | मुख्य
Other | अन्य
Misc | अन्य
Something went wrong on this screen: {} | इस स्क्रीन पर कुछ गड़बड़ हुई: {1}

# ---------- login, sign-up, forgot password ----------
Log in | लॉग इन
Client | क्लाइंट
Login ID (email or mobile number) | लॉगिन आईडी (ईमेल या मोबाइल नंबर)
you@business.in or 98290 12345 | you@business.in या 98290 12345
Password | पासवर्ड
Forgot password? | पासवर्ड भूल गए?
Your name | आपका नाम
Business name | बिज़नेस का नाम
e.g. Shree Ganesh Tent House | जैसे: श्री गणेश टेंट हाउस
What do you do? Pick all that apply | आप क्या काम करते हैं? जो भी लागू हो, सब चुनें
Your login ID: email or mobile number | आपकी लॉगिन आईडी: ईमेल या मोबाइल नंबर
You will use this to log in every time | हर बार लॉगिन करने के लिए यही लगेगी
Password (min 6 characters) | पासवर्ड (कम से कम 6 अक्षर)
Create my business account | मेरा बिज़नेस अकाउंट बनाएं
You become the Owner with full access. Inside the app you create login IDs and passwords for your manager, accountant and staff, and decide what each person can see. | आप पूरे एक्सेस के साथ ओनर बनेंगे। ऐप के अंदर आप अपने मैनेजर, अकाउंटेंट और स्टाफ़ की लॉगिन आईडी और पासवर्ड बनाएंगे और तय करेंगे कि कौन क्या देख सकता है।
See your own event only: setup progress, programme, bill, balance and how to pay. No login needed. | सिर्फ़ अपना इवेंट देखें: सेटअप कितना हुआ, प्रोग्राम, बिल, बाकी रकम और पेमेंट कैसे करें। लॉगिन की ज़रूरत नहीं।
Event code from your organiser | आपके ऑर्गनाइज़र से मिला इवेंट कोड
e.g. k3m9xq2p7a | जैसे: k3m9xq2p7a
View my event | मेरा इवेंट देखें
Bookings, godown stock, halwai ration, GST bills, payment reminders, crew attendance and profit for every event. | बुकिंग, गोदाम स्टॉक, हलवाई का राशन, जीएसटी बिल, पेमेंट की याद-दिहानी, क्रू की हाज़िरी और हर इवेंट का मुनाफ़ा।
Tent, catering aur event ka | टेंट, कैटरिंग और इवेंट का
poora hisaab | पूरा हिसाब
, ek app mein. | , एक ऐप में।
Tent · Catering · Events | टेंट · कैटरिंग · इवेंट
Tent stock | टेंट स्टॉक
GST bills | जीएसटी बिल
Live setup | लाइव सेटअप
Crew | क्रू
Reports | रिपोर्ट
Need help? | मदद चाहिए?
Secure login. Your data is saved in the cloud and shared only with your team. | सुरक्षित लॉगिन। आपका डेटा क्लाउड में सेव है और सिर्फ़ आपकी टीम को दिखता है।
Offline mode: accounts and data stay on this device only. | ऑफ़लाइन मोड: अकाउंट और डेटा सिर्फ़ इसी डिवाइस पर रहते हैं।
Pick at least one business type | कम से कम एक बिज़नेस टाइप चुनें
Enter an email or a 10-digit mobile number | ईमेल या 10 अंकों का मोबाइल नंबर डालें
Enter a 10-digit mobile number or an email | 10 अंकों का मोबाइल नंबर या ईमेल डालें
Password must be at least 6 characters | पासवर्ड कम से कम 6 अक्षर का होना चाहिए
Password needs 6+ characters | पासवर्ड में 6 या ज़्यादा अक्षर चाहिए
Use at least 6 characters | कम से कम 6 अक्षर रखें
Business created. You are the Owner. | बिज़नेस बन गया। आप ओनर हैं।
Business created | बिज़नेस बन गया
Welcome back, | फिर से स्वागत है,
Welcome back, {} | फिर से स्वागत है, {1}
Login ID or password is wrong. | लॉगिन आईडी या पासवर्ड गलत है।
This login is blocked. Contact Super Admin. | यह लॉगिन ब्लॉक है। सुपर एडमिन से संपर्क करें।
This email or mobile already has an account. Log in instead. | इस ईमेल या मोबाइल का अकाउंट पहले से है। लॉगिन करें।
This login ID is already in use. | यह लॉगिन आईडी पहले से इस्तेमाल में है।
This login ID is already in use. Use another email or mobile number. | यह लॉगिन आईडी पहले से इस्तेमाल में है। दूसरा ईमेल या मोबाइल नंबर डालें।
New business sign-ups are closed. Please contact support. | नए बिज़नेस का साइन-अप अभी बंद है। सपोर्ट से संपर्क करें।
Staff / employee | स्टाफ़ / कर्मचारी
Ask your business owner. They can set a new password for you from Team & Access. | अपने बिज़नेस ओनर से कहें। वे टीम और एक्सेस से आपका नया पासवर्ड बना सकते हैं।
Business owner | बिज़नेस ओनर
Contact {}. For your safety, only the Super Admin can reset an owner's password. | {1} से संपर्क करें। आपकी सुरक्षा के लिए ओनर का पासवर्ड सिर्फ़ सुपर एडमिन ही रीसेट कर सकते हैं।
Lost the phone with your Authenticator app? The same people can switch it off for you, then you can set it up again. | ऑथेंटिकेटर ऐप वाला फ़ोन खो गया? यही लोग उसे बंद कर देंगे, फिर आप दोबारा सेट अप कर सकते हैं।
Set a new password | नया पासवर्ड बनाएं
New password | नया पासवर्ड
Update password | पासवर्ड अपडेट करें
Password updated | पासवर्ड अपडेट हो गया
Your login works, but you are not part of any business yet. Start your own business, or ask your employer to add you from their Team & Access screen. | आपका लॉगिन सही है, पर आप अभी किसी बिज़नेस में नहीं हैं। अपना बिज़नेस शुरू करें, या अपने मालिक से कहें कि वे टीम और एक्सेस से आपको जोड़ें।
Get started | शुरू करें
Create my business | मेरा बिज़नेस बनाएं
You become the Owner | आप ओनर बनेंगे
Create a business | बिज़नेस बनाएं
You will be the Owner. | आप ओनर होंगे।
Business phone | बिज़नेस फ़ोन
Join a team | टीम से जुड़ें
Invite code | इन्वाइट कोड
Your name as the team sees it | टीम को दिखने वाला आपका नाम
You joined | आप जुड़ गए
You joined {} | आप {1} से जुड़ गए
Invite code not found, expired or already used. | इन्वाइट कोड नहीं मिला, एक्सपायर हो गया या पहले ही इस्तेमाल हो चुका है।
You are already part of this business. | आप पहले से इस बिज़नेस में हैं।
Confirm your email, then log in. You will join the team automatically. | अपना ईमेल कन्फ़र्म करें, फिर लॉगिन करें। आप अपने आप टीम में जुड़ जाएंगे।
Cannot connect | कनेक्ट नहीं हो पा रहा
Check your internet connection and try again. | अपना इंटरनेट कनेक्शन देखें और फिर से कोशिश करें।
Tent House | टेंट हाउस
Caterer / Halwai | कैटरर / हलवाई
Event Manager / Planner | इवेंट मैनेजर / प्लानर

# ---------- Authenticator ----------
One more | बस एक
step | कदम
Your account is protected with an Authenticator app. Open Google Authenticator (or Microsoft Authenticator) on your phone and type the 6-digit code for {}. | आपका अकाउंट ऑथेंटिकेटर ऐप से सुरक्षित है। अपने फ़ोन में गूगल ऑथेंटिकेटर (या माइक्रोसॉफ़्ट ऑथेंटिकेटर) खोलें और {1} का 6 अंकों का कोड डालें।
Enter your 6-digit code | अपना 6 अंकों का कोड डालें
Logging in as | लॉगिन हो रहे हैं:
Verify and continue | वेरिफ़ाई करके आगे बढ़ें
Lost your phone? Employees: ask your business owner. Owners: contact {}{}. | फ़ोन खो गया? कर्मचारी: अपने बिज़नेस ओनर से कहें। ओनर: {1}{2} से संपर्क करें।
Use a different login | दूसरे लॉगिन से आएं
Authenticator | ऑथेंटिकेटर
Authenticator on | ऑथेंटिकेटर चालू
Authenticator off | ऑथेंटिकेटर बंद
Authenticator {} | ऑथेंटिकेटर {1}
on | चालू
off | बंद
Two-step login | दो-कदम वाला लॉगिन
On. | चालू है।
Every login asks for the 6-digit code from your Authenticator app. Even if someone learns your password, they cannot open your account. | हर लॉगिन पर ऑथेंटिकेटर ऐप का 6 अंकों का कोड मांगा जाता है। अगर किसी को आपका पासवर्ड पता चल भी जाए, तो भी वह आपका अकाउंट नहीं खोल सकता।
Turn off authenticator | ऑथेंटिकेटर बंद करें
Protect your login with a 6-digit code | 6 अंकों के कोड से अपना लॉगिन सुरक्षित करें
1. Install | 1. प्ले स्टोर / ऐप स्टोर से
from Play Store / App Store. | इंस्टॉल करें।
Google Authenticator | गूगल ऑथेंटिकेटर
Microsoft Authenticator | माइक्रोसॉफ़्ट ऑथेंटिकेटर
2. Tap Start below and scan the QR code with that app. | 2. नीचे स्टार्ट दबाएं और उस ऐप से क्यूआर कोड स्कैन करें।
3. Type the 6-digit code it shows. Done. | 3. ऐप में दिख रहा 6 अंकों का कोड डालें। हो गया।
Start setup | सेटअप शुरू करें
QR code | क्यूआर कोड
Can't scan? Type this key in the app: | स्कैन नहीं हो रहा? ऐप में यह की डालें:
Copy key | की कॉपी करें
6-digit code | 6 अंकों का कोड
Verify and turn on | वेरिफ़ाई करके चालू करें
Authenticator is on. You will need the code at every login. | ऑथेंटिकेटर चालू हो गया। अब हर लॉगिन पर कोड लगेगा।
Turn off authenticator? | ऑथेंटिकेटर बंद करें?
Your login will need only the password again. You can turn it back on any time. | लॉगिन में फिर से सिर्फ़ पासवर्ड लगेगा। आप कभी भी इसे दोबारा चालू कर सकते हैं।
Turn off | बंद करें
Turn on | चालू करें
Authenticator turned off | ऑथेंटिकेटर बंद हो गया
Reset authenticator? | ऑथेंटिकेटर रीसेट करें?
Reset authenticator | ऑथेंटिकेटर रीसेट करें
{} will log in with just the password next time, and can set up the authenticator again on their new phone. | {1} अगली बार सिर्फ़ पासवर्ड से लॉगिन करेंगे, और अपने नए फ़ोन पर ऑथेंटिकेटर दोबारा सेट अप कर सकते हैं।
This person | यह व्यक्ति
Authenticator reset | ऑथेंटिकेटर रीसेट हो गया
They did not have an authenticator on | इनका ऑथेंटिकेटर चालू नहीं था
Authenticator works only in the live app | ऑथेंटिकेटर सिर्फ़ लाइव ऐप में चलता है
Authenticator works only in the live (cloud) app. | ऑथेंटिकेटर सिर्फ़ लाइव (क्लाउड) ऐप में चलता है।
Wrong or expired code. Type the latest 6-digit code from your app. | कोड गलत है या एक्सपायर हो गया। ऐप में दिख रहा नया 6 अंकों का कोड डालें।
No authenticator found for this login. | इस लॉगिन पर कोई ऑथेंटिकेटर नहीं मिला।
Protect your Super Admin login. | अपना सुपर एडमिन लॉगिन सुरक्षित करें।
Turn on the Authenticator so nobody can open the console with just your password. | ऑथेंटिकेटर चालू करें, ताकि सिर्फ़ पासवर्ड से कोई कंसोल न खोल सके।

# ---------- client (guest) portal ----------
Your event team | आपकी इवेंट टीम
Setup progress | सेटअप कितना हुआ
Programme | प्रोग्राम
Bill & payment | बिल और पेमेंट
Fully paid | पूरा पेड
Bill total | बिल की कुल रकम
Quotation shared: | कोटेशन भेजा गया:
Your bill will appear here once it is issued. | बिल बनते ही यहां दिखेगा।
Pay by UPI: | यूपीआई से पे करें:
Send {} and share the screenshot with {}. | {1} भेजें और स्क्रीनशॉट {2} को भेजें।
Thank you for your review! | आपके रिव्यू के लिए धन्यवाद!
It helps {} serve more families. | इससे {1} को और परिवारों की सेवा करने में मदद मिलती है।
How was your experience? | आपका अनुभव कैसा रहा?
Rating | रेटिंग
Your words | आपकी बात
Food, decor, staff behaviour, timing… | खाना, सजावट, स्टाफ़ का व्यवहार, समय…
Submit review | रिव्यू भेजें
Thank you! Review submitted. | धन्यवाद! रिव्यू भेज दिया गया।
Powered by SabManage | सबमैनेज द्वारा
★★★★★ Excellent | ★★★★★ बहुत बढ़िया
★★★★ Very good | ★★★★ बहुत अच्छा
★★★ Okay | ★★★ ठीक-ठाक
★★ Poor | ★★ कमज़ोर
★ Bad | ★ खराब
This guest code is invalid or has expired. | यह कोड गलत है या एक्सपायर हो गया है।
This guest code is invalid or has expired. Ask your event team for a fresh link. | यह कोड गलत है या एक्सपायर हो गया है। अपनी इवेंट टीम से नया लिंक मांगें।
Invalid guest code | गलत कोड
Event not found. | इवेंट नहीं मिला।
{} guests | {1} मेहमान

# ---------- shell, plan banners ----------
Namaste, {} | नमस्ते, {1}
Namaste, | नमस्ते,
Namaste | नमस्ते
on {} | {1} पर
Contact support | सपोर्ट से बात करें
Super Admin view of | सुपर एडमिन व्यू:
Anything you change is saved to this business. | आप जो भी बदलेंगे, वह इसी बिज़नेस में सेव होगा।
. Anything you change is saved to this business. | . आप जो भी बदलेंगे, वह इसी बिज़नेस में सेव होगा।
Back to console | कंसोल पर वापस
Your plan expired on {}. | आपका प्लान {1} को खत्म हो गया।
You can see all your data, but adding or changing anything is locked until you renew. | आप अपना पूरा डेटा देख सकते हैं, पर रिन्यू होने तक कुछ जोड़ना या बदलना बंद है।
Free trial | फ़्री ट्रायल
Your {} plan | आपका {1} प्लान
{} plan | {1} प्लान
ends | खत्म होगा
{} ends | {1} खत्म होगा
today | आज
in {} days | {1} दिन में
in {} day | {1} दिन में
({}). Renew to keep adding bookings and bills. | ({1})। बुकिंग और बिल जोड़ते रहने के लिए रिन्यू करें।
Your plan has expired, so the app is read-only. Renew to make changes. | आपका प्लान खत्म हो गया है, इसलिए ऐप सिर्फ़ देखने के लिए है। बदलाव के लिए रिन्यू करें।
Your role does not have permission for this. Ask the owner to update access. | आपके रोल को इसकी अनुमति नहीं है। ओनर से एक्सेस बदलवाएं।
Super Admin access only | सिर्फ़ सुपर एडमिन के लिए
You do not have access to {} | आपको {1} का एक्सेस नहीं है
Change language | भाषा बदलें
Language | भाषा

# ---------- alerts ----------
{} owes {} | {1} पर {2} बाकी
{} · due {} ({} days late) | {1} · {2} तक देना था ({3} दिन लेट)
{} × {} short | {1} × {2} कम है
{} on {}. Rent from a partner or move a booking. | {1}, {2}। किसी पार्टनर से किराए पर लें या बुकिंग आगे-पीछे करें।
{} not confirmed yet | {1} अभी पक्का नहीं हुआ
{} · {} day(s) left. Call {}. | {1} · {2} दिन बाकी। {3} को कॉल करें।
Load truck for {} | {1} के लिए ट्रक लोड करें
{} item types · {} | {1} तरह के आइटम · {2}
Material not back from {} | {1} से सामान वापस नहीं आया
Event ended {}. Mark the return and log damage. | इवेंट {1} को खत्म हुआ। वापसी मार्क करें और नुकसान लिखें।
{} things need attention | {1} चीज़ों पर ध्यान देना है
Needs attention | ध्यान देना है
Tap the bell to see | देखने के लिए घंटी दबाएं

# ---------- dashboard ----------
My tasks | मेरे काम
My open tasks | मेरे बाकी काम
assigned to you and still open | आपको दिए गए और अभी बाकी
events running today | आज चल रहे इवेंट
{} · {} in the next 7 days | {1} · अगले 7 दिनों में {2}
{} in the next 7 days | अगले 7 दिनों में {1}
· {} in the next 7 days | · अगले 7 दिनों में {1}
Collected this month | इस महीने की वसूली
Events in 7 days | 7 दिनों में इवेंट
{} events | {1} इवेंट
{} guests to serve | {1} मेहमानों को खिलाना है
Pending from clients | क्लाइंट से बाकी
Out on rent now | अभी किराए पर बाहर
Upcoming events | आने वाले इवेंट
No upcoming events | कोई आने वाला इवेंट नहीं
New bookings will appear here. | नई बुकिंग यहां दिखेंगी।
Pipeline | पाइपलाइन
Enquiry / quoted | इन्क्वायरी / कोटेशन दिया
{} confirmed | {1} पक्के
{} this month | इस महीने {1}
Received · {} this month | मिला · इस महीने {1}
Where the money goes | पैसा कहां जा रहा है
Assigned to you | आपको दिया गया
No active setup tasks | कोई चालू सेटअप टास्क नहीं
Activity log | एक्टिविटी लॉग
No activity yet | अभी कोई एक्टिविटी नहीं
{} task | {1} काम
{} tasks | {1} काम
{} live | {1} लाइव
Crew update progress from their phones | क्रू अपने फ़ोन से प्रोग्रेस अपडेट करती है
Open tracker | ट्रैकर खोलें

# ---------- bookings / events ----------
New booking | नई बुकिंग
Add booking | बुकिंग जोड़ें
Edit booking | बुकिंग एडिट करें
Booking saved | बुकिंग सेव हो गई
Booking not found | बुकिंग नहीं मिली
Delete booking | बुकिंग डिलीट करें
Delete booking? | बुकिंग डिलीट करें?
Deleted booking | बुकिंग डिलीट की
Back to bookings | बुकिंग पर वापस
Every enquiry, quotation and confirmed event in one diary. | हर इन्क्वायरी, कोटेशन और पक्का इवेंट एक ही डायरी में।
Enquiry, quotation or confirmed event | इन्क्वायरी, कोटेशन या पक्का इवेंट
Search client, venue or phone | क्लाइंट, वेन्यू या फ़ोन खोजें
Search client or number | क्लाइंट या नंबर खोजें
No bookings here | यहां कोई बुकिंग नहीं
Try another filter or add a new booking. | कोई और फ़िल्टर चुनें या नई बुकिंग जोड़ें।
No bookings on this day. | इस दिन कोई बुकिंग नहीं।
No events in this period | इस समय में कोई इवेंट नहीं
Event | इवेंट
Event name | इवेंट का नाम
Event type | इवेंट टाइप
Auto: client + event type | अपने आप: क्लाइंट + इवेंट टाइप
Client name | क्लाइंट का नाम
Client email | क्लाइंट का ईमेल
Client GSTIN (for B2B) | क्लाइंट जीएसटीआईएन (बी2बी के लिए)
Venue | वेन्यू
e.g. Rambagh Lawn, Jaipur | जैसे: रामबाग लॉन, जयपुर
Start date | शुरू की तारीख
End date (multi-day) | आखिरी तारीख (कई दिन का इवेंट)
End date cannot be before the start date | आखिरी तारीख शुरू की तारीख से पहले नहीं हो सकती
Start time | शुरू का समय
Guests | मेहमान
Guests (pax) | मेहमान (लोग)
Package value | पैकेज की रकम
Package value (₹) | पैकेज की रकम (₹)
Stage | स्टेज
Notes for team | टीम के लिए नोट्स
Enquiry | इन्क्वायरी
Quoted | कोटेशन दिया
Confirmed | पक्का
Setup | सेटअप
Completed | पूरा हुआ
Closed | बंद
Cancelled | कैंसल हुआ
Cancel event | इवेंट कैंसल करें
Wedding | शादी
Reception | रिसेप्शन
Sangeet & Mehendi | संगीत और मेहंदी
Ring Ceremony | सगाई
Corporate Event | कॉर्पोरेट इवेंट
Birthday / Anniversary | जन्मदिन / सालगिरह
Religious / Jagran | धार्मिक / जागरण
Exhibition | प्रदर्शनी
Saved. Note: {} other booking(s) on these dates. | सेव हो गया। ध्यान दें: इन तारीखों पर {1} और बुकिंग हैं।
{} and its schedule will be removed. Invoices and payments stay in Money. | {1} और उसका शेड्यूल हट जाएगा। इनवॉइस और पेमेंट पैसा सेक्शन में रहेंगे।
Items & dispatch | आइटम और डिस्पैच
Booked items | बुक्ड आइटम
Reserved items | रिज़र्व आइटम
Add from godown | गोदाम से जोड़ें
Add tents, chairs, lights and DG sets for this event. | इस इवेंट के लिए टेंट, कुर्सियां, लाइट और डीजी सेट जोड़ें।
No items reserved | कोई आइटम रिज़र्व नहीं
Reserve item | आइटम रिज़र्व करें
Free on date | उस तारीख को खाली
Rate/day | रेट/दिन
Free quantity shown for {} | {1} के लिए खाली मात्रा दिखाई गई है
Free stock is checked against every other confirmed booking on {}. | {1} की हर दूसरी पक्की बुकिंग से मिलाकर खाली स्टॉक देखा जाता है।
Stock is held only when the booking is Confirmed, Setup or Live. Right now it is {}. | स्टॉक तभी रोका जाता है जब बुकिंग कन्फ़र्म, सेटअप या लाइव हो। अभी यह {1} है।
Stock short: {} | स्टॉक कम: {1}
Short {} | {1} कम
{} (free {}) | {1} (खाली {2})
{} needed · {} free today | {1} चाहिए · आज {2} खाली
Bill these items | इन आइटम का बिल बनाएं
Dispatch | डिस्पैच
Dispatch & return | डिस्पैच और वापसी
Dispatch to site | साइट पर भेजें
Mark dispatched | डिस्पैच मार्क करें
Mark returned | वापसी मार्क करें
Material return | सामान की वापसी
Count everything back into the godown | सब कुछ गिनकर गोदाम में वापस रखें
Confirm return | वापसी पक्की करें
Qty sent | भेजी मात्रा
Qty returned | वापस आई मात्रा
No damage | कोई नुकसान नहीं
Add damage charges to the client invoice | नुकसान का चार्ज क्लाइंट के इनवॉइस में जोड़ें
Return saved | वापसी सेव हो गई
Return saved. Damage charges added to {} | वापसी सेव हो गई। नुकसान का चार्ज {1} में जोड़ा गया
Damaged / missing: {} (sent {}) | टूटा / गुम: {1} ({2} भेजे थे)
Vehicle | गाड़ी
Vehicle number | गाड़ी नंबर
Vehicle: | गाड़ी:
Driver & mobile | ड्राइवर और मोबाइल
Driver: | ड्राइवर:
RJ14 GB 5421 | RJ14 GB 5421
On site since | साइट पर कब से
Delivery challan | डिलीवरी चालान
Send to driver | ड्राइवर को भेजें
Received by (client) | प्राप्तकर्ता (क्लाइंट)
Print / Save PDF | प्रिंट / पीडीएफ़ सेव करें
Print and PDF work on your deployed site. | प्रिंट और पीडीएफ़ आपकी लाइव साइट पर चलते हैं।
Run-sheet | रन-शीट
No run-sheet yet | अभी कोई रन-शीट नहीं
Add run-sheet entry | रन-शीट एंट्री जोड़ें
Add sound check, baarat, dinner and phera timings. | साउंड चेक, बारात, खाना और फेरों का समय जोड़ें।
Minute-by-minute plan for crew, halwai and coordinators | क्रू, हलवाई और कोऑर्डिनेटर के लिए मिनट-दर-मिनट प्लान
Day label | दिन का नाम
Day 1 | दिन 1
Day 1 · Sangeet | दिन 1 · संगीत
What happens | क्या होगा
Person in charge | ज़िम्मेदार व्यक्ति
Edit entry | एंट्री एडिट करें
Updated run-sheet for {} | {1} की रन-शीट अपडेट की
Setup tasks | सेटअप के काम
Add setup tasks inside a booking. | बुकिंग के अंदर सेटअप के काम जोड़ें।
Break the setup into tasks and assign crew. | सेटअप को कामों में बांटें और क्रू को दें।
Open a booking and add tasks like rigging, sound check, kitchen prep. | कोई बुकिंग खोलें और रिगिंग, साउंड चेक, रसोई की तैयारी जैसे काम जोड़ें।
No tasks | कोई काम नहीं
No tasks yet | अभी कोई काम नहीं
Client link | क्लाइंट लिंक
Share a client link | क्लाइंट को लिंक भेजें
The client sees only this event: stage, setup progress, run-sheet, bill, balance with your UPI, and a review form. They cannot see other clients, costs or margins. | क्लाइंट को सिर्फ़ यही इवेंट दिखेगा: स्टेज, सेटअप प्रोग्रेस, रन-शीट, बिल, बाकी रकम आपके यूपीआई के साथ, और रिव्यू फ़ॉर्म। दूसरे क्लाइंट, लागत या मार्जिन नहीं दिखेंगे।
Link valid for | लिंक कितने दिन चले
Create link | लिंक बनाएं
Copy link | लिंक कॉपी करें
Send to client | क्लाइंट को भेजें
Offline mode: a client link only opens on this same device. Connect Supabase so clients can open it on their own phone. | ऑफ़लाइन मोड: क्लाइंट लिंक सिर्फ़ इसी डिवाइस पर खुलेगा। सुपाबेस जोड़ें ताकि क्लाइंट अपने फ़ोन पर खोल सकें।
Created client link for {} | {1} के लिए क्लाइंट लिंक बनाया
Using package | पैकेज से:
Using package {} | पैकेज से: {1}
Profit est. | अनुमानित मुनाफ़ा
Costs so far | अब तक की लागत
Menu | मेन्यू
No menu saved on this booking yet | इस बुकिंग पर अभी कोई मेन्यू सेव नहीं
Pick dishes in the catering calculator and save them to this event. | कैटरिंग कैलकुलेटर में डिश चुनें और इस इवेंट में सेव करें।
Plan dishes in the catering calculator | कैटरिंग कैलकुलेटर में डिश का प्लान बनाएं
Open calculator | कैलकुलेटर खोलें
Menu for {} guests | {1} मेहमानों का मेन्यू
{} · {} pax | {1} · {2} लोग
{} · {} · {} pax | {1} · {2} · {3} लोग
{}% setup | {1}% सेटअप
· {}% setup | · {1}% सेटअप
{} tasks · {} item types reserved · {} run-sheet entries | {1} काम · {2} तरह के आइटम रिज़र्व · {3} रन-शीट एंट्री
Peak saaya / muhurat dates | साया / मुहूर्त की तारीखें
Peak saaya date | साया की तारीख
Add peak date | साया की तारीख जोड़ें
Add the wedding muhurat dates from your panchang. | अपने पंचांग से शादी के मुहूर्त की तारीखें जोड़ें।
Highlighted on the calendar so you price high-demand dates right | कैलेंडर पर अलग दिखेंगी ताकि भीड़ वाली तारीखों का सही रेट लगा सकें
e.g. Dev Uthani Ekadashi | जैसे: देव उठनी एकादशी
No dates added | कोई तारीख नहीं जोड़ी
Add date | तारीख जोड़ें
In {} days | {1} दिन में
{} days left | {1} दिन बाकी
Moved {} from {} to {} | {1} को {2} से {3} में किया

# ---------- inventory ----------
Godown stock with date-wise availability. Stock is held automatically for confirmed bookings. | तारीख के हिसाब से गोदाम स्टॉक। पक्की बुकिंग के लिए स्टॉक अपने आप रुक जाता है।
Add your tents, chairs, lights, DG sets and utensils. | अपने टेंट, कुर्सियां, लाइट, डीजी सेट और बर्तन जोड़ें।
Add inventory item | इन्वेंटरी आइटम जोड़ें
Add item | आइटम जोड़ें
Add stock | स्टॉक जोड़ें
Reduce stock | स्टॉक घटाएं
Edit item | आइटम एडिट करें
Delete item? | आइटम डिलीट करें?
Deleted inventory | इन्वेंटरी आइटम डिलीट किया
{} will be removed from inventory. Bookings that reserved it will lose that line. | {1} इन्वेंटरी से हट जाएगा। जिन बुकिंग में यह रिज़र्व है, उनसे यह लाइन हट जाएगी।
Godown item | गोदाम आइटम
Item name | आइटम का नाम
e.g. Maharaja velvet sofa | जैसे: महाराजा वेलवेट सोफ़ा
Total owned | कुल अपने पास
Total pieces | कुल पीस
Damaged / repair | टूटा / मरम्मत में
Under repair / damaged | मरम्मत में / टूटा
In godown | गोदाम में
Out on rent | किराए पर बाहर
Godown location | गोदाम में जगह
Rack B-4 | रैक B-4
Main godown | मुख्य गोदाम
Rent per day (₹) | रोज़ का किराया (₹)
Weight per piece (kg) | एक पीस का वज़न (किलो)
Used for truck loading | ट्रक लोडिंग में काम आता है
Search chairs, tent, DG… | कुर्सी, टेंट, डीजी… खोजें
Free on | इस दिन खाली:
Stock free on this date | इस तारीख को खाली स्टॉक
Item types | आइटम के प्रकार
Tents & Shamiana | टेंट और शामियाना
Furniture | फ़र्नीचर
Lighting & Sound | लाइट और साउंड
Power & DG | पावर और डीजी
Catering Utensils | कैटरिंग के बर्तन
Decor & Flooring | सजावट और फ़र्श
No items | कोई आइटम नहीं
Added {} items to {} | {2} में {1} आइटम जोड़े
{} items added to {} | {2} में {1} आइटम जोड़े
Reserved {} × {} for {} | {3} के लिए {1} × {2} रिज़र्व किए
{} × {} damaged at {} | {3} पर {1} × {2} टूटे

# ---------- catering ----------
Catering & ration calculator | कैटरिंग और राशन कैलकुलेटर
Pick the menu, set guests and buffer. Get the halwai’s samagri list, raw cost and a per-plate price. | मेन्यू चुनें, मेहमान और बफ़र डालें। हलवाई की सामग्री लिस्ट, कच्चे माल की लागत और प्रति प्लेट रेट पाएं।
Select dishes | डिश चुनें
Add dish | डिश जोड़ें
Edit dish | डिश एडिट करें
Delete dish? | डिश डिलीट करें?
Dish name | डिश का नाम
Course | कोर्स
Selected by default | पहले से चुना हुआ
Ingredient | सामग्री
Ingredients add up here. | सामग्री यहां जुड़ती जाएगी।
No dishes yet | अभी कोई डिश नहीं
Add your standard dishes with ingredient quantity per guest. | अपनी रोज़ की डिश, प्रति मेहमान सामग्री के साथ जोड़ें।
Quantity is per guest, in kg (or litres for milk). | मात्रा प्रति मेहमान है, किलो में (दूध के लिए लीटर)।
Use the same names as your mandi rates (e.g. Pure Desi Ghee, Milk (L)) so cost is calculated. | मंडी रेट वाले नाम ही लिखें (जैसे शुद्ध देसी घी, दूध (लीटर)) ताकि लागत निकल सके।
guests to serve | मेहमानों को खिलाना है
Halwai buffer | हलवाई बफ़र
Samagri list | सामग्री लिस्ट
Total raw material | कुल कच्चा माल
Mandi ₹/unit | मंडी ₹/यूनिट
Suggested price per plate | प्रति प्लेट सुझाया गया रेट
Margin on cost | लागत पर मार्जिन
Gas, labour, disposables | गैस, मज़दूरी, डिस्पोज़ेबल
For {} plates including buffer | बफ़र मिलाकर {1} प्लेट के लिए
for {} plates · {} dishes | {1} प्लेट · {2} डिश
Raw {} + overhead {} = cost {} · {}% margin | कच्चा माल {1} + ओवरहेड {2} = लागत {3} · {4}% मार्जिन
Save menu to booking | मेन्यू बुकिंग में सेव करें
Menu saved to | मेन्यू सेव हुआ:
Saved {}-dish menu for {} | {2} के लिए {1} डिश का मेन्यू सेव किया
Catering added to | कैटरिंग जोड़ा गया:
Added catering to {} | {1} में कैटरिंग जोड़ा
Welcome Drinks & Chaat | वेलकम ड्रिंक्स और चाट
Starters & Live Counters | स्टार्टर और लाइव काउंटर
Main Course | मेन कोर्स
Breads & Rice | रोटी और चावल
Sweets | मिठाई
Veg | वेज
Fresh Paneer | ताज़ा पनीर
Pure Desi Ghee | शुद्ध देसी घी
Milk (L) | दूध (लीटर)
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
Catering buffet: {} | कैटरिंग बुफ़े: {1}
Catering buffet: {} dishes ({}{}) | कैटरिंग बुफ़े: {1} डिश ({2}{3})

# ---------- vendors & POs ----------
Vendors & purchase orders | वेंडर और परचेज़ ऑर्डर
Florists, DJ, dairy, crockery partners. Issue POs and track what you owe. | फूल वाले, डीजे, डेयरी, क्रॉकरी पार्टनर। पीओ जारी करें और देखें कितना देना है।
Florist, DJ, dairy and other partners. | फूल वाले, डीजे, डेयरी और दूसरे पार्टनर।
Add your regular partners once, then issue POs in seconds. | अपने रोज़ के पार्टनर एक बार जोड़ें, फिर सेकंडों में पीओ बनाएं।
Vendor | वेंडर
Vendors | वेंडर
Vendor list | वेंडर लिस्ट
Add vendor | वेंडर जोड़ें
Edit vendor | वेंडर एडिट करें
Delete vendor? | वेंडर डिलीट करें?
Deleted vendor | वेंडर डिलीट किया
Add a vendor first | पहले वेंडर जोड़ें
Vendor / firm name | वेंडर / फ़र्म का नाम
Notes (rates, bank, UPI) | नोट्स (रेट, बैंक, यूपीआई)
Vendor PO | वेंडर पीओ
Vendor POs | वेंडर पीओ
Purchase order | परचेज़ ऑर्डर
Purchase orders | परचेज़ ऑर्डर
Issue PO | पीओ जारी करें
Issue purchase order | परचेज़ ऑर्डर जारी करें
Issue a PO when you book a florist, DJ or supplier. | फूल वाले, डीजे या सप्लायर को बुक करते समय पीओ जारी करें।
Save PO | पीओ सेव करें
Send PO | पीओ भेजें
PO | पीओ
PO date | पीओ की तारीख
Open POs | खुले पीओ
No POs | कोई पीओ नहीं
No POs yet | अभी कोई पीओ नहीं
What is ordered | क्या ऑर्डर किया
e.g. Stage & floral mandap | जैसे: स्टेज और फूलों का मंडप
Agreed amount ₹ | तय रकम ₹
Paid so far ₹ | अब तक दिया ₹
Paid cannot be more than the PO amount | दी गई रकम पीओ की रकम से ज़्यादा नहीं हो सकती
Paid to vendors | वेंडर को दिया
You owe vendors | वेंडर को देना है
Owe | देना है
Mark paid | पेड मार्क करें
For booking | किस बुकिंग के लिए
— General — | — सामान्य —
— General / overhead — | — सामान्य / ओवरहेड —
— None — | — कोई नहीं —
— Walk-in / no booking — | — बिना बुकिंग —
— Not linked — | — नहीं जुड़ा —
Floral & Decor | फूल और सजावट
DJ / Sound / Dhol | डीजे / साउंड / ढोल
Grocery & Dairy | किराना और डेयरी
Crockery Partner | क्रॉकरी पार्टनर
Generator / Diesel | जनरेटर / डीज़ल
Photo & Video | फ़ोटो और वीडियो
{} POs · {} total | {1} पीओ · कुल {2}

# ---------- staff ----------
Crew roster, daily attendance by event, advances and monthly payout. | क्रू की लिस्ट, इवेंट के हिसाब से रोज़ की हाज़िरी, एडवांस और महीने की तनख्वाह।
Add your labour and staff first. | पहले अपने मज़दूर और स्टाफ़ जोड़ें।
Add riggers, halwai, waiters, DG techs and helpers. | रिगर, हलवाई, वेटर, डीजी वाले और हेल्पर जोड़ें।
Add crew | क्रू जोड़ें
Add crew member | क्रू मेंबर जोड़ें
Edit crew member | क्रू मेंबर एडिट करें
Remove crew member? | क्रू मेंबर हटाएं?
Removed crew | क्रू हटाया
{} will be removed. Past attendance stays in reports. | {1} हट जाएंगे। पुरानी हाज़िरी रिपोर्ट में रहेगी।
No crew | कोई क्रू नहीं
No crew added | कोई क्रू नहीं जोड़ा
No crew yet | अभी कोई क्रू नहीं
Crew / Staff | क्रू / स्टाफ़
Rigger, halwai, waiter… | रिगर, हलवाई, वेटर…
Daily wage ₹ | रोज़ की मज़दूरी ₹
Attendance | हाज़िरी
Mark all present | सबको हाज़िर मार्क करें
Present | हाज़िर
Half | आधा दिन
Absent | गैरहाज़िर
Roster | रोस्टर
Payroll | तनख्वाह
Earned | कमाया
Net pay | देनी है
Crew wages | क्रू की मज़दूरी
Cash advance | नकद एडवांस
Half day counts as 0.5. Advances given this month are deducted. | आधा दिन 0.5 गिना जाता है। इस महीने दिया एडवांस कट जाता है।
Marked attendance for {} crew on {} | {2} को {1} क्रू की हाज़िरी लगाई
Paid {} wages to {} for {} | {3} के लिए {2} को {1} मज़दूरी दी
Advance {} to {} | {2} को {1} एडवांस
{}{} days this month | इस महीने {1}{2} दिन
{} ({}/day) | {1} ({2}/दिन)
{}/day | {1}/दिन
· crew: | · क्रू:

# ---------- live tracker / tasks ----------
Tracker | ट्रैकर
Tasks | काम
Task | काम
Setup task | सेटअप का काम
New setup task | नया सेटअप का काम
Edit task | काम एडिट करें
Delete task? | काम डिलीट करें?
Assigned to | किसको दिया
Unassigned | किसी को नहीं दिया
Progress | प्रोग्रेस
Progress % | प्रोग्रेस %
Note / blocker | नोट / रुकावट
My tasks only | सिर्फ़ मेरे काम
You can update only your own tasks | आप सिर्फ़ अपने काम अपडेट कर सकते हैं
No event on site | साइट पर कोई इवेंट नहीं
Setup style | सेटअप का तरीका

# ---------- invoices ----------
GST tax invoices, estimates and bills of supply. | जीएसटी टैक्स इनवॉइस, एस्टिमेट और बिल ऑफ़ सप्लाई।
Invoices & quotations | इनवॉइस और कोटेशन
Invoices & quotes | इनवॉइस और कोटेशन
New quotation or invoice | नया कोटेशन या इनवॉइस
Quotation / bill | कोटेशन / बिल
Quotation | कोटेशन
Quotations | कोटेशन
Quotation / Estimate | कोटेशन / एस्टिमेट
Invoice | इनवॉइस
Tax invoice | टैक्स इनवॉइस
Converted | कन्वर्ट हो गया
Client approved: make tax invoice | क्लाइंट ने मान लिया: टैक्स इनवॉइस बनाएं
Tax invoice {} created | टैक्स इनवॉइस {1} बन गया
Converted {} to {} | {1} को {2} में बदला
Create a quotation for this event. | इस इवेंट का कोटेशन बनाएं।
Create a quotation from a booking or tap New. | किसी बुकिंग से कोटेशन बनाएं या नया दबाएं।
Invoice not found | इनवॉइस नहीं मिला
It may have been deleted. | शायद डिलीट हो गया है।
Document | डॉक्यूमेंट
Document type | डॉक्यूमेंट टाइप
New document | नया डॉक्यूमेंट
Delete document | डॉक्यूमेंट डिलीट करें
Discard changes | बदलाव छोड़ दें
Leave without saving? | बिना सेव किए निकलें?
Your changes to this document are not saved yet. | इस डॉक्यूमेंट के बदलाव अभी सेव नहीं हुए हैं।
Bill to | बिल किसके नाम
Billing address | बिलिंग पता
Link to booking | बुकिंग से जोड़ें
Pick a booking | बुकिंग चुनें
Line items | आइटम की लिस्ट
Add line | लाइन जोड़ें
Remove line | लाइन हटाएं
Add a line, or import booked items / the menu. | लाइन जोड़ें, या बुक्ड आइटम / मेन्यू इम्पोर्ट करें।
No lines yet | अभी कोई लाइन नहीं
GST treatment | जीएसटी कैसे लगे
No GST | जीएसटी नहीं
Incl. GST | जीएसटी सहित
+ GST | + जीएसटी
(incl. GST) | (जीएसटी सहित)
GST rate % | जीएसटी रेट %
Place of supply | सप्लाई की जगह
Client outside {} (IGST) | क्लाइंट {1} से बाहर का (आईजीएसटी)
Due date | आखिरी तारीख
Payment due in (days) | पेमेंट कितने दिन में (दिन)
Notes printed on the bill | बिल पर छपने वाले नोट्स
Taxable value | टैक्सेबल वैल्यू
GST collected | वसूला गया जीएसटी
Output tax on invoices | इनवॉइस पर आउटपुट टैक्स
Not yet due | अभी समय बाकी
Record payment | पेमेंट दर्ज करें
Send reminders | याद दिलाएं
Taqaza | तकाज़ा
Every invoice is fully paid. Shabaash! | हर इनवॉइस पूरा पेड है। शाबाश!
No invoice is past its due date | कोई इनवॉइस लेट नहीं है
Receivables ({}) | लेना बाकी ({1})
{} invoices past due date | {1} इनवॉइस लेट
{} invoice past due date | {1} इनवॉइस लेट
1–30 days late | 1–30 दिन लेट
31–60 days late | 31–60 दिन लेट
60+ days | 60+ दिन
{} · {} · due {} | {1} · {2} · {3} तक
Total {} · paid {} | कुल {1} · पेड {2}
Created {} {}{} | {1} {2}{3} बनाया

# ---------- payments ----------
Payment | पेमेंट
Payment received | पेमेंट मिला
Payments received | मिले पेमेंट
Record payment received | मिला हुआ पेमेंट दर्ज करें
Record advances and balances as they come in. | एडवांस और बाकी रकम जैसे-जैसे आए, दर्ज करते जाएं।
Advance and balance payments show here. | एडवांस और बाकी के पेमेंट यहां दिखेंगे।
Collections, receipts and polite taqaza reminders. | वसूली, रसीदें और विनम्र तकाज़ा।
Enter the amount received | मिली रकम डालें
Advance / other (no invoice) | एडवांस / अन्य (बिना इनवॉइस)
Advance for this booking (no invoice yet) | इस बुकिंग का एडवांस (अभी इनवॉइस नहीं)
Booking (for advances) | बुकिंग (एडवांस के लिए)
Against | किसके बदले
against {} | {1} के बदले
UTR / cheque / note | यूटीआर / चेक / नोट
Balance after this payment: | इस पेमेंट के बाद बाकी:
Save payment | पेमेंट सेव करें
Delete payment? | पेमेंट डिलीट करें?
Deleted payment {} | पेमेंट {1} डिलीट किया
Payments linked to it stay in Payments but lose the link. | इससे जुड़े पेमेंट, पेमेंट में रहेंगे पर लिंक हट जाएगा।
No payments | कोई पेमेंट नहीं
No payments yet | अभी कोई पेमेंट नहीं
No pending payments | कोई पेमेंट बाकी नहीं
Payment receipt | पेमेंट की रसीद
Send receipt | रसीद भेजें
Recorded payment {}{} | पेमेंट {1}{2} दर्ज किया
Pay | पे करें
Pay to | किसको देना
UPI | यूपीआई
Cash | कैश
Bank Transfer | बैंक ट्रांसफ़र
Cheque | चेक
Card | कार्ड
{} · {}/month | {1} · {2}/महीना
UPI {} | यूपीआई {1}

# ---------- expenses ----------
Expense | खर्च
Add expense | खर्च जोड़ें
Edit expense | खर्च एडिट करें
Delete expense? | खर्च डिलीट करें?
No expenses | कोई खर्च नहीं
No expenses this month | इस महीने कोई खर्च नहीं
Diesel, transport, extra labour, repairs. Tag to a booking to see true event profit. | डीज़ल, ट्रांसपोर्ट, एक्स्ट्रा मज़दूर, मरम्मत। बुकिंग से जोड़ें ताकि इवेंट का असली मुनाफ़ा दिखे।
Diesel, transport, extra labour. | डीज़ल, ट्रांसपोर्ट, एक्स्ट्रा मज़दूर।
Add fuel, transport and other running costs. | डीज़ल, ट्रांसपोर्ट और दूसरे रोज़ के खर्च जोड़ें।
Diesel / Fuel | डीज़ल / ईंधन
Transport | ट्रांसपोर्ट
Extra Labour | एक्स्ट्रा मज़दूर
Food & Grocery | खाना और किराना
Venue / Rent | वेन्यू / किराया
Repair & Damage | मरम्मत और नुकसान
By category | कैटेगरी के हिसाब से
{} expense {} ({}) | {1} खर्च {2} ({3})

# ---------- reports ----------
Reports | रिपोर्ट
Profit by event | इवेंट के हिसाब से मुनाफ़ा
Completed events | पूरे हुए इवेंट
Billed (all time) | कुल बिल (शुरू से)
Billed vs costs, last six months | बिल बनाम लागत, पिछले छह महीने
Net profit (ex-GST) | शुद्ध मुनाफ़ा (जीएसटी के बिना)
Revenue uses invoices, or package value until invoiced | कमाई इनवॉइस से गिनी जाती है, इनवॉइस बनने तक पैकेज की रकम से
POs {} · Exp {} · Wages {} | पीओ {1} · खर्च {2} · मज़दूरी {3}
Vendors {} · Exp {} · Wages {} | वेंडर {1} · खर्च {2} · मज़दूरी {3}
Billed {} | बिल बना {1}
Costs {} | लागत {1}
GST {} | जीएसटी {1}
% margin | % मार्जिन
CSV | सीएसवी

# ---------- reviews ----------
Client reviews | क्लाइंट रिव्यू
Collect feedback after every event and reuse the best ones for Google and Instagram. | हर इवेंट के बाद राय लें और सबसे अच्छी गूगल और इंस्टाग्राम पर इस्तेमाल करें।
Average rating | औसत रेटिंग
Awaiting review | रिव्यू का इंतज़ार
Log a review | रिव्यू लिखें
Log review | रिव्यू लिखें
Logged review from {} | {1} का रिव्यू लिखा
Stars | स्टार
What they said | उन्होंने क्या कहा
Verified client | पक्का क्लाइंट
From client links | क्लाइंट लिंक से
Copy for Google | गूगल के लिए कॉपी करें
No reviews yet | अभी कोई रिव्यू नहीं
Share a client link after the event to collect ratings. | रेटिंग लेने के लिए इवेंट के बाद क्लाइंट लिंक भेजें।
{} completed event(s) have no review yet: | {1} पूरे हुए इवेंट का अभी रिव्यू नहीं:

# ---------- planner tools ----------
Quick calculators for site planning and loading. | साइट प्लानिंग और लोडिंग के लिए तुरंत कैलकुलेटर।
Seating & lawn | बैठक और लॉन
Area (sq ft) | जगह (वर्ग फ़ुट)
Theatre / conference rows | थिएटर / कॉन्फ़्रेंस की लाइनें
Round tables | गोल टेबल
Round Table | गोल टेबल
Full banquet (tables of 8) | पूरा बैंक्वेट (8 वाली टेबल)
Wedding mix (50% dining, lounges) | शादी मिक्स (50% खाना, लाउंज)
VIP sofas | वीआईपी सोफ़ा
Chairs | कुर्सियां
Chair | कुर्सी
Sofa | सोफ़ा
Tent | टेंट
Comfortable | आराम से
Tight but workable | थोड़ा तंग पर चलेगा
Too crowded | बहुत भीड़
{} sq ft per guest | प्रति मेहमान {1} वर्ग फ़ुट
· {}. Keep 20+ for weddings with buffet counters and a 6 ft fire exit corridor. | · {1}। बुफ़े काउंटर वाली शादियों में 20+ रखें और 6 फ़ुट का फ़ायर एग्ज़िट रास्ता छोड़ें।
Truck loading | ट्रक लोडिंग
Loading order | लोडिंग का क्रम
Heavy base first, delicate lights last | भारी सामान पहले, नाज़ुक लाइट आखिर में
Load | लोड
Within capacity for one trip. | एक चक्कर की क्षमता में है।
Over capacity: plan {} trips or a bigger vehicle to avoid overloading fines. | क्षमता से ज़्यादा: {1} चक्कर लगाएं या बड़ी गाड़ी लें, वरना ओवरलोडिंग का जुर्माना।
Approx. load {} kg | लगभग {1} किलो लोड
{} / {} kg | {1} / {2} किलो
{} · {} kg | {1} · {2} किलो
set weight in inventory | इन्वेंटरी में वज़न डालें
Nothing to load | लोड करने को कुछ नहीं
Reserve items in a booking first. | पहले किसी बुकिंग में आइटम रिज़र्व करें।
No bookings with items | आइटम वाली कोई बुकिंग नहीं
Bolero Pickup | बोलेरो पिकअप
Tata 407 | टाटा 407
Eicher 14 ft | आयशर 14 फ़ुट
Heavy Truck (10 wheel) | भारी ट्रक (10 पहिया)

# ---------- team & access ----------
Who can log in, what each role can see and change, and a log of every action. | कौन लॉगिन कर सकता है, हर रोल क्या देख और बदल सकता है, और हर काम का लॉग।
Add employee | कर्मचारी जोड़ें
Create their login. You decide what they can see and do. | उनका लॉगिन बनाएं। आप तय करें कि वे क्या देख और कर सकते हैं।
Full name | पूरा नाम
Login ID: mobile number or email | लॉगिन आईडी: मोबाइल नंबर या ईमेल
They type this on the login screen | लॉगिन स्क्रीन पर यही डालेंगे
Change it if you like. Minimum 6 characters. | चाहें तो बदल दें। कम से कम 6 अक्षर।
Link to crew record (for “My tasks”) | क्रू रिकॉर्ड से जोड़ें (“मेरे काम” के लिए)
After adding, tap | जोड़ने के बाद, उनके नाम के आगे
next to their name to give or remove access to any section. | दबाकर किसी भी सेक्शन का एक्सेस दें या हटाएं।
Create login | लॉगिन बनाएं
Login created | लॉगिन बन गया
Password changed | पासवर्ड बदल गया
Password reset | पासवर्ड रीसेट हो गया
Login ID | लॉगिन आईडी
Save or send this now. For safety the password is not shown again. You can always set a new one. | इसे अभी सेव करें या भेज दें। सुरक्षा के लिए पासवर्ड दोबारा नहीं दिखेगा। नया कभी भी बना सकते हैं।
Send on WhatsApp | व्हाट्सऐप पर भेजें
Roles & permissions | रोल और परमिशन
Custom role | अपना रोल
Create custom role | अपना रोल बनाएं
Role name | रोल का नाम
e.g. Decor Head, Store Keeper | जैसे: डेकोर हेड, स्टोर कीपर
Copy permissions from | परमिशन यहां से कॉपी करें
Starts with view-only access. Adjust the matrix after. | शुरुआत सिर्फ़ देखने के एक्सेस से। बाद में टेबल में बदलें।
A role with this name exists | इस नाम का रोल पहले से है
Created role | रोल बनाया
Role updated | रोल अपडेट हो गया
No access | एक्सेस नहीं
View only | सिर्फ़ देखें
Full | पूरा
Full access to everything | सब कुछ का पूरा एक्सेस
Can change: | बदल सकते हैं:
· views {} more | · {1} और देख सकते हैं
Custom access | अलग एक्सेस
App login | ऐप लॉगिन
Remove member | मेंबर हटाएं
They lose access to this business immediately. Their past activity stays in the log. | इनका इस बिज़नेस का एक्सेस तुरंत बंद हो जाएगा। पुरानी एक्टिविटी लॉग में रहेगी।
Removed {} from the team | {1} को टीम से हटाया
Added {} as {} | {1} को {2} बनाकर जोड़ा
Changed {}'s role to {} | {1} का रोल {2} किया
Updated access for {} | {1} का एक्सेस बदला
Access updated | एक्सेस अपडेट हो गया
What {} can do | {1} क्या कर सकते हैं
Role default · {} | रोल के हिसाब से · {1}
Change only what is different for this person. Everything else follows their role. | इस व्यक्ति के लिए सिर्फ़ वही बदलें जो अलग है। बाकी सब उनके रोल के हिसाब से चलेगा।
Set a new password (leave empty to keep) | नया पासवर्ड डालें (पुराना रखना हो तो खाली छोड़ें)
Use this when they forget their password. Then share it with them. | जब वे पासवर्ड भूल जाएं तब इसे इस्तेमाल करें। फिर उन्हें बता दें।
These rules are enforced by the server, not just hidden in the app. | ये नियम सर्वर पर लागू होते हैं, सिर्फ़ ऐप में छुपाए नहीं जाते।
= also delete. Owner always has full access. {} | = डिलीट भी। ओनर के पास हमेशा पूरा एक्सेस होता है। {1}
Owner | ओनर (मालिक)
Manager | मैनेजर
Accountant | अकाउंटेंट
Site Supervisor | साइट सुपरवाइज़र
(you) | (आप)
(Super Admin) | (सुपर एडमिन)
Turned off in Settings | सेटिंग्स में बंद है

# ---------- settings ----------
Business profile | बिज़नेस की जानकारी
Business profile, billing defaults, modules and data. | बिज़नेस की जानकारी, बिल की सेटिंग, सेक्शन और डेटा।
Settings saved | सेटिंग्स सेव हो गईं
Save settings | सेटिंग्स सेव करें
Changes save instantly | बदलाव तुरंत सेव होते हैं
Updated business settings | बिज़नेस सेटिंग्स अपडेट कीं
Tagline under your name | आपके नाम के नीचे टैगलाइन
e.g. Tent · Catering · Royal Weddings since 1998 | जैसे: टेंट · कैटरिंग · शाही शादियां 1998 से
Website / Instagram | वेबसाइट / इंस्टाग्राम
e.g. utsavevents.in | जैसे: utsavevents.in
Printed on invoices, challans, receipts and the client portal | इनवॉइस, चालान, रसीदों और क्लाइंट पेज पर छपता है
GSTIN | जीएसटीआईएन
State code (GST) | राज्य कोड (जीएसटी)
Bank & branch | बैंक और ब्रांच
Account number | अकाउंट नंबर
IFSC | आईएफ़एससी
UPI ID | यूपीआई आईडी
Invoice prefix | इनवॉइस प्रीफ़िक्स
Quotation prefix | कोटेशन प्रीफ़िक्स
Default GST % | डिफ़ॉल्ट जीएसटी %
Default SAC code | डिफ़ॉल्ट एसएसी कोड
Default catering margin % | डिफ़ॉल्ट कैटरिंग मार्जिन %
Catering overhead per plate ₹ | प्रति प्लेट कैटरिंग ओवरहेड ₹
Terms | शर्तें
Terms printed on bills | बिल पर छपने वाली शर्तें
Business type & sections | बिज़नेस टाइप और सेक्शन
Hide what you don’t use. A tent house can switch off catering, a caterer can switch off inventory. | जो काम में नहीं आता उसे छुपा दें। टेंट हाउस कैटरिंग बंद कर सकता है, कैटरर इन्वेंटरी बंद कर सकता है।
Your branding on bills | बिल पर आपकी ब्रांडिंग
Logo, stamp and colour appear on every invoice, quotation, challan, receipt and your client page. | लोगो, स्टैम्प और रंग हर इनवॉइस, कोटेशन, चालान, रसीद और आपके क्लाइंट पेज पर दिखते हैं।
Business logo | बिज़नेस लोगो
PNG or JPG. Square or round logos look best. | पीएनजी या जेपीजी। चौकोर या गोल लोगो सबसे अच्छे लगते हैं।
Stamp / signature | स्टैम्प / सिग्नेचर
Printed above “Authorised signatory”. | “ऑथराइज़्ड सिग्नेटरी” के ऊपर छपता है।
Bill colour | बिल का रंग
Used for your name, headings and table on bills | बिल पर आपके नाम, हेडिंग और टेबल में लगता है
Pick any colour | कोई भी रंग चुनें
Colour {} | रंग {1}
Live preview | लाइव प्रीव्यू
Choose an image file (PNG or JPG) | इमेज फ़ाइल चुनें (पीएनजी या जेपीजी)
This image is over 5 MB. Choose a smaller one. | यह इमेज 5 एमबी से बड़ी है। छोटी चुनें।
Could not read this image. Try a PNG or JPG. | यह इमेज पढ़ी नहीं जा सकी। पीएनजी या जेपीजी ट्राई करें।
Logo saved. It now shows on all bills. | लोगो सेव हो गया। अब सभी बिल पर दिखेगा।
Stamp saved | स्टैम्प सेव हो गया
Updated business logo | बिज़नेस लोगो अपडेट किया
Updated stamp / signature | स्टैम्प / सिग्नेचर अपडेट किया
Data & backup | डेटा और बैकअप
Download backup | बैकअप डाउनलोड करें
Copy backup | बैकअप कॉपी करें
Restore | रीस्टोर करें
Restore from file | फ़ाइल से रीस्टोर करें
Restore backup? | बैकअप रीस्टोर करें?
{} records from {} ({}) will be merged in. Records with the same ID are replaced. | {2} ({3}) के {1} रिकॉर्ड जुड़ जाएंगे। एक जैसी आईडी वाले रिकॉर्ड बदल जाएंगे।
Backup restored | बैकअप रीस्टोर हो गया
Restored backup | बैकअप रीस्टोर किया
That file is not an SabManage backup | यह सबमैनेज का बैकअप फ़ाइल नहीं है
Exported data backup | डेटा बैकअप निकाला
a backup | एक बैकअप
Cloud sync is on. Data is stored in your Supabase project. | क्लाउड सिंक चालू है। डेटा आपके सुपाबेस प्रोजेक्ट में है।
To let your team log in from their own phones, connect a free Supabase project. Steps are in the README that comes with the app (about 10 minutes). | टीम अपने फ़ोन से लॉगिन कर सके, इसके लिए फ़्री सुपाबेस प्रोजेक्ट जोड़ें। तरीका ऐप के README में है (लगभग 10 मिनट)।
Copy this text | यह टेक्स्ट कॉपी करें
Long-press or select all, then copy. | देर तक दबाएं या सब सेलेक्ट करें, फिर कॉपी करें।
Could not load | लोड नहीं हो सका

# ---------- plan card, blocked screen ----------
Valid till | कब तक वैलिड
Valid till {} · {} days left | {1} तक वैलिड · {2} दिन बाकी
Valid till {} · {} day left | {1} तक वैलिड · {2} दिन बाकी
Expired on {} | {1} को खत्म हुआ
No expiry date | कोई आखिरी तारीख नहीं
· Support {} | · सपोर्ट {1}
Renew / upgrade | रिन्यू / अपग्रेड करें
Manage in console | कंसोल में बदलें
Access is | एक्सेस अभी
paused | रुका हुआ है
for this business. | इस बिज़नेस के लिए।
Your data is safe. {} has paused this account, usually because of a pending renewal. Contact support to restore access. | आपका डेटा सुरक्षित है। {1} ने यह अकाउंट रोका है, आमतौर पर रिन्यूअल बाकी होने की वजह से। एक्सेस वापस पाने के लिए सपोर्ट से बात करें।
Get access back | एक्सेस वापस पाएं
Your other businesses | आपके दूसरे बिज़नेस
Trial | ट्रायल
Active | चालू
Expired | खत्म
Suspended | रुका हुआ
Basic | बेसिक
Pro | प्रो
Enterprise | एंटरप्राइज़

# ---------- Super Admin console ----------
Every business on your platform: plans, renewals, users and access. | आपके प्लेटफ़ॉर्म का हर बिज़नेस: प्लान, रिन्यूअल, यूज़र और एक्सेस।
Add business | बिज़नेस जोड़ें
Loading all businesses… | सभी बिज़नेस लोड हो रहे हैं…
Fetching plans, users and activity. | प्लान, यूज़र और एक्टिविटी ला रहे हैं।
Businesses | बिज़नेस
Businesses ({}) | बिज़नेस ({1})
Users ({}) | यूज़र ({1})
Plans & support | प्लान और सपोर्ट
{} users in total | कुल {1} यूज़र
Paid & active | पेड और चालू
Monthly value {} | महीने की कमाई {1}
On free trial | फ़्री ट्रायल पर
{} expire within 7 days | {1} का 7 दिन में खत्म
Expired / paused | खत्म / रुके हुए
Read-only or blocked | सिर्फ़ देखने लायक या बंद
Search business, owner, phone or city | बिज़नेस, ओनर, फ़ोन या शहर खोजें
All | सभी
Paid | पेड
Expiring soon | जल्द खत्म होने वाले
No businesses here | यहां कोई बिज़नेस नहीं
Try another filter. New sign-ups appear here automatically. | कोई और फ़िल्टर चुनें। नए साइन-अप यहां अपने आप दिखेंगे।
{}{}since {} | {1}{2}{3} से
Plan | प्लान
Team · Bookings | टीम · बुकिंग
ended {}d ago | {1} दिन पहले खत्म
no expiry | कोई आखिरी तारीख नहीं
Plan & access | प्लान और एक्सेस
Last activity {} · {} bills | आखिरी एक्टिविटी {1} · {2} बिल
Plan, expiry and access for this business | इस बिज़नेस का प्लान, आखिरी तारीख और एक्सेस
Active (paid) | चालू (पेड)
Suspended (block login) | रोका गया (लॉगिन बंद)
Or extend by | या इतना बढ़ाएं
No change | कोई बदलाव नहीं
+1 month | +1 महीना
+3 months | +3 महीने
+6 months | +6 महीने
+1 year | +1 साल
Private note (only Super Admins see this) | निजी नोट (सिर्फ़ सुपर एडमिन को दिखेगा)
e.g. Paid ₹9,999 by UPI on 12 Oct, yearly plan | जैसे: 12 अक्टू को यूपीआई से ₹9,999 मिले, सालाना प्लान
After expiry the business can still log in and see data, but cannot add or change anything. Suspended blocks the app completely. | खत्म होने के बाद बिज़नेस लॉगिन करके डेटा देख सकता है, पर कुछ जोड़ या बदल नहीं सकता। सस्पेंड करने पर ऐप पूरा बंद हो जाता है।
Search name, email, mobile or business | नाम, ईमेल, मोबाइल या बिज़नेस खोजें
Add Super Admin | सुपर एडमिन जोड़ें
Add a Super Admin | सुपर एडमिन जोड़ें
They must have signed up already. | उनका अकाउंट पहले से बना होना चाहिए।
Their email or mobile number | उनका ईमेल या मोबाइल नंबर
Give access | एक्सेस दें
Super Admin added | सुपर एडमिन जोड़ा गया
· last login | · आखिरी लॉगिन
· never logged in | · कभी लॉगिन नहीं किया
Not in any business | किसी बिज़नेस में नहीं
Blocked | ब्लॉक है
Reset password | पासवर्ड रीसेट करें
Make Super Admin | सुपर एडमिन बनाएं
Remove Super Admin | सुपर एडमिन हटाएं
Block login | लॉगिन ब्लॉक करें
Unblock | अनब्लॉक करें
No users found | कोई यूज़र नहीं मिला
Give Super Admin access? | सुपर एडमिन एक्सेस दें?
Remove Super Admin access? | सुपर एडमिन एक्सेस हटाएं?
{} will see and change every business on the platform. | {1} प्लेटफ़ॉर्म का हर बिज़नेस देख और बदल सकेंगे।
{} will lose access to the Super Admin console. | {1} का सुपर एडमिन कंसोल का एक्सेस हट जाएगा।
You cannot remove your own Super Admin access. | आप अपना सुपर एडमिन एक्सेस खुद नहीं हटा सकते।
No account with this email or mobile. Ask them to sign up first. | इस ईमेल या मोबाइल का कोई अकाउंट नहीं। पहले उनसे साइन अप करवाएं।
Block this login? | यह लॉगिन ब्लॉक करें?
Unblock this login? | यह लॉगिन अनब्लॉक करें?
{} ({}) will not be able to log in until you unblock. Their data stays. | {1} ({2}) तब तक लॉगिन नहीं कर पाएंगे जब तक आप अनब्लॉक न करें। उनका डेटा रहेगा।
{} will be able to log in again. | {1} फिर से लॉगिन कर पाएंगे।
Login blocked | लॉगिन ब्लॉक हो गया
Login unblocked | लॉगिन अनब्लॉक हो गया
Login not found | लॉगिन नहीं मिला
User not found | यूज़र नहीं मिला
Business not found | बिज़नेस नहीं मिला
Shown to businesses on renewal reminders, expiry screens and the Settings page. | रिन्यूअल की याद, एक्सपायरी स्क्रीन और सेटिंग्स पेज पर बिज़नेस को दिखता है।
Platform name | प्लेटफ़ॉर्म का नाम
Free trial for new sign-ups (days) | नए साइन-अप के लिए फ़्री ट्रायल (दिन)
Support name | सपोर्ट का नाम
Support WhatsApp number | सपोर्ट का व्हाट्सऐप नंबर
Businesses tap “Renew” and it opens WhatsApp to this number | बिज़नेस “रिन्यू” दबाएंगे तो इसी नंबर पर व्हाट्सऐप खुलेगा
Support email | सपोर्ट ईमेल
Let new businesses sign up on their own (free trial). Turn off to add businesses only from here. | नए बिज़नेस खुद साइन अप कर सकें (फ़्री ट्रायल)। बंद करने पर बिज़नेस सिर्फ़ यहीं से जुड़ेंगे।
Plan {} name | प्लान {1} का नाम
Plan {} price per month (₹) | प्लान {1} की महीने की कीमत (₹)
New businesses start on a {}-day free trial. | नए बिज़नेस {1} दिन के फ़्री ट्रायल से शुरू होते हैं।
Platform settings saved | प्लेटफ़ॉर्म सेटिंग्स सेव हो गईं
Add a business | बिज़नेस जोड़ें
Creates the business and its owner login. | बिज़नेस और उसके ओनर का लॉगिन बनाता है।
Owner name | ओनर का नाम
Owner mobile | ओनर का मोबाइल
Owner login ID: mobile or email | ओनर की लॉगिन आईडी: मोबाइल या ईमेल
Owner password | ओनर का पासवर्ड
Create business | बिज़नेस बनाएं
Set password | पासवर्ड सेट करें
Share it with them on WhatsApp after saving. | सेव करने के बाद उन्हें व्हाट्सऐप पर भेज दें।
Jaipur | जयपुर
Rajasthan | राजस्थान
Support | सपोर्ट
Updated | अपडेट हो गया
`);
I18N.load(`
# ---------- second pass (found by the screen crawler) ----------
Home | मुख्य पेज
Item name | आइटम का नाम
Setup progress by event. Crew update their own tasks; supervisors see everything. | हर इवेंट का सेटअप कितना हुआ। क्रू अपने काम अपडेट करती है; सुपरवाइज़र सब देखते हैं।
Quoted amount; used until an invoice is made | बताई गई रकम; इनवॉइस बनने तक यही गिनी जाएगी
Offline mode. Data is stored in this browser only; take backups regularly. | ऑफ़लाइन मोड. डेटा सिर्फ़ इसी ब्राउज़र में है; नियमित बैकअप लेते रहें।
Ingredients, one per line: Name = kg per guest | सामग्री, हर लाइन में एक: नाम = प्रति मेहमान किलो
(usual) | (आम तौर पर)
+10% (usual) | +10% (आम तौर पर)
{}/{} picked | {1}/{2} चुनी
Add to invoice | इनवॉइस में जोड़ें
From godown | गोदाम से
Line | लाइन
Book | बुक करें
Free date | खाली तारीख
Move back | पीछे करें
No event | कोई इवेंट नहीं
No menu yet | अभी कोई मेन्यू नहीं
No vendors | कोई वेंडर नहीं
Record | दर्ज करें
Return | वापसी
Shortage | कमी
Service | सेवा
Advance paid | एडवांस दिया
You need | आपको चाहिए
Outside | बाहर
To: | किसको:
Your business name | आपके बिज़नेस का नाम
Created | बनाया
WhatsApp | व्हाट्सऐप
English | अंग्रेज़ी
Language: English | भाषा: अंग्रेज़ी
on WhatsApp | व्हाट्सऐप पर
{} open | {1} बाकी
{} pcs | {1} पीस
{} site | {1} साइट
{} sites | {1} साइट
{} present | {1} हाज़िर
{} half day | {1} आधा दिन
{} absent | {1} गैरहाज़िर
{} reviews | {1} रिव्यू
{} review | {1} रिव्यू
5-star | 5-स्टार
Pay {} | {1} देना है
Owe {} | {1} देना है
{} (you) | {1} (आप)
= see only. | = सिर्फ़ देखें।
= add and change. | = जोड़ें और बदलें।
= also delete. Owner always has full access. | = डिलीट भी। ओनर के पास हमेशा पूरा एक्सेस होता है।
{} invoice is past due date | {1} इनवॉइस लेट है
{} invoices are past due date | {1} इनवॉइस लेट हैं
{} Rupees only | {1} रुपये मात्र
Tax invoice {} | टैक्स इनवॉइस {1}
Quotation {} | कोटेशन {1}
Saved {} | {1} सेव हो गया
Saved {} ({}) | {1} सेव किया ({2})
{} · Today | {1} · आज
{} · Tomorrow | {1} · कल
{} · In {} days | {1} · {2} दिन में
{} · Running now | {1} · अभी चल रहा
{} margin | {1} मार्जिन
{} on {} will be removed. | {2} का {1} हट जाएगा।
will be removed. Past attendance stays in reports. | हट जाएगा। पुरानी हाज़िरी रिपोर्ट में रहेगी।
{} package: {} | {1} पैकेज: {2}
{} to {} | {1} से {2}
— to {} | — से {1}
{}, {} events | {1}, {2} इवेंट
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
Added dish {} | डिश जोड़ी: {1}
Updated dish {} | डिश अपडेट की: {1}
Created booking {} | बुकिंग बनाई: {1}
Updated booking {} | बुकिंग अपडेट की: {1}
Added inventory: {} | इन्वेंटरी जोड़ी: {1}
Updated inventory: {} | इन्वेंटरी अपडेट की: {1}
Deleted inventory {} | इन्वेंटरी डिलीट की: {1}
Added task {} | काम जोड़ा: {1}
Updated task {} | काम अपडेट किया: {1}
Added vendor {} | वेंडर जोड़ा: {1}
Updated vendor {} | वेंडर अपडेट किया: {1}
Deleted vendor {} | वेंडर डिलीट किया: {1}
Added crew {} | क्रू जोड़ा: {1}
Updated crew {} | क्रू अपडेट किया: {1}
Removed crew {} | क्रू हटाया: {1}
Issued {} to {} | {2} को {1} जारी किया
Updated {} to {} | {2} का {1} अपडेट किया
Deleted booking {} | बुकिंग डिलीट की: {1}
Deleted {} | {1} डिलीट किया
{} confirmed | {1} पक्का हुआ
Dispatched material for {} | {1} का सामान भेजा
Material returned from {} | {1} से सामान वापस आया
Added damage charges to {} | {1} में नुकसान का चार्ज जोड़ा
Created {} {} for {} | {3} के लिए {1} {2} बनाया
Created quotation {} | कोटेशन {1} बनाया
Created invoice {} | इनवॉइस {1} बनाया
Created role {} | रोल बनाया: {1}
Added {} expense {} | {1} खर्च जोड़ा {2}
{}: {}% | {1}: {2}%
{}: {} → {} | {1}: {2} → {3}
Damage recovery: {} | नुकसान की वसूली: {1}
Can change: {} | बदल सकते हैं: {1}
31–60 days | 31–60 दिन
{} invoices | {1} इनवॉइस
{} invoice | {1} इनवॉइस
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
Valid till {} | {1} तक वैलिड
views {} more | {1} और देख सकते हैं
`);
I18N.load(`
# ---------- website, blog, enquiries ----------
Website | वेबसाइट
Blog | ब्लॉग
Enquiries | इन्क्वायरी (पूछताछ)
This is what visitors see on your website's home, About and Contact sections. Prices come from | यही विज़िटर को आपकी वेबसाइट के होम, अबाउट और कॉन्टैक्ट में दिखता है। दाम यहां से आते हैं:
Open website | वेबसाइट खोलें
Website content | वेबसाइट का कंटेंट
Changes show on the website within about a minute. | बदलाव लगभग एक मिनट में वेबसाइट पर दिख जाते हैं।
Brand name on the website | वेबसाइट पर ब्रांड का नाम
Company / legal name (for Terms & Privacy) | कंपनी / लीगल नाम (टर्म्स और प्राइवेसी के लिए)
Headline | हेडलाइन
The big line at the top of the home page | होम पेज के सबसे ऊपर की बड़ी लाइन
About us (English) | हमारे बारे में (अंग्रेज़ी)
About us (Hindi, optional) | हमारे बारे में (हिंदी, ज़रूरी नहीं)
Shown when a visitor switches the website to Hindi. Leave empty to show the English text. | जब विज़िटर वेबसाइट को हिंदी में करे तब दिखेगा। खाली छोड़ें तो अंग्रेज़ी टेक्स्ट दिखेगा।
Phone number | फ़ोन नंबर
WhatsApp number | व्हाट्सऐप नंबर
The green WhatsApp buttons open a chat with this number | हरे व्हाट्सऐप बटन इसी नंबर पर चैट खोलेंगे
Working hours | काम का समय
Office address | ऑफ़िस का पता
Google Maps link | गूगल मैप्स लिंक
Instagram link | इंस्टाग्राम लिंक
Facebook link | फ़ेसबुक लिंक
YouTube link | यूट्यूब लिंक
LinkedIn link | लिंक्डइन लिंक
Show plans and prices on the website | वेबसाइट पर प्लान और दाम दिखाएं
Free trial shown on the website: {} days · Sign-up button {} | वेबसाइट पर फ़्री ट्रायल: {1} दिन · साइन-अप बटन {2}
shown | दिख रहा है
hidden (sign-ups are off) | छुपा है (साइन-अप बंद है)
Save website | वेबसाइट सेव करें
Website saved | वेबसाइट सेव हो गई
Links must start with https:// | लिंक https:// से शुरू होने चाहिए
Loading posts… | पोस्ट लोड हो रहे हैं…
Search posts | पोस्ट खोजें
Open blog | ब्लॉग खोलें
New post | नई पोस्ट
Published | पब्लिश्ड (लाइव)
Drafts | ड्राफ़्ट
Draft | ड्राफ़्ट
Edited {} | {1} को बदला
No posts here | यहां कोई पोस्ट नहीं
No blog posts yet | अभी कोई ब्लॉग पोस्ट नहीं
Try another filter. | कोई और फ़िल्टर चुनें।
Write tips, wedding season guides or customer stories. Posts help your website show up on Google. | टिप्स, शादी के सीज़न की गाइड या कस्टमर की कहानियां लिखें। पोस्ट से आपकी वेबसाइट गूगल पर दिखने लगती है।
Write your first post | अपनी पहली पोस्ट लिखें
Post not found | पोस्ट नहीं मिली
Delete this post? | यह पोस्ट डिलीट करें?
“{}” will be removed from the website. This cannot be undone. | “{1}” वेबसाइट से हट जाएगी। यह वापस नहीं होगा।
Delete post | पोस्ट डिलीट करें
Post deleted | पोस्ट डिलीट हो गई
All posts | सभी पोस्ट
Not saved yet | अभी सेव नहीं हुई
Post title | पोस्ट का टाइटल
post-address | पोस्ट-एड्रेस
Cover image | कवर इमेज
Wide photo, 1600 × 900 looks best | चौड़ी फ़ोटो, 1600 × 900 सबसे अच्छी लगती है
Upload cover | कवर अपलोड करें
Change cover | कवर बदलें
Short summary | छोटा सारांश
One or two lines shown on the blog list and on Google | एक-दो लाइन जो ब्लॉग लिस्ट और गूगल पर दिखेंगी
Post | पोस्ट
Heading | हेडिंग
Small heading | छोटी हेडिंग
Normal text | सामान्य टेक्स्ट
Bold | बोल्ड
Italic | इटैलिक
Underline | अंडरलाइन
Bullet list | बुलेट लिस्ट
Numbered list | नंबर वाली लिस्ट
Quote | कोटेशन
Add link | लिंक जोड़ें
Add picture | पिक्चर जोड़ें
Divider | डिवाइडर
Clear formatting | फ़ॉर्मेटिंग हटाएं
Publish | पब्लिश करें
Live at | यहां लाइव है:
Drafts are visible only to Super Admins. | ड्राफ़्ट सिर्फ़ सुपर एडमिन को दिखते हैं।
Update post | पोस्ट अपडेट करें
Move back to draft | वापस ड्राफ़्ट में करें
Save draft | ड्राफ़्ट सेव करें
Language of this post | इस पोस्ट की भाषा
Tags | टैग
wedding, catering, tips | वेडिंग, कैटरिंग, टिप्स
Separate with commas | कॉमा से अलग करें
Author | लेखक
Google & sharing (SEO) | गूगल और शेयरिंग (एसईओ)
Google title | गूगल टाइटल
Same as the post title | पोस्ट के टाइटल जैसा
Best under 60 letters | 60 अक्षरों से कम सबसे अच्छा
Google description | गूगल डिस्क्रिप्शन
Same as the short summary | छोटे सारांश जैसा
Best under 155 letters | 155 अक्षरों से कम सबसे अच्छा
Paste the link (https://…) | लिंक पेस्ट करें (https://…)
Uploading… | अपलोड हो रहा है…
Cover uploaded | कवर अपलोड हो गया
Picture added | पिक्चर जुड़ गई
Picture caption (optional) | पिक्चर का कैप्शन (ज़रूरी नहीं)
This image is over 15 MB. Choose a smaller one. | यह इमेज 15 एमबी से बड़ी है। छोटी चुनें।
GIF must be under 3 MB | जीआईएफ़ 3 एमबी से छोटी होनी चाहिए
Add a title first | पहले टाइटल डालें
Write something before publishing | पब्लिश करने से पहले कुछ लिखें
Published on your website | आपकी वेबसाइट पर पब्लिश हो गई
Draft saved | ड्राफ़्ट सेव हो गया
Another post already uses this web address (slug). | यह वेब एड्रेस (स्लग) किसी और पोस्ट में पहले से है।
The web address (slug) can use only small letters, numbers and dashes. | वेब एड्रेस (स्लग) में सिर्फ़ छोटे अक्षर, नंबर और डैश (-) हो सकते हैं।
Loading enquiries… | इन्क्वायरी लोड हो रही हैं…
Contacted | बात हो गई
New ({}) | नई ({1})
Contacted ({}) | बात हो गई ({1})
Closed ({}) | बंद ({1})
All ({}) | सभी ({1})
No enquiries yet | अभी कोई इन्क्वायरी नहीं
When someone fills the contact form on your website, it shows up here. | जब कोई आपकी वेबसाइट पर कॉन्टैक्ट फ़ॉर्म भरेगा, वह यहां दिखेगा।
Call | कॉल करें
Update | अपडेट करें
Private note | निजी नोट
e.g. Called on 18 Oct, demo fixed for Monday | जैसे: 18 अक्टू को कॉल किया, सोमवार को डेमो तय
Delete this enquiry? | यह इन्क्वायरी डिलीट करें?
It will be removed permanently. | यह हमेशा के लिए हट जाएगी।
`);
I18N.load(`
# ---------- account deletion ----------
Delete my account | मेरा अकाउंट डिलीट करें
Account deletion | अकाउंट डिलीट
Why are you leaving? (optional) | आप क्यों छोड़ रहे हैं? (ज़रूरी नहीं)
I understand my account and data will be erased | मैं समझता हूं कि मेरा अकाउंट और डेटा हमेशा के लिए हट जाएगा
Request deletion | डिलीट का रिक्वेस्ट भेजें
Download a backup first | पहले बैकअप डाउनलोड करें
Tick the box to confirm | पक्का करने के लिए बॉक्स पर टिक करें
Request sent. We will contact you before erasing. | रिक्वेस्ट भेज दिया। हटाने से पहले हम आपसे बात करेंगे।
Your login will be erased. The business data you worked on stays with the business owner. | आपका लॉगिन हट जाएगा। जिस बिज़नेस में आपने काम किया, उसका डेटा ओनर के पास रहेगा।
This cannot be undone. | यह वापस नहीं होगा।
Your login and the business | आपका लॉगिन और बिज़नेस
with all its bookings, bills, stock, staff logins and records will be erased permanently. | की सभी बुकिंग, बिल, स्टॉक, स्टाफ़ लॉगिन और रिकॉर्ड हमेशा के लिए हट जाएंगे।
Your request goes to the {} team. We confirm with you and erase within 7 days. Some invoice records may be kept where the law requires. | आपका रिक्वेस्ट {1} टीम के पास जाएगा। हम आपसे पुष्टि करके 7 दिन में हटा देंगे। कानून के हिसाब से कुछ बिल रिकॉर्ड रखे जा सकते हैं।
We received your request on {}. The {} team will confirm with you and erase the account within 7 days. | आपका रिक्वेस्ट {1} को मिला। {2} टीम आपसे पुष्टि करके 7 दिन में अकाउंट हटा देगी।
Changed your mind? Contact support before it is processed. | मन बदल गया? रिक्वेस्ट पूरा होने से पहले सपोर्ट से बात करें।
Pending | बाकी
Erased | हटाया गया
Rejected | मना किया
Pending ({}) | बाकी ({1})
Erased ({}) | हटाए गए ({1})
Rejected ({}) | मना किए ({1})
From the website form | वेबसाइट के फ़ॉर्म से
From inside the app | ऐप के अंदर से
Matches login | यह लॉगिन मिला:
No login found with this ID. Confirm with the person, or mark as done. | इस आईडी का कोई लॉगिन नहीं मिला। व्यक्ति से पुष्टि करें, या डन मार्क करें।
Erase account | अकाउंट हटाएं
Mark done | डन मार्क करें
Reject | मना करें
Reject request | रिक्वेस्ट मना करें
Mark as done | डन मार्क करें
Erase this account? | यह अकाउंट हटाएं?
Type ERASE to confirm | पक्का करने के लिए ERASE लिखें
Erase permanently | हमेशा के लिए हटाएं
Note (only Super Admins see this) | नोट (सिर्फ़ सुपर एडमिन को दिखेगा)
No requests here | यहां कोई रिक्वेस्ट नहीं
Account deletion requests appear here. | अकाउंट डिलीट के रिक्वेस्ट यहां दिखेंगे।
Account erase is not switched on in the database yet. Run supabase/account_deletion.sql once in Supabase. | डेटाबेस में अकाउंट हटाने की सुविधा अभी चालू नहीं है। सुपाबेस में supabase/account_deletion.sql एक बार चलाएं।
with all its bookings, bills, stock, staff logins and records will be erased permanently. This cannot be undone. | की सभी बुकिंग, बिल, स्टॉक, स्टाफ़ लॉगिन और रिकॉर्ड हमेशा के लिए हट जाएंगे। यह वापस नहीं होगा।
Your login will be erased. The business data you worked on stays with the business owner. This cannot be undone. | आपका लॉगिन हट जाएगा। जिस बिज़नेस में आपने काम किया, उसका डेटा ओनर के पास रहेगा। यह वापस नहीं होगा।
Google Play requires a way to delete accounts. People ask from the app (Account → Delete my account) or the website page | गूगल प्ले के नियम से अकाउंट डिलीट करने का तरीका होना चाहिए। लोग ऐप से (अकाउंट → मेरा अकाउंट डिलीट करें) या वेबसाइट के इस पेज से रिक्वेस्ट भेजते हैं:
. Call them to confirm, then erase. | । उन्हें कॉल करके पुष्टि करें, फिर हटाएं।
`);
I18N.load(`
# ---------- Excel import, getting started, terms, subscriptions ----------
Import | इम्पोर्ट
Import from Excel | एक्सेल से इम्पोर्ट करें
Godown stock | गोदाम स्टॉक
Menu (dishes) | मेन्यू (डिश)
Crew & staff | क्रू और स्टाफ़
Download the sample sheet | सैंपल शीट डाउनलोड करें
Sample sheet (.xlsx) | सैंपल शीट (.xlsx)
Upload the filled sheet | भरी हुई शीट अपलोड करें
Excel (.xlsx, .xls) or CSV. The first row must be the headings. | एक्सेल (.xlsx, .xls) या सीएसवी। पहली लाइन में हेडिंग होनी चाहिए।
Choose file | फ़ाइल चुनें
Fill your {} in it, or use your own sheet with these headings: | इसमें अपना {1} भरें, या इन हेडिंग वाली अपनी शीट इस्तेमाल करें:
Check and import | देखें और इम्पोर्ट करें
{} new | {1} नए
{} already exist | {1} पहले से हैं
{} with problems | {1} में गड़बड़
Update existing | पुराने अपडेट करें
Skip existing | पुराने छोड़ दें
Row | लाइन
New | नया
Skip | छोड़ें
Showing {} of {} rows | {2} में से {1} लाइन दिख रही हैं
Rows with problems are left out. Fix them in the sheet and upload again any time. | गड़बड़ वाली लाइन छोड़ दी गईं। शीट में ठीक करके कभी भी दोबारा अपलोड करें।
Import {} rows | {1} लाइन इम्पोर्ट करें
Import {} row | {1} लाइन इम्पोर्ट करें
Importing… | इम्पोर्ट हो रहा है…
{} rows imported | {1} लाइन इम्पोर्ट हो गईं
Reading {}… | {1} पढ़ रहे हैं…
The sheet is empty | शीट खाली है
No rows found under the headings | हेडिंग के नीचे कोई लाइन नहीं मिली
Heading not found: {}. Use the sample sheet headings. | यह हेडिंग नहीं मिली: {1}। सैंपल शीट वाली हेडिंग इस्तेमाल करें।
This file is over 8 MB. Split it into smaller sheets. | यह फ़ाइल 8 एमबी से बड़ी है। छोटी शीट में बांटें।
Could not make the sample sheet. Check your internet. | सैंपल शीट नहीं बन सकी। इंटरनेट देखें।
Repeated in this sheet | शीट में दोबारा है
Total quantity missing | कुल मात्रा नहीं डाली
Numbers only in quantity, rent and weight | मात्रा, किराया और वज़न में सिर्फ़ नंबर
Daily wage must be a number | रोज़ की मज़दूरी नंबर में होनी चाहिए
Guests and amount must be numbers | मेहमान और रकम नंबर में होने चाहिए
Start date not understood. Use 18-11-2026 | शुरू की तारीख समझ नहीं आई। ऐसे लिखें: 18-11-2026
End date not understood | आखिरी तारीख समझ नहीं आई
Bring your existing stock, menu, crew, vendors and bookings in one go. Download the sample sheet, fill it, upload. | अपना पुराना स्टॉक, मेन्यू, क्रू, वेंडर और बुकिंग एक बार में लाएं। सैंपल शीट डाउनलोड करें, भरें, अपलोड करें।
Item name | आइटम का नाम
Total quantity | कुल मात्रा
Damaged | टूटा
Rent per day (₹) | रोज़ का किराया (₹)
Godown location | गोदाम में जगह
Dish name | डिश का नाम
Selected by default (Yes/No) | पहले से चुनी (Yes/No)
Ingredients (Name = kg per guest; …) | सामग्री (नाम = प्रति मेहमान किलो; …)
Daily wage (₹) | रोज़ की मज़दूरी (₹)
Package amount (₹) | पैकेज की रकम (₹)
Get started | शुरू करें
{} of {} done | {2} में से {1} हो गए
Hide | छुपाएं
Add your logo and GST details | अपना लोगो और जीएसटी डिटेल्स डालें
They print on every bill | ये हर बिल पर छपते हैं
Import your godown stock | अपना गोदाम स्टॉक इम्पोर्ट करें
From Excel, in one go | एक्सेल से, एक बार में
Add your menu | अपना मेन्यू जोड़ें
Dishes with ingredients per guest | प्रति मेहमान सामग्री के साथ डिश
Add your team | अपनी टीम जोड़ें
Logins for manager, accountant, crew | मैनेजर, अकाउंटेंट, क्रू के लॉगिन
Create your first booking | अपनी पहली बुकिंग बनाएं
Or import your diary | या अपनी डायरी इम्पोर्ट करें
I agree to the | मैं सहमत हूं:
Terms of use | इस्तेमाल की शर्तें
and | और
Privacy policy | प्राइवेसी पॉलिसी
Please accept the Terms of use and Privacy policy | कृपया इस्तेमाल की शर्तें और प्राइवेसी पॉलिसी स्वीकार करें
Grace period | ग्रेस पीरियड
Your plan ended on {}. | आपका प्लान {1} को खत्म हुआ।
The app will stop working after {}. Renew now to keep using it. | {1} के बाद ऐप बंद हो जाएगा। चलाते रहने के लिए अभी रिन्यू करें।
Your plan has ended. Renew to use the app again. | आपका प्लान खत्म हो गया है। ऐप फिर से चलाने के लिए रिन्यू करें।
Your plan has | आपका प्लान
ended | खत्म हो गया है
Your plan ended on {}. Your data is safe. Renew to start using {} again. | आपका प्लान {1} को खत्म हुआ। आपका डेटा सुरक्षित है। {2} फिर से चलाने के लिए रिन्यू करें।
Renew your plan | अपना प्लान रिन्यू करें
{} plan · {}/month | {1} प्लान · {2}/महीना
/month | /महीना
Plan, validity, price and access for this business | इस बिज़नेस का प्लान, वैलिडिटी, कीमत और एक्सेस
Or change validity by | या वैलिडिटी इतनी बदलें
Special price for this business (₹/month) | इस बिज़नेस के लिए खास कीमत (₹/महीना)
Leave empty to charge the normal plan price | खाली छोड़ें तो प्लान की आम कीमत लगेगी
−1 month | −1 महीना
−15 days | −15 दिन
−7 days | −7 दिन
−1 day | −1 दिन
+1 day | +1 दिन
+3 days | +3 दिन
+7 days | +7 दिन
+15 days | +15 दिन
When the validity date passes, the business cannot use the app until you extend it. Their data stays safe. Suspended blocks the app at once. | वैलिडिटी की तारीख निकलने पर बिज़नेस तब तक ऐप नहीं चला पाएगा जब तक आप उसे बढ़ाएं नहीं। उनका डेटा सुरक्षित रहता है। सस्पेंड करने पर ऐप तुरंत बंद हो जाता है।
special | खास
free | फ़्री
Prices change for everyone at once and show on the website, renewal reminders and the Settings page. A special price set on one business stays as it is. | कीमत सभी के लिए एक साथ बदलती है और वेबसाइट, रिन्यूअल रिमाइंडर और सेटिंग्स पेज पर दिखती है। किसी एक बिज़नेस की खास कीमत वैसी ही रहती है।
Grace days after a plan ends | प्लान खत्म होने के बाद ग्रेस दिन
The app keeps working for these many days after expiry, with a warning. 0 = stops the next day. | खत्म होने के बाद इतने दिन ऐप चेतावनी के साथ चलता रहेगा। 0 = अगले दिन बंद।
Plan {} | प्लान {1}
Plan {} (new, optional) | प्लान {1} (नया, ज़रूरी नहीं)
Price per month (₹) | महीने की कीमत (₹)
What is included (one per line, shown on the website) | क्या-क्या मिलता है (हर लाइन में एक, वेबसाइट पर दिखेगा)
To remove a plan, clear its name. Businesses already on that plan keep it until you change them. | प्लान हटाने के लिए उसका नाम खाली करें। उस प्लान वाले बिज़नेस का प्लान तब तक रहेगा जब तक आप न बदलें।
Change validity for many businesses | कई बिज़नेस की वैलिडिटी एक साथ बदलें
Useful for a festival offer or to make up for downtime. Applies to every business in the chosen group. | फ़ेस्टिवल ऑफ़र या ऐप बंद रहने की भरपाई के लिए। चुने गए ग्रुप के हर बिज़नेस पर लागू होगा।
All active and trial businesses | सभी चालू और ट्रायल बिज़नेस
Only paid (active) | सिर्फ़ पेड (चालू)
Only free trial | सिर्फ़ फ़्री ट्रायल
Every business, including expired | हर बिज़नेस, खत्म हो चुके भी
Apply | लागू करें
No businesses in this group | इस ग्रुप में कोई बिज़नेस नहीं
Change validity? | वैलिडिटी बदलें?
Updated {} businesses | {1} बिज़नेस अपडेट हुए
Imported {} | इम्पोर्ट किया: {1}
Blocked until renewed | रिन्यू होने तक बंद
SabManage | सबमैनेज
Offline | ऑफ़लाइन
{} pax | {1} लोग
{} days | {1} दिन
{} day | {1} दिन
Synced | सिंक्ड
HSN/SAC | एचएसएन/एसएसी
CGST {} | सीजीएसटी {1}
SGST {} | एसजीएसटी {1}
IGST {} | आईजीएसटी {1}
kg | किलो
owner | ओनर
manager | मैनेजर
accountant | अकाउंटेंट
supervisor | सुपरवाइज़र
staff | स्टाफ़
never logged in | कभी लॉगिन नहीं किया
e.g. Basic | जैसे: बेसिक
e.g. Shree Events Pvt Ltd | जैसे: श्री इवेंट्स प्राइवेट लिमिटेड
`);

I18N.load(`
# ---------- crew duty hours, overtime, crew money ----------
Crew roster, duty hours, overtime, attendance by event, advances, kharcha and monthly payout. | क्रू की लिस्ट, ड्यूटी के घंटे, ओवरटाइम, इवेंट के हिसाब से हाज़िरी, एडवांस, खर्चा और महीने का हिसाब।
Crew money | क्रू का पैसा
Edit crew money | क्रू का पैसा बदलें
Advance, food at the event, travel or bonus | एडवांस, इवेंट पर खाना, किराया-भाड़ा या इनाम
Crew member | क्रू मेंबर
Advance (cut from pay) | एडवांस (तनख्वाह से कटेगा)
Food / khuraki at the event | इवेंट पर खाना / खुराकी
Travel / other spend | किराया-भाड़ा / दूसरा खर्च
Bonus / inaam (added to pay) | इनाम (तनख्वाह में जुड़ेगा)
e.g. Dinner for 6 crew at site | जैसे: साइट पर 6 लोगों का खाना
Wage for one duty (₹) | एक ड्यूटी की मज़दूरी (₹)
Duty hours (one shift) | ड्यूटी के घंटे (एक शिफ़्ट)
Work beyond this is overtime; a full extra duty is one more shift | इससे ज़्यादा काम ओवरटाइम है; पूरी एक और ड्यूटी हो तो एक शिफ़्ट और
Overtime ₹ per extra hour | ओवरटाइम: हर ज़्यादा घंटे के ₹
Leave blank to use wage ÷ duty hours | खाली छोड़ें तो मज़दूरी ÷ ड्यूटी के घंटे से बनेगा
Auto | अपने आप
Add your crew first | पहले अपना क्रू जोड़ें
Delete this entry? | यह एंट्री डिलीट करें?
Write the hours only when someone works more than their duty. Extra hours become overtime; a full extra duty becomes one more shift. | घंटे तभी लिखें जब कोई अपनी ड्यूटी से ज़्यादा काम करे। ज़्यादा घंटे ओवरटाइम बनते हैं; पूरी एक और ड्यूटी हो तो एक शिफ़्ट और गिनी जाती है।
duty {} hrs | ड्यूटी {1} घंटे
hrs | घंटे
Hours worked | काम के घंटे
Give kharcha / advance | खर्चा / एडवांस दें
1 shift | 1 शिफ़्ट
{} shifts | {1} शिफ़्ट
1 shift + {} hrs overtime | 1 शिफ़्ट + {1} घंटे ओवरटाइम
{} shifts + {} hrs overtime | {1} शिफ़्ट + {2} घंटे ओवरटाइम
{} shifts this month | इस महीने {1} शिफ़्ट
{}/duty | {1}/ड्यूटी
OT {}/hr | ओवरटाइम {1}/घंटा
Kharcha (company) {} | खर्चा (कंपनी का) {1}
Cut from pay | तनख्वाह से कटेगा
Food / khuraki | खाना / खुराकी
Company kharcha | कंपनी का खर्चा
Travel / other | किराया-भाड़ा / दूसरा
Bonus | इनाम
Added to pay | तनख्वाह में जुड़ेगा
No crew money this month | इस महीने क्रू को कोई पैसा नहीं दिया
Advances, food at the event, travel and bonus show here. | एडवांस, इवेंट पर खाना, किराया-भाड़ा और इनाम यहां दिखेंगे।
Net pay = wages + overtime + bonus − advance. Food and travel kharcha is the company’s cost, not cut from pay. | देनी रकम = मज़दूरी + ओवरटाइम + इनाम − एडवांस। खाना और किराया-भाड़ा कंपनी का खर्च है, तनख्वाह से नहीं कटता।
Shifts | शिफ़्ट
OT hrs | ओवरटाइम घंटे
Wages | मज़दूरी
Overtime | ओवरटाइम
Advance: {} to {} | एडवांस: {2} को {1}
Food / khuraki at the event: {} to {} | इवेंट पर खाना: {2} को {1}
Travel / other spend: {} to {} | किराया-भाड़ा: {2} को {1}
Bonus / inaam (added to pay): {} to {} | इनाम: {2} को {1}

# ---------- expenses: every cost in one place ----------
Every cost in one place: your expenses, crew wages, overtime and kharcha, and vendor POs. | हर खर्च एक जगह: आपके खर्च, क्रू की मज़दूरी, ओवरटाइम और खर्चा, और वेंडर के पीओ।
Crew lines come from Staff (attendance, overtime, food, travel, bonus). Vendor lines come from purchase orders. Advances are not a cost; they are cut from pay. | क्रू वाली लाइनें स्टाफ़ से आती हैं (हाज़िरी, ओवरटाइम, खाना, किराया-भाड़ा, इनाम)। वेंडर वाली लाइनें परचेज़ ऑर्डर से। एडवांस खर्च नहीं है; वह तनख्वाह से कटता है।
Crew wages | क्रू की मज़दूरी
Crew kharcha | क्रू का खर्चा
Vendor POs | वेंडर पीओ
Wages: {} | मज़दूरी: {1}
Food / khuraki: {} | खाना / खुराकी: {1}
Bonus: {} | इनाम: {1}
Crew travel / other: {} | क्रू किराया-भाड़ा: {1}
from Staff | स्टाफ़ से
paid ₹{} | दिया ₹{1}
POs ₹{} | पीओ ₹{1}
Exp ₹{} | खर्च ₹{1}
Crew ₹{} | क्रू ₹{1}
Vendors ₹{} | वेंडर ₹{1}
Crew wages & overtime | क्रू की मज़दूरी और ओवरटाइम
Crew kharcha & bonus | क्रू का खर्चा और इनाम

# ---------- marketing ----------
Marketing | मार्केटिंग
Free tools to get more bookings: follow-ups, Google reviews, rate card, client list and QR code. | ज़्यादा बुकिंग पाने के फ़्री टूल: फ़ॉलो-अप, गूगल रिव्यू, रेट कार्ड, ग्राहकों की लिस्ट और क्यूआर कोड।
Follow-ups | फ़ॉलो-अप
Google reviews | गूगल रिव्यू
Rate card | रेट कार्ड
Clients | ग्राहक
QR poster | क्यूआर पोस्टर
Refer & share | रेफ़र और शेयर
Follow up | फ़ॉलो-अप
Follow up with {} | {1} से फ़ॉलो-अप करें
Followed up with {} | {1} से फ़ॉलो-अप किया
Most bookings are lost because nobody called back. Every enquiry and quotation shows here; after you follow up, tap Done and it comes back after 2 days if the client has still not confirmed. | ज़्यादातर बुकिंग इसलिए हाथ से जाती हैं क्योंकि किसी ने वापस फ़ोन नहीं किया। हर इन्क्वायरी और कोटेशन यहां दिखता है; फ़ॉलो-अप करके डन दबाएं, क्लाइंट ने पक्का नहीं किया तो 2 दिन बाद फिर दिखेगा।
Done | डन
Due today | आज करना है
Never followed up | अभी तक फ़ॉलो-अप नहीं
Last follow-up {} | आखिरी फ़ॉलो-अप {1}
No open enquiries | कोई खुली इन्क्वायरी नहीं
New enquiries and quotations will show here for follow-up. | नई इन्क्वायरी और कोटेशन फ़ॉलो-अप के लिए यहां दिखेंगे।
Done. It will come back in 2 days if not confirmed. | हो गया। पक्का नहीं हुआ तो 2 दिन में फिर दिखेगा।
Your Google review link | आपका गूगल रिव्यू लिंक
Get it from Google: open your business on Google Maps → Ask for reviews → Share review form → copy the link. | गूगल से लें: गूगल मैप्स पर अपना बिज़नेस खोलें → रिव्यू मांगें → रिव्यू फ़ॉर्म शेयर करें → लिंक कॉपी करें।
Google review link | गूगल रिव्यू लिंक
Instagram page (optional) | इंस्टाग्राम पेज (ज़रूरी नहीं)
Save links | लिंक सेव करें
Links saved | लिंक सेव हो गए
Links must start with https:// | लिंक https:// से शुरू होने चाहिए
Ask the owner to add the Google review link in Marketing. | ओनर से कहें कि मार्केटिंग में गूगल रिव्यू लिंक डालें।
Add your Google review link above. Until then the message asks for a review without a link. | ऊपर अपना गूगल रिव्यू लिंक डालें। तब तक मैसेज बिना लिंक के रिव्यू मांगेगा।
Ask past clients | पुराने क्लाइंट से मांगें
Events finished in the last 4 months | पिछले 4 महीने में पूरे हुए इवेंट
Asked | मांग लिया
Asked {} | {1} को मांगा
Ask for review | रिव्यू मांगें
No finished events yet | अभी कोई इवेंट पूरा नहीं हुआ
After an event is marked Completed, ask the client for a Google review from here. | इवेंट पूरा मार्क होने के बाद यहां से क्लाइंट से गूगल रिव्यू मांगें।
Thank you | धन्यवाद
Size | साइज़
Download | डाउनलोड
Share | शेयर करें
Show godown items with rent per day ({}) | गोदाम का सामान रोज़ के किराये के साथ दिखाएं ({1})
Show menu dishes ({}) | मेन्यू की डिश दिखाएं ({1})
Packages / offer note (optional) | पैकेज / ऑफ़र का नोट (ज़रूरी नहीं)
e.g. Wedding package for 500 guests from ₹2,50,000. Free DJ on bookings this month. | जैसे: 500 मेहमानों का शादी पैकेज ₹2,50,000 से। इस महीने बुकिंग पर डीजे फ़्री।
Update card | कार्ड अपडेट करें
Only items with a rent filled in are shown. Rates come from Inventory; dishes from Catering. | सिर्फ़ वही सामान दिखता है जिसका किराया भरा है। रेट इन्वेंटरी से और डिश कैटरिंग से आती हैं।
Print / save PDF | प्रिंट / पीडीएफ़ सेव करें
Send as text | टेक्स्ट में भेजें
RATE CARD | रेट कार्ड
day | दिन
Rates are per day, before GST. Final price depends on date, quantity and venue. | रेट रोज़ के हैं, जीएसटी अलग। पक्का दाम तारीख, मात्रा और जगह पर निर्भर है।
Anniversaries in the next 30 days | अगले 30 दिन में सालगिरह
Weddings you did in earlier years. A wish brings the next booking. | पिछले सालों में की गई शादियां। एक बधाई से अगली बुकिंग आती है।
None in the next 30 days | अगले 30 दिन में कोई नहीं
Wedding anniversaries of your past clients show here. | पुराने क्लाइंट की शादी की सालगिरह यहां दिखेगी।
Send wish | बधाई भेजें
{} years | {1} साल
Muhurat campaign | मुहूर्त कैंपेन
From the peak dates in Settings. | सेटिंग्स की पीक तारीखों से।
Peak dates | पीक तारीखें
Peak date | पीक तारीख
{} days left | {1} दिन बाकी
{} past clients | {1} पुराने ग्राहक
Copy message | मैसेज कॉपी करें
No peak date in the next 60 days | अगले 60 दिन में कोई पीक तारीख नहीं
Add muhurat dates in Settings to get a reminder here. | सेटिंग्स में मुहूर्त की तारीखें डालें, यहां याद दिलाया जाएगा।
All clients ({}) | सभी ग्राहक ({1})
Made from your bookings. Download the list for a WhatsApp broadcast or Facebook / Instagram ads. | आपकी बुकिंग से बनी लिस्ट। व्हाट्सऐप ब्रॉडकास्ट या फ़ेसबुक / इंस्टाग्राम ऐड के लिए डाउनलोड करें।
Download list | लिस्ट डाउनलोड करें
Search name or phone | नाम या फ़ोन खोजें
{} bookings | {1} बुकिंग
{} booking | {1} बुकिंग
No clients yet | अभी कोई ग्राहक नहीं
Clients are added automatically from your bookings. | ग्राहक आपकी बुकिंग से अपने आप जुड़ते हैं।
Downloaded client list | ग्राहकों की लिस्ट डाउनलोड की
QR code opens | क्यूआर कोड क्या खोलेगा
WhatsApp enquiry | व्हाट्सऐप इन्क्वायरी
Google review | गूगल रिव्यू
Add your Google review link in the Google reviews tab first. | पहले गूगल रिव्यू टैब में अपना रिव्यू लिंक डालें।
Print it and put it at your shop, godown, on vehicles and at every event entrance. Anyone who scans it lands in a WhatsApp chat with you, with a message already typed. | इसे प्रिंट करके दुकान, गोदाम, गाड़ियों और हर इवेंट के गेट पर लगाएं। जो भी स्कैन करेगा, उसकी आपसे व्हाट्सऐप चैट खुलेगी, मैसेज पहले से लिखा होगा।
Keep it at the buffet counter or exit. Happy guests scan it and write a Google review on the spot. | इसे बुफ़े काउंटर या बाहर जाने के रास्ते पर रखें। खुश मेहमान स्कैन करके वहीं गूगल रिव्यू लिख देंगे।
QR poster preview | क्यूआर पोस्टर का प्रीव्यू
Add your mobile number first | पहले अपना मोबाइल नंबर डालें
The QR code opens a WhatsApp chat with this number. Add it in Settings → Business profile. | क्यूआर कोड इसी नंबर से व्हाट्सऐप चैट खोलता है। इसे सेटिंग्स → बिज़नेस की जानकारी में डालें।
Open Settings | सेटिंग्स खोलें
Could not load the QR maker. Check the internet and try again. | क्यूआर बनाने वाला लोड नहीं हुआ। इंटरनेट देखकर फिर कोशिश करें।
Share your business | अपना बिज़नेस शेयर करें
A ready message with your services, phone, Google reviews and Instagram. Send it to new enquiries or post it in WhatsApp groups. | आपकी सेवाएं, फ़ोन, गूगल रिव्यू और इंस्टाग्राम वाला तैयार मैसेज। नई इन्क्वायरी को भेजें या व्हाट्सऐप ग्रुप में डालें।
Send on WhatsApp | व्हाट्सऐप पर भेजें
Refer another business | दूसरा बिज़नेस रेफ़र करें
Know another tent house, caterer or event manager? Send them your link. When they join, we know you referred them. | कोई और टेंट हाउस, कैटरर या इवेंट मैनेजर जानते हैं? उन्हें अपना लिंक भेजें। वे जुड़ेंगे तो हमें पता रहेगा कि आपने भेजा।
Know another tent house, caterer or event manager? Send them your link. When they join, we know you referred them. {} | कोई और टेंट हाउस, कैटरर या इवेंट मैनेजर जानते हैं? उन्हें अपना लिंक भेजें। वे जुड़ेंगे तो हमें पता रहेगा कि आपने भेजा। {1}
You get 1 month free when they take a paid plan. | जब वे पेड प्लान लेंगे, आपको 1 महीना फ़्री मिलेगा।
Copy link | लिंक कॉपी करें
Referral reward (shown to businesses) | रेफ़रल इनाम (बिज़नेस को दिखेगा)
Shown on Marketing → Refer & share. Leave blank to show no reward. | मार्केटिंग → रेफ़र और शेयर में दिखता है। खाली छोड़ें तो कोई इनाम नहीं दिखेगा।
Referred by | किसने भेजा:
Happy with {}? | {1} का काम पसंद आया?
Recommend them to family and friends planning a function. | फ़ंक्शन की तैयारी कर रहे रिश्तेदारों और दोस्तों को इनके बारे में बताएं।
Recommend on WhatsApp | व्हाट्सऐप पर बताएं
Review on Google | गूगल पर रिव्यू दें
Instagram | इंस्टाग्राम
`);

I18N.load(`
# ---------- team alerts ----------
Alert to team | टीम को अलर्ट
Alert tune | अलर्ट की धुन
This is the alert tune. Keep media volume up. | यह अलर्ट की धुन है। मीडिया की आवाज़ ऊंची रखें।
Tap anywhere once, then try again. | स्क्रीन पर एक बार कहीं भी टैप करें, फिर दोबारा कोशिश करें।
Team alerts | टीम अलर्ट
Test tune | धुन सुनें
Send alert | अलर्ट भेजें
Reminders | रिमाइंडर
No team alerts yet. Owners and supervisors can send an alert that rings on the phone of the person. | अभी कोई टीम अलर्ट नहीं। ओनर और सुपरवाइज़र ऐसा अलर्ट भेज सकते हैं जो उस व्यक्ति के फ़ोन पर बजता है।
Rings on their phone with the alert tune | उनके फ़ोन पर अलर्ट की धुन के साथ बजेगा
Nobody else has an app login yet. Add your team in Team & access so they get alerts. | अभी किसी और का ऐप लॉगिन नहीं है। टीम और एक्सेस में अपनी टीम जोड़ें ताकि उन्हें अलर्ट मिलें।
Send to | किसे भेजें
Everyone ({}) | सभी को ({1})
Quick message | जल्दी वाला मैसेज
Call me now | मुझे अभी फ़ोन करो
Come to the godown | गोदाम पर आओ
Truck is leaving, come fast | ट्रक निकल रहा है, जल्दी आओ
Client is waiting at the site | क्लाइंट साइट पर इंतज़ार कर रहे हैं
Material short at the site | साइट पर सामान कम पड़ गया
Start setup now | अभी सेटअप शुरू करो
Alert | अलर्ट
e.g. Come to the godown now | जैसे: अभी गोदाम पर आओ
Details (optional) | पूरी बात (ज़रूरी नहीं)
About booking (optional) | किस बुकिंग के बारे में (ज़रूरी नहीं)
Urgent | ज़रूरी
: keeps ringing until they tap “Seen” | : जब तक वे "देख लिया" न दबाएं, बजता रहेगा
Crew without the app? Use the WhatsApp button on their card in Staff. | जिस क्रू के पास ऐप नहीं? स्टाफ़ में उनके कार्ड पर व्हाट्सऐप बटन इस्तेमाल करें।
Write the alert | अलर्ट लिखें
Your role cannot send alerts. Ask the owner. | आपका रोल अलर्ट नहीं भेज सकता। ओनर से कहें।
Alert sent. Ringing on {} phone. | अलर्ट भेज दिया। {1} फ़ोन पर बज रहा है।
Alert sent. Ringing on {} phones. | अलर्ट भेज दिया। {1} फ़ोन पर बज रहा है।
Alert sent. They will see it when the app is open (phone notifications are not turned on for them yet). | अलर्ट भेज दिया। ऐप खोलते ही उन्हें दिखेगा (उनके फ़ोन पर नोटिफ़िकेशन अभी चालू नहीं हैं)।
Sent alert: {} | अलर्ट भेजा: {1}
Urgent alert | ज़रूरी अलर्ट
1 of {} | {1} में से 1
From | भेजने वाले:
Play sound | आवाज़ चलाएं
Seen, OK | देख लिया, ठीक है
Open booking | बुकिंग खोलें
To {} | {1} को
From {} | {1} से
Everyone | सभी
Seen by {} | {1} ने देखा
Not seen yet | अभी नहीं देखा
Seen | देख लिया
Sent | भेजा
New | नया
Turn on alert notifications | अलर्ट नोटिफ़िकेशन चालू करें
So you hear alerts from your team with the SabManage tune, even when the app is closed. | ताकि ऐप बंद होने पर भी टीम के अलर्ट सबमैनेज की धुन के साथ सुनाई दें।
Turn on | चालू करें
Hide | छुपाएं
Phone notifications are on | फ़ोन नोटिफ़िकेशन चालू हो गए
Notifications not allowed | नोटिफ़िकेशन की इजाज़त नहीं मिली
Notifications are blocked. Allow them for SabManage in your phone settings. | नोटिफ़िकेशन बंद हैं। फ़ोन की सेटिंग्स में सबमैनेज के लिए चालू करें।
Phone notifications work in the SabManage app or in Chrome on the live site. | फ़ोन नोटिफ़िकेशन सबमैनेज ऐप में या क्रोम में असली साइट पर चलते हैं।
Could not turn on notifications: {} | नोटिफ़िकेशन चालू नहीं हो पाए: {1}
1 new important reminder. Tap the bell. | 1 नया ज़रूरी रिमाइंडर। घंटी दबाएं।
{} new important reminders. Tap the bell. | {1} नए ज़रूरी रिमाइंडर। घंटी दबाएं।
`);

I18N.load(`
# ---------- notification permission ----------
Alert notifications | अलर्ट नोटिफ़िकेशन
Hear your team’s alerts even when the app is closed | ऐप बंद होने पर भी टीम के अलर्ट सुनें
Notifications are on | नोटिफ़िकेशन चालू हैं
Notifications are blocked on this phone | इस फ़ोन पर नोटिफ़िकेशन बंद हैं
Not available here | यहां नहीं चलेगा
Notifications are off | नोटिफ़िकेशन बंद हैं
Alerts from your team will ring on this phone with the SabManage tune. | टीम के अलर्ट इस फ़ोन पर सबमैनेज की धुन के साथ बजेंगे।
You (or someone) tapped “Don’t allow” earlier. Turn it on from phone settings: | पहले "इजाज़त न दें" दबाया गया था। फ़ोन की सेटिंग्स से चालू करें:
Open SabManage in the Android app, or in Chrome at sabmanage.com/app. | सबमैनेज एंड्रॉयड ऐप में खोलें, या क्रोम में sabmanage.com/app खोलें।
Tap Allow, then choose “Allow” on the phone’s pop-up. | "चालू करें" दबाएं, फिर फ़ोन के पॉप-अप में "Allow" (इजाज़त दें) चुनें।
Open your phone Settings → Apps → SabManage → Notifications. | फ़ोन की सेटिंग्स → ऐप्स → सबमैनेज → नोटिफ़िकेशन खोलें।
Turn on "Allow notifications" and open "Team alerts": keep sound on. | "नोटिफ़िकेशन की इजाज़त" चालू करें और "Team alerts" खोलकर आवाज़ चालू रखें।
Come back here and tap "Check again". | यहां वापस आकर "फिर से देखें" दबाएं।
Check again | फिर से देखें
Allow notifications | नोटिफ़िकेशन चालू करें
Test it on this phone | इस फ़ोन पर जांचें
Tap the button, then within 10 seconds close the app, put the phone on silent and lock it. The alert should ring. | बटन दबाएं, फिर 10 सेकंड के अंदर ऐप बंद करें, फ़ोन साइलेंट करें और लॉक करें। अलर्ट बजना चाहिए।
Send me a test alert in 10 seconds | 10 सेकंड में मुझे टेस्ट अलर्ट भेजें
Play the alert tune now | अभी अलर्ट की धुन सुनें
Not now | अभी नहीं
Test alert | टेस्ट अलर्ट
If you hear the tune, alerts are working on this phone. | धुन सुनाई दी तो इस फ़ोन पर अलर्ट ठीक चल रहे हैं।
Test alert in 10 seconds. Close the app now. | 10 सेकंड में टेस्ट अलर्ट आएगा। अभी ऐप बंद करें।
This phone is not registered yet. Tap Allow notifications first. | यह फ़ोन अभी जुड़ा नहीं है। पहले "नोटिफ़िकेशन चालू करें" दबाएं।
Could not send the test: {} | टेस्ट नहीं भेज पाए: {1}
Notifications on | नोटिफ़िकेशन चालू
Notifications off | नोटिफ़िकेशन बंद
`);

I18N.load(`
# ---------- easy home, crew home, quick booking, simple access ----------
Today | आज
Events today | आज के इवेंट
Tomorrow | कल
Setup done | सेटअप हुआ
Call back | फ़ोन करना है
To collect | लेना बाकी
New booking | नई बुकिंग
4 things to fill | सिर्फ़ 4 चीज़ें भरें
Payment received | पैसा आया
Attendance | हाज़िरी
Stock | स्टॉक
Bill / quotation | बिल / कोटेशन
Alert to team | टीम को अलर्ट
Today & tomorrow | आज और कल
All bookings | सभी बुकिंग
No event today or tomorrow | आज या कल कोई इवेंट नहीं
Your next bookings will show here with live setup progress. | आपकी अगली बुकिंग यहां लाइव सेटअप के साथ दिखेंगी।
See all ({}) | सब देखें ({1})
All sections | सभी सेक्शन
Show the full home screen | पूरी होम स्क्रीन दिखाएं
Switch to easy home | आसान होम पर जाएं
Full app is on. All sections are on the home screen. | पूरा ऐप चालू है। सभी सेक्शन होम स्क्रीन पर हैं।
Easy home is on. | आसान होम चालू है।
{} crew at site | साइट पर {1} क्रू
Attendance marked | हाज़िरी लग गई
Today at {} | आज {1} बजे
I have reached the site | मैं साइट पर पहुंच गया
Tap when you reach. Your attendance is marked for today. | पहुंचते ही दबाएं। आज की हाज़िरी लग जाएगी।
Which event | कौन-सा इवेंट
Your login is not linked to a crew name yet. Ask the owner to link it in Team & access. | आपका लॉगिन अभी किसी क्रू नाम से नहीं जुड़ा। ओनर से कहें कि टीम और एक्सेस में जोड़ दें।
Your login is not linked to a crew name. Ask the owner to link it in Team. | आपका लॉगिन किसी क्रू नाम से नहीं जुड़ा। ओनर से कहें कि टीम में जोड़ दें।
My work | मेरा काम
No work given to you | आपको अभी कोई काम नहीं दिया गया
When the owner gives you setup work, it shows here. | ओनर जब सेटअप का काम देंगे, यहां दिखेगा।
Today’s events | आज के इवेंट
Map | नक्शा
Alert the owner | ओनर को अलर्ट भेजें
Call the owner | ओनर को फ़ोन करें
Attendance marked. Have a good day! | हाज़िरी लग गई। आपका दिन अच्छा रहे!
You can update only your own work | आप सिर्फ़ अपना काम बदल सकते हैं
Work done | काम पूरा
{} reached at {} | {1} {2} बजे पहुंच गए
New booking: {} | नई बुकिंग: {1}
Payment received: {} | पैसा आया: {1}
Only 4 things. Add the rest later if you want. | सिर्फ़ 4 चीज़ें। बाकी चाहें तो बाद में भरें।
Package (optional) | पैकेज (ज़रूरी नहीं)
Client name | क्लाइंट का नाम
Event date | इवेंट की तारीख
Total amount ₹ | कुल रकम ₹
e.g. 150000 | जैसे: 150000
Type | किस तरह का
Advance received now ₹ (optional) | अभी मिला एडवांस ₹ (ज़रूरी नहीं)
Booking becomes Confirmed and the advance is saved in Payments | बुकिंग पक्की हो जाएगी और एडवांस पेमेंट में सेव हो जाएगा
Booking is confirmed (pakki) | बुकिंग पक्की है
More details | और जानकारी भरें
Save booking | बुकिंग सेव करें
Write the client name | क्लाइंट का नाम लिखें
Pick the event date | इवेंट की तारीख चुनें
Booking saved with {} advance | {1} एडवांस के साथ बुकिंग सेव हो गई
Booking saved | बुकिंग सेव हो गई
Save as package | पैकेज के रूप में सेव करें
Next time, one tap fills these items, menu and amount | अगली बार एक टैप में यही सामान, मेन्यू और रकम भर जाएगी
Package name | पैकेज का नाम
e.g. Wedding 500 guests | जैसे: शादी 500 मेहमान
Package amount ₹ | पैकेज की रकम ₹
Package saved | पैकेज सेव हो गया
Saved package {} | पैकेज सेव किया: {1}
Delete this package? | यह पैकेज डिलीट करें?
Booking packages | बुकिंग पैकेज
Ready sets of items, menu and amount. Pick one while making a booking. | सामान, मेन्यू और रकम के तैयार सेट। बुकिंग बनाते समय चुनें।
{} items | {1} सामान
{} dishes | {1} डिश
No packages yet. Open any booking and tap “Save as package”. | अभी कोई पैकेज नहीं। कोई भी बुकिंग खोलें और "पैकेज के रूप में सेव करें" दबाएं।
Delete package | पैकेज डिलीट करें
Their job | उनका काम
Runs bookings, stock, catering and crew. Sees bills; cannot change team or settings. | बुकिंग, स्टॉक, कैटरिंग और क्रू संभालते हैं। बिल देख सकते हैं; टीम या सेटिंग्स नहीं बदल सकते।
Bills, payments and expenses. Sees bookings and reports. | बिल, पेमेंट और खर्च। बुकिंग और रिपोर्ट देख सकते हैं।
Site work: bookings, setup tasks, stock out and in, attendance. | साइट का काम: बुकिंग, सेटअप के काम, सामान भेजना-लाना, हाज़िरी।
Crew: sees only their own work and marks attendance. | क्रू: सिर्फ़ अपना काम देखते हैं और हाज़िरी लगाते हैं।
Custom role | अपना बनाया रोल
Crew name (for their own work list) | क्रू का नाम (उनके काम की लिस्ट के लिए)
— New crew name (made for you) — | — नया क्रू नाम (अपने आप बनेगा) —
Crew logins see only the work given to this name | क्रू लॉगिन को सिर्फ़ इसी नाम को दिया गया काम दिखता है
Later, tap “What they see” next to their name to switch any section on or off. | बाद में उनके नाम के आगे "क्या दिखे" दबाकर कोई भी सेक्शन चालू या बंद करें।
What they see | क्या दिखे
What {} can see | {1} को क्या दिखे
Tap to change. Saves for this person only. | बदलने के लिए टैप करें। सिर्फ़ इसी व्यक्ति के लिए सेव होगा।
Job | काम
Off | बंद
See | देखे
Change | बदले
Off = section hidden. See = can look only. Change = can add and edit. Only the owner can delete. | बंद = सेक्शन छुपा रहेगा। देखे = सिर्फ़ देख सकते हैं। बदले = जोड़ और बदल सकते हैं। डिलीट सिर्फ़ ओनर कर सकते हैं।
Password & more | पासवर्ड और बाकी
Access saved | एक्सेस सेव हो गया
Updated access for {} | {1} का एक्सेस बदला
`);
