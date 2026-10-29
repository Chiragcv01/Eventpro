-- Clinic case sheet (29 Oct 2026): the patient link also shows the bill, the medical-alert switch and consent
-- forms; patients sign consent forms on their link (signature image as a data URL, max ~400 KB).
create or replace function public.patient_view(p_token text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare l patient_links; st jsonb; pt jsonb;
begin
l := public._plink(p_token);
select data into st from records where org_id = l.org_id and collection = 'settings' and id = 'main';
select data into pt from records where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
if pt is null then raise exception 'Patient not found. Please ask your clinic for a new link.'; end if;
update records set data = data || jsonb_build_object('portalAt', (extract(epoch from now()) * 1000)::bigint)
where org_id = l.org_id and collection = 'patients' and id = l.patient_id;
return jsonb_build_object(
'clinic', jsonb_build_object('bizName', st->'bizName', 'doctor', st->'doctorName', 'spec', st->'specialisation', 'qual', st->'qualification',
'regNo', st->'regNo', 'council', st->'council', 'phone', st->'phone', 'logo', st->'logo', 'upi', st->'upi',
'address', st->'address', 'city', st->'city', 'timings', st->'timings', 'feeClinic', st->'feeClinic', 'feeVideo', st->'feeVideo',
'tests', case when jsonb_typeof(st->'tests') = 'array' then st->'tests' else '[]'::jsonb end,
'tellPatient', (st->'tellPatient') is distinct from 'false'::jsonb),
'patient', jsonb_build_object('id', pt->'id', 'name', pt->'name', 'age', pt->'age', 'sex', pt->'sex', 'track', pt->'track',
  'medAlert', pt->'medAlert', 'account', pt->'account'),
'rules', public._rules_eff(st, pt),
'consent', l.consent_at is not null,
'consents', coalesce((select jsonb_agg(x.d order by x.d->>'date' desc) from (select (data - 'signImg' - 'createdBy' - 'witness') as d from records
  where org_id = l.org_id and collection = 'visits' and data->>'kind' = 'consent' and data->>'patientId' = l.patient_id
  order by data->>'date' desc limit 30) x), '[]'::jsonb),
'alerts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'level', a.level, 'text', a.text, 'by', a.from_name,
'at', to_char(a.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI')) order by a.created_at desc)
from patient_alerts a where a.org_id = l.org_id and a.patient_id = l.patient_id and a.seen_at is null and a.cancelled_at is null
and a.created_at > now() - interval '7 days'), '[]'::jsonb),
'readings', coalesce((select jsonb_agg(x.data) from (select data from records where org_id = l.org_id and collection = 'readings'
and data->>'patientId' = l.patient_id order by data->>'at' desc limit 300) x), '[]'::jsonb),
'appts', coalesce((select jsonb_agg(x.data) from (select data - 'notes' as data from records where org_id = l.org_id and collection = 'appts'
and data->>'patientId' = l.patient_id and coalesce(data->>'status', '') <> 'cancelled' order by data->>'date' desc limit 30) x), '[]'::jsonb),
'msgs', coalesce((select jsonb_agg(x.data order by x.data->>'at') from (select data from records where org_id = l.org_id and collection = 'pmsgs'
and data->>'patientId' = l.patient_id order by data->>'at' desc limit 100) x), '[]'::jsonb));
end $function$;

create or replace function public.patient_sign_consent(p_token text, p_id text, p_name text, p_sign text) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare l patient_links; d jsonb; nm text := left(trim(coalesce(p_name, '')), 120);
begin
  l := public._plink(p_token);
  if l.consent_at is null then raise exception 'Please give your consent first'; end if;
  select data into d from records where org_id = l.org_id and collection = 'visits' and id = p_id
     and data->>'kind' = 'consent' and data->>'patientId' = l.patient_id for update;
  if d is null then raise exception 'This form was not found. Please ask your clinic.'; end if;
  if d->>'status' = 'signed' then raise exception 'This form is already signed.'; end if;
  if length(nm) < 2 then raise exception 'Please write your name'; end if;
  if coalesce(p_sign, '') !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$' or length(p_sign) > 400000 then raise exception 'Please sign again'; end if;
  update records set data = data || jsonb_build_object('status', 'signed', 'signedAt', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI'),
      'signName', nm, 'signBy', 'patient', 'signImg', p_sign, 'signVia', 'link'), updated_at = now()
   where org_id = l.org_id and collection = 'visits' and id = p_id;
  perform public._clinic_notify(l.org_id, 'Consent signed: ' || left(coalesce(d->>'title', ''), 80), nm);
end $function$;
revoke all on function public.patient_sign_consent(text, text, text, text) from public;
grant execute on function public.patient_sign_consent(text, text, text, text) to anon, authenticated;
