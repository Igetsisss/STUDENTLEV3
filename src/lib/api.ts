const API_URL =
  'https://script.google.com/macros/s/AKfycbz7Q2SSXWC3yuT2TdsMN10X-YwKIEIZlBTXAp_C30YEy22wcwRzOYAlmLjSP97KAzna/exec'

export type GuessData = {
  word: string
  timeSec: number
  keystrokes: number
  deletes: number
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
