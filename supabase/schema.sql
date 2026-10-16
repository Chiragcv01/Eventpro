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
