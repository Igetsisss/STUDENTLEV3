import { useState } from 'react'

import { ALLOWED_DOMAIN, isSchoolEmail, sendMagicLink } from '../lib/auth'

type Props = {
  wrongDomain?: boolean
}

export const LoginScreen = ({ wrongDomain = false }: Props) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = email.trim().toLowerCase()
    if (!isSchoolEmail(trimmed)) {
      setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`)
      return
    }

    setIsLoading(true)
    try {
      await sendMagicLink(trimmed)
      setSent(true)
    } catch {
      setError('Could not send the link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Studentle
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Bears Mail account
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">📬</div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Check your Bears Mail!
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We sent a login link to{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {email.trim().toLowerCase()}
              </span>
              . Click it to start playing.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-xs text-indigo-500 underline hover:text-indigo-700"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {(wrongDomain || error) && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error || `Only @${ALLOWED_DOMAIN} accounts are allowed.`}
              </div>
            )}

            <input
              type="email"
              placeholder={`you@${ALLOWED_DOMAIN}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              disabled={isLoading}
              autoFocus
              className="mb-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
            />

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Sending…' : 'Send me a login link'}
            </button>

            <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              We'll email you a one-click link — no password needed.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

