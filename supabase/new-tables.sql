-- اجرا در Supabase > SQL Editor (یک‌بار)
-- فرض: تابع public.is_admin() از قبل وجود دارد.

create table if not exists public.workers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

-- هر مدل فقط به یک نفر اختصاص داده می‌شود (unique روی model_id)
create table if not exists public.worker_models (
    id uuid primary key default gen_random_uuid(),
    worker_id uuid not null references public.workers(id) on delete cascade,
    model_id uuid not null unique references public.shoe_models(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.bags (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.bag_images (
    id uuid primary key default gen_random_uuid(),
    bag_id uuid not null references public.bags(id) on delete cascade,
    storage_path text not null,
    created_at timestamptz not null default now()
);

alter table public.workers enable row level security;
alter table public.worker_models enable row level security;
alter table public.bags enable row level security;
alter table public.bag_images enable row level security;

drop policy if exists "admin all workers" on public.workers;
create policy "admin all workers" on public.workers
    for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all worker_models" on public.worker_models;
create policy "admin all worker_models" on public.worker_models
    for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all bags" on public.bags;
create policy "admin all bags" on public.bags
    for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all bag_images" on public.bag_images;
create policy "admin all bag_images" on public.bag_images
    for all using (public.is_admin()) with check (public.is_admin());
