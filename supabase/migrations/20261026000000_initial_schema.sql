create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9][0-9 ().-]{5,22}[0-9]$'),
  role text not null default 'agent' check (role in ('agent', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default extensions.gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('house_land', 'room', 'commercial', 'batch_sale')),
  listing_type text not null check (listing_type in ('sale', 'rent')),
  price numeric(15, 2) not null check (price > 0),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD', 'GBP', 'EUR')),
  short_description text not null check (char_length(short_description) between 20 and 240),
  description text not null check (char_length(description) between 40 and 6000),
  state text not null check (char_length(state) between 2 and 80),
  city text not null check (char_length(city) between 2 and 80),
  location text not null check (char_length(location) between 2 and 160),
  bedrooms integer check (bedrooms is null or bedrooms between 0 and 100),
  bathrooms integer check (bathrooms is null or bathrooms between 0 and 100),
  area_value numeric(12, 2) check (area_value is null or area_value > 0),
  area_unit text check (area_unit is null or area_unit in ('sqm', 'sqft', 'acres', 'hectares')),
  video_url text check (video_url is null or video_url ~ '^https://'),
  status text not null default 'inactive' check (status in ('published', 'inactive', 'sold', 'rented')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_images (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (property_id, sort_order)
);

create index properties_published_created_idx on public.properties(status, created_at desc);
create index properties_category_type_idx on public.properties(category, listing_type, status);
create index properties_location_idx on public.properties(state, city, location);
create index properties_price_idx on public.properties(price);
create index properties_agent_idx on public.properties(agent_id, created_at desc);
create index property_images_property_idx on public.property_images(property_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();

create or replace function public.create_agent_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted_name text;
  submitted_phone text;
begin
  submitted_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  submitted_phone := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  if submitted_name is null or char_length(submitted_name) < 2 or char_length(submitted_name) > 120 then
    raise exception 'A valid agent name is required.';
  end if;
  if submitted_phone is null or submitted_phone !~ '^\+?[0-9][0-9 ().-]{5,22}[0-9]$' then
    raise exception 'A valid agent phone number is required.';
  end if;
  insert into public.profiles (id, full_name, phone, role, account_status)
  values (
    new.id,
    submitted_name,
    submitted_phone,
    'agent',
    'active'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_agent_profile();

create or replace function public.is_active_agent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'agent' and account_status = 'active'
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and account_status = 'active'
  );
$$;

create or replace function public.has_publication_images(property_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 2 from public.property_images where property_id = property_uuid;
$$;

create or replace function public.require_publication_images()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and not public.has_publication_images(new.id) then
    raise exception 'A published property must have at least two photographs.';
  end if;
  return new;
end;
$$;

create trigger properties_require_publication_images
before insert or update of status on public.properties
for each row execute function public.require_publication_images();

create or replace function public.validate_property_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_agent uuid;
begin
  select agent_id into listing_agent
  from public.properties where id = new.property_id;

  if listing_agent is null
    or new.storage_path not like listing_agent::text || '/' || new.property_id::text || '/%'
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'property-media' and o.name = new.storage_path
    ) then
    raise exception 'Property photograph must exist in its owner-specific storage path.';
  end if;
  return new;
end;
$$;

create trigger property_images_validate_storage
before insert or update of property_id, storage_path on public.property_images
for each row execute function public.validate_property_image();

create or replace function public.prevent_removing_required_property_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.properties p
    where p.id = old.property_id and p.status = 'published'
  ) and (
    select count(*) from public.property_images i where i.property_id = old.property_id
  ) <= 2 then
    raise exception 'A published property must retain at least two photographs.';
  end if;
  return old;
end;
$$;

create trigger property_images_retain_published_minimum
before delete on public.property_images
for each row execute function public.prevent_removing_required_property_image();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.properties, public.property_images to anon, authenticated;
grant insert, update, delete on public.properties, public.property_images to authenticated;

create policy "Profiles visible to account owner and administrators"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_active_admin()));

create policy "Published property listings are public"
on public.properties for select to anon, authenticated
using (status = 'published');
create policy "Agents read their own properties"
on public.properties for select to authenticated
using (agent_id = (select auth.uid()));
create policy "Administrators read all properties"
on public.properties for select to authenticated
using ((select public.is_active_admin()));
create policy "Active agents create only their own properties"
on public.properties for insert to authenticated
with check (agent_id = (select auth.uid()) and (select public.is_active_agent()));
create policy "Active agents update only their own properties"
on public.properties for update to authenticated
using (agent_id = (select auth.uid()) and (select public.is_active_agent()))
with check (agent_id = (select auth.uid()) and (select public.is_active_agent()));
create policy "Administrators update all properties"
on public.properties for update to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));
create policy "Active agents delete only their own properties"
on public.properties for delete to authenticated
using (agent_id = (select auth.uid()) and (select public.is_active_agent()));
create policy "Administrators delete all properties"
on public.properties for delete to authenticated
using ((select public.is_active_admin()));

create policy "Images readable for published properties"
on public.property_images for select to anon, authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_id and p.status = 'published'
));
create policy "Agents read their own property images"
on public.property_images for select to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_id and p.agent_id = (select auth.uid())
));
create policy "Administrators read all property images"
on public.property_images for select to authenticated
using ((select public.is_active_admin()));
create policy "Agents add images to their own properties"
on public.property_images for insert to authenticated
with check (exists (
  select 1 from public.properties p
  where p.id = property_id and p.agent_id = (select auth.uid())
) and (select public.is_active_agent()));
create policy "Agents update images on their own properties"
on public.property_images for update to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_id and p.agent_id = (select auth.uid())
) and (select public.is_active_agent()))
with check (exists (
  select 1 from public.properties p
  where p.id = property_id and p.agent_id = (select auth.uid())
) and (select public.is_active_agent()));
create policy "Agents remove images from their own properties"
on public.property_images for delete to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_id and p.agent_id = (select auth.uid())
) and (select public.is_active_agent()));
create policy "Administrators manage property images"
on public.property_images for all to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));

create view public.public_agent_contacts
with (security_barrier = true)
as
select distinct pr.id as agent_id, pr.full_name, pr.phone
from public.profiles pr
join public.properties p on p.agent_id = pr.id
where p.status = 'published' and pr.account_status = 'active';

grant select on public.public_agent_contacts to anon, authenticated;

create or replace function public.set_agent_status(target_user_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Administrator access required.';
  end if;
  if new_status not in ('active', 'disabled') then
    raise exception 'Invalid account status.';
  end if;
  update public.profiles set account_status = new_status
  where id = target_user_id and role = 'agent';
  if not found then
    raise exception 'Agent account not found.';
  end if;
end;
$$;

revoke all on function public.set_agent_status(uuid, text) from public;
grant execute on function public.set_agent_status(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-media', 'property-media', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Read media only for published listings"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'property-media'
  and exists (
    select 1 from public.property_images i
    join public.properties p on p.id = i.property_id
    where i.storage_path = name and p.status = 'published'
  )
);
create policy "Administrators read all property media"
on storage.objects for select to authenticated
using (bucket_id = 'property-media' and (select public.is_active_admin()));
create policy "Active agents read their own property media"
on storage.objects for select to authenticated
using (
  bucket_id = 'property-media'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = split_part(name, '/', 2) and p.agent_id = (select auth.uid())
  )
  and (select public.is_active_agent())
);
create policy "Active agents upload to their own listings"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-media'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = split_part(name, '/', 2) and p.agent_id = (select auth.uid())
  )
  and (select public.is_active_agent())
);
create policy "Administrators upload property media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-media'
  and exists (
    select 1 from public.properties p
    where p.id::text = split_part(name, '/', 2)
      and p.agent_id::text = split_part(name, '/', 1)
  )
  and (select public.is_active_admin())
);
create policy "Active agents update their own media"
on storage.objects for update to authenticated
using (
  bucket_id = 'property-media'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = split_part(name, '/', 2) and p.agent_id = (select auth.uid())
  )
  and (select public.is_active_agent())
)
with check (
  bucket_id = 'property-media'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = split_part(name, '/', 2) and p.agent_id = (select auth.uid())
  )
  and (select public.is_active_agent())
);
create policy "Administrators update property media"
on storage.objects for update to authenticated
using (bucket_id = 'property-media' and (select public.is_active_admin()))
with check (bucket_id = 'property-media' and (select public.is_active_admin()));
create policy "Agents remove their own media and administrators remove all media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-media'
  and not exists (
    select 1 from public.property_images i where i.storage_path = name
  )
  and (
    (
      split_part(name, '/', 1) = (select auth.uid())::text
      and (select public.is_active_agent())
    )
    or (select public.is_active_admin())
  )
);
