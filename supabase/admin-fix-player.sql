-- ============================================================
-- Admin helper queries — run these in the Supabase SQL Editor
-- ============================================================

-- ─── 1. See every player who has registered (email + grade) ───────────────────
SELECT
  player_name,
  grade,
  microsoft_email,
  created_at
FROM public.player_profiles
ORDER BY created_at DESC;


-- ─── 2. Find a specific player by email ───────────────────────────────────────
-- Replace the email below with the student's bearsmail address.
SELECT *
FROM public.player_profiles
WHERE microsoft_email = lower(trim('student@bearsmail.org'));


-- ─── 3. Fix a player's grade (update player_profiles + game_submissions) ───────
-- Fill in the correct values for player_name and grade before running.
--
-- Grade codes:  9 = Freshman  10 = Sophomore  11 = Junior  12 = Senior  0 = Teacher
--
-- Step A — find their player_key so you can update everything consistently:
SELECT player_key, player_name, grade, microsoft_email
FROM public.player_profiles
WHERE lower(player_name) LIKE lower('%FirstName LastInitial%');  -- e.g. '%Jack S%'

-- Step B — update the grade on their profile:
UPDATE public.player_profiles
SET
  grade      = 11,                          -- ← correct grade number
  player_key = lower(trim(player_name)) || '|' || '11',  -- rebuild key to match new grade
  updated_at = now()
WHERE microsoft_email = lower(trim('student@bearsmail.org'));  -- ← their email

-- Step C — fix any game submissions they already made with the wrong grade:
UPDATE public.game_submissions
SET
  grade      = 11,                          -- ← correct grade number
  player_key = player_name_key || '|' || '11'
WHERE player_key = 'old player_key here';   -- ← paste the old player_key from Step A


-- ─── 4. Re-link an email to the correct account ───────────────────────────────
-- Use this if the email got linked to the wrong profile row.
--
-- First, clear the wrong link:
UPDATE public.player_profiles
SET microsoft_email = NULL, updated_at = now()
WHERE microsoft_email = lower(trim('student@bearsmail.org'));

-- Then link to the correct profile:
UPDATE public.player_profiles
SET microsoft_email = lower(trim('student@bearsmail.org')), updated_at = now()
WHERE player_key = 'correct player_key here';  -- ← paste correct player_key


-- ─── 5. See who has NOT yet linked their email (still needs to log in) ─────────
SELECT player_name, grade, created_at
FROM public.player_profiles
WHERE microsoft_email IS NULL
ORDER BY created_at DESC;
