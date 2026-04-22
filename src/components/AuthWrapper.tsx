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
 * - If the device already has a registered player, links the email to that
 *   account in the background (fire-and-forget).
 * - If the device has NO registered player, tries to look up the account by
 *   email from Supabase and restores it to localStorage so the app starts
 *   with the correct identity (skipping the Grade modal entirely).
 */
async function applyValidSession(email: string): Promise<void> {
  localStorage.setItem('msAuthEmail', email)

  // Always prefer the email-linked account as source of truth.
  // This avoids accidentally linking a new email to stale local identity
  // from a previous user on a shared device.
  const account = await lookupAccountByEmail(email)

  if (account) {
    restoreAccountToLocalStorage(account)
    return
  }

  const hasName = !!localStorage.getItem('playerName')
  const hasGrade = !!localStorage.getItem('gradeNumber')

  if (hasName && hasGrade) {
    // Email is not linked yet, but this device already has local identity.
    // Keep the first-login flow safe by requiring explicit signup instead of
    // auto-linking potentially stale local data.
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
