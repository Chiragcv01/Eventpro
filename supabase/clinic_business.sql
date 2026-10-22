-- Clinics get Staff & salary, Expenses, Income & expenses and Marketing (23 Oct 2026, migration clinic_business_modules)
update public.org_roles r set perms = r.perms || '{"staff":2,"expenses":2,"reports":1,"marketing":2}'::jsonb
  where r.role = 'manager' and not (r.perms ? 'marketing') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'clinic');
update public.org_roles r set perms = r.perms || '{"staff":0,"expenses":2,"reports":0,"marketing":2}'::jsonb
  where r.role = 'supervisor' and not (r.perms ? 'marketing') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'clinic');
update public.org_roles r set perms = r.perms || '{"staff":0,"expenses":0,"reports":0,"marketing":0}'::jsonb
  where r.role = 'staff' and not (r.perms ? 'marketing') and exists (select 1 from public.orgs o where o.id = r.org_id and o.kind = 'clinic');
