-- SabManage for doctors / clinics (applied 17 Oct 2026)
-- * orgs.kind: 'event' (tent / caterer / event manager) or 'clinic'
-- * doctor verification: a clinic stays fully blocked until the Super Admin approves its certificate
-- * patient links: a private link per patient for the patient portal (no login)
-- * storage: private buckets 'verify' (doctor certificates) and 'clinic' (patient photos, reports, voice notes)

alter table public.orgs add column if not exists kind text not null default 'event';
do $$ begin
  alter table public.orgs add constraint orgs_kind_chk check (kind in ('event', 'clinic'));
exception when duplicate_object then null; end $$;

-- only Super Admin / service role may change kind (owners cannot switch a business into a clinic or back)
create or replace function public.orgs_protect() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role' then
    new.status := old.status; new.plan := old.plan; new.expires_at := old.expires_at; new.notes := old.notes; new.price := old.price; new.kind := old.kind;
  end if;
  return new;
end $$;

-- ---------- doctor verification ----------
create table if not exists public.org_verifications (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  doctor_name text, reg_no text, council text, qualification text, specialisation text,
  files jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text, submitted_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid
);
alter table public.org_verifications enable row level security;
create policy ov_select on public.org_verifications for select using (public.my_role(org_id) = 'owner' or public.is_super_admin());
create policy ov_admin on public.org_verifications for update using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.try_uuid(t text) returns uuid language plpgsql immutable as $$
begin return t::uuid; exception when others then return null; end $$;

-- is this business allowed to work right now? (not suspended, not expired past grace, clinic verified)
create or replace function public.org_open(p_org uuid) returns boolean language plpgsql stable security definer set search_path = public as $$
declare o orgs; v_grace int;
begin
  select * into o from orgs where id = p_org; if not found then return false; end if;
  if o.status = 'suspended' then return false; end if;
  if o.expires_at is not null then
    select greatest(0, least(60, coalesce((data->>'graceDays')::int, 0))) into v_grace from platform_settings where id = 1;
    if o.expires_at + make_interval(days => coalesce(v_grace, 0)) < now() then return false; end if;
  end if;
  if o.kind = 'clinic' and not exists (select 1 from org_verifications where org_id = p_org and status = 'approved') then return false; end if;
  return true;
end $$;

create or replace function public.perm_for(p_user uuid, p_org uuid, p_module text) returns integer
language plpgsql stable security definer set search_path = public as $$
declare v_lvl int; v_status text; v_exp timestamptz; v_grace int; v_kind text;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from platform_admins where user_id = p_user and active) then return 3; end if;
  select o.status, o.expires_at, o.kind into v_status, v_exp, v_kind from orgs o where o.id = p_org;
  if v_status = 'suspended' then return 0; end if;
  select case when m.role = 'owner' then 3
              else coalesce((m.perms ->> p_module)::int, (r.perms ->> p_module)::int, 0) end
    into v_lvl
    from org_members m
    left join org_roles r on r.org_id = m.org_id and r.role = m.role
   where m.org_id = p_org and m.user_id = p_user;
  if v_lvl is null then return null; end if;
  if v_exp is not null then
    select greatest(0, least(60, coalesce((data->>'graceDays')::int, 0))) into v_grace from platform_settings where id = 1;
    if v_exp + make_interval(days => coalesce(v_grace, 0)) < now() then return 0; end if;
  end if;
  -- a clinic works only after the Super Admin has approved the doctor's certificate
  if v_kind = 'clinic' and not exists (select 1 from org_verifications where org_id = p_org and status = 'approved') then return 0; end if;
  return v_lvl;
end $$;

-- the owner sends (or re-sends) the certificate details; files must already be uploaded to verify/<org>/
create or replace function public.submit_verification(p_org uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare f jsonb; n int := 0;
begin
  if public.my_role(p_org) is distinct from 'owner' and not public.is_super_admin() then raise exception 'Only the owner can send the certificate'; end if;
  if not exists (select 1 from orgs where id = p_org and kind = 'clinic') then raise exception 'This business is not a clinic'; end if;
  if exists (select 1 from org_verifications where org_id = p_org and status = 'approved') then raise exception 'Already verified'; end if;
  if coalesce(trim(p->>'reg_no'), '') = '' then raise exception 'Registration number is required'; end if;
  if coalesce(trim(p->>'council'), '') = '' then raise exception 'Medical council is required'; end if;
  for f in select * from jsonb_array_elements(coalesce(p->'files', '[]'::jsonb)) loop
    if left(f->>'path', length(p_org::text) + 1) <> p_org::text || '/' then raise exception 'Wrong file'; end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'Upload your registration certificate'; end if;
  if n > 6 then raise exception 'Up to 6 files'; end if;
  insert into org_verifications(org_id, doctor_name, reg_no, council, qualification, specialisation, files, status, note, submitted_at)
  values (p_org, left(p->>'doctor_name', 120), left(p->>'reg_no', 60), left(p->>'council', 120), left(p->>'qualification', 120),
          left(p->>'specialisation', 120), p->'files', 'pending', null, now())
  on conflict (org_id) do update set doctor_name = excluded.doctor_name, reg_no = excluded.reg_no, council = excluded.council,
    qualification = excluded.qualification, specialisation = excluded.specialisation, files = excluded.files,
    status = 'pending', note = null, submitted_at = now(), reviewed_at = null, reviewed_by = null;
end $$;

-- kind comes from the sign-up settings (bizTypes contains 'clinic')
create or replace function public.admin_create_org(p_owner uuid, p_name text, p_display_name text, p_roles jsonb, p_settings jsonb,
  p_status text default 'trial', p_plan text default 'Trial', p_expires timestamptz default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid; k text; v jsonb; v_days int; v_kind text;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Business name is required'; end if;
  select coalesce((data->>'trialDays')::int, 14) into v_days from platform_settings where id = 1;
  v_kind := case when coalesce(p_settings->'bizTypes', '[]'::jsonb) ? 'clinic' then 'clinic' else 'event' end;
  insert into orgs(name, created_by, status, plan, expires_at, kind)
    values (left(p_name, 120), p_owner, coalesce(p_status, 'trial'), coalesce(p_plan, 'Trial'),
            coalesce(p_expires, now() + make_interval(days => coalesce(v_days, 14))), v_kind)
    returning id into v_org;
  insert into org_members(org_id, user_id, role, display_name, email)
    values (v_org, p_owner, 'owner', p_display_name, (select email from auth.users where id = p_owner));
  insert into org_roles(org_id, role, label, perms) values (v_org, 'owner', 'Owner', '{}'::jsonb);
  for k, v in select * from jsonb_each(coalesce(p_roles, '{}'::jsonb)) loop
    if k <> 'owner' then
      insert into org_roles(org_id, role, label, perms) values (v_org, k, coalesce(v ->> 'label', k), coalesce(v -> 'perms', '{}'::jsonb));
    end if;
  end loop;
  insert into records(org_id, collection, id, data) values (v_org, 'settings', 'main', coalesce(p_settings, '{}'::jsonb));
  return v_org;
end $$;

create or replace function public.create_org(p_name text, p_display_name text, p_roles jsonb, p_settings jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Business name is required'; end if;
  if not is_super_admin() and exists (select 1 from platform_settings where id = 1 and (data->>'allowSignup')::boolean is false) then
    raise exception 'New business sign-ups are closed. Please contact support.';
  end if;
  return admin_create_org(auth.uid(), p_name, p_display_name, p_roles, p_settings);
end $$;

-- clinic collections → permission module
create or replace function public.coll_module(c text) returns text language sql immutable set search_path = public as $$
  select case c
    when 'events' then 'bookings'   when 'inventory' then 'inventory'
    when 'dishes' then 'catering'   when 'mandi' then 'catering'
    when 'invoices' then 'invoices' when 'counters' then 'invoices'
    when 'payments' then 'payments'
    when 'vendors' then 'vendors'   when 'pos' then 'vendors'
    when 'staff' then 'staff'       when 'attendance' then 'staff'
    when 'advances' then 'staff'    when 'payouts' then 'staff'
    when 'tasks' then 'tasks'       when 'expenses' then 'expenses'
    when 'reviews' then 'reviews'   when 'settings' then 'settings'
    when 'activity' then 'team'
    when 'patients' then 'patients' when 'readings' then 'patients' when 'pmsgs' then 'patients'
    when 'visits' then 'medical'    when 'appts' then 'appointments'
    else 'settings' end
$$;

create index if not exists records_patient_idx on public.records (org_id, collection, (data->>'patientId'))
  where collection in ('readings', 'pmsgs', 'visits', 'appts');

-- ---------- patient links (portal) ----------
create table if not exists public.patient_links (
  token text primary key, org_id uuid not null references public.orgs(id) on delete cascade, patient_id text not null,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), revoked boolean not null default false,
  consent_at timestamptz, consent_name text
);
create index if not exists patient_links_patient on public.patient_links (org_id, patient_id);
alter table public.patient_links enable row level security;
create policy pl_select on public.patient_links for select using (coalesce(public.perm(org_id, 'patients'), 0) >= 1);

-- get (or make, or reset) the portal link of one patient
create or replace function public.patient_link(p_org uuid, p_patient text, p_reset boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare t text; c text := 'abcdefghjkmnpqrstuvwxyz23456789'; i int;
begin
  if coalesce(public.perm(p_org, 'patients'), 0) < 2 then raise exception 'Not allowed'; end if;
  if not exists (select 1 from records where org_id = p_org and collection = 'patients' and id = p_patient) then raise exception 'Patient not found'; end if;
  if p_reset then update patient_links set revoked = true where org_id = p_org and patient_id = p_patient and not revoked; end if;
  select token into t from patient_links where org_id = p_org and patient_id = p_patient and not revoked order by created_at desc limit 1;
  if t is not null then return t; end if;
  t := '';
  for i in 1..16 loop t := t || substr(c, 1 + floor(random() * length(c))::int, 1); end loop;
  insert into patient_links(token, org_id, patient_id) values (t, p_org, p_patient);
  update records set data = data || jsonb_build_object('linkToken', t), updated_at = now()
   where org_id = p_org and collection = 'patients' and id = p_patient;
  return t;
end $$;

create or replace function public.patient_link_org(p_token text) returns uuid language sql stable security definer set search_path = public as $$
  select org_id from patient_links where token = p_token
$$;
create or replace function public.patient_token_ok(p_token text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from patient_links l where l.token = p_token and not l.revoked and public.org_open(l.org_id))
$$;

create or replace function public._plink(p_token text) returns public.patient_links language plpgsql stable security definer set search_path = public as $$
declare l patient_links;
begin
  select * into l from patient_links where token = lower(trim(coalesce(p_token, ''))) and not revoked;
  if not found then raise exception 'This link is not active. Please ask your clinic for a new link.'; end if;
  if not public.org_open(l.org_id) then raise exception 'This clinic is not taking online requests right now. Please call the clinic.'; end if;
  return l;
end $$;

-- quiet notification (💬) to the clinic's owner / manager / receptionist phones
create or replace function public._clinic_notify(p_org uuid, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public, vault as $$
declare v_owner uuid; v_id uuid;
begin
  select user_id into v_owner from org_members where org_id = p_org and role = 'owner' limit 1;
  if v_owner is null then return; end if;
  insert into alerts(org_id, from_user, from_name, to_user, title, body, urgent, kind, to_role)
    values (p_org, v_owner, 'Patient', null, left(p_title, 140), left(p_body, 300), false, 'patient', 'managers') returning id into v_id;
  begin
    perform net.http_post(
      url := 'https://uregwtavhkjowiltukiq.supabase.co/functions/v1/send-alert',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWd3dGF2aGtqb3dpbHR1a2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTA1MjksImV4cCI6MjEwNzcyNjUyOX0.bVRTpmkE_c30j-_pegk0HLdGaSeSNqQ3pwtBjeRoAIw',
        'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_token' limit 1)),
      body := jsonb_build_object('alertId', v_id));
  exception when others then null; end;
end $$;

create or replace function public._pt_touch(p_org uuid, p_pid text, p jsonb) returns void language sql security definer set search_path = public as $$
  update records set data = data || p, updated_at = now() where org_id = p_org and collection = 'patients' and id = p_pid;
$$;

create or replace function public._rid(p text) returns text language sql volatile as $$
  select p || substr(md5(random()::text || clock_timestamp()::text), 1, 12)
$$;

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
       'address', st->'address', 'city', st->'city', 'timings', st->'timings', 'feeClinic', st->'feeClinic', 'feeVideo', st->'feeVideo'),
    'patient', jsonb_build_object('id', pt->'id', 'name', pt->'name', 'age', pt->'age', 'sex', pt->'sex', 'track', pt->'track'),
    'consent', l.consent_at is not null,
    'readings', coalesce((select jsonb_agg(x.data) from (select data from records where org_id = l.org_id and collection = 'readings'
        and data->>'patientId' = l.patient_id order by data->>'at' desc limit 300) x), '[]'::jsonb),
    'appts', coalesce((select jsonb_agg(x.data) from (select data - 'notes' as data from records where org_id = l.org_id and collection = 'appts'
        and data->>'patientId' = l.patient_id and coalesce(data->>'status', '') <> 'cancelled' order by data->>'date' desc limit 30) x), '[]'::jsonb),
    'msgs', coalesce((select jsonb_agg(x.data order by x.data->>'at') from (select data from records where org_id = l.org_id and collection = 'pmsgs'
        and data->>'patientId' = l.patient_id order by data->>'at' desc limit 100) x), '[]'::jsonb));
end $$;

create or replace function public.patient_consent(p_token text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare l patient_links;
begin
  l := public._plink(p_token);
  update patient_links set consent_at = now(), consent_name = left(coalesce(p_name, ''), 120) where token = l.token;
  perform public._pt_touch(l.org_id, l.patient_id, jsonb_build_object('consentAt', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI')));
end $$;

create or replace function public._pnum(p jsonb, k text, lo numeric, hi numeric) returns numeric language plpgsql immutable as $$
declare v numeric;
begin
  if p ? k and nullif(p->>k, '') is not null then
    begin v := (p->>k)::numeric; exception when others then raise exception 'Check the number for %', k; end;
    if v < lo or v > hi then raise exception 'The number for % looks wrong (%–%)', k, lo, hi; end if;
    return v;
  end if;
  return null;
end $$;

create or replace function public.patient_add_reading(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l patient_links; pt jsonb; rec jsonb; rid text; sys numeric; dia numeric; sug numeric; wt numeric; pul numeric; spo numeric; tmp numeric; st text; flag text := '';
begin
  l := public._plink(p_token);
  if l.consent_at is null then raise exception 'Please give your consent first'; end if;
  if (select count(*) from records where org_id = l.org_id and collection = 'readings' and data->>'patientId' = l.patient_id
        and data->>'by' = 'patient' and updated_at > now() - interval '1 hour') >= 20 then raise exception 'Too many readings in one hour. Try later.'; end if;
  sys := public._pnum(p, 'sys', 50, 260); dia := public._pnum(p, 'dia', 30, 160); sug := public._pnum(p, 'sugar', 20, 600);
  wt := public._pnum(p, 'weight', 1, 300); pul := public._pnum(p, 'pulse', 20, 220); spo := public._pnum(p, 'spo2', 50, 100); tmp := public._pnum(p, 'temp', 90, 110);
  if coalesce(sys, dia, sug, wt, pul, spo, tmp) is null then raise exception 'Fill at least one reading'; end if;
  if (sys is null) <> (dia is null) then raise exception 'Fill both BP numbers (upper and lower)'; end if;
  st := case when p->>'sugarType' in ('fasting', 'pp', 'random') then p->>'sugarType' else 'random' end;
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  rid := public._rid('rd_');
  rec := jsonb_strip_nulls(jsonb_build_object('id', rid, 'patientId', l.patient_id, 'by', 'patient',
    'at', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'), 'date', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'),
    'sys', sys, 'dia', dia, 'sugar', sug, 'sugarType', case when sug is null then null else st end, 'weight', wt, 'pulse', pul, 'spo2', spo, 'temp', tmp,
    'note', nullif(left(coalesce(p->>'note', ''), 300), ''), 'updatedBy', coalesce(pt->>'name', 'Patient'), 'updatedById', 'patient',
    'updatedAt', (extract(epoch from now()) * 1000)::bigint));
  insert into records(org_id, collection, id, data, updated_by) values (l.org_id, 'readings', rid, rec, null);
  perform public._pt_touch(l.org_id, l.patient_id, jsonb_build_object('lastReadingAt', rec->>'at'));
  if sys >= 160 or dia >= 100 or sys < 90 then flag := flag || ' BP ' || sys || '/' || dia; end if;
  if sug >= 250 or sug < 70 then flag := flag || ' Sugar ' || sug; end if;
  if spo < 92 then flag := flag || ' SpO2 ' || spo; end if;
  if tmp >= 101 then flag := flag || ' Temp ' || tmp; end if;
  if flag <> '' then perform public._clinic_notify(l.org_id, 'Reading to check: ' || coalesce(pt->>'name', 'Patient'), trim(flag)); end if;
  return rec;
end $$;

create or replace function public.patient_message(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l patient_links; pt jsonb; rec jsonb; rid text; f jsonb; files jsonb := '[]'::jsonb; n int := 0; txt text; label text;
begin
  l := public._plink(p_token);
  if l.consent_at is null then raise exception 'Please give your consent first'; end if;
  if (select count(*) from records where org_id = l.org_id and collection = 'pmsgs' and data->>'patientId' = l.patient_id
        and data->>'from' = 'patient' and updated_at > now() - interval '1 hour') >= 30 then raise exception 'Too many messages in one hour. Please call the clinic.'; end if;
  txt := left(trim(coalesce(p->>'text', '')), 2000);
  for f in select * from jsonb_array_elements(coalesce(p->'files', '[]'::jsonb)) loop
    n := n + 1; if n > 5 then raise exception 'Up to 5 files in one message'; end if;
    if left(f->>'path', length(l.token) + 3) <> 'p/' || l.token || '/' then raise exception 'Wrong file'; end if;
    files := files || jsonb_build_object('path', f->>'path', 'type', case when f->>'type' in ('image', 'audio', 'pdf') then f->>'type' else 'image' end,
      'name', left(coalesce(f->>'name', ''), 80), 'secs', nullif(f->>'secs', '')::int);
  end loop;
  if txt = '' and n = 0 then raise exception 'Write something, or add a photo or voice note'; end if;
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  rid := public._rid('pm_');
  rec := jsonb_build_object('id', rid, 'patientId', l.patient_id, 'from', 'patient', 'at', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'),
    'text', txt, 'files', files, 'by', coalesce(pt->>'name', 'Patient'), 'updatedBy', coalesce(pt->>'name', 'Patient'), 'updatedById', 'patient',
    'updatedAt', (extract(epoch from now()) * 1000)::bigint);
  insert into records(org_id, collection, id, data, updated_by) values (l.org_id, 'pmsgs', rid, rec, null);
  perform public._pt_touch(l.org_id, l.patient_id, jsonb_build_object('unread', coalesce((pt->>'unread')::int, 0) + 1, 'lastMsgAt', rec->>'at'));
  label := case when txt <> '' then left(txt, 120) when files @> '[{"type":"audio"}]' then '🎤 Voice note' when files @> '[{"type":"pdf"}]' then '📄 Report' else '📷 Photo' end;
  perform public._clinic_notify(l.org_id, 'Message from ' || coalesce(pt->>'name', 'patient'), label);
  return rec;
end $$;

create or replace function public.patient_book(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l patient_links; pt jsonb; st jsonb; rec jsonb; rid text; d date; mode text;
begin
  l := public._plink(p_token);
  if l.consent_at is null then raise exception 'Please give your consent first'; end if;
  begin d := (p->>'date')::date; exception when others then raise exception 'Pick a date'; end;
  if d < (now() at time zone 'Asia/Kolkata')::date or d > (now() at time zone 'Asia/Kolkata')::date + 90 then raise exception 'Pick a date within the next 90 days'; end if;
  if (select count(*) from records where org_id = l.org_id and collection = 'appts' and data->>'patientId' = l.patient_id and data->>'status' = 'requested') >= 3 then
    raise exception 'You already have requests waiting. The clinic will confirm soon.'; end if;
  mode := case when p->>'mode' in ('clinic', 'video', 'whatsapp') then p->>'mode' else 'clinic' end;
  select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
  select data into st from records where org_id = l.org_id and collection = 'settings' and id = 'main';
  rid := public._rid('ap_');
  rec := jsonb_build_object('id', rid, 'patientId', l.patient_id, 'patientName', pt->>'name', 'phone', pt->>'phone', 'date', d::text,
    'time', left(coalesce(p->>'time', ''), 5), 'mode', mode, 'status', 'requested', 'source', 'patient', 'reason', left(coalesce(p->>'reason', ''), 300),
    'fee', coalesce(case when mode = 'clinic' then (st->>'feeClinic')::numeric else (st->>'feeVideo')::numeric end, 0), 'paid', false,
    'created', (extract(epoch from now()) * 1000)::bigint, 'updatedBy', coalesce(pt->>'name', 'Patient'), 'updatedById', 'patient',
    'updatedAt', (extract(epoch from now()) * 1000)::bigint);
  insert into records(org_id, collection, id, data, updated_by) values (l.org_id, 'appts', rid, rec, null);
  perform public._clinic_notify(l.org_id, 'Appointment request: ' || coalesce(pt->>'name', 'patient'),
    to_char(d, 'DD Mon') || coalesce(' ' || nullif(rec->>'time', ''), '') || ' · ' || case mode when 'clinic' then 'In clinic' when 'video' then 'Video call' else 'WhatsApp call' end);
  return rec;
end $$;

create or replace function public.patient_paid(p_token text, p_appt text, p_utr text) returns void
language plpgsql security definer set search_path = public as $$
declare l patient_links; a jsonb;
begin
  l := public._plink(p_token);
  select data into a from records where org_id = l.org_id and collection = 'appts' and id = p_appt and data->>'patientId' = l.patient_id;
  if a is null then raise exception 'Appointment not found'; end if;
  update records set data = data || jsonb_build_object('payClaim', jsonb_build_object('at', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI'),
      'utr', left(coalesce(p_utr, ''), 40)), 'updatedById', 'patient', 'updatedAt', (extract(epoch from now()) * 1000)::bigint), updated_at = now()
   where org_id = l.org_id and collection = 'appts' and id = p_appt;
  perform public._clinic_notify(l.org_id, 'Fee paid by ' || coalesce(a->>'patientName', 'patient') || ' (check UPI)', '₹' || coalesce(a->>'fee', '0') || coalesce(' · UTR ' || nullif(p_utr, ''), ''));
end $$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('verify', 'verify', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('clinic', 'clinic', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- verify/<org_id>/<file>: owner of that business + Super Admin
create policy verify_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'verify' and (public.my_role(public.try_uuid((storage.foldername(name))[1])) = 'owner' or public.is_super_admin()));
create policy verify_select on storage.objects for select to authenticated using (
  bucket_id = 'verify' and (public.my_role(public.try_uuid((storage.foldername(name))[1])) = 'owner' or public.is_super_admin()));

-- clinic/m/<org>/<patient>/<file> = medical records (module 'medical')
-- clinic/p/<token>/<file>       = files the patient sends and the clinic's replies (valid patient link, or 'patients' access)
create policy clinic_insert on storage.objects for insert to anon, authenticated with check (
  bucket_id = 'clinic' and (
    ((storage.foldername(name))[1] = 'm' and coalesce(public.perm(public.try_uuid((storage.foldername(name))[2]), 'medical'), 0) >= 2)
    or ((storage.foldername(name))[1] = 'p' and public.patient_token_ok((storage.foldername(name))[2]))));
create policy clinic_select on storage.objects for select to anon, authenticated using (
  bucket_id = 'clinic' and (
    ((storage.foldername(name))[1] = 'm' and coalesce(public.perm(public.try_uuid((storage.foldername(name))[2]), 'medical'), 0) >= 1)
    or ((storage.foldername(name))[1] = 'p' and (public.patient_token_ok((storage.foldername(name))[2])
         or coalesce(public.perm(public.patient_link_org((storage.foldername(name))[2]), 'patients'), 0) >= 1))));
create policy clinic_delete on storage.objects for delete to authenticated using (
  bucket_id = 'clinic' and (storage.foldername(name))[1] = 'm' and coalesce(public.perm(public.try_uuid((storage.foldername(name))[2]), 'medical'), 0) >= 3);

-- ---------- Super Admin overview: kind + verification ----------
create or replace function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(t.x order by t.created desc) from (
    select o.created_at as created, jsonb_build_object(
      'orgId', o.id, 'name', o.name, 'created', o.created_at, 'status', o.status, 'plan', o.plan, 'price', o.price, 'kind', o.kind,
      'verify', v.status, 'verifyNote', v.note,
      'expires', to_char(o.expires_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'notes', o.notes,
      'ownerName',  (select display_name from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerEmail', (select email from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerId',    (select user_id from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerPhone', s.data->>'phone', 'city', s.data->>'city', 'logo', s.data->>'logo',
      'referredBy', s.data->>'referredBy',
      'members',  (select count(*) from org_members where org_id = o.id),
      'bookings', (select count(*) from records where org_id = o.id and collection = case when o.kind = 'clinic' then 'patients' else 'events' end),
      'invoices', (select count(*) from records where org_id = o.id and collection = case when o.kind = 'clinic' then 'appts' else 'invoices' end),
      'lastActivity', coalesce((select max(updated_at) from records where org_id = o.id), o.created_at)) as x
    from orgs o left join records s on s.org_id = o.id and s.collection = 'settings' and s.id = 'main'
    left join org_verifications v on v.org_id = o.id) t), '[]'::jsonb);
end $$;

-- the patient-facing functions are callable without login (the link token is the key)
grant execute on function public.patient_view(text), public.patient_consent(text, text), public.patient_add_reading(text, jsonb),
  public.patient_message(text, jsonb), public.patient_book(text, jsonb), public.patient_paid(text, text, text) to anon, authenticated;
revoke execute on function public._clinic_notify(uuid, text, text), public._pt_touch(uuid, text, jsonb) from anon, authenticated, public;

-- hardening (second migration)
alter function public._rid(text) set search_path = public;
alter function public._pnum(jsonb, text, numeric, numeric) set search_path = public;
alter function public.try_uuid(text) set search_path = public;
revoke execute on function public._plink(text) from anon, authenticated, public;
revoke execute on function public.patient_link(uuid, text, boolean) from anon, public;
revoke execute on function public.submit_verification(uuid, jsonb) from anon, public;
grant execute on function public.patient_link(uuid, text, boolean), public.submit_verification(uuid, jsonb) to authenticated;

-- third migration: patient notifications use alerts.kind = 'patient'
alter table public.alerts drop constraint if exists alerts_kind_chk;
alter table public.alerts add constraint alerts_kind_chk check (kind = any (array['alert','update','patient']));
