/* SabManage website: language switch, menu, contact form */
(function () {
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js'); } catch (e) { }
  var KEY = 'ep_lang';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function put(v) { try { localStorage.setItem(KEY, v); } catch (e) { } }
  var param = new URLSearchParams(location.search).get('lang');
  if (param === 'hi' || param === 'en') put(param);
  /* referral link from another business: sabmanage.com/?ref=code (kept for sign-up in the app) */
  try { var ref = new URLSearchParams(location.search).get('ref'); if (ref && /^[a-z0-9]{6,12}$/i.test(ref)) localStorage.setItem('ep_ref', ref.toLowerCase()); } catch (e) { }
  /* the website is English only; an old Hindi choice from earlier visits is ignored */
  var lang = 'en';

  function apply(l) {
    lang = l;
    document.querySelectorAll('[data-hi]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = l === 'hi' && el.dataset.hi ? el.dataset.hi : el.dataset.en;
    });
    document.documentElement.lang = l === 'hi' ? 'hi' : 'en';
    var t = document.body.dataset.hiTitle; if (t) { if (!document.body.dataset.enTitle) document.body.dataset.enTitle = document.title; document.title = l === 'hi' ? t : document.body.dataset.enTitle; }
    document.querySelectorAll('#langBtn [data-l]').forEach(function (s) { s.classList.toggle('on', s.dataset.l === l); });
  }
  var lb = document.getElementById('langBtn');
  if (lb) lb.addEventListener('click', function () { var n = lang === 'hi' ? 'en' : 'hi'; put(n); apply(n); });

  /* already logged in? show "Open app" */
  try {
    var logged = Object.keys(localStorage).some(function (k) { return /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k); });
    if (logged) document.querySelectorAll('[data-app-link]').forEach(function (a) { a.dataset.hi = 'ऐप खोलें'; a.dataset.en = 'Open app'; a.innerHTML = lang === 'hi' ? 'ऐप खोलें' : 'Open app'; });
  } catch (e) { }

  /* header + mobile menu */
  var top = document.getElementById('top');
  var onScroll = function () { if (top) top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var mb = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  if (mb && nav) {
    mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  }

  /* copy link */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var url = b.getAttribute('data-copy');
    var done = function () { var s = b.querySelector('span'); if (s) { var old = s.innerHTML; s.innerHTML = lang === 'hi' ? 'कॉपी हो गया' : 'Copied'; setTimeout(function () { s.innerHTML = old; }, 1800); } };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy', url); }); else prompt('Copy', url);
  });

  /* contact form → Supabase */
  var f = document.getElementById('enqForm'); if (!f || !window.SITE) return;
  var msg = document.getElementById('enqMsg');
  function say(text, ok) { msg.hidden = false; msg.className = 'msg ' + (ok ? 'ok' : 'bad'); msg.textContent = text; }
  var T = {
    name: ['Please enter your name.', 'कृपया अपना नाम डालें।'],
    phone: ['Please enter a 10-digit mobile number.', 'कृपया 10 अंकों का मोबाइल नंबर डालें।'],
    sent: ['Thank you! We will call you soon.', 'धन्यवाद! हम जल्द ही आपको कॉल करेंगे।'],
    fail: ['Could not send. Please try again or message us on WhatsApp.', 'नहीं भेजा जा सका। फिर से कोशिश करें या व्हाट्सऐप पर मैसेज करें।']
  };
  var tr = function (k) { return T[k][lang === 'hi' ? 1 : 0]; };
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {}; new FormData(f).forEach(function (v, k) { d[k] = String(v).trim(); });
    if (d.website) { say(tr('sent'), true); f.reset(); return; }
    if (!d.name) { say(tr('name'), false); f.name.focus(); return; }
    if (d.phone.replace(/\D/g, '').length < 10) { say(tr('phone'), false); f.phone.focus(); return; }
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    fetch(SITE.url + '/rest/v1/rpc/submit_enquiry', { method: 'POST', headers: { apikey: SITE.key, Authorization: 'Bearer ' + SITE.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: { name: d.name, phone: d.phone, business: d.business, city: d.city, bizType: d.bizType, message: d.message, source: 'website' + (lang === 'hi' ? ' (hi)' : '') } }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { say(tr('sent'), true); f.reset(); } else say((x.j && x.j.message) || tr('fail'), false); })
      .catch(function () { say(tr('fail'), false); })
      .then(function () { btn.disabled = false; });
  });

  /* account deletion request → Supabase */
  var df = document.getElementById('delForm');
  if (df && window.SITE) {
    var dm = document.getElementById('delMsg');
    var dsay = function (text, ok) { dm.hidden = false; dm.className = 'msg ' + (ok ? 'ok' : 'bad'); dm.textContent = text; };
    df.addEventListener('submit', function (e) {
      e.preventDefault(); var d = {}; new FormData(df).forEach(function (v, k) { d[k] = String(v).trim(); });
      if (!d.login) { dsay(lang === 'hi' ? 'लॉगिन आईडी डालें।' : 'Enter the login ID.', false); return; }
      if (d.phone.replace(/\D/g, '').length < 10) { dsay(lang === 'hi' ? '10 अंकों का मोबाइल नंबर डालें।' : 'Enter a 10-digit mobile number.', false); return; }
      var btn = df.querySelector('button[type=submit]'); btn.disabled = true;
      var login = d.login.indexOf('@') > -1 ? d.login.toLowerCase() : (d.login.replace(/\D/g, '').slice(-10) + '@mobile.eventpro.app');
      fetch(SITE.url + '/rest/v1/rpc/request_account_deletion_web', { method: 'POST', headers: { apikey: SITE.key, Authorization: 'Bearer ' + SITE.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: { login: login, name: d.name, phone: d.phone, business: d.business, reason: d.reason } }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { dsay(lang === 'hi' ? 'रिक्वेस्ट मिल गया। हम कॉल करके पुष्टि करेंगे और 7 दिन में अकाउंट हटा देंगे।' : 'Request received. We will call to confirm and delete the account within 7 days.', true); df.reset(); } else dsay((x.j && x.j.message) || 'Could not send. Please try again.', false); })
        .catch(function () { dsay('Could not send. Please try again.', false); })
        .then(function () { btn.disabled = false; });
    });
  }
})();
