# Studentle AI Notes

## Product intent

- Studentle started as a personal school project in 8th grade.
- It later returned in junior year with more than 100 students playing daily.
- Current gameplay includes the daily puzzle, bonus rounds, teacher rounds, grade rounds, a live leaderboard, all-time standings, and MVP scoring.

## Backend direction

- Live runtime is Supabase-only.
- Google Sheets is no longer a live backend.
- The only remaining Google Sheets usage should be the one-time migration path:
  - `scripts/migrate-google-sheets-to-supabase.js`
  - `.github/workflows/migrate-sheets-to-supabase.yml`
- Do not reintroduce Google Sheets reads or writes into the runtime app unless explicitly requested.

## Data expectations

- `game_submissions` is the source of truth for leaderboard and all-time views.
- `keystroke_logs` is the source of truth for in-progress restore.
- `player_state_snapshots` is the source of truth for cross-device state sync.
- `signup_events` and `player_profiles` support account bootstrap and analytics.

## Privacy and sensitive data

- Never commit real student or teacher email lists, directories, or other files containing personal contact information.
- Prefer redacted examples, generated placeholders, or local-only files for school data that is not required in the public repo.
- If a task involves staff or student records, keep sensitive data out of git and out of runtime code unless explicitly required and safely handled.

## Gameplay expectations

- Daily standings should reflect the player's own daily game and the grade they are currently registered in.
- Teachers use the teacher daily path. Teachers also have a separate teacher bonus round.
- Grade bonus rounds are separate from normal daily standings. If a junior plays the senior round, it should not count toward their normal daily play, but it should count toward all-time and MVP calculations.
- Placeholder historical imports use `1970-01-01` so they count toward all-time/MVP calculations without polluting daily leaderboard views.
- MVP should consider all supported game modes, not just daily play.

## Change management

- Prefer incremental, reversible changes.
- Keep migration-related code isolated from runtime code.
- When working on Supabase, preserve or improve compatibility with the migration workflow.
- Avoid pushing directly to `main` unless explicitly asked.
- When investigating login, signup, or cross-device issues, treat incomplete localStorage state and shared-device state as likely failure modes.