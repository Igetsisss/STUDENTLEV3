grant usage on schema public to anon, authenticated;

grant select, insert on table public.signup_events to anon, authenticated;
grant select, insert, update on table public.player_profiles to anon, authenticated;
grant select, insert, update on table public.player_state_snapshots to anon, authenticated;
grant select, insert on table public.game_submissions to anon, authenticated;
grant select, insert on table public.keystroke_logs to anon, authenticated;

alter table public.player_profiles enable row level security;
alter table public.signup_events enable row level security;
alter table public.player_state_snapshots enable row level security;
alter table public.game_submissions enable row level security;
alter table public.keystroke_logs enable row level security;

drop policy if exists "anon_select_game_submissions" on public.game_submissions;
drop policy if exists "anon_insert_game_submissions" on public.game_submissions;
drop policy if exists "anon_select_keystroke_logs" on public.keystroke_logs;
drop policy if exists "anon_insert_keystroke_logs" on public.keystroke_logs;
drop policy if exists "anon_insert_signup_events" on public.signup_events;
drop policy if exists "anon_select_player_state_snapshots" on public.player_state_snapshots;
drop policy if exists "anon_insert_player_state_snapshots" on public.player_state_snapshots;
drop policy if exists "anon_update_player_state_snapshots" on public.player_state_snapshots;
drop policy if exists "anon_insert_player_profiles" on public.player_profiles;
drop policy if exists "anon_update_player_profiles" on public.player_profiles;

create policy "anon_select_game_submissions"
  on public.game_submissions
  for select
  to anon
  using (true);

create policy "anon_insert_game_submissions"
  on public.game_submissions
  for insert
  to anon
  with check (true);

-- anon_select_keystroke_logs intentionally omitted:
-- anonymous users should not be able to read raw keystroke data.

create policy "anon_insert_keystroke_logs"
  on public.keystroke_logs
  for insert
  to anon
  with check (true);

create policy "anon_insert_signup_events"
  on public.signup_events
  for insert
  to anon
  with check (true);

create policy "anon_select_player_state_snapshots"
  on public.player_state_snapshots
  for select
  to anon
  using (true);

create policy "anon_insert_player_state_snapshots"
  on public.player_state_snapshots
  for insert
  to anon
  with check (true);

create policy "anon_update_player_state_snapshots"
  on public.player_state_snapshots
  for update
  to anon
  using (true)
  with check (true);

create policy "anon_insert_player_profiles"
  on public.player_profiles
  for insert
  to anon
  with check (true);

create policy "anon_update_player_profiles"
  on public.player_profiles
  for update
  to anon
  using (true)
  with check (true);