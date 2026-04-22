import { supabase } from './supabase'

export const ALLOWED_DOMAIN = 'bearsmail.org'

/** Redirects to Microsoft sign-in via Supabase Azure OAuth. */
export const signInWithMicrosoft = async (): Promise<void> => {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile',
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

/** Signs the current user out of Supabase. */
export const signOutMicrosoft = async (): Promise<void> => {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Returns true only for @bearsmail.org addresses. */
export const isSchoolEmail = (email: string): boolean =>
  email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)

/**
 * Parses a bearsmail email into a first name and last initial for
 * pre-filling the registration form.
 *   "jack.smith@bearsmail.org" → { firstName: "Jack", lastInitial: "S" }
 *   "jsmith@bearsmail.org"     → { firstName: "Jsmith", lastInitial: "" }
 */
export const parseNameFromEmail = (
  email: string
): { firstName: string; lastInitial: string } => {
  const localPart = email.split('@')[0] ?? ''
  const parts = localPart.split('.')
  const raw = parts[0] ?? ''
  const firstName = raw
    ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    : ''
  const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() : ''
  return { firstName, lastInitial }
}
