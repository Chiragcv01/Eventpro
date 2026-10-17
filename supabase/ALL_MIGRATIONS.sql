-- =====================================================================
-- SabManage: full database setup in one file (built 17 Oct 2026)
-- Joined from the per-change copies in this folder, in the order they were applied.
-- Use it to rebuild the database on a NEW Supabase project (SQL editor, run once).
-- It has not been test-run on an empty project; read errors carefully and fix in order.
--
-- BEFORE running, create these Vault secrets (Supabase > Project Settings > Vault), never in files:
--   vapid_public_key   and  vapid_private_key  : a new web-push key pair (npx web-push generate-vapid-keys)
--   (cron_token is created by simple.sql automatically)
-- AFTER running: deploy edge functions supabase/functions/send-alert and daily-summary (verify_jwt on),
--   put the new VAPID public key in src/alerts.js, and the new project URL/anon key in src/head.html,
--   api/site.js and in clinic.sql (_clinic_notify) / simple.sql (cron job) where the project URL appears.
-- NOT included on purpose: account_deletion.sql (Super Admin "delete account"), which deletes data and
--   was not yet approved by the owner.
-- =====================================================================


-- >>>>>>>>>> schema.sql

-- =====================================================================
-- EventPro OS v3.2 — Supabase database schema
-- Run this in Supabase → SQL Editor → New query → Run.
-- Creates tables, role-based security (RLS), Super Admin, plans/expiry,
-- per-person permissions and the RPC functions the app needs.
-- Safe to re-run (also upgrades a v3.0 database in place).
-- Then run auth_admin.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.orgs add column if not exists status     text not null default 'trial';   -- trial | active | suspended
alter table public.orgs add column if not exists plan       text not null default 'Trial';
alter table public.orgs add column if not exists expires_at timestamptz default now() + interval '14 days';
alter table public.orgs add column if not exists notes      text;                              -- private, Super Admin only

create table if not exists public.org_members (
  org_id       uuid not null references public.orgs(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'staff',
  display_name text,
  email        text,
  staff_id     text,
  created_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);
alter table public.org_members add column if not exists perms jsonb;   -- per-person overrides { "invoices": 2, ... }
create index if not exists org_members_user on public.org_members(user_id);

create table if not exists public.org_roles (
  org_id uuid not null references public.orgs(id) on delete cascade,
  role   text not null,
  label  text not null,
  perms  jsonb not null default '{}'::jsonb,   -- 0=none 1=view 2=edit 3=full
  primary key (org_id, role)
);

create table if not exists public.records (
  org_id     uuid not null references public.orgs(id) on delete cascade,
  collection text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (org_id, collection, id)
);
create index if not exists records_org_coll on public.records(org_id, collection);

create table if not exists public.invites (
  code         text primary key,
  org_id       uuid not null references public.orgs(id) on delete cascade,
  role         text not null,
  display_name text,
  created_by   uuid default auth.uid(),
  expires_at   timestamptz not null default now() + interval '7 days',
  used_by      uuid,
  used_at      timestamptz
);
create index if not exists invites_org on public.invites(org_id);

create table if not exists public.guest_links (
  token      text primary key,
  org_id     uuid not null references public.orgs(id) on delete cascade,
  event_id   text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists guest_links_org on public.guest_links(org_id);

-- Platform level (you, the app owner)
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.platform_settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);
insert into public.platform_settings(id, data) values (1, jsonb_build_object(
  'appName', 'EventPro', 'allowSignup', true, 'supportName', 'EventPro Support', 'supportPhone', '', 'supportEmail', '', 'trialDays', 14,
  'plans', jsonb_build_array(jsonb_build_object('name','Basic','price',499), jsonb_build_object('name','Pro','price',999), jsonb_build_object('name','Enterprise','price',2499))))
on conflict (id) do nothing;

-- ---------- Permission helpers ----------
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function public.my_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from org_members where org_id = p_org and user_id = auth.uid()
$$;

-- Effective access level of a user for one section of one business.
-- Super Admin = 3. Suspended business = 0. Expired plan = view only (max 1).
create or replace function public.perm_for(p_user uuid, p_org uuid, p_module text) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_lvl int; v_status text; v_exp timestamptz;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from platform_admins where user_id = p_user) then return 3; end if;
  select o.status, o.expires_at into v_status, v_exp from orgs o where o.id = p_org;
  if v_status = 'suspended' then return 0; end if;
  select case when m.role = 'owner' then 3
              else coalesce((m.perms ->> p_module)::int, (r.perms ->> p_module)::int, 0) end
    into v_lvl
    from org_members m
    left join org_roles r on r.org_id = m.org_id and r.role = m.role
   where m.org_id = p_org and m.user_id = p_user;
  if v_lvl is null then return null; end if;
  if v_exp is not null and v_exp < now() then return least(v_lvl, 1); end if;
  return v_lvl;
end $$;

create or replace function public.perm(p_org uuid, p_module text) returns int
language sql stable security definer set search_path = public as $$
  select public.perm_for(auth.uid(), p_org, p_module)
$$;

create or replace function public.coll_module(c text) returns text
language sql immutable set search_path = public as $$
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
    else 'settings' end
$$;

-- Only Super Admin may change plan / status / expiry / notes of a business
create or replace function public.orgs_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role' then
    new.status := old.status; new.plan := old.plan; new.expires_at := old.expires_at; new.notes := old.notes;
  end if;
  return new;
end $$;
drop trigger if exists orgs_protect on public.orgs;
create trigger orgs_protect before update on public.orgs for each row execute function public.orgs_protect();

-- ---------- Row Level Security ----------
alter table public.orgs              enable row level security;
alter table public.org_members       enable row level security;
alter table public.org_roles         enable row level security;
alter table public.records           enable row level security;
alter table public.invites           enable row level security;
alter table public.guest_links       enable row level security;
alter table public.platform_admins   enable row level security;
alter table public.platform_settings enable row level security;

drop policy if exists orgs_select on public.orgs;
drop policy if exists orgs_update on public.orgs;
create policy orgs_select on public.orgs for select using (public.my_role(id) is not null or public.is_super_admin());
create policy orgs_update on public.orgs for update using (coalesce(public.perm(id, 'settings'), 0) >= 2);

drop policy if exists mem_select on public.org_members;
drop policy if exists mem_update on public.org_members;
drop policy if exists mem_delete on public.org_members;
create policy mem_select on public.org_members for select using (public.my_role(org_id) is not null or public.is_super_admin());
create policy mem_update on public.org_members for update
  using (coalesce(public.perm(org_id, 'team'), 0) >= 3 and role <> 'owner')
  with check (role <> 'owner');
create policy mem_delete on public.org_members for delete
  using (coalesce(public.perm(org_id, 'team'), 0) >= 3 and role <> 'owner');

drop policy if exists roles_select on public.org_roles;
drop policy if exists roles_write on public.org_roles;
create policy roles_select on public.org_roles for select using (public.my_role(org_id) is not null or public.is_super_admin());
create policy roles_write on public.org_roles for all
  using (coalesce(public.perm(org_id, 'team'), 0) >= 3 and role <> 'owner')
  with check (coalesce(public.perm(org_id, 'team'), 0) >= 3 and role <> 'owner');

drop policy if exists rec_select on public.records;
drop policy if exists rec_insert on public.records;
drop policy if exists rec_update on public.records;
drop policy if exists rec_delete on public.records;
create policy rec_select on public.records for select using (
  coalesce(public.perm(org_id, public.coll_module(collection)), 0) >= 1
  or (collection = 'settings' and public.my_role(org_id) is not null)
  or (collection in ('staff', 'events') and coalesce(public.perm(org_id, 'tasks'), 0) >= 1)
);
create policy rec_insert on public.records for insert with check (
  coalesce(public.perm(org_id, public.coll_module(collection)), 0) >= 2
  or (collection = 'activity' and public.my_role(org_id) is not null)
);
create policy rec_update on public.records for update
  using (coalesce(public.perm(org_id, public.coll_module(collection)), 0) >= 2)
  with check (coalesce(public.perm(org_id, public.coll_module(collection)), 0) >= 2);
create policy rec_delete on public.records for delete
  using (coalesce(public.perm(org_id, public.coll_module(collection)), 0) >= 3);

drop policy if exists inv_select on public.invites;
drop policy if exists inv_insert on public.invites;
drop policy if exists inv_delete on public.invites;
create policy inv_select on public.invites for select using (coalesce(public.perm(org_id, 'team'), 0) >= 1);
create policy inv_insert on public.invites for insert with check (coalesce(public.perm(org_id, 'team'), 0) >= 2 and role <> 'owner');
create policy inv_delete on public.invites for delete using (coalesce(public.perm(org_id, 'team'), 0) >= 2);

drop policy if exists gl_select on public.guest_links;
drop policy if exists gl_insert on public.guest_links;
create policy gl_select on public.guest_links for select using (coalesce(public.perm(org_id, 'bookings'), 0) >= 1);
create policy gl_insert on public.guest_links for insert with check (coalesce(public.perm(org_id, 'bookings'), 0) >= 2);

drop policy if exists pa_select on public.platform_admins;
create policy pa_select on public.platform_admins for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists ps_select on public.platform_settings;
drop policy if exists ps_update on public.platform_settings;
create policy ps_select on public.platform_settings for select using (true);
create policy ps_update on public.platform_settings for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- RPC: create a business (caller becomes Owner, free trial starts) ----------
create or replace function public.create_org(p_name text, p_display_name text, p_roles jsonb, p_settings jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; k text; v jsonb; v_days int;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Business name is required'; end if;
  if not is_super_admin() and exists (select 1 from platform_settings where id = 1 and (data->>'allowSignup')::boolean is false) then
    raise exception 'New business sign-ups are closed. Please contact support.';
  end if;
  select coalesce((data->>'trialDays')::int, 14) into v_days from platform_settings where id = 1;
  insert into orgs(name, created_by, status, plan, expires_at)
    values (left(p_name, 120), auth.uid(), 'trial', 'Trial', now() + make_interval(days => coalesce(v_days, 14)))
    returning id into v_org;
  insert into org_members(org_id, user_id, role, display_name, email)
    values (v_org, auth.uid(), 'owner', p_display_name, (select email from auth.users where id = auth.uid()));
  insert into org_roles(org_id, role, label, perms) values (v_org, 'owner', 'Owner', '{}'::jsonb);
  for k, v in select * from jsonb_each(coalesce(p_roles, '{}'::jsonb)) loop
    if k <> 'owner' then
      insert into org_roles(org_id, role, label, perms)
        values (v_org, k, coalesce(v ->> 'label', k), coalesce(v -> 'perms', '{}'::jsonb));
    end if;
  end loop;
  insert into records(org_id, collection, id, data) values (v_org, 'settings', 'main', coalesce(p_settings, '{}'::jsonb));
  return v_org;
end $$;

-- ---------- Server-only: create a business for a given owner (used by the eventpro-admin edge function) ----------
create or replace function public.admin_create_org(p_owner uuid, p_name text, p_display_name text, p_roles jsonb, p_settings jsonb,
                                                   p_status text default 'trial', p_plan text default 'Trial', p_expires timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; k text; v jsonb; v_days int;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Business name is required'; end if;
  select coalesce((data->>'trialDays')::int, 14) into v_days from platform_settings where id = 1;
  insert into orgs(name, created_by, status, plan, expires_at)
    values (left(p_name, 120), p_owner, coalesce(p_status, 'trial'), coalesce(p_plan, 'Trial'),
            coalesce(p_expires, now() + make_interval(days => coalesce(v_days, 14))))
    returning id into v_org;
  insert into org_members(org_id, user_id, role, display_name, email)
    values (v_org, p_owner, 'owner', p_display_name, (select email from auth.users where id = p_owner));
  insert into org_roles(org_id, role, label, perms) values (v_org, 'owner', 'Owner', '{}'::jsonb);
  for k, v in select * from jsonb_each(coalesce(p_roles, '{}'::jsonb)) loop
    if k <> 'owner' then
      insert into org_roles(org_id, role, label, perms)
        values (v_org, k, coalesce(v ->> 'label', k), coalesce(v -> 'perms', '{}'::jsonb));
    end if;
  end loop;
  insert into records(org_id, collection, id, data) values (v_org, 'settings', 'main', coalesce(p_settings, '{}'::jsonb));
  return v_org;
end $$;

-- ---------- RPC: join with invite code ----------
create or replace function public.accept_invite(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into inv from invites where code = upper(trim(p_code)) and used_by is null and expires_at > now() for update;
  if not found then raise exception 'Invite code not found, expired or already used.'; end if;
  if exists (select 1 from org_members where org_id = inv.org_id and user_id = auth.uid()) then
    raise exception 'You are already part of this business.';
  end if;
  insert into org_members(org_id, user_id, role, display_name, email)
    values (inv.org_id, auth.uid(), inv.role, coalesce(p_display_name, inv.display_name),
            (select email from auth.users where id = auth.uid()));
  update invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.org_id;
end $$;

-- ---------- RPC: client / guest portal (no login) ----------
create or replace function public.guest_view(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g guest_links; ev jsonb; st jsonb;
begin
  select * into g from guest_links where token = lower(trim(p_token)) and expires_at > now();
  if not found then return null; end if;
  if exists (select 1 from orgs where id = g.org_id and status = 'suspended') then return null; end if;
  select data into ev from records where org_id = g.org_id and collection = 'events' and id = g.event_id;
  if ev is null then return null; end if;
  select data into st from records where org_id = g.org_id and collection = 'settings' and id = 'main';
  return jsonb_build_object(
    'settings', jsonb_build_object('bizName', st->'bizName', 'phone', st->'phone', 'upi', st->'upi', 'bank', st->'bank',
                                   'account', st->'account', 'ifsc', st->'ifsc', 'city', st->'city', 'address', st->'address',
                                   'email', st->'email', 'website', st->'website', 'tagline', st->'tagline',
                                   'logo', st->'logo', 'brandColor', st->'brandColor', 'gstin', st->'gstin'),
    'event',    ev - 'notes' - 'budget' - 'items' - 'dispatch' - 'menu',
    'invoices', coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'invoices' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('id', data->'id', 'invoiceId', data->'invoiceId', 'amount', data->'amount', 'date', data->'date', 'mode', data->'mode'))
                          from records where org_id = g.org_id and collection = 'payments' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'tasks',    coalesce((select jsonb_agg(jsonb_build_object('title', data->'title', 'progress', data->'progress'))
                          from records where org_id = g.org_id and collection = 'tasks' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'reviews',  coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'reviews' and data->>'eventId' = g.event_id), '[]'::jsonb)
  );
end $$;

create or replace function public.guest_review(p_token text, p_review jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare g guest_links; rid text;
begin
  select * into g from guest_links where token = lower(trim(p_token)) and expires_at > now();
  if not found then raise exception 'This link is invalid or has expired.'; end if;
  if exists (select 1 from records where org_id = g.org_id and collection = 'reviews'
             and data->>'eventId' = g.event_id and data->>'source' = 'guest') then
    raise exception 'A review was already submitted for this event. Thank you!';
  end if;
  rid := 'rv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  insert into records(org_id, collection, id, data, updated_by) values (g.org_id, 'reviews', rid, jsonb_build_object(
    'id', rid, 'eventId', g.event_id, 'source', 'guest',
    'date', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'),
    'stars', least(5, greatest(1, coalesce((p_review->>'stars')::int, 5))),
    'client', left(coalesce(p_review->>'client', ''), 80),
    'comment', left(coalesce(p_review->>'comment', ''), 1000)), null);
end $$;

-- ---------- RPC: Super Admin console ----------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(t.x order by t.created desc) from (
    select o.created_at as created, jsonb_build_object(
      'orgId', o.id, 'name', o.name, 'created', o.created_at, 'status', o.status, 'plan', o.plan,
      'expires', to_char(o.expires_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'notes', o.notes,
      'ownerName',  (select display_name from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerEmail', (select email from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerId',    (select user_id from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerPhone', s.data->>'phone', 'city', s.data->>'city', 'logo', s.data->>'logo',
      'members',  (select count(*) from org_members where org_id = o.id),
      'bookings', (select count(*) from records where org_id = o.id and collection = 'events'),
      'invoices', (select count(*) from records where org_id = o.id and collection = 'invoices'),
      'lastActivity', coalesce((select max(updated_at) from records where org_id = o.id), o.created_at)) as x
    from orgs o left join records s on s.org_id = o.id and s.collection = 'settings' and s.id = 'main') t), '[]'::jsonb);
end $$;

create or replace function public.admin_users()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'userId', u.id, 'email', u.email, 'created', u.created_at, 'lastLogin', u.last_sign_in_at,
      'name', coalesce(u.raw_user_meta_data->>'name', (select display_name from org_members where user_id = u.id limit 1), u.email),
      'super', exists (select 1 from platform_admins p where p.user_id = u.id),
      'orgs', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'role', m.role, 'orgId', o.id))
                        from org_members m join orgs o on o.id = m.org_id where m.user_id = u.id), '[]'::jsonb))
      order by u.created_at desc) from auth.users u), '[]'::jsonb);
end $$;

create or replace function public.admin_set_super(p_email text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'No account with this email or mobile. Ask them to sign up first.'; end if;
  if p_on then insert into platform_admins(user_id) values (v_uid) on conflict do nothing;
  else
    if v_uid = auth.uid() then raise exception 'You cannot remove your own Super Admin access.'; end if;
    delete from platform_admins where user_id = v_uid;
  end if;
end $$;

-- ---------- Grants ----------
revoke all on function public.guest_view(text) from public;
revoke all on function public.guest_review(text, jsonb) from public;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_set_super(text, boolean) from public, anon;
revoke all on function public.create_org(text, text, jsonb, jsonb) from public, anon;
revoke all on function public.accept_invite(text, text) from public, anon;
revoke all on function public.admin_create_org(uuid, text, text, jsonb, jsonb, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.perm_for(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_create_org(uuid, text, text, jsonb, jsonb, text, text, timestamptz) to service_role;
grant execute on function public.perm_for(uuid, uuid, text) to service_role;
grant execute on function public.guest_view(text) to anon, authenticated;
grant execute on function public.guest_review(text, jsonb) to anon, authenticated;
grant execute on function public.create_org(text, text, jsonb, jsonb) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_set_super(text, boolean) to authenticated;
grant select on public.platform_settings to anon, authenticated;
grant update on public.platform_settings to authenticated;

-- Next: run auth_admin.sql (login management functions).


-- >>>>>>>>>> auth_admin.sql

-- =====================================================================
-- EventPro OS — login management (run after schema.sql)
-- Owners create employee logins, Super Admin creates businesses and
-- resets passwords. Logins are created already-confirmed, so no email
-- verification is needed and mobile numbers work as login IDs.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Internal: create a confirmed email/password login. Not callable by clients.
create or replace function public._new_auth_user(p_email text, p_password text, p_name text, p_phone text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email or 10-digit mobile number'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Password must be at least 6 characters'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'This login ID is already in use. Use another email or mobile number.';
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          phone_change, phone_change_token, email_change_token_current, reauthentication_token,
                          is_sso_user, is_anonymous)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('name', coalesce(p_name, ''), 'phone', coalesce(p_phone, '')),
          now(), now(), '', '', '', '', '', '', '', '', false, false);
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email', now(), now(), now());
  return v_id;
end $$;

-- Public: a business owner signs up (free trial). Respects the "allow sign-up" switch.
create or replace function public.public_signup(p_email text, p_password text, p_name text, p_phone text,
                                                p_biz text, p_roles jsonb, p_settings jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if exists (select 1 from platform_settings where id = 1 and (data->>'allowSignup')::boolean is false) then
    raise exception 'New business sign-ups are closed. Please contact support.';
  end if;
  if coalesce(trim(p_biz), '') = '' then raise exception 'Business name is required'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Your name is required'; end if;
  v_uid := _new_auth_user(p_email, p_password, p_name, p_phone);
  return admin_create_org(v_uid, p_biz, p_name, p_roles, p_settings);
end $$;

-- Owner (or anyone with Team access = Edit/Full) creates an employee login inside their business.
create or replace function public.create_member(p_org uuid, p_name text, p_email text, p_password text,
                                                p_role text, p_perms jsonb, p_staff text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if coalesce(perm_for(auth.uid(), p_org, 'team'), 0) < 2 then raise exception 'You do not have permission to add employees.'; end if;
  if p_role = 'owner' or not exists (select 1 from org_roles where org_id = p_org and role = p_role) then
    raise exception 'Choose a valid role';
  end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  v_uid := _new_auth_user(p_email, p_password, p_name, '');
  insert into org_members(org_id, user_id, role, display_name, email, perms, staff_id)
    values (p_org, v_uid, p_role, p_name, lower(trim(p_email)), p_perms, nullif(p_staff, ''));
  return v_uid;
end $$;

-- Set a new password for someone else.
-- Super Admin: anyone. Owner / Team-Full: only their own employees (not owners, not people who also work elsewhere).
create or replace function public.set_user_password(p_user uuid, p_password text, p_org uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Password must be at least 6 characters'; end if;
  if not is_super_admin() then
    if p_org is null or coalesce(perm_for(auth.uid(), p_org, 'team'), 0) < 2 then
      raise exception 'Only the business owner or Super Admin can reset passwords.';
    end if;
    if p_user = auth.uid() then raise exception 'Use "Change password" in your account menu for your own password.'; end if;
    if not exists (select 1 from org_members where org_id = p_org and user_id = p_user and role <> 'owner') then
      raise exception 'You can only reset passwords of your own employees. Owners must contact Super Admin.';
    end if;
    if exists (select 1 from org_members where user_id = p_user and org_id <> p_org) then
      raise exception 'This person also works with another business. Ask Super Admin to reset it.';
    end if;
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'Login not found'; end if;
end $$;

-- Super Admin: create a business together with its owner login.
create or replace function public.admin_create_business(p_email text, p_password text, p_name text, p_phone text,
                                                        p_biz text, p_roles jsonb, p_settings jsonb,
                                                        p_plan text, p_status text, p_expires timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  v_uid := _new_auth_user(p_email, p_password, p_name, p_phone);
  return admin_create_org(v_uid, p_biz, p_name, p_roles, p_settings, coalesce(p_status, 'trial'), coalesce(p_plan, 'Trial'), p_expires);
end $$;

-- Super Admin: block / unblock a login (nothing is deleted; data stays).
create or replace function public.admin_block_user(p_user uuid, p_block boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  if p_user = auth.uid() then raise exception 'You cannot block your own login.'; end if;
  update auth.users set banned_until = case when p_block then 'infinity'::timestamptz else null end, updated_at = now()
   where id = p_user;
  if not found then raise exception 'Login not found'; end if;
end $$;

-- Super Admin access is switched on/off with an "active" flag (never deleted).
alter table public.platform_admins add column if not exists active boolean not null default true;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid() and active)
$$;

create or replace function public.perm_for(p_user uuid, p_org uuid, p_module text) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_lvl int; v_status text; v_exp timestamptz;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from platform_admins where user_id = p_user and active) then return 3; end if;
  select o.status, o.expires_at into v_status, v_exp from orgs o where o.id = p_org;
  if v_status = 'suspended' then return 0; end if;
  select case when m.role = 'owner' then 3
              else coalesce((m.perms ->> p_module)::int, (r.perms ->> p_module)::int, 0) end
    into v_lvl
    from org_members m
    left join org_roles r on r.org_id = m.org_id and r.role = m.role
   where m.org_id = p_org and m.user_id = p_user;
  if v_lvl is null then return null; end if;
  if v_exp is not null and v_exp < now() then return least(v_lvl, 1); end if;
  return v_lvl;
end $$;

create or replace function public.admin_set_super(p_email text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'No account with this login ID.'; end if;
  if not p_on and v_uid = auth.uid() then raise exception 'You cannot remove your own Super Admin access.'; end if;
  insert into platform_admins(user_id, active) values (v_uid, p_on)
    on conflict (user_id) do update set active = excluded.active;
end $$;

create or replace function public.admin_users()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'userId', u.id, 'email', u.email, 'created', u.created_at, 'lastLogin', u.last_sign_in_at,
      'blocked', (u.banned_until is not null and u.banned_until > now()),
      'name', coalesce(nullif(u.raw_user_meta_data->>'name', ''), (select display_name from org_members where user_id = u.id limit 1), u.email),
      'super', exists (select 1 from platform_admins p where p.user_id = u.id and p.active),
      'orgs', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'role', m.role, 'orgId', o.id))
                        from org_members m join orgs o on o.id = m.org_id where m.user_id = u.id), '[]'::jsonb))
      order by u.created_at desc) from auth.users u), '[]'::jsonb);
end $$;

revoke all on function public._new_auth_user(text, text, text, text) from public, anon, authenticated;
revoke all on function public.public_signup(text, text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.create_member(uuid, text, text, text, text, jsonb, text) from public, anon;
revoke all on function public.set_user_password(uuid, text, uuid) from public, anon;
revoke all on function public.admin_create_business(text, text, text, text, text, jsonb, jsonb, text, text, timestamptz) from public, anon;
revoke all on function public.admin_block_user(uuid, boolean) from public, anon;
revoke all on function public.orgs_protect() from public, anon, authenticated;
grant execute on function public.public_signup(text, text, text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.create_member(uuid, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.set_user_password(uuid, text, uuid) to authenticated;
grant execute on function public.admin_create_business(text, text, text, text, text, jsonb, jsonb, text, text, timestamptz) to authenticated;
grant execute on function public.admin_block_user(uuid, boolean) to authenticated;

-- =====================================================================
-- Make someone Super Admin (run in the SQL editor, with their login email):
-- insert into public.platform_admins(user_id, active)
-- select id, true from auth.users where email = 'you@yourmail.com'
-- on conflict (user_id) do update set active = true;
-- =====================================================================

-- =====================================================================
-- Authenticator (2-step login, TOTP)
-- A user who has a verified authenticator gets NO data until their session
-- passed the 6-digit code (JWT aal = aal2). Enforced in every policy via perm()/my_role().
-- =====================================================================
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (select 1 from platform_admins where user_id = auth.uid() and active)
$$;

create or replace function public.my_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from org_members where org_id = p_org and user_id = auth.uid() and public.mfa_ok()
$$;

create or replace function public.perm(p_org uuid, p_module text) returns int
language sql stable security definer set search_path = public as $$
  select case when public.mfa_ok() then public.perm_for(auth.uid(), p_org, p_module) end
$$;

create or replace function public._can_manage_login(p_user uuid, p_org uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if is_super_admin() then return; end if;
  if p_org is null or coalesce(perm(p_org, 'team'), 0) < 2 then
    raise exception 'Only the business owner or Super Admin can do this.';
  end if;
  if p_user = auth.uid() then raise exception 'Use your account menu to change your own login.'; end if;
  if not exists (select 1 from org_members where org_id = p_org and user_id = p_user and role <> 'owner') then
    raise exception 'You can only manage logins of your own employees. Owners must contact Super Admin.';
  end if;
  if exists (select 1 from org_members where user_id = p_user and org_id <> p_org) then
    raise exception 'This person also works with another business. Ask Super Admin.';
  end if;
end $$;

create or replace function public.set_user_password(p_user uuid, p_password text, p_org uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_password, '')) < 6 then raise exception 'Password must be at least 6 characters'; end if;
  perform _can_manage_login(p_user, p_org);
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'Login not found'; end if;
end $$;

-- Switch off someone's authenticator when they lost their phone.
create or replace function public.reset_user_mfa(p_user uuid, p_org uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform _can_manage_login(p_user, p_org);
  update auth.mfa_factors set status = 'unverified', updated_at = now()
   where user_id = p_user and status = 'verified';
  get diagnostics n = row_count;
  return n;
end $$;

-- create_member now uses perm() so it also requires a verified session.
create or replace function public.create_member(p_org uuid, p_name text, p_email text, p_password text,
                                                p_role text, p_perms jsonb, p_staff text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if coalesce(perm(p_org, 'team'), 0) < 2 then raise exception 'You do not have permission to add employees.'; end if;
  if p_role = 'owner' or not exists (select 1 from org_roles where org_id = p_org and role = p_role) then
    raise exception 'Choose a valid role';
  end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  v_uid := _new_auth_user(p_email, p_password, p_name, '');
  insert into org_members(org_id, user_id, role, display_name, email, perms, staff_id)
    values (p_org, v_uid, p_role, p_name, lower(trim(p_email)), p_perms, nullif(p_staff, ''));
  return v_uid;
end $$;

revoke all on function public._can_manage_login(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reset_user_mfa(uuid, uuid) from public, anon;
grant execute on function public.reset_user_mfa(uuid, uuid) to authenticated;
grant execute on function public.mfa_ok() to anon, authenticated;


-- >>>>>>>>>> website.sql

-- =====================================================================
-- EventPro OS — public website: blog posts, contact enquiries, images
-- (run after schema.sql and auth_admin.sql)
-- Website text (about, contact, address…) lives in platform_settings.data.site
-- =====================================================================

-- ---------- Blog posts ----------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(title) between 1 and 200),
  excerpt text not null default '' check (length(excerpt) <= 600),
  content text not null default '' check (length(content) <= 400000),
  cover_url text not null default '' check (length(cover_url) <= 1000),
  tags text[] not null default '{}',
  lang text not null default 'en' check (lang in ('en', 'hi')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  seo_title text not null default '' check (length(seo_title) <= 200),
  seo_description text not null default '' check (length(seo_description) <= 400),
  author text not null default '' check (length(author) <= 120),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts (status, published_at desc);
alter table public.blog_posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_read') then
    create policy bp_read on public.blog_posts for select
      using ((status = 'published' and published_at <= now()) or public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_insert') then
    create policy bp_insert on public.blog_posts for insert with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_update') then
    create policy bp_update on public.blog_posts for update using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_delete') then
    create policy bp_delete on public.blog_posts for delete using (public.is_super_admin());
  end if;
end $$;

create or replace function public.blog_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'blog_posts_touch') then
    create trigger blog_posts_touch before insert or update on public.blog_posts for each row execute function public.blog_touch();
  end if;
end $$;
revoke all on function public.blog_touch() from public, anon, authenticated;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

-- ---------- Contact / demo enquiries from the website ----------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  phone text not null default '' check (length(phone) <= 20),
  email text not null default '' check (length(email) <= 160),
  business text not null default '' check (length(business) <= 160),
  city text not null default '' check (length(city) <= 80),
  biz_type text not null default '' check (length(biz_type) <= 60),
  message text not null default '' check (length(message) <= 2000),
  source text not null default 'website' check (length(source) <= 60),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_read') then
    create policy cm_admin_read on public.contact_messages for select using (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_update') then
    create policy cm_admin_update on public.contact_messages for update using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_delete') then
    create policy cm_admin_delete on public.contact_messages for delete using (public.is_super_admin());
  end if;
end $$;
grant select, update, delete on public.contact_messages to authenticated;

-- Visitors send enquiries only through this function (validated + throttled).
create or replace function public.submit_enquiry(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9+]', '', 'g');
        v_name text := left(trim(coalesce(p->>'name', '')), 120);
begin
  if v_name = '' then raise exception 'Please enter your name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then raise exception 'Please enter a valid mobile number'; end if;
  if (select count(*) from contact_messages where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'We already have your request. Our team will call you soon.';
  end if;
  if (select count(*) from contact_messages where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Too many requests right now. Please try again in a few minutes or WhatsApp us.';
  end if;
  insert into contact_messages(name, phone, email, business, city, biz_type, message, source)
  values (v_name, v_phone, left(trim(coalesce(p->>'email', '')), 160), left(trim(coalesce(p->>'business', '')), 160),
          left(trim(coalesce(p->>'city', '')), 80), left(trim(coalesce(p->>'bizType', '')), 60),
          left(trim(coalesce(p->>'message', '')), 2000), left(coalesce(nullif(p->>'source', ''), 'website'), 60))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_enquiry(jsonb) from public;
grant execute on function public.submit_enquiry(jsonb) to anon, authenticated;

-- ---------- Public image storage for blog covers and pictures ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_insert') then
    create policy blog_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_update') then
    create policy blog_admin_update on storage.objects for update to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_select') then
    create policy blog_admin_select on storage.objects for select to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_delete') then
    create policy blog_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
end $$;


-- >>>>>>>>>> account_deletion_requests.sql

-- Account deletion requests (applied 16 Oct 2026, migration eventpro_account_deletion_requests)
create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  login_id text not null default '' check (length(login_id) <= 160),
  name text not null default '' check (length(name) <= 120),
  business text not null default '' check (length(business) <= 160),
  phone text not null default '' check (length(phone) <= 20),
  reason text not null default '' check (length(reason) <= 1000),
  source text not null default 'app' check (source in ('app', 'web')),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  note text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists account_deletions_created_idx on public.account_deletions (created_at desc);
alter table public.account_deletions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_deletions' and policyname = 'ad_admin_read') then
    create policy ad_admin_read on public.account_deletions for select using (public.is_super_admin() or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_deletions' and policyname = 'ad_admin_update') then
    create policy ad_admin_update on public.account_deletions for update using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
end $$;
grant select, update on public.account_deletions to authenticated;

create or replace function public.request_account_deletion(p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text; v_name text; v_biz text;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select id into v_id from account_deletions where user_id = auth.uid() and status = 'pending' limit 1;
  if v_id is not null then return v_id; end if;
  select email, coalesce(raw_user_meta_data->>'name', '') into v_email, v_name from auth.users where id = auth.uid();
  select string_agg(o.name, ', ') into v_biz from org_members m join orgs o on o.id = m.org_id where m.user_id = auth.uid();
  insert into account_deletions(user_id, login_id, name, business, reason, source)
  values (auth.uid(), coalesce(v_email, ''), left(v_name, 120), left(coalesce(v_biz, ''), 160), left(coalesce(p_reason, ''), 1000), 'app')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.request_account_deletion_web(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_login text := lower(trim(coalesce(p->>'login', ''))); v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9+]', '', 'g');
begin
  if v_login = '' then raise exception 'Enter the login ID (mobile number or email) of the account'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then raise exception 'Enter a mobile number we can call to confirm'; end if;
  if (select count(*) from account_deletions where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many requests right now. Please try again in a few minutes.';
  end if;
  insert into account_deletions(login_id, name, business, phone, reason, source)
  values (left(v_login, 160), left(trim(coalesce(p->>'name', '')), 120), left(trim(coalesce(p->>'business', '')), 160), left(v_phone, 20), left(trim(coalesce(p->>'reason', '')), 1000), 'web')
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.request_account_deletion(text) from public, anon;
revoke all on function public.request_account_deletion_web(jsonb) from public;
grant execute on function public.request_account_deletion(text) to authenticated;
grant execute on function public.request_account_deletion_web(jsonb) to anon, authenticated;


-- >>>>>>>>>> subscriptions.sql

-- =====================================================================
-- SabManage — subscriptions (applied as migration
-- "eventpro_subscription_block_and_custom_price")
-- * orgs.price: optional special monthly price per business (Super Admin only)
-- * A business whose validity date + grace days has passed gets NO access
--   (perm_for returns 0). Grace days come from platform_settings.data.graceDays.
-- =====================================================================
alter table public.orgs add column if not exists price numeric check (price is null or price >= 0);

create or replace function public.orgs_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role' then
    new.status := old.status; new.plan := old.plan; new.expires_at := old.expires_at; new.notes := old.notes; new.price := old.price;
  end if;
  return new;
end $$;
revoke all on function public.orgs_protect() from public, anon, authenticated;

create or replace function public.perm_for(p_user uuid, p_org uuid, p_module text) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_lvl int; v_status text; v_exp timestamptz; v_grace int;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from platform_admins where user_id = p_user and active) then return 3; end if;
  select o.status, o.expires_at into v_status, v_exp from orgs o where o.id = p_org;
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
  return v_lvl;
end $$;
-- admin_overview() also returns 'price' (see migration).


-- >>>>>>>>>> marketing.sql

-- Marketing features (17 Oct 2026)
-- 1) client page gets the business's Google review link
-- 2) Super Admin sees which business referred a new business (settings.referredBy = first 8 chars of the referrer's org id)
create or replace function public.guest_view(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g guest_links; ev jsonb; st jsonb;
begin
  select * into g from guest_links where token = lower(trim(p_token)) and expires_at > now();
  if not found then return null; end if;
  if exists (select 1 from orgs where id = g.org_id and status = 'suspended') then return null; end if;
  select data into ev from records where org_id = g.org_id and collection = 'events' and id = g.event_id;
  if ev is null then return null; end if;
  select data into st from records where org_id = g.org_id and collection = 'settings' and id = 'main';
  return jsonb_build_object(
    'settings', jsonb_build_object('bizName', st->'bizName', 'phone', st->'phone', 'upi', st->'upi', 'bank', st->'bank',
                                   'account', st->'account', 'ifsc', st->'ifsc', 'city', st->'city', 'address', st->'address',
                                   'email', st->'email', 'website', st->'website', 'tagline', st->'tagline',
                                   'logo', st->'logo', 'brandColor', st->'brandColor', 'gstin', st->'gstin',
                                   'googleReview', st->'googleReview', 'instagram', st->'instagram'),
    'event',    ev - 'notes' - 'budget' - 'items' - 'dispatch' - 'menu',
    'invoices', coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'invoices' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('id', data->'id', 'invoiceId', data->'invoiceId', 'amount', data->'amount', 'date', data->'date', 'mode', data->'mode'))
                          from records where org_id = g.org_id and collection = 'payments' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'tasks',    coalesce((select jsonb_agg(jsonb_build_object('title', data->'title', 'progress', data->'progress'))
                          from records where org_id = g.org_id and collection = 'tasks' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'reviews',  coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'reviews' and data->>'eventId' = g.event_id), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(t.x order by t.created desc) from (
    select o.created_at as created, jsonb_build_object(
      'orgId', o.id, 'name', o.name, 'created', o.created_at, 'status', o.status, 'plan', o.plan, 'price', o.price,
      'expires', to_char(o.expires_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'notes', o.notes,
      'ownerName',  (select display_name from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerEmail', (select email from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerId',    (select user_id from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerPhone', s.data->>'phone', 'city', s.data->>'city', 'logo', s.data->>'logo',
      'referredBy', s.data->>'referredBy',
      'members',  (select count(*) from org_members where org_id = o.id),
      'bookings', (select count(*) from records where org_id = o.id and collection = 'events'),
      'invoices', (select count(*) from records where org_id = o.id and collection = 'invoices'),
      'lastActivity', coalesce((select max(updated_at) from records where org_id = o.id), o.created_at)) as x
    from orgs o left join records s on s.org_id = o.id and s.collection = 'settings' and s.id = 'main') t), '[]'::jsonb);
end $$;


-- >>>>>>>>>> alerts.sql

-- Alerts from owner/manager to employees (and back), with web push (17 Oct 2026)
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  from_user uuid not null default auth.uid(),
  from_name text,
  to_user uuid,                                   -- null = everyone in the business
  to_name text,
  title text not null check (char_length(title) between 1 and 140),
  body text check (body is null or char_length(body) <= 600),
  urgent boolean not null default false,
  event_id text,
  acks jsonb not null default '{}'::jsonb,        -- { user_id: {at, name} }
  created_at timestamptz not null default now()
);
create index if not exists alerts_org_time on public.alerts(org_id, created_at desc);
alter table public.alerts enable row level security;

drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts for select using (
  public.my_role(org_id) is not null
  and (to_user is null or to_user = auth.uid() or from_user = auth.uid() or coalesce(public.perm(org_id, 'tasks'), 0) >= 3));

drop policy if exists alerts_insert on public.alerts;
create policy alerts_insert on public.alerts for insert with check (
  from_user = auth.uid()
  and coalesce(public.perm(org_id, 'tasks'), 0) >= 2
  and (to_user is null or exists (select 1 from public.org_members m where m.org_id = alerts.org_id and m.user_id = alerts.to_user)));

-- acknowledge ("seen") without giving update rights on the table
create or replace function public.ack_alert(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.alerts; nm text;
begin
  select * into a from public.alerts where id = p_id;
  if not found then raise exception 'Alert not found'; end if;
  if public.my_role(a.org_id) is null or not (a.to_user is null or a.to_user = auth.uid()) then raise exception 'Not allowed'; end if;
  select display_name into nm from public.org_members where org_id = a.org_id and user_id = auth.uid();
  update public.alerts set acks = acks || jsonb_build_object(auth.uid()::text, jsonb_build_object('at', now(), 'name', nm))
   where id = p_id and not (acks ? auth.uid()::text);
  return (select acks from public.alerts where id = p_id);
end $$;

-- browser / app push subscriptions (one row per device)
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_own_select on public.push_subs;
create policy push_own_select on public.push_subs for select using (user_id = auth.uid());

create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Log in first'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Bad subscription'; end if;
  insert into public.push_subs(endpoint, user_id, p256dh, auth, ua) values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_ua, 200))
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua, created_at = now();
end $$;

revoke all on public.alerts, public.push_subs from anon;
revoke all on function public.ack_alert(uuid) from public, anon;
revoke all on function public.save_push_sub(text, text, text, text) from public, anon;
grant execute on function public.ack_alert(uuid) to authenticated;
grant execute on function public.save_push_sub(text, text, text, text) to authenticated;

-- live delivery to open apps
alter publication supabase_realtime add table public.alerts;


-- >>>>>>>>>> vapid_keys.sql

-- Notification keys reader (applied 17 Oct 2026, migration sabmanage_vapid_keys_rpc)
-- The keys themselves are Vault secrets 'vapid_public_key' and 'vapid_private_key' (never stored in files).
create or replace function public.vapid_keys()
returns jsonb language sql stable security definer set search_path = public, vault as $$
  select jsonb_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key' limit 1),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key' limit 1));
$$;
revoke all on function public.vapid_keys() from public, anon, authenticated;
grant execute on function public.vapid_keys() to service_role;


-- >>>>>>>>>> simple.sql

-- Easy mode, live updates, crew self attendance, quiet updates, morning summary (17 Oct 2026)
-- Applied as migrations: sabmanage_simple_mode_live_sync, sabmanage_morning_summary_counts, sabmanage_morning_summary_cron

alter publication supabase_realtime add table public.records;

alter table public.alerts add column if not exists kind text not null default 'alert';
alter table public.alerts add column if not exists to_role text;
alter table public.alerts add constraint alerts_kind_chk check (kind in ('alert','update'));
alter table public.alerts add constraint alerts_to_role_chk check (to_role is null or to_role = 'managers');

alter policy alerts_select on public.alerts using (
  public.my_role(org_id) is not null
  and (from_user = auth.uid() or to_user = auth.uid() or coalesce(public.perm(org_id, 'tasks'), 0) >= 3
       or (to_user is null and to_role is null)
       or (to_user is null and to_role = 'managers' and public.my_role(org_id) in ('owner', 'manager', 'supervisor'))));

create or replace function public.ack_alert(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.alerts; nm text; r text;
begin
  select * into a from public.alerts where id = p_id;
  if not found then raise exception 'Alert not found'; end if;
  r := public.my_role(a.org_id);
  if r is null or not (a.to_user = auth.uid() or (a.to_user is null and (a.to_role is null or r in ('owner','manager','supervisor')))) then raise exception 'Not allowed'; end if;
  select display_name into nm from public.org_members where org_id = a.org_id and user_id = auth.uid();
  update public.alerts set acks = acks || jsonb_build_object(auth.uid()::text, jsonb_build_object('at', now(), 'name', nm))
   where id = p_id and not (acks ? auth.uid()::text);
  return (select acks from public.alerts where id = p_id);
end $$;

create or replace function public.mark_my_attendance(p_org uuid, p_event text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare sid text; d text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'); rid text; cur jsonb; rec jsonb;
begin
  if coalesce(public.perm(p_org, 'tasks'), 0) < 1 then raise exception 'Not allowed'; end if;
  select staff_id into sid from public.org_members where org_id = p_org and user_id = auth.uid();
  if sid is null or sid = '' then raise exception 'Your login is not linked to a crew name. Ask the owner to link it in Team.'; end if;
  rid := d || '_' || sid;
  select data into cur from public.records where org_id = p_org and collection = 'attendance' and id = rid;
  rec := coalesce(cur, '{}'::jsonb) || jsonb_build_object('id', rid, 'staffId', sid, 'date', d, 'status', 'P',
           'eventId', coalesce(nullif(p_event, ''), cur->>'eventId', ''), 'selfAt', to_char(now() at time zone 'Asia/Kolkata', 'HH24:MI'),
           'updatedAt', (extract(epoch from now()) * 1000)::bigint);
  insert into public.records(org_id, collection, id, data, updated_at) values (p_org, 'attendance', rid, rec, now())
  on conflict (org_id, collection, id) do update set data = excluded.data, updated_at = now();
  return rec;
end $$;
revoke all on function public.mark_my_attendance(uuid, text) from public, anon;
grant execute on function public.mark_my_attendance(uuid, text) to authenticated;

alter table public.push_subs add column if not exists lang text not null default 'en';
create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_ua text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Log in first'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Bad subscription'; end if;
  insert into public.push_subs(endpoint, user_id, p256dh, auth, ua, lang) values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_ua, 200), case when p_lang = 'hi' then 'hi' else 'en' end)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua, lang = excluded.lang, created_at = now();
end $$;
revoke all on function public.save_push_sub(text, text, text, text, text) from public, anon;
grant execute on function public.save_push_sub(text, text, text, text, text) to authenticated;

-- morning summary: counts per owner/manager that has a push device (service_role only)
create or replace function public.morning_counts()
returns table(user_id uuid, org_name text, today int, tomorrow int, follow int, short_items int)
language sql stable security definer set search_path = public as $$
  with d as (select (now() at time zone 'Asia/Kolkata')::date as t),
  ev as (
    select r.org_id, r.data from public.records r join public.orgs o on o.id = r.org_id
    where r.collection = 'events' and o.status <> 'suspended'
      and (o.expires_at is null or o.expires_at > now() - interval '7 days')
      and coalesce(r.data->>'stage','') not in ('Cancelled','Closed')),
  c as (
    select ev.org_id,
      count(*) filter (where nullif(data->>'date','') is not null and (data->>'date')::date <= (select t from d)
                         and coalesce(nullif(data->>'endDate',''), data->>'date')::date >= (select t from d)) as today,
      count(*) filter (where nullif(data->>'date','') is not null and (data->>'date')::date = (select t from d) + 1) as tomorrow,
      count(*) filter (where data->>'stage' in ('Enquiry','Quoted')
                         and (nullif(data->>'date','') is null or (data->>'date')::date >= (select t from d))
                         and coalesce(nullif(data->>'followUpAt','')::date,
                                      (to_timestamp(nullif(data->>'created','')::bigint / 1000) at time zone 'Asia/Kolkata')::date,
                                      (select t from d) - 3) <= (select t from d) - 2) as follow
    from ev group by ev.org_id)
  select m.user_id, o.name, coalesce(c.today,0)::int, coalesce(c.tomorrow,0)::int, coalesce(c.follow,0)::int, 0
  from public.org_members m join public.orgs o on o.id = m.org_id
  join c on c.org_id = m.org_id
  where m.role in ('owner','manager')
    and exists (select 1 from public.push_subs p where p.user_id = m.user_id)
    and coalesce(c.today,0) + coalesce(c.tomorrow,0) + coalesce(c.follow,0) > 0;
$$;
revoke all on function public.morning_counts() from public, anon, authenticated;
grant execute on function public.morning_counts() to service_role;
select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'cron_token', 'SabManage: token the morning-summary cron job sends to the edge function');
create or replace function public.cron_token_ok(p text) returns boolean language sql stable security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'cron_token' and decrypted_secret = p);
$$;
revoke all on function public.cron_token_ok(text) from public, anon, authenticated;
grant execute on function public.cron_token_ok(text) to service_role;

create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('sabmanage-morning-summary', '15 2 * * *', $job$
  select net.http_post(
    url := 'https://uregwtavhkjowiltukiq.supabase.co/functions/v1/daily-summary',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer <anon key>',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_token' limit 1)),
    body := '{}'::jsonb);
$job$);


-- >>>>>>>>>> clinic.sql

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
