-- Transport / logistics (26 Oct 2026): collections vehicles, drivers, trips, fleetx -> module 'fleet'.
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
when 'trips' then 'fleet'       when 'fleetx' then 'fleet'
else 'settings' end
$function$;

-- fleet permission for the existing roles of event businesses (drivers = staff role, edit so they can update trips)
update public.org_roles r set perms = r.perms || jsonb_build_object('fleet',
  case r.role when 'manager' then 3 when 'accountant' then 2 when 'supervisor' then 2 when 'staff' then 2 else 0 end)
from public.orgs o where o.id = r.org_id and o.kind = 'event' and r.role <> 'owner' and not (r.perms ? 'fleet');
