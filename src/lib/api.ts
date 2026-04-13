const API_URL =
  'https://script.google.com/macros/s/AKfycbz7Q2SSXWC3yuT2TdsMN10X-YwKIEIZlBTXAp_C30YEy22wcwRzOYAlmLjSP97KAzna/exec'

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
}

export type KeystrokeBatchPayload = {
  action: 'keystrokes'
  sessionId: string
  playerName: string
  grade: string
  date: string
  gameType: string
  events: KeystrokeEvent[]
}

export const sendKeystrokeBatch = async (
  sessionId: string,
  meta: { playerName: string; grade: string; date: string; gameType: string },
  events: KeystrokeEvent[]
): Promise<void> => {
  if (!events.length) return
  try {
    fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'keystrokes', sessionId, ...meta, events }),
    })
  } catch {
    // fire-and-forget, never block the game
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
  won: boolean
  guessCount: number
  gameType: string
  totalDurationSec: number
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
    (e) => e.gameType === 'daily' && e.won && e.name && !String(e.date).startsWith('1970')
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
// have aggregate data. The Apps Script simply appends rows — duplicates are safe
// because the leaderboard fetches by date and historical entries use a past placeholder.
export const submitHistoricalStats = async (
  name: string,
  grade: string,
  winDistribution: number[],
  gamesFailed: number
): Promise<void> => {
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

  winDistribution.forEach((count, i) => {
    for (let j = 0; j < count; j++) {
      submissions.push({ ...base, name, grade, won: true, guessCount: i + 1 })
    }
  })
  for (let j = 0; j < gamesFailed; j++) {
    submissions.push({ ...base, name, grade, won: false, guessCount: 6 })
  }

  // Fire-and-forget each one; failures are silent so they don't block account creation
  for (const data of submissions) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch { /* ignore */ }
  }
}

export const submitGameData = async (data: GameSubmission): Promise<void> => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (err) {
    console.error('Failed to submit game data:', err)
  }
}

const SHEET_ID = '1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg'
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`

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

const parseGvizResponse = (text: string): any[][] => {
  // Response is: /*O_o*/\ngoogle.visualization.Query.setResponse({...})
  const jsonStr = text
    .replace(/^[^(]*\(/, '')
    .replace(/\);?\s*$/, '')
  const data = JSON.parse(jsonStr)
  const rows: any[][] = []
  if (data.table && data.table.rows) {
    for (const row of data.table.rows) {
      rows.push(
        row.c.map((cell: any) => {
          if (!cell) return null
          // gviz encodes date cells as Date(YYYY,M,D) with 0-indexed month.
          // Always convert these to ISO YYYY-MM-DD so date comparisons are reliable
          // regardless of the sheet's display locale/format.
          if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
            const m = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/)
            if (m) {
              const y = m[1]
              const mo = String(Number(m[2]) + 1).padStart(2, '0')
              const d = String(Number(m[3])).padStart(2, '0')
              return `${y}-${mo}-${d}`
            }
          }
          if (cell.f != null) return cell.f
          return cell.v
        })
      )
    }
  }
  return rows
}

export type AllTimeEntry = {
  name: string
  grade: number
  totalGames: number
  wins: number
  winRate: number
  avgGuesses: number
}

export const computeAllTimeLeaderboard = (entries: LeaderboardEntry[]): AllTimeEntry[] => {
  const daily = entries.filter(
    (e) => e.gameType === 'daily' && !String(e.date).startsWith('1970')
  )
  const map = new Map<string, LeaderboardEntry[]>()
  for (const e of daily) {
    const key = e.name.toLowerCase().trim()
    map.set(key, [...(map.get(key) || []), e])
  }
  const result: AllTimeEntry[] = []
  map.forEach((games, key) => {
    const wins = games.filter((g) => g.won)
    const avgGuesses =
      wins.length > 0
        ? wins.reduce((s, g) => s + g.guessCount, 0) / wins.length
        : 0
    result.push({
      name: games[0].name,
      grade: games[0].grade,
      totalGames: games.length,
      wins: wins.length,
      winRate: wins.length / games.length,
      avgGuesses,
    })
  })
  return result.sort((a, b) => b.totalGames - a.totalGames)
}

export const fetchLeaderboard = async (
  date?: string,
  grade?: string,
  allTime?: boolean
): Promise<LeaderboardEntry[]> => {
  try {
    const res = await fetch(GVIZ_URL)
    const text = await res.text()
    const rows = parseGvizResponse(text)

    const _fd = new Date()
    const localToday = `${_fd.getFullYear()}-${String(_fd.getMonth() + 1).padStart(2, '0')}-${String(_fd.getDate()).padStart(2, '0')}`
    const today = allTime ? '' : (date || localToday)
    const results: LeaderboardEntry[] = []

    // Legacy display-name / grade corrections
    // Key: "name|grade" (lowercase name, numeric grade as stored)
    const legacyFixes: Record<string, { name: string; grade: number }> = {
      'harvey m|11': { name: 'Mrs. Harvey', grade: 0 },
    }

    const selectedGrade = grade ? normalizeLegacyGrade(grade) : ''

    for (const r of rows) {
      // Columns: 0=name, 1=grade, 2=date, 3=word, 4=won, 5=guessCount,
      //          6=gameType, 7=startTime, 8=endTime, 9=totalDurationSec
      const rowDate = r[2] ? String(r[2]) : ''
      const rowGrade = r[1] != null ? normalizeLegacyGrade(String(r[1])) : ''

      if (today && !rowDate.startsWith(today)) continue
      if (selectedGrade && rowGrade !== selectedGrade) continue
      if (!r[0] || !String(r[0]).trim()) continue // skip nameless entries

      const fixKey = `${String(r[0]).toLowerCase().trim()}|${Number(rowGrade) || 0}`
      const fix = legacyFixes[fixKey]

      results.push({
        name: fix ? fix.name : (r[0] || ''),
        grade: fix ? fix.grade : (Number(rowGrade) || 0),
        date: rowDate,
        won: r[4] === true || r[4] === 'TRUE',
        guessCount: Number(r[5]) || 0,
        gameType: r[6] || 'daily',
        totalDurationSec: Number(r[9]) || 0,
      })
    }

    results.sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1
      if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
      return a.totalDurationSec - b.totalDurationSec
    })

    return results
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
    return []
  }
}

// Reads KeystrokeLogs sheet and returns the list of words submitted today
// for a given player's daily game, in guess order. Uses the most-recent session
// when multiple sessions exist (e.g. they started on one device then switched).
export const fetchTodayInProgress = async (
  displayName: string
): Promise<string[]> => {
  const GVIZ_KEYS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=KeystrokeLogs`
  try {
    const res = await fetch(GVIZ_KEYS)
    const text = await res.text()
    const rows = parseGvizResponse(text)
    const today = new Date().toISOString().split('T')[0]
    const name = displayName.toLowerCase()

    // All today's daily events for this player
    // Columns: [0]=receivedAt [1]=sessionId [2]=playerName [3]=grade
    //          [4]=date [5]=gameType [6]=eventTimestamp [7]=seq
    //          [8]=keyType [9]=keyValue [10]=reason [11]=guessNum
    //          [12]=inputBefore [13]=inputAfter
    const todayRows = rows.filter(
      (r) =>
        r[2] && r[2].toString().toLowerCase() === name &&
        r[4] && String(r[4]).startsWith(today) &&
        r[5] === 'daily'
    )
    if (!todayRows.length) return []

    // Group by sessionId, pick the most-recent session
    const bySession: Record<string, { rows: any[]; latestTs: number }> = {}
    for (const r of todayRows) {
      const sid = String(r[1] || 'default')
      const ts = r[0] ? new Date(r[0]).getTime() : 0
      if (!bySession[sid]) bySession[sid] = { rows: [], latestTs: 0 }
      bySession[sid].rows.push(r)
      if (ts > bySession[sid].latestTs) bySession[sid].latestTs = ts
    }
    const latestSession = Object.values(bySession).sort(
      (a, b) => b.latestTs - a.latestTs
    )[0]

    // Extract enter_submit events in seq order; inputBefore = the submitted word
    return latestSession.rows
      .filter((r) => r[8] === 'enter_submit')
      .sort((a, b) => (Number(a[7]) || 0) - (Number(b[7]) || 0))
      .map((r) => String(r[12] || '').toUpperCase())
      .filter((w) => w.length === 5)
  } catch {
    return []
  }
}
