-- ============================================================
-- Migration 008: directory sync — add missing linked accounts
--
-- Reconciled the app's roster against an updated, authoritative school
-- directory export (Seniors '27 / Juniors '28 / Sophomores '29 / Freshman
-- '30). 504 of 528 directory entries already had a matching player_profiles
-- row; these are the 24 that didn't. ADD-ONLY, as requested — nothing
-- existing is touched or removed, even if it's not in the new directory.
--
-- Verified before running: none of these 24 people already have a
-- player_profiles row under their name+grade (checked directly), so this is
-- a plain insert with no risk of colliding with an existing account.
-- ============================================================

insert into public.player_profiles
  (player_key, player_name, player_name_key, grade, microsoft_email, source)
values
  ('harris b|12', 'Harris B', 'harris b', 12, 'bradfordha27@bearsmail.org', 'directory_import_2026_sync'),
  ('grant b|12', 'Grant B', 'grant b', 12, 'bradleygr27@bearsmail.org', 'directory_import_2026_sync'),
  ('madeline b|12', 'Madeline B', 'madeline b', 12, 'brownma27@bearsmail.org', 'directory_import_2026_sync'),
  ('gigi c|12', 'Gigi C', 'gigi c', 12, 'coregi@bearsmail.org', 'directory_import_2026_sync'),
  ('bryce sm|12', 'Bryce Sm', 'bryce sm', 12, 'smithbr@bearsmail.org', 'directory_import_2026_sync'),
  ('jason b|11', 'Jason B', 'jason b', 11, 'beckja28@bearsmail.org', 'directory_import_2026_sync'),
  ('aaniyah b|11', 'Aaniyah B', 'aaniyah b', 11, 'branchaa28@bearsmail.org', 'directory_import_2026_sync'),
  ('zoe b|11', 'Zoe B', 'zoe b', 11, 'brownzo28@bearsmail.org', 'directory_import_2026_sync'),
  ('brody f|11', 'Brody F', 'brody f', 11, 'fernandezbr@bearsmail.org', 'directory_import_2026_sync'),
  ('dyer f|11', 'Dyer F', 'dyer f', 11, 'fieldsdy@bearsmail.org', 'directory_import_2026_sync'),
  ('wyatt f|11', 'Wyatt F', 'wyatt f', 11, 'fieldswy@bearsmail.org', 'directory_import_2026_sync'),
  ('marshall f|11', 'Marshall F', 'marshall f', 11, 'flackma28@bearsmail.org', 'directory_import_2026_sync'),
  ('bryce f|11', 'Bryce F', 'bryce f', 11, 'floydbr28@bearsmail.org', 'directory_import_2026_sync'),
  ('grayden f|11', 'Grayden F', 'grayden f', 11, 'fotopoulosgr@bearsmail.org', 'directory_import_2026_sync'),
  ('whitney l|11', 'Whitney L', 'whitney l', 11, 'laundonwh@bearsmail.org', 'directory_import_2026_sync'),
  ('will s|11', 'Will S', 'will s', 11, 'stefanskiwi28@bearsmail.org', 'directory_import_2026_sync'),
  ('george w|11', 'George W', 'george w', 11, 'wicksteadge28@bearsmail.org', 'directory_import_2026_sync'),
  ('colt w|11', 'Colt W', 'colt w', 11, 'witzigreuterco@bearsmail.org', 'directory_import_2026_sync'),
  ('teddy a|10', 'Teddy A', 'teddy a', 10, 'avgerinoste29@bearsmail.org', 'directory_import_2026_sync'),
  ('mason c|10', 'Mason C', 'mason c', 10, 'cookma29@bearsmail.org', 'directory_import_2026_sync'),
  ('braeden d|10', 'Braeden D', 'braeden d', 10, 'dooleybr29@bearsmail.org', 'directory_import_2026_sync'),
  ('ransom l|10', 'Ransom L', 'ransom l', 10, 'lonerganra29@bearsmail.org', 'directory_import_2026_sync'),
  ('catherine n|10', 'Catherine N', 'catherine n', 10, 'newtonca29@bearsmail.org', 'directory_import_2026_sync'),
  ('henry st|10', 'Henry St', 'henry st', 10, 'stonehe29@bearsmail.org', 'directory_import_2026_sync')
on conflict (player_key) do nothing;
