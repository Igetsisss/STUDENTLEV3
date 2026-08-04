-- ─── Studentle Database Schema ────────────────────────────────────────────────
--
-- Tables
--   player_profiles       — one row per player; identity source of truth
--   signup_events         — audit log of every registration attempt
--   player_state_snapshots — cross-device game-state sync (one row per player)
--   game_submissions      — completed game results (leaderboard / MVP source of truth)
--   keystroke_logs        — per-keystroke telemetry for in-progress restore
--
-- Grade values: 0 = Teacher, 9 = Freshman, 10 = Sophomore, 11 = Junior, 12 = Senior
-- player_key format: '<player_name_key>|<grade>'  e.g. 'jack s|9'
-- Historical-import rows use game_date = '1970-01-01' to stay out of daily views.
--
-- This file is the fresh-install baseline (safe to run top to bottom on an
-- empty database). migrations/*.sql are dated, one-time patches for bringing
-- an already-deployed database up to date with this file — run in order,
-- once each. This baseline is kept in sync with every applied migration, so
-- it's always the accurate "current schema," not just the original one.
-- ──────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─── player_profiles ──────────────────────────────────────────────────────────
create table if not exists public.player_profiles (
  id                   uuid        primary key default gen_random_uuid(),
  player_key           text        not null unique,
  player_name          text        not null,
  player_name_key      text        not null,
  grade                integer     not null check (grade in (0, 9, 10, 11, 12)),
  source               text,
  registered_at_client timestamptz,
  microsoft_email      text,
  updated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_player_profiles_player_name_key
  on public.player_profiles (player_name_key);

-- One account per school email; NULLs (not-yet-linked players) are ignored.
create unique index if not exists idx_player_profiles_microsoft_email
  on public.player_profiles (microsoft_email)
  where microsoft_email is not null;

-- Email -> (player_name, grade) lookup for auto-login. SECURITY DEFINER so
-- the app can resolve an email to an identity without a SELECT policy ever
-- exposing the microsoft_email column itself.
create or replace function public.lookup_player_by_email(p_email text)
  returns table(player_name text, grade integer)
  language sql
  security definer
  set search_path = public
as $$
  select player_name, grade
  from   public.player_profiles
  where  microsoft_email = lower(trim(p_email))
  limit  1;
$$;

grant execute on function public.lookup_player_by_email(text) to anon, authenticated;

-- ─── signup_events ────────────────────────────────────────────────────────────
-- Append-only audit log. Includes partial registrations (source = 'name_step').
create table if not exists public.signup_events (
  id                   uuid        primary key default gen_random_uuid(),
  player_key           text        not null,
  player_name          text        not null,
  player_name_key      text        not null,
  grade                integer     not null,
  registered_at_client timestamptz,
  source               text,
  user_agent           text,
  screen_width         integer,
  screen_height        integer,
  created_at           timestamptz not null default now()
);

create index if not exists idx_signup_events_player_key
  on public.signup_events (player_key);

-- ─── player_state_snapshots ───────────────────────────────────────────────────
-- One row per player. 'state' is a JSON map of localStorage keys → values,
-- used to restore cross-device game progress without a dedicated auth system.
create table if not exists public.player_state_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  player_key      text        not null unique,
  player_name     text        not null,
  player_name_key text        not null,
  grade           integer     not null,
  state           jsonb       not null default '{}'::jsonb,
  device          text,
  app_version     text,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_player_state_snapshots_player_name_key
  on public.player_state_snapshots (player_name_key);

-- ─── game_submissions ─────────────────────────────────────────────────────────
-- Source of truth for leaderboard, all-time standings, and MVP calculations.
-- game_type values: 'daily' | 'bonus' | 'teachers' | 'grade9' | 'grade10' | 'grade11' | 'grade12'
create table if not exists public.game_submissions (
  id                    uuid        primary key default gen_random_uuid(),
  player_key            text        not null,
  player_name           text        not null,
  player_name_key       text        not null,
  grade                 integer     not null,
  game_date             date        not null,
  word                  text        not null,
  won                   boolean     not null,
  guess_count           integer     not null check (guess_count between 1 and 8),
  game_type             text        not null,
  game_start_time       timestamptz,
  game_end_time         timestamptz,
  total_duration_sec    integer     not null default 0,
  time_to_first_guess_sec integer   not null default 0,
  device                text,
  screen_width          integer,
  guesses               jsonb       not null default '[]'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_game_submissions_game_date
  on public.game_submissions (game_date);

create index if not exists idx_game_submissions_grade_date
  on public.game_submissions (grade, game_date);

create index if not exists idx_game_submissions_player_key
  on public.game_submissions (player_key);

create index if not exists idx_game_submissions_player_name_key
  on public.game_submissions (player_name_key);

-- ─── keystroke_logs ───────────────────────────────────────────────────────────
-- Per-keystroke telemetry. Source of truth for in-progress game restore.
-- key_type values: 'char' | 'char_blocked' | 'delete' | 'delete_empty' |
--   'delete_blocked' | 'enter_submit' | 'enter_blocked'
create table if not exists public.keystroke_logs (
  id              uuid        primary key default gen_random_uuid(),
  session_id      text        not null,
  player_key      text        not null,
  player_name     text        not null,
  player_name_key text        not null,
  grade           integer     not null,
  game_date       date        not null,
  game_type       text        not null,
  event_timestamp timestamptz not null,
  sequence_number integer     not null,
  key_type        text        not null,
  key_value       text        not null,
  reason          text,
  guess_number    integer     not null,
  input_before    text        not null,
  input_after     text        not null,
  received_at     timestamptz not null default now()
);

-- Composite index for replaying a player's session in order
create index if not exists idx_keystroke_logs_player_daily
  on public.keystroke_logs (player_name_key, game_date, game_type, session_id, sequence_number);

-- Index for fast per-player lookups
create index if not exists idx_keystroke_logs_player_key
  on public.keystroke_logs (player_key);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.player_profiles       enable row level security;
alter table public.signup_events         enable row level security;
alter table public.player_state_snapshots enable row level security;
alter table public.game_submissions      enable row level security;
alter table public.keystroke_logs        enable row level security;

-- game_submissions: anyone can read (leaderboard) and write (submit a game)
-- Both anon and authenticated are covered because magic-link sessions use the
-- authenticated role (persistSession: true), while legacy/anon access uses anon.
create policy "anon_select_game_submissions"
  on public.game_submissions for select to anon, authenticated using (true);

create policy "anon_insert_game_submissions"
  on public.game_submissions for insert to anon, authenticated with check (true);

-- keystroke_logs: write-only; raw keystrokes are private
create policy "anon_insert_keystroke_logs"
  on public.keystroke_logs for insert to anon, authenticated with check (true);

-- signup_events: write-only
create policy "anon_insert_signup_events"
  on public.signup_events for insert to anon, authenticated with check (true);

-- player_state_snapshots: read and upsert
create policy "anon_select_player_state_snapshots"
  on public.player_state_snapshots for select to anon, authenticated using (true);

create policy "anon_insert_player_state_snapshots"
  on public.player_state_snapshots for insert to anon, authenticated with check (true);

create policy "anon_update_player_state_snapshots"
  on public.player_state_snapshots for update to anon, authenticated using (true) with check (true);

-- player_profiles: upsert
create policy "anon_insert_player_profiles"
  on public.player_profiles for insert to anon, authenticated with check (true);

create policy "anon_update_player_profiles"
  on public.player_profiles for update to anon, authenticated using (true) with check (true);

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select, insert        on table public.signup_events          to anon, authenticated;
grant select, insert, update on table public.player_profiles       to anon, authenticated;
grant select, insert, update on table public.player_state_snapshots to anon, authenticated;
grant select, insert        on table public.game_submissions        to anon, authenticated;
grant        insert         on table public.keystroke_logs          to anon, authenticated;