-- Venue / banquet / resort + Leads & sales + alerts to seniors (19 Oct 2026; run by the owner in the Supabase SQL Editor)
-- * new collections: leads → module 'leads'; spaces, rooms, stays → module 'venue'
-- * lead link: table lead_keys (one private key per business), RPC lead_key (owner / manager), RPC lead_intake (anon,
--   used by https://sabmanage.com/api/lead?key=…): saves a lead (collection 'leads'), skips repeats, rings the sales team
--   (alert kind 'lead', to_role 'sales' = owner, managers, sales executives)
-- * every member can send an alert to their seniors (to_role 'managers', or to an owner / manager / supervisor)
-- * existing businesses get the new sections in their roles + a 'Sales Executive' role

create schema if not exists sm_private;

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
    when 'leads' then 'leads'
    when 'spaces' then 'venue'      when 'rooms' then 'venue'       when 'stays' then 'venue'
    else 'settings' end
$$;

alter table public.alerts drop constraint if exists alerts_kind_chk;
alter table public.alerts add constraint alerts_kind_chk check (kind = any (array['alert','update','patient','reading','emergency','lead']));

-- alerts.to_role was limited to 'managers' (alerts_to_role_chk); doctors / sales are needed too (fixed 19 Oct 2026)
alter table public.alerts drop constraint if exists alerts_to_role_chk;
alter table public.alerts add constraint alerts_to_role_chk check (to_role is null or to_role in ('managers', 'doctors', 'sales'));

drop policy if exists alerts_insert on public.alerts;
create policy alerts_insert on public.alerts for insert with check (
  from_user = auth.uid()
  and coalesce(public.perm(org_id, 'dashboard'), 0) >= 1
  and (
    (coalesce(public.perm(org_id, 'tasks'), 0) >= 2
      and (to_user is null or exists (select 1 from public.org_members m where m.org_id = alerts.org_id and m.user_id = alerts.to_user)))
    or (to_user is null and to_role = 'managers')
    or exists (select 1 from public.org_members m where m.org_id = alerts.org_id and m.user_id = alerts.to_user and m.role in ('owner', 'manager', 'supervisor'))));

update public.org_roles r set perms = r.perms || '{"leads":3,"venue":3}'::jsonb where r.role = 'manager' and not (r.perms ? 'leads') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'event');
update public.org_roles r set perms = r.perms || '{"leads":1,"venue":1}'::jsonb where r.role = 'accountant' and not (r.perms ? 'leads') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'event');
update public.org_roles r set perms = r.perms || '{"leads":0,"venue":2}'::jsonb where r.role = 'supervisor' and not (r.perms ? 'leads') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'event');
update public.org_roles r set perms = r.perms || '{"leads":0,"venue":1}'::jsonb where r.role = 'staff' and not (r.perms ? 'leads') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'event');
insert into public.org_roles(org_id, role, label, perms)
  select o.id, 'sales', 'Sales Executive', '{"leads":2,"venue":1,"dashboard":1,"bookings":2,"tasks":1,"inventory":0,"catering":1,"vendors":0,"staff":0,"tools":0,"invoices":1,"payments":0,"expenses":0,"reports":0,"reviews":1,"marketing":2,"team":0,"settings":0}'::jsonb
  from public.orgs o where o.kind = 'event' and not exists (select 1 from public.org_roles r where r.org_id = o.id and r.role = 'sales');

create or replace function sm_private._org_notify(p_org uuid, p_from text, p_title text, p_body text, p_kind text, p_urgent boolean, p_role text, p_ref text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_id uuid;
begin
  select user_id into v_owner from org_members where org_id = p_org and role = 'owner' limit 1;
  if v_owner is null then return null; end if;
  insert into alerts(org_id, from_user, from_name, to_user, title, body, urgent, kind, to_role, event_id)
    values (p_org, v_owner, left(coalesce(p_from, 'SabManage'), 60), null, left(p_title, 140), left(p_body, 300), coalesce(p_urgent, false), p_kind,
            case when p_role in ('doctors', 'managers', 'sales') then p_role else null end, p_ref) returning id into v_id;
  perform sm_private._push_alert(v_id);
  return v_id;
end $$;

create table if not exists public.lead_keys (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.lead_keys enable row level security;

create or replace function public.lead_key(p_org uuid, p_reset boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare k text; nk text := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  if coalesce(public.perm(p_org, 'leads'), 0) < 3 then raise exception 'Only the owner or a manager can see the lead link'; end if;
  select key into k from lead_keys where org_id = p_org;
  if k is null then insert into lead_keys(org_id, key) values (p_org, nk); return nk; end if;
  if p_reset then update lead_keys set key = nk, created_at = now() where org_id = p_org; return nk; end if;
  return k;
end $$;

create or replace function public.lead_intake(p_key text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_org uuid; rid text; rec jsonb; ph text; dup_id text; at text; d date; g int; src text; nm text;
begin
  select org_id into v_org from lead_keys where key = coalesce(p_key, '');
  if v_org is null then raise exception 'This lead link is not active'; end if;
  if not public.org_open(v_org) then raise exception 'This business account is not active'; end if;
  if (select count(*) from records where org_id = v_org and collection = 'leads' and data->>'via' = 'link' and updated_at > now() - interval '1 hour') >= 300 then
    raise exception 'Too many leads in one hour'; end if;
  ph := right(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), 10);
  nm := left(trim(coalesce(p->>'name', '')), 120);
  if nm = '' and ph = '' and coalesce(p->>'email', '') = '' then raise exception 'No name, phone or email in the lead'; end if;
  at := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI');
  select id into dup_id from records where org_id = v_org and collection = 'leads' and (
      (coalesce(p->>'extId', '') <> '' and data->>'extId' = p->>'extId')
      or (ph <> '' and right(regexp_replace(coalesce(data->>'phone', ''), '\D', '', 'g'), 10) = ph and updated_at > now() - interval '3 days'))
    order by updated_at desc limit 1;
  if dup_id is not null then
    update records set data = data || jsonb_build_object('log', coalesce(data->'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', at, 'type', 'lead', 'by', 'Lead link',
        'text', trim('Sent the form again. ' || left(coalesce(p->>'message', ''), 300))))), updated_at = now()
     where org_id = v_org and collection = 'leads' and id = dup_id;
    return jsonb_build_object('ok', true, 'id', dup_id, 'duplicate', true);
  end if;
  begin d := nullif(p->>'eventDate', '')::date; exception when others then d := null; end;
  begin g := nullif(regexp_replace(coalesce(p->>'guests', ''), '\D', '', 'g'), '')::int; exception when others then g := null; end;
  if g > 100000 then g := null; end if;
  src := left(coalesce(nullif(p->>'source', ''), 'Website'), 40);
  rid := public._rid('ld_');
  rec := jsonb_strip_nulls(jsonb_build_object('id', rid, 'name', nm, 'phone', left(coalesce(p->>'phone', ''), 20), 'email', left(coalesce(p->>'email', ''), 160),
    'eventDate', d::text, 'guests', g, 'eventType', left(coalesce(p->>'eventType', ''), 60), 'budget', left(coalesce(p->>'budget', ''), 60), 'city', left(coalesce(p->>'city', ''), 80),
    'message', left(coalesce(p->>'message', ''), 1000), 'source', src, 'campaign', left(coalesce(p->>'campaign', ''), 120), 'form', left(coalesce(p->>'form', ''), 120),
    'extId', nullif(left(coalesce(p->>'extId', ''), 80), ''),
    'extra', case when jsonb_typeof(p->'extra') = 'object' and length((p->'extra')::text) < 6000 then p->'extra' else null end,
    'status', 'New', 'via', 'link', 'created', (extract(epoch from now()) * 1000)::bigint, 'createdAt', at,
    'log', jsonb_build_array(jsonb_build_object('at', at, 'type', 'lead', 'by', 'Lead link', 'text', left(coalesce(p->>'message', ''), 300))),
    'updatedBy', 'Lead link', 'updatedById', 'lead', 'updatedAt', (extract(epoch from now()) * 1000)::bigint));
  insert into records(org_id, collection, id, data, updated_by) values (v_org, 'leads', rid, rec, null);
  perform sm_private._org_notify(v_org, 'Lead link', 'New lead: ' || coalesce(nullif(nm, ''), nullif(p->>'phone', ''), 'enquiry'),
    concat_ws(' · ', src, nullif(p->>'eventType', ''), to_char(d, 'DD Mon YYYY'), case when g is not null then g || ' guests' end), 'lead', false, 'sales', 'ld:' || rid);
  return jsonb_build_object('ok', true, 'id', rid);
end $$;

grant execute on function public.lead_key(uuid, boolean) to authenticated;
grant execute on function public.lead_intake(text, jsonb) to anon, authenticated;
revoke all on schema sm_private from public, anon, authenticated;
