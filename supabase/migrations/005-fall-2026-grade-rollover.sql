-- ============================================================
-- Migration 005: Fall 2026 grade rollover
--   1. Graduate the outgoing seniors (grade 12 -> removed)
--   2. Promote every remaining player one grade (11->12, 10->11, 9->10)
--   3. Seed the incoming freshman class (Class of 2030) into
--      player_profiles so their very first magic-link login
--      auto-fills name + grade via lookup_player_by_email() —
--      no Grade modal, no typing anything in.
--
-- Run this ONCE in the Supabase SQL Editor. Do NOT re-run it — running
-- it twice will promote every remaining player a second grade level.
--
-- Only public.player_profiles is touched. game_submissions (and every
-- other history table) is left alone on purpose: a game a player
-- submitted while they were a freshman should stay recorded as a
-- freshman-grade game forever, not get silently rewritten to whatever
-- grade they're in today. player_profiles is just the "who is this
-- email right now" roster row used for auto-login.
-- ============================================================

-- ─── Pre-flight check (optional) ───────────────────────────────────────────
-- Run this SELECT by itself first if you want to sanity-check for name
-- collisions the promotion step could hit. player_key is unique, and it's
-- built from '<first name> <last initial>|<grade>' — if a rising senior
-- ("Jack S", grade 11 -> 12) shares that exact key with an existing senior
-- ("Jack S", already grade 12), the UPDATE below will fail on a duplicate
-- key and roll back. If that happens, find the pair with a query like:
--
--   select player_key, player_name, grade from public.player_profiles
--   where player_key in (
--     select player_name_key || '|' || (grade + 1)::text
--     from public.player_profiles where grade in (9, 10, 11)
--   );
--
-- ...and rename one of them (e.g. widen their last initial to two letters)
-- before re-running this migration.

begin;

-- ─── 1. Graduate the outgoing seniors ──────────────────────────────────────
-- Removes their roster row so a graduated student's email no longer
-- auto-signs them back in as a current student. Their historical
-- game_submissions rows are untouched and still count for all-time stats.
delete from public.player_profiles where grade = 12;

-- ─── 2. Promote everyone else up one grade ─────────────────────────────────
-- player_key encodes the grade ('<name key>|<grade>'), so it has to be
-- rebuilt alongside the grade column or it goes stale.
--
-- Done as three separate statements, highest grade first, instead of one
-- combined UPDATE. player_key is uniquely constrained, and when the same
-- "First LastInitial" exists in two adjacent grades (real case hit while
-- testing this: a "Madeline B" in both grade 9 and grade 10), a single
-- combined UPDATE can transiently collide mid-statement before every row
-- finishes moving. Processing 11->12 first fully vacates grade 12 (already
-- emptied by the delete above) before 10->11 arrives there, and likewise
-- 10->11 before 9->10 arrives — so no destination grade is ever occupied
-- by an old value when a promoted row lands on it.
update public.player_profiles
set grade = 12, player_key = player_name_key || '|12', updated_at = now()
where grade = 11;

update public.player_profiles
set grade = 11, player_key = player_name_key || '|11', updated_at = now()
where grade = 10;

update public.player_profiles
set grade = 10, player_key = player_name_key || '|10', updated_at = now()
where grade = 9;

-- ─── 3. Seed the incoming freshman class (Class of 2030) ───────────────────
-- Name rule applied below: the quoted nickname in the school directory is
-- used as the first name when present, otherwise the plain first name.
-- Last name is reduced to a single initial to match the leaderboard's
-- existing "First LastInitial" display (e.g. "Jack S") — same shape the
-- app itself writes when a student completes the Grade modal by hand.
--
-- Two students in this class share "Emma B" (Emma Bell / Emma Boeschen) —
-- widened to "Emma Be" / "Emma Bo" so both get a unique player_key. Every
-- other row in this batch is a plain single-letter last initial.
insert into public.player_profiles
  (player_key, player_name, player_name_key, grade, microsoft_email, source)
values
  ('arafen a|9', 'Arafen A', 'arafen a', 9, 'ahmedar30@bearsmail.org', 'directory_import_class_2030'),
  ('tyler a|9', 'Tyler A', 'tyler a', 9, 'allenty30@bearsmail.org', 'directory_import_class_2030'),
  ('harper a|9', 'Harper A', 'harper a', 9, 'argyleha30@bearsmail.org', 'directory_import_class_2030'),
  ('mary virginia b|9', 'Mary Virginia B', 'mary virginia b', 9, 'barryma30@bearsmail.org', 'directory_import_class_2030'),
  ('abbey b|9', 'Abbey B', 'abbey b', 9, 'bellab30@bearsmail.org', 'directory_import_class_2030'),
  ('emma be|9', 'Emma Be', 'emma be', 9, 'bellem30@bearsmail.org', 'directory_import_class_2030'),
  ('eidan b|9', 'Eidan B', 'eidan b', 9, 'berryei30@bearsmail.org', 'directory_import_class_2030'),
  ('nate b|9', 'Nate B', 'nate b', 9, 'beyenena30@bearsmail.org', 'directory_import_class_2030'),
  ('alaina b|9', 'Alaina B', 'alaina b', 9, 'blakeal30@bearsmail.org', 'directory_import_class_2030'),
  ('camille b|9', 'Camille B', 'camille b', 9, 'bloomstonca30@bearsmail.org', 'directory_import_class_2030'),
  ('talan b|9', 'Talan B', 'talan b', 9, 'bocanegrata30@bearsmail.org', 'directory_import_class_2030'),
  ('emma bo|9', 'Emma Bo', 'emma bo', 9, 'boeschenem30@bearsmail.org', 'directory_import_class_2030'),
  ('hailey b|9', 'Hailey B', 'hailey b', 9, 'bradnerha30@bearsmail.org', 'directory_import_class_2030'),
  ('brayden b|9', 'Brayden B', 'brayden b', 9, 'brilesbr30@bearsmail.org', 'directory_import_class_2030'),
  ('jd b|9', 'Jd B', 'jd b', 9, 'brumfieldjd30@bearsmail.org', 'directory_import_class_2030'),
  ('chandler c|9', 'Chandler C', 'chandler c', 9, 'camposch30@bearsmail.org', 'directory_import_class_2030'),
  ('ivana c|9', 'Ivana C', 'ivana c', 9, 'castellanosiv30@bearsmail.org', 'directory_import_class_2030'),
  ('sally c|9', 'Sally C', 'sally c', 9, 'chasteensa30@bearsmail.org', 'directory_import_class_2030'),
  ('vinny c|9', 'Vinny C', 'vinny c', 9, 'chiaffredovi30@bearsmail.org', 'directory_import_class_2030'),
  ('virran c|9', 'Virran C', 'virran c', 9, 'chopravi30@bearsmail.org', 'directory_import_class_2030'),
  ('cam c|9', 'Cam C', 'cam c', 9, 'cobbca30@bearsmail.org', 'directory_import_class_2030'),
  ('andrew c|9', 'Andrew C', 'andrew c', 9, 'coleyan30@bearsmail.org', 'directory_import_class_2030'),
  ('jade c|9', 'Jade C', 'jade c', 9, 'cruzja30@bearsmail.org', 'directory_import_class_2030'),
  ('gabby c|9', 'Gabby C', 'gabby c', 9, 'cusimanoga30@bearsmail.org', 'directory_import_class_2030'),
  ('finn d|9', 'Finn D', 'finn d', 9, 'dickeyfi30@bearsmail.org', 'directory_import_class_2030'),
  ('ross d|9', 'Ross D', 'ross d', 9, 'drakero30@bearsmail.org', 'directory_import_class_2030'),
  ('wilder d|9', 'Wilder D', 'wilder d', 9, 'duncanwi30@bearsmail.org', 'directory_import_class_2030'),
  ('sydney f|9', 'Sydney F', 'sydney f', 9, 'fanchersy30@bearsmail.org', 'directory_import_class_2030'),
  ('mary kathryn f|9', 'Mary Kathryn F', 'mary kathryn f', 9, 'fierroma30@bearsmail.org', 'directory_import_class_2030'),
  ('jax f|9', 'Jax F', 'jax f', 9, 'fountainja30@bearsmail.org', 'directory_import_class_2030'),
  ('spencer f|9', 'Spencer F', 'spencer f', 9, 'fowlersp30@bearsmail.org', 'directory_import_class_2030'),
  ('blake g|9', 'Blake G', 'blake g', 9, 'gadsonbl30@bearsmail.org', 'directory_import_class_2030'),
  ('liam g|9', 'Liam G', 'liam g', 9, 'galanli30@bearsmail.org', 'directory_import_class_2030'),
  ('adonai g|9', 'Adonai G', 'adonai g', 9, 'gebereselassiead30@bearsmail.org', 'directory_import_class_2030'),
  ('abrielle g|9', 'Abrielle G', 'abrielle g', 9, 'georgeab30@bearsmail.org', 'directory_import_class_2030'),
  ('josiah g|9', 'Josiah G', 'josiah g', 9, 'georgejo30@bearsmail.org', 'directory_import_class_2030'),
  ('isabel g|9', 'Isabel G', 'isabel g', 9, 'georgievis30@bearsmail.org', 'directory_import_class_2030'),
  ('wendy g|9', 'Wendy G', 'wendy g', 9, 'glennwe30@bearsmail.org', 'directory_import_class_2030'),
  ('andrew g|9', 'Andrew G', 'andrew g', 9, 'gossettan30@bearsmail.org', 'directory_import_class_2030'),
  ('deuce g|9', 'Deuce G', 'deuce g', 9, 'graysonde30@bearsmail.org', 'directory_import_class_2030'),
  ('abby g|9', 'Abby G', 'abby g', 9, 'greenab30@bearsmail.org', 'directory_import_class_2030'),
  ('caroline g|9', 'Caroline G', 'caroline g', 9, 'greenca30@bearsmail.org', 'directory_import_class_2030'),
  ('chori g|9', 'Chori G', 'chori g', 9, 'greench30@bearsmail.org', 'directory_import_class_2030'),
  ('sam g|9', 'Sam G', 'sam g', 9, 'griffinsa30@bearsmail.org', 'directory_import_class_2030'),
  ('ella h|9', 'Ella H', 'ella h', 9, 'harkeyel30@bearsmail.org', 'directory_import_class_2030'),
  ('katherine h|9', 'Katherine H', 'katherine h', 9, 'harriska30@bearsmail.org', 'directory_import_class_2030'),
  ('neilan h|9', 'Neilan H', 'neilan h', 9, 'hawkinsne30@bearsmail.org', 'directory_import_class_2030'),
  ('megan h|9', 'Megan H', 'megan h', 9, 'hendricksonme30@bearsmail.org', 'directory_import_class_2030'),
  ('ridge h|9', 'Ridge H', 'ridge h', 9, 'hodgsonri30@bearsmail.org', 'directory_import_class_2030'),
  ('sloane h|9', 'Sloane H', 'sloane h', 9, 'hodgsonsl30@bearsmail.org', 'directory_import_class_2030'),
  ('ben h|9', 'Ben H', 'ben h', 9, 'hooverbe30@bearsmail.org', 'directory_import_class_2030'),
  ('grayson h|9', 'Grayson H', 'grayson h', 9, 'hughesgr30@bearsmail.org', 'directory_import_class_2030'),
  ('tillan h|9', 'Tillan H', 'tillan h', 9, 'hydeti30@bearsmail.org', 'directory_import_class_2030'),
  ('charles i|9', 'Charles I', 'charles i', 9, 'ihetuch30@bearsmail.org', 'directory_import_class_2030'),
  ('jacaria i|9', 'Jacaria I', 'jacaria i', 9, 'ingramja30@bearsmail.org', 'directory_import_class_2030'),
  ('jimi i|9', 'Jimi I', 'jimi i', 9, 'ipayeji30@bearsmail.org', 'directory_import_class_2030'),
  ('connor j|9', 'Connor J', 'connor j', 9, 'jaaxco30@bearsmail.org', 'directory_import_class_2030'),
  ('luka j|9', 'Luka J', 'luka j', 9, 'jimenezlu30@bearsmail.org', 'directory_import_class_2030'),
  ('jace j|9', 'Jace J', 'jace j', 9, 'johnsonja30@bearsmail.org', 'directory_import_class_2030'),
  ('anna j|9', 'Anna J', 'anna j', 9, 'johnstonan30@bearsmail.org', 'directory_import_class_2030'),
  ('yardley j|9', 'Yardley J', 'yardley j', 9, 'jonesya30@bearsmail.org', 'directory_import_class_2030'),
  ('ilianna j|9', 'Ilianna J', 'ilianna j', 9, 'josehernandezil30@bearsmail.org', 'directory_import_class_2030'),
  ('teddy j|9', 'Teddy J', 'teddy j', 9, 'josephte30@bearsmail.org', 'directory_import_class_2030'),
  ('aleka k|9', 'Aleka K', 'aleka k', 9, 'keeleal30@bearsmail.org', 'directory_import_class_2030'),
  ('whitfield k|9', 'Whitfield K', 'whitfield k', 9, 'kloberdanzwh30@bearsmail.org', 'directory_import_class_2030'),
  ('betsy k|9', 'Betsy K', 'betsy k', 9, 'klopmanel30@bearsmail.org', 'directory_import_class_2030'),
  ('dylan l|9', 'Dylan L', 'dylan l', 9, 'lashdy30@bearsmail.org', 'directory_import_class_2030'),
  ('matthew l|9', 'Matthew L', 'matthew l', 9, 'levittma30@bearsmail.org', 'directory_import_class_2030'),
  ('ruby l|9', 'Ruby L', 'ruby l', 9, 'lewisru30@bearsmail.org', 'directory_import_class_2030'),
  ('ryder l|9', 'Ryder L', 'ryder l', 9, 'lewisry30@bearsmail.org', 'directory_import_class_2030'),
  ('lorelei l|9', 'Lorelei L', 'lorelei l', 9, 'lipsonlo30@bearsmail.org', 'directory_import_class_2030'),
  ('wesley l|9', 'Wesley L', 'wesley l', 9, 'loganwe30@bearsmail.org', 'directory_import_class_2030'),
  ('mason m|9', 'Mason M', 'mason m', 9, 'mccarthyma30@bearsmail.org', 'directory_import_class_2030'),
  ('max m|9', 'Max M', 'max m', 9, 'mendesma30@bearsmail.org', 'directory_import_class_2030'),
  ('idey m|9', 'Idey M', 'idey m', 9, 'mezaid30@bearsmail.org', 'directory_import_class_2030'),
  ('william m|9', 'William M', 'william m', 9, 'miklitschwi30@bearsmail.org', 'directory_import_class_2030'),
  ('allison m|9', 'Allison M', 'allison m', 9, 'milleral30@bearsmail.org', 'directory_import_class_2030'),
  ('laney kate m|9', 'Laney Kate M', 'laney kate m', 9, 'millerla30@bearsmail.org', 'directory_import_class_2030'),
  ('matthew m|9', 'Matthew M', 'matthew m', 9, 'muchama30@bearsmail.org', 'directory_import_class_2030'),
  ('andrew m|9', 'Andrew M', 'andrew m', 9, 'mullinsan30@bearsmail.org', 'directory_import_class_2030'),
  ('abe m|9', 'Abe M', 'abe m', 9, 'murrayab30@bearsmail.org', 'directory_import_class_2030'),
  ('hazel m|9', 'Hazel M', 'hazel m', 9, 'myslinskiha30@bearsmail.org', 'directory_import_class_2030'),
  ('wells n|9', 'Wells N', 'wells n', 9, 'nalleywe30@bearsmail.org', 'directory_import_class_2030'),
  ('tommy n|9', 'Tommy N', 'tommy n', 9, 'neumannto30@bearsmail.org', 'directory_import_class_2030'),
  ('henry n|9', 'Henry N', 'henry n', 9, 'neumeyerhe30@bearsmail.org', 'directory_import_class_2030'),
  ('constanza p|9', 'Constanza P', 'constanza p', 9, 'panoco30@bearsmail.org', 'directory_import_class_2030'),
  ('blair p|9', 'Blair P', 'blair p', 9, 'pittsbl30@bearsmail.org', 'directory_import_class_2030'),
  ('jahmai p|9', 'Jahmai P', 'jahmai p', 9, 'porterja30@bearsmail.org', 'directory_import_class_2030'),
  ('aiden p|9', 'Aiden P', 'aiden p', 9, 'pylesai30@bearsmail.org', 'directory_import_class_2030'),
  ('kayla q|9', 'Kayla Q', 'kayla q', 9, 'quecholka30@bearsmail.org', 'directory_import_class_2030'),
  ('daniel r|9', 'Daniel R', 'daniel r', 9, 'rachelsonda30@bearsmail.org', 'directory_import_class_2030'),
  ('daria r|9', 'Daria R', 'daria r', 9, 'refaida30@bearsmail.org', 'directory_import_class_2030'),
  ('nola r|9', 'Nola R', 'nola r', 9, 'ricciono30@bearsmail.org', 'directory_import_class_2030'),
  ('sandifer r|9', 'Sandifer R', 'sandifer r', 9, 'rocchinisa30@bearsmail.org', 'directory_import_class_2030'),
  ('daniella r|9', 'Daniella R', 'daniella r', 9, 'rodasda30@bearsmail.org', 'directory_import_class_2030'),
  ('lila r|9', 'Lila R', 'lila r', 9, 'rookerli30@bearsmail.org', 'directory_import_class_2030'),
  ('sophia r|9', 'Sophia R', 'sophia r', 9, 'rosalesso30@bearsmail.org', 'directory_import_class_2030'),
  ('iris s|9', 'Iris S', 'iris s', 9, 'savageir30@bearsmail.org', 'directory_import_class_2030'),
  ('ava s|9', 'Ava S', 'ava s', 9, 'schutzav30@bearsmail.org', 'directory_import_class_2030'),
  ('casey s|9', 'Casey S', 'casey s', 9, 'shannonca30@bearsmail.org', 'directory_import_class_2030'),
  ('niagrace s|9', 'NiaGrace S', 'niagrace s', 9, 'sheatsni30@bearsmail.org', 'directory_import_class_2030'),
  ('lanier s|9', 'Lanier S', 'lanier s', 9, 'simpsonla30@bearsmail.org', 'directory_import_class_2030'),
  ('daley s|9', 'Daley S', 'daley s', 9, 'singerda30@bearsmail.org', 'directory_import_class_2030'),
  ('drew s|9', 'Drew S', 'drew s', 9, 'smithdr30@bearsmail.org', 'directory_import_class_2030'),
  ('shivani s|9', 'Shivani S', 'shivani s', 9, 'sotosh30@bearsmail.org', 'directory_import_class_2030'),
  ('anna s|9', 'Anna S', 'anna s', 9, 'starnesan30@bearsmail.org', 'directory_import_class_2030'),
  ('gabe s|9', 'Gabe S', 'gabe s', 9, 'stefanskiga30@bearsmail.org', 'directory_import_class_2030'),
  ('mae s|9', 'Mae S', 'mae s', 9, 'stibbsma30@bearsmail.org', 'directory_import_class_2030'),
  ('cassandra s|9', 'Cassandra S', 'cassandra s', 9, 'stovallca30@bearsmail.org', 'directory_import_class_2030'),
  ('robert s|9', 'Robert S', 'robert s', 9, 'strangero30@bearsmail.org', 'directory_import_class_2030'),
  ('austin s|9', 'Austin S', 'austin s', 9, 'sullivanau30@bearsmail.org', 'directory_import_class_2030'),
  ('jackie s|9', 'Jackie S', 'jackie s', 9, 'sullivanja30@bearsmail.org', 'directory_import_class_2030'),
  ('jane s|9', 'Jane S', 'jane s', 9, 'swartzja30@bearsmail.org', 'directory_import_class_2030'),
  ('klyce t|9', 'Klyce T', 'klyce t', 9, 'thomaskl30@bearsmail.org', 'directory_import_class_2030'),
  ('tyler t|9', 'Tyler T', 'tyler t', 9, 'tioty30@bearsmail.org', 'directory_import_class_2030'),
  ('agustin t|9', 'Agustin T', 'agustin t', 9, 'tommasiniag30@bearsmail.org', 'directory_import_class_2030'),
  ('caroline t|9', 'Caroline T', 'caroline t', 9, 'treadwayca30@bearsmail.org', 'directory_import_class_2030'),
  ('marlin t|9', 'Marlin T', 'marlin t', 9, 'tuffma30@bearsmail.org', 'directory_import_class_2030'),
  ('tison t|9', 'Tison T', 'tison t', 9, 'turenneti30@bearsmail.org', 'directory_import_class_2030'),
  ('holman u|9', 'Holman U', 'holman u', 9, 'underwoodho30@bearsmail.org', 'directory_import_class_2030'),
  ('harrison w|9', 'Harrison W', 'harrison w', 9, 'walkerha30@bearsmail.org', 'directory_import_class_2030'),
  ('davis w|9', 'Davis W', 'davis w', 9, 'watersda30@bearsmail.org', 'directory_import_class_2030'),
  ('will w|9', 'Will W', 'will w', 9, 'webberwi30@bearsmail.org', 'directory_import_class_2030'),
  ('avery w|9', 'Avery W', 'avery w', 9, 'whiteav30@bearsmail.org', 'directory_import_class_2030'),
  ('fraser w|9', 'Fraser W', 'fraser w', 9, 'wileyfr30@bearsmail.org', 'directory_import_class_2030'),
  ('mia w|9', 'Mia W', 'mia w', 9, 'williamsonmi30@bearsmail.org', 'directory_import_class_2030'),
  ('tiger w|9', 'Tiger W', 'tiger w', 9, 'winsettjo30@bearsmail.org', 'directory_import_class_2030'),
  ('ben w|9', 'Ben W', 'ben w', 9, 'witzigreuterbe30@bearsmail.org', 'directory_import_class_2030'),
  ('kimora w|9', 'Kimora W', 'kimora w', 9, 'wynnki30@bearsmail.org', 'directory_import_class_2030')
on conflict (player_key) do update
  set player_name     = excluded.player_name,
      player_name_key = excluded.player_name_key,
      grade            = excluded.grade,
      microsoft_email = excluded.microsoft_email,
      updated_at       = now();

commit;

-- ─── Verify ─────────────────────────────────────────────────────────────────
-- select grade, count(*) from public.player_profiles group by grade order by grade;
-- select count(*) from public.player_profiles where source = 'directory_import_class_2030';
-- (should show 129)
