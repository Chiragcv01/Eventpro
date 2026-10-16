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
