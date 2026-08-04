-- ============================================================
-- Migration 007: current-roster RPC for the All-Time leaderboard
--
-- The All-Time leaderboard needs each player's *current* grade (from
-- player_profiles) to show promoted/graduated status correctly instead of
-- whatever grade was frozen on their historical game_submissions rows.
--
-- player_profiles has RLS enabled with only INSERT/UPDATE policies — no
-- SELECT policy — specifically so a broad SELECT can never expose the
-- microsoft_email column (same reasoning as lookup_player_by_email in
-- add-microsoft-email.sql). A plain "add a SELECT policy" fix would leak
-- every student and teacher's email address to any anonymous caller.
--
-- Same pattern as lookup_player_by_email: a SECURITY DEFINER function that
-- returns only the two harmless columns actually needed.
-- ============================================================

create or replace function public.get_current_roster()
  returns table(player_name_key text, grade integer)
  language sql
  security definer
  set search_path = public
as $$
  select player_name_key, grade
  from   public.player_profiles;
$$;

grant execute on function public.get_current_roster() to anon, authenticated;
