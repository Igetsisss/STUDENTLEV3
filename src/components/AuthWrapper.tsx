import { useEffect, useState } from 'react'

import { linkEmailToCurrentAccount, lookupAccountByEmail } from '../lib/api'
import { isSchoolEmail, signOutMicrosoft as signOut } from '../lib/auth'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { LoginScreen } from './LoginScreen'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'wrong-domain'

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

  const hasName = !!localStorage.getItem('playerName')
  const hasGrade = !!localStorage.getItem('gradeNumber')

  if (hasName && hasGrade) {
    // Already registered on this device — link email silently in background.
    linkEmailToCurrentAccount(email).catch(() => {})
    return
  }

  // New device or first-time user — try to restore account by email.
  const account = await lookupAccountByEmail(email)
  if (!account) {
    // Brand new user — Grade modal will handle registration.
    return
  }

  // Restore the account to localStorage (mirrors handleClaimAccount in Grade.tsx).
  localStorage.setItem('gradeNumber', JSON.stringify(account.grade))
  localStorage.setItem('playerName', account.playerName)
  if (account.prefix) {
    localStorage.setItem('playerPrefix', account.prefix)
    localStorage.removeItem('playerLastInitial')
  } else if (account.lastInitial) {
    localStorage.setItem('playerLastInitial', account.lastInitial)
    localStorage.removeItem('playerPrefix')
  }
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
