/* SabManage public website: home, blog, legal pages, sitemap.
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
  steth: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 11a1.5 1.5 0 1 0 0-.01', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3', video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0', home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', megaphone: 'M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8', sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4', download: 'M12 3v12M7 10l5 5 5-5M4 19h16', android: 'M6 9h12v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM6 9a6 6 0 0 1 12 0M9 6.5h.01M15 6.5h.01M3 10v5M21 10v5M9 18v3M15 18v3',
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
const DEFAULT_SITE = { brandName: 'SabManage', tagline: 'Apne business ka poora hisaab, ek app mein.', about: 'SabManage is built in Jaipur for Indian businesses that run on people and phones: tent houses, caterers, halwais, decorators, event managers, and now doctors and clinics. We sat with them in godowns, kitchens, wedding lawns and clinics to understand how the daily work is really done, and turned that into one simple app that works on any phone, in Hindi and English.', aboutHi: '', legalName: '', address: '', city: 'Jaipur', phone: '', whatsapp: '', email: '', hours: 'Mon–Sat, 10 am – 7 pm', mapUrl: '', instagram: '', facebook: '', youtube: '', linkedin: '', showPricing: true };
/* texts that were the old defaults (never edited in Super Admin) move to the new defaults */
const OLD_DEFAULTS = { tagline: ['Tent, catering aur event ka poora hisaab, ek app mein.'], about: ['SabManage is built in Jaipur for the people who make Indian weddings and events happen: tent houses, caterers, halwais, decorators and event managers. We spent time in godowns, kitchens and wedding lawns to understand how bookings, stock, ration, crew and payments are really handled, and turned that into one simple app that works on any phone.'] };
async function loadSettings() {
  let plat = {};
  try { const r = await sb('platform_settings?id=eq.1&select=data'); plat = (r[0] && r[0].data) || {}; } catch (e) { }
  const site = { ...DEFAULT_SITE, phone: plat.supportPhone || '', whatsapp: plat.supportPhone || '', email: plat.supportEmail || '', ...(plat.site || {}) };
  Object.entries(OLD_DEFAULTS).forEach(([k, olds]) => { if (olds.includes(site[k])) site[k] = DEFAULT_SITE[k]; });
  return { plat: { appName: 'SabManage', trialDays: 14, plans: [], ...plat }, site };
}
const POST_COLS = 'slug,title,excerpt,cover_url,published_at,updated_at,tags,lang,author';
async function loadPosts({ limit = PER_PAGE, offset = 0, tag = '' } = {}) {
  try { return await sb(`blog_posts?select=${POST_COLS}&status=eq.published&order=published_at.desc&limit=${limit}&offset=${offset}${tag ? '&tags=cs.' + encodeURIComponent('{"' + tag.replace(/["\\{},]/g, '') + '"}') : ''}`); } catch (e) { return []; }
}

/* ---------- page shell ---------- */
function shell({ s, plat, origin, path, title, desc, image, body, type = 'website', jsonld = [], noindex = false, hiTitle = '' }) {
  const brand = s.brandName || 'SabManage'; const url = origin + path;
  const nav = [['/#features', 'Features', 'सुविधाएं'], ['/doctors', 'For doctors', 'डॉक्टरों के लिए'], ...(s.showPricing !== false && (plat.plans || []).length ? [['/#pricing', 'Pricing', 'कीमत']] : []), ['/download', 'Android app', 'एंड्रॉयड ऐप'], ['/blog', 'Blog', 'ब्लॉग'], ['/#about', 'About us', 'हमारे बारे में'], ['/#contact', 'Contact', 'संपर्क']];
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
<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">
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
  <nav class="nav" id="nav" aria-label="Main">${nav.map(([h, l, h2]) => `<a href="${h}"${hi(h2)}>${l}</a>`).join('')}<a href="/app" class="mobile-login"${hi('लॉग इन')}>Log in</a></nav>
  <span class="grow"></span>
  <button class="lang" type="button" id="langBtn" aria-label="भाषा / Language" translate="no"><span data-l="hi">हिं</span><span data-l="en" class="on">EN</span></button>
  <a class="btn sm login" href="/app" data-app-link${hi('लॉग इन')}>Log in</a>
  ${plat.allowSignup !== false ? `<a class="btn sm primary start" href="/app#signup"${hi('फ़्री ट्रायल शुरू करें')}>Start free trial</a>` : `<a class="btn sm primary start" href="/#contact"${hi('डेमो लें')}>Book a demo</a>`}
  <button class="menu-btn" type="button" id="menuBtn" aria-label="Menu" aria-expanded="false" aria-controls="nav">${ic('menu')}</button>
</div></header>
<main id="main">
${body}
</main>
<footer>
  <div class="canopy thin" aria-hidden="true"></div>
  <div class="wrap">
    <div class="about-f"><a class="brand" href="/"><span class="mk">${ic('tent')}</span>${esc(brand)}</a>
      <p style="color:var(--ink2);margin-top:12px;max-width:30em"${hi('टेंट हाउस, कैटरर और इवेंट मैनेजर के लिए बुकिंग, स्टॉक, राशन, जीएसटी बिल, पेमेंट और क्रू का ऐप।')}>Bookings, stock, ration, GST bills, payments and crew in one app for tent houses, caterers and event managers.</p>
      ${social ? `<div class="social">${social}</div>` : ''}</div>
    <div><h4${hi('पेज')}>Pages</h4><ul>${nav.map(([h, l, h2]) => `<li><a href="${h}"${hi(h2)}>${l}</a></li>`).join('')}<li><a href="/app"${hi('लॉग इन')}>Log in</a></li></ul></div>
    <div><h4${hi('संपर्क')}>Contact</h4><ul>
      ${s.phone ? `<li><a href="tel:+${waNum(s.phone)}">${esc(s.phone)}</a></li>` : ''}
      ${waN ? `<li><a href="${esc(wa(waN, 'Namaste, I want to know more about ' + brand + '.'))}" target="_blank" rel="noopener"${hi('व्हाट्सऐप')}>WhatsApp</a></li>` : ''}
      ${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
      ${s.address ? `<li style="color:var(--ink2)">${esc(s.address)}</li>` : ''}
    </ul></div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.legalName || brand)}</span><span><a href="/privacy"${hi('प्राइवेसी पॉलिसी')}>Privacy policy</a> &nbsp; <a href="/terms"${hi('नियम और शर्तें')}>Terms of use</a> &nbsp; <a href="/delete-account"${hi('अकाउंट डिलीट करें')}>Delete account</a></span></div>
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
  const brand = s.brandName || 'SabManage'; const trial = +plat.trialDays || 0; const signup = plat.allowSignup !== false;
  const waN = s.whatsapp || s.phone;
  const startBtn = signup ? `<a class="btn primary" href="/app#signup"${hi(trial ? `${trial} दिन का फ़्री ट्रायल शुरू करें` : 'फ़्री में शुरू करें')}>${trial ? `Start ${trial}-day free trial` : 'Start free'}</a>` : `<a class="btn primary" href="#contact"${hi('डेमो लें')}>Book a demo</a>`;
  const waBtn = waN ? `<a class="btn wa" href="${esc(wa(waN, `Namaste, I want a demo of ${brand} for my business.`))}" target="_blank" rel="noopener">${ic('wa')}<span${hi('व्हाट्सऐप पर डेमो')}>Demo on WhatsApp</span></a>` : `<a class="btn" href="#contact"${hi('डेमो लें')}>Book a demo</a>`;
  const who = [
    ['tent', '#2563EB', 'Tent houses', 'टेंट हाउस', 'Know what is in the godown, what is out on rent and what is short for Saturday’s wedding.', 'गोदाम में क्या है, क्या किराए पर बाहर है और शनिवार की शादी के लिए क्या कम है, सब पता रहे।',
      [['Date-wise stock for every shamiana, chair and DG set', 'हर शामियाना, कुर्सी और डीजी सेट का तारीख के हिसाब से स्टॉक'], ['Truck loading list and delivery challan', 'ट्रक लोडिंग लिस्ट और डिलीवरी चालान'], ['Damage and missing items charged to the client', 'टूटे और गुम सामान का चार्ज क्लाइंट के बिल में']]],
    ['pot', '#16A34A', 'Caterers & halwais', 'कैटरर और हलवाई', 'Turn a menu and guest count into the full samagri list and a per-plate price in seconds.', 'मेन्यू और मेहमानों की गिनती से सेकंडों में पूरी सामग्री लिस्ट और प्रति प्लेट रेट निकालें।',
      [['Ration list with your mandi rates', 'आपके मंडी रेट से राशन लिस्ट'], ['Per-plate cost and margin', 'प्रति प्लेट लागत और मार्जिन'], ['Menu saved to each booking', 'हर बुकिंग में मेन्यू सेव']]],
    ['sparkle', '#DB2777', 'Event managers', 'इवेंट मैनेजर', 'Run vendors, crew, run-sheets and client updates for every function from one place.', 'हर फ़ंक्शन के वेंडर, क्रू, रन-शीट और क्लाइंट अपडेट एक ही जगह से संभालें।',
      [['Vendor purchase orders and dues', 'वेंडर के परचेज़ ऑर्डर और बकाया'], ['Live setup tracker for crew', 'क्रू के लिए लाइव सेटअप ट्रैकर'], ['Client page with progress and bill', 'क्लाइंट के लिए प्रोग्रेस और बिल वाला पेज']]],
    ['steth', '#E11D48', 'Doctors & clinics', 'डॉक्टर और क्लिनिक', 'Every patient’s BP, sugar, weight, reports and photos date-wise, with charts. Patients send readings from home.', 'हर मरीज़ का बीपी, शुगर, वज़न, रिपोर्ट और फ़ोटो तारीख के हिसाब से, ग्राफ़ के साथ। मरीज़ घर से रीडिंग भेजते हैं।',
      [['Appointments in clinic, on video or WhatsApp', 'क्लिनिक, वीडियो या व्हाट्सऐप पर अपॉइंटमेंट'], ['Patient sends problems with photo or voice', 'मरीज़ फ़ोटो या आवाज़ में परेशानी भेजे'], ['Fees by UPI with reminders', 'यूपीआई से फ़ीस, याद-दिहानी के साथ']], '/doctors']
  ];
  const feats = [
    ['home', '#1F5EFF', 'Easy home screen', 'आसान होम स्क्रीन', 'Open the app and see today: events, setup done and money to collect. Big buttons for the daily work.', 'ऐप खोलते ही आज की झलक: इवेंट, कितना सेटअप हुआ और कितना पैसा लेना है। रोज़ के काम के बड़े बटन।'],
    ['calendar', '#7C3AED', 'Booking in 4 things', 'सिर्फ़ 4 चीज़ों में बुकिंग', 'Name, mobile, date and amount. Save ready packages like “Wedding 500 guests” and fill everything in one tap.', 'नाम, मोबाइल, तारीख और रकम। "शादी 500 मेहमान" जैसे तैयार पैकेज से सब एक टैप में भरें।'],
    ['box', '#2563EB', 'Godown stock', 'गोदाम का स्टॉक', 'See what is free on any date. Stock is held automatically for confirmed bookings.', 'किसी भी तारीख को क्या खाली है, देखें। पक्की बुकिंग के लिए स्टॉक अपने आप रुक जाता है।'],
    ['pot', '#16A34A', 'Catering calculator', 'कैटरिंग कैलकुलेटर', 'Menu, guests and buffer in; samagri list, raw cost and per-plate price out.', 'मेन्यू, मेहमान और बफ़र डालें; सामग्री लिस्ट, कच्चा खर्च और प्लेट का दाम पाएं।'],
    ['receipt', '#DB2777', 'GST bills with your logo', 'आपके लोगो वाले जीएसटी बिल', 'Quotations, tax invoices, receipts and challans with your logo, stamp and UPI.', 'आपके लोगो, स्टैम्प और यूपीआई के साथ कोटेशन, टैक्स इनवॉइस, रसीद और चालान।'],
    ['rupee', '#0B9B68', 'Payments & reminders', 'पेमेंट और याद-दिहानी', 'Record advances, see who owes what and send a polite WhatsApp reminder in one tap.', 'एडवांस दर्ज करें, किस पर कितना बाकी है देखें और एक टैप में व्हाट्सऐप पर याद दिलाएं।'],
    ['pin', '#0D9488', 'Crew’s own screen', 'क्रू की अपनी स्क्रीन', 'Crew tap “I have reached the site” for attendance and 25% / 50% / Done for their work. Nothing else to learn.', 'क्रू "मैं साइट पर पहुंच गया" दबाकर हाज़िरी लगाते हैं और अपने काम पर 25% / 50% / डन दबाते हैं। और कुछ सीखना नहीं।'],
    ['pulse', '#0EA5E9', 'Live updates', 'लाइव अपडेट', 'When crew update the setup, the owner’s phone shows it within a second. No calls needed.', 'क्रू सेटअप अपडेट करे तो ओनर के फ़ोन पर एक सेकंड में दिख जाता है। फ़ोन करने की ज़रूरत नहीं।'],
    ['bell', '#E11D74', 'Alerts that ring', 'बजने वाले अलर्ट', 'Send “Come to the godown” to a worker. It rings with the SabManage tune, even when their phone is on silent (Android app).', 'कर्मचारी को "गोदाम पर आओ" भेजें। सबमैनेज की धुन के साथ बजेगा, फ़ोन साइलेंट हो तब भी (एंड्रॉयड ऐप)।'],
    ['users', '#0D9488', 'Wages, overtime & kharcha', 'मज़दूरी, ओवरटाइम और खर्चा', 'Duty hours, overtime, extra shifts, advance, food money and bonus. The month’s pay is worked out for you.', 'ड्यूटी के घंटे, ओवरटाइम, एक्स्ट्रा शिफ़्ट, एडवांस, खाने का पैसा और इनाम। महीने की तनख्वाह अपने आप बनती है।'],
    ['chart', '#0891B2', 'Every cost, real profit', 'हर खर्च, असली मुनाफ़ा', 'Expenses, crew wages, food money and vendor orders in one list, and the true profit of every function.', 'खर्च, क्रू की मज़दूरी, खाने का पैसा और वेंडर के ऑर्डर एक लिस्ट में, और हर फ़ंक्शन का असली मुनाफ़ा।'],
    ['megaphone', '#E11D74', 'Free marketing tools', 'फ़्री मार्केटिंग टूल', 'Follow-up reminders for enquiries, Google review requests, rate card PDF, QR poster and anniversary wishes to old clients.', 'इन्क्वायरी के फ़ॉलो-अप, गूगल रिव्यू मांगना, रेट कार्ड पीडीएफ़, क्यूआर पोस्टर और पुराने ग्राहकों को सालगिरह की बधाई।'],
    ['sun', '#F59E0B', 'Morning summary', 'सुबह की झलक', 'At 7:45 every morning: today’s events, tomorrow’s, and who to call back, as a notification.', 'हर सुबह 7:45 बजे नोटिफ़िकेशन: आज के इवेंट, कल के, और किसे फ़ोन करना है।'],
    ['handshake', '#D97706', 'Vendors & POs', 'वेंडर और पीओ', 'Florists, DJs, dairy and crockery partners with purchase orders and dues.', 'फूल वाले, डीजे, डेयरी और क्रॉकरी पार्टनर, परचेज़ ऑर्डर और बकाया के साथ।'],
    ['shield', '#475569', 'Who sees what', 'किसे क्या दिखे', 'Each person gets their own login. Switch any section Off, See or Change for them.', 'हर व्यक्ति का अपना लॉगिन। उनके लिए कोई भी सेक्शन बंद, देखे या बदले करें।'],
    ['globe', '#16A34A', 'Full Hindi + help on every screen', 'पूरी हिंदी + हर स्क्रीन पर मदद', 'The whole app in Hindi (Devanagari) with one tap, and an ⓘ button on every screen that explains it simply.', 'एक टैप में पूरा ऐप हिंदी में, और हर स्क्रीन पर ⓘ बटन जो आसान भाषा में समझाता है।'],
  ];
  const plans = (plat.plans || []).filter(p => p && p.name);
  const mid = plans.length === 3 ? 1 : -1;
  const plansHtml = s.showPricing !== false && plans.length ? `
  <section class="sec" id="pricing"><div class="wrap">
    <div class="sec-h"><h2${hi('सीधी कीमत, कोई छुपा चार्ज नहीं')}>Simple monthly pricing</h2><p${hi('सभी प्लान में पूरा ऐप मिलता है। आपकी टीम के हिसाब से प्लान चुनें।')}>Every plan includes the full app. Pick the one that fits the size of your team.</p></div>
    <div class="plans">${plans.map((p, i) => `<div class="plan ${i === mid ? 'hl' : ''}"><h3>${esc(p.name)}</h3><div class="pr">${inr(p.price)}<small${hi(' / महीना')}> / month</small></div>
      ${p.desc ? `<ul>${String(p.desc).split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 8).map(x => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : `<ul><li>${ic('check')}<span${hi('सभी सेक्शन और जीएसटी बिल')}>All sections and GST bills</span></li><li>${ic('check')}<span${hi('स्टाफ़ लॉगिन और एक्सेस कंट्रोल')}>Staff logins and access control</span></li><li>${ic('check')}<span${hi('क्लाउड बैकअप, किसी भी फ़ोन पर')}>Cloud backup, works on any phone</span></li></ul>`}
      ${signup ? `<a class="btn ${i === mid ? 'primary' : ''}" href="/app#signup"${hi('फ़्री ट्रायल शुरू करें')}>Start free trial</a>` : `<a class="btn ${i === mid ? 'primary' : ''}" href="#contact"${hi('बात करें')}>Talk to us</a>`}</div>`).join('')}</div>
    ${trial ? `<div class="trial">${ic('star')}<span${hi(`पहले ${trial} दिन फ़्री। कार्ड की ज़रूरत नहीं। ट्रायल के बाद प्लान चुनें, आपका डेटा वैसा ही रहेगा।`)}>First ${trial} days are free. No card needed. Choose a plan after the trial; your data stays as it is.</span></div>` : ''}
  </div></section>` : '';
  const blogHtml = posts.length ? `
  <section class="sec soft" id="blog"><div class="wrap">
    <div class="sec-h" style="display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;max-width:none"><div><h2${hi('ब्लॉग से')}>From the blog</h2><p${hi('सीज़न की तैयारी, दाम और बिज़नेस बढ़ाने के तरीके।')}>Season planning, pricing and ways to grow your business.</p></div><a class="btn" href="/blog"${hi('सभी पोस्ट')}>All posts</a></div>
    <div class="posts">${posts.slice(0, 3).map(postCard).join('')}</div>
  </div></section>` : '';
  const ways = [
    waN && ['wa', '#0B9B68', 'WhatsApp', esc(waN), wa(waN, `Namaste, I want to know more about ${brand}.`)],
    s.phone && ['phone', '#1F5EFF', 'Call us', esc(s.phone), 'tel:+' + waNum(s.phone)],
    s.email && ['send', '#7C3AED', 'Email', esc(s.email), 'mailto:' + s.email],
    s.address && ['pin', '#D6246E', 'Office', esc(s.address) + (s.city && !s.address.includes(s.city) ? ', ' + esc(s.city) : ''), safeUrl(s.mapUrl)],
    s.hours && ['clock', '#D97706', 'Working hours', esc(s.hours), '']
  ].filter(Boolean);
  const wayHi = { WhatsApp: 'व्हाट्सऐप', 'Call us': 'कॉल करें', Email: 'ईमेल', Office: 'ऑफ़िस', 'Working hours': 'काम का समय' };
  const faqs = [
    ['Do I need to install anything?', 'क्या कुछ इंस्टॉल करना पड़ेगा?', 'No. It opens in the browser on any Android phone, iPhone or computer. You can add it to your home screen so it opens like an app.', 'नहीं। यह किसी भी एंड्रॉयड फ़ोन, आईफ़ोन या कंप्यूटर के ब्राउज़र में खुलता है। होम स्क्रीन पर जोड़ लें तो ऐप की तरह खुलेगा।'],
    ['Can my staff use it with their own login?', 'क्या मेरा स्टाफ़ अपने लॉगिन से चला सकता है?', 'Yes. You create a login ID and password for each person and choose which sections they can see or change. A crew member can see only their own tasks.', 'हां। आप हर व्यक्ति की लॉगिन आईडी और पासवर्ड बनाते हैं और तय करते हैं कि वे कौन-से सेक्शन देख या बदल सकते हैं। क्रू मेंबर सिर्फ़ अपने काम देख सकता है।'],
    ['Will my bills show my business name and logo?', 'क्या बिल पर मेरे बिज़नेस का नाम और लोगो आएगा?', 'Yes. Your logo, stamp, address, GSTIN, bank details and UPI ID print on every quotation, invoice, receipt and challan.', 'हां। आपका लोगो, स्टैम्प, पता, जीएसटीआईएन, बैंक डिटेल्स और यूपीआई आईडी हर कोटेशन, इनवॉइस, रसीद और चालान पर छपते हैं।'],
    ['Is my data safe?', 'क्या मेरा डेटा सुरक्षित है?', 'Your data is stored in the cloud and only your team can see it. Every login can be protected with a 6-digit Authenticator code.', 'आपका डेटा क्लाउड में सुरक्षित रहता है और सिर्फ़ आपकी टीम देख सकती है। हर लॉगिन को 6 अंकों के ऑथेंटिकेटर कोड से सुरक्षित किया जा सकता है।'],
    ['Can I use it in Hindi?', 'क्या यह हिंदी में चलता है?', 'Yes. Anyone can switch the whole app to Hindi with one tap. Everything is written in Hindi letters, so people who do not read English can use it too.', 'हां। कोई भी एक टैप में पूरा ऐप हिंदी में कर सकता है। सब कुछ हिंदी अक्षरों में लिखा है, ताकि जो अंग्रेज़ी नहीं पढ़ते वे भी चला सकें।'],
    ['Is there a mobile app?', 'क्या मोबाइल ऐप है?', 'Yes. Download the Android app from sabmanage.com/download (Play Store coming soon). On any other phone, open sabmanage.com/app in Chrome or Safari.', 'हां। एंड्रॉयड ऐप sabmanage.com/download से डाउनलोड करें (प्ले स्टोर पर जल्द)। किसी और फ़ोन पर क्रोम या सफ़ारी में sabmanage.com/app खोलें।'],
    ['My crew are not good with phones. Will they manage?', 'मेरा क्रू फ़ोन ज़्यादा नहीं चलाता। क्या वे चला पाएंगे?', 'Yes. Crew see only one simple screen: a big “I have reached the site” button and their own work with 25% / 50% / Done buttons.', 'हां। क्रू को सिर्फ़ एक आसान स्क्रीन दिखती है: बड़ा "मैं साइट पर पहुंच गया" बटन और उनका अपना काम, 25% / 50% / डन बटन के साथ।'],
    ['Is it only for tent houses and events?', 'क्या यह सिर्फ़ टेंट हाउस और इवेंट के लिए है?', 'No. When you sign up you pick your work: tent house, caterer, event manager or doctor / clinic, and the app opens with the right sections. More kinds of business are coming.', 'नहीं। साइन अप करते समय आप अपना काम चुनते हैं: टेंट हाउस, कैटरर, इवेंट मैनेजर या डॉक्टर / क्लिनिक, और ऐप सही सेक्शन के साथ खुलता है। और भी बिज़नेस जल्द जुड़ेंगे।'],
    ['Is patient data safe?', 'क्या मरीज़ों का डेटा सुरक्षित है?', 'Yes. Every doctor is verified before the clinic opens. Data stays in India, photos and voice notes are private files, each patient’s link opens only their own page, and your staff see only what you allow.', 'हां। क्लिनिक खुलने से पहले हर डॉक्टर की जांच होती है। डेटा भारत में रहता है, फ़ोटो और आवाज़ निजी फ़ाइलें हैं, हर मरीज़ का लिंक सिर्फ़ उसका अपना पेज खोलता है, और स्टाफ़ को सिर्फ़ उतना दिखता है जितना आप चाहें।'],
    ['What happens when the trial ends?', 'ट्रायल खत्म होने पर क्या होगा?', 'Choose a plan and we renew your account; everything stays as it is. If you do not renew, the app stops, but your data is kept safe for 90 days so you can come back.', 'प्लान चुनें और हम आपका अकाउंट रिन्यू कर देंगे; सब कुछ वैसा ही रहेगा। रिन्यू न करें तो ऐप बंद हो जाता है, पर आपका डेटा 90 दिन तक सुरक्षित रहता है ताकि आप वापस आ सकें।']
  ];
  return `
  <div class="canopy" aria-hidden="true"></div><div class="lights" aria-hidden="true"></div>
  <section class="hero"><div class="wrap">
    <div>
      <h1${hi(s.tagline === DEFAULT_SITE.tagline ? 'अपने बिज़नेस का पूरा हिसाब, एक ऐप में।' : '')}>${esc(s.tagline || DEFAULT_SITE.tagline)}</h1>
      <p class="lead"${hi('बुकिंग, स्टॉक, बिल, पेमेंट, स्टाफ़ और ग्राहक, सब एक आसान ऐप में। टेंट हाउस, कैटरर, इवेंट मैनेजर, और अब डॉक्टर और क्लिनिक के लिए भी: मरीज़ों का रिकॉर्ड, ग्राफ़, अपॉइंटमेंट और ऑनलाइन फ़ीस।')}>Bookings, stock, bills, payments, staff and customers in one simple app. Made for tent houses, caterers and event managers, and now for doctors and clinics too: patient records with charts, appointments and online fees.</p>
      <div class="cta">${startBtn}<a class="btn" href="/download">${ic('android')}<span${hi('ऐप डाउनलोड करें')}>Download app</span></a>${waBtn}</div>
      <ul class="facts"><li>${ic('check')}<span${hi('किसी भी फ़ोन पर')}>Works on any phone</span></li><li>${ic('check')}<span${hi('पूरी हिंदी में')}>Full Hindi</span></li><li>${ic('check')}<span${hi('स्टाफ़ के लिए आसान')}>Easy for staff</span></li><li>${ic('check')}<span${hi('डॉक्टरों के लिए भी')}>For doctors too</span></li><li>${ic('check')}<span${hi('आपके लोगो वाले जीएसटी बिल')}>GST bills with your logo</span></li></ul>
    </div>
    <div class="tagstack">
      <div class="phone"><img src="/img/app-dashboard.webp" width="390" height="780" alt="SabManage app home screen showing money pending from clients, upcoming events and quick actions" fetchpriority="high"></div>
      <div class="sticker a"><i style="background:#0B9B68">${ic('rupee')}</i><span${hi('पेमेंट मिला<small>एडवांस दर्ज हो गया</small>')}>Payment received<small>Advance recorded</small></span></div>
      <div class="sticker b"><i style="background:#D6246E">${ic('receipt')}</i><span${hi('जीएसटी बिल तैयार<small>व्हाट्सऐप पर भेजें</small>')}>GST bill ready<small>Send on WhatsApp</small></span></div>
    </div>
  </div></section>

  <section class="sec soft" id="who"><div class="wrap">
    <div class="sec-h"><h2${hi('आपके काम के हिसाब से बना ऐप')}>One app, set up for your kind of business</h2><p${hi('साइन अप करते समय अपना काम चुनें: टेंट हाउस, कैटरर, इवेंट मैनेजर या डॉक्टर। ऐप उसी के हिसाब से खुलता है, फ़ालतू सेक्शन नहीं।')}>Pick your work when you sign up: tent house, caterer, event manager or doctor. The app opens with only the sections you need.</p></div>
    <div class="who">${who.map(([i, c, t, th, d, dh, list, link]) => `<article style="--c:${c}"><div class="ib">${ic(i)}</div><h3${hi(th)}>${t}</h3><p style="color:var(--ink2);margin-top:8px"${hi(dh)}>${d}</p><ul>${list.map(([e, h]) => `<li>${ic('check')}<span${hi(h)}>${e}</span></li>`).join('')}</ul>${link ? `<a class="more" href="${link}"><span${hi('और जानें')}>Learn more</span> ${ic('arrow')}</a>` : ''}</article>`).join('')}</div>
  </div></section>

  <section class="sec" id="features"><div class="wrap">
    <div class="sec-h"><h2${hi('रोज़ के काम के लिए सब कुछ')}>Everything the daily work needs</h2><p${hi('इन्क्वायरी से लेकर आखिरी पेमेंट तक, हर कदम एक जगह।')}>From the first enquiry to the last payment, every step in one place.</p></div>
    <div class="feats">${feats.map(([i, c, t, th, d, dh]) => `<div class="feat" style="--c:${c}"><div class="ib">${ic(i)}</div><div><h3${hi(th)}>${t}</h3><p${hi(dh)}>${d}</p></div></div>`).join('')}</div>
  </div></section>

  <section class="sec soft"><div class="wrap">
    <div class="spot" style="--c:#DB2777"><div class="shot"><img src="/img/app-invoice.webp" width="390" height="780" loading="lazy" alt="A GST tax invoice in the app with the business logo and totals"></div>
      <div><h3${hi('आपका नाम, आपका लोगो, हर बिल पर')}>Your name and logo on every bill</h3><p${hi('कोटेशन बनाएं, क्लाइंट के हां कहते ही उसे टैक्स इनवॉइस में बदलें, और पीडीएफ़ या व्हाट्सऐप पर भेजें।')}>Make a quotation, turn it into a tax invoice when the client agrees, and send it as a PDF or on WhatsApp.</p>
      <ul><li${hi('सीजीएसटी/एसजीएसटी या आईजीएसटी अपने आप')}>CGST/SGST or IGST worked out for you</li><li${hi('बिल पर यूपीआई आईडी ताकि क्लाइंट तुरंत पे करे')}>UPI ID on the bill so clients pay faster</li><li${hi('बुक्ड आइटम और मेन्यू एक टैप में बिल में')}>Booked items and the menu added in one tap</li></ul></div></div>
    <div class="spot flip" style="--c:#0EA5E9"><div class="shot"><img src="/img/app-event.webp" width="390" height="780" loading="lazy" alt="An event page in the app with stage, guests, items and setup progress"></div>
      <div><h3${hi('हर फ़ंक्शन की पूरी जानकारी एक पेज पर')}>Every function on one page</h3><p${hi('स्टेज, मेहमान, बुक्ड आइटम, रन-शीट, सेटअप के काम, खर्च और पेमेंट, सब उसी इवेंट के अंदर।')}>Stage, guests, booked items, run-sheet, setup tasks, costs and payments, all inside the event.</p>
      <ul><li${hi('कम स्टॉक की चेतावनी बुकिंग के समय ही')}>Stock shortage warning while you book</li><li${hi('क्लाइंट को लिंक भेजें, वे प्रोग्रेस और बिल देख सकें')}>Share a link so the client sees progress and the bill</li><li${hi('इवेंट के बाद रिव्यू मांगें')}>Ask for a review after the event</li></ul></div></div>
  </div></section>

  <section class="sec" id="clinics"><div class="wrap">
    <div class="spot" style="--c:#E11D48"><div class="shot"><img src="/img/app-patient.webp" width="390" height="780" loading="lazy" alt="A patient's page in Hindi with BP, sugar and weight charts and big buttons to send readings"></div>
      <div><span class="kicker"${hi('नया: डॉक्टरों और क्लिनिक के लिए')}>New: for doctors and clinics</span><h3${hi('हर मरीज़ की सेहत, ग्राफ़ में')}>Every patient’s health, in charts</h3><p${hi('मरीज़ घर से अपना बीपी, शुगर और वज़न भेजते हैं, फ़ोटो या आवाज़ में परेशानी बताते हैं, अपॉइंटमेंट बुक करते हैं और यूपीआई से फ़ीस देते हैं। आप सब कुछ ग्राफ़ और तारीख के हिसाब से देखते हैं।')}>Patients send their BP, sugar and weight from home, tell their problem with a photo or voice note, book an appointment and pay the fee by UPI. You see it all as charts and date-wise records.</p>
      <ul><li${hi('मरीज़ के लिए कोई ऐप या लॉगिन नहीं, बस एक निजी लिंक')}>No app or login for the patient, just a private link</li><li${hi('वीडियो कॉल, व्हाट्सऐप कॉल या क्लिनिक विज़िट')}>Video call, WhatsApp call or clinic visit</li><li${hi('स्टाफ़ को सिर्फ़ उतना दिखे जितना आप चाहें')}>Staff see only what you allow</li></ul>
      <a class="btn primary" href="/doctors"${hi('डॉक्टरों के लिए देखें')}>See how it works for doctors</a></div></div>
  </div></section>

  <section class="sec" id="how"><div class="wrap">
    <div class="sec-h"><h2${hi('एक दिन में शुरू करें')}>Start in a day</h2></div>
    <ol class="steps">
      <li><h3${hi('अकाउंट बनाएं')}>Create your account</h3><p${hi('बिज़नेस का नाम और मोबाइल नंबर डालें। आप ओनर बनते हैं।')}>Enter your business name and mobile number. You become the Owner.</p></li>
      <li><h3${hi('अपना सामान और मेन्यू जोड़ें')}>Add your stock and menu</h3><p${hi('टेंट, कुर्सियां, लाइट, डिश और रेट एक बार डालें। लोगो और जीएसटी डिटेल्स भी।')}>Add tents, chairs, lights, dishes and rates once, plus your logo and GST details.</p></li>
      <li><h3${hi('टीम को जोड़ें और बुकिंग लें')}>Add your team and take bookings</h3><p${hi('मैनेजर, अकाउंटेंट और क्रू के लॉगिन बनाएं और पहली बुकिंग डालें।')}>Create logins for your manager, accountant and crew, then add your first booking.</p></li>
    </ol>
  </div></section>
  ${plansHtml}
  ${blogHtml}
  <section class="sec" id="about"><div class="wrap about">
    <div class="txt"><h2 style="margin-bottom:18px"${hi('हमारे बारे में')}>About us</h2><p${hi(s.aboutHi || (s.about === DEFAULT_SITE.about ? 'सबमैनेज जयपुर में उन भारतीय बिज़नेस के लिए बना है जो लोगों और फ़ोन से चलते हैं: टेंट हाउस, कैटरर, हलवाई, डेकोरेटर, इवेंट मैनेजर, और अब डॉक्टर और क्लिनिक। हमने गोदामों, रसोइयों, शादी के लॉन और क्लिनिकों में बैठकर समझा कि रोज़ का काम असल में कैसे होता है, और उसे एक आसान ऐप में बदला जो किसी भी फ़ोन पर, हिंदी और अंग्रेज़ी में चलता है।' : ''))}>${esc(s.about || DEFAULT_SITE.about)}</p></div>
    <dl>
      <div><dt${hi(`${s.city || 'भारत'} में बना`)}>Made in ${esc(s.city || 'India')}</dt><dd${hi('भारतीय बिज़नेस के असली रोज़ के काम को समझकर बनाया गया।')}>Designed around how Indian businesses really work, day to day.</dd></div>
      <div><dt${hi('आपकी भाषा में')}>In your language</dt><dd${hi('पूरा ऐप हिंदी और अंग्रेज़ी में, एक टैप में बदलें।')}>The whole app works in Hindi and English, switch with one tap.</dd></div>
      <div><dt${hi('आपका डेटा, आपकी टीम')}>Your data stays with your team</dt><dd${hi('हर व्यक्ति वही देखता है जो आप अनुमति देते हैं।')}>Each person sees only what you allow.</dd></div>
    </dl>
  </div></section>

  <section class="sec soft" id="faq"><div class="wrap">
    <div class="sec-h"><h2${hi('अक्सर पूछे जाने वाले सवाल')}>Common questions</h2></div>
    <div class="faq">${faqs.map(([q, qh, a, ah]) => `<details><summary${hi(qh)}>${q}</summary><p${hi(ah)}>${a}</p></details>`).join('')}</div>
  </div></section>

  <section class="sec" id="contact"><div class="wrap">
    <div class="sec-h"><h2${hi('संपर्क करें')}>Contact us</h2><p${hi('अपना नंबर छोड़ें, हमारी टीम आपको कॉल करके फ़्री डेमो देगी।')}>Leave your number and our team will call you for a free demo.</p></div>
    <div class="contact">
      <form class="cform" id="enqForm" novalidate>
        <label><span${hi('आपका नाम')}>Your name</span><input name="name" required maxlength="120" autocomplete="name"></label>
        <label><span${hi('मोबाइल नंबर')}>Mobile number</span><input name="phone" type="tel" required maxlength="16" autocomplete="tel" inputmode="tel" placeholder="98290 12345"></label>
        <label><span${hi('बिज़नेस का नाम')}>Business name</span><input name="business" maxlength="160" autocomplete="organization"></label>
        <label><span${hi('शहर')}>City</span><input name="city" maxlength="80" autocomplete="address-level2"></label>
        <label class="full"><span${hi('आपका काम')}>Your business</span><select name="bizType"><option value="Tent house"${hi('टेंट हाउस')}>Tent house</option><option value="Caterer / Halwai"${hi('कैटरर / हलवाई')}>Caterer / Halwai</option><option value="Event manager"${hi('इवेंट मैनेजर')}>Event manager</option><option value="Decorator"${hi('डेकोरेटर')}>Decorator</option><option value="Other"${hi('अन्य')}>Other</option></select></label>
        <label class="full"><span${hi('मैसेज (ज़रूरी नहीं)')}>Message (optional)</span><textarea name="message" rows="3" maxlength="2000"></textarea></label>
        <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="full"><button class="btn primary" type="submit" style="width:100%"${hi('कॉल बैक मांगें')}>Request a call back</button></div>
        <div class="msg" id="enqMsg" hidden role="status"></div>
      </form>
      <div class="cways">${ways.map(([i, c, t, v, href]) => `${href ? `<a class="cway" style="--c:${c}" href="${esc(href)}"${/^https/.test(href) ? ' target="_blank" rel="noopener"' : ''}>` : `<div class="cway" style="--c:${c}">`}<i>${ic(i)}</i><div><b${hi(wayHi[t])}>${t}</b><span>${v}</span></div>${href ? '</a>' : '</div>'}`).join('')}</div>
    </div>
  </div></section>

  <div class="wrap"><div class="band"><div><h2${hi('इस सीज़न का पूरा हिसाब एक जगह रखें')}>Keep this season’s hisaab in one place</h2><p${hi(trial ? `${trial} दिन फ़्री। कार्ड की ज़रूरत नहीं।` : 'आज ही शुरू करें।')}>${trial ? `${trial} days free. No card needed.` : 'Start today.'}</p></div><div style="display:flex;gap:12px;flex-wrap:wrap">${startBtn}${waN ? `<a class="btn wa" href="${esc(wa(waN, `Namaste, I want a demo of ${brand} for my business.`))}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}</div></div></div>`;
}

function postCard(p) {
  return `<a class="pcard" href="/blog/${esc(p.slug)}"${p.lang === 'hi' ? ' lang="hi"' : ''}><div class="im">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : ic('sparkle')}</div><div class="tx"><time datetime="${esc(p.published_at)}">${fmtDate(p.published_at)}</time><h3>${esc(p.title)}</h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</div></a>`;
}

/* ---------- blog ---------- */
function blogPage({ s, posts, page, tag, hasMore, allTags }) {
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap">
  <div class="bhead"><h1>${tag ? '#' + esc(tag) : `<span${hi('ब्लॉग')}>Blog</span>`}</h1><p${hi('टेंट, कैटरिंग और इवेंट बिज़नेस चलाने के लिए टिप्स, सीज़न की तैयारी और नए तरीके।')}>Tips, season planning and new ideas for running a tent, catering or event business.</p>
  ${allTags.length ? `<div class="tags"><a href="/blog" class="${tag ? '' : 'on'}"${hi('सभी')}>All</a>${allTags.map(t => `<a href="/blog?tag=${encodeURIComponent(t)}" class="${t === tag ? 'on' : ''}">${esc(t)}</a>`).join('')}</div>` : ''}</div>
  ${posts.length ? `<div class="posts">${posts.map(postCard).join('')}</div>` : `<div class="empty-blog"><h3${hi('जल्द आ रहा है')}>Posts are on the way</h3><p style="margin-top:8px"${hi('पहली पोस्ट जल्द आएगी। तब तक ऐप आज़माएं।')}>The first post is coming soon. Try the app in the meantime.</p><p style="margin-top:18px"><a class="btn primary" href="/"${hi('होम पर जाएं')}>Go to home</a></p></div>`}
  ${page > 1 || hasMore ? `<div class="pager">${page > 1 ? `<a class="btn" href="/blog?page=${page - 1}${tag ? '&tag=' + encodeURIComponent(tag) : ''}"${hi('नए पोस्ट')}>Newer posts</a>` : ''}${hasMore ? `<a class="btn" href="/blog?page=${page + 1}${tag ? '&tag=' + encodeURIComponent(tag) : ''}"${hi('पुराने पोस्ट')}>Older posts</a>` : ''}</div>` : ''}
  </div>`;
}
function postPage({ s, plat, p, related, origin }) {
  const words = strip(p.content).split(' ').length; const mins = Math.max(1, Math.round(words / 200));
  const url = origin + '/blog/' + p.slug; const signup = plat.allowSignup !== false;
  const shareText = `${p.title} ${url}`;
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap"><article class="article"${p.lang === 'hi' ? ' lang="hi"' : ''}>
    <div class="crumb"><a href="/blog"${hi('ब्लॉग')}>Blog</a>${(p.tags || []).length ? ` / <a href="/blog?tag=${encodeURIComponent(p.tags[0])}">${esc(p.tags[0])}</a>` : ''}</div>
    <h1>${esc(p.title)}</h1>
    <div class="meta"><time datetime="${esc(p.published_at)}">${fmtDate(p.published_at)}</time>${p.author ? `<span>${esc(p.author)}</span>` : ''}<span${hi(`${mins} मिनट में पढ़ें`)}>${mins} min read</span></div>
    ${p.cover_url ? `<div class="cover"><img src="${esc(p.cover_url)}" alt="" fetchpriority="high"></div>` : '<div style="height:26px"></div>'}
    <div class="post-body">${sanitize(p.content)}</div>
    <div class="share"><b${hi('शेयर करें')}>Share</b><a class="btn sm wa" href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a><a class="btn sm" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">${ic('fb')}Facebook</a><button class="btn sm" type="button" data-copy="${esc(url)}">${ic('copy')}<span${hi('लिंक कॉपी करें')}>Copy link</span></button></div>
    <div class="cta-box"><div><h3${hi(`अपना बिज़नेस ${s.brandName || 'SabManage'} पर चलाएं`)}>Run your business on ${esc(s.brandName || 'SabManage')}</h3><p${hi('बुकिंग, स्टॉक, कैटरिंग, जीएसटी बिल और पेमेंट एक ऐप में।')}>Bookings, stock, catering, GST bills and payments in one app.</p></div>${signup ? `<a class="btn primary" href="/app#signup"${hi('फ़्री ट्रायल शुरू करें')}>Start free trial</a>` : `<a class="btn primary" href="/#contact"${hi('डेमो लें')}>Book a demo</a>`}</div>
  </article>
  ${related.length ? `<div style="margin-top:60px"><h2 style="font-size:30px;margin-bottom:22px"${hi('और पढ़ें')}>Read next</h2><div class="posts">${related.map(postCard).join('')}</div></div>` : ''}
  </div>`;
}

/* ---------- legal ---------- */
const TERMS_VERSION = '2026-10-17.2';
function legalPage(kind, { s, plat = {} }) {
  const org = esc(s.legalName || s.brandName || 'SabManage'); const brand = esc(s.brandName || 'SabManage');
  const contact = [s.email && `email <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`, s.phone && `call or WhatsApp ${esc(s.phone)}`].filter(Boolean).join(' or ') || 'use the contact form on our website';
  const city = s.city ? esc(s.city) : 'Jaipur, Rajasthan'; const trial = +plat.trialDays || 14; const grace = +plat.graceDays || 0;
  const updated = '17 October 2026';
  const sum = (items) => `<div class="legal-sum"><h2${hi('सरल भाषा में मुख्य बातें')}>The main points, simply</h2><ul>${items.map(([e, h]) => `<li${hi(h)}>${e}</li>`).join('')}</ul><p class="tiny"${hi('यह सारांश है। पूरी शर्तें नीचे लिखी हैं और वही मान्य हैं।')}>This is a summary. The full text below is what applies.</p></div>`;
  if (kind === 'privacy') return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext"><h1${hi('प्राइवेसी पॉलिसी')}>Privacy policy</h1><p${hi('अपडेट: 17 अक्टूबर 2026')}>Last updated ${updated}</p>
  ${sum([
    ['Your business data belongs to you. We do not sell it or use it for ads.', 'आपके बिज़नेस का डेटा आपका है। हम इसे न बेचते हैं, न विज्ञापन के लिए इस्तेमाल करते हैं।'],
    ['Each person sees only what the owner allows. Data is stored in India (Mumbai).', 'हर व्यक्ति वही देखता है जो ओनर अनुमति दे। डेटा भारत (मुंबई) में रखा जाता है।'],
    ['We do not track your location and do not read your phone contacts.', 'हम आपकी लोकेशन ट्रैक नहीं करते और फ़ोन के कॉन्टैक्ट नहीं पढ़ते।'],
    ['Notifications need your permission; you can turn them off any time in phone settings.', 'नोटिफ़िकेशन आपकी इजाज़त से आते हैं; फ़ोन की सेटिंग्स से कभी भी बंद कर सकते हैं।'],
    ['You are responsible for the client and crew details you enter, and for having their permission.', 'आप जो क्लाइंट और क्रू की जानकारी डालते हैं, उसकी और उनकी इजाज़त की ज़िम्मेदारी आपकी है।'],
    ['Patients’ health records are private files: only the clinic’s allowed staff and the patient’s own link can open them.', 'मरीज़ों के सेहत के रिकॉर्ड निजी फ़ाइलें हैं: सिर्फ़ क्लिनिक का अनुमति वाला स्टाफ़ और मरीज़ का अपना लिंक इन्हें खोल सकता है।'],
    ['You can download a backup any time, and ask us to delete your account.', 'आप कभी भी बैकअप डाउनलोड कर सकते हैं और अकाउंट डिलीट करने को कह सकते हैं।']])}
  <p>This policy explains what ${org} (“we”, “us”) collects when you use ${brand} (the app at sabmanage.com/app, the Android app and the website), why, and what choices you have. It is written to follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 of India.</p>
  <h2>1. Our role</h2><p>For your own account (name, login, plan) we decide how the data is used. For the business data you and your team enter (clients, crew, events, bills, and for clinics, patients and their health records), <b>your business decides</b> what is entered and why, and we process it only to run the service for you. In the language of the DPDP Act, your business is the Data Fiduciary for that data and we act as its Data Processor.</p>
  <h2>2. What we collect</h2><ul>
    <li><b>Account details:</b> name, mobile number or email used to log in, business name, role in the business, and the date you accepted our terms. Passwords are stored only in hashed form.</li>
    <li><b>Business data you enter:</b> bookings, client names, phone numbers and addresses, stock, menus, quotations, invoices, payments, vendors and purchase orders, expenses, crew names, phone numbers, wages, attendance, hours, advances and payouts, setup tasks, reviews, packages and settings such as your logo, stamp, GSTIN and bank/UPI details.</li>
    <li><b>Team alerts and activity:</b> alerts sent inside your business, who has seen them, and a log of changes made by each login.</li>
    <li><b>Attendance from crew phones:</b> when a crew member taps “I have reached the site”, we record the date and time. <b>We do not collect GPS location.</b></li>
    <li><b>Notifications:</b> if you allow notifications, your phone or browser gives us a notification address (push subscription) and we store it with your app language.</li>
    <li><b>Technical data:</b> login times, browser/app type and basic logs needed to keep the service secure and working. The app keeps small settings (language, last business opened) on your device.</li>
    <li><b>Website:</b> the name, number and message you send through our contact form; account-deletion requests; a referral code if you came through another business’s link.</li>
    <li><b>Clinics (health data):</b> patient name, age, gender, mobile, illness and allergies; readings such as BP, sugar, weight, pulse, oxygen and temperature; visit notes, diagnosis, medicines and advice; reports, photos and voice notes; appointments, fees and payment messages; and the time the patient agreed to use the patient page. This is sensitive personal data and is handled only for the patient’s care by their clinic.</li>
    <li><b>Doctor verification:</b> the doctor’s registration number, council, qualification and the certificate files uploaded at sign-up. Only our verification team sees them.</li></ul>
  <p>We do not access your phone’s contacts or location. The camera and microphone are used only when you tap Photo or Voice note, and only that photo or recording is uploaded.</p>
  <h2>3. Why we use it</h2><ul>
    <li>To run the service: show your data to the people you give access to, calculate bills, stock, wages and profit, and keep your team in sync.</li>
    <li>To send notifications you allowed: team alerts, “work done” updates and a morning summary.</li>
    <li>To contact you about your account, renewals, support and important changes.</li>
    <li>To keep the service secure, prevent misuse and fix problems.</li></ul>
  <p>We do not sell personal data, show ads, or use your business data to train advertising or AI models.</p>
  <h2>4. Who else handles the data</h2><p>We use trusted providers only to run the service:</p><ul>
    <li><b>Supabase</b> (database, login and file storage), with your data stored in the Mumbai, India region.</li>
    <li><b>Vercel</b> (website and app hosting).</li>
    <li><b>Google, Apple or Mozilla push services</b>, which carry encrypted notifications to your phone.</li>
    <li>Public content networks (jsDelivr, Google Fonts) that deliver app code and fonts; they do not receive your business data.</li>
    <li>Jitsi Meet (for video consultations that a clinic starts) and WhatsApp (for calls and messages you choose to send). Calls are not recorded or stored by us.</li></ul>
  <p>Messages you send through WhatsApp buttons open in your own WhatsApp and are sent by you; we do not see them. We may share data if required by Indian law or a valid order of a court or authority.</p>
  <h2>5. Your clients’, crew’s and patients’ information</h2><p>You control the client and crew details you enter. You confirm that you have a lawful reason and, where needed, their consent to store them and to message them, and that you will tell them how their details are used. A client link shows that client only their own event, programme and bill. A patient link shows that patient only their own readings, messages, appointments and fees, and works only after the patient agrees. Patients who want their data corrected or deleted should ask their clinic; we help the clinic do it. Lists you download (for example the client list) leave our system and are then your responsibility.</p>
  <h2>6. How we protect it</h2><p>All traffic is encrypted (HTTPS). Every business is separated by database access rules checked on the server, and every person sees only the sections the owner allows. Logins can be protected with an Authenticator code. Notification keys are kept in an encrypted vault. Patient photos, reports, voice notes and doctor certificates are stored as private files that open only through short-lived links for people who are allowed to see them.</p>
  <h2>7. How long we keep it</h2><ul>
    <li>While your account is active.</li>
    <li>If a plan ends and is not renewed, the business is blocked but data is kept for 90 days so you can renew. After that we may delete it, after telling you on WhatsApp or email.</li>
    <li>When you ask us to delete your account, we confirm with you and delete it within 7 days. Copies in backups are removed within 30 days.</li>
    <li>Where tax or other law requires records to be kept, you should keep your own copies (download a backup from Settings).</li></ul>
  <h2>8. Your rights</h2><p>You can see and correct your data in the app at any time, download a full backup from Settings, withdraw notification permission in phone settings, ask us to delete your account (in the app: your name → Delete my account, or the <a href="/delete-account">account deletion page</a>), and raise a grievance with us. Crew and clients whose details a business entered should first contact that business; we will help the business respond.</p>
  <h2>9. Children</h2><p>${brand} accounts are for businesses and are not meant for anyone under 18. A child’s health details may be recorded by a clinic, and a parent or guardian uses the patient page for the child.</p>
  <h2>10. Changes</h2><p>If we change this policy we will update the date above, and for important changes we will tell owners inside the app.</p>
  <h2>11. Contact and grievance officer</h2><p>For privacy questions or complaints, ${contact}. We reply within 7 days and resolve grievances within 30 days.</p></div>`;
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext"><h1${hi('इस्तेमाल की शर्तें')}>Terms of use</h1><p${hi(`अपडेट: 17 अक्टूबर 2026 · वर्ज़न ${TERMS_VERSION}`)}>Last updated ${updated} · Version ${TERMS_VERSION}</p>
  ${sum([
    [`First ${trial} days are free. After that a monthly or yearly plan is needed.`, `पहले ${trial} दिन फ़्री। उसके बाद महीने या साल का प्लान लेना होगा।`],
    [`When the plan ends${grace ? ` (plus ${grace} grace days)` : ''}, the app stops working until you renew. Your data stays safe for 90 days.`, `प्लान खत्म होने पर${grace ? ` (${grace} दिन की छूट के बाद)` : ''} रिन्यू करने तक ऐप बंद रहेगा। आपका डेटा 90 दिन तक सुरक्षित रहेगा।`],
    ['Paid fees are not refunded unless we agree in writing.', 'दिया गया पैसा वापस नहीं होगा, जब तक हम लिखकर न मानें।'],
    ['Your data is yours. Keep passwords safe; you are responsible for the logins you make for your staff.', 'आपका डेटा आपका है। पासवर्ड संभालकर रखें; स्टाफ़ के लिए बनाए लॉगिन की ज़िम्मेदारी आपकी है।'],
    ['Bills, GST, wages and messages you send are your responsibility; the app helps you prepare them.', 'बिल, जीएसटी, मज़दूरी और भेजे गए मैसेज आपकी ज़िम्मेदारी हैं; ऐप सिर्फ़ उन्हें बनाने में मदद करता है।'],
    ['Do not send messages to people who have not agreed, and do not ask for fake reviews.', 'जिन्होंने इजाज़त न दी हो उन्हें मार्केटिंग मैसेज न भेजें, और नकली रिव्यू न मंगवाएं।'],
    ['Notifications can be late or missed; do not depend on them for emergencies.', 'नोटिफ़िकेशन देर से आ सकते हैं या छूट सकते हैं; इमरजेंसी के लिए इन पर निर्भर न रहें।'],
    ['Doctors: only verified doctors can open a clinic. Medical decisions and telemedicine rules are yours; the app does not diagnose.', 'डॉक्टर: सिर्फ़ जांचे हुए डॉक्टर ही क्लिनिक खोल सकते हैं। इलाज के फ़ैसले और टेलीमेडिसिन के नियम आपकी ज़िम्मेदारी हैं; ऐप डायग्नोसिस नहीं करता।'],
    [`Any dispute is under Indian law, courts at ${city}.`, `कोई भी विवाद भारतीय कानून के तहत, ${/jaipur/i.test(city) ? 'जयपुर' : city} की अदालतों में।`]])}
  <p>These terms are an agreement between you (and the business you represent) and ${org} (“we”, “us”) for using ${brand}: the app at sabmanage.com/app, the Android app and the website. By creating an account, ticking “I agree” or using ${brand}, you accept these terms. If you use it for a business, you confirm you are allowed to accept them for that business. You must be at least 18.</p>
  <h2>1. The service</h2><p>${brand} helps tent houses, caterers, decorators and event managers manage bookings, stock, catering, bills, payments, vendors, crew, expenses, reports, marketing and team alerts, and helps doctors and clinics manage patients, readings, medical records, appointments, online consultations and fees. We keep improving it and may add, change or remove features. Where a change removes something important you rely on, we will tell you in advance where possible.</p>
  <h2>2. Accounts and logins</h2><ul>
    <li>The person who signs up becomes the Owner of the business account and controls who can log in and what each person can see or change.</li>
    <li>Keep passwords private. You are responsible for everything done through logins you create, and for removing access when a person leaves.</li>
    <li>Give correct details, including the business, GST, bank and UPI details printed on your bills.</li>
    <li>Tell us quickly if you think a login was misused.</li></ul>
  <h2>3. Free trial, plans and payment</h2><ul>
    <li>New businesses get a free trial of ${trial} days unless we say otherwise.</li>
    <li>After the trial, a paid plan is needed. Prices are shown on our website or agreed with you in writing (a special price applies only to that business). Taxes such as GST are added where applicable.</li>
    <li>Plans are paid in advance for the period chosen. Fees already paid are not refundable, except where we agree in writing or the law requires it.</li>
    <li>We may change plan prices for future periods with at least 30 days’ notice. A price change does not affect a period you have already paid for.</li></ul>
  <h2>4. When a plan ends</h2><p>When the plan’s validity ends${grace ? ` and the ${grace}-day grace period passes` : ''}, the business is blocked: no one in it can open its data until the plan is renewed. Your data is kept for 90 days after the end date. After that we may delete it, after informing the owner on WhatsApp or email. Download a backup from Settings if you do not plan to renew.</p>
  <h2>5. Your data</h2><ul>
    <li>The business data you enter belongs to you. You give us permission to store and process it only to provide the service to you and your team.</li>
    <li>You are responsible for the data you enter, including personal details of clients and crew, and for having a lawful reason and any consent needed under the Digital Personal Data Protection Act, 2023. Our <a href="/privacy">privacy policy</a> explains how we handle data.</li>
    <li>You can download a backup at any time from Settings, and ask us to delete your account from the app or our <a href="/delete-account">account deletion page</a>.</li></ul>
  <h2>6. Bills, tax, wages and money</h2><p>${brand} helps you prepare quotations, GST invoices, receipts, challans, payroll, overtime, expense and profit figures from the data you enter. You remain responsible for checking them, for your GST and tax filings, for paying your staff correctly under applicable labour laws, and for the money you collect and pay. We do not handle your payments to or from your clients.</p>
  <h2>7. Messages, marketing and reviews</h2><ul>
    <li>WhatsApp, call and share buttons open your own apps; messages are sent by you, from your number.</li>
    <li>Send marketing or broadcast messages only to people who have agreed to hear from you, stop when they ask, and follow WhatsApp’s and Meta’s rules.</li>
    <li>Ask only real clients for reviews and follow Google’s review rules. Do not offer rewards for reviews or post fake reviews.</li>
    <li>Client lists you download are your responsibility once downloaded.</li></ul>
  <h2>8. Doctors, clinics and patients</h2><ul>
    <li>Clinic features are only for registered medical practitioners (and their staff) with a valid registration with the National Medical Commission or a State Medical Council, or the council for their system of medicine. We check the registration certificate before a clinic opens, but you remain responsible for keeping your registration valid. We may suspend a clinic if the registration is not valid.</li>
    <li>${brand} is a record-keeping and communication tool. It is not a medical device and does not diagnose, prescribe or give medical advice. Coloured numbers and alerts are only general hints. All medical decisions are yours.</li>
    <li>Online consultations (video or WhatsApp calls) must follow the Telemedicine Practice Guidelines and the medical council rules that apply to you, including identifying the patient, getting consent, and the rules on what may be prescribed online. Video rooms run on Jitsi Meet and calls on WhatsApp, under those services’ own terms.</li>
    <li>Patient details are sensitive personal data. Your clinic decides what is recorded and is responsible for the patient’s consent, for telling patients how their data is used, and for keeping medical records for as long as the law requires. Download copies before you close your account.</li>
    <li>The patient link is private to each patient. Patients agree to share their readings, messages, photos and voice notes with your clinic before they can use it. If a link reaches the wrong person, make a new link at once.</li>
    <li>Fees paid by UPI go straight from the patient to you. We do not handle that money, and “I have paid” on the patient page is only the patient’s message until you confirm it.</li>
    <li>Patients use the patient page under your clinic’s care. It is not for emergencies: it tells patients to call 108 or go to the nearest hospital.</li></ul>
  <h2>9. Notifications and alerts</h2><p>Team alerts, updates and the morning summary depend on the phone, its settings, internet, battery-saver settings and services run by Google, Apple and others. They may be delayed or not delivered. In the Android app, team alerts may ring with an alarm-type sound even when the phone is on silent; each person can change this in the phone’s notification settings. Do not rely on ${brand} notifications for emergencies or safety.</p>
  <h2>10. Fair use</h2><p>Do not use ${brand} for anything unlawful; to send spam; to store data you have no right to store; to try to access another business’s data; to break, overload, copy or reverse-engineer the service; or to resell it without our written permission. We may suspend a login or business that breaks these rules, and will tell the owner why unless the law prevents it.</p>
  <h2>11. The Android app</h2><p>Install the Android app only from sabmanage.com/download or Google Play. Apps from other sources are not ours.</p>
  <h2>12. Referrals</h2><p>If we offer a reward for referring another business, it applies only when that business joins through your link and takes a paid plan, has no cash value, cannot be combined with other offers unless we say so, and may be changed or stopped. Self-referrals and misuse are not rewarded.</p>
  <h2>13. Availability and backups</h2><p>We work to keep ${brand} available and our provider keeps database backups, but we cannot promise the service will never be interrupted or that data can always be restored. Keep your own backup from Settings, especially before the wedding season.</p>
  <h2>14. Our rights</h2><p>${brand}, its design, code and name belong to us. Your logo, stamp and business data remain yours.</p>
  <h2>15. Limitation of liability</h2><p>To the extent the law allows, we are not liable for indirect or consequential losses such as lost bookings, profit, goodwill or data caused by using or not being able to use ${brand}. Our total liability for any claim is limited to the fees you paid us in the 3 months before the claim.</p>
  <h2>16. Indemnity</h2><p>You will compensate us for claims and costs caused by your misuse of the service, the data you enter, or messages you send in breach of these terms or the law.</p>
  <h2>17. Ending the agreement</h2><p>You can stop at any time and ask us to delete your account. We may end or suspend the service for non-payment or serious breach of these terms, after informing you where possible. Sections 5, 6, 8, 15, 16 and 19 continue after the agreement ends.</p>
  <h2>18. Changes to these terms</h2><p>We may update these terms. We will change the date and version above. For important changes, owners will be asked to accept the new terms in the app; continuing to use ${brand} after that means you accept them.</p>
  <h2>19. Law and disputes</h2><p>These terms are governed by the laws of India. We will first try to resolve any dispute by talking to you. If that does not work, the courts at ${city} have exclusive jurisdiction.</p>
  <h2>20. Contact and grievance officer</h2><p>Questions or complaints about these terms: ${contact}. We reply within 7 days.</p></div>`;
}


/* ---------- account deletion (Google Play) ---------- */
/* ---------- /doctors: landing page for doctors and clinics ---------- */
function doctorsPage({ s, plat }) {
  const brand = s.brandName || 'SabManage'; const trial = +plat.trialDays || 0; const signup = plat.allowSignup !== false; const waN = s.whatsapp || s.phone;
  const startBtn = signup ? `<a class="btn primary" href="/app#signup-clinic"${hi(trial ? `${trial} दिन फ़्री, क्लिनिक शुरू करें` : 'क्लिनिक शुरू करें')}>${trial ? `Start your clinic, ${trial} days free` : 'Start your clinic'}</a>` : `<a class="btn primary" href="/#contact"${hi('डेमो लें')}>Book a demo</a>`;
  const demo = waN ? `<a class="btn wa" href="${esc(wa(waN, `Namaste, I am a doctor. I want a demo of ${brand} for my clinic.`))}" target="_blank" rel="noopener">${ic('wa')}<span${hi('व्हाट्सऐप पर डेमो')}>Demo on WhatsApp</span></a>` : '';
  const feats = [
    ['heart', '#E11D48', 'Patient records, date-wise', 'मरीज़ों का रिकॉर्ड, तारीख के हिसाब से', 'Every visit with problem, diagnosis, medicines, reports and photos. Print a clean prescription with your registration number.', 'हर विज़िट में परेशानी, डायग्नोसिस, दवाइयां, रिपोर्ट और फ़ोटो। अपने रजिस्ट्रेशन नंबर के साथ साफ़ पर्चा प्रिंट करें।'],
    ['pulse', '#0EA5E9', 'BP, sugar & weight charts', 'बीपी, शुगर और वज़न के ग्राफ़', 'Readings from the clinic and from home show as charts and as a table, with the change since the first visit.', 'क्लिनिक और घर की रीडिंग ग्राफ़ और टेबल में दिखती हैं, पहली विज़िट से कितना बदला यह भी।'],
    ['link', '#7C3AED', 'Patients send readings from home', 'मरीज़ घर से रीडिंग भेजें', 'Each patient gets a private link. No app, no login. Big buttons in Hindi or English.', 'हर मरीज़ को एक निजी लिंक मिलता है। न ऐप, न लॉगिन। हिंदी या अंग्रेज़ी में बड़े बटन।'],
    ['mic', '#DB2777', 'Photos and voice notes', 'फ़ोटो और आवाज़', 'Patients show a rash or a report with a photo, or simply speak their problem. You reply the same way.', 'मरीज़ फ़ोटो से रैश या रिपोर्ट दिखाएं, या बोलकर परेशानी बताएं। आप भी वैसे ही जवाब दें।'],
    ['calendar', '#2563EB', 'Appointments & online consultation', 'अपॉइंटमेंट और ऑनलाइन परामर्श', 'Clinic visit, video call or WhatsApp call. Patients request a time; you confirm in one tap and send a reminder.', 'क्लिनिक विज़िट, वीडियो कॉल या व्हाट्सऐप कॉल। मरीज़ समय मांगें; आप एक टैप में पक्का करें और याद दिलाएं।'],
    ['rupee', '#0B9B68', 'Fees by UPI, with reminders', 'यूपीआई से फ़ीस, याद-दिहानी के साथ', 'Patients pay straight to your UPI. No fee is cut. Send a polite WhatsApp reminder for pending fees.', 'मरीज़ सीधे आपके यूपीआई पर पैसा भेजते हैं। कोई कटौती नहीं। बाकी फ़ीस के लिए व्हाट्सऐप पर याद दिलाएं।'],
    ['bell', '#D97706', 'Alerts for readings to check', 'जांचने लायक रीडिंग पर अलर्ट', 'When a patient sends a very high BP or sugar, a message or a request, your phone gets a notification.', 'मरीज़ बहुत ज़्यादा बीपी या शुगर, मैसेज या रिक्वेस्ट भेजे, तो आपके फ़ोन पर नोटिफ़िकेशन आता है।'],
    ['shield', '#475569', 'Staff see only what you allow', 'स्टाफ़ को सिर्फ़ उतना दिखे जितना आप चाहें', 'Receptionist: appointments and fees. Nurse: readings. Associate doctor: records. You choose for each person.', 'रिसेप्शनिस्ट: अपॉइंटमेंट और फ़ीस। नर्स: रीडिंग। साथी डॉक्टर: रिकॉर्ड। हर व्यक्ति के लिए आप तय करें।'],
    ['globe', '#16A34A', 'Hindi and English', 'हिंदी और अंग्रेज़ी', 'The whole app and the patient’s page switch to Hindi with one tap.', 'पूरा ऐप और मरीज़ का पेज एक टैप में हिंदी में।']
  ];
  const faqs = [
    ['Why do you ask for my registration certificate?', 'आप मेरा रजिस्ट्रेशन सर्टिफ़िकेट क्यों मांगते हैं?', 'Patients trust the doctors on SabManage, so every clinic is checked once. Upload your medical council registration certificate at sign-up; the clinic opens after approval, usually within 24 hours.', 'मरीज़ सबमैनेज पर डॉक्टरों पर भरोसा करते हैं, इसलिए हर क्लिनिक की एक बार जांच होती है। साइन अप पर अपनी मेडिकल काउंसिल रजिस्ट्रेशन का सर्टिफ़िकेट अपलोड करें; मंज़ूरी के बाद क्लिनिक खुल जाता है, अक्सर 24 घंटे में।'],
    ['Do patients need to install an app?', 'क्या मरीज़ों को ऐप डालना पड़ेगा?', 'No. You send each patient a private link on WhatsApp. It opens in the phone’s browser. The patient agrees once, then sends readings, photos or voice notes and books appointments.', 'नहीं। आप हर मरीज़ को व्हाट्सऐप पर निजी लिंक भेजते हैं। यह फ़ोन के ब्राउज़र में खुलता है। मरीज़ एक बार सहमति देता है, फिर रीडिंग, फ़ोटो या आवाज़ भेजता है और अपॉइंटमेंट बुक करता है।'],
    ['How do video consultations work?', 'वीडियो परामर्श कैसे होता है?', 'Book a video appointment and the app makes a free Jitsi Meet video room. You and the patient join from the link. You can also choose a WhatsApp call.', 'वीडियो अपॉइंटमेंट बुक करें, ऐप एक फ़्री जिट्सी मीट वीडियो रूम बना देता है। आप और मरीज़ लिंक से जुड़ते हैं। व्हाट्सऐप कॉल भी चुन सकते हैं।'],
    ['Where is patient data kept?', 'मरीज़ों का डेटा कहां रहता है?', 'On secure servers in India (Mumbai). Photos, reports and voice notes are private files. Only your clinic’s logins, as you allow, and the patient’s own link can open them.', 'भारत (मुंबई) के सुरक्षित सर्वर पर। फ़ोटो, रिपोर्ट और आवाज़ निजी फ़ाइलें हैं। सिर्फ़ आपके क्लिनिक के लॉगिन, आपकी अनुमति से, और मरीज़ का अपना लिंक इन्हें खोल सकता है।'],
    ['Does the app give medical advice?', 'क्या ऐप मेडिकल सलाह देता है?', 'No. It stores and shows records. Coloured numbers are only a quick hint; you decide. The patient page tells patients to call 108 in an emergency.', 'नहीं। यह रिकॉर्ड रखता और दिखाता है। रंगीन नंबर सिर्फ़ एक इशारा हैं; फ़ैसला आपका। मरीज़ के पेज पर लिखा है कि इमरजेंसी में 108 पर कॉल करें।']
  ];
  return `
  <div class="canopy" aria-hidden="true"></div>
  <section class="hero"><div class="wrap">
    <div>
      <span class="kicker"${hi('डॉक्टर और क्लिनिक के लिए')}>For doctors and clinics</span>
      <h1${hi('हर मरीज़ की सेहत, एक ऐप में।')}>Every patient’s health, in one simple app.</h1>
      <p class="lead"${hi('मरीज़ों का रिकॉर्ड, बीपी-शुगर-वज़न के ग्राफ़, घर से भेजी रीडिंग, फ़ोटो और आवाज़ में परेशानी, क्लिनिक या वीडियो अपॉइंटमेंट और यूपीआई से फ़ीस। हिंदी और अंग्रेज़ी में।')}>Patient records, BP, sugar and weight charts, readings sent from home, problems shared by photo or voice, clinic or video appointments and fees by UPI. In Hindi and English.</p>
      <div class="cta">${startBtn}${demo}</div>
      <ul class="facts"><li>${ic('check')}<span${hi('सिर्फ़ जांचे हुए डॉक्टर')}>Verified doctors only</span></li><li>${ic('check')}<span${hi('मरीज़ के लिए कोई ऐप नहीं')}>No app for patients</span></li><li>${ic('check')}<span${hi('डेटा भारत में')}>Data stays in India</span></li></ul>
    </div>
    <div class="tagstack">
      <div class="phone"><img src="/img/app-clinic.webp" width="390" height="780" alt="Clinic home screen with today's appointments, requests, messages and fees to collect" fetchpriority="high"></div>
      <div class="sticker a"><i style="background:#E11D48">${ic('pulse')}</i><span${hi('नई रीडिंग<small>बीपी 128/82, घर से</small>')}>New reading<small>BP 128/82, from home</small></span></div>
      <div class="sticker b"><i style="background:#0B9B68">${ic('rupee')}</i><span${hi('फ़ीस मिली<small>₹400 यूपीआई से</small>')}>Fee received<small>₹400 by UPI</small></span></div>
    </div>
  </div></section>

  <section class="sec soft" id="features"><div class="wrap">
    <div class="sec-h"><h2${hi('क्लिनिक के लिए सब कुछ, बिना झंझट')}>Everything a clinic needs, nothing extra</h2><p${hi('क्लिनिक चुनकर साइन अप करें, ऐप सिर्फ़ डॉक्टर वाले सेक्शन के साथ खुलेगा।')}>Sign up as a clinic and the app opens with only the doctor’s sections.</p></div>
    <div class="feats">${feats.map(([i, c, t, th, d, dh]) => `<div class="feat" style="--c:${c}"><div class="ib">${ic(i)}</div><div><h3${hi(th)}>${t}</h3><p${hi(dh)}>${d}</p></div></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="spot flip" style="--c:#7C3AED"><div class="shot"><img src="/img/app-patient.webp" width="390" height="780" loading="lazy" alt="The patient's own page in Hindi with buttons to send readings, tell a problem, book an appointment and call the clinic"></div>
      <div><h3${hi('मरीज़ के लिए उतना ही आसान जितना व्हाट्सऐप')}>As easy for the patient as WhatsApp</h3><p${hi('मरीज़ को सिर्फ़ चार बड़े बटन दिखते हैं: रीडिंग भेजें, परेशानी बताएं, अपॉइंटमेंट बुक करें, फ़ीस दें। बुज़ुर्ग भी आराम से चला लेते हैं।')}>Patients see four big buttons: send reading, tell my problem, book appointment, pay fee. Even elderly patients manage it.</p>
      <ul><li${hi('सहमति एक बार, फिर बस टैप')}>Consent once, then just tap</li><li${hi('अपने ग्राफ़ देखकर मरीज़ भी खुश')}>Patients see their own charts and stay motivated</li><li${hi('लिंक गलत व्यक्ति के पास जाए तो एक टैप में बदलें')}>If a link reaches the wrong person, replace it in one tap</li></ul></div></div>
  </div></section>

  <section class="sec soft" id="how"><div class="wrap">
    <div class="sec-h"><h2${hi('तीन कदम में शुरू करें')}>Start in three steps</h2></div>
    <ol class="steps">
      <li><h3${hi('डॉक्टर / क्लिनिक चुनकर साइन अप करें')}>Sign up as Doctor / Clinic</h3><p${hi('अपना रजिस्ट्रेशन नंबर और सर्टिफ़िकेट अपलोड करें। मंज़ूरी अक्सर 24 घंटे में।')}>Add your registration number and certificate. Approval usually within 24 hours.</p></li>
      <li><h3${hi('फ़ीस, यूपीआई और समय डालें')}>Set fees, UPI and timings</h3><p${hi('क्लिनिक और वीडियो की फ़ीस, यूपीआई आईडी, समय और लोगो एक बार डालें।')}>Add clinic and video fees, your UPI ID, timings and logo once.</p></li>
      <li><h3${hi('मरीज़ जोड़ें और लिंक भेजें')}>Add patients and send their link</h3><p${hi('नाम और मोबाइल डालें, व्हाट्सऐप पर लिंक भेजें। बाकी अपने आप आता रहेगा।')}>Add a name and mobile, send the link on WhatsApp. The rest comes in by itself.</p></li>
    </ol>
    <div class="cta" style="justify-content:center;margin-top:26px">${startBtn}${demo}</div>
  </div></section>

  <section class="sec" id="faq"><div class="wrap">
    <div class="sec-h"><h2${hi('डॉक्टरों के सवाल')}>Questions doctors ask</h2></div>
    <div class="faq">${faqs.map(([q, qh, a, ah]) => `<details><summary${hi(qh)}>${q}</summary><p${hi(ah)}>${a}</p></details>`).join('')}</div>
    <p class="small" style="color:var(--muted);margin-top:18px"${hi('सबमैनेज एक रिकॉर्ड और कम्युनिकेशन टूल है, मेडिकल डिवाइस नहीं। इलाज के फ़ैसले डॉक्टर के होते हैं। ऑनलाइन परामर्श भारत की टेलीमेडिसिन गाइडलाइंस के अनुसार डॉक्टर की ज़िम्मेदारी है।')}>SabManage is a records and communication tool, not a medical device. Treatment decisions are the doctor’s. Online consultations are the doctor’s responsibility under India’s Telemedicine Practice Guidelines.</p>
  </div></section>`;
}

function downloadPage({ s }) {
  const brand = esc(s.brandName || 'SabManage');
  const steps = [
    ['Tap “Download the app” below.', 'नीचे "ऐप डाउनलोड करें" दबाएं।'],
    ['When the download finishes, open the file SabManage.apk.', 'डाउनलोड पूरा होने पर SabManage.apk फ़ाइल खोलें।'],
    ['If the phone says “Install unknown apps”, tap Settings and allow it for Chrome (or your file manager), then go back.', 'अगर फ़ोन "अनजान ऐप इंस्टॉल करें" पूछे, तो सेटिंग्स दबाकर क्रोम (या फ़ाइल मैनेजर) के लिए इजाज़त दें, फिर वापस आएं।'],
    ['Tap Install, then Open. Log in with your mobile number and password.', 'इंस्टॉल दबाएं, फिर खोलें। अपने मोबाइल नंबर और पासवर्ड से लॉगिन करें।'],
    ['When asked, tap “Allow” for notifications so alerts can ring.', 'पूछे जाने पर नोटिफ़िकेशन के लिए "Allow" (इजाज़त दें) दबाएं, ताकि अलर्ट बज सकें।']];
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext dl-page">
  <h1${hi(`${brand} ऐप डाउनलोड करें`)}>Get the ${brand} app</h1>
  <p class="lead"${hi('एंड्रॉयड फ़ोन के लिए। फ़्री, 2 एमबी, एक मिनट में इंस्टॉल।')}>For Android phones. Free, 2 MB, installs in a minute.</p>
  <div class="cta" style="margin:18px 0 8px"><a class="btn primary" href="/download/SabManage.apk" download>${ic('download')}<span${hi('ऐप डाउनलोड करें')}>Download the app</span></a><a class="btn" href="/app">${ic('globe')}<span${hi('ब्राउज़र में खोलें')}>Open in browser</span></a></div>
  <p class="tiny"${hi('प्ले स्टोर पर जल्द आ रहा है। आईफ़ोन पर सफ़ारी में sabmanage.com/app खोलें और "होम स्क्रीन पर जोड़ें" दबाएं।')}>Coming soon on Play Store. On iPhone, open sabmanage.com/app in Safari and tap “Add to Home Screen”.</p>
  <h2${hi('कैसे इंस्टॉल करें')}>How to install</h2>
  <ol class="dl-steps">${steps.map(([e, h]) => `<li${hi(h)}>${e}</li>`).join('')}</ol>
  <h2${hi('अपनी टीम को भेजें')}>Send it to your team</h2>
  <p${hi('यह लिंक अपने मैनेजर और क्रू को व्हाट्सऐप पर भेजें: sabmanage.com/download')}>Send this link to your manager and crew on WhatsApp: sabmanage.com/download</p>
  <div class="cta"><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent('SabManage app download: https://sabmanage.com/download')}" target="_blank" rel="noopener">${ic('wa')}<span${hi('व्हाट्सऐप पर भेजें')}>Send on WhatsApp</span></a></div>
  <p class="tiny" style="margin-top:22px"${hi('सुरक्षित: यह ऐप सीधे सबमैनेज की वेबसाइट से है और हमारी चाबी से साइन किया गया है।')}>Safe: this app comes straight from the SabManage website and is signed with our key.</p>
</div>`;
}
function deletePage({ s }) {
  const brand = esc(s.brandName || 'SabManage');
  return `<div class="canopy thin" aria-hidden="true"></div><div class="wrap legaltext">
  <h1${hi('अकाउंट डिलीट करें')}>Delete your account</h1>
  <p${hi(`आप ${brand} का अपना अकाउंट और उससे जुड़ा डेटा हटाने के लिए कह सकते हैं।`)}>You can ask us to delete your ${brand} account and the data linked to it.</p>
  <h2${hi('ऐप से')}>From the app</h2>
  <p${hi('लॉगिन करें, ऊपर अपने नाम पर टैप करें, फिर नीचे "डिलीट मेरा अकाउंट" दबाएं।')}>Log in, tap your name at the top, then tap “Delete my account” at the bottom.</p>
  <h2${hi('या यह फ़ॉर्म भरें')}>Or use this form</h2>
  <form class="cform" id="delForm" novalidate style="margin-top:12px">
    <label class="full"><span${hi('लॉगिन आईडी (मोबाइल नंबर या ईमेल)')}>Login ID (mobile number or email)</span><input name="login" required maxlength="160" autocomplete="username"></label>
    <label><span${hi('आपका नाम')}>Your name</span><input name="name" maxlength="120" autocomplete="name"></label>
    <label><span${hi('कॉल के लिए मोबाइल नंबर')}>Mobile number to call you</span><input name="phone" type="tel" required maxlength="16" inputmode="tel" autocomplete="tel"></label>
    <label class="full"><span${hi('बिज़नेस का नाम')}>Business name</span><input name="business" maxlength="160"></label>
    <label class="full"><span${hi('कारण (ज़रूरी नहीं)')}>Reason (optional)</span><textarea name="reason" rows="2" maxlength="1000"></textarea></label>
    <div class="full"><button class="btn primary" type="submit" style="width:100%"${hi('डिलीट करने का रिक्वेस्ट भेजें')}>Send deletion request</button></div>
    <div class="msg" id="delMsg" hidden role="status"></div>
  </form>
  <h2${hi('क्या हटाया जाता है')}>What is deleted</h2>
  <ul><li${hi('आपका लॉगिन, नाम, मोबाइल नंबर और ईमेल।')}>Your login, name, mobile number and email.</li>
  <li${hi('अगर आप बिज़नेस के अकेले ओनर हैं: उस बिज़नेस की बुकिंग, क्लाइंट, स्टॉक, मेन्यू, इनवॉइस, पेमेंट, वेंडर, स्टाफ़, हाज़िरी और सभी स्टाफ़ लॉगिन।')}>If you are the only owner of a business: its bookings, clients, stock, menus, invoices, payments, vendors, staff, attendance and all staff logins.</li>
  <li${hi('अगर आप कर्मचारी हैं: सिर्फ़ आपका लॉगिन। बिज़नेस का डेटा ओनर के पास रहता है।')}>If you are an employee: only your login. The business data stays with the owner.</li></ul>
  <h2${hi('कितना समय लगता है')}>How long it takes</h2>
  <p${hi('हम आपको कॉल करके पुष्टि करते हैं और 7 दिन के अंदर अकाउंट हटा देते हैं। कानून के हिसाब से ज़रूरी कुछ बिल रिकॉर्ड 8 साल तक रखे जा सकते हैं।')}>We call you to confirm and delete the account within 7 days. Some invoice records may be kept for up to 8 years where tax law requires it.</p>
  </div>`;
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
    const brand = s.brandName || 'SabManage';
    if (page === 'sitemap' || page === 'rss') {
      const posts = await loadPosts({ limit: 1000 });
      if (page === 'rss') return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(brand)} blog</title><link>${origin}/blog</link><description>${esc(s.tagline)}</description>${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${origin}/blog/${esc(p.slug)}</link><guid>${origin}/blog/${esc(p.slug)}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('')}</channel></rss>`, 'application/rss+xml; charset=utf-8');
      const urls = [['/', ''], ['/blog', posts[0]?.published_at], ['/download', ''], ['/doctors', ''], ['/privacy', ''], ['/terms', ''], ['/delete-account', ''], ...posts.map(p => ['/blog/' + p.slug, p.updated_at || p.published_at])];
      return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([u, d]) => `<url><loc>${esc(origin + u)}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ''}</url>`).join('')}</urlset>`, 'application/xml; charset=utf-8');
    }
    const base = { s, plat, origin };
    if (page === 'home') {
      const posts = await loadPosts({ limit: 3 });
      const org = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: brand, applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS', description: 'Bookings, inventory, catering, GST invoices, payments and crew management for tent houses, caterers and event managers.', url: origin,
        offers: (plat.plans || []).filter(p => p.name).map(p => ({ '@type': 'Offer', name: p.name, price: String(+p.price || 0), priceCurrency: 'INR' })) };
      const lb = { '@context': 'https://schema.org', '@type': 'Organization', name: s.legalName || brand, url: origin, ...(s.phone ? { telephone: s.phone } : {}), ...(s.email ? { email: s.email } : {}), ...(s.address ? { address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressCountry: 'IN' } } : {}), sameAs: ['instagram', 'facebook', 'youtube', 'linkedin'].map(k => safeUrl(s[k])).filter(Boolean) };
      return send(200, shell({ ...base, path: '/', title: `${brand}: business app for tent houses, caterers, events and clinics`, desc: 'Bookings, stock, GST bills, payments, staff and customers in one simple app. For tent houses, caterers, event managers, and doctors and clinics (patient records, charts, appointments, fees). In Hindi and English.', image: origin + '/img/og.jpg', body: homePage({ ...base, posts }), jsonld: [org, lb] }));
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
      if (!p) return send(404, shell({ ...base, path: '/blog/' + slug, title: `Post not found | ${brand}`, desc: '', noindex: true, body: `<div class="canopy thin" aria-hidden="true"></div><div class="wrap nf"><h1${hi('यह पोस्ट नहीं मिली')}>This post is not here</h1><p${hi('हो सकता है इसे हटा दिया गया हो या लिंक बदल गया हो।')}>It may have been removed or the link has changed.</p><a class="btn primary" href="/blog"${hi('सभी पोस्ट देखें')}>See all posts</a></div>` }), 'text/html; charset=utf-8', 's-maxage=30');
      const more = (await loadPosts({ limit: 4 })).filter(x => x.slug !== p.slug).slice(0, 3);
      const desc = p.seo_description || p.excerpt || strip(p.content).slice(0, 155);
      const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, datePublished: p.published_at, dateModified: p.updated_at || p.published_at, inLanguage: p.lang === 'hi' ? 'hi-IN' : 'en-IN', mainEntityOfPage: origin + '/blog/' + p.slug, ...(p.cover_url ? { image: [p.cover_url] } : {}), author: { '@type': p.author ? 'Person' : 'Organization', name: p.author || brand }, publisher: { '@type': 'Organization', name: brand } };
      return send(200, shell({ ...base, path: '/blog/' + p.slug, title: `${p.seo_title || p.title} | ${brand}`, desc, image: p.cover_url || origin + '/img/og.jpg', type: 'article', jsonld: [ld], body: postPage({ ...base, p, related: more }) }));
    }
    if (page === 'doctors') return send(200, shell({ ...base, path: '/doctors', title: `${brand} for doctors: patient records, BP & sugar charts, appointments`, desc: 'A simple clinic app for Indian doctors: patient records with BP, sugar and weight charts, readings sent by patients from home, photos and voice notes, appointments with video calls, and fees by UPI. In Hindi and English.', image: origin + '/img/og.jpg', body: doctorsPage(base) }), 'text/html; charset=utf-8', 's-maxage=600');
    if (page === 'download') return send(200, shell({ ...base, path: '/download', title: `Download the ${brand} app`, desc: `Download the ${brand} Android app for tent houses, caterers and event managers.`, body: downloadPage(base) }), 'text/html; charset=utf-8', 's-maxage=600');
    if (page === 'delete') return send(200, shell({ ...base, path: '/delete-account', title: `Delete your account | ${brand}`, desc: `How to delete your ${brand} account and data.`, body: deletePage(base) }), 'text/html; charset=utf-8', 's-maxage=3600');
    if (page === 'privacy' || page === 'terms') return send(200, shell({ ...base, path: '/' + page, title: `${page === 'privacy' ? 'Privacy policy' : 'Terms of use'} | ${brand}`, desc: `${page === 'privacy' ? 'Privacy policy' : 'Terms of use'} for ${brand}.`, body: legalPage(page, base) }), 'text/html; charset=utf-8', 's-maxage=3600');
    return send(404, shell({ ...base, path: '/' + page, title: `Page not found | ${brand}`, desc: '', noindex: true, body: `<div class="canopy thin" aria-hidden="true"></div><div class="wrap nf"><h1${hi('यह पेज नहीं मिला')}>This page is not here</h1><p${hi('लिंक शायद पुराना है।')}>The link may be old.</p><a class="btn primary" href="/"${hi('होम पर जाएं')}>Go to home</a></div>` }), 'text/html; charset=utf-8', 's-maxage=60');
  } catch (e) {
    console.error(e);
    return send(500, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SabManage</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>Something went wrong</h1><p>Please refresh the page, or <a href="/app">open the app</a>.</p></body>`, 'text/html; charset=utf-8', 's-maxage=5');
  }
};
module.exports.sanitize = sanitize;
