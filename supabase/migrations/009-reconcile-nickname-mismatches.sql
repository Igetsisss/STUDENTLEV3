-- ============================================================
-- Migration 009: reconcile nickname-vs-legal-name identity splits
--
-- Root cause of "seniors still showing the grade above them": some
-- students' player_profiles row (linked via bulk directory import, using
-- the school directory's full preferred name) doesn't match the name they
-- actually typed in when they registered themselves in the app. Same real
-- person, two different player_name_keys, so the all-time roster-grade
-- lookup (added in migration 007) can't find the connection and falls back
-- to their old historical grade.
--
-- Example: player_profiles has "Jon Miller D" (grade 12, linked to
-- doughtiejo@bearsmail.org) because the school directory lists him as
-- Jon "Jon Miller" Doughtie. But his 11 games are all under "Jon D" —
-- he just typed "Jon" when he registered. Different key, so the grade-12
-- lookup never matched his game history.
--
-- Each row below was matched by hand against the new directory export —
-- same last-initial, and the game history's first name is a clear prefix
-- of either the directory's legal first name or nickname. Only the ones
-- confirmed unambiguous are included here; ambiguous or unmatched names
-- are reported separately, not guessed at.
-- ============================================================

begin;

create temporary table name_reconcile (
  old_key text primary key,
  new_key text not null,
  new_name text not null
);

insert into name_reconcile (old_key, new_key, new_name) values
('jon d|11', 'jon miller d|12', 'Jon Miller D'),   -- Jon "Jon Miller" Doughtie '27
('jon d|12', 'jon miller d|12', 'Jon Miller D'),
('towns m|10', 'townsend m|11', 'Townsend M'),      -- Hugh "Townsend" Mooney '28
('towns m|11', 'townsend m|11', 'Townsend M'),
('thomas m|12', 'tommy m|12', 'Tommy M'),           -- Thomas "Tommy" McLeod '27
('moses m|11', 'mose m|12', 'Mose M');              -- Moses "Mose" Murray '27

update public.game_submissions g
set player_key = r.new_key, player_name = r.new_name, player_name_key = lower(r.new_name)
from name_reconcile r
where g.player_key = r.old_key;

delete from public.player_state_snapshots s
using name_reconcile r
where s.player_key = r.old_key;

drop table name_reconcile;

commit;
