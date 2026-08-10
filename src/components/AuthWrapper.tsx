import { useEffect, useState } from 'react'

import { lookupAccountByEmail } from '../lib/api'
import { isSchoolEmail, signOutMicrosoft as signOut } from '../lib/auth'
import { normalizeGrade } from '../lib/gradeUtils'
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

type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'wrong-domain'

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
  setPlayerGrade(normalizeGrade(account.grade))
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

// Background grade/name sync against the roster, keyed by email rather than
// a live session — lookup_player_by_email is granted to anon as well as
// authenticated, so this works even when there's no active Supabase session
// (a very common case: reopening a tab, an expired token, etc). Without
// this, a promoted or graduated player whose session simply isn't live
// right now would keep whatever grade was cached locally *forever* — no
// amount of reloading would ever re-check it. Reloads automatically when
// the grade actually changed so the correction (word list, leaderboard,
// everything keyed off getPlayerGrade()) takes effect immediately instead
// of silently sitting in localStorage until some unrelated future reload.
const refreshIdentityInBackground = (email: string): void => {
  const gradeBefore = getPlayerGrade()
  lookupAccountByEmail(email).then((account) => {
    if (!account) return
    restoreAccountToLocalStorage(account)
    const gradeAfter = normalizeGrade(account.grade)
    if (gradeAfter !== gradeBefore) {
      window.location.reload()
    }
  })
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
    refreshIdentityInBackground(email)
    return
  }

  // New device, new email, or no local identity — block on the lookup so the
  // app starts with the correct identity (or shows the Grade modal).
  const account = await lookupAccountByEmail(email)

  if (account) {
    restoreAccountToLocalStorage(account)
    return
  }

  // No account linked to this email — clear any stale local identity.
  // Covers: new user on a fresh device, shared/school device with someone
  // else's partial data, and incomplete registrations (grade selected but
  // name never entered). Grade modal will open from the grade-selection step.
  clearLocalIdentity()
}

// Players who must re-authenticate via email — their local identity is cleared
// on load so they hit the login screen regardless of what's in localStorage.
const FORCE_REAUTH_PLAYERS = ['parker t', 'strick b', 'mrs. b', 'frye f']

const shouldForceReauth = (): boolean => {
  const name = getPlayerName()
  const lastInitial = getPlayerLastInitial()
  const prefix = getPlayerPrefix()
  if (!name) return false
  let full: string
  if (prefix) {
    full = `${prefix} ${name}`.toLowerCase()
  } else if (lastInitial) {
    full = `${name} ${lastInitial}`.toLowerCase()
  } else {
    full = name.toLowerCase()
  }
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
          // No live Supabase session doesn't mean their grade is still
          // correct — a promoted/graduated player reopening a tab with no
          // active session would otherwise never get re-checked. Refresh
          // by the last-known email in the background; it works without a
          // session since lookup_player_by_email is granted to anon too.
          const cachedEmail = getMsAuthEmail()
          if (cachedEmail) {
            refreshIdentityInBackground(cachedEmail)
          }
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
