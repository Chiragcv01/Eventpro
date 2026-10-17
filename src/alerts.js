/* ================= Team alerts with a ringing tune =================
   Owner / manager / supervisor sends an alert to one person or the whole team.
   - App open: it arrives live (Supabase Realtime), a full-screen card shows and the
     SabManage tune plays (urgent alerts keep ringing until "Seen" is tapped).
   - App closed: a phone notification is sent (web push through the send-alert
     edge function). In the Android app (v1.1+) these notifications ring on the
     ALARM sound channel with the same tune, so they are heard even on silent.
   - New important reminders (overdue bill, stock short, unconfirmed date…) play the tune once. */
const VAPID_PUBLIC = 'BNGXdwo0JZ8cN3up625ShVurQkJb0P4k9586IZfrh-RNsBnp1tVSndMfJG7kfRzviMqguzp6Dt0IWlGNesN9o8Y';
const TUNE_SRC = '/sounds/alert.mp3';
const QUICK_ALERTS = ['Call me now', 'Come to the godown', 'Truck is leaving, come fast', 'Client is waiting at the site', 'Material short at the site', 'Start setup now'];

/* ---------- sound ---------- */
const Tune = (() => {
  let audio = null, unlocked = false, loopUntil = 0, stopTimer = null;
  const el = () => { if (!audio) { audio = new Audio(TUNE_SRC); audio.preload = 'auto'; } return audio; };
  function unlock() {
    if (unlocked) return; const a = el(); a.muted = true;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; unlocked = true; }).catch(() => { a.muted = false; });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  function play(loopSecs = 0) {
    const a = el(); a.loop = loopSecs > 0; a.currentTime = 0; a.volume = 1;
    clearTimeout(stopTimer); if (loopSecs > 0) { loopUntil = Date.now() + loopSecs * 1000; stopTimer = setTimeout(stop, loopSecs * 1000); }
    try { navigator.vibrate && navigator.vibrate(loopSecs ? [700, 250, 700, 250, 1000, 400, 700, 250, 700] : [400, 150, 400]); } catch (e) { }
    return a.play().then(() => true).catch(() => false);
  }
  function stop() { clearTimeout(stopTimer); if (audio) { audio.pause(); audio.loop = false; audio.currentTime = 0; } try { navigator.vibrate && navigator.vibrate(0); } catch (e) { } }
  return { play, stop, unlock, get unlocked() { return unlocked; } };
})();
A.testTune = async () => { const ok = await Tune.play(); toast(ok ? 'This is the alert tune. Keep media volume up.' : 'Tap anywhere once, then try again.', ok ? '' : 'warn'); };

/* ---------- storage (cloud table `alerts`; offline mode keeps them on this device) ---------- */
const AlertsDB = {
  local() { return LS.get('ep_alerts_' + S.org.orgId, []); },
  async list() {
    if (S.adapter.mode !== 'cloud') return this.local();
    const { data, error } = await S.adapter.sb.from('alerts').select('*').eq('org_id', S.org.orgId).order('created_at', { ascending: false }).limit(60);
    if (error) throw S.adapter.err(error); return data || [];
  },
  async send(rec) {
    if (S.adapter.mode !== 'cloud') { const r = { id: uid('al_'), org_id: S.org.orgId, from_user: S.user.id, created_at: new Date().toISOString(), acks: {}, ...rec }; LS.set('ep_alerts_' + S.org.orgId, [r, ...this.local()].slice(0, 60)); return r; }
    const { data, error } = await S.adapter.sb.from('alerts').insert({ org_id: S.org.orgId, from_user: S.user.id, ...rec }).select().single();
    if (error) throw S.adapter.err(error); return data;
  },
  async push(id) {
    if (S.adapter.mode !== 'cloud') return { sent: 0 };
    try { const { data, error } = await S.adapter.sb.functions.invoke('send-alert', { body: { alertId: id } }); if (error) throw error; return data || {}; } catch (e) { return { sent: 0, error: e.message }; }
  },
  async ack(id) {
    if (S.adapter.mode !== 'cloud') { const l = this.local(); const a = l.find(x => x.id === id); if (a) { a.acks = { ...(a.acks || {}), [S.user.id]: { at: new Date().toISOString(), name: S.me?.name } }; LS.set('ep_alerts_' + S.org.orgId, l); } return a?.acks; }
    const { data, error } = await S.adapter.sb.rpc('ack_alert', { p_id: id }); if (error) throw S.adapter.err(error); return data;
  }
};
const forMe = a => a.from_user !== S.user?.id && (!a.to_user || a.to_user === S.user?.id);
const seenByMe = a => !!(a.acks || {})[S.user?.id];
const canSendAlert = () => S.adapter?.mode === 'cloud' ? lvl('tasks') >= 2 : !!S.org && lvl('tasks') >= 2;

/* ---------- live updates ---------- */
let alertChan = null;
async function startAlerts() {
  S.teamAlerts = [];
  if (!S.org || ['suspended', 'expired'].includes(orgState(S.org))) return;
  try { S.teamAlerts = await AlertsDB.list(); } catch (e) { S.teamAlerts = []; }
  if (S.adapter.mode === 'cloud') {
    try { if (alertChan) S.adapter.sb.removeChannel(alertChan); } catch (e) { }
    alertChan = S.adapter.sb.channel('alerts-' + S.org.orgId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: 'org_id=eq.' + S.org.orgId }, p => {
        const a = p.new; if (!a?.id) return; const i = (S.teamAlerts || []).findIndex(x => x.id === a.id);
        if (i >= 0) S.teamAlerts[i] = a; else S.teamAlerts.unshift(a);
        if (p.eventType === 'INSERT' && forMe(a)) showAlertOverlay();
        refreshAlertDot();
      }).subscribe();
  }
  const pending = pendingForMe(); if (pending.length) setTimeout(showAlertOverlay, 400);
  refreshAlertDot(); chimeForNewReminders(); ensurePush(false);
}
const pendingForMe = () => (S.teamAlerts || []).filter(a => forMe(a) && !seenByMe(a) && Date.now() - Date.parse(a.created_at) < 36 * 3600e3);
function refreshAlertDot() { const b = document.querySelector('.topbar [aria-label="Alerts"] .dot'); const n = computeAlerts().length + pendingForMe().length; if (b) b.textContent = n; else if (n) render(); }
/* new important reminders → tune once per new item */
function chimeForNewReminders() {
  const key = 'ep_seen_rem_' + S.org.orgId; const seen = new Set(LS.get(key, []));
  const imp = computeAlerts().filter(a => ['Overdue', 'Shortage', 'Confirm', 'Return', 'Dispatch'].includes(a.tag));
  const ids = imp.map(a => a.tag + '|' + a.title); const fresh = ids.filter(x => !seen.has(x));
  LS.set(key, ids.slice(0, 200));
  if (fresh.length && seen.size + fresh.length > 0 && !pendingForMe().length) setTimeout(async () => { await Tune.play(); toast(fresh.length === 1 ? '1 new important reminder. Tap the bell.' : `${fresh.length} new important reminders. Tap the bell.`, 'warn'); }, 900);
}

/* ---------- the full-screen alert card ---------- */
function showAlertOverlay() {
  const list = pendingForMe(); let root = document.getElementById('alertRoot');
  if (!list.length) { if (root) root.remove(); Tune.stop(); return; }
  if (!root) { root = document.createElement('div'); root.id = 'alertRoot'; document.body.appendChild(root); }
  const a = list[0]; const urgent = !!a.urgent;
  root.innerHTML = `<div class="alert-scrim ${urgent ? 'urgent' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="alT"><div class="alert-card fade">
    <div class="alert-ring">${ic(urgent ? 'alert' : 'bell')}</div>
    <div class="eyebrow">${urgent ? 'Urgent alert' : 'Alert'}${list.length > 1 ? ` · 1 of ${list.length}` : ''}</div>
    <h2 id="alT">${esc(a.title)}</h2>${a.body ? `<p class="alert-body">${esc(a.body)}</p>` : ''}
    <div class="small muted">From <b>${esc(a.from_name || 'Team')}</b> · ${new Date(a.created_at).toLocaleTimeString(I18N.lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
    ${!Tune.unlocked ? `<button class="btn" onclick="Tune.play(${urgent ? 120 : 0})">${ic('bell')} Play sound</button>` : ''}
    <button class="btn primary block alert-ok" onclick="A.ackAlert('${a.id}')">${ic('check')} Seen, OK</button>
    ${a.event_id && evById(a.event_id) ? `<button class="linkbtn" onclick="A.ackAlert('${a.id}','${a.event_id}')">Open booking</button>` : ''}
  </div></div>`;
  Tune.play(urgent ? 120 : 0);
}
A.ackAlert = async (id, evId) => {
  Tune.stop();
  try { const acks = await AlertsDB.ack(id); const a = (S.teamAlerts || []).find(x => x.id === id); if (a) a.acks = acks || { ...(a.acks || {}), [S.user.id]: { at: new Date().toISOString() } }; } catch (e) { toast(e.message, 'bad'); }
  const rest = pendingForMe(); if (rest.length) showAlertOverlay(); else { document.getElementById('alertRoot')?.remove(); }
  if (evId) A.go('event', { id: evId }); else render();
};

/* ---------- send ---------- */
A.alertForm = (toUser) => {
  if (!canSendAlert()) { toast('Your role cannot send alerts. Ask the owner.', 'bad'); return; }
  const people = S.members.filter(m => m.userId && m.userId !== S.user.id);
  const evs = col('events').filter(e => !['Cancelled', 'Closed', 'Completed'].includes(e.stage) && eventEnd(e) >= addDays(todayLocal(), -1)).sort(by('date'));
  modal(`<form class="form" onsubmit="A.sendAlert(event)" novalidate>${sheetHead('Send alert', 'Rings on their phone with the alert tune')}<div class="sheet-b stack">
    ${people.length ? '' : `<div class="banner warn">${ic('alert')}<span>Nobody else has an app login yet. Add your team in Team & access so they get alerts.</span></div>`}
    ${fieldHTML({ name: 'to', label: 'Send to', type: 'select', value: toUser || '', options: [['', `Everyone (${people.length})`], ...people.map(m => [m.userId, `${m.name} · ${(S.roles[m.role]?.label || m.role)}`])] })}
    <div class="field"><span>Quick message</span><div class="chips">${QUICK_ALERTS.map(q => `<button type="button" class="chip" onclick="this.form.title.value=this.textContent">${esc(q)}</button>`).join('')}</div></div>
    ${fieldHTML({ name: 'title', label: 'Alert', required: true, maxlength: 140, placeholder: 'e.g. Come to the godown now' })}
    ${fieldHTML({ name: 'body', label: 'Details (optional)', type: 'textarea', maxlength: 600 })}
    ${evs.length ? fieldHTML({ name: 'event', label: 'About booking (optional)', type: 'select', options: [['', '—'], ...evs.map(e => [e.id, `${e.title} (${fmtShort(e.date)})`])] }) : ''}
    <label class="check urgent-check"><input type="checkbox" name="urgent" checked> <span><b>Urgent</b>: keeps ringing until they tap “Seen”</span></label>
    <p class="tiny muted">Crew without the app? Use the WhatsApp button on their card in Staff.</p>
  </div><footer class="sheet-f"><span class="grow"></span><button type="button" class="btn ghost" onclick="A.closeModal()">Cancel</button><button class="btn primary" type="submit">${ic('send')} Send alert</button></footer></form>`);
};
A.sendAlert = e => {
  e.preventDefault(); const v = readForm(e.target); if (!(v.title || '').trim()) { toast('Write the alert', 'bad'); return; }
  withBtn(e, async () => {
    const to = S.members.find(m => m.userId === v.to);
    const rec = { title: v.title.trim().slice(0, 140), body: (v.body || '').trim().slice(0, 600) || null, urgent: !!v.urgent, to_user: v.to || null, to_name: to ? to.name : null, from_name: S.me?.name || S.user.name, event_id: v.event || null };
    const a = await AlertsDB.send(rec); S.teamAlerts = [a, ...(S.teamAlerts || []).filter(x => x.id !== a.id)];
    const r = await AlertsDB.push(a.id); A.closeModal(); logAct(`Sent alert: ${rec.title}`);
    toast(r.sent ? `Alert sent. Ringing on ${r.sent} phone${r.sent > 1 ? 's' : ''}.` : 'Alert sent. They will see it when the app is open (phone notifications are not turned on for them yet).');
    render();
  });
};

/* ---------- phone notifications (web push) ---------- */
const pushOK = () => S.adapter?.mode === 'cloud' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
function b64ToU8(s) { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map(c => c.charCodeAt(0))); }
async function ensurePush(ask) {
  if (!pushOK()) { if (ask) toast('Phone notifications work in the SabManage app or in Chrome on the live site.', 'warn'); return false; }
  try {
    if (Notification.permission === 'denied') { if (ask) toast('Notifications are blocked. Allow them for SabManage in your phone settings.', 'bad'); return false; }
    if (Notification.permission !== 'granted') { if (!ask) return false; const r = await Notification.requestPermission(); if (r !== 'granted') { toast('Notifications not allowed', 'warn'); return false; } }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) });
    const j = sub.toJSON(); const { error } = await S.adapter.sb.rpc('save_push_sub', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent });
    if (error) throw S.adapter.err(error);
    LS.set('ep_push_on', true); if (ask) { toast('Phone notifications are on'); render(); } return true;
  } catch (e) { if (ask) toast('Could not turn on notifications: ' + e.message, 'bad'); return false; }
}
A.enablePush = () => ensurePush(true);
async function stopPush() { try { if (!pushOK()) return; const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { } }
const pushIsOn = () => pushOK() && Notification.permission === 'granted' && LS.get('ep_push_on', false);
function pushCard() {
  if (!S.org || !pushOK() || pushIsOn() || LS.get('ep_push_hide', false)) return '';
  return `<div class="card pad row-flex push-card" style="margin-bottom:14px;flex-wrap:nowrap">${ibox('bell', '#E11D74')}<div class="grow" style="min-width:0"><b>Turn on alert notifications</b><div class="small muted">So you hear alerts from your team with the SabManage tune, even when the app is closed.</div></div><div class="row-flex" style="gap:6px"><button class="btn primary sm" onclick="A.enablePush()">Turn on</button><button class="icon-btn" style="width:34px;height:34px" aria-label="Hide" onclick="LS.set('ep_push_hide',true);render()">${ic('x')}</button></div></div>`;
}
/* service worker tells an open app that a push arrived */
try { navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', ev => { if (ev.data?.type === 'sm-alert' && S.org) startAlerts(); }); } catch (e) { }

/* ---------- team alerts inside the bell sheet ---------- */
function teamAlertRow(a) {
  const acks = Object.values(a.acks || {}); const mine = a.from_user === S.user?.id; const pend = forMe(a) && !seenByMe(a);
  return `<div class="row ${pend ? 'click' : ''}" ${pend ? 'onclick="A.closeModal();showAlertOverlay()"' : ''}>${ibox(a.urgent ? 'alert' : 'bell', a.urgent ? '#E0344B' : '#E11D74', 'sm')}<div class="main-col"><b>${esc(a.title)}</b><div class="sub"><span>${mine ? `To ${esc(a.to_name || 'Everyone')}` : `From ${esc(a.from_name || 'Team')}`}</span> · <span>${fmtShort(todayLocal(new Date(a.created_at)))}</span> <span>${new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>${mine ? ` · <span>${acks.length ? 'Seen by ' + acks.map(x => esc(x.name || '')).join(', ') : 'Not seen yet'}</span>` : ''}</div></div>${pend ? pill('New', 'bad') : mine ? pill(acks.length ? 'Seen' : 'Sent', acks.length ? 'good' : '') : ''}</div>`;
}
