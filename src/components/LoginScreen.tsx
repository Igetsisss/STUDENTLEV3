import { useState } from 'react'

import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'

type TileStatus = 'correct' | 'present' | 'absent'

const TILE_BG: Record<TileStatus, string> = {
  correct: '#16a34a',
  present: '#ca8a04',
  absent: '#3f4b5e',
}

const BG_PATTERN: TileStatus[] = [
  'absent', 'absent', 'correct', 'absent', 'absent',
  'absent', 'present', 'absent', 'absent', 'correct',
  'absent', 'absent',
]
const BG_ROWS = 28
const BG_COLS = 38

type Props = { wrongDomain?: boolean }

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900">

        {/* Diagonal scrolling tile grid */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            style={{
              position: 'absolute',
              top: '-30%',
              left: '-30%',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              animation: 'diagScroll 22s linear infinite',
              opacity: 0.22,
            }}
          >
            {Array.from({ length: BG_ROWS }, (_, r) => (
              <div key={r} style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: BG_COLS }, (_, c) => {
                  const status = BG_PATTERN[(r * 3 + c * 2) % BG_PATTERN.length]
                  return (
                    <div
                      key={c}
                      style={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        background: TILE_BG[status],
                        borderRadius: 4,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Scrim */}
        <div className="pointer-events-none absolute inset-0 bg-slate-900/50" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-xs px-4">
          <div className="rounded-xl bg-white px-8 py-10 shadow-2xl dark:bg-slate-800">

            {/* Wordmark */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
                Studentle
              </h1>
              <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-black opacity-20 dark:bg-white" />
            </div>

            {sent ? (
              <div className="text-center">
                <div className="mb-6 flex justify-center gap-1.5">
                  {['C', 'H', 'E', 'C', 'K'].map((l, i) => (
                    <div
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded border-2 border-green-600 bg-green-600 text-sm font-bold text-white"
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
                  className="login-email-input w-full rounded border-2 border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold tracking-wide text-black focus:border-black focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-white"
                  placeholder={`you@${ALLOWED_DOMAIN}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  disabled={isLoading}
                  autoFocus
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
