-- Department heads + department privacy (20 Oct 2026, applied by migration dept_heads_scope)
-- * role 'head' (Department Head) in every event business
-- * collection 'checklists' → module 'tasks'
-- * public.dept_ok: for anyone except owner / manager / Super Admin, rows of tasks / checklists / depts that belong to a
--   department (data.deptId, or the dept record itself) are visible only to people in that department (members or head);
--   reading is also allowed when the row is shared with one of their departments (data.shareWith), writing never via share
-- * RESTRICTIVE policies on records (added on top of the existing ones, nothing dropped)
-- * public.dept_names: names of all departments of my business (to pick whom to share with)

insert into public.org_roles(org_id, role, label, perms)
  select o.id, 'head', 'Department Head', '{"leads":0,"venue":1,"dashboard":1,"bookings":1,"tasks":2,"inventory":1,"catering":0,"vendors":0,"staff":0,"tools":0,"invoices":0,"payments":0,"expenses":0,"reports":0,"reviews":0,"marketing":0,"team":0,"settings":0}'::jsonb
  from public.orgs o where o.kind = 'event' and not exists (select 1 from public.org_roles r where r.org_id = o.id and r.role = 'head');

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
when 'depts' then 'venue'       when 'checklists' then 'tasks'
else 'settings' end
$$;

create or replace function public.dept_ok(p_org uuid, p_coll text, p_id text, p_data jsonb, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_staff text; d text; u text := 'u:' || coalesce(auth.uid()::text, '-');
begin
  if p_coll not in ('tasks', 'checklists', 'depts') then return true; end if;
  if auth.uid() is null then return false; end if;
  if exists (select 1 from platform_admins where user_id = auth.uid() and active) then return true; end if;
  select role, staff_id into v_role, v_staff from org_members where org_id = p_org and user_id = auth.uid();
  if v_role is null then return false; end if;
  if v_role in ('owner', 'manager') then return true; end if;
  d := case when p_coll = 'depts' then p_id else nullif(p_data ->> 'deptId', '') end;
  if d is null then return true; end if;
  return exists (select 1 from records r
    where r.org_id = p_org and r.collection = 'depts'
      and (r.id = d or (not p_write and p_coll <> 'depts' and coalesce(p_data -> 'shareWith', '[]'::jsonb) ? r.id))
      and (r.data -> 'members' ? u or r.data ->> 'head' = u
           or (v_staff is not null and (r.data -> 'members' ? ('s:' || v_staff) or r.data ->> 'head' = 's:' || v_staff))));
end $$;
grant execute on function public.dept_ok(uuid, text, text, jsonb, boolean) to authenticated;

create policy rec_dept_select on public.records as restrictive for select to authenticated
  using (collection not in ('tasks', 'checklists', 'depts') or public.dept_ok(org_id, collection, id, data, false));
create policy rec_dept_insert on public.records as restrictive for insert to authenticated
  with check (collection not in ('tasks', 'checklists', 'depts') or public.dept_ok(org_id, collection, id, data, true));
create policy rec_dept_update on public.records as restrictive for update to authenticated
  using (collection not in ('tasks', 'checklists', 'depts') or public.dept_ok(org_id, collection, id, data, true))
  with check (collection not in ('tasks', 'checklists', 'depts') or public.dept_ok(org_id, collection, id, data, true));
create policy rec_dept_delete on public.records as restrictive for delete to authenticated
  using (collection not in ('tasks', 'checklists', 'depts') or public.dept_ok(org_id, collection, id, data, true));

create or replace function public.dept_names(p_org uuid) returns table(id text, name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.data ->> 'name' from records r
   where r.org_id = p_org and r.collection = 'depts' and public.my_role(p_org) is not null order by 2
$$;
grant execute on function public.dept_names(uuid) to authenticated;

-- join a business with an invite code without logging in first (applied by migration join_with_code)
create or replace function public.join_with_code(p_code text, p_email text, p_password text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites; v_uid uuid;
begin
  select * into inv from invites where code = upper(trim(coalesce(p_code, ''))) and used_by is null and expires_at > now() for update;
  if not found then raise exception 'Invite code not found, expired or already used.'; end if;
  if inv.role = 'owner' then raise exception 'Invite code not valid'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Your name is required'; end if;
  v_uid := _new_auth_user(p_email, p_password, trim(p_name), '');
  insert into org_members(org_id, user_id, role, display_name, email) values (inv.org_id, v_uid, inv.role, trim(p_name), lower(trim(p_email)));
  update invites set used_by = v_uid, used_at = now() where code = inv.code;
  return inv.org_id;
end $$;
revoke all on function public.join_with_code(text, text, text, text) from public;
grant execute on function public.join_with_code(text, text, text, text) to anon, authenticated;
