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

const fetchJsonp = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = '_lb_cb_' + Date.now()
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as any)[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    ;(window as any)[callbackName] = (data: any) => {
      cleanup()
      resolve(data)
    }

    script.src = url + '&callback=' + callbackName
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP request failed'))
    }

    document.body.appendChild(script)

    setTimeout(() => {
      cleanup()
      reject(new Error('JSONP timeout'))
    }, 15000)
  })
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
    const json = await fetchJsonp(url)

    if (json.status === 'ok') {
      return json.data || []
    }
    return []
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
    return []
  }
}
