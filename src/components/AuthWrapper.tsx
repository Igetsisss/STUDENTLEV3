import { useEffect, useState } from 'react'

import { lookupAccountByEmail } from '../lib/api'
import { isSchoolEmail, signOutMicrosoft as signOut } from '../lib/auth'
import {
  clearPlayerGrade,
  clearPlayerLastInitial,
  clearPlayerName,
  clearPlayerPrefix,
  getMsAuthEmail,
  getPlayerGrade,
  getPlayerName,
  setMsAuthEmail,
  setPlayerGrade,
  setPlayerLastInitial,
  setPlayerName,
  setPlayerPrefix,
} from '../lib/localStorage'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { LoginScreen } from './LoginScreen'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'wrong-domain'

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

// Players who must re-authenticate via email — their local identity is cleared
// on load so they hit the login screen regardless of what's in localStorage.
const FORCE_REAUTH_PLAYERS = [
  'vanna n',
  'parker t',
  'payton t',
]

const shouldForceReauth = (): boolean => {
  const name = getPlayerName()
  const lastInitial = getPlayerLastInitial()
  if (!name) return false
  const full = lastInitial ? `${name} ${lastInitial}`.toLowerCase() : name.toLowerCase()
  return FORCE_REAUTH_PLAYERS.includes(full)
}



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

    // Force specific players to re-authenticate via email.
    if (shouldForceReauth()) {
      clearLocalIdentity()
    }

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        // If the player already has a stored identity (name + grade), let them
        // straight into the app — no need to re-verify via email every session.
        if (getPlayerName() && getPlayerGrade()) {
          setStatus('authenticated')
        } else {
          setStatus('unauthenticated')
        }
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

    return () => {
      subscription.unsubscribe()
    }
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
