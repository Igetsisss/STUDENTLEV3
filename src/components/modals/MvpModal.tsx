import { useEffect, useRef } from 'react'

import { BaseModal } from './BaseModal'

const CONFETTI_COLORS = [
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FF9FF3',
  '#54A0FF',
  '#FFA502',
]

type Props = {
  isOpen: boolean
  handleClose: () => void
  playerName: string
  winRate: number
  avgGuesses: number
  totalGames: number
}

export const MvpModal = ({
  isOpen,
  handleClose,
  playerName,
  winRate,
  avgGuesses,
  totalGames,
}: Props) => {
  const confettiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !confettiRef.current) return
    const container = confettiRef.current
    container.innerHTML = ''

    for (let i = 0; i < 70; i++) {
      const piece = document.createElement('div')
      const color =
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
      const size = Math.random() * 9 + 5
      const left = Math.random() * 100
      const delay = Math.random() * 2.5
      const duration = Math.random() * 1.5 + 2
      const isCircle = Math.random() > 0.5

      piece.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${left}%;
        top: -12px;
        border-radius: ${isCircle ? '50%' : '2px'};
        animation: confettiFall ${duration}s ${delay}s ease-in forwards;
        z-index: 0;
      `
      container.appendChild(piece)
    }

    return () => {
      if (confettiRef.current) confettiRef.current.innerHTML = ''
    }
  }, [isOpen])

  return (
    <BaseModal
      title="🏆 You're the MVP!"
      isOpen={isOpen}
      handleClose={handleClose}
    >
      <div
        className="relative"
        style={{ minHeight: '280px', overflow: 'hidden' }}
      >
        <div
          ref={confettiRef}
          className="pointer-events-none absolute inset-0"
          style={{ overflow: 'hidden' }}
        />
        <div className="relative z-10 py-4 text-center">
          <div className="mb-2 text-6xl">🏆</div>
          <p className="mb-1 text-2xl font-extrabold text-yellow-500 dark:text-yellow-400">
            {playerName}
          </p>
          <p className="mb-5 text-sm font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500">
            Most Valuable Player
          </p>

          <p className="mb-4 px-2 text-sm text-gray-700 dark:text-gray-300">
            Based on your <strong>win rate</strong>,{' '}
            <strong>average guesses</strong>, and <strong>consistency</strong>{' '}
            across all your Studentle games, you've outperformed every other
            player at the school.
          </p>

          <div className="mx-auto mb-5 flex max-w-xs justify-around rounded-xl border-2 border-yellow-400 bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20">
            <div className="text-center">
              <div className="text-2xl">🎯</div>
              <div className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-200">
                {Math.round(winRate * 100)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Win Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl">⚡</div>
              <div className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-200">
                {avgGuesses > 0 ? avgGuesses.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Avg Guesses
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl">📅</div>
              <div className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-200">
                {totalGames}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Games Played
              </div>
            </div>
          </div>

          <p className="px-2 text-xs italic text-gray-400 dark:text-gray-500">
            The MVP is recalculated from all-time stats. Keep playing to hold
            the crown — anyone can take it!
          </p>
        </div>
      </div>
    </BaseModal>
  )
}
