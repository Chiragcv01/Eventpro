-- =====================================================================
-- EventPro OS — public website: blog posts, contact enquiries, images
-- (run after schema.sql and auth_admin.sql)
-- Website text (about, contact, address…) lives in platform_settings.data.site
-- =====================================================================

-- ---------- Blog posts ----------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(title) between 1 and 200),
  excerpt text not null default '' check (length(excerpt) <= 600),
  content text not null default '' check (length(content) <= 400000),
  cover_url text not null default '' check (length(cover_url) <= 1000),
  tags text[] not null default '{}',
  lang text not null default 'en' check (lang in ('en', 'hi')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  seo_title text not null default '' check (length(seo_title) <= 200),
  seo_description text not null default '' check (length(seo_description) <= 400),
  author text not null default '' check (length(author) <= 120),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts (status, published_at desc);
alter table public.blog_posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_read') then
    create policy bp_read on public.blog_posts for select
      using ((status = 'published' and published_at <= now()) or public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_insert') then
    create policy bp_insert on public.blog_posts for insert with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_update') then
    create policy bp_update on public.blog_posts for update using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'bp_delete') then
    create policy bp_delete on public.blog_posts for delete using (public.is_super_admin());
  end if;
end $$;

create or replace function public.blog_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'blog_posts_touch') then
    create trigger blog_posts_touch before insert or update on public.blog_posts for each row execute function public.blog_touch();
  end if;
end $$;
revoke all on function public.blog_touch() from public, anon, authenticated;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

-- ---------- Contact / demo enquiries from the website ----------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  phone text not null default '' check (length(phone) <= 20),
  email text not null default '' check (length(email) <= 160),
  business text not null default '' check (length(business) <= 160),
  city text not null default '' check (length(city) <= 80),
  biz_type text not null default '' check (length(biz_type) <= 60),
  message text not null default '' check (length(message) <= 2000),
  source text not null default 'website' check (length(source) <= 60),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_read') then
    create policy cm_admin_read on public.contact_messages for select using (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_update') then
    create policy cm_admin_update on public.contact_messages for update using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_messages' and policyname = 'cm_admin_delete') then
    create policy cm_admin_delete on public.contact_messages for delete using (public.is_super_admin());
  end if;
end $$;
grant select, update, delete on public.contact_messages to authenticated;

-- Visitors send enquiries only through this function (validated + throttled).
create or replace function public.submit_enquiry(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9+]', '', 'g');
        v_name text := left(trim(coalesce(p->>'name', '')), 120);
begin
  if v_name = '' then raise exception 'Please enter your name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then raise exception 'Please enter a valid mobile number'; end if;
  if (select count(*) from contact_messages where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'We already have your request. Our team will call you soon.';
  end if;
  if (select count(*) from contact_messages where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Too many requests right now. Please try again in a few minutes or WhatsApp us.';
  end if;
  insert into contact_messages(name, phone, email, business, city, biz_type, message, source)
  values (v_name, v_phone, left(trim(coalesce(p->>'email', '')), 160), left(trim(coalesce(p->>'business', '')), 160),
          left(trim(coalesce(p->>'city', '')), 80), left(trim(coalesce(p->>'bizType', '')), 60),
          left(trim(coalesce(p->>'message', '')), 2000), left(coalesce(nullif(p->>'source', ''), 'website'), 60))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_enquiry(jsonb) from public;
grant execute on function public.submit_enquiry(jsonb) to anon, authenticated;

-- ---------- Public image storage for blog covers and pictures ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_insert') then
    create policy blog_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_update') then
    create policy blog_admin_update on storage.objects for update to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_select') then
    create policy blog_admin_select on storage.objects for select to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'blog_admin_delete') then
    create policy blog_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'blog' and public.is_super_admin());
  end if;
end $$;
