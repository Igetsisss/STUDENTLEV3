-- Migration 002: schema improvements
-- Safe to run multiple times (all statements are idempotent).
--
-- Changes:
--   1. Add missing index on keystroke_logs(player_key) for fast per-player lookups.
--   2. Add index on game_submissions(player_name_key) to speed up name-based queries.
--   3. Add index on player_state_snapshots(player_name_key).
--   4. Add index on player_profiles(player_name_key).
--   5. Revoke direct SELECT on keystroke_logs from anon (raw keystrokes are private).
--   6. Consolidate grants so schema.sql and fix-rls.sql are no longer needed as patches.

-- ─── New indexes ──────────────────────────────────────────────────────────────

create index if not exists idx_keystroke_logs_player_key
  on public.keystroke_logs (player_key);

create index if not exists idx_game_submissions_player_name_key
  on public.game_submissions (player_name_key);

create index if not exists idx_player_state_snapshots_player_name_key
  on public.player_state_snapshots (player_name_key);

create index if not exists idx_player_profiles_player_name_key
  on public.player_profiles (player_name_key);

-- ─── RLS: remove raw keystroke read access from anon ─────────────────────────

drop policy if exists "anon_select_keystroke_logs" on public.keystroke_logs;

-- ─── Grants (idempotent) ─────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant select, insert         on table public.signup_events           to anon, authenticated;
grant select, insert, update on table public.player_profiles         to anon, authenticated;
grant select, insert, update on table public.player_state_snapshots  to anon, authenticated;
grant select, insert         on table public.game_submissions         to anon, authenticated;
grant        insert          on table public.keystroke_logs           to anon, authenticated;
