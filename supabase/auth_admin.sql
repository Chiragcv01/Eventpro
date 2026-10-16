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

-- Super Admin: delete a login (not an owner of a business, not yourself).
create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  if p_user = auth.uid() then raise exception 'You cannot delete your own login.'; end if;
  if exists (select 1 from org_members where user_id = p_user and role = 'owner') then
    raise exception 'This person owns a business. Suspend the business instead.';
  end if;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public._new_auth_user(text, text, text, text) from public, anon, authenticated;
revoke all on function public.public_signup(text, text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.create_member(uuid, text, text, text, text, jsonb, text) from public, anon;
revoke all on function public.set_user_password(uuid, text, uuid) from public, anon;
revoke all on function public.admin_create_business(text, text, text, text, text, jsonb, jsonb, text, text, timestamptz) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.public_signup(text, text, text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.create_member(uuid, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.set_user_password(uuid, text, uuid) to authenticated;
grant execute on function public.admin_create_business(text, text, text, text, text, jsonb, jsonb, text, text, timestamptz) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
