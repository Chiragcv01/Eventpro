// SabManage: morning summary (07:45 IST) for owners and managers, sent by a pg_cron job.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
type Row = { user_id: string; org_name: string; today: number; tomorrow: number; follow: number };
type Sub = { endpoint: string; p256dh: string; auth: string; user_id: string; lang: string };

function text(r: Row, hi: boolean) {
  const parts: string[] = [];
  if (r.today) parts.push(hi ? `आज ${r.today} इवेंट` : `${r.today} event${r.today > 1 ? "s" : ""} today`);
  if (r.tomorrow) parts.push(hi ? `कल ${r.tomorrow} इवेंट` : `${r.tomorrow} tomorrow`);
  if (r.follow) parts.push(hi ? `${r.follow} इन्क्वायरी को फ़ोन करना है` : `call back ${r.follow} enquir${r.follow > 1 ? "ies" : "y"}`);
  return {
    title: (hi ? "☀️ आज का काम · " : "☀️ Today · ") + r.org_name,
    body: parts.join(" · ") + (hi ? "। देखने के लिए टैप करें।" : ". Tap to open."),
  };
}

Deno.serve(async (req) => {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: ok } = await admin.rpc("cron_token_ok", { p: req.headers.get("x-cron-token") || "" });
    if (!ok) return json({ error: "Not allowed" }, 403);
    const { data: rows } = await admin.rpc("morning_counts");
    if (!rows?.length) return json({ sent: 0 });
    const users = [...new Set((rows as Row[]).map((r) => r.user_id))];
    const { data: subs } = await admin.from("push_subs").select("*").in("user_id", users);
    const { data: keys } = await admin.rpc("vapid_keys");
    webpush.setVapidDetails("https://sabmanage.com", keys.public, keys.private);
    let sent = 0; const gone: string[] = [];
    await Promise.all((rows as Row[]).flatMap((r) => ((subs || []) as Sub[]).filter((s) => s.user_id === r.user_id).map(async (s) => {
      const t = text(r, s.lang === "hi");
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...t, kind: "summary", url: "/app", id: "sum-" + new Date().toISOString().slice(0, 10) }), { TTL: 4 * 3600, urgency: "normal" });
        sent++;
      } catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) gone.push(s.endpoint); }
    })));
    if (gone.length) await admin.from("push_subs").delete().in("endpoint", gone);
    return json({ sent, removed: gone.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
