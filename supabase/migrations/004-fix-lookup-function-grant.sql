-- Migration 004: grant lookup_player_by_email to authenticated role
--
-- Why this is needed:
--   add-microsoft-email.sql only granted EXECUTE to 'anon'.
--   When a user signs in via magic link (v6 uses persistSession: true),
--   Supabase issues a real JWT and all queries run as 'authenticated'.
--   Without this grant, supabase.rpc('lookup_player_by_email') silently
--   fails for every signed-in user → lookupAccountByEmail returns null →
--   the app shows the Grade modal as if they're a new user, forcing them
--   to "re-verify" their name and grade every single login.
--
-- Safe to run multiple times.

GRANT EXECUTE ON FUNCTION public.lookup_player_by_email(text) TO authenticated;
