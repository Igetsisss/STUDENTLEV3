create extension if not exists pgcrypto;

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  player_name text not null,
  player_name_key text not null,
  grade integer not null,
  source text,
  registered_at_client timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.signup_events (
  id uuid primary key default gen_random_uuid(),
  player_key text not null,
  player_name text not null,
  player_name_key text not null,
  grade integer not null,
  registered_at_client timestamptz,
  source text,
  user_agent text,
  screen_width integer,
  screen_height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.player_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  player_name text not null,
  player_name_key text not null,
  grade integer not null,
  state jsonb not null default '{}'::jsonb,
  device text,
  app_version text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.game_submissions (
  id uuid primary key default gen_random_uuid(),
  player_key text not null,
  player_name text not null,
  player_name_key text not null,
  grade integer not null,
  game_date date not null,
  word text not null,
  won boolean not null,
  guess_count integer not null,
  game_type text not null,
  game_start_time timestamptz,
  game_end_time timestamptz,
  total_duration_sec integer not null default 0,
  time_to_first_guess_sec integer not null default 0,
  device text,
  screen_width integer,
  guesses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.keystroke_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  player_key text not null,
  player_name text not null,
  player_name_key text not null,
  grade integer not null,
  game_date date not null,
  game_type text not null,
  event_timestamp timestamptz not null,
  sequence_number integer not null,
  key_type text not null,
  key_value text not null,
  reason text,
  guess_number integer not null,
  input_before text not null,
  input_after text not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_game_submissions_game_date
  on public.game_submissions (game_date);

create index if not exists idx_game_submissions_grade_date
  on public.game_submissions (grade, game_date);

create index if not exists idx_game_submissions_player_key
  on public.game_submissions (player_key);

create index if not exists idx_keystroke_logs_player_daily
  on public.keystroke_logs (player_name_key, game_date, game_type, session_id, sequence_number);

create index if not exists idx_signup_events_player_key
  on public.signup_events (player_key);

alter table public.player_profiles enable row level security;
alter table public.signup_events enable row level security;
alter table public.player_state_snapshots enable row level security;
alter table public.game_submissions enable row level security;
alter table public.keystroke_logs enable row level security;

create policy "anon_select_game_submissions"
  on public.game_submissions
  for select
  to anon
  using (true);

create policy "anon_insert_game_submissions"
  on public.game_submissions
  for insert
  to anon
  with check (true);

create policy "anon_select_keystroke_logs"
  on public.keystroke_logs
  for select
  to anon
  using (true);

create policy "anon_insert_keystroke_logs"
  on public.keystroke_logs
  for insert
  to anon
  with check (true);

create policy "anon_insert_signup_events"
  on public.signup_events
  for insert
  to anon
  with check (true);

create policy "anon_select_player_state_snapshots"
  on public.player_state_snapshots
  for select
  to anon
  using (true);

create policy "anon_insert_player_state_snapshots"
  on public.player_state_snapshots
  for insert
  to anon
  with check (true);

create policy "anon_update_player_state_snapshots"
  on public.player_state_snapshots
  for update
  to anon
  using (true)
  with check (true);

create policy "anon_insert_player_profiles"
  on public.player_profiles
  for insert
  to anon
  with check (true);

create policy "anon_update_player_profiles"
  on public.player_profiles
  for update
  to anon
  using (true)
  with check (true);