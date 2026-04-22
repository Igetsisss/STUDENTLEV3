import { useState } from 'react'

import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'

// ── Background tile grid ──────────────────────────────────────────────────
// Fixed repeating colour pattern — rows offset so diagonal stripes appear.
// Colours are exactly the in-game Studentle palette.
type TileStatus = 'correct' | 'present' | 'absent'

const TILE_BG: Record<TileStatus, string> = {
  correct: '#16a34a',  // green
  present: '#ca8a04',  // amber (same as in-game)
  absent:  '#3f4b5e',  // slate (slightly lighter for visibility)
}

// Row × col formula creates diagonal colour stripes.
// Pattern: mostly absent, occasional correct/present stripes.
const BG_PATTERN: TileStatus[] = [
  'absent','absent','correct','absent','absent',
  'absent','present','absent','absent','correct',
  'absent','absent',
]
const BG_ROWS = 28
const BG_COLS = 38

type Props = { wrongDomain?: boolean }

export const LoginScreen = ({ wrongDomain = false }: Props) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
    <div style={{ minHeight: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Diagonal scrolling tile grid */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: '-30%', left: '-30%',
            display: 'flex', flexDirection: 'column', gap: 5,
            animation: 'diagScroll 22s linear infinite',
            opacity: 0.28,
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
                      width: 36, height: 36, flexShrink: 0,
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

      {/* Dark scrim so card is readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', pointerEvents: 'none' }} />

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 320, padding: '0 20px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ color: 'white', fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            Studentle
          </h1>
          <div style={{ height: 3, width: 40, background: '#16a34a', margin: '8px auto 0', borderRadius: 2 }} />
        </div>

        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
                {['C','H','E','C','K'].map((l, i) => (
                  <div key={i} style={{
                    width: 36, height: 36, background: '#16a34a', borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 15, fontWeight: 900,
                  }}>{l}</div>
                ))}
              </div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 8px' }}>
                Check your Bears Mail!
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Login link sent to{' '}
                <strong style={{ color: '#0f172a' }}>{email.trim().toLowerCase()}</strong>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', margin: 0 }}>
                Enter your Bears Mail to play
              </p>

              {(wrongDomain || error) && (
                <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#dc2626', margin: 0 }}>
                  {error || `Only @${ALLOWED_DOMAIN} emails are allowed.`}
                </p>
              )}

              <input
                type="email"
                className="login-email-input"
                placeholder={`you@${ALLOWED_DOMAIN}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '2px solid #e2e8f0', borderRadius: 10,
                  padding: '12px 14px', fontSize: 14,
                  textAlign: 'center', color: '#0f172a',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#16a34a' }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0' }}
              />

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                style={{
                  width: '100%', padding: '13px 0',
                  background: '#16a34a', border: 'none', borderRadius: 10,
                  color: 'white', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: isLoading || !email.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !email.trim() ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {isLoading ? 'Sending…' : 'Send Login Link'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: 0 }}>
                No password needed — we'll email you a one-click link
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
