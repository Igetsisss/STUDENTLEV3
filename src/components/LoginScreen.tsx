import { useState } from 'react'

import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'

type TileState = 'correct' | 'present' | 'absent' | 'empty'

const TILE_COLORS: Record<TileState, string> = {
  correct: '#6b7280',
  present: '#7c8798',
  absent: '#475569',
  empty: '#cbd5e1',
}

const BOARD_SETS: { letters: string[]; states: TileState[] }[][] = [
  {
    letters: ['C', 'H', 'A', 'S', 'E'],
    states: ['absent', 'absent', 'present', 'absent', 'correct'],
  },
  {
    letters: ['C', 'R', 'A', 'N', 'E'],
    states: ['absent', 'present', 'correct', 'absent', 'correct'],
  },
  {
    letters: ['G', 'R', 'A', 'C', 'E'],
    states: ['correct', 'correct', 'correct', 'correct', 'correct'],
  },
  {
    letters: ['', '', '', '', ''],
    states: ['empty', 'empty', 'empty', 'empty', 'empty'],
  },
  {
    letters: ['', '', '', '', ''],
    states: ['empty', 'empty', 'empty', 'empty', 'empty'],
  },
  {
    letters: ['', '', '', '', ''],
    states: ['empty', 'empty', 'empty', 'empty', 'empty'],
  },
]

const BOARD_SETS_B: { letters: string[]; states: TileState[] }[] = [
  {
    letters: ['M', 'A', 'S', 'O', 'N'],
    states: ['absent', 'correct', 'absent', 'present', 'absent'],
  },
  {
    letters: ['J', 'A', 'S', 'O', 'N'],
    states: ['present', 'correct', 'correct', 'present', 'absent'],
  },
  {
    letters: ['J', 'A', 'C', 'K', 'S'],
    states: ['correct', 'correct', 'present', 'absent', 'absent'],
  },
  {
    letters: ['J', 'A', 'C', 'K', 'Y'],
    states: ['correct', 'correct', 'correct', 'correct', 'absent'],
  },
  {
    letters: ['J', 'A', 'C', 'K', 'S'],
    states: ['correct', 'correct', 'correct', 'correct', 'correct'],
  },
  {
    letters: ['', '', '', '', ''],
    states: ['empty', 'empty', 'empty', 'empty', 'empty'],
  },
]

const BOARD_SETS_C: { letters: string[]; states: TileState[] }[] = [
  {
    letters: ['B', 'L', 'A', 'K', 'E'],
    states: ['absent', 'present', 'absent', 'absent', 'correct'],
  },
  {
    letters: ['C', 'L', 'A', 'R', 'K'],
    states: ['present', 'present', 'correct', 'absent', 'correct'],
  },
  {
    letters: ['C', 'O', 'L', 'E', 'N'],
    states: ['correct', 'absent', 'correct', 'correct', 'absent'],
  },
  {
    letters: ['C', 'O', 'L', 'E', 'S'],
    states: ['correct', 'correct', 'correct', 'correct', 'absent'],
  },
  {
    letters: ['C', 'O', 'L', 'E', 'Y'],
    states: ['correct', 'correct', 'correct', 'correct', 'absent'],
  },
  {
    letters: ['', '', '', '', ''],
    states: ['empty', 'empty', 'empty', 'empty', 'empty'],
  },
]

type Props = {
  wrongDomain?: boolean
}

const FakeBoard = ({ seed }: { seed: number }) => (
  (() => {
    const boardSet = [BOARD_SETS, BOARD_SETS_B, BOARD_SETS_C][seed % 3]
    return (
      <div
        style={{
          transform: `rotate(${seed % 2 === 0 ? 2 : -2}deg)`,
          background: 'rgba(226, 232, 240, 0.28)',
          border: '1px solid rgba(148, 163, 184, 0.4)',
          borderRadius: 12,
          padding: 8,
          backdropFilter: 'blur(1px)',
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          {boardSet.map((row, rowIndex) => (
        <div key={`${seed}-${rowIndex}`} style={{ display: 'flex', gap: 3 }}>
          {row.letters.map((letter, tileIndex) => {
            const state = row.states[tileIndex]
            return (
              <div
                key={`${seed}-${rowIndex}-${tileIndex}`}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: '1px solid rgba(71, 85, 105, 0.45)',
                  background: TILE_COLORS[state],
                  color: state === 'empty' ? '#64748b' : '#f8fafc',
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: '24px',
                  textAlign: 'center',
                  userSelect: 'none',
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
  })()
)

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
          <div className="login-board-track-a absolute -top-44 -left-56 flex gap-8">
            {Array.from({ length: 11 }).map((_, index) => (
              <FakeBoard key={`track-a-${index}`} seed={index} />
            ))}
          </div>
          <div className="login-board-track-b absolute top-10 -left-72 flex gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <FakeBoard key={`track-b-${index}`} seed={index + 100} />
            ))}
          </div>
          <div className="login-board-track-c absolute -bottom-36 -left-64 flex gap-8">
            {Array.from({ length: 10 }).map((_, index) => (
              <FakeBoard key={`track-c-${index}`} seed={index + 200} />
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-slate-200/62 dark:bg-slate-900/52" />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        {/* Navbar-style header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
            Studentle
          </h1>
          <div className="mx-auto mt-3 h-0.5 w-16 bg-black dark:bg-white opacity-20 rounded-full" />
        </div>

        {/* Tile-style card */}
        <div className="w-full max-w-xs px-4">
          {sent ? (
            <div className="text-center">
              {/* Wordle-style letter tiles for visual flair */}
              <div className="mb-6 flex justify-center gap-1.5">
                {['C','H','E','C','K'].map((l, i) => (
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
                onClick={() => { setSent(false); setEmail('') }}
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
                onChange={(e) => { setEmail(e.target.value); setError('') }}
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

