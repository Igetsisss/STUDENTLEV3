import { useEffect, useRef, useState } from 'react'

import { lookupAccountByEmail } from '../lib/api'
import { isSchoolEmail, signOutMicrosoft as signOut } from '../lib/auth'
import {
  clearPlayerGrade,
  clearPlayerLastInitial,
  clearPlayerName,
  clearPlayerPrefix,
  getMsAuthEmail,
  getPlayerGrade,
  getPlayerLastInitial,
  getPlayerName,
  getPlayerPrefix,
  setMsAuthEmail,
  setPlayerGrade,
  setPlayerLastInitial,
  setPlayerName,
  setPlayerPrefix,
} from '../lib/localStorage'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { LoginScreen } from './LoginScreen'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'wrong-domain' | 'welcome'

const GRADE_LABELS: Record<string, string> = {
  '0': 'Teacher',
  '9': 'Freshman',
  '10': 'Sophomore',
  '11': 'Junior',
  '12': 'Senior',
}

const clearLocalIdentity = () => {
  clearPlayerName()
  clearPlayerGrade()
  clearPlayerPrefix()
  clearPlayerLastInitial()
}

const restoreAccountToLocalStorage = (account: {
  playerName: string
  grade: string
  lastInitial?: string
  prefix?: string
}) => {
  setPlayerGrade(account.grade)
  setPlayerName(account.playerName)
  if (account.prefix) {
    setPlayerPrefix(account.prefix)
    clearPlayerLastInitial()
    return
  }
  if (account.lastInitial) {
    setPlayerLastInitial(account.lastInitial)
    clearPlayerPrefix()
    return
  }
  clearPlayerPrefix()
  clearPlayerLastInitial()
}

const buildDisplayName = (): string => {
  const name = getPlayerName()
  const prefix = getPlayerPrefix()
  const lastInitial = getPlayerLastInitial()
  if (prefix) return `${prefix} ${name}`
  if (lastInitial) return `${name} ${lastInitial}`
  return name
}

/**
 * Runs once we confirm a valid @bearsmail.org session.
 *
 * - Stores the email so Grade modal can pre-fill the name field.
 * - Returning users (same email already cached) skip the blocking Supabase
 *   RPC — the app renders immediately and the lookup refreshes in the background.
 * - New users or email changes always block on the RPC so identity is correct
 *   before the app is shown.
 */
async function applyValidSession(email: string): Promise<void> {
  const previousEmail = getMsAuthEmail()
  const hasName = !!getPlayerName()
  const hasGrade = !!getPlayerGrade()
  const isReturningUser = previousEmail === email && hasName && hasGrade

  setMsAuthEmail(email)

  if (isReturningUser) {
    // Identity already verified on a previous load for this email.
    // Refresh in the background without blocking app render.
    lookupAccountByEmail(email).then((account) => {
      if (account) restoreAccountToLocalStorage(account)
    })
    return
  }

  // New device, new email, or no local identity — block on the lookup so the
  // app starts with the correct identity (or shows the Grade modal).
  const account = await lookupAccountByEmail(email)

  if (account) {
    restoreAccountToLocalStorage(account)
    return
  }

  if (hasName && hasGrade) {
    // Email changed but device has stale local identity from a different user.
    // Clear it so the Grade modal re-runs for the new email owner.
    clearLocalIdentity()
    return
  }

  // Truly new user — Grade modal will handle registration and linking.
}

type Props = { children: React.ReactNode }

/**
 * Gates the entire app behind Microsoft sign-in.
 *
 * - If Supabase isn't configured (local dev without env vars) it passes
 *   through immediately so local development still works.
 * - Only @bearsmail.org addresses are accepted; any other Microsoft account
 *   is signed out and shown an error message.
 */
export const AuthWrapper = ({ children }: Props) => {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [welcomeName, setWelcomeName] = useState('')
  const [welcomeGrade, setWelcomeGrade] = useState('')
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Dev mode without Supabase env vars — skip auth gate.
    if (!hasSupabaseConfig || !supabase) {
      setStatus('authenticated')
      return
    }

    // onAuthStateChange fires immediately with the current session state
    // (INITIAL_SESSION event), so we don't need a separate getSession() call.
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setStatus('unauthenticated')
        return
      }

      const email = session.user.email ?? ''
      if (!isSchoolEmail(email)) {
        await signOut()
        setStatus('wrong-domain')
        return
      }

      await applyValidSession(email)

      // Show a brief welcome screen if we know who this player is.
      const name = buildDisplayName()
      const grade = getPlayerGrade()
      if (name && grade) {
        setWelcomeName(name)
        setWelcomeGrade(GRADE_LABELS[grade] ?? `Grade ${grade}`)
        setStatus('welcome')
        welcomeTimerRef.current = setTimeout(() => {
          setStatus('authenticated')
        }, 2000)
      } else {
        setStatus('authenticated')
      }
    })

    return () => {
      subscription.unsubscribe()
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (status === 'welcome') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Welcome back
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
            {welcomeName}
          </h1>
          <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
            {welcomeGrade}
          </p>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <LoginScreen wrongDomain={status === 'wrong-domain'} />
  }

  return <>{children}</>
}
