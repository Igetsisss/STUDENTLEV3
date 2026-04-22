import { supabase } from './supabase'

export const ALLOWED_DOMAIN = 'bearsmail.org'

/**
 * Sends a magic-link login email to the given address.
 * Throws if Supabase returns an error.
 * The caller is responsible for checking isSchoolEmail() before calling this.
 */
export const sendMagicLink = async (email: string): Promise<void> => {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
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
