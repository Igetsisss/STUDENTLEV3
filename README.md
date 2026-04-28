# Studentle

Studentle is a school-wide Wordle-style game I started in 8th grade. At its peak, more than 100 students were playing it every day. In junior year I brought it back and expanded it with a live leaderboard, MVP tracking, teacher rounds, bonus rounds, and grade-vs-grade play.

The current codebase is built to run on Supabase for all live app data. Google Sheets is kept only as a one-time legacy import source so historical data can be migrated when you are ready.

Try it out: https://studentle.org

## Features

- Daily play for students and teachers
- Bonus rounds and grade rounds
- Live leaderboard and all-time leaderboard
- MVP scoring across all supported game modes
- Cloud-backed state recovery and keystroke logging
- Legacy Google Sheets to Supabase migration workflow

## Tech Stack

- React 17
- TypeScript
- Tailwind CSS
- Supabase
- GitHub Actions

## Local Development

```bash
cd STUDENTLEV3
npm install
npm run start
```

## Supabase Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. Run [supabase/fix-rls.sql](supabase/fix-rls.sql).
4. Copy [.env.example](.env.example) to `.env.local` and set:

```bash
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...
```

The runtime app is Supabase-only. If those variables are missing, the app will not have a live backend.

## Legacy Data Migration

Google Sheets is no longer part of the live runtime. It is retained only as a legacy import source.

There are two migration paths:

1. Local script

```bash
npm run migrate:sheets-to-supabase
```

Required environment variables:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
LEGACY_GOOGLE_SHEET_ID=1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg
```

2. GitHub Action

Use the workflow at [.github/workflows/migrate-sheets-to-supabase.yml](.github/workflows/migrate-sheets-to-supabase.yml) and provide these repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEGACY_GOOGLE_SHEET_ID`

The migration script aborts if destination tables already contain rows unless truncation is explicitly enabled.

## Deployment Notes

Set these frontend environment variables in your host:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Docker

Development:

```bash
docker build -t STUDENTLEV3:dev -f docker/Dockerfile .
docker run -d -p 3000:3000 --name STUDENTLEV3-dev STUDENTLEV3:dev
```

Production:

```bash
docker build --target=prod -t STUDENTLEV3:prod -f docker/Dockerfile .
docker run -d -p 80:8080 --name STUDENTLEV3-prod STUDENTLEV3:prod
```
