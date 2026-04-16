# Studentle

Forked from Reactle.

This is a clone project of the popular word guessing game we all know and love. Made using 

, Typescript, and Tailwind.

Try it out: https://studentle.jackunderwood.org

## Build and run

### To Run Locally:

Clone the repository and perform the following command line actions:

```bash
$> cd STUDENTLEV3
$> npm install
$> npm run start
```

### Supabase setup

The app now supports a Supabase backend for leaderboard data, signup events,
keystroke logs, and cloud state snapshots.

1. Create a Supabase project.
2. Run the SQL in [supabase/schema.sql](supabase/schema.sql).
3. Copy [.env.example](.env.example) to `.env.local` and fill in:

```bash
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...
```

The app uses Supabase automatically whenever the URL and anon key are present.
If those variables are missing, the legacy Google Sheets fallback remains
available for leaderboard reads.

If your Supabase project was created before these policies were applied, run
[supabase/fix-rls.sql](supabase/fix-rls.sql) in the Supabase SQL editor. This
repairs the anon grants and row-level security policies used by signup,
leaderboard, keystroke logging, and cloud state sync.

### Migrate legacy Google Sheets data

There is a one-off migration script that reads the legacy Google Sheets data
and inserts it into Supabase.

Required environment variables for the migration script:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
LEGACY_GOOGLE_SHEET_ID=1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg
```

Then run:

```bash
npm run migrate:sheets-to-supabase
```

The script aborts if any of the destination tables already contain rows, so it
is safe against accidental duplicate imports.

### To build/run docker container:

#### Development

```bash
$> docker build -t STUDENTLEV3:dev -f docker/Dockerfile .
$> docker run -d -p 3000:3000 --name STUDENTLEV3-dev STUDENTLEV3:dev
```

Open [http://localhost:3000](http://localhost:3000) in browser.

#### Production

```bash
$> docker build --target=prod -t STUDENTLEV3:prod -f docker/Dockerfile .
$> docker run -d -p 80:8080  --name STUDENTLEV3-prod STUDENTLEV3:prod
```

Open [http://localhost](http://localhost) in browser.
