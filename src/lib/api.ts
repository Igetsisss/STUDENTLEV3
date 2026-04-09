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

export const fetchLeaderboard = async (
  date?: string,
  grade?: string
): Promise<LeaderboardEntry[]> => {
  try {
    const params = new URLSearchParams({ action: 'leaderboard' })
    if (date) params.set('date', date)
    if (grade) params.set('grade', grade)

    const url = `${API_URL}?${params.toString()}`
    const res = await fetch(url, { redirect: 'follow' })

    if (!res.ok) {
      console.error('Leaderboard response not ok:', res.status, res.statusText)
      return []
    }

    const text = await res.text()
    console.log('Leaderboard raw response:', text.substring(0, 200))

    const json = JSON.parse(text)
    if (json.status === 'ok') {
      return json.data || []
    }
    console.error('Leaderboard status not ok:', json)
    return []
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
    return []
  }
}
