-- StudyHive backend schema for Supabase.
--
-- Run it in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is idempotent, so re-running it is safe.
--
-- NOTE: this was reconstructed from what the app actually queries (src/App.jsx),
-- because the original schema was not saved in the repo. If your ORIGINAL Supabase
-- project still exists (even if paused), restore that instead and skip this file.

-- =====================================================================
-- Tables
-- =====================================================================

-- Shared study resources (what the Browse / Home pages list).
create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject      text,
  grade        text,
  type         text,
  author       text,
  description  text,
  file_url     text,
  file_name    text,
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists resources_created_at_idx
  on public.resources (created_at desc);

-- A user's starred resources ("My Library").
create table if not exists public.user_bookmarks (
  user_id      uuid not null references auth.users (id) on delete cascade,
  resource_id  uuid not null references public.resources (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- One row per user; tracks the "upload 3 PDFs" welcome step.
create table if not exists public.user_profiles (
  user_id                    uuid primary key references auth.users (id) on delete cascade,
  initial_uploads_completed  boolean not null default false,
  created_at                 timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security  (the anon key is public, so RLS is the real protection)
-- =====================================================================

alter table public.resources      enable row level security;
alter table public.user_bookmarks enable row level security;
alter table public.user_profiles  enable row level security;

-- resources: anyone can browse; only signed-in users can add, and only as themselves.
drop policy if exists "resources: public read" on public.resources;
create policy "resources: public read"
  on public.resources for select
  to anon, authenticated
  using (true);

drop policy if exists "resources: insert own" on public.resources;
create policy "resources: insert own"
  on public.resources for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "resources: update own" on public.resources;
create policy "resources: update own"
  on public.resources for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "resources: delete own" on public.resources;
create policy "resources: delete own"
  on public.resources for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_bookmarks: private to each user.
drop policy if exists "bookmarks: manage own" on public.user_bookmarks;
create policy "bookmarks: manage own"
  on public.user_bookmarks for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_profiles: private to each user.
drop policy if exists "profiles: manage own" on public.user_profiles;
create policy "profiles: manage own"
  on public.user_profiles for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Explicit grants (newer Supabase projects may not expose new tables automatically).
grant select                         on public.resources      to anon, authenticated;
grant insert, update, delete         on public.resources      to authenticated;
grant select, insert, delete         on public.user_bookmarks to authenticated;
grant select, insert, update         on public.user_profiles  to authenticated;

-- =====================================================================
-- Storage: bucket "study-files" (name is hard-coded in src/App.jsx)
-- =====================================================================

-- Public bucket (the app uses getPublicUrl), 50 MB per file (matches the upload dialog).
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-files', 'study-files', true, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Anyone can read/list files.
drop policy if exists "study-files: public read" on storage.objects;
create policy "study-files: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'study-files');

-- Signed-in users can upload only into their own folder:
--   <user-id>/<uuid>.<ext>          (normal uploads)
--   setup/<user-id>/<uuid>.<ext>    (welcome-step uploads)
drop policy if exists "study-files: upload to own folder" on storage.objects;
create policy "study-files: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        (storage.foldername(name))[1] = 'setup'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
    )
  );

-- The app uploads with { upsert: true }, which also needs UPDATE on the same paths.
drop policy if exists "study-files: update own files" on storage.objects;
create policy "study-files: update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'study-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        (storage.foldername(name))[1] = 'setup'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
    )
  );

drop policy if exists "study-files: delete own files" on storage.objects;
create policy "study-files: delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        (storage.foldername(name))[1] = 'setup'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
    )
  );
