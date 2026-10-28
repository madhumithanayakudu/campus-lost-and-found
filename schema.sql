-- Campus Lost & Found: run this in Supabase Dashboard > SQL Editor
create extension if not exists "pgcrypto";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('lost','found')),
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null check (category in ('Electronics','Books & Notes','ID & Cards','Keys','Clothing','Bags','Accessories','Other')),
  location text not null check (char_length(location) between 2 and 120),
  event_date date not null default current_date,
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_info text not null check (char_length(contact_info) between 5 and 120),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists items_type_idx on public.items(type);
create index if not exists items_status_idx on public.items(status);
create index if not exists items_created_idx on public.items(created_at desc);

alter table public.items enable row level security;

-- The backend uses the service_role key (bypasses RLS). Public read is allowed for convenience.
drop policy if exists "Public can read items" on public.items;
create policy "Public can read items" on public.items for select using (true);

-- Optional sample data
insert into public.items (type,title,description,category,location,event_date,contact_name,contact_info) values
('lost','Black Dell laptop bag','Contains a charger and a blue notebook.','Bags','Central Library, 2nd floor',current_date-2,'Ravi','ravi@campus.edu'),
('found','Student ID card','Found near the canteen entrance.','ID & Cards','Main Canteen',current_date-1,'Ananya','ananya@campus.edu');
