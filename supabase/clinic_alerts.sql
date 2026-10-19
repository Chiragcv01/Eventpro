-- Clinic: doctor's own readings / tests, alert limits, emergency alarm, doctor → patient alerts (19 Oct 2026)
-- * settings.tests  = [{key:'t_xxxx', name, unit, type:'number'|'text', min, max}]  (the doctor's own readings / lab tests)
-- * settings.rules  = {field: {low, high, critLow, critHigh}}   field = sys, dia, sugar, weight, pulse, spo2, temp or a test key
--   patient.rules   = the same per patient; a filled value wins over the clinic value
--   below low / above high = "check" alert;  below critLow / above critHigh = EMERGENCY
-- * settings.alarmTo = 'doctors' (default) | 'managers' (doctors + front desk) | 'all';  settings.tellPatient (default true)
-- * a reading that crosses a limit → alerts row kind 'reading', event_id 'pt:<patient id>' (push 🔔, rings once)
--   an EMERGENCY → alerts row kind 'emergency', urgent, event_id 'pt:<patient id>', to_role doctors/managers/null (push 🚨, rings until
--   someone taps Seen; re-sent every minute for 30 minutes by sm_private.clinic_alarm_tick)
-- * patient_alerts: the doctor alerts a patient; it shows on the patient link and is re-sent until the patient taps "I have seen it"
-- * internal helpers live in schema sm_private, which the API cannot reach (applied by the owner in the Supabase SQL Editor, 19 Oct 2026)

create schema if not exists sm_private;
alter table public.alerts drop constraint if exists alerts_kind_chk;
alter table public.alerts add constraint alerts_kind_chk check (kind = any (array['alert','update','patient','reading','emergency']));

create or replace function public._default_rules() returns jsonb language sql immutable set search_path = public as $$
  select '{"sys":{"low":90,"high":160,"critLow":80,"critHigh":180},"dia":{"high":100,"critHigh":120},"sugar":{"low":70,"high":250,"critLow":54,"critHigh":400},"pulse":{"low":50,"high":120,"critLow":40,"critHigh":140},"spo2":{"low":92,"critLow":88},"temp":{"high":101,"critHigh":103}}'::jsonb
$$;

create or replace function public._jnum(t text) returns numeric language plpgsql immutable set search_path = public as $$
begin
  if t is null or trim(t) = '' then return null; end if;
  return trim(t)::numeric;
exception when others then return null;
end $$;

-- clinic limits merged with the patient's own limits (a filled patient value wins)
create or replace function public._rules_eff(st jsonb, pt jsonb) returns jsonb language plpgsql immutable set search_path = public as $$
declare base jsonb := coalesce(st->'rules', public._default_rules()); pr jsonb := coalesce(pt->'rules', '{}'::jsonb);
  out jsonb := '{}'::jsonb; f text; r jsonb; k text; v numeric;
begin
  if jsonb_typeof(base) is distinct from 'object' then base := '{}'::jsonb; end if;
  if jsonb_typeof(pr) is distinct from 'object' then pr := '{}'::jsonb; end if;
  for f in select jsonb_object_keys(base) union select jsonb_object_keys(pr) loop
    r := '{}'::jsonb;
    foreach k in array array['low', 'high', 'critLow', 'critHigh'] loop
      v := coalesce(public._jnum(pr->f->>k), public._jnum(base->f->>k));
      if v is not null then r := r || jsonb_build_object(k, v); end if;
    end loop;
    if r <> '{}'::jsonb then out := out || jsonb_build_object(f, r); end if;
  end loop;
  return out;
end $$;

create or replace function public._field_label(st jsonb, f text) returns text language sql immutable set search_path = public as $$
  select coalesce(case f when 'sys' then 'BP upper' when 'dia' then 'BP lower' when 'sugar' then 'Sugar' when 'weight' then 'Weight'
      when 'pulse' then 'Pulse' when 'spo2' then 'SpO2' when 'temp' then 'Temp' end,
    (select t->>'name' from jsonb_array_elements(case when jsonb_typeof(st->'tests') = 'array' then st->'tests' else '[]'::jsonb end) t where t->>'key' = f limit 1), f)
$$;

-- {level: 'emergency' | 'alert' | '', flags: ['BP upper 190', …]}
create or replace function public._reading_level(rec jsonb, rules jsonb, st jsonb) returns jsonb language plpgsql immutable set search_path = public as $$
declare f text; r jsonb; v numeric; lvl int := 0; l int; flags jsonb := '[]'::jsonb;
begin
  for f, r in select * from jsonb_each(coalesce(rules, '{}'::jsonb)) loop
    v := public._jnum(rec->>f); if v is null then continue; end if;
    l := 0;
    if (public._jnum(r->>'critLow') is not null and v < public._jnum(r->>'critLow')) or (public._jnum(r->>'critHigh') is not null and v > public._jnum(r->>'critHigh')) then l := 2;
    elsif (public._jnum(r->>'low') is not null and v < public._jnum(r->>'low')) or (public._jnum(r->>'high') is not null and v > public._jnum(r->>'high')) then l := 1; end if;
    if l > 0 then flags := flags || to_jsonb(public._field_label(st, f) || ' ' || (rec->>f)); lvl := greatest(lvl, l); end if;
  end loop;
  return jsonb_build_object('level', case lvl when 2 then 'emergency' when 1 then 'alert' else '' end, 'flags', flags);
end $$;

-- push one alert row to the phones it is for (send-alert edge function, trusted by the cron token)
create or replace function sm_private._push_alert(p_id uuid) returns void language plpgsql security definer set search_path = public, vault as $$
begin
  perform net.http_post(
    url := 'https://uregwtavhkjowiltukiq.supabase.co/functions/v1/send-alert',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWd3dGF2aGtqb3dpbHR1a2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTA1MjksImV4cCI6MjEwNzcyNjUyOX0.bVRTpmkE_c30j-_pegk0HLdGaSeSNqQ3pwtBjeRoAIw',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_token' limit 1)),
    body := jsonb_build_object('alertId', p_id));
exception when others then null;
end $$;

create or replace function sm_private._clinic_notify2(p_org uuid, p_title text, p_body text, p_kind text, p_urgent boolean, p_role text, p_ref text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_id uuid;
begin
  select user_id into v_owner from org_members where org_id = p_org and role = 'owner' limit 1;
  if v_owner is null then return null; end if;
  insert into alerts(org_id, from_user, from_name, to_user, title, body, urgent, kind, to_role, event_id)
    values (p_org, v_owner, 'Patient', null, left(p_title, 140), left(p_body, 300), coalesce(p_urgent, false), p_kind,
            case when p_role in ('doctors', 'managers') then p_role else null end, p_ref) returning id into v_id;
  perform sm_private._push_alert(v_id);
  return v_id;
end $$;

-- quiet notification to owner / doctors / front desk (unchanged behaviour, now through _clinic_notify2)
create or replace function public._clinic_notify(p_org uuid, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform sm_private._clinic_notify2(p_org, p_title, p_body, 'patient', false, 'managers', null);
end $$;

-- readings from the patient link: doctor's own tests, limits, emergency alarm
create or replace function public.patient_add_reading(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l patient_links; pt jsonb; st jsonb; rec jsonb; rid text; sys numeric; dia numeric; sug numeric; wt numeric; pul numeric; spo numeric; tmp numeric; stype text;
  t jsonb; k text; v text; nv numeric; extra jsonb := '{}'::jsonb; ev jsonb; lvl text; txt text; who text; old text; touch jsonb;
begin
  l := public._plink(p_token);
  if l.consent_at is null then raise exception 'Please give your consent first'; end if;
  if (select count(*) from records where org_id = l.org_id and collection = 'readings' and data->>'patientId' = l.patient_id
        and data->>'by' = 'patient' and updated_at > now() - interval '1 hour') >= 20 then raise exception 'Too many readings in one hour. Try later.'; end if;
  sys := public._pnum(p, 'sys', 50, 260); dia := public._pnum(p, 'dia', 30, 160); sug := public._pnum(p, 'sugar', 20, 600);
  wt := public._pnum(p, 'weight', 1, 300); pul := public._pnum(p, 'pulse', 20, 220); spo := public._pnum(p, 'spo2', 50, 100); tmp := public._pnum(p, 'temp', 90, 110);
  if (sys is null) <> (dia is null) then raise exception 'Fill both BP numbers (upper and lower)'; end if;
  select data into st from records where org_id = l.org_id and collection = 'settings' and id = 'main';
  for t in select * from jsonb_array_elements(case when jsonb_typeof(st->'tests') = 'array' then st->'tests' else '[]'::jsonb end) loop
    k := t->>'key'; if k is null or k !~ '^t_[a-z0-9]{2,16}$' then continue; end if;
    v := nullif(trim(coalesce(p->>k, '')), ''); if v is null then continue; end if;
    if coalesce(t->>'type', 'number') = 'text' then extra := extra || jsonb_build_object(k, left(v, 120));
    else
      nv := public._jnum(v);
      if nv is null or abs(nv) > 1000000 then raise exception 'Check the number for %', coalesce(t->>'name', k); end if;
      if (public._jnum(t->>'min') is not null and nv < public._jnum(t->>'min')) or (public._jnum(t->>'max') is not null and nv > public._jnum(t->>'max')) then
        raise exception 'The number for % looks wrong (%–%)', coalesce(t->>'name', k), coalesce(t->>'min', '…'), coalesce(t->>'max', '…'); end if;
      extra := extra || jsonb_build_object(k, round(nv, 2));
    end if;
  end loop;
  if coalesce(sys, dia, sug, wt, pul, spo, tmp) is null and extra = '{}'::jsonb then raise exception 'Fill at least one reading'; end if;
  stype := case when p->>'sugarType' in ('fasting', 'pp', 'random') then p->>'sugarType' else 'random' end;
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  who := coalesce(pt->>'name', 'Patient');
  rid := public._rid('rd_');
  rec := jsonb_strip_nulls(jsonb_build_object('id', rid, 'patientId', l.patient_id, 'by', 'patient',
    'at', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'), 'date', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'),
    'sys', sys, 'dia', dia, 'sugar', sug, 'sugarType', case when sug is null then null else stype end, 'weight', wt, 'pulse', pul, 'spo2', spo, 'temp', tmp,
    'note', nullif(left(coalesce(p->>'note', ''), 300), ''), 'updatedBy', who, 'updatedById', 'patient',
    'updatedAt', (extract(epoch from now()) * 1000)::bigint)) || extra;
  ev := public._reading_level(rec, public._rules_eff(st, pt), st); lvl := coalesce(ev->>'level', '');
  if lvl <> '' then rec := rec || jsonb_build_object('level', lvl, 'flags', ev->'flags'); end if;
  insert into records(org_id, collection, id, data, updated_by) values (l.org_id, 'readings', rid, rec, null);
  touch := jsonb_build_object('lastReadingAt', rec->>'at');
  txt := (select string_agg(x, ', ') from jsonb_array_elements_text(ev->'flags') x);
  old := coalesce(pt->>'alertLevel', '');
  if lvl = 'emergency' or (lvl = 'alert' and old <> 'emergency') then
    touch := touch || jsonb_build_object('alertLevel', lvl, 'alertText', txt, 'alertAt', rec->>'at', 'alertReading', rid);
  end if;
  perform public._pt_touch(l.org_id, l.patient_id, touch);
  if lvl = 'emergency' then
    perform sm_private._clinic_notify2(l.org_id, 'EMERGENCY: ' || who, txt || ' · ' || to_char(now() at time zone 'Asia/Kolkata', 'HH24:MI'), 'emergency', true,
      case coalesce(st->>'alarmTo', 'doctors') when 'all' then null when 'managers' then 'managers' else 'doctors' end, 'pt:' || l.patient_id);
  elsif lvl = 'alert' then
    perform sm_private._clinic_notify2(l.org_id, 'Reading to check: ' || who, txt, 'reading', false, 'managers', 'pt:' || l.patient_id);
  end if;
  return rec;
end $$;

-- ---------- doctor → patient alerts ----------
create table if not exists public.patient_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id text not null,
  level text not null default 'red' check (level in ('red', 'amber')),
  text text not null check (char_length(text) between 1 and 500),
  from_name text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  seen_at timestamptz, cancelled_at timestamptz,
  pushes int not null default 0, last_push timestamptz
);
create index if not exists patient_alerts_patient on public.patient_alerts (org_id, patient_id, created_at desc);
create index if not exists patient_alerts_open on public.patient_alerts (created_at) where seen_at is null and cancelled_at is null;
alter table public.patient_alerts enable row level security;
create policy pa_select on public.patient_alerts for select using (coalesce(public.perm(org_id, 'patients'), 0) >= 1);

-- the patient's phones (web push from the patient link, no login)
create table if not exists public.patient_push_subs (
  endpoint text primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id text not null,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists patient_push_subs_patient on public.patient_push_subs (org_id, patient_id);
alter table public.patient_push_subs enable row level security;

create or replace function sm_private._patient_push(p_id uuid) returns void language plpgsql security definer set search_path = public, vault as $$
begin
  update patient_alerts set pushes = pushes + 1, last_push = now() where id = p_id;
  perform net.http_post(
    url := 'https://uregwtavhkjowiltukiq.supabase.co/functions/v1/send-alert',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWd3dGF2aGtqb3dpbHR1a2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTA1MjksImV4cCI6MjEwNzcyNjUyOX0.bVRTpmkE_c30j-_pegk0HLdGaSeSNqQ3pwtBjeRoAIw',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_token' limit 1)),
    body := jsonb_build_object('patientAlertId', p_id));
exception when others then null;
end $$;

create or replace function public.clinic_alert_patient(p_org uuid, p_patient text, p_level text, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pt jsonb; tk text; a patient_alerts; nm text; rid text; at text;
  lv text := case when p_level = 'amber' then 'amber' else 'red' end; txt text := left(trim(coalesce(p_text, '')), 500);
begin
  if coalesce(public.perm(p_org, 'patients'), 0) < 2 then raise exception 'Not allowed'; end if;
  if txt = '' then raise exception 'Write the message for the patient'; end if;
  select data into pt from records where org_id = p_org and collection = 'patients' and id = p_patient;
  if pt is null then raise exception 'Patient not found'; end if;
  select token into tk from patient_links where org_id = p_org and patient_id = p_patient and not revoked order by created_at desc limit 1;
  if tk is null then raise exception 'Send the patient link first. The alert shows on the patient link.'; end if;
  if (select count(*) from patient_alerts where org_id = p_org and created_at > now() - interval '1 hour') >= 30 then raise exception 'Too many alerts in one hour. Please call the patient.'; end if;
  select display_name into nm from org_members where org_id = p_org and user_id = auth.uid();
  nm := coalesce(nullif(nm, ''), 'Clinic');
  update patient_alerts set cancelled_at = now() where org_id = p_org and patient_id = p_patient and seen_at is null and cancelled_at is null;
  insert into patient_alerts(org_id, patient_id, level, text, from_name) values (p_org, p_patient, lv, txt, nm) returning * into a;
  at := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI');
  rid := public._rid('pm_');
  insert into records(org_id, collection, id, data, updated_by) values (p_org, 'pmsgs', rid, jsonb_build_object('id', rid, 'patientId', p_patient, 'from', 'clinic',
    'at', at, 'text', txt, 'files', '[]'::jsonb, 'flag', lv, 'alertId', a.id, 'by', nm, 'updatedBy', nm, 'updatedById', auth.uid(),
    'updatedAt', (extract(epoch from now()) * 1000)::bigint), auth.uid());
  perform public._pt_touch(p_org, p_patient, jsonb_build_object('flag', jsonb_build_object('id', a.id, 'level', lv, 'text', txt, 'at', at, 'by', nm)));
  perform sm_private._patient_push(a.id);
  return jsonb_build_object('id', a.id, 'level', lv, 'text', txt, 'at', at, 'by', nm,
    'devices', (select count(*) from patient_push_subs where org_id = p_org and patient_id = p_patient));
end $$;

create or replace function public.clinic_cancel_patient_alert(p_org uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a patient_alerts; pt jsonb;
begin
  if coalesce(public.perm(p_org, 'patients'), 0) < 2 then raise exception 'Not allowed'; end if;
  update patient_alerts set cancelled_at = now() where id = p_id and org_id = p_org and cancelled_at is null returning * into a;
  if not found then return; end if;
  select data into pt from records where org_id = p_org and collection = 'patients' and id = a.patient_id;
  if pt->'flag'->>'id' = a.id::text then
    perform public._pt_touch(p_org, a.patient_id, jsonb_build_object('flag', (pt->'flag') || jsonb_build_object('cancelledAt', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'))));
  end if;
end $$;

create or replace function public.patient_ack_alert(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l patient_links; a patient_alerts; pt jsonb;
begin
  l := public._plink(p_token);
  update patient_alerts set seen_at = now() where id = p_id and org_id = l.org_id and patient_id = l.patient_id and seen_at is null and cancelled_at is null returning * into a;
  if not found then return; end if;
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  if pt->'flag'->>'id' = a.id::text then
    perform public._pt_touch(l.org_id, l.patient_id, jsonb_build_object('flag', (pt->'flag') || jsonb_build_object('seenAt', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'))));
  end if;
  perform public._clinic_notify(l.org_id, coalesce(pt->>'name', 'Patient') || ' has seen your alert', left(a.text, 120));
end $$;

create or replace function public.patient_save_push(p_token text, p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
declare l patient_links;
begin
  l := public._plink(p_token);
  if coalesce(p_endpoint, '') !~ '^https://' or char_length(p_endpoint) > 1000 or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then raise exception 'Bad subscription'; end if;
  insert into patient_push_subs(endpoint, org_id, patient_id, p256dh, auth) values (p_endpoint, l.org_id, l.patient_id, left(p_p256dh, 200), left(p_auth, 100))
  on conflict (endpoint) do update set org_id = excluded.org_id, patient_id = excluded.patient_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  delete from patient_push_subs where org_id = l.org_id and patient_id = l.patient_id and endpoint not in (
    select endpoint from patient_push_subs where org_id = l.org_id and patient_id = l.patient_id order by created_at desc limit 5);
end $$;

-- every minute: keep ringing unanswered emergencies (30 min) and re-send unseen doctor → patient alerts
create or replace function sm_private.clinic_alarm_tick() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from alerts where kind = 'emergency' and acks = '{}'::jsonb
      and created_at > now() - interval '30 minutes' and created_at < now() - interval '50 seconds' loop
    perform sm_private._push_alert(r.id);
  end loop;
  for r in select pa.id from patient_alerts pa where pa.seen_at is null and pa.cancelled_at is null
      and ((pa.level = 'red' and pa.created_at > now() - interval '2 hours' and coalesce(pa.last_push, pa.created_at) < now() - interval '170 seconds')
        or (pa.level = 'amber' and pa.created_at > now() - interval '12 hours' and coalesce(pa.last_push, pa.created_at) < now() - interval '29 minutes'))
      and exists (select 1 from patient_push_subs s where s.org_id = pa.org_id and s.patient_id = pa.patient_id) loop
    perform sm_private._patient_push(r.id);
  end loop;
end $$;

-- the patient link page: + doctor's tests, effective limits, open alerts
create or replace function public.patient_view(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l patient_links; st jsonb; pt jsonb;
begin
  l := public._plink(p_token);
  select data into st from records where org_id = l.org_id and collection = 'settings' and id = 'main';
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  if pt is null then raise exception 'Patient not found. Please ask your clinic for a new link.'; end if;
  update records set data = data || jsonb_build_object('portalAt', (extract(epoch from now()) * 1000)::bigint)
   where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  return jsonb_build_object(
    'clinic', jsonb_build_object('bizName', st->'bizName', 'doctor', st->'doctorName', 'spec', st->'specialisation', 'qual', st->'qualification',
       'regNo', st->'regNo', 'council', st->'council', 'phone', st->'phone', 'logo', st->'logo', 'upi', st->'upi',
       'address', st->'address', 'city', st->'city', 'timings', st->'timings', 'feeClinic', st->'feeClinic', 'feeVideo', st->'feeVideo',
       'tests', case when jsonb_typeof(st->'tests') = 'array' then st->'tests' else '[]'::jsonb end,
       'tellPatient', (st->'tellPatient') is distinct from 'false'::jsonb),
    'patient', jsonb_build_object('id', pt->'id', 'name', pt->'name', 'age', pt->'age', 'sex', pt->'sex', 'track', pt->'track'),
    'rules', public._rules_eff(st, pt),
    'consent', l.consent_at is not null,
    'alerts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'level', a.level, 'text', a.text, 'by', a.from_name,
        'at', to_char(a.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI')) order by a.created_at desc)
        from patient_alerts a where a.org_id = l.org_id and a.patient_id = l.patient_id and a.seen_at is null and a.cancelled_at is null
        and a.created_at > now() - interval '7 days'), '[]'::jsonb),
    'readings', coalesce((select jsonb_agg(x.data) from (select data from records where org_id = l.org_id and collection = 'readings'
        and data->>'patientId' = l.patient_id order by data->>'at' desc limit 300) x), '[]'::jsonb),
    'appts', coalesce((select jsonb_agg(x.data) from (select data - 'notes' as data from records where org_id = l.org_id and collection = 'appts'
        and data->>'patientId' = l.patient_id and coalesce(data->>'status', '') <> 'cancelled' order by data->>'date' desc limit 30) x), '[]'::jsonb),
    'msgs', coalesce((select jsonb_agg(x.data order by x.data->>'at') from (select data from records where org_id = l.org_id and collection = 'pmsgs'
        and data->>'patientId' = l.patient_id order by data->>'at' desc limit 100) x), '[]'::jsonb));
end $$;

-- new public RPCs check access themselves (perm / link token); helpers are in sm_private, which the API cannot reach
grant execute on function public.clinic_alert_patient(uuid, text, text, text), public.clinic_cancel_patient_alert(uuid, uuid) to authenticated;
grant execute on function public.patient_ack_alert(text, uuid), public.patient_save_push(text, text, text, text), public.patient_add_reading(text, jsonb),
  public.patient_view(text) to anon, authenticated;
grant select on public.patient_alerts to authenticated;

select cron.schedule('sabmanage-clinic-alarm', '* * * * *', 'select sm_private.clinic_alarm_tick()');

revoke all on schema sm_private from public, anon, authenticated;
