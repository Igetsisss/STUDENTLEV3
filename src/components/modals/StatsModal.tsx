import { ClockIcon, ShareIcon, StarIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import Countdown from 'react-countdown'
import { useEffect, useState } from 'react'

import {
  DATE_LOCALE,
  ENABLE_ARCHIVED_GAMES,
} from '../../constants/settings'
import {
  ARCHIVE_GAMEDATE_TEXT,
  GUESS_DISTRIBUTION_TEXT,
  NEW_WORD_TEXT,
  SHARE_TEXT,
  STATISTICS_TITLE,
} from '../../constants/strings'
import { GameStats } from '../../lib/localStorage'
import { fetchLeaderboard } from '../../lib/api'
import { shareStatus } from '../../lib/share'
import { solutionGameDate, tomorrow } from '../../lib/words'
import { Histogram } from '../stats/Histogram'
import { StatBar } from '../stats/StatBar'
import { BaseModal } from './BaseModal'

type Props = {
  isOpen: boolean
  handleClose: () => void
  solution: string
  guesses: string[]
  gameStats: GameStats
  isLatestGame: boolean
  isGameLost: boolean
  isGameWon: boolean
  handleShareToClipboard: () => void
  handleShareFailure: () => void
  isHardMode: boolean
  isDarkMode: boolean
  isHighContrastMode: boolean
  numberOfGuessesMade: number
  handleBonusRound?: () => void
  isBonusRoundAvailable?: boolean
  isBonusRound?: boolean
  onOpenLeaderboard?: () => void
  bonusSolution?: string
  bonusGuesses?: string[]
  isFirstToday?: boolean
}

export const StatsModal = ({
  isOpen,
  handleClose,
  solution,
  guesses,
  gameStats,
  isLatestGame,
  isGameLost,
  isGameWon,
  handleShareToClipboard,
  handleShareFailure,
  isHardMode,
  isDarkMode,
  isHighContrastMode,
  numberOfGuessesMade,
  handleBonusRound,
  isBonusRoundAvailable,
  isBonusRound,
  onOpenLeaderboard,
  bonusSolution,
  bonusGuesses,
  isFirstToday,
}: Props) => {
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [leaderboardTotal, setLeaderboardTotal] = useState<number | null>(null)
  const [solveRate, setSolveRate] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen || (!isGameWon && !isGameLost)) return
    const fn = localStorage.getItem('playerName') || ''
    const li = localStorage.getItem('playerLastInitial') || ''
    const myName = li ? `${fn} ${li}` : fn
    if (!myName) return

    fetchLeaderboard().then((entries) => {
      const today = new Date().toISOString().split('T')[0]
      const todayDaily = entries.filter(
        (e) => e.gameType === 'daily' && String(e.date).startsWith(today)
      )
      const myIdx = todayDaily.findIndex((e) => e.name === myName)
      if (myIdx !== -1) {
        setLeaderboardRank(myIdx + 1)
        setLeaderboardTotal(todayDaily.length)
      }
      if (todayDaily.length >= 3) {
        const wins = todayDaily.filter((e) => e.won).length
        setSolveRate(Math.round((wins / todayDaily.length) * 100))
      }
    })
  }, [isOpen])
  if (gameStats.totalGames <= 0) {
    return (
      <BaseModal
        title={STATISTICS_TITLE}
        isOpen={isOpen}
        handleClose={handleClose}
      >
        <StatBar gameStats={gameStats} />
      </BaseModal>
    )
  }
  return (
    <BaseModal
      title={STATISTICS_TITLE}
      isOpen={isOpen}
      handleClose={handleClose}
    >
      {isBonusRound && (
        <p className="glisten-text mb-2 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
          Bonus Round
        </p>
      )}
      <StatBar gameStats={gameStats} />
      <h4 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
        {GUESS_DISTRIBUTION_TEXT}
      </h4>
      <Histogram
        isLatestGame={isLatestGame}
        gameStats={gameStats}
        isGameWon={isGameWon}
        numberOfGuessesMade={numberOfGuessesMade}
      />
      {/* Personal bests card */}
      {(() => {
        const bestIdx = gameStats.winDistribution.findIndex((c) => c > 0)
        const bestGuessCount = bestIdx >= 0 ? bestIdx + 1 : null
        return (
          <div className="mt-4 flex justify-around rounded-lg border border-gray-200 bg-gray-50 px-2 py-3 dark:border-slate-600 dark:bg-slate-800">
            <div className="text-center">
              <div className="text-xl font-bold text-orange-500">
                🔥 {gameStats.currentStreak}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Current Streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">
                🏆 {gameStats.bestStreak}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Best Streak
              </div>
            </div>
            {bestGuessCount !== null && (
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  🎯 {bestGuessCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Best Solve
                </div>
              </div>
            )}
          </div>
        )
      })()}
      {/* Hard word difficulty */}
      {solveRate !== null && (isGameWon || isGameLost) && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-center text-sm ${
            solveRate <= 40
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
              : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300'
          }`}
        >
          {solveRate <= 40
            ? `🤔 Only ${solveRate}% of players solved this today — tough one!`
            : solveRate >= 80
            ? `✨ ${solveRate}% of students solved this today`
            : `📊 ${solveRate}% of students solved this today`}
        </div>
      )}
      {isFirstToday && (isGameWon || isGameLost) && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 dark:border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-300">
          🥇 You were the first to play today!
        </div>
      )}
      {(isGameLost || isGameWon) && (
        <div className="mt-5 columns-2 items-center items-stretch justify-center text-center dark:text-white sm:mt-6">
          <div className="inline-block w-full text-left">
            {(!ENABLE_ARCHIVED_GAMES || isLatestGame) && (
              <div>
                <h5>{NEW_WORD_TEXT}</h5>
                <Countdown
                  className="text-lg font-medium text-gray-900 dark:text-gray-100"
                  date={tomorrow}
                  daysInHours={true}
                />
              </div>
            )}
            {ENABLE_ARCHIVED_GAMES && !isLatestGame && (
              <div className="mt-2 inline-flex">
                <ClockIcon className="mr-1 mt-2 mt-1 h-5 w-5 stroke-black dark:stroke-white" />
                <div className="mt-1 ml-1 text-center text-sm sm:text-base">
                  <strong>{ARCHIVE_GAMEDATE_TEXT}:</strong>
                  <br />
                  {format(solutionGameDate, 'd MMMM yyyy', {
                    locale: DATE_LOCALE,
                  })}
                </div>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-base"
              onClick={() => {
                shareStatus(
                  solution,
                  guesses,
                  isGameLost,
                  isHardMode,
                  isDarkMode,
                  isHighContrastMode,
                  handleShareToClipboard,
                  handleShareFailure,
                  bonusSolution,
                  bonusGuesses
                )
              }}
            >
              <ShareIcon className="mr-2 h-6 w-6 cursor-pointer dark:stroke-white" />
              {SHARE_TEXT}
            </button>
          </div>
        </div>
      )}
      {(isGameLost || isGameWon) && onOpenLeaderboard && (
        <div
          className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
          onClick={onOpenLeaderboard}
        >
          <StarIcon className="h-4 w-4 flex-shrink-0" />
          {leaderboardRank !== null && leaderboardTotal !== null ? (
            <span>
              You're <strong>#{leaderboardRank}</strong> out of {leaderboardTotal} today —{' '}
              <span className="underline">see full leaderboard</span>
            </span>
          ) : (
            <span>
              See how you compare —{' '}
              <span className="underline">view today's leaderboard</span>
            </span>
          )}
        </div>
      )}
      {(isGameLost || isGameWon) && isBonusRoundAvailable && handleBonusRound && (        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="glisten-btn inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-center text-base font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleBonusRound}
          >
            Bonus Round!
          </button>
        </div>
      )}
    </BaseModal>
  )
}
