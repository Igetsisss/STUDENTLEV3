import { useEffect, useState } from 'react'

import { lookupAccountByEmail } from '../lib/api'
import { isSchoolEmail, signOutMicrosoft as signOut } from '../lib/auth'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { LoginScreen } from './LoginScreen'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'wrong-domain'

const clearLocalIdentity = () => {
  localStorage.removeItem('playerName')
  localStorage.removeItem('gradeNumber')
  localStorage.removeItem('playerPrefix')
  localStorage.removeItem('playerLastInitial')
}

const restoreAccountToLocalStorage = (account: {
  playerName: string
  grade: string
  lastInitial?: string
  prefix?: string
}) => {
  localStorage.setItem('gradeNumber', JSON.stringify(account.grade))
  localStorage.setItem('playerName', account.playerName)
  if (account.prefix) {
    localStorage.setItem('playerPrefix', account.prefix)
    localStorage.removeItem('playerLastInitial')
    return
  }
  if (account.lastInitial) {
    localStorage.setItem('playerLastInitial', account.lastInitial)
    localStorage.removeItem('playerPrefix')
    return
  }
  localStorage.removeItem('playerPrefix')
  localStorage.removeItem('playerLastInitial')
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
  const previousEmail = localStorage.getItem('msAuthEmail')
  const hasName = !!localStorage.getItem('playerName')
  const hasGrade = !!localStorage.getItem('gradeNumber')
  const isReturningUser = previousEmail === email && hasName && hasGrade

  localStorage.setItem('msAuthEmail', email)

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
      setStatus('authenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <LoginScreen wrongDomain={status === 'wrong-domain'} />
  }

  return <>{children}</>
}
