/* EventPro public website: home, blog, legal pages, sitemap.
   Rendered on the server so Google and WhatsApp link previews see real content.
   Content comes from Supabase (public, read-only data). */
const SB_URL = process.env.SUPABASE_URL || 'https://uregwtavhkjowiltukiq.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWd3dGF2aGtqb3dpbHR1a2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTA1MjksImV4cCI6MjEwNzcyNjUyOX0.bVRTpmkE_c30j-_pegk0HLdGaSeSNqQ3pwtBjeRoAIw';
const V = '5';
const PER_PAGE = 9;

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hi = s => s ? ` data-hi="${esc(s)}"` : '';
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const digits = s => String(s || '').replace(/\D/g, '');
const waNum = s => { const d = digits(s); return d.length === 10 ? '91' + d : d; };
const wa = (num, text) => `https://wa.me/${waNum(num)}?text=${encodeURIComponent(text)}`;
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
const safeUrl = u => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
const strip = h => String(h || '').replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const decodeEnt = s => String(s).replace(/&#(\d+);?/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);?/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&(amp|lt|gt|quot|apos|colon|tab|newline);/gi, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '', newline: '' }[n.toLowerCase()]));

async function sb(path, { timeout = 3500 } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }, signal: ctl.signal });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* Blog HTML is rebuilt tag by tag from an allow-list, so nothing unsafe can reach visitors. */
const ALLOW = { p: [], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], ul: [], ol: [], li: [], blockquote: [], a: ['href'], img: ['src', 'alt'], br: [], hr: [], figure: [], figcaption: [] };
const VOID = new Set(['br', 'hr', 'img']);
function sanitize(html) {
  let s = String(html || '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|title|head|form|select|video|audio|canvas)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|title|meta|link|base|form|input|button|select)\b[^>]*>/gi, '');
  return s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<|>/g, (m, tag, attrs) => {
    if (!tag) return m === '<' ? '&lt;' : '&gt;';
    tag = tag.toLowerCase(); if (tag === 'h1') tag = 'h2';
    if (!ALLOW[tag]) return '';
    if (m[1] === '/') return VOID.has(tag) ? '' : `</${tag}>`;
    let out = '<' + tag;
    for (const a of ALLOW[tag]) {
      const mm = attrs.match(new RegExp('(?:^|\\s)' + a + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i'));
      if (!mm) continue;
      let v = decodeEnt(mm[1] ?? mm[2] ?? mm[3] ?? '').replace(/[\u0000-\u001F\u007F\s]+/g, a === 'alt' ? ' ' : '').trim();
      if (a === 'href' && !/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(v)) continue;
      if (a === 'src' && !/^(https:\/\/|\/(?!\/))/i.test(v)) return '';
      out += ` ${a}="${esc(v)}"`;
      if (a === 'href' && /^https?:/i.test(v)) out += ' rel="noopener" target="_blank"';
    }
    if (tag === 'img') { if (!/ src="/.test(out)) return ''; out += ' loading="lazy" decoding="async"'; }
    return out + '>';
  });
}

/* ---------- icons (same set as the app) ---------- */
const P = {
  tent: 'M3 20L12 4l9 16zM12 4v16M8 20l4-6 4 6', pot: 'M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-1 1-2 1-3M14 6c0-1 1-2 1-3', sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3', rupee: 'M7 4h10M7 8h10M7 4c6 0 6 8 0 8H6l8 8',
  handshake: 'M2 12l4-4h4l2 2 2-2h4l4 4M6 8l6 7 6-7M4 14l4 4M20 14l-4 4', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6', pulse: 'M3 12h4l3-8 4 16 3-8h4',
  chart: 'M4 20V11M10 20V5M16 20v-7M2 20h20', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', wallet: 'M3 7h17v13H3zM3 7l3-4h11v4M15 13.5h2',
  check: 'M5 12l5 5L20 7', wa: 'M21 12a9 9 0 0 1-13.5 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12zM9 9.5c.5 2.5 2.5 4.5 5 5', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', pin: 'M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  menu: 'M4 6h16M4 12h16M4 18h16', link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  insta: 'M4 4h16v16H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 7h.01', fb: 'M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z', yt: 'M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9l5 3-5 3z', li: 'M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v2c.6-1.2 2-2 3.5-2C20 9 21 10.6 21 13v7h-4v-6c0-1.2-.5-2-1.6-2s-1.9.8-1.9 2v6h-3.5z',
  arrow: 'M5 12h14M13 6l6 6-6 6', back: 'M15 18l-6-6 6-6', copy: 'M9 9h11v11H9zM5 15H4V4h11v1', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z'
};
const ic = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;

/* ---------- data ---------- */
const DEFAULT_SITE = { brandName: 'EventPro', tagline: 'Tent, catering aur event ka poora hisaab, ek app mein.', about: 'EventPro is built in Jaipur for the people who make Indian weddings and events happen: tent houses, caterers, halwais, decorators and event managers. We spent time in godowns, kitchens and wedding lawns to understand how bookings, stock, ration, crew and payments are really handled, and turned that into one simple app that works on any phone.', aboutHi: '', legalName: '', address: '', city: 'Jaipur', phone: '', whatsapp: '', email: '', hours: 'Mon–Sat, 10 am – 7 pm', mapUrl: '', instagram: '', facebook: '', youtube: '', linkedin: '', showPricing: true };
async function loadSettings() {
  let plat = {};
  try { const r = await sb('platform_settings?id=eq.1&select=data'); plat = (r[0] && r[0].data) || {}; } catch (e) { }
  const site = { ...DEFAULT_SITE, phone: plat.supportPhone || '', whatsapp: plat.supportPhone || '', email: plat.supportEmail || '', ...(plat.site || {}) };
  return { plat: { appName: 'EventPro', trialDays: 14, plans: [], ...plat }, site };
}
const POST_COLS = 'slug,title,excerpt,cover_url,published_at,updated_at,tags,lang,author';
async function loadPosts({ limit = PER_PAGE, offset = 0, tag = '' } = {}) {
  try { return await sb(`blog_posts?select=${POST_COLS}&status=eq.published&order=published_at.desc&limit=${limit}&offset=${offset}${tag ? '&tags=cs.' + encodeURIComponent('{"' + tag.replace(/["\\{},]/g, '') + '"}') : ''}`); } catch (e) { return []; }
}

/* ---------- page shell ---------- */
function shell({ s, plat, origin, path, title, desc, image, body, type = 'website', jsonld = [], noindex = false, hiTitle = '' }) {
  const brand = s.brandName || 'EventPro'; const url = origin + path;
  const nav = [['/#features', 'Features', 'सुविधाएं'], ...(s.showPricing !== false && (plat.plans || []).length ? [['/#pricing', 'Pricing', 'कीमत']] : []), ['/blog', 'Blog', 'Blog'], ['/#about', 'About us', 'हमारे बारे में'], ['/#contact', 'Contact', 'संपर्क']];
  const waN = s.whatsapp || s.phone;
  const social = [['instagram', 'insta', 'Instagram'], ['facebook', 'fb', 'Facebook'], ['youtube', 'yt', 'YouTube'], ['linkedin', 'li', 'LinkedIn']].filter(([k]) => safeUrl(s[k])).map(([k, i, l]) => `<a href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener" aria-label="${l}">${ic(i)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`}
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${esc(brand)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(brand)} blog" href="${esc(origin)}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Mukta:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/site.css?v=${V}">
<script>if(location.hash.indexOf('#guest-')===0)location.replace('/app'+location.hash);</script>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body data-hi-title="${esc(hiTitle)}">
<a class="skip" href="#main"${hi('मुख्य हिस्से पर जाएं')}>Skip to content</a>
<header class="top" id="top"><div class="wrap">
  <a class="brand" href="/"><span class="mk">${ic('tent')}</span>${esc(brand)}</a>
  <nav class="nav" id="nav" aria-label="Main">${nav.map(([h, l, h2]) => `<a href="${h}"${hi(h2)}>${l}</a>`).join('')}<a href="/app" class="mobile-login"${hi('Log in')}>Log in</a></nav>
  <span class="grow"></span>
  <button class="lang" type="button" id="langBtn" aria-label="भाषा / Language" translate="no"><span data-l="hi">हिं</span><span data-l="en" class="on">EN</span></button>
  <a class="btn sm login" href="/app" data-app-link${hi('Log in')}>Log in</a>
  ${plat.allowSignup !== false ? `<a class="btn sm primary start" href="/app#signup"${hi('Free trial शुरू करें')}>Start free trial</a>` : `<a class="btn sm primary start" href="/#contact"${hi('Demo लें')}>Book a demo</a>`}
  <button class="menu-btn" type="button" id="menuBtn" aria-label="Menu" aria-expanded="false" aria-controls="nav">${ic('menu')}</button>
</div></header>
<main id="main">
${body}
</main>
<footer>
  <div class="canopy thin" aria-hidden="true"></div>
  <div class="wrap">
    <div class="about-f"><a class="brand" href="/"><span class="mk">${ic('tent')}</span>${esc(brand)}</a>
      <p style="color:var(--ink2);margin-top:12px;max-width:30em"${hi('टेंट हाउस, कैटरर और इवेंट मैनेजर के लिए bookings, stock, राशन, GST bill, payments और crew का app।')}>Bookings, stock, ration, GST bills, payments and crew in one app for tent houses, caterers and event managers.</p>
      ${social ? `<div class="social">${social}</div>` : ''}</div>
    <div><h4${hi('Pages')}>Pages</h4><ul>${nav.map(([h, l, h2]) => `<li><a href="${h}"${hi(h2)}>${l}</a></li>`).join('')}<li><a href="/app"${hi('Log in')}>Log in</a></li></ul></div>
    <div><h4${hi('संपर्क')}>Contact</h4><ul>
      ${s.phone ? `<li><a href="tel:+${waNum(s.phone)}">${esc(s.phone)}</a></li>` : ''}
      ${waN ? `<li><a href="${esc(wa(waN, 'Namaste, I want to know more about ' + brand + '.'))}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
      ${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
      ${s.address ? `<li style="color:var(--ink2)">${esc(s.address)}</li>` : ''}
    </ul></div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.legalName || brand)}</span><span><a href="/privacy"${hi('Privacy policy')}>Privacy policy</a> &nbsp; <a href="/terms"${hi('नियम और शर्तें')}>Terms of use</a></span></div>
  </div>
</footer>
${waN ? `<a class="wa-float" href="${esc(wa(waN, 'Namaste, I want to know more about ' + brand + '.'))}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a>` : ''}
<script>window.SITE=${JSON.stringify({ url: SB_URL, key: SB_KEY }).replace(/</g, '\\u003c')};</script>
<script src="/site.js?v=${V}" defer></script>
</body>
</html>`;
}

/* ---------- home ---------- */
function homePage({ s, plat, posts }) {
  const brand = s.brandName || 'EventPro'; const trial = +plat.trialDays || 0; const signup = plat.allowSignup !== false;
  const waN = s.whatsapp || s.phone;
  const startBtn = signup ? `<a class="btn primary" href="/app#signup"${hi(trial ? `${trial} दिन का free trial शुरू करें` : 'Free में शुरू करें')}>${trial ? `Start ${trial}-day free trial` : 'Start free'}</a>` : `<a class="btn primary" href="#contact"${hi('Demo लें')}>Book a demo</a>`;
  const waBtn = waN ? `<a class="btn wa" href="${esc(wa(waN, `Namaste, I want a demo of ${brand} for my business.`))}" target="_blank" rel="noopener">${ic('wa')}<span${hi('WhatsApp पर demo')}>Demo on WhatsApp</span></a>` : `<a class="btn" href="#contact"${hi('Demo लें')}>Book a demo</a>`;
  const who = [
    ['tent', '#2563EB', 'Tent houses', 'टेंट हाउस', 'Know what is in the godown, what is out on rent and what is short for Saturday’s wedding.', 'Godown में क्या है, क्या किराए पर बाहर है और शनिवार की शादी के लिए क्या कम है, सब पता रहे।',
      [['Date-wise stock for every shamiana, chair and DG set', 'हर शामियाना, कुर्सी और DG set का तारीख के हिसाब से stock'], ['Truck loading list and delivery challan', 'Truck loading list और delivery challan'], ['Damage and missing items charged to the client', 'टूटे और गुम सामान का charge client के bill में']]],
    ['pot', '#16A34A', 'Caterers & halwais', 'कैटरर और हलवाई', 'Turn a menu and guest count into the full samagri list and a per-plate price in seconds.', 'Menu और मेहमानों की गिनती से सेकंडों में पूरी सामग्री list और प्रति plate rate निकालें।',
      [['Ration list with your mandi rates', 'आपके मंडी rate से राशन list'], ['Per-plate cost and margin', 'प्रति plate लागत और margin'], ['Menu saved to each booking', 'हर booking में menu save']]],
    ['sparkle', '#DB2777', 'Event managers', 'इवेंट मैनेजर', 'Run vendors, crew, run-sheets and client updates for every function from one place.', 'हर function के vendors, crew, run-sheet और client updates एक ही जगह से संभालें।',
      [['Vendor purchase orders and dues', 'Vendor के purchase order और बकाया'], ['Live setup tracker for crew', 'Crew के लिए live setup tracker'], ['Client page with progress and bill', 'Client के लिए progress और bill वाला page']]]
  ];
  const feats = [
    ['calendar', '#7C3AED', 'Bookings & calendar', 'Bookings और calendar', 'Every enquiry, quotation and confirmed event in one diary, with peak saaya dates marked.', 'हर enquiry, quotation और पक्का event एक diary में, साया की तारीखें अलग दिखती हैं।'],
    ['box', '#2563EB', 'Godown stock', 'Godown stock', 'See what is free on any date. Stock is held automatically for confirmed bookings.', 'किसी भी तारीख को क्या खाली है, देखें। पक्की bookings के लिए stock अपने आप रुकता है।'],
    ['pot', '#16A34A', 'Catering calculator', 'Catering calculator', 'Menu, guests and buffer in; samagri list, raw cost and per-plate price out.', 'Menu, मेहमान और buffer डालें; सामग्री list, लागत और प्रति plate rate पाएं।'],
    ['receipt', '#DB2777', 'GST bills with your logo', 'आपके logo वाले GST bill', 'Quotations, tax invoices, receipts and challans with your logo, stamp and UPI.', 'आपके logo, stamp और UPI के साथ quotation, tax invoice, रसीद और challan।'],
    ['rupee', '#0B9B68', 'Payments & reminders', 'Payments और याद-दिहानी', 'Record advances, see who owes what and send a polite WhatsApp reminder in one tap.', 'Advance दर्ज करें, किस पर कितना बाकी है देखें और एक tap में WhatsApp पर याद दिलाएं।'],
    ['handshake', '#D97706', 'Vendors & POs', 'Vendors और PO', 'Florists, DJs, dairy and crockery partners with purchase orders and dues.', 'फूल वाले, DJ, dairy और crockery partners, purchase order और बकाया के साथ।'],
    ['users', '#0D9488', 'Crew & wages', 'Crew और मज़दूरी', 'Daily attendance by event, advances and month-end payout for every worker.', 'Event के हिसाब से रोज़ की हाज़िरी, advance और हर कारीगर की महीने की तनख्वाह।'],
    ['pulse', '#0EA5E9', 'Live setup tracker', 'Live setup tracker', 'Crew update progress from their phones, so you know the pandal is ready before you reach.', 'Crew अपने phone से progress update करती है, आपके पहुंचने से पहले पता रहता है कि pandal तैयार है।'],
    ['chart', '#0891B2', 'Profit by event', 'हर event का मुनाफ़ा', 'Billing minus vendors, expenses and wages: the real profit of every function.', 'Bill में से vendors, खर्च और मज़दूरी घटाकर हर function का असली मुनाफ़ा।'],
    ['shield', '#475569', 'Staff logins & access', 'Staff login और access', 'Give each person their own login and decide exactly which sections they can see.', 'हर व्यक्ति को अपना login दें और तय करें कि वे कौन-से sections देख सकते हैं।']
  ];
  const plans = (plat.plans || []).filter(p => p && p.name);
  const mid = plans.length === 3 ? 1 : -1;
  const plansHtml = s.showPricing !== false && plans.length ? `
  <section class="sec" id="pricing"><div class="wrap">
    <div class="sec-h"><h2${hi('सीधी कीमत, कोई छुपा charge नहीं')}>Simple monthly pricing</h2><p${hi('सभी plans में पूरा app मिलता है। आपकी team के हिसाब से plan चुनें।')}>Every plan includes the full app. Pick the one that fits the size of your team.</p></div>
    <div class="plans">${plans.map((p, i) => `<div class="plan ${i === mid ? 'hl' : ''}"><h3>${esc(p.name)}</h3><div class="pr">${inr(p.price)}<small${hi(' / महीना')}> / month</small></div>
      ${p.desc ? `<ul>${String(p.desc).split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 8).map(x => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : `<ul><li>${ic('check')}<span${hi('सभी sections और GST bills')}>All sections and GST bills</span></li><li>${ic('check')}<span${hi('Staff logins और access control')}>Staff logins and access control</span></li><li>${ic('check')}<span${hi('Cloud backup, किसी भी phone पर')}>Cloud backup, works on any phone</span></li></ul>`}
      ${signup ? `<a class="btn ${i === mid ? 'primary' : ''}" href="/app#signup"${hi('Free trial शुरू करें')}>Start free trial</a>` : `<a class="btn ${i === mid ? 'primary' : ''}" href="#contact"${hi('बात करें')}>Talk to us</a>`}</div>`).join('')}</div>
    ${trial ? `<div class="trial">${ic('star')}<span${hi(`पहले ${trial} दिन free। Card की ज़रूरत नहीं। Trial के बाद plan चुनें, आपका data वैसा ही रहेगा।`)}>First ${trial} days are free. No card needed. Choose a plan after the trial; your data stays as it is.</span></div>` : ''}
  </div></section>` : '';
  const blogHtml = posts.length ? `
  <section class="sec soft" id="blog"><div class="wrap">
    <div class="sec-h" style="display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;max-width:none"><div><h2${hi('Blog से')}>From the blog</h2><p${hi('Season की तैयारी, pricing और business बढ़ाने के तरीके।')}>Season planning, pricing and ways to grow your business.</p></div><a class="btn" href="/blog"${hi('सभी posts')}>All posts</a></div>
    <div class="posts">${posts.slice(0, 3).map(postCard).join('')}</div>
  </div></section>` : '';
  const ways = [
    waN && ['wa', '#0B9B68', 'WhatsApp', esc(waN), wa(waN, `Namaste, I want to know more about ${brand}.`)],
    s.phone && ['phone', '#1F5EFF', 'Call us', esc(s.phone), 'tel:+' + waNum(s.phone)],
    s.email && ['send', '#7C3AED', 'Email', esc(s.email), 'mailto:' + s.email],
    s.address && ['pin', '#D6246E', 'Office', esc(s.address) + (s.city && !s.address.includes(s.city) ? ', ' + esc(s.city) : ''), safeUrl(s.mapUrl)],
    s.hours && ['clock', '#D97706', 'Working hours', esc(s.hours), '']
  ].filter(Boolean);
  const wayHi = { WhatsApp: 'WhatsApp', 'Call us': 'Call करें', Email: 'Email', Office: 'Office', 'Working hours': 'काम का समय' };
  const faqs = [
    ['Do I need to install anything?', 'क्या कुछ install करना पड़ेगा?', 'No. It opens in the browser on any Android phone, iPhone or computer. You can add it to your home screen so it opens like an app.', 'नहीं। यह किसी भी Android phone, iPhone या computer के browser में खुलता है। Home screen पर जोड़ लें तो app की तरह खुलेगा।'],
    ['Can my staff use it with their own login?', 'क्या मेरा staff अपने login से चला सकता है?', 'Yes. You create a login ID and password for each person and choose which sections they can see or change. A crew member can see only their own tasks.', 'हां। आप हर व्यक्ति की login ID और password बनाते हैं और तय करते हैं कि वे कौन-से sections देख या बदल सकते हैं। Crew member सिर्फ़ अपने काम देख सकता है।'],
    ['Will my bills show my business name and logo?', 'क्या bill पर मेरे business का नाम और logo आएगा?', 'Yes. Your logo, stamp, address, GSTIN, bank details and UPI ID print on every quotation, invoice, receipt and challan.', 'हां। आपका logo, stamp, पता, GSTIN, bank details और UPI ID हर quotation, invoice, रसीद और challan पर छपते हैं।'],
    ['Is my data safe?', 'क्या मेरा data सुरक्षित है?', 'Your data is stored in the cloud and only your team can see it. Every login can be protected with a 6-digit Authenticator code.', 'आपका data cloud में सुरक्षित रहता है और सिर्फ़ आपकी team देख सकती है। हर login को 6 अंकों के Authenticator code से सुरक्षित किया जा सकता है।'],
    ['Can I use it in Hindi?', 'क्या यह हिंदी में चलता है?', 'Yes. Anyone can switch the app between Hindi and English with one tap. Everyday words like Booking, Invoice and GST stay in English, the way people say them.', 'हां। कोई भी एक tap में app को हिंदी या English में कर सकता है। Booking, Invoice, GST जैसे आम शब्द English में ही रहते हैं, जैसे लोग बोलते हैं।'],
    ['What happens when the trial ends?', 'Trial खत्म होने पर क्या होगा?', 'You can still log in and see all your data. To keep adding bookings and bills, choose a plan and we renew your account.', 'आप login करके अपना पूरा data देख सकते हैं। Bookings और bills जोड़ते रहने के लिए plan चुनें, हम आपका account renew कर देंगे।']
  ];
  return `
  <div class="canopy" aria-hidden="true"></div><div class="lights" aria-hidden="true"></div>
  <section class="hero"><div class="wrap">
    <div>
      <h1${hi(s.tagline === DEFAULT_SITE.tagline ? 'Tent, catering और event का पूरा हिसाब, एक app में।' : '')}>${esc(s.tagline || DEFAULT_SITE.tagline)}</h1>
      <p class="lead"${hi('Bookings, godown stock, हलवाई का राशन, GST bill, payment की याद-दिहानी, crew की हाज़िरी और हर event का मुनाफ़ा। टेंट हाउस, कैटरर और इवेंट मैनेजर के लिए बना।')}>Bookings, godown stock, halwai ration, GST bills, payment reminders, crew attendance and the profit of every event. Made for tent houses, caterers and event managers.</p>
      <div class="cta">${startBtn}${waBtn}</div>
      <ul class="facts"><li>${ic('check')}<span${hi('किसी भी phone पर')}>Works on any phone</span></li><li>${ic('check')}<span${hi('हिंदी और English')}>Hindi and English</span></li><li>${ic('check')}<span${hi('आपके logo वाले GST bill')}>GST bills with your logo</span></li></ul>
    </div>
    <div class="tagstack">
      <div class="phone"><img src="/img/app-dashboard.webp" width="390" height="780" alt="EventPro app home screen showing money pending from clients, upcoming events and quick actions" fetchpriority="high"></div>
      <div class="sticker a"><i style="background:#0B9B68">${ic('rupee')}</i><span${hi('Payment मिला<small>Advance दर्ज हो गया</small>')}>Payment received<small>Advance recorded</small></span></div>
      <div class="sticker b"><i style="background:#D6246E">${ic('receipt')}</i><span${hi('GST bill तैयार<small>WhatsApp पर भेजें</small>')}>GST bill ready<small>Send on WhatsApp</small></span></div>
    </div>
  </div></section>

  <section class="sec soft" id="who"><div class="wrap">
    <div class="sec-h"><h2${hi('शादी और event का काम करने वालों के लिए')}>Built for the people who run weddings and events</h2><p${hi('एक ही app, तीन तरह के business। जो section काम का नहीं, उसे बंद कर दें।')}>One app for three kinds of business. Switch off any section you don’t need.</p></div>
    <div class="who">${who.map(([i, c, t, th, d, dh, list]) => `<article style="--c:${c}"><div class="ib">${ic(i)}</div><h3${hi(th)}>${t}</h3><p style="color:var(--ink2);margin-top:8px"${hi(dh)}>${d}</p><ul>${list.map(([e, h]) => `<li>${ic('check')}<span${hi(h)}>${e}</span></li>`).join('')}</ul></article>`).join('')}</div>
  </div></section>

  <section class="sec" id="features"><div class="wrap">
    <div class="sec-h"><h2${hi('रोज़ के काम के लिए सब कुछ')}>Everything the daily work needs</h2><p${hi('Enquiry से लेकर आखिरी payment तक, हर कदम एक जगह।')}>From the first enquiry to the last payment, every step in one place.</p></div>
    <div class="feats">${feats.map(([i, c, t, th, d, dh]) => `<div class="feat" style="--c:${c}"><div class="ib">${ic(i)}</div><div><h3${hi(th)}>${t}</h3><p${hi(dh)}>${d}</p></div></div>`).join('')}</div>
  </div></section>

  <section class="sec soft"><div class="wrap">
    <div class="spot" style="--c:#DB2777"><div class="shot"><img src="/img/app-invoice.webp" width="390" height="780" loading="lazy" alt="A GST tax invoice in the app with the business logo and totals"></div>
      <div><h3${hi('आपका नाम, आपका logo, हर bill पर')}>Your name and logo on every bill</h3><p${hi('Quotation बनाएं, client के हां कहते ही उसे tax invoice में बदलें, और PDF या WhatsApp पर भेजें।')}>Make a quotation, turn it into a tax invoice when the client agrees, and send it as a PDF or on WhatsApp.</p>
      <ul><li${hi('CGST/SGST या IGST अपने आप')}>CGST/SGST or IGST worked out for you</li><li${hi('Bill पर UPI ID ताकि client तुरंत pay करे')}>UPI ID on the bill so clients pay faster</li><li${hi('Booked items और menu एक tap में bill में')}>Booked items and the menu added in one tap</li></ul></div></div>
    <div class="spot flip" style="--c:#0EA5E9"><div class="shot"><img src="/img/app-event.webp" width="390" height="780" loading="lazy" alt="An event page in the app with stage, guests, items and setup progress"></div>
      <div><h3${hi('हर function की पूरी जानकारी एक page पर')}>Every function on one page</h3><p${hi('Stage, मेहमान, booked items, run-sheet, setup के काम, खर्च और payments, सब उसी event के अंदर।')}>Stage, guests, booked items, run-sheet, setup tasks, costs and payments, all inside the event.</p>
      <ul><li${hi('कम stock की चेतावनी booking के समय ही')}>Stock shortage warning while you book</li><li${hi('Client को link भेजें, वे progress और bill देख सकें')}>Share a link so the client sees progress and the bill</li><li${hi('Event के बाद review मांगें')}>Ask for a review after the event</li></ul></div></div>
  </div></section>

  <section class="sec" id="how"><div class="wrap">
    <div class="sec-h"><h2${hi('एक दिन में शुरू करें')}>Start in a day</h2></div>
    <ol class="steps">
      <li><h3${hi('Account बनाएं')}>Create your account</h3><p${hi('Business का नाम और mobile नंबर डालें। आप Owner बनते हैं।')}>Enter your business name and mobile number. You become the Owner.</p></li>
      <li><h3${hi('अपना सामान और menu जोड़ें')}>Add your stock and menu</h3><p${hi('Tent, कुर्सियां, lights, dishes और rate एक बार डालें। Logo और GST details भी।')}>Add tents, chairs, lights, dishes and rates once, plus your logo and GST details.</p></li>
      <li><h3${hi('Team को जोड़ें और booking लें')}>Add your team and take bookings</h3><p${hi('Manager, accountant और crew के login बनाएं और पहली booking डालें।')}>Create logins for your manager, accountant and crew, then add your first booking.</p></li>
    </ol>
  </div></section>
  ${plansHtml}
  ${blogHtml}
  <section class="sec" id="about"><div class="wrap about">
    <div class="txt"><h2 style="margin-bottom:18px"${hi('हमारे बारे में')}>About us</h2><p${hi(s.aboutHi || '')}>${esc(s.about || DEFAULT_SITE.about)}</p></div>
    <dl>
      <div><dt${hi(`${s.city || 'भारत'} में बना`)}>Made in ${esc(s.city || 'India')}</dt><dd${hi('भारतीय शादियों और events के असली काम को समझकर बनाया गया।')}>Designed around how Indian weddings and events are really run.</dd></div>
      <div><dt${hi('आपकी भाषा में')}>In your language</dt><dd${hi('पूरा app हिंदी और English में, एक tap में बदलें।')}>The whole app works in Hindi and English, switch with one tap.</dd></div>
      <div><dt${hi('आपका data, आपकी team')}>Your data stays with your team</dt><dd${hi('हर व्यक्ति वही देखता है जो आप अनुमति देते हैं।')}>Each person sees only what you allow.</dd></div>
    </dl>
  </div></section>

  <section class="sec soft" id="faq"><div class="wrap">
    <div class="sec-h"><h2${hi('अक्सर पूछे जाने वाले सवाल')}>Common questions</h2></div>
    <div class="faq">${faqs.map(([q, qh, a, ah]) => `<details><summary${hi(qh)}>${q}</summary><p${hi(ah)}>${a}</p></details>`).join('')}</div>
  </div></section>

  <section class="sec" id="contact"><div class="wrap">
    <div class="sec-h"><h2${hi('संपर्क करें')}>Contact us</h2><p${hi('अपना नंबर छोड़ें, हमारी team आपको call करके free demo देगी।')}>Leave your number and our team will call you for a free demo.</p></div>
    <div class="contact">
      <form class="cform" id="enqForm" novalidate>
        <label><span${hi('आपका नाम')}>Your name</span><input name="name" required maxlength="120" autocomplete="name"></label>
        <label><span${hi('Mobile नंबर')}>Mobile number</span><input name="phone" type="tel" required maxlength="16" autocomplete="tel" inputmode="tel" placeholder="98290 12345"></label>
        <label><span${hi('Business का नाम')}>Business name</span><input name="business" maxlength="160" autocomplete="organization"></label>
        <label><span${hi('शहर')}>City</span><input name="city" maxlength="80" autocomplete="address-level2"></label>
        <label class="full"><span${hi('आपका काम')}>Your business</span><select name="bizType"><option value="Tent house"${hi('टेंट हाउस')}>Tent house</option><option value="Caterer / Halwai"${hi('कैटरर / हलवाई')}>Caterer / Halwai</option><option value="Event manager"${hi('इवेंट मैनेजर')}>Event manager</option><option value="Decorator"${hi('डेकोरेटर')}>Decorator</option><option value="Other"${hi('अन्य')}>Other</option></select></label>
        <label class="full"><span${hi('Message (ज़रूरी नहीं)')}>Message (optional)</span><textarea name="message" rows="3" maxlength="2000"></textarea></label>
        <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="full"><button class="btn primary" type="submit" style="width:100%"${hi('Call back मांगें')}>Request a call back</button></div>
        <div class="msg" id="enqMsg" hidden role="status"></div>
      </form>
      <div class="cways">${ways.map(([i, c, t, v, href]) => `${href ? `<a class="cway" style="--c:${c}" href="${esc(href)}"${/^https/.test(href) ? ' target="_blank" rel="noopener"' : ''}>` : `<div class="cway" style="--c:${c}">`}<i>${ic(i)}</i><div><b${hi(wayHi[t])}>${t}</b><span>${v}</span></div>${href ? '</a>' : '</div>'}`).join('')}</div>
    </div>
  </div></section>

  <div class="wrap"><div class="band"><div><h2${hi('इस season का पूरा हिसाब एक जगह रखें')}>Keep this season’s hisaab in one place</h2><p${hi(trial ? `${trial} दिन free। Card की ज़रूरत नहीं।` : 'आज ही शुरू करें।')}>${trial ? `${trial} days free. No card needed.` : 'Start today.'}</p></div><div style="display:flex;gap:12px;flex-wrap:wrap">${startBtn}${waN ? `<a class="btn wa" href="${esc(wa(waN, `Namaste, I want a demo of ${brand} for my business.`))}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}</div></div></div>`;
}

function postCard(p) {
  return `<a class="pcard" href="/blog/${esc(p.slug)}"${p.lang === 'hi' ? ' lang="hi"' : ''}><div class="im">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : ic('sparkle')}</div><div class="tx"><time datetime="${esc(p.published_at)}">${fmtDate(p.published_at)}</time><h3>${esc(p.title)}</h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</div></a>`;
}

/* ---------- blog ---------- */
function blogPage({ s, posts, page, tag, hasMore, allTags }) {
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap">
  <div class="bhead"><h1>${tag ? '#' + esc(tag) : `<span${hi('Blog')}>Blog</span>`}</h1><p${hi('Tent, catering और event business चलाने के लिए tips, season की तैयारी और नए तरीके।')}>Tips, season planning and new ideas for running a tent, catering or event business.</p>
  ${allTags.length ? `<div class="tags"><a href="/blog" class="${tag ? '' : 'on'}"${hi('सभी')}>All</a>${allTags.map(t => `<a href="/blog?tag=${encodeURIComponent(t)}" class="${t === tag ? 'on' : ''}">${esc(t)}</a>`).join('')}</div>` : ''}</div>
  ${posts.length ? `<div class="posts">${posts.map(postCard).join('')}</div>` : `<div class="empty-blog"><h3${hi('जल्द आ रहा है')}>Posts are on the way</h3><p style="margin-top:8px"${hi('पहली post जल्द आएगी। तब तक app आज़माएं।')}>The first post is coming soon. Try the app in the meantime.</p><p style="margin-top:18px"><a class="btn primary" href="/"${hi('Home पर जाएं')}>Go to home</a></p></div>`}
  ${page > 1 || hasMore ? `<div class="pager">${page > 1 ? `<a class="btn" href="/blog?page=${page - 1}${tag ? '&tag=' + encodeURIComponent(tag) : ''}"${hi('नए posts')}>Newer posts</a>` : ''}${hasMore ? `<a class="btn" href="/blog?page=${page + 1}${tag ? '&tag=' + encodeURIComponent(tag) : ''}"${hi('पुराने posts')}>Older posts</a>` : ''}</div>` : ''}
  </div>`;
}
function postPage({ s, plat, p, related, origin }) {
  const words = strip(p.content).split(' ').length; const mins = Math.max(1, Math.round(words / 200));
  const url = origin + '/blog/' + p.slug; const signup = plat.allowSignup !== false;
  const shareText = `${p.title} ${url}`;
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap"><article class="article"${p.lang === 'hi' ? ' lang="hi"' : ''}>
    <div class="crumb"><a href="/blog"${hi('Blog')}>Blog</a>${(p.tags || []).length ? ` / <a href="/blog?tag=${encodeURIComponent(p.tags[0])}">${esc(p.tags[0])}</a>` : ''}</div>
    <h1>${esc(p.title)}</h1>
    <div class="meta"><time datetime="${esc(p.published_at)}">${fmtDate(p.published_at)}</time>${p.author ? `<span>${esc(p.author)}</span>` : ''}<span${hi(`${mins} मिनट में पढ़ें`)}>${mins} min read</span></div>
    ${p.cover_url ? `<div class="cover"><img src="${esc(p.cover_url)}" alt="" fetchpriority="high"></div>` : '<div style="height:26px"></div>'}
    <div class="post-body">${sanitize(p.content)}</div>
    <div class="share"><b${hi('Share करें')}>Share</b><a class="btn sm wa" href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a><a class="btn sm" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">${ic('fb')}Facebook</a><button class="btn sm" type="button" data-copy="${esc(url)}">${ic('copy')}<span${hi('Link copy करें')}>Copy link</span></button></div>
    <div class="cta-box"><div><h3${hi(`अपना business ${s.brandName || 'EventPro'} पर चलाएं`)}>Run your business on ${esc(s.brandName || 'EventPro')}</h3><p${hi('Bookings, stock, catering, GST bills और payments एक app में।')}>Bookings, stock, catering, GST bills and payments in one app.</p></div>${signup ? `<a class="btn primary" href="/app#signup"${hi('Free trial शुरू करें')}>Start free trial</a>` : `<a class="btn primary" href="/#contact"${hi('Demo लें')}>Book a demo</a>`}</div>
  </article>
  ${related.length ? `<div style="margin-top:60px"><h2 style="font-size:30px;margin-bottom:22px"${hi('और पढ़ें')}>Read next</h2><div class="posts">${related.map(postCard).join('')}</div></div>` : ''}
  </div>`;
}

/* ---------- legal ---------- */
function legalPage(kind, { s }) {
  const org = esc(s.legalName || s.brandName || 'EventPro'); const brand = esc(s.brandName || 'EventPro');
  const contact = [s.email && `email <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`, s.phone && `call ${esc(s.phone)}`].filter(Boolean).join(' or ') || 'use the contact form on our website';
  const updated = 'October 2026';
  if (kind === 'privacy') return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext"><h1>Privacy policy</h1><p>Last updated ${updated}</p>
  <p>This policy explains what ${org} (“we”) collects when you use ${brand}, and how it is used.</p>
  <h2>What we collect</h2><ul><li>Account details: your name, mobile number or email, and business name.</li><li>Business data you enter in the app: bookings, clients, stock, menus, invoices, payments, vendors, staff and attendance.</li><li>Website enquiries: the name, number and message you send through our contact form.</li><li>Basic technical data needed to keep the service running, such as login times.</li></ul>
  <h2>How we use it</h2><ul><li>To run the app for you and your team.</li><li>To contact you about your account, renewals and support requests.</li><li>To keep the service secure and fix problems.</li></ul><p>We do not sell your data. Your business data is visible only to people you give access to, and to our support team when you ask for help.</p>
  <h2>Your clients’ information</h2><p>You control the client details you enter. A client link shows that client only their own event and bill.</p>
  <h2>Storage and security</h2><p>Data is stored with our cloud database provider and protected by access rules for every business. Logins can be protected with an Authenticator code.</p>
  <h2>Your choices</h2><p>You can ask us for a copy of your data or to delete your account. Some records may be kept where the law requires it, such as invoices.</p>
  <h2>Contact</h2><p>For privacy questions, ${contact}.</p></div>`;
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext"><h1>Terms of use</h1><p>Last updated ${updated}</p>
  <p>These terms apply when you use ${brand}, provided by ${org}.</p>
  <h2>Your account</h2><ul><li>Keep your password private. You are responsible for logins you create for your staff.</li><li>Give correct business details, including GST details printed on your bills.</li></ul>
  <h2>Plans and payment</h2><ul><li>New businesses may get a free trial. After it ends, the account becomes read-only until a plan is chosen.</li><li>Plan prices are shown on our website or shared with you. Fees already paid are not refundable unless we agree otherwise in writing.</li><li>We may pause an account with unpaid dues or misuse, after informing you.</li></ul>
  <h2>Your data</h2><p>The business data you enter belongs to you. You can download a backup from Settings at any time.</p>
  <h2>Fair use</h2><p>Do not use the service for anything unlawful, to send spam, or to try to access another business’s data.</p>
  <h2>Bills and tax</h2><p>The app helps you prepare invoices. You remain responsible for the accuracy of your bills and your tax filings.</p>
  <h2>Changes and availability</h2><p>We work to keep the service available but cannot promise it will never be interrupted. We may update these terms and will show the new date here.</p>
  <h2>Contact</h2><p>Questions about these terms: ${contact}.</p></div>`;
}

/* ---------- main handler ---------- */
module.exports = async (req, res) => {
  const q = req.query || {}; const page = String(q.view || 'home');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'eventpro-os.vercel.app';
  const origin = (req.headers['x-forwarded-proto'] || 'https') + '://' + host;
  const send = (code, html, type = 'text/html; charset=utf-8', cache = 's-maxage=60, stale-while-revalidate=600') => { res.statusCode = code; res.setHeader('Content-Type', type); res.setHeader('Cache-Control', 'public, max-age=0, ' + cache); res.end(html); };
  try {
    if (page === 'robots') return send(200, `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`, 'text/plain; charset=utf-8', 's-maxage=86400');
    const { plat, site: s } = await loadSettings();
    const brand = s.brandName || 'EventPro';
    if (page === 'sitemap' || page === 'rss') {
      const posts = await loadPosts({ limit: 1000 });
      if (page === 'rss') return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(brand)} blog</title><link>${origin}/blog</link><description>${esc(s.tagline)}</description>${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${origin}/blog/${esc(p.slug)}</link><guid>${origin}/blog/${esc(p.slug)}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('')}</channel></rss>`, 'application/rss+xml; charset=utf-8');
      const urls = [['/', ''], ['/blog', posts[0]?.published_at], ['/privacy', ''], ['/terms', ''], ...posts.map(p => ['/blog/' + p.slug, p.updated_at || p.published_at])];
      return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([u, d]) => `<url><loc>${esc(origin + u)}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ''}</url>`).join('')}</urlset>`, 'application/xml; charset=utf-8');
    }
    const base = { s, plat, origin };
    if (page === 'home') {
      const posts = await loadPosts({ limit: 3 });
      const org = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: brand, applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS', description: 'Bookings, inventory, catering, GST invoices, payments and crew management for tent houses, caterers and event managers.', url: origin,
        offers: (plat.plans || []).filter(p => p.name).map(p => ({ '@type': 'Offer', name: p.name, price: String(+p.price || 0), priceCurrency: 'INR' })) };
      const lb = { '@context': 'https://schema.org', '@type': 'Organization', name: s.legalName || brand, url: origin, ...(s.phone ? { telephone: s.phone } : {}), ...(s.email ? { email: s.email } : {}), ...(s.address ? { address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressCountry: 'IN' } } : {}), sameAs: ['instagram', 'facebook', 'youtube', 'linkedin'].map(k => safeUrl(s[k])).filter(Boolean) };
      return send(200, shell({ ...base, path: '/', title: `${brand}: tent house, catering & event management app`, desc: 'Bookings, godown stock, catering ration, GST bills, payments and crew in one app for tent houses, caterers and event managers. Works on any phone, in Hindi and English.', image: origin + '/img/og.jpg', body: homePage({ ...base, posts }), jsonld: [org, lb] }));
    }
    if (page === 'blog') {
      const pnum = Math.max(1, Math.min(500, parseInt(q.page || '1', 10) || 1));
      const tag = String(q.tag || '').slice(0, 40);
      const [rows, tagRows] = await Promise.all([loadPosts({ limit: PER_PAGE + 1, offset: (pnum - 1) * PER_PAGE, tag }), loadPosts({ limit: 200 })]);
      const allTags = [...new Set(tagRows.flatMap(p => p.tags || []))].slice(0, 20);
      return send(200, shell({ ...base, path: '/blog' + (pnum > 1 ? '?page=' + pnum : ''), title: `Blog | ${brand}`, desc: 'Tips, season planning and ideas for tent houses, caterers and event managers.', image: origin + '/img/og.jpg', noindex: !!tag, body: blogPage({ ...base, posts: rows.slice(0, PER_PAGE), page: pnum, tag, hasMore: rows.length > PER_PAGE, allTags }) }));
    }
    if (page === 'post') {
      const slug = String(q.slug || '').toLowerCase();
      let p = null;
      if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { try { p = (await sb(`blog_posts?select=*&status=eq.published&slug=eq.${slug}&limit=1`))[0] || null; } catch (e) { } }
      if (!p) return send(404, shell({ ...base, path: '/blog/' + slug, title: `Post not found | ${brand}`, desc: '', noindex: true, body: `<div class="canopy thin" aria-hidden="true"></div><div class="wrap nf"><h1${hi('यह post नहीं मिली')}>This post is not here</h1><p${hi('हो सकता है इसे हटा दिया गया हो या link बदल गया हो।')}>It may have been removed or the link has changed.</p><a class="btn primary" href="/blog"${hi('सभी posts देखें')}>See all posts</a></div>` }), 'text/html; charset=utf-8', 's-maxage=30');
      const more = (await loadPosts({ limit: 4 })).filter(x => x.slug !== p.slug).slice(0, 3);
      const desc = p.seo_description || p.excerpt || strip(p.content).slice(0, 155);
      const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, datePublished: p.published_at, dateModified: p.updated_at || p.published_at, inLanguage: p.lang === 'hi' ? 'hi-IN' : 'en-IN', mainEntityOfPage: origin + '/blog/' + p.slug, ...(p.cover_url ? { image: [p.cover_url] } : {}), author: { '@type': p.author ? 'Person' : 'Organization', name: p.author || brand }, publisher: { '@type': 'Organization', name: brand } };
      return send(200, shell({ ...base, path: '/blog/' + p.slug, title: `${p.seo_title || p.title} | ${brand}`, desc, image: p.cover_url || origin + '/img/og.jpg', type: 'article', jsonld: [ld], body: postPage({ ...base, p, related: more }) }));
    }
    if (page === 'privacy' || page === 'terms') return send(200, shell({ ...base, path: '/' + page, title: `${page === 'privacy' ? 'Privacy policy' : 'Terms of use'} | ${brand}`, desc: `${page === 'privacy' ? 'Privacy policy' : 'Terms of use'} for ${brand}.`, body: legalPage(page, base) }), 'text/html; charset=utf-8', 's-maxage=3600');
    return send(404, shell({ ...base, path: '/' + page, title: `Page not found | ${brand}`, desc: '', noindex: true, body: `<div class="canopy thin" aria-hidden="true"></div><div class="wrap nf"><h1${hi('यह page नहीं मिला')}>This page is not here</h1><p${hi('Link शायद पुराना है।')}>The link may be old.</p><a class="btn primary" href="/"${hi('Home पर जाएं')}>Go to home</a></div>` }), 'text/html; charset=utf-8', 's-maxage=60');
  } catch (e) {
    console.error(e);
    return send(500, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EventPro</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>Something went wrong</h1><p>Please refresh the page, or <a href="/app">open the app</a>.</p></body>`, 'text/html; charset=utf-8', 's-maxage=5');
  }
};
module.exports.sanitize = sanitize;
