-- Transport freight bills (26 Oct 2026): collection fbills -> module 'fleet'. Re-creates coll_module with every mapping.
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
else 'settings' end
$function$;
