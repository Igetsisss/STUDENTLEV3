import { useEffect, useState } from 'react'

export const BannedScreen = () => {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          window.close()
          // Fallback for browsers that block window.close() on non-script-opened tabs
          document.body.innerHTML = ''
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: '#fff',
        zIndex: 9999,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '0.75rem',
        }}
      >
        You've been banned.
      </h1>
      <p style={{ fontSize: '1rem', color: '#aaa', marginBottom: '2rem' }}>
        You are not allowed to play Studentle.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#666' }}>
        This tab will close in {countdown} second{countdown !== 1 ? 's' : ''}…
      </p>
    </div>
  )
}
