/* ================= Public website: content, blog, enquiries (Super Admin) ================= */
const SITE_DEFAULT = {
  brandName: 'EventPro', tagline: 'Tent, catering aur event ka poora hisaab, ek app mein.',
  about: 'EventPro is built in Jaipur for the people who make Indian weddings and events happen: tent houses, caterers, halwais, decorators and event managers. We spent time in godowns, kitchens and wedding lawns to understand how bookings, stock, ration, crew and payments are really handled, and turned that into one simple app that works on any phone.',
  aboutHi: '', legalName: '', address: '', city: 'Jaipur', phone: '', whatsapp: '', email: '', hours: 'Mon–Sat, 10 am – 7 pm',
  mapUrl: '', instagram: '', facebook: '', youtube: '', linkedin: '', showPricing: true
};
const siteCfg = () => ({ ...SITE_DEFAULT, phone: S.platform?.supportPhone || '', whatsapp: S.platform?.supportPhone || '', email: S.platform?.supportEmail || '', ...(S.platform?.site || {}) });
const siteUrl = (path = '') => (/^https?:/.test(location.origin) ? location.origin : '') + path;

A.siteLoad = async (what = ['posts', 'leads']) => {
  S.site = S.site || {}; S.site.loading = true;
  try {
    if (what.includes('posts')) S.site.posts = await S.adapter.blogList();
    if (what.includes('leads')) S.site.leads = await S.adapter.leadsList();
    if (what.includes('leads')) S.site.dels = await S.adapter.deletionsList();
    S.site.error = '';
  } catch (e) { S.site.error = e.message; }
  S.site.loaded = true; S.site.loading = false; if (S.view === 'admin') render();
};
function siteReady() { if (!S.site?.loaded && !S.site?.loading) setTimeout(() => A.siteLoad()); return !!S.site?.loaded; }

/* ---------- Website content ---------- */
function adminSite() {
  const c = siteCfg(); const P = S.platform || DEFAULT_PLATFORM;
  const f = (name, label, extra = {}) => fieldHTML({ name, label, value: c[name], ...extra });
  return `<div class="banner" style="margin-bottom:14px;align-items:center">${ic('globe')}<span class="grow">This is what visitors see on your website's home, About and Contact sections. Prices come from <b>Plans & support</b>.</span><a class="btn sm" href="/" target="_blank" rel="noopener">${ic('eye')} Open website</a></div>
  <form class="card" onsubmit="A.saveSite(event)"><div class="card-h"><div><h3>Website content</h3><p>Changes show on the website within about a minute.</p></div></div>
  <div class="grid2" style="padding:6px 18px 14px">
    ${f('brandName', 'Brand name on the website', { required: true })}${f('legalName', 'Company / legal name (for Terms & Privacy)', { placeholder: 'e.g. Shree Events Pvt Ltd' })}
    ${f('tagline', 'Headline', { full: true, hint: 'The big line at the top of the home page' })}
    ${f('about', 'About us (English)', { type: 'textarea', rows: 5, full: true })}
    ${f('aboutHi', 'About us (Hindi, optional)', { type: 'textarea', rows: 4, full: true, hint: 'Shown when a visitor switches the website to Hindi. Leave empty to show the English text.' })}
    ${f('phone', 'Phone number', { type: 'tel' })}${f('whatsapp', 'WhatsApp number', { type: 'tel', hint: 'The green WhatsApp buttons open a chat with this number' })}
    ${f('email', 'Email', { type: 'email' })}${f('hours', 'Working hours')}
    ${f('address', 'Office address', { type: 'textarea', rows: 2, full: true })}
    ${f('city', 'City')}${f('mapUrl', 'Google Maps link', { placeholder: 'https://maps.app.goo.gl/…' })}
    ${f('instagram', 'Instagram link')}${f('facebook', 'Facebook link')}
    ${f('youtube', 'YouTube link')}${f('linkedin', 'LinkedIn link')}
    ${fieldHTML({ name: 'showPricing', label: 'Show plans and prices on the website', type: 'checkbox', value: c.showPricing !== false, full: true })}
  </div><footer class="sheet-f" style="position:static"><span class="tiny muted grow">Free trial shown on the website: ${+P.trialDays || 0} days · Sign-up button ${P.allowSignup === false ? 'hidden (sign-ups are off)' : 'shown'}</span><button class="btn primary" type="submit">Save website</button></footer></form>`;
}
A.saveSite = async e => {
  e.preventDefault(); const v = readForm(e.target);
  const okUrl = u => !u || /^https?:\/\/[^\s]+$/i.test(u);
  for (const k of ['mapUrl', 'instagram', 'facebook', 'youtube', 'linkedin']) if (!okUrl(v[k])) { toast('Links must start with https://', 'bad'); return; }
  const site = {}; Object.keys(SITE_DEFAULT).forEach(k => { site[k] = k === 'showPricing' ? !!v[k] : (v[k] ?? ''); });
  const p = { ...(S.platform || DEFAULT_PLATFORM), site };
  try { await S.adapter.savePlatform(p); S.platform = p; toast('Website saved'); render(); } catch (err) { toast(err.message, 'bad'); }
};

/* ---------- Blog list ---------- */
function adminBlog() {
  if (S.params.edit) return blogEditor();
  if (!siteReady()) return `<div class="card">${empty('Loading posts…', '', '', 'edit', '#7C3AED')}</div>`;
  if (S.site.error) return `<div class="banner bad">${ic('alert')}<span>${esc(S.site.error)}</span></div>`;
  const posts = S.site.posts || []; const q = (S.filters.blogQ || '').toLowerCase(); const f = S.filters.blogF || 'All';
  let list = posts.filter(p => !q || (p.title + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q));
  if (f === 'Published') list = list.filter(p => p.status === 'published'); if (f === 'Drafts') list = list.filter(p => p.status !== 'published');
  const card = p => `<div class="card post-card">${p.cover_url ? `<img class="pc-img" src="${esc(p.cover_url)}" alt="" loading="lazy">` : `<div class="pc-img none">${ic('edit')}</div>`}
    <div class="pad stack-sm" style="padding-top:12px"><div class="row-flex" style="gap:6px">${p.status === 'published' ? pill('Published', 'good') : pill('Draft', 'warn')}${p.lang === 'hi' ? pill('हिंदी') : ''}<span class="tiny muted">${p.status === 'published' && p.published_at ? fmtDate(p.published_at.slice(0, 10)) : 'Edited ' + fmtDate(String(p.updated_at || '').slice(0, 10))}</span></div>
    <b style="font:700 17px/1.3 var(--f-display)">${esc(p.title)}</b>${p.excerpt ? `<p class="small muted clamp2">${esc(p.excerpt)}</p>` : ''}
    <div class="row-flex" style="gap:6px;margin-top:4px"><button class="btn sm primary" onclick="A.blogEdit('${p.id}')">${ic('edit')} Edit</button>${p.status === 'published' ? `<a class="btn sm" href="/blog/${esc(p.slug)}" target="_blank" rel="noopener">${ic('eye')} View</a>` : ''}<button class="btn sm ghost danger" onclick="A.blogDel('${p.id}')">${ic('trash')}</button></div></div></div>`;
  return `<div class="toolbar"><div class="search">${ic('search')}<input placeholder="Search posts" value="${esc(S.filters.blogQ || '')}" onchange="A.setF('blogQ',this.value)"></div><a class="btn" href="/blog" target="_blank" rel="noopener">${ic('eye')} Open blog</a><button class="btn primary" onclick="A.blogEdit('new')">${ic('plus')} New post</button></div>
  <div class="chips" style="margin-bottom:14px">${['All', 'Published', 'Drafts'].map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="A.setF('blogF','${c}')">${c}</button>`).join('')}</div>
  ${list.length ? `<div class="grid g-auto">${list.map(card).join('')}</div>` : `<div class="card">${empty(posts.length ? 'No posts here' : 'No blog posts yet', posts.length ? 'Try another filter.' : 'Write tips, wedding season guides or customer stories. Posts help your website show up on Google.', posts.length ? '' : `<button class="btn primary" onclick="A.blogEdit('new')">${ic('plus')} Write your first post</button>`, 'edit', '#7C3AED')}</div>`}`;
}
A.blogEdit = async id => {
  if (id === 'new') { S.bp = { id: '', title: '', slug: '', excerpt: '', content: '', cover_url: '', tags: [], lang: I18N.lang === 'hi' ? 'hi' : 'en', status: 'draft', seo_title: '', seo_description: '', author: S.user?.name || '' }; S.bpSlugTouched = false; }
  else { try { S.bp = await S.adapter.blogGet(id); if (!S.bp) throw new Error('Post not found'); S.bpSlugTouched = true; } catch (e) { toast(e.message, 'bad'); return; } }
  S.bpDirty = false; S.params = { tab: 'blog', edit: id }; render(); window.scrollTo({ top: 0 });
};
A.blogClose = () => { if (S.bpDirty && !confirm(T('Leave without saving?'))) return; S.bp = null; S.bpDirty = false; S.params = { tab: 'blog' }; A.siteLoad(['posts']); render(); };
A.blogDel = id => {
  const p = (S.site?.posts || []).find(x => x.id === id) || S.bp;
  confirmBox('Delete this post?', `“${p?.title || ''}” will be removed from the website. This cannot be undone.`, 'Delete post', async () => { await S.adapter.blogDelete(id); S.bp = null; S.params = { tab: 'blog' }; await A.siteLoad(['posts']); toast('Post deleted'); });
};

/* ---------- Blog editor ---------- */
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
function blogEditor() {
  const p = S.bp; if (!p) { S.params = { tab: 'blog' }; return adminBlog(); }
  const tb = (cmd, arg, icon, label) => `<button type="button" class="tb" title="${label}" aria-label="${label}" onmousedown="event.preventDefault()" onclick="A.bpCmd('${cmd}','${arg}')">${icon}</button>`;
  const pub = p.status === 'published';
  return `<div class="row-flex" style="justify-content:space-between;margin-bottom:12px"><button class="back" style="margin:0" onclick="A.blogClose()">${ic('back')} All posts</button><span class="row-flex" style="gap:6px">${pub ? pill('Published', 'good') : pill('Draft', 'warn')}<span class="tiny muted" id="bpState">${p.id ? '' : 'Not saved yet'}</span></span></div>
  <div class="blog-ed">
    <div class="card pad stack">
      <input class="bp-title" id="bp_title" placeholder="Post title" value="${esc(p.title)}" oninput="A.bpSet('title',this.value)" maxlength="200">
      <label class="bp-slug"><span>${esc(siteUrl('/blog/'))}</span><input id="bp_slug" value="${esc(p.slug)}" placeholder="post-address" oninput="A.bpSet('slug',this.value)" maxlength="110"></label>
      <div class="bp-cover">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="">` : `<div class="none">${ic('upload')}<span>Cover image</span><small>Wide photo, 1600 × 900 looks best</small></div>`}
        <div class="row-flex" style="gap:6px"><label class="btn sm soft">${ic('upload')} ${p.cover_url ? 'Change cover' : 'Upload cover'}<input type="file" accept="image/*" hidden onchange="A.bpCover(this.files[0])"></label>${p.cover_url ? `<button type="button" class="btn sm ghost danger" onclick="A.bpSet('cover_url','');render()">Remove</button>` : ''}</div></div>
      <label class="field"><span>Short summary</span><textarea rows="2" maxlength="300" placeholder="One or two lines shown on the blog list and on Google" oninput="A.bpSet('excerpt',this.value)">${esc(p.excerpt)}</textarea></label>
      <div class="field"><span>Post</span>
        <div class="toolbar-ed" role="toolbar">${tb('formatBlock', 'H2', '<b>H2</b>', 'Heading')}${tb('formatBlock', 'H3', '<b>H3</b>', 'Small heading')}${tb('formatBlock', 'P', '<b>¶</b>', 'Normal text')}<i></i>${tb('bold', '', '<b>B</b>', 'Bold')}${tb('italic', '', '<i style="font-family:serif">I</i>', 'Italic')}${tb('underline', '', '<u>U</u>', 'Underline')}<i></i>${tb('insertUnorderedList', '', '•≡', 'Bullet list')}${tb('insertOrderedList', '', '1≡', 'Numbered list')}${tb('formatBlock', 'BLOCKQUOTE', '❝', 'Quote')}<i></i>${tb('link', '', ic('link'), 'Add link')}<label class="tb" title="Add picture" onmousedown="A.bpKeepSel()">${ic('upload')}<input type="file" accept="image/*" hidden onchange="A.bpImage(this.files[0])"></label>${tb('insertHorizontalRule', '', '—', 'Divider')}${tb('removeFormat', '', '⌫', 'Clear formatting')}</div>
        <div id="bpBody" class="post-body editor" contenteditable="true" translate="no" data-ph="Start writing… Use H2 for section headings so Google understands your post." oninput="A.bpBody()" onpaste="A.bpPaste(event)">${p.content || ''}</div>
      </div>
    </div>
    <aside class="stack">
      <div class="card pad stack-sm">
        <b>Publish</b>
        <p class="tiny muted">${pub ? `Live at <a href="/blog/${esc(p.slug)}" target="_blank" rel="noopener" style="overflow-wrap:anywhere">/blog/${esc(p.slug)}</a>` : 'Drafts are visible only to Super Admins.'}</p>
        <button class="btn primary block" onclick="A.bpSave('published')">${ic('send')} ${pub ? 'Update post' : 'Publish'}</button>
        <button class="btn block" onclick="A.bpSave('draft')">${pub ? 'Move back to draft' : 'Save draft'}</button>
        <button class="btn ghost block" onclick="A.bpPreview()">${ic('eye')} Preview</button>
        ${p.id ? `<button class="btn ghost danger block" onclick="A.blogDel('${p.id}')">${ic('trash')} Delete post</button>` : ''}
      </div>
      <div class="card pad stack-sm">
        <label class="field"><span>Language of this post</span><select onchange="A.bpSet('lang',this.value)"><option value="en" ${p.lang !== 'hi' ? 'selected' : ''}>English</option><option value="hi" ${p.lang === 'hi' ? 'selected' : ''}>हिंदी</option></select></label>
        <label class="field"><span>Tags</span><input value="${esc((p.tags || []).join(', '))}" placeholder="wedding, catering, tips" oninput="A.bpSet('tags',this.value)"><small>Separate with commas</small></label>
        <label class="field"><span>Author</span><input value="${esc(p.author)}" oninput="A.bpSet('author',this.value)"></label>
      </div>
      <details class="card pad stack-sm"><summary><b>Google & sharing (SEO)</b></summary>
        <label class="field"><span>Google title</span><input maxlength="70" value="${esc(p.seo_title)}" placeholder="${esc(p.title || 'Same as the post title')}" oninput="A.bpSet('seo_title',this.value)"><small>Best under 60 letters</small></label>
        <label class="field"><span>Google description</span><textarea rows="3" maxlength="170" placeholder="${esc(p.excerpt || 'Same as the short summary')}" oninput="A.bpSet('seo_description',this.value)">${esc(p.seo_description)}</textarea><small>Best under 155 letters</small></label>
      </details>
    </aside>
  </div>`;
}
A.bpSet = (k, v) => {
  const p = S.bp; if (!p) return; S.bpDirty = true;
  if (k === 'tags') { p.tags = String(v).split(',').map(t => t.trim()).filter(Boolean).slice(0, 10); return; }
  if (k === 'slug') { S.bpSlugTouched = true; p.slug = slugify(v); return; }
  p[k] = v;
  if (k === 'title' && !S.bpSlugTouched && !(p.status === 'published')) { p.slug = slugify(v); const el = $('#bp_slug'); if (el) el.value = p.slug; }
};
A.bpBody = () => { const el = $('#bpBody'); if (el && S.bp) { S.bp.content = el.innerHTML; S.bpDirty = true; } };
let bpRange = null;
A.bpKeepSel = () => { const s = window.getSelection(); if (s && s.rangeCount && $('#bpBody')?.contains(s.anchorNode)) bpRange = s.getRangeAt(0).cloneRange(); };
function bpRestore() { const ed = $('#bpBody'); if (!ed) return; ed.focus(); if (bpRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(bpRange); bpRange = null; } }
A.bpCmd = (cmd, arg) => {
  const ed = $('#bpBody'); if (!ed) return; ed.focus();
  if (cmd === 'link') { const u = prompt(T('Paste the link (https://…)'), 'https://'); if (!u || !/^(https?:\/\/|mailto:|tel:|\/)/i.test(u.trim())) return; document.execCommand('createLink', false, u.trim()); }
  else if (cmd === 'formatBlock') document.execCommand('formatBlock', false, arg);
  else document.execCommand(cmd, false, arg || null);
  A.bpBody();
};
A.bpPaste = e => {
  const html = e.clipboardData?.getData('text/html'); const text = e.clipboardData?.getData('text/plain');
  e.preventDefault();
  if (html) document.execCommand('insertHTML', false, cleanHTML(html));
  else if (text) document.execCommand('insertHTML', false, text.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''));
  A.bpBody();
};
async function shrinkImage(file, max = 1600) {
  if (!/^image\//.test(file?.type || '')) throw new Error('Choose an image file (PNG or JPG)');
  if (file.size > 15e6) throw new Error('This image is over 15 MB. Choose a smaller one.');
  if (file.type === 'image/gif') { if (file.size > 3e6) throw new Error('GIF must be under 3 MB'); return { blob: file, ext: 'gif' }; }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read this image. Try a PNG or JPG.')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .84));
    return { blob, ext: 'jpg' };
  } finally { URL.revokeObjectURL(url); }
}
A.bpCover = async file => {
  if (!file) return; toast('Uploading…');
  try { const { blob, ext } = await shrinkImage(file); S.bp.cover_url = await S.adapter.uploadImage(blob, ext); S.bpDirty = true; render(); toast('Cover uploaded'); } catch (e) { toast(e.message, 'bad'); }
};
A.bpImage = async file => {
  if (!file) return; toast('Uploading…');
  try {
    const { blob, ext } = await shrinkImage(file, 1400); const url = await S.adapter.uploadImage(blob, ext);
    bpRestore(); document.execCommand('insertHTML', false, `<figure><img src="${esc(url)}" alt=""><figcaption>${esc(T('Picture caption (optional)'))}</figcaption></figure><p><br></p>`); A.bpBody(); toast('Picture added');
  } catch (e) { toast(e.message, 'bad'); }
};
A.bpSave = async status => {
  const p = S.bp; A.bpBody();
  p.title = (p.title || '').trim(); if (!p.title) { toast('Add a title first', 'bad'); $('#bp_title')?.focus(); return; }
  if (!p.slug) p.slug = slugify(p.title) || ('post-' + todayLocal());
  const clean = cleanHTML(p.content || '');
  if (status === 'published' && !clean.replace(/<[^>]*>/g, '').trim()) { toast('Write something before publishing', 'bad'); return; }
  try {
    const saved = await S.adapter.blogSave({ ...p, content: clean, status, excerpt: (p.excerpt || '').trim() || autoExcerpt(clean) });
    S.bp = { ...saved }; S.bpDirty = false; S.bpSlugTouched = true; S.params = { tab: 'blog', edit: saved.id };
    toast(status === 'published' ? 'Published on your website' : 'Draft saved'); render();
  } catch (e) { toast(e.message, 'bad'); }
};
function autoExcerpt(html) { const t = new DOMParser().parseFromString(String(html).replace(/<\/(p|h\d|li|blockquote|figcaption)>|<br\s*\/?>/gi, '$& '), 'text/html').body.textContent.replace(/\s+/g, ' ').trim(); return t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, '') + '…' : t; }
A.bpPreview = () => { A.bpBody(); const p = S.bp; modal(`${sheetHead('Preview', p.title)}<div class="sheet-b" translate="no">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" style="width:100%;border-radius:16px;margin-bottom:14px">` : ''}<h1 style="font-size:28px;margin-bottom:10px">${esc(p.title)}</h1><div class="post-body">${cleanHTML(p.content || '')}</div></div>`, { wide: true }); };

/* Only safe formatting survives: headings, paragraphs, lists, links, pictures. */
function cleanHTML(html) {
  const ALLOW = { P: [], H2: [], H3: [], H4: [], STRONG: [], B: [], EM: [], I: [], U: [], UL: [], OL: [], LI: [], BLOCKQUOTE: [], A: ['href'], IMG: ['src', 'alt'], BR: [], HR: [], FIGURE: [], FIGCAPTION: [] };
  const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'VIDEO', 'AUDIO', 'CANVAS']);
  const doc = new DOMParser().parseFromString('<body><div id="r">' + String(html || '') + '</div></body>', 'text/html');
  const root = doc.getElementById('r');
  const walk = n => {
    for (const c of [...n.childNodes]) walk(c);
    if (n === root || n.nodeType === 3) return;
    if (n.nodeType !== 1) { n.remove(); return; }
    let tag = n.tagName.toUpperCase();
    if (DROP.has(tag)) { n.remove(); return; }
    if (tag === 'H1') tag = 'H2';
    if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag !== n.tagName.toUpperCase()) { const x = doc.createElement(tag === 'H2' ? 'h2' : 'p'); while (n.firstChild) x.appendChild(n.firstChild); n.replaceWith(x); return; }
    if (!ALLOW[tag]) { n.replaceWith(...n.childNodes); return; }
    for (const a of [...n.attributes]) if (!ALLOW[tag].includes(a.name.toLowerCase())) n.removeAttribute(a.name);
    if (tag === 'A') { const h = (n.getAttribute('href') || '').trim(); if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(h)) n.removeAttribute('href'); }
    if (tag === 'IMG') { const s = (n.getAttribute('src') || '').trim(); if (!/^(https:\/\/|\/(?!\/)|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(s)) n.remove(); }
  };
  walk(root);
  return root.innerHTML.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, '').trim();
}

/* ---------- Enquiries from the website ---------- */
const LEAD_STATUS = [['new', 'New', 'warn'], ['contacted', 'Contacted', 'info'], ['closed', 'Closed', 'good']];
function adminLeads() {
  if (!siteReady()) return `<div class="card">${empty('Loading enquiries…', '', '', 'send', '#1F5EFF')}</div>`;
  if (S.site.error) return `<div class="banner bad">${ic('alert')}<span>${esc(S.site.error)}</span></div>`;
  const all = S.site.leads || []; const f = S.filters.leadF || 'new';
  const list = f === 'all' ? all : all.filter(l => l.status === f);
  const cnt = k => all.filter(l => l.status === k).length;
  const row = l => { const [, lab, tone] = LEAD_STATUS.find(s => s[0] === l.status) || LEAD_STATUS[0]; const ph = String(l.phone || '').replace(/\D/g, '').slice(-10);
    const msg = `Namaste ${l.name} ji, ${siteCfg().brandName} se baat kar rahe hain. Aapne hamari website par demo ke liye request bheji thi.`;
    return `<div class="card pad stack-sm"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar">${esc(initials(l.name))}</div><div style="min-width:0;flex:1"><b style="display:block">${esc(l.name)}</b><span class="tiny muted">${esc([l.business, l.city, l.biz_type].filter(Boolean).join(' · '))}</span></div>${pill(lab, tone)}</div>
      ${l.message ? `<p class="small" style="background:var(--surface2);border-radius:12px;padding:10px 12px;white-space:pre-wrap">${esc(l.message)}</p>` : ''}
      <div class="small muted">${ic('phone')} <span class="mono">${esc(l.phone)}</span>${l.email ? ` · ${esc(l.email)}` : ''} · ${new Date(l.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      ${l.note ? `<div class="tiny muted">${ic('edit')} ${esc(l.note)}</div>` : ''}
      <div class="row-flex" style="gap:6px">${ph ? `<a class="btn sm" href="tel:+91${ph}">${ic('phone')} Call</a>${waBtn(msg, ph)}` : ''}<button class="btn sm" onclick="A.leadEdit('${l.id}')">${ic('edit')} Update</button><button class="btn sm ghost danger" onclick="A.leadDel('${l.id}')">${ic('trash')}</button></div></div>`; };
  return `<div class="chips" style="margin-bottom:14px">${[['new', `New (${cnt('new')})`], ['contacted', `Contacted (${cnt('contacted')})`], ['closed', `Closed (${cnt('closed')})`], ['all', `All (${all.length})`]].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" onclick="A.setF('leadF','${k}')">${l}</button>`).join('')}<button class="chip" onclick="A.siteLoad(['leads'])">${ic('pulse')} Refresh</button></div>
  ${list.length ? `<div class="grid g-auto">${list.map(row).join('')}</div>` : `<div class="card">${empty(all.length ? 'Nothing here' : 'No enquiries yet', 'When someone fills the contact form on your website, it shows up here.', '', 'send', '#1F5EFF')}</div>`}`;
}
A.leadEdit = id => {
  const l = S.site.leads.find(x => x.id === id);
  formModal({ title: l.name, sub: l.phone, fields: [
    { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUS.map(([v, lab]) => [v, lab]), value: l.status },
    { name: 'note', label: 'Private note', type: 'textarea', value: l.note, full: true, placeholder: 'e.g. Called on 18 Oct, demo fixed for Monday' }],
    submit: 'Save', onSubmit: async v => { await S.adapter.leadUpdate(id, { status: v.status, note: v.note }); Object.assign(l, { status: v.status, note: v.note }); toast('Updated'); render(); } });
};
A.leadDel = id => confirmBox('Delete this enquiry?', 'It will be removed permanently.', 'Delete', async () => { await S.adapter.leadDelete(id); S.site.leads = S.site.leads.filter(x => x.id !== id); toast('Deleted'); render(); });

/* ================= Account deletion (Google Play requirement) ================= */
A.deleteAccountSheet = async () => {
  let pend = null; try { pend = await S.adapter.myDeletion(); } catch (e) { }
  if (pend) {
    modal(`${sheetHead('Delete my account')}<div class="sheet-b stack"><div class="banner warn">${ic('clock')}<span>We received your request on ${fmtDate(String(pend.created_at).slice(0, 10))}. The ${esc(S.platform?.appName || 'EventPro')} team will confirm with you and erase the account within 7 days.</span></div><p class="small muted">Changed your mind? Contact support before it is processed.</p></div>`);
    return;
  }
  const owner = S.org && S.role === 'owner' && !S.org.viewAs;
  const biz = S.org ? (settings().bizName || S.org.name) : '';
  FORM_CB = async v => {
    if (!v.sure) throw new Error('Tick the box to confirm');
    await S.adapter.requestDeletion(v.reason || '');
    toast('Request sent. We will contact you before erasing.');
  };
  modal(`<form class="form" onsubmit="A.submitForm(event)" novalidate>${sheetHead('Delete my account', displayId(S.user.email))}<div class="sheet-b stack">
    <div class="banner bad">${ic('alert')}<span>${owner ? `Your login and the business <b>${esc(biz)}</b> with all its bookings, bills, stock, staff logins and records will be erased permanently.` : 'Your login will be erased. The business data you worked on stays with the business owner.'} This cannot be undone.</span></div>
    ${owner && can('settings') ? `<button type="button" class="btn" onclick="A.exportBackup()">${ic('download')} Download a backup first</button>` : ''}
    ${fieldHTML({ name: 'reason', label: 'Why are you leaving? (optional)', type: 'textarea', rows: 2, full: true })}
    ${fieldHTML({ name: 'sure', label: 'I understand my account and data will be erased', type: 'checkbox', full: true })}
    <p class="tiny muted">Your request goes to the ${esc(S.platform?.appName || 'EventPro')} team. We confirm with you and erase within 7 days. Some invoice records may be kept where the law requires.</p>
  </div><footer class="sheet-f"><span class="grow"></span><button type="button" class="btn ghost" onclick="A.closeModal()">Cancel</button><button class="btn danger" type="submit">Request deletion</button></footer></form>`);
};

function adminDeletions() {
  if (!siteReady()) return `<div class="card">${empty('Loading…', '', '', 'trash', '#E0344B')}</div>`;
  const all = S.site.dels || []; const f = S.filters.delF || 'pending';
  const list = f === 'all' ? all : all.filter(d => d.status === f);
  const users = S.admin?.users || [];
  const match = d => users.find(u => u.userId === d.user_id) || users.find(u => u.email === loginId(d.login_id));
  const row = d => { const u = match(d); const ph = String(d.phone || (String(d.login_id).endsWith('@' + MOBILE_DOMAIN) ? d.login_id.split('@')[0] : '')).replace(/\D/g, '').slice(-10);
    const tone = d.status === 'done' ? 'good' : d.status === 'rejected' ? '' : 'warn';
    return `<div class="card pad stack-sm"><div class="row-flex" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar" style="background:#FDECEE;color:#E0344B">${ic('trash')}</div><div style="min-width:0;flex:1"><b style="display:block">${esc(d.name || displayId(d.login_id))}</b><span class="tiny muted">${esc(displayId(d.login_id))}${d.business ? ' · ' + esc(d.business) : ''}</span></div>${pill(d.status === 'done' ? 'Erased' : d.status === 'rejected' ? 'Rejected' : 'Pending', tone)}</div>
      <div class="small muted">${d.source === 'web' ? 'From the website form' : 'From inside the app'} · ${new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}${d.phone ? ' · ' + esc(d.phone) : ''}</div>
      ${d.reason ? `<p class="small" style="background:var(--surface2);border-radius:12px;padding:10px 12px">${esc(d.reason)}</p>` : ''}
      ${d.status === 'pending' ? (u ? `<div class="small">${ic('user')} Matches login <b>${esc(u.name || '')}</b> · ${esc((u.orgs || []).map(o => o.name + ' (' + o.role + ')').join(', ') || 'no business')}</div>` : `<div class="small" style="color:var(--bad)">${ic('alert')} No login found with this ID. Confirm with the person, or mark as done.</div>`) : ''}
      ${d.note ? `<div class="tiny muted">${ic('edit')} ${esc(d.note)}</div>` : ''}
      ${d.status === 'pending' ? `<div class="row-flex" style="gap:6px">${ph ? `<a class="btn sm" href="tel:+91${ph}">${ic('phone')} Call</a>` : ''}${u && u.userId !== S.user.id ? `<button class="btn sm danger" onclick="A.eraseAccount('${d.id}','${u.userId}')">${ic('trash')} Erase account</button>` : `<button class="btn sm" onclick="A.delMark('${d.id}','done')">Mark done</button>`}<button class="btn sm ghost" onclick="A.delMark('${d.id}','rejected')">Reject</button></div>` : ''}</div>`; };
  const cnt = k => all.filter(d => d.status === k).length;
  return `<div class="banner" style="margin-bottom:14px">${ic('shield')}<span>Google Play requires a way to delete accounts. People ask from the app (Account → Delete my account) or the website page <a href="/delete-account" target="_blank" rel="noopener">/delete-account</a>. Call them to confirm, then erase.</span></div>
  <div class="chips" style="margin-bottom:14px">${[['pending', `Pending (${cnt('pending')})`], ['done', `Erased (${cnt('done')})`], ['rejected', `Rejected (${cnt('rejected')})`], ['all', `All (${all.length})`]].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" onclick="A.setF('delF','${k}')">${l}</button>`).join('')}</div>
  ${list.length ? `<div class="grid g-auto">${list.map(row).join('')}</div>` : `<div class="card">${empty('No requests here', 'Account deletion requests appear here.', '', 'check', '#0B9B68')}</div>`}`;
}
A.eraseAccount = (reqId, userId) => {
  const u = (S.admin?.users || []).find(x => x.userId === userId);
  const owned = (u?.orgs || []).filter(o => o.role === 'owner').map(o => o.name);
  formModal({ title: 'Erase this account?', sub: `${u?.name || ''} · ${displayId(u?.email || '')}`, fields: [
    { type: 'html', full: true, html: `<div class="banner bad">${ic('alert')}<span>The login is removed${owned.length ? ` and these businesses are erased with all their data: <b>${owned.map(esc).join(', ')}</b> (unless another owner exists)` : ''}. This cannot be undone.</span></div>` },
    { name: 'confirm', label: 'Type ERASE to confirm', required: true, full: true, autocomplete: 'off' }],
    submit: 'Erase permanently', onSubmit: async v => {
      if (String(v.confirm).trim().toUpperCase() !== 'ERASE') throw new Error('Type ERASE to confirm');
      const r = await S.adapter.adminDeleteAccount(userId, reqId);
      toast(`Erased ${displayId(r.login)}${r.businesses ? ` and ${r.businesses} business` : ''}`);
      await A.adminLoad();
    } });
};
A.delMark = (id, status) => formModal({ title: status === 'done' ? 'Mark as done' : 'Reject request', fields: [{ name: 'note', label: 'Note (only Super Admins see this)', type: 'textarea', full: true, placeholder: status === 'rejected' ? 'e.g. Owner asked to keep the account' : 'e.g. Confirmed on call, no login existed' }],
  submit: 'Save', onSubmit: async v => { await S.adapter.deletionUpdate(id, { status, note: v.note || '', done_at: new Date().toISOString() }); const d = S.site.dels.find(x => x.id === id); Object.assign(d, { status, note: v.note }); toast('Updated'); render(); } });
