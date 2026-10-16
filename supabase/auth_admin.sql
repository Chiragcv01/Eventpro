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
