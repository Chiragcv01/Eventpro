// SabManage: send an alert as a phone notification (web push) to the people it is for.
// Called by the app right after it saves a row in public.alerts. Only the sender can trigger it.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    // the database itself (patient portal → _clinic_notify) calls with the cron token instead of a user login
    const svc = req.headers.get("x-cron-token") || "";
    let trusted = false;
    if (svc) { const { data: ok } = await admin.rpc("cron_token_ok", { p: svc }); trusted = !!ok; }
    let me = "";
    if (!trusted) {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: who, error: werr } = await admin.auth.getUser(token);
      if (werr || !who?.user) return json({ error: "Not logged in" }, 401);
      me = who.user.id;
    }

    const { alertId, delay } = await req.json().catch(() => ({}));
    if (!alertId) return json({ error: "alertId missing" }, 400);
    const { data: a } = await admin.from("alerts").select("*").eq("id", alertId).maybeSingle();
    if (!a || (!trusted && a.from_user !== me) || (trusted && a.kind !== "patient")) return json({ error: "Not allowed" }, 403);
    if (Date.now() - Date.parse(a.created_at) > 15 * 60 * 1000) return json({ error: "Alert is too old to send" }, 400);

    let users: string[] = [];
    if (a.to_user) users = [a.to_user];
    else {
      let q = admin.from("org_members").select("user_id").eq("org_id", a.org_id);
      if (a.to_role === "managers") q = q.in("role", ["owner", "manager", "supervisor"]);
      const { data: m } = await q;
      users = (m || []).map((x: { user_id: string }) => x.user_id).filter((x: string) => a.kind === "patient" || x !== a.from_user);
    }
    if (!users.length) return json({ sent: 0, devices: 0 });
    const { data: subs } = await admin.from("push_subs").select("*").in("user_id", users);
    if (!subs?.length) return json({ sent: 0, devices: 0 });

    const { data: keys } = await admin.rpc("vapid_keys");
    webpush.setVapidDetails("https://sabmanage.com", keys.public, keys.private);
    const payload = JSON.stringify({
      id: a.id, urgent: a.kind !== "update" && !!a.urgent, kind: a.kind || "alert",
      title: (a.kind === "update" ? "✅ " : a.kind === "patient" ? "💬 " : a.urgent ? "🚨 " : "🔔 ") + a.title,
      body: [a.from_name, a.body].filter(Boolean).join(": ").slice(0, 400),
      url: "/app#alert-" + a.id,
    });
    // "test on my own phone": wait a few seconds so the person can close the app and lock the phone
    const wait = a.to_user === a.from_user ? Math.max(0, Math.min(20, Number(delay) || 0)) : 0;
    if (wait) {
      const job = (async () => { await new Promise((r) => setTimeout(r, wait * 1000)); await Promise.all(subs.map((s: { endpoint: string; p256dh: string; auth: string }) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: "high" }).catch(() => null))); })();
      // @ts-ignore EdgeRuntime is provided by Supabase
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(job); else await job;
      return json({ sent: subs.length, devices: subs.length, delayed: wait });
    }
    let sent = 0; const gone: string[] = []; const errors: string[] = [];
    await Promise.all(subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: "high", topic: String(a.id).replace(/-/g, "").slice(0, 32) });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint); else errors.push(String(code || (e as Error).message).slice(0, 80));
      }
    }));
    if (gone.length) await admin.from("push_subs").delete().in("endpoint", gone);
    return json({ sent, devices: subs.length, removed: gone.length, errors });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
