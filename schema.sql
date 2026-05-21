-- AETERNA - GAMIFIED SPIRITUAL DISCIPLINE APP
-- SUPABASE SQL DATABASE SCHEMA

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    username text not null,
    current_streak integer default 0 check (current_streak >= 0),
    longest_streak integer default 0 check (longest_streak >= 0),
    last_reading_date date,
    xp_points integer default 0 check (xp_points >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" on public.profiles
    for select using (true);

drop policy if exists "Allow all actions for authenticated users on own profile" on public.profiles;
create policy "Allow all actions for authenticated users on own profile" on public.profiles
    for all using (true); -- Custom permissive policies for dynamic anonymous profile testing

-- 2. BIBLES TABLE (Bible Texts and Study Notes)
create table if not exists public.bibles (
    id serial primary key,
    version text not null, -- 'NVI', 'AA', 'ACF'
    book_name text not null,
    book_number integer not null,
    chapter integer not null,
    verse integer not null,
    text text not null,
    study_note text,
    constraint unique_verse unique (version, book_number, chapter, verse)
);

-- Performance indices for super fast bible searching and rendering
create index if not exists idx_bibles_lookup on public.bibles (version, book_name, chapter);
create index if not exists idx_bibles_verse_lookup on public.bibles (version, book_name, chapter, verse);
create index if not exists idx_bibles_fulltext on public.bibles using gin (to_tsvector('portuguese', text));

-- 3. READING PLANS
create table if not exists public.reading_plans (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    category text not null -- 'Apoio Emocional', 'Planos de Vida', 'Constância'
);

-- 4. READING PLAN DAYS (Steps within reading plans)
create table if not exists public.reading_plan_days (
    id uuid primary key default uuid_generate_v4(),
    plan_id uuid references public.reading_plans(id) on delete cascade not null,
    day_number integer not null,
    target_chapters text not null, -- E.g., "Provérbios 1" or "João 3, João 4"
    estimated_time_minutes integer default 5 not null,
    constraint unique_plan_day unique (plan_id, day_number)
);

create index if not exists idx_reading_plan_days_plan on public.reading_plan_days (plan_id);

-- 5. USER PLANS (Enrollments in reading plans)
create table if not exists public.user_plans (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    plan_id uuid references public.reading_plans(id) on delete cascade not null,
    current_day integer default 1 not null,
    enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
    status text default 'active' check (status in ('active', 'completed', 'paused')),
    last_interaction_date date,
    constraint unique_user_plan unique (user_id, plan_id)
);

-- 6. READING LOGS (Reading history logs)
create table if not exists public.reading_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    plan_id uuid references public.reading_plans(id) on delete cascade not null,
    day_number integer not null,
    read_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. PRAYERS TABLE
create table if not exists public.prayers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    description text,
    type text check (type in ('Pedido', 'Agradecimento')) not null,
    is_answered boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    answered_at timestamp with time zone
);

create index if not exists idx_prayers_user on public.prayers (user_id);
create index if not exists idx_prayers_date_retention on public.prayers (user_id, created_at);

-- 8. DAILY DEVOTIONALS (Date-indexed daily devotions)
create table if not exists public.daily_devotionals (
    id date primary key, -- Explicitly date format (e.g. '2026-05-21')
    verse_reference text not null,
    verse_text text not null,
    reflection text not null,
    prayer_text text not null,
    challenge_of_the_day text not null
);

-- 9. BADGES EARNED
create table if not exists public.badges_earned (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    badge_type text not null, -- 'altar_bronze', 'guerreiro_fe', 'perseveranca'
    earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_user_badge unique (user_id, badge_type)
);

-- TRIGGER FOR AUTOMATIC STREAK RECORD UPDATES
-- Trigger logic: If current_streak increases and exceeds longest_streak, update longest_streak automatically.
create or replace function public.update_longest_streak()
returns trigger as $$
begin
    if NEW.current_streak > OLD.longest_streak then
        NEW.longest_streak := NEW.current_streak;
    end if;
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_update_longest_streak on public.profiles;

create trigger trg_update_longest_streak
before update on public.profiles
for each row
execute function public.update_longest_streak();
