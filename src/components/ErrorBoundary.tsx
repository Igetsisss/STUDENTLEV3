import { Component, ErrorInfo, ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Studentle] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Try refreshing the page. Your progress is saved.
            </p>
            <button
              className="mt-4 rounded bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600 active:bg-green-700"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
