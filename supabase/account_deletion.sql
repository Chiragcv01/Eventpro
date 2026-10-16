-- =====================================================================
-- EventPro OS — account deletion (Google Play requirement)
-- Requests (app + website) are already live. The ERASE function below
-- must be run once in Supabase → SQL Editor (it removes data, so it
-- needs the owner's approval).
-- =====================================================================

-- Super Admin erases a login after a deletion request. Businesses where this
-- person is the only owner are erased with all their data (records cascade).
create or replace function public.admin_delete_account(p_user uuid, p_request uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_orgs int; v_email text;
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  if p_user = auth.uid() then raise exception 'You cannot delete your own login here.'; end if;
  select email into v_email from auth.users where id = p_user;
  if v_email is null then raise exception 'Login not found'; end if;
  with gone as (
    delete from orgs o
     where exists (select 1 from org_members m where m.org_id = o.id and m.user_id = p_user and m.role = 'owner')
       and not exists (select 1 from org_members m2 where m2.org_id = o.id and m2.role = 'owner' and m2.user_id <> p_user)
    returning 1)
  select count(*) into v_orgs from gone;
  delete from auth.users where id = p_user;
  update account_deletions set status = 'done', done_at = now(), user_id = null
   where (id = p_request or user_id = p_user) and status = 'pending';
  return jsonb_build_object('businesses', v_orgs, 'login', v_email);
end $$;
revoke all on function public.admin_delete_account(uuid, uuid) from public, anon;
grant execute on function public.admin_delete_account(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Already applied (kept here for a fresh setup):
-- table public.account_deletions, request_account_deletion(text),
-- request_account_deletion_web(jsonb). See migration
-- "eventpro_account_deletion_requests".
-- ---------------------------------------------------------------------
