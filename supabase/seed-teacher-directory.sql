-- ================================================================
-- Seed: teacher directory -> player_profiles
-- Generated 2026-04-22 from the Upper School faculty directory.
--
-- Purpose: pre-links teacher hies.org accounts so Microsoft login can
-- restore teacher identities across devices using the same email flow.
--
-- Note: records are seeded with a neutral "Prof." prefix so teacher
-- accounts satisfy the grade-0 prefix requirement in app auth flow.
-- ================================================================

WITH teacher_directory(raw_name, microsoft_email) AS (
  VALUES
    ('Amanda Adams', 'amanda.adams@hies.org'),
    ('Shea Allan', 'shea.allan@hies.org'),
    ('John Alvarado', 'john.alvarado@hies.org'),
    ('Nadja Aquino', 'nadja.aquino@hies.org'),
    ('Kendrick Austin', 'kendrick.austin@hies.org'),
    ('Tisha Avouris', 'tisha.avouris@hies.org'),
    ('Katherine Bange', 'katherine.bange@hies.org'),
    ('Sam Baroody', 'sam.baroody@hies.org'),
    ('Evan Bassett', 'evan.bassett@hies.org'),
    ('Meg Batchelor', 'meg.batchelor@hies.org'),
    ('John Baum', 'john.baum@hies.org'),
    ('Heather Bradford', 'heather.bradford@hies.org'),
    ('Dalton Cagle', 'dalton.cagle@hies.org'),
    ('Kevin Cameron', 'kevin.cameron@hies.org'),
    ('Ron Codlin', 'ron.codlin@hies.org'),
    ('Joseph Conway', 'joe.conway@hies.org'),
    ('Frank Cornwell', 'frank.cornwell@hies.org'),
    ('Katie Cruce', 'katie.cruce@hies.org'),
    ('Mike DAndraia', 'mike.dandraia@hies.org'),
    ('Bill Dickey', 'bill.dickey@hies.org'),
    ('Heidi Domescik', 'heidi.domescik@hies.org'),
    ('Amanda Dominique', 'amanda.dominique@hies.org'),
    ('Amy Dyche', 'amy.dyche@hies.org'),
    ('Danielle Elms', 'danielle.elms@hies.org'),
    ('Miranda Forman', 'miranda.forman@hies.org'),
    ('Daniel Forrester', 'daniel.forrester@hies.org'),
    ('Adam Frye', 'adam.frye@hies.org'),
    ('Jeremy Gainer', 'jeremy.gainer@hies.org'),
    ('Heather Graham', 'heather.graham@hies.org'),
    ('Katelyn Gregory', 'katelyn.gregory@hies.org'),
    ('Susan Harper', 'susan.harper@hies.org'),
    ('Manon Harvey', 'manon.harvey@hies.org'),
    ('Greg Hite', 'greg.hite@hies.org'),
    ('James Jackson', 'j.jackson@hies.org'),
    ('John Jeffres', 'john.jeffres@hies.org'),
    ('Erin Johnson', 'erin.johnson@hies.org'),
    ('Maria Karres-Williams', 'maria.karreswilliams@hies.org'),
    ('Max Klein', 'max.klein@hies.org'),
    ('Megan Kraner', 'meg.kraner@hies.org'),
    ('Paul Kreinheder', 'paul.kreinheder@hies.org'),
    ('Elizabeth Lamback', 'elizabeth.lamback@hies.org'),
    ('Greg LoCurto', 'greg.locurto@hies.org'),
    ('Will Lozier', 'will.lozier@hies.org'),
    ('Will Lundy Jr', 'will.lundy@hies.org'),
    ('David Makkers', 'david.makkers@hies.org'),
    ('Meredith Many', 'meredith.many@hies.org'),
    ('Robert Matthews', 'robert.matthews@hies.org'),
    ('Meg Mavity', 'meg.mavity@hies.org'),
    ('Mario Mays', 'mario.mays@hies.org'),
    ('Mary McKibbon', 'mary.mckibbon@hies.org'),
    ('Taylor Mills', 'taylor.mills@hies.org'),
    ('Marines Montalvo', 'marines.montalvo@hies.org'),
    ('Fernando Notario', 'fernando.notario@hies.org'),
    ('Mary Elizabeth Notario', 'mary.notario@hies.org'),
    ('Jordan Oleson-Graves', 'jordan.graves@hies.org'),
    ('Amanda Peckham', 'amanda.peckham@hies.org'),
    ('Jerry Pendrick', 'jerry.pendrick@hies.org'),
    ('Nicholas Perrotta', 'nick.perrotta@hies.org'),
    ('Patrick Pilkey', 'patrick.pilkey@hies.org'),
    ('Jameela Reed', 'jameela.reed@hies.org'),
    ('Stephanie Reiss', 'stephanie.reiss@hies.org'),
    ('Rebecca Rivera', 'rebecca.rivera@hies.org'),
    ('Ana Rodriguez Padial', 'ana.rodriguezpadial@hies.org'),
    ('Adrienne Rowe', 'adrienne.rowe@hies.org'),
    ('Jeff Rowland', 'jeff.rowland@hies.org'),
    ('Jason Rutledge', 'jason.rutledge@hies.org'),
    ('Dorsey Sammataro', 'dorsey.sammataro@hies.org'),
    ('Kara Santana', 'kara.santana@hies.org'),
    ('Tyler Santee', 'tyler.santee@hies.org'),
    ('Amanda Sautter', 'amanda.sautter@hies.org'),
    ('Elizabeth Scholz', 'elizabeth.scholz@hies.org'),
    ('Madison Shumpert', 'maddy.shumpert@hies.org'),
    ('Hannah Spayd', 'hannah.spayd@hies.org'),
    ('Sheldon Staples', 'sheldon.staples@hies.org'),
    ('Eric Stetson', 'eric.stetson@hies.org'),
    ('Stephanie Strickland', 'stephanie.strickland@hies.org'),
    ('Eliza Suarez', 'eliza.suarez@hies.org'),
    ('Letitia Swain', 'tish.swain@hies.org'),
    ('Christopher Swann', 'chris.swann@hies.org'),
    ('John Taylor', 'john.taylor@hies.org'),
    ('Stefanie Taylor', 'stefanie.taylor@hies.org'),
    ('James Teague', 'james.teague@hies.org'),
    ('James Terry', 'james.terry@hies.org'),
    ('Alice Thompson', 'alicethompson@hies.org'),
    ('Lindsey Thompson', 'lindsey.thompson@hies.org'),
    ('Peter Tongren', 'peter.tongren@hies.org'),
    ('Sarah Townsend', 'sarah.townsend@hies.org'),
    ('Kristyn Tumbleson', 'kristyn.tumbleson@hies.org'),
    ('Maria Tuohy', 'maria.tuohy@hies.org'),
    ('Michael Turner', 'michael.turner@hies.org'),
    ('Jeri Waken', 'jeri.waken@hies.org'),
    ('Jennifer Walker', 'jennifer.walker@hies.org'),
    ('Patrick Walsh', 'patrick.walsh@hies.org'),
    ('Mia Washington', 'mia.washington@hies.org'),
    ('Marshall White', 'marshall.white@hies.org'),
    ('Yolanda Wright', 'yolanda.wright@hies.org'),
    ('Zack Wright', 'zachary.wright@hies.org'),
    ('Andrew Wu', 'andrew.wu@hies.org')
),
prepared AS (
  SELECT
    'Prof. ' || trim(raw_name) AS player_name,
    lower(trim(microsoft_email)) AS microsoft_email
  FROM teacher_directory
)
INSERT INTO public.player_profiles
  (player_key, player_name, player_name_key, grade, microsoft_email, source)
SELECT
  lower(trim(player_name)) || '|0' AS player_key,
  player_name,
  lower(trim(player_name)) AS player_name_key,
  0 AS grade,
  microsoft_email,
  'directory_import' AS source
FROM prepared
ON CONFLICT (player_key) DO UPDATE
SET
  microsoft_email = EXCLUDED.microsoft_email,
  updated_at = now()
WHERE player_profiles.microsoft_email IS NULL;
