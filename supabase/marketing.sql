-- Marketing features (17 Oct 2026)
-- 1) client page gets the business's Google review link
-- 2) Super Admin sees which business referred a new business (settings.referredBy = first 8 chars of the referrer's org id)
create or replace function public.guest_view(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g guest_links; ev jsonb; st jsonb;
begin
  select * into g from guest_links where token = lower(trim(p_token)) and expires_at > now();
  if not found then return null; end if;
  if exists (select 1 from orgs where id = g.org_id and status = 'suspended') then return null; end if;
  select data into ev from records where org_id = g.org_id and collection = 'events' and id = g.event_id;
  if ev is null then return null; end if;
  select data into st from records where org_id = g.org_id and collection = 'settings' and id = 'main';
  return jsonb_build_object(
    'settings', jsonb_build_object('bizName', st->'bizName', 'phone', st->'phone', 'upi', st->'upi', 'bank', st->'bank',
                                   'account', st->'account', 'ifsc', st->'ifsc', 'city', st->'city', 'address', st->'address',
                                   'email', st->'email', 'website', st->'website', 'tagline', st->'tagline',
                                   'logo', st->'logo', 'brandColor', st->'brandColor', 'gstin', st->'gstin',
                                   'googleReview', st->'googleReview', 'instagram', st->'instagram'),
    'event',    ev - 'notes' - 'budget' - 'items' - 'dispatch' - 'menu',
    'invoices', coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'invoices' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('id', data->'id', 'invoiceId', data->'invoiceId', 'amount', data->'amount', 'date', data->'date', 'mode', data->'mode'))
                          from records where org_id = g.org_id and collection = 'payments' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'tasks',    coalesce((select jsonb_agg(jsonb_build_object('title', data->'title', 'progress', data->'progress'))
                          from records where org_id = g.org_id and collection = 'tasks' and data->>'eventId' = g.event_id), '[]'::jsonb),
    'reviews',  coalesce((select jsonb_agg(data) from records where org_id = g.org_id and collection = 'reviews' and data->>'eventId' = g.event_id), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'Super Admin only'; end if;
  return coalesce((select jsonb_agg(t.x order by t.created desc) from (
    select o.created_at as created, jsonb_build_object(
      'orgId', o.id, 'name', o.name, 'created', o.created_at, 'status', o.status, 'plan', o.plan, 'price', o.price,
      'expires', to_char(o.expires_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'notes', o.notes,
      'ownerName',  (select display_name from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerEmail', (select email from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerId',    (select user_id from org_members where org_id = o.id and role = 'owner' limit 1),
      'ownerPhone', s.data->>'phone', 'city', s.data->>'city', 'logo', s.data->>'logo',
      'referredBy', s.data->>'referredBy',
      'members',  (select count(*) from org_members where org_id = o.id),
      'bookings', (select count(*) from records where org_id = o.id and collection = 'events'),
      'invoices', (select count(*) from records where org_id = o.id and collection = 'invoices'),
      'lastActivity', coalesce((select max(updated_at) from records where org_id = o.id), o.created_at)) as x
    from orgs o left join records s on s.org_id = o.id and s.collection = 'settings' and s.id = 'main') t), '[]'::jsonb);
end $$;
