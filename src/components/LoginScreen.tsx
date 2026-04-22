import { useState } from 'react'

import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'

type TileStatus = 'correct' | 'present' | 'absent'
type BgTile = { l: string; s: TileStatus }

const TILE_BG: Record<TileStatus, string> = {
  correct: '#16a34a',
  present: '#d97706',
  absent:  '#334155',
}

const BG_BOARDS: {
  rows: BgTile[][]
  pos: { top?: string; bottom?: string; left?: string; right?: string }
  rotate: number
  floatDelay: string
  startDelay: number
}[] = [
  {
    rows: [
      [{l:'C',s:'absent'},{l:'H',s:'absent'},{l:'A',s:'present'},{l:'S',s:'absent'},{l:'E',s:'correct'}],
      [{l:'G',s:'correct'},{l:'R',s:'correct'},{l:'A',s:'correct'},{l:'D',s:'absent'},{l:'E',s:'correct'}],
      [{l:'G',s:'correct'},{l:'R',s:'correct'},{l:'A',s:'correct'},{l:'C',s:'correct'},{l:'E',s:'correct'}],
    ],
    pos: { top: '6%', left: '-2%' },
    rotate: -9,
    floatDelay: '0s',
    startDelay: 0,
  },
  {
    rows: [
      [{l:'J',s:'correct'},{l:'A',s:'correct'},{l:'K',s:'present'},{l:'E',s:'absent'}],
      [{l:'J',s:'correct'},{l:'A',s:'correct'},{l:'C',s:'correct'},{l:'K',s:'correct'}],
    ],
    pos: { top: '14%', right: '-1%' },
    rotate: 8,
    floatDelay: '2.3s',
    startDelay: 0.3,
  },
  {
    rows: [
      [{l:'A',s:'absent'},{l:'N',s:'absent'},{l:'D',s:'absent'},{l:'R',s:'absent'},{l:'E',s:'present'},{l:'W',s:'absent'}],
      [{l:'S',s:'correct'},{l:'O',s:'correct'},{l:'P',s:'correct'},{l:'H',s:'correct'},{l:'I',s:'correct'},{l:'E',s:'correct'}],
    ],
    pos: { bottom: '10%', left: '1%' },
    rotate: -6,
    floatDelay: '1.5s',
    startDelay: 0.5,
  },
  {
    rows: [
      [{l:'W',s:'absent'},{l:'I',s:'absent'},{l:'L',s:'absent'},{l:'L',s:'absent'}],
      [{l:'C',s:'correct'},{l:'O',s:'correct'},{l:'L',s:'correct'},{l:'E',s:'correct'}],
    ],
    pos: { bottom: '18%', right: '1%' },
    rotate: 11,
    floatDelay: '3.8s',
    startDelay: 0.8,
  },
]

const LOGO_TILES = [
  { l: 'S', c: '#16a34a' },
  { l: 'T', c: '#16a34a' },
  { l: 'U', c: '#d97706' },
  { l: 'D', c: '#16a34a' },
  { l: 'E', c: '#334155' },
  { l: 'N', c: '#16a34a' },
  { l: 'T', c: '#16a34a' },
  { l: 'L', c: '#d97706' },
  { l: 'E', c: '#16a34a' },
]

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Radial indigo glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(99,102,241,0.2) 0%, transparent 70%)',
      }} />

      {/* Background game boards */}
      {BG_BOARDS.map((board, bi) => (
        <div
          key={bi}
          style={{
            position: 'absolute',
            ...board.pos,
            opacity: 0.2,
            animation: `loginFloat 7s ease-in-out ${board.floatDelay} infinite`,
            pointerEvents: 'none',
          }}
        >
          <div style={{ transform: `rotate(${board.rotate}deg)`, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {board.rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5 }}>
                {row.map((tile, ti) => {
                  const delay = board.startDelay + ri * 0.22 + ti * 0.06
                  return (
                    <div
                      key={ti}
                      style={{
                        width: 46, height: 46,
                        background: TILE_BG[tile.s],
                        borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 22, fontWeight: 900,
                        animation: `loginTilePop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
                      }}
                    >
                      {tile.l}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360, padding: '0 20px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '40px 32px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          {/* STUDENTLE logo tiles */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 28, flexWrap: 'wrap' }}>
            {LOGO_TILES.map((t, i) => (
              <div
                key={i}
                style={{
                  width: 32, height: 32,
                  background: t.c,
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, fontWeight: 900,
                  animation: `loginTilePop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.055}s both`,
                }}
              >
                {t.l}
              </div>
            ))}
          </div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
                {['C','H','E','C','K'].map((l, i) => (
                  <div
                    key={i}
                    style={{
                      width: 38, height: 38, background: '#16a34a', borderRadius: 5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 17, fontWeight: 900,
                      animation: `loginTilePop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s both`,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 10px' }}>
                Check your Bears Mail!
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
                Login link sent to{' '}
                <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{email.trim().toLowerCase()}</strong>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14, margin: 0 }}>
                Enter your Bears Mail to play
              </p>

              {(wrongDomain || error) && (
                <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, fontWeight: 600, margin: 0 }}>
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
                  width: '100%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  padding: '13px 16px',
                  color: 'white',
                  fontSize: 15,
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.8)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
              />

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 0',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: isLoading || !email.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !email.trim() ? 0.4 : 1,
                  transition: 'opacity 0.2s, transform 0.1s',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                }}
                onMouseEnter={(e) => { if (!isLoading && email.trim()) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {isLoading ? 'Sending…' : 'Send Login Link'}
              </button>

              <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: 12, margin: 0 }}>
                No password needed — we'll email you a one-click link
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

