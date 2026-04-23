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

// 10 varied historical offsets to get 10 different solutions per grade
const BOARD_OFFSETS = [7, 21, 35, 48, 63, 79, 95, 112, 128, 145]
// How many guesses each board took — simulates real, varied games
const BOARD_GUESS_COUNTS = [3, 5, 2, 4, 6, 3, 4, 2, 5, 3]
// Shifts used to pick each "wrong" guess — spread far apart so they look different
const GUESS_SHIFTS = [3, 11, 23, 37, 53]

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

const createBoardRows = (
  solution: string,
  list: string[],
  index: number,
  guessCount: number
): BoardRow[] => {
  const length = solution.length
  const guesses: string[] = []
  for (let g = 0; g < guessCount - 1; g++) {
    guesses.push(pickGuessFromList(list, solution, length, index, GUESS_SHIFTS[g]))
  }
  guesses.push(solution)

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

// 4 strips ordered: Senior, Junior, Sophomore, Freshman (top → bottom on screen)
const GRADE_STRIPS: Array<{ grade: 9 | 10 | 11 | 12; boards: GradeBoard[] }> = (() => {
  const gradeSources: Array<{ grade: 9 | 10 | 11 | 12; words: string[] }> = [
    { grade: 12, words: SENIOR },
    { grade: 11, words: JUNIOR },
    { grade: 10, words: SOPHOMORE },
    { grade: 9, words: FRESHMAN },
  ]

  return gradeSources.map(({ grade, words }) => ({
    grade,
    boards: BOARD_OFFSETS.map((daysAgo, boardIdx) => {
      const index = getHistoricIndex(daysAgo)
      const solution = words[index % words.length].toUpperCase()
      return {
        grade,
        rows: createBoardRows(solution, words, index, BOARD_GUESS_COUNTS[boardIdx]),
      }
    }),
  }))
})()

type Props = {
  wrongDomain?: boolean
}

const FakeBoard = ({ board, uid }: { board: GradeBoard; uid: string }) => {
  return (
    <div className="login-board-wallpaper-card">
      <div className="login-board-wallpaper-card-grid">
        {board.rows.map((row, rowIndex) => (
          <div key={`${uid}-${rowIndex}`} className="login-board-wallpaper-row">
            {row.letters.map((letter, tileIndex) => {
              const state = row.states[tileIndex]
              return (
                <div
                  key={`${uid}-${rowIndex}-${tileIndex}`}
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

const WallpaperStrip = ({
  boards,
  reverse,
  stripId,
}: {
  boards: GradeBoard[]
  reverse: boolean
  stripId: string
}) => {
  // Duplicate for seamless infinite scroll loop
  const doubled = [...boards, ...boards]
  return (
    <div className={`login-wallpaper-strip${reverse ? ' login-wallpaper-strip-reverse' : ''}`}>
      {doubled.map((board, i) => (
        <FakeBoard key={`${stripId}-${i}`} board={board} uid={`${stripId}-${i}`} />
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
            {GRADE_STRIPS.map(({ grade, boards }, i) => (
              <WallpaperStrip
                key={grade}
                boards={boards}
                reverse={i % 2 === 1}
                stripId={`g${grade}`}
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

