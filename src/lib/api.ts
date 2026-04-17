

import { hasSupabaseConfig, supabase } from './supabase'
import { TEACHER_WORDS } from '../teacherWords'
import { getIndex, getSolution, localeAwareUpperCase } from './words'

const SUPABASE_TABLES = {
  gameSubmissions: 'game_submissions',
  keystrokeLogs: 'keystroke_logs',
  playerProfiles: 'player_profiles',
  playerStateSnapshots: 'player_state_snapshots',
  signupEvents: 'signup_events',
} as const

export type GuessData = {
  word: string
  timeSec: number
  keystrokes: number
  deletes: number
}

// ─── Live Keystroke Tracking ────────────────────────────────────────────────

export type KeystrokeEvent = {
  timestamp: string
  keyType:
    | 'char'           // letter successfully added to current guess
    | 'char_blocked'   // letter pressed but couldn't be added
    | 'delete'         // backspace, removed a character
    | 'delete_empty'   // backspace pressed when input was already empty
    | 'delete_blocked' // backspace blocked by modal/animation
    | 'enter_submit'   // valid guess submitted
    | 'enter_blocked'  // enter pressed but rejected
  keyValue: string     // the actual letter, 'BACKSPACE', or 'ENTER'
  reason?: string      // why blocked: 'word_full'|'game_over'|'clearing'|'modal_open'|'too_short'|'invalid_word'|'hard_mode'
  guessNum: number     // which guess row (0-based)
  inputBefore: string  // current guess before the keypress
  inputAfter: string   // current guess after the keypress
};

export type KeystrokeBatchPayload = {
  action: 'keystrokes'
  sessionId: string
  playerName: string
  grade: string
  date: string
  gameType: string
  events: KeystrokeEvent[]
}

export const submitKeystrokeBatch = async (
  sessionId: string,
  meta: { playerName: string; grade: string; date: string; gameType: string },
  events: KeystrokeEvent[]
): Promise<void> => {
  if (!events.length) return
  if (!hasSupabaseConfig || !supabase) return

  try {
    const safePlayerName = sanitizePlayerName(meta.playerName)
    const normalizedGrade = normalizeLegacyGrade(meta.grade)
    const playerKey = buildPlayerStateKey(safePlayerName, normalizedGrade)
    const rows = events.map((event, index) => ({
      session_id: sessionId,
      player_key: playerKey,
      player_name: safePlayerName,
      player_name_key: normalizeNameKey(meta.playerName),
      grade: Number(normalizedGrade) || 0,
      game_date: meta.date,
      game_type: meta.gameType,
      event_timestamp: event.timestamp,
      sequence_number: index,
      key_type: event.keyType,
      key_value: event.keyValue,
      reason: event.reason ?? null,
      guess_number: event.guessNum,
      input_before: event.inputBefore,
      input_after: event.inputAfter,
      received_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from(SUPABASE_TABLES.keystrokeLogs)
      .insert(rows)
    if (!error) return
    console.error('Failed to insert keystroke batch into Supabase:', error)
  } catch (error) {
    console.error('Failed to write keystroke batch to Supabase:', error)
  }
}

export const sendKeystrokeBatch = submitKeystrokeBatch

export type SignupEvent = {
  action: 'signup'
  playerName: string
  grade: string
  registeredAtClient: string
  source: string
  userAgent: string
  screenWidth: number
  screenHeight: number
}

export type CloudPlayerState = {
  updatedAt: string
  state: Record<string, string>
}

export const submitSignupEvent = async (
  playerName: string,
  grade: string,
  source = 'grade_modal'
): Promise<void> => {
  if (!playerName || !grade) return
  if (!hasSupabaseConfig || !supabase) return

  const safePlayerName = sanitizePlayerName(playerName)
  const normalizedGrade = normalizeLegacyGrade(grade)
  const playerKey = buildPlayerStateKey(safePlayerName, normalizedGrade)
  const registeredAtClient = new Date().toISOString()

  try {
    const profile = {
      player_key: playerKey,
      player_name: safePlayerName,
      player_name_key: normalizeNameKey(safePlayerName),
      grade: Number(normalizedGrade) || 0,
      source,
      registered_at_client: registeredAtClient,
      updated_at: registeredAtClient,
    }

    const { error: profileError } = await supabase
      .from(SUPABASE_TABLES.playerProfiles)
      .upsert(profile, { onConflict: 'player_key' })

    if (profileError) {
      console.error('Failed to upsert player profile in Supabase:', profileError)
    }

    const { data: existingSnapshot, error: snapshotReadError } = await supabase
      .from(SUPABASE_TABLES.playerStateSnapshots)
      .select('player_key')
      .eq('player_key', playerKey)
      .limit(1)

    if (snapshotReadError) {
      console.error(
        'Failed to check player snapshot before signup bootstrap:',
        snapshotReadError
      )
    } else if (!existingSnapshot || existingSnapshot.length === 0) {
      const { error: snapshotWriteError } = await supabase
        .from(SUPABASE_TABLES.playerStateSnapshots)
        .insert({
          player_key: playerKey,
          player_name: safePlayerName,
          player_name_key: normalizeNameKey(safePlayerName),
          grade: Number(normalizedGrade) || 0,
          state: {},
          device: navigator.userAgent || '',
          app_version: 'v2',
          updated_at: registeredAtClient,
        })

      if (snapshotWriteError) {
        console.error(
          'Failed to bootstrap player snapshot in Supabase:',
          snapshotWriteError
        )
      }
    }

    const { error: signupError } = await supabase
      .from(SUPABASE_TABLES.signupEvents)
      .insert({
        player_key: playerKey,
        player_name: safePlayerName,
        player_name_key: normalizeNameKey(safePlayerName),
        grade: Number(normalizedGrade) || 0,
        registered_at_client: registeredAtClient,
        source,
        user_agent: navigator.userAgent || '',
        screen_width: window.innerWidth || 0,
        screen_height: window.innerHeight || 0,
      })

    if (!signupError) return
    console.error('Failed to insert signup event into Supabase:', signupError)
  } catch (error) {
    console.error('Failed to write signup data to Supabase:', error)
  }
}

export type GameSubmission = {
  name: string
  grade: string
  date: string
  word: string
  won: boolean
  guessCount: number
  gameType: 'daily' | 'bonus' | 'teachers' | 'grade' | `grade${string}`
  gameStartTime: string
  gameEndTime: string
  totalDurationSec: number
  timeToFirstGuessSec: number
  device: string
  screenWidth: number
  guesses: GuessData[]
}

export type LeaderboardEntry = {
  name: string
  grade: number
  date: string
  word: string
  won: boolean
  guessCount: number
  gameType: string
  totalDurationSec: number
  gameStartTime: string
}

export type MvpEntry = {
  name: string
  grade: number
  totalGames: number
  wins: number
  winRate: number
  avgGuesses: number
  score: number
}

const getDateFromYmd = (dateLike: string): Date | null => {
  const ymd = String(dateLike || '').slice(0, 10)
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return new Date(y, mo, d)
}

const getExpectedDailyWord = (entry: LeaderboardEntry): string | null => {
  const day = getDateFromYmd(entry.date)
  if (!day) return null
  if (String(entry.grade) === '0') {
    const idx = getIndex(day)
    const offset = Math.floor(TEACHER_WORDS.length / 2)
    return localeAwareUpperCase(TEACHER_WORDS[(idx + offset) % TEACHER_WORDS.length])
  }
  return getSolution(day).solution
}

export const isTrueDailyEntry = (entry: LeaderboardEntry): boolean => {
  const type = String(entry.gameType || '').toLowerCase().trim()
  const rowWord = String(entry.word || '').toUpperCase().trim()
  const expectedWord = getExpectedDailyWord(entry)

  if (type === 'daily') {
    return !expectedWord || !rowWord || rowWord === expectedWord
  }
  if (String(entry.grade) === '0' && type === 'teachers') {
    return !expectedWord || !rowWord || rowWord === expectedWord
  }

  // Legacy compatibility: some old daily rows were stored as grade{grade}.
  if (type === `grade${String(entry.grade)}`) {
    return !!expectedWord && !!rowWord && rowWord === expectedWord
  }

  return false
}

export const computeMvp = (entries: LeaderboardEntry[]): MvpEntry | null => {
  // Include ALL game types (daily, bonus, teachers, grade rounds)
  const valid = entries.filter((e) => !String(e.date).startsWith('1970'))

  // Group by player name (case-insensitive)
  const map = new Map<string, LeaderboardEntry[]>()
  for (const e of valid) {
    const key = e.name.toLowerCase().trim()
    map.set(key, [...(map.get(key) || []), e])
  }

  // Max total games any player has played (used to normalize volume score)
  let maxGames = 1
  map.forEach((games) => {
    if (games.length > maxGames) maxGames = games.length
  })

  const stats: MvpEntry[] = []
  map.forEach((games) => {
    // Require at least 3 total games to qualify (not just daily)
    if (games.length < 3) return
    const wins = games.filter((g) => g.won)
    const winRate = wins.length / games.length
    const avgGuesses =
      wins.length > 0
        ? wins.reduce((s, g) => s + g.guessCount, 0) / wins.length
        : 7

    // Scoring:
    // 40 pts — Win rate across all game types
    // 25 pts — Guess efficiency (fewer guesses per win = higher score)
    // 35 pts — Volume: total games played relative to the most-active player
    //           Playing bonus, teachers, and grade rounds all count.
    //           Someone who plays every available option will score highest here.
    const volumeScore = (games.length / maxGames) * 35
    const score =
      winRate * 40 +
      (Math.max(0, 6 - avgGuesses) / 6) * 25 +
      volumeScore

    stats.push({
      name: games[0].name,
      grade: games[0].grade,
      totalGames: games.length,
      wins: wins.length,
      winRate,
      avgGuesses: wins.length > 0 ? avgGuesses : 0,
      score,
    })
  })

  if (stats.length === 0) return null
  return stats.sort((a, b) => b.score - a.score)[0]
}

// Per-player current win streak (consecutive daily wins ending today or yesterday)
export const computeStreaks = (entries: LeaderboardEntry[]): Map<string, number> => {
  const dailyWins = entries.filter(
    (e) => isTrueDailyEntry(e) && e.won && e.name && !String(e.date).startsWith('1970')
  )

  const byPlayer = new Map<string, Set<string>>()
  for (const e of dailyWins) {
    const key = e.name.toLowerCase().trim()
    const dateStr = String(e.date).slice(0, 10)
    if (!byPlayer.has(key)) byPlayer.set(key, new Set())
    byPlayer.get(key)!.add(dateStr)
  }

  const streaks = new Map<string, number>()
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  byPlayer.forEach((winDates, key) => {
    let startStr: string
    if (winDates.has(todayStr)) {
      startStr = todayStr
    } else if (winDates.has(yesterdayStr)) {
      startStr = yesterdayStr
    } else {
      streaks.set(key, 0)
      return
    }

    let streak = 0
    const check = new Date(startStr + 'T12:00:00Z')
    while (streak < 365) {
      const ds = check.toISOString().split('T')[0]
      if (winDates.has(ds)) {
        streak++
        check.setUTCDate(check.getUTCDate() - 1)
      } else {
        break
      }
    }
    streaks.set(key, streak)
  })

  return streaks
}

// Submit historical games reconstructed from localStorage stats when a player
// creates a new account for the first time. winDistribution[i] = wins in i+1 guesses.
// gamesFailed = total losses. Submitted with placeholder date/word since we only
// have aggregate data. These are backfilled into Supabase using placeholder
// dates so they stay out of date-based leaderboard views while preserving
// all-time volume and win-rate history.
export const submitHistoricalStats = async (
  name: string,
  grade: string,
  winDistribution: number[],
  gamesFailed: number
) => {
  if (!hasSupabaseConfig || !supabase) return

  const placeholder = '1970-01-01'
  const now = new Date().toISOString()
  const base = {
    gameType: 'daily' as const,
    date: placeholder,
    word: 'XXXXX',
    gameStartTime: now,
    gameEndTime: now,
    totalDurationSec: 0,
    timeToFirstGuessSec: 0,
    device: 'historical',
    screenWidth: 0,
    guesses: [],
  }

  const submissions: GameSubmission[] = []

  winDistribution.forEach((count, index) => {
    for (let submitCount = 0; submitCount < count; submitCount++) {
      submissions.push({ ...base, name, grade, won: true, guessCount: index + 1 })
    }
  })

  for (let submitCount = 0; submitCount < gamesFailed; submitCount++) {
    submissions.push({ ...base, name, grade, won: false, guessCount: 6 })
  }

  for (const submission of submissions) {
    try {
      await submitGameData(submission)
    } catch {
      // Never block account creation on historical backfill failures.
    }
  }
}

export const submitGameData = async (data: GameSubmission): Promise<void> => {
  if (!hasSupabaseConfig || !supabase) return

  const safeName = sanitizePlayerName(data.name)
  const normalizedGrade = normalizeLegacyGrade(data.grade)
  const playerKey = buildPlayerStateKey(safeName, normalizedGrade)

  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.gameSubmissions)
      .insert({
        player_key: playerKey,
        player_name: safeName,
        player_name_key: normalizeNameKey(safeName),
        grade: Number(normalizedGrade) || 0,
        game_date: data.date,
        word: data.word,
        won: data.won,
        guess_count: data.guessCount,
        game_type: data.gameType,
        game_start_time: data.gameStartTime,
        game_end_time: data.gameEndTime,
        total_duration_sec: data.totalDurationSec,
        time_to_first_guess_sec: data.timeToFirstGuessSec,
        device: data.device,
        screen_width: data.screenWidth,
        guesses: data.guesses,
      })

    if (!error) return
    console.error('Failed to insert game submission into Supabase:', error)
  } catch (error) {
    console.error('Failed to write game submission to Supabase:', error)
  }
}



const normalizeLegacyGrade = (rawGrade: string): string => {
  const clean = String(rawGrade || '').replace(/"/g, '').trim()
  const legacyMap: Record<string, string> = {
    '8': '11',
    '27': '11',
    '7': '10',
    '28': '10',
  }
  return legacyMap[clean] || clean
}

const normalizeNameKey = (name: string): string =>
  String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()

const buildPlayerStateKey = (playerName: string, grade: string): string =>
  `${normalizeNameKey(playerName)}|${normalizeLegacyGrade(grade)}`

// Strips characters that have no place in a school player name.
// Allows letters (including accented), spaces, apostrophes, and hyphens.
const SAFE_NAME_RE = /^[\p{L}\p{M}'\- ]{1,60}$/u
const sanitizePlayerName = (name: string): string => {
  const trimmed = String(name || '').trim()
  if (!SAFE_NAME_RE.test(trimmed)) {
    // Remove any character that is not a letter, accent, space, apostrophe, or hyphen.
    return trimmed.replace(/[^\p{L}\p{M}'\- ]/gu, '').slice(0, 60).trim()
  }
  return trimmed
}
export const syncPlayerStateToCloud = async (
  playerName: string,
  grade: string,
  state: Record<string, string>
): Promise<void> => {
  const cleanName = String(playerName || '').trim()
  const cleanGrade = normalizeLegacyGrade(grade)
  if (!cleanName || !cleanGrade) return

  if (!hasSupabaseConfig || !supabase) return

  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from(SUPABASE_TABLES.playerStateSnapshots)
      .upsert(
        {
          player_key: buildPlayerStateKey(cleanName, cleanGrade),
          player_name: cleanName,
          player_name_key: normalizeNameKey(cleanName),
          grade: Number(cleanGrade) || 0,
          state,
          device: navigator.userAgent || '',
          app_version: 'v2',
          updated_at: now,
        },
        { onConflict: 'player_key' }
      )
    if (!error) return
    console.error('Failed to sync player state to Supabase:', error)
  } catch (error) {
    console.error('Failed to write cloud state to Supabase:', error)
  }
}

export const fetchPlayerStateFromCloud = async (
  playerName: string,
  grade: string
): Promise<CloudPlayerState | null> => {
  const key = buildPlayerStateKey(playerName, grade)
  if (!key || key === '|') return null

  if (!hasSupabaseConfig || !supabase) return null

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.playerStateSnapshots)
      .select('updated_at, state')
      .eq('player_key', key)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Failed to fetch cloud state from Supabase:', error)
    } else if (data && data.length > 0) {
      const latest = data[0] as { updated_at: string; state: Record<string, string> }
      return { updatedAt: latest.updated_at, state: latest.state || {} }
    }
  } catch (error) {
    console.error('Failed to read cloud state from Supabase:', error)
  }
  return null
}



export type AllTimeEntry = {
  name: string
  grade: number
  totalDays: number
  wins: number
  winRate: number
  avgGuesses: number
}

const isOwnGradeDailyEntry = (e: LeaderboardEntry): boolean => {
  return isTrueDailyEntry(e)
}

const isBetterResult = (a: LeaderboardEntry, b: LeaderboardEntry): boolean => {
  if (a.won !== b.won) return a.won && !b.won
  if (a.guessCount !== b.guessCount) return a.guessCount < b.guessCount
  return a.totalDurationSec < b.totalDurationSec
}

export const computeAllTimeLeaderboard = (entries: LeaderboardEntry[]): AllTimeEntry[] => {
  const daily = entries.filter(
    (e) => isOwnGradeDailyEntry(e) && !String(e.date).startsWith('1970')
  )
  const map = new Map<string, LeaderboardEntry[]>()
  for (const e of daily) {
    const key = e.name.toLowerCase().trim()
    map.set(key, [...(map.get(key) || []), e])
  }
  const result: AllTimeEntry[] = []
  map.forEach((games) => {
    // Count one daily outcome per date: keep each player's best result that day.
    const byDate = new Map<string, LeaderboardEntry>()
    for (const g of games) {
      const dateKey = String(g.date || '').slice(0, 10)
      if (!dateKey) continue
      const existing = byDate.get(dateKey)
      if (!existing || isBetterResult(g, existing)) {
        byDate.set(dateKey, g)
      }
    }

    const dayResults = Array.from(byDate.values())
    const wins = dayResults.filter((g) => g.won)
    const avgGuesses =
      wins.length > 0
        ? wins.reduce((s, g) => s + g.guessCount, 0) / wins.length
        : 0
    result.push({
      name: games[0].name,
      grade: games[0].grade,
      totalDays: dayResults.length,
      wins: wins.length,
      winRate: dayResults.length > 0 ? wins.length / dayResults.length : 0,
      avgGuesses,
    })
  })
  return result.sort((a, b) => {
    if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.winRate - a.winRate
  })
}

export const fetchLeaderboard = async (
  date?: string,
  grade?: string,
  allTime?: boolean
): Promise<LeaderboardEntry[]> => {
  if (!hasSupabaseConfig || !supabase) return []

  const _fd = new Date()
  const localToday = `${_fd.getFullYear()}-${String(_fd.getMonth() + 1).padStart(2, '0')}-${String(_fd.getDate()).padStart(2, '0')}`
  const today = allTime ? '' : (date || localToday)
  const selectedGrade = grade ? normalizeLegacyGrade(grade) : ''

  // Legacy display-name / grade corrections
  // Key: normalized lowercase name, irrespective of stored grade.
  const legacyNameAliases: Record<string, { name: string; grade: number }> = {
    'harvey m': { name: 'Mrs. Harvey', grade: 0 },
    'evan bassett': { name: 'Dr. Bassett', grade: 0 },
    'bassett evan': { name: 'Dr. Bassett', grade: 0 },
    'katie cruce': { name: 'Mrs. Cruce', grade: 0 },
    'amanda adams': { name: 'Mrs. Adams', grade: 0 },
  }
  try {
    let query = supabase
      .from(SUPABASE_TABLES.gameSubmissions)
      .select(
        'player_name, grade, game_date, word, won, guess_count, game_type, total_duration_sec, game_start_time'
      )

    if (today) {
      query = query.eq('game_date', today)
    }

    if (selectedGrade) {
      query = query.eq('grade', Number(selectedGrade) || 0)
    }

    const { data, error } = await query.limit(50000)
    if (error) {
      console.error('Failed to fetch leaderboard from Supabase:', error)
    } else {
      const results: LeaderboardEntry[] = []

      for (const row of data ?? []) {
        const rawName = row.player_name ? String(row.player_name) : ''
        const rowType = String(row.game_type || 'daily').toLowerCase().trim()
        const rowGrade = row.grade != null ? normalizeLegacyGrade(String(row.grade)) : ''
        const alias = legacyNameAliases[normalizeNameKey(rawName)]
        const finalName = alias ? alias.name : rawName
        const finalGrade = alias ? String(alias.grade) : rowGrade

        if (rowType === 'signup') continue
        if (selectedGrade && finalGrade !== selectedGrade) continue
        if (!finalName || !String(finalName).trim()) continue

        results.push({
          name: finalName,
          grade: Number(finalGrade) || 0,
          date: row.game_date ? String(row.game_date) : '',
          word: row.word ? String(row.word) : '',
          won: Boolean(row.won),
          guessCount: Number(row.guess_count) || 0,
          gameType: rowType,
          totalDurationSec: Number(row.total_duration_sec) || 0,
          gameStartTime: row.game_start_time ? String(row.game_start_time) : '',
        })
      }

      results.sort((a, b) => {
        if (a.won !== b.won) return a.won ? -1 : 1
        if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
        return a.totalDurationSec - b.totalDurationSec
      })

      return results
    }
  } catch (err) {
    console.error('Failed to fetch leaderboard from Supabase:', err)
  }

  return []
}

// Returns the list of words submitted today for a player's daily game, in guess
// order. Uses the most-recent session when multiple sessions exist.
export const fetchTodayInProgress = async (
  displayName: string
): Promise<string[]> => {
  if (!hasSupabaseConfig || !supabase) return []

  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.keystrokeLogs)
      .select('session_id, received_at, key_type, sequence_number, input_before')
      .eq('player_name_key', normalizeNameKey(displayName))
      .eq('game_date', today)
      .eq('game_type', 'daily')
      .order('received_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch in-progress keystrokes from Supabase:', error)
    } else if (data && data.length > 0) {
      const bySession: Record<string, { rows: typeof data; latestTs: number }> = {}
      for (const row of data) {
        const sid = String(row.session_id || 'default')
        const ts = row.received_at ? new Date(String(row.received_at)).getTime() : 0
        if (!bySession[sid]) bySession[sid] = { rows: [], latestTs: 0 }
        bySession[sid].rows.push(row)
        if (ts > bySession[sid].latestTs) bySession[sid].latestTs = ts
      }

      const latestSession = Object.values(bySession).sort(
        (a, b) => b.latestTs - a.latestTs
      )[0]

      return latestSession.rows
        .filter((row: any) => row.key_type === 'enter_submit')
        .sort(
          (a: any, b: any) =>
            (Number(a.sequence_number) || 0) - (Number(b.sequence_number) || 0)
        )
        .map((row: any) => String(row.input_before || '').toUpperCase())
        .filter((word: any) => word.length === 5)
    }
  } catch (error) {
    console.error('Failed to read in-progress keystrokes from Supabase:', error)
  }

  return []
}
