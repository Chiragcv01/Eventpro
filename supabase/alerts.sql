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
