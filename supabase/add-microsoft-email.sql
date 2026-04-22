-- ============================================================
-- Migration: Microsoft Auth — Email ↔ Account Linking
-- Run this once in the Supabase SQL Editor before deploying
-- the feature/microsoft-auth branch to production.
-- ============================================================

-- 1. Add microsoft_email column to player_profiles.
--    Nullable so existing rows are unaffected.
ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS microsoft_email text;

-- Unique partial index: enforces one account per email, ignores NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_profiles_microsoft_email
  ON public.player_profiles (microsoft_email)
  WHERE microsoft_email IS NOT NULL;

-- 2. Secure lookup function.
--    Returns only player_name + grade for a given email so the email
--    column is never exposed through a broad SELECT policy.
CREATE OR REPLACE FUNCTION public.lookup_player_by_email(p_email text)
  RETURNS TABLE(player_name text, grade integer)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT player_name, grade
  FROM   public.player_profiles
  WHERE  microsoft_email = lower(trim(p_email))
  LIMIT  1;
$$;

-- Grant anonymous callers (the React app) permission to call the function.
GRANT EXECUTE ON FUNCTION public.lookup_player_by_email(text) TO anon;
