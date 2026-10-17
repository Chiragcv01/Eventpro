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
