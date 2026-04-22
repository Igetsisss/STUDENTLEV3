import { useState } from 'react'

import { signInWithMicrosoft } from '../lib/auth'

type Props = {
  wrongDomain?: boolean
}

export const LoginScreen = ({ wrongDomain = false }: Props) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setIsLoading(true)
    setError('')
    try {
      await signInWithMicrosoft()
      // Page will redirect — no need to setIsLoading(false)
    } catch {
      setError('Sign in failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Studentle
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Bears Mail account to play
          </p>
        </div>

        {wrongDomain && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400">
            Only <strong>@bearsmail.org</strong> accounts are allowed. Please
            use your school account.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <MicrosoftIcon />
          )}
          {isLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
        </button>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Use your @bearsmail.org school account
        </p>
      </div>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
