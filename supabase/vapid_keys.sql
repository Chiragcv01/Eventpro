-- Notification keys reader (applied 17 Oct 2026, migration sabmanage_vapid_keys_rpc)
-- The keys themselves are Vault secrets 'vapid_public_key' and 'vapid_private_key' (never stored in files).
create or replace function public.vapid_keys()
returns jsonb language sql stable security definer set search_path = public, vault as $$
  select jsonb_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key' limit 1),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key' limit 1));
$$;
revoke all on function public.vapid_keys() from public, anon, authenticated;
grant execute on function public.vapid_keys() to service_role;
