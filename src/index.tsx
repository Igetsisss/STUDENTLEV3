import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'

import App from './App'
import { AuthWrapper } from './components/AuthWrapper'
import { BannedScreen } from './components/BannedScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AlertProvider } from './context/AlertContext'
import reportWebVitals from './reportWebVitals'

const BANNED_PLAYER_KEYS = new Set(['parker t', 'vanna n'])

// Evaluated lazily inside AppContent so localStorage is populated by
// AuthWrapper (cross-device restore) before the ban check runs.
const isCurrentPlayerBanned = (): boolean => {
  const firstName = (localStorage.getItem('playerName') || '').trim().toLowerCase()
  const lastInitial = (localStorage.getItem('playerLastInitial') || '').trim().toLowerCase()
  if (!firstName || !lastInitial) return false
  return BANNED_PLAYER_KEYS.has(`${firstName} ${lastInitial}`)
}

const AppContent = () =>
  isCurrentPlayerBanned() ? (
    <BannedScreen />
  ) : (
    <ErrorBoundary>
      <AlertProvider>
        <App />
      </AlertProvider>
    </ErrorBoundary>
  )

const root = (
  <React.StrictMode>
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  </React.StrictMode>
)

ReactDOM.render(root, document.getElementById('root'))

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
