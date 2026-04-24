import { supabase } from './supabase'

export const ALLOWED_DOMAINS = ['bearsmail.org', 'hies.org'] as const
export const ALLOWED_DOMAIN = ALLOWED_DOMAINS[0]
export const ALLOWED_DOMAINS_LABEL = ALLOWED_DOMAINS.map((d) => `@${d}`).join(' or ')

/**
 * Sends a magic-link login email to the given address.
 * Throws if Supabase returns an error.
 * The caller is responsible for checking isSchoolEmail() before calling this.
 * Passes first_name and last_initial as template data so the email can greet
 * the student by name (e.g. "Dear Jack U.") instead of the generic "Hello,".
 */
export const sendMagicLink = async (email: string): Promise<void> => {
  if (!supabase) return
  const { firstName, lastInitial } = parseNameFromEmail(email)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        first_name: firstName || undefined,
        last_initial: lastInitial || undefined,
      },
    },
  })
  if (error) throw error
}

/** Signs the current user out of Supabase. */
export const signOutMicrosoft = async (): Promise<void> => {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Returns true only for approved school domains. */
export const isSchoolEmail = (email: string): boolean =>
  ALLOWED_DOMAINS.some((domain) => email.toLowerCase().endsWith(`@${domain}`))

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
