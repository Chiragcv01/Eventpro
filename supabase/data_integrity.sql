-- Data integrity (29 Oct 2026)
-- 1. records.created_at: when a record was first made (kept on every update by a trigger).
-- 2. Unique document numbers per business: invoice / quotation / freight bill no., bilty (LR) no., trip invoice no.
--    Demo records are left out (they can be loaded next to real data); cancelled trips free their LR no.
-- 3. push_subs.user_id -> auth.users (a deleted user's phone subscriptions go with them).
-- 4. New collection 'parties' (transport customer master) -> module 'fleet'.

alter table public.records add column if not exists created_at timestamptz;
update public.records set created_at = case when jsonb_typeof(data->'created') = 'number' then to_timestamp((data->>'created')::numeric / 1000) else coalesce(updated_at, now()) end where created_at is null;
alter table public.records alter column created_at set default now();
alter table public.records alter column created_at set not null;

create or replace function public.records_keep_created() returns trigger language plpgsql set search_path = public as $$
begin new.created_at := old.created_at; return new; end $$;
create trigger records_keep_created before update on public.records for each row execute function public.records_keep_created();

create unique index if not exists records_uniq_doc_no on public.records (org_id, collection, upper(btrim(data->>'no')))
  where collection in ('invoices', 'fbills') and coalesce(btrim(data->>'no'), '') <> '' and coalesce(data->>'demo', '') <> 'true';
create unique index if not exists records_uniq_lr on public.records (org_id, upper(btrim(data->>'lr')))
  where collection = 'trips' and coalesce(btrim(data->>'lr'), '') <> '' and coalesce(data->>'demo', '') <> 'true' and coalesce(data->>'status', '') <> 'cancelled';
create unique index if not exists records_uniq_trip_inv on public.records (org_id, upper(btrim(data->>'invNo')))
  where collection = 'trips' and coalesce(btrim(data->>'invNo'), '') <> '' and coalesce(data->>'demo', '') <> 'true';

alter table public.push_subs add constraint push_subs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists push_subs_user on public.push_subs (user_id);

create or replace function public.coll_module(c text)
 returns text language sql immutable set search_path to 'public'
as $function$
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
when 'vehicles' then 'fleet'    when 'drivers' then 'fleet'
when 'trips' then 'fleet'       when 'fleetx' then 'fleet'      when 'fbills' then 'fleet'
when 'parties' then 'fleet'
else 'settings' end
$function$;
