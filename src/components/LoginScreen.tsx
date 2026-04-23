import { useState } from 'react'

import { FRESHMAN, JUNIOR, SENIOR, SOPHOMORE } from '../constants/wordlist'
import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'
import { getGuessStatuses } from '../lib/statuses'

type TileState = 'correct' | 'present' | 'absent' | 'empty'
type BoardRow = { letters: string[]; states: TileState[] }
type GradeBoard = { grade: 9 | 10 | 11 | 12; rows: BoardRow[] }

const TILE_COLORS: Record<TileState, string> = {
  correct: '#22c55e',
  present: '#eab308',
  absent: '#64748b',
  empty: '#ffffff',
}

const FIRST_GAME_DATE = new Date(2023, 2, 1)
const DAY_MS = 24 * 60 * 60 * 1000
const HISTORIC_OFFSETS = [14, 72]
const WALLPAPER_BOARDS_PER_ROW = 10
const WALLPAPER_STRIP_COUNT = 4

const getHistoricIndex = (daysAgo: number) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const elapsed = Math.floor((today.getTime() - FIRST_GAME_DATE.getTime()) / DAY_MS)
  return Math.max(0, elapsed - daysAgo)
}

const pickGuessFromList = (
  list: string[],
  solution: string,
  length: number,
  startIndex: number,
  shift: number
) => {
  for (let i = 0; i < list.length; i++) {
    const candidate = list[(startIndex + shift + i) % list.length].toUpperCase()
    if (candidate.length === length && candidate !== solution) {
      return candidate
    }
  }
  return solution
}

const createBoardRows = (solution: string, list: string[], index: number): BoardRow[] => {
  const length = solution.length
  const guesses = [
    pickGuessFromList(list, solution, length, index, 3),
    pickGuessFromList(list, solution, length, index, 11),
    pickGuessFromList(list, solution, length, index, 19),
    solution,
  ]

  const rows = guesses.map((guess) => {
    const letters = guess.split('')
    const states = getGuessStatuses(solution, guess) as TileState[]
    return { letters, states }
  })

  while (rows.length < 6) {
    rows.push({
      letters: Array.from({ length }, () => ''),
      states: Array.from({ length }, () => 'empty' as TileState),
    })
  }

  return rows
}

const GRADE_BOARDS: GradeBoard[] = (() => {
  const gradeSources: Array<{ grade: 9 | 10 | 11 | 12; words: string[] }> = [
    { grade: 9, words: FRESHMAN },
    { grade: 10, words: SOPHOMORE },
    { grade: 11, words: JUNIOR },
    { grade: 12, words: SENIOR },
  ]

  return gradeSources.flatMap(({ grade, words }) => {
    return HISTORIC_OFFSETS.map((daysAgo) => {
      const index = getHistoricIndex(daysAgo)
      const solution = words[index % words.length].toUpperCase()
      return {
        grade,
        rows: createBoardRows(solution, words, index),
      }
    })
  })
})()

type Props = {
  wrongDomain?: boolean
}

const FakeBoard = ({ seed }: { seed: number }) => {
  const board = GRADE_BOARDS[seed % GRADE_BOARDS.length]

  return (
    <div className="login-board-wallpaper-card">
      <div className="login-board-wallpaper-card-grid">
        {board.rows.map((row, rowIndex) => (
          <div key={`${seed}-${rowIndex}`} className="login-board-wallpaper-row">
            {row.letters.map((letter, tileIndex) => {
              const state = row.states[tileIndex]
              return (
                <div
                  key={`${seed}-${rowIndex}-${tileIndex}`}
                  className="login-board-wallpaper-tile"
                  style={{
                    background: TILE_COLORS[state],
                    color: state === 'empty' ? 'transparent' : '#ffffff',
                  }}
                >
                  {letter}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

const WallpaperStrip = ({ seedOffset, reverse }: { seedOffset: number; reverse: boolean }) => {
  const seeds = Array.from({ length: WALLPAPER_BOARDS_PER_ROW }, (_, i) =>
    (seedOffset + i) % GRADE_BOARDS.length
  )
  // Duplicate for seamless infinite scroll loop
  const allSeeds = [...seeds, ...seeds]
  return (
    <div className={`login-wallpaper-strip${reverse ? ' login-wallpaper-strip-reverse' : ''}`}>
      {allSeeds.map((seed, i) => (
        <FakeBoard key={`${seedOffset}-${i}`} seed={seed} />
      ))}
    </div>
  )
}

export const LoginScreen = ({ wrongDomain = false }: Props) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const isDark =
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!isSchoolEmail(trimmed)) {
      setError(`Only @${ALLOWED_DOMAIN} emails are allowed.`)
      return
    }
    setIsLoading(true)
    try {
      await sendMagicLink(trimmed)
      setSent(true)
    } catch {
      setError('Could not send the link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="login-wallpaper-bg">
            {Array.from({ length: WALLPAPER_STRIP_COUNT }, (_, i) => (
              <WallpaperStrip
                key={i}
                seedOffset={(i * WALLPAPER_BOARDS_PER_ROW) % GRADE_BOARDS.length}
                reverse={i % 2 === 1}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
          {/* Navbar-style header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
              Studentle
            </h1>
            <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-black opacity-20 dark:bg-white" />
          </div>

          {/* Tile-style card */}
          <div className="w-full max-w-xs rounded-xl border-2 border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {sent ? (
              <div className="text-center">
                {/* Wordle-style letter tiles for visual flair */}
                <div className="mb-6 flex justify-center gap-1.5">
                  {['C', 'H', 'E', 'C', 'K'].map((l, i) => (
                    <div
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded border-2 border-green-500 bg-green-500 text-sm font-bold text-white"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-base font-bold text-black dark:text-white">
                  Check your Bears Mail!
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  We sent a login link to{' '}
                  <span className="font-semibold text-black dark:text-white">
                    {email.trim().toLowerCase()}
                  </span>
                  . Click it to start playing.
                </p>
                <button
                  onClick={() => {
                    setSent(false)
                    setEmail('')
                  }}
                  className="mt-6 text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Enter your Bears Mail to play
                </p>

                {(wrongDomain || error) && (
                  <p className="text-center text-sm font-semibold text-red-500">
                    {error || `Only @${ALLOWED_DOMAIN} emails are allowed.`}
                  </p>
                )}

                <input
                  type="email"
                  placeholder={`you@${ALLOWED_DOMAIN}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  disabled={isLoading}
                  autoFocus
                  className="w-full rounded border-2 border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold tracking-wide text-black focus:border-black focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-white"
                />

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full rounded border-2 border-black bg-black py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-40 dark:border-white dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  {isLoading ? 'Sending…' : 'Send login link'}
                </button>

                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  No password needed — we'll email you a one-click link
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

