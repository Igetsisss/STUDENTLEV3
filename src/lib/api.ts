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
  gameType: 'daily' | 'bonus'
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
  const daily = entries.filter((e) => e.gameType === 'daily')
  const map = new Map<string, LeaderboardEntry[]>()
  for (const e of daily) {
    map.set(e.name, [...(map.get(e.name) || []), e])
  }

  const stats: MvpEntry[] = []
  map.forEach((games, name) => {
    const wins = games.filter((g) => g.won)
    const winRate = wins.length / games.length
    const avgGuesses =
      wins.length > 0
        ? wins.reduce((s, g) => s + g.guessCount, 0) / wins.length
        : 7
    // Score: win rate (60pts) + avg guesses quality (30pts) + consistency (10pts)
    const score =
      winRate * 60 +
      (Math.max(0, 6 - avgGuesses) / 6) * 30 +
      (Math.min(games.length, 20) / 20) * 10
    stats.push({
      name,
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
          // Prefer formatted value for dates, fall back to raw value
          if (cell.f != null) return cell.f
          return cell.v
        })
      )
    }
  }
  return rows
}

export const fetchLeaderboard = async (
  date?: string,
  grade?: string
): Promise<LeaderboardEntry[]> => {
  try {
    const res = await fetch(GVIZ_URL)
    const text = await res.text()
    const rows = parseGvizResponse(text)

    const today = date || new Date().toISOString().split('T')[0]
    const results: LeaderboardEntry[] = []

    for (const r of rows) {
      // Columns: 0=name, 1=grade, 2=date, 3=word, 4=won, 5=guessCount,
      //          6=gameType, 7=startTime, 8=endTime, 9=totalDurationSec
      const rowDate = r[2] ? String(r[2]) : ''
      const rowGrade = r[1] != null ? String(r[1]) : ''

      if (today && !rowDate.startsWith(today)) continue
      if (grade && rowGrade !== grade) continue

      results.push({
        name: r[0] || '',
        grade: Number(r[1]) || 0,
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
