-- Migration 003: extend RLS policies to cover authenticated role
-- Safe to run multiple times (drop-if-exists + recreate).
--
-- Why: v6-dev switched persistSession from false → true in supabase.ts.
-- When users sign in via magic link, Supabase issues a real JWT session and
-- all subsequent queries run as the 'authenticated' role, not 'anon'.
-- The original policies only covered 'anon', so authenticated users got
-- silently blocked by RLS — causing the leaderboard and cloud sync to return
-- empty results even though GRANT SELECT was in place.
--
-- Fix: recreate every policy to include both anon and authenticated.

-- ── game_submissions ─────────────────────────────────────────────────────────
drop policy if exists "anon_select_game_submissions" on public.game_submissions;
drop policy if exists "anon_insert_game_submissions" on public.game_submissions;

create policy "anon_select_game_submissions"
  on public.game_submissions for select to anon, authenticated using (true);

create policy "anon_insert_game_submissions"
  on public.game_submissions for insert to anon, authenticated with check (true);

-- ── keystroke_logs ───────────────────────────────────────────────────────────
drop policy if exists "anon_insert_keystroke_logs" on public.keystroke_logs;

create policy "anon_insert_keystroke_logs"
  on public.keystroke_logs for insert to anon, authenticated with check (true);

-- ── signup_events ─────────────────────────────────────────────────────────────
drop policy if exists "anon_insert_signup_events" on public.signup_events;

create policy "anon_insert_signup_events"
  on public.signup_events for insert to anon, authenticated with check (true);

-- ── player_state_snapshots ───────────────────────────────────────────────────
drop policy if exists "anon_select_player_state_snapshots" on public.player_state_snapshots;
drop policy if exists "anon_insert_player_state_snapshots" on public.player_state_snapshots;
drop policy if exists "anon_update_player_state_snapshots" on public.player_state_snapshots;

create policy "anon_select_player_state_snapshots"
  on public.player_state_snapshots for select to anon, authenticated using (true);

create policy "anon_insert_player_state_snapshots"
  on public.player_state_snapshots for insert to anon, authenticated with check (true);

create policy "anon_update_player_state_snapshots"
  on public.player_state_snapshots for update to anon, authenticated using (true) with check (true);

-- ── player_profiles ──────────────────────────────────────────────────────────
drop policy if exists "anon_insert_player_profiles" on public.player_profiles;
drop policy if exists "anon_update_player_profiles" on public.player_profiles;

create policy "anon_insert_player_profiles"
  on public.player_profiles for insert to anon, authenticated with check (true);

create policy "anon_update_player_profiles"
  on public.player_profiles for update to anon, authenticated using (true) with check (true);
