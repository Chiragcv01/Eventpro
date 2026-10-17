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
