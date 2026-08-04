-- ============================================================
-- Migration 006: Teacher account cleanup + rename convention change
--
--   1. Remove flagged bad student accounts (Emma K, Vanna N, Payton T,
--      Lowcountryd D, Cdub W, Mr(s). Wimberly).
--   2. Consolidate duplicate teacher identities that predate the teacher
--      directory import (e.g. "Dr. Bassett" -> the linked "Evan Bassett").
--   3. Rename every teacher, throughout, from "Prof. First Last" to the
--      new display convention: "Last First-Initial" (e.g. "Will Lozier"
--      becomes "Lozier W") — matches the student "First Last-Initial"
--      shape, just with names in the other order, and drops the title.
--
-- Every step is idempotent (WHERE clauses only match rows still in the old
-- shape), so this is safe to run more than once.
--
-- NOT resolved by this migration — no email/identity on file for these,
-- left untouched everywhere: Coach Dunn, Mr./Coach Hairston, "Mrs. B",
-- "Idlettsk S".
-- ============================================================

begin;

-- ─── 1. Remove flagged bad accounts ────────────────────────────────────────
delete from public.game_submissions
where player_key in ('emma k|11', 'vanna n|11', 'payton t|11', 'lowcountryd d|11', 'cdub w|12', 'mr wimberly|0', 'mr. wimberly|0');

delete from public.player_state_snapshots
where player_key in ('emma k|11', 'vanna n|11', 'payton t|11', 'lowcountryd d|11', 'cdub w|12', 'mr wimberly|0', 'mr. wimberly|0');

delete from public.signup_events
where player_key in ('emma k|11', 'vanna n|11', 'payton t|11', 'lowcountryd d|11', 'cdub w|12', 'mr wimberly|0', 'mr. wimberly|0');

-- ─── 2. Rename every teacher to "Last First-Initial", no title ────────────
-- Mapping table: every known old spelling (the canonical "Prof. First Last"
-- import row, plus every stale pre-import variant found in historical data)
-- to its single new identity. Multiple old_key rows intentionally point at
-- the same new_key — that's how the pre-import stragglers get folded into
-- the same person as the properly-linked, already-has-an-email row.
create temporary table teacher_rename (
  old_key text primary key,
  new_key text not null,
  new_name text not null
);

insert into teacher_rename (old_key, new_key, new_name) values
('prof. adam frye|0', 'frye a|0', 'Frye A'),
('prof adam frye|0', 'frye a|0', 'Frye A'),
('prof. adrienne rowe|0', 'rowe a|0', 'Rowe A'),
('prof. alice thompson|0', 'thompson a|0', 'Thompson A'),
('prof. amanda adams|0', 'adams a|0', 'Adams A'),
('prof. amanda dominique|0', 'dominique a|0', 'Dominique A'),
('prof. amanda peckham|0', 'peckham a|0', 'Peckham A'),
('prof. amanda sautter|0', 'sautter a|0', 'Sautter A'),
('prof. amy dyche|0', 'dyche a|0', 'Dyche A'),
('prof. ana rodriguez padial|0', 'rodriguez padial a|0', 'Rodriguez Padial A'),
('prof. andrew wu|0', 'wu a|0', 'Wu A'),
('prof. bill dickey|0', 'dickey b|0', 'Dickey B'),
('prof. christopher swann|0', 'swann c|0', 'Swann C'),
('prof. dalton cagle|0', 'cagle d|0', 'Cagle D'),
('prof dalton cagle|0', 'cagle d|0', 'Cagle D'),
('prof. daniel forrester|0', 'forrester d|0', 'Forrester D'),
('prof. danielle elms|0', 'elms d|0', 'Elms D'),
('prof. david makkers|0', 'makkers d|0', 'Makkers D'),
('prof. dorsey sammataro|0', 'sammataro d|0', 'Sammataro D'),
('prof. eliza suarez|0', 'suarez e|0', 'Suarez E'),
('prof. elizabeth lamback|0', 'lamback e|0', 'Lamback E'),
('prof. elizabeth scholz|0', 'scholz e|0', 'Scholz E'),
('prof. eric stetson|0', 'stetson e|0', 'Stetson E'),
('prof. erin johnson|0', 'johnson e|0', 'Johnson E'),
('prof. evan bassett|0', 'bassett e|0', 'Bassett E'),
('dr. bassett|0', 'bassett e|0', 'Bassett E'),
('prof. fernando notario|0', 'notario f|0', 'Notario F'),
('prof. frank cornwell|0', 'cornwell f|0', 'Cornwell F'),
('prof. greg hite|0', 'hite g|0', 'Hite G'),
('prof. greg locurto|0', 'locurto g|0', 'LoCurto G'),
('prof. hannah spayd|0', 'spayd h|0', 'Spayd H'),
('prof. heather bradford|0', 'bradford h|0', 'Bradford H'),
('prof. heather graham|0', 'graham h|0', 'Graham H'),
('prof. heidi domescik|0', 'domescik h|0', 'Domescik H'),
('prof. jameela reed|0', 'reed j|0', 'Reed J'),
('prof jameela reed|0', 'reed j|0', 'Reed J'),
('prof. james jackson|0', 'jackson j|0', 'Jackson J'),
('prof. james teague|0', 'teague j|0', 'Teague J'),
('prof. james terry|0', 'terry j|0', 'Terry J'),
('prof. jason rutledge|0', 'rutledge j|0', 'Rutledge J'),
('prof. jeff rowland|0', 'rowland j|0', 'Rowland J'),
('prof. jennifer walker|0', 'walker j|0', 'Walker J'),
('prof. jeremy gainer|0', 'gainer j|0', 'Gainer J'),
('prof. jeri waken|0', 'waken j|0', 'Waken J'),
('prof. jerry pendrick|0', 'pendrick j|0', 'Pendrick J'),
('prof. john alvarado|0', 'alvarado j|0', 'Alvarado J'),
('prof. john baum|0', 'baum j|0', 'Baum J'),
('prof. john jeffres|0', 'jeffres j|0', 'Jeffres J'),
('prof. john taylor|0', 'taylor j|0', 'Taylor J'),
('prof john taylor|0', 'taylor j|0', 'Taylor J'),
('prof. jordan oleson-graves|0', 'oleson-graves j|0', 'Oleson-Graves J'),
('prof. joseph conway|0', 'conway j|0', 'Conway J'),
('prof. kara santana|0', 'santana k|0', 'Santana K'),
('prof. katelyn gregory|0', 'gregory k|0', 'Gregory K'),
('prof. katherine bange|0', 'bange k|0', 'Bange K'),
('prof. katie cruce|0', 'cruce k|0', 'Cruce K'),
('mrs. cruce|0', 'cruce k|0', 'Cruce K'),
('mrs cruce|0', 'cruce k|0', 'Cruce K'),
('prof. kendrick austin|0', 'austin k|0', 'Austin K'),
('prof. kevin cameron|0', 'cameron k|0', 'Cameron K'),
('prof. kristyn tumbleson|0', 'tumbleson k|0', 'Tumbleson K'),
('prof. letitia swain|0', 'swain l|0', 'Swain L'),
('prof. lindsey thompson|0', 'thompson l|0', 'Thompson L'),
('prof lindsey thompson|0', 'thompson l|0', 'Thompson L'),
('prof. madison shumpert|0', 'shumpert m|0', 'Shumpert M'),
('prof madison shumpert|0', 'shumpert m|0', 'Shumpert M'),
('prof. manon harvey|0', 'harvey m|0', 'Harvey M'),
('mrs. harvey|0', 'harvey m|0', 'Harvey M'),
('mrs harvey|0', 'harvey m|0', 'Harvey M'),
('prof. maria karres-williams|0', 'karres-williams m|0', 'Karres-Williams M'),
('prof. maria tuohy|0', 'tuohy m|0', 'Tuohy M'),
('prof. marines montalvo|0', 'montalvo m|0', 'Montalvo M'),
('prof. mario mays|0', 'mays m|0', 'Mays M'),
('prof. marshall white|0', 'white m|0', 'White M'),
('coach white|0', 'white m|0', 'White M'),
('mr. white|0', 'white m|0', 'White M'),
('prof. mary elizabeth notario|0', 'notario m|0', 'Notario M'),
('prof. mary mckibbon|0', 'mckibbon m|0', 'McKibbon M'),
('prof. max klein|0', 'klein m|0', 'Klein M'),
('prof. meg batchelor|0', 'batchelor m|0', 'Batchelor M'),
('prof. meg mavity|0', 'mavity m|0', 'Mavity M'),
('prof. megan kraner|0', 'kraner m|0', 'Kraner M'),
('prof. meredith many|0', 'many m|0', 'Many M'),
('prof. mia washington|0', 'washington m|0', 'Washington M'),
('prof. michael turner|0', 'turner m|0', 'Turner M'),
('prof. mike dandraia|0', 'dandraia m|0', 'DAndraia M'),
('prof. miranda forman|0', 'forman m|0', 'Forman M'),
('prof miranda forman|0', 'forman m|0', 'Forman M'),
('prof. nadja aquino|0', 'aquino n|0', 'Aquino N'),
('prof. nicholas perrotta|0', 'perrotta n|0', 'Perrotta N'),
('prof. patrick pilkey|0', 'pilkey p|0', 'Pilkey P'),
('prof. patrick walsh|0', 'walsh p|0', 'Walsh P'),
('prof. paul kreinheder|0', 'kreinheder p|0', 'Kreinheder P'),
('prof. peter tongren|0', 'tongren p|0', 'Tongren P'),
('prof. rebecca rivera|0', 'rivera r|0', 'Rivera R'),
('mrs. rivera|0', 'rivera r|0', 'Rivera R'),
('prof. robert matthews|0', 'matthews r|0', 'Matthews R'),
('prof. ron codlin|0', 'codlin r|0', 'Codlin R'),
('prof. sam baroody|0', 'baroody s|0', 'Baroody S'),
('prof. sarah townsend|0', 'townsend s|0', 'Townsend S'),
('prof. shea allan|0', 'allan s|0', 'Allan S'),
('mrs allan|0', 'allan s|0', 'Allan S'),
('mrs. allan|0', 'allan s|0', 'Allan S'),
('prof. sheldon staples|0', 'staples s|0', 'Staples S'),
('prof. stefanie taylor|0', 'taylor s|0', 'Taylor S'),
('prof. stephanie reiss|0', 'reiss s|0', 'Reiss S'),
('prof stephanie reiss|0', 'reiss s|0', 'Reiss S'),
('prof. stephanie strickland|0', 'strickland s|0', 'Strickland S'),
('prof stephanie strickland|0', 'strickland s|0', 'Strickland S'),
('prof. susan harper|0', 'harper s|0', 'Harper S'),
('prof. taylor mills|0', 'mills t|0', 'Mills T'),
('prof. tisha avouris|0', 'avouris t|0', 'Avouris T'),
('prof. tyler santee|0', 'santee t|0', 'Santee T'),
('prof. will lozier|0', 'lozier w|0', 'Lozier W'),
('prof. will lundy jr|0', 'lundy jr w|0', 'Lundy Jr W'),
('prof. yolanda wright|0', 'wright y|0', 'Wright Y'),
('prof. zack wright|0', 'wright z|0', 'Wright Z');

update public.player_profiles p
set player_key = t.new_key, player_name = t.new_name,
    player_name_key = lower(t.new_name), updated_at = now()
from teacher_rename t
where p.player_key = t.old_key;

update public.game_submissions g
set player_key = t.new_key, player_name = t.new_name, player_name_key = lower(t.new_name)
from teacher_rename t
where g.player_key = t.old_key;

-- player_key is uniquely constrained here, and several people have more
-- than one old-key variant (e.g. both "Coach White" and "Mr. White" rows
-- exist), which would collide if merged with a plain UPDATE. This is just
-- a resumable in-progress-game cache, not historical record, so the safe
-- move is to drop every old-shaped row outright — each teacher gets a
-- fresh one, correctly keyed, next time they actually play.
delete from public.player_state_snapshots s
using teacher_rename t
where s.player_key = t.old_key;

drop table teacher_rename;

commit;

-- ─── Verify ─────────────────────────────────────────────────────────────────
-- select player_name, microsoft_email from public.player_profiles where grade = 0 order by player_name;
-- select player_name, count(*) from public.game_submissions where grade = 0 and player_name ilike 'prof%' group by player_name;
-- (should return 0 rows — no more "Prof." names left anywhere)
