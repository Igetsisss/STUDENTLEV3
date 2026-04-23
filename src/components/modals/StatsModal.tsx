import { MailIcon, StarIcon } from '@heroicons/react/outline'
import { useEffect, useState } from 'react'
import Countdown from 'react-countdown'

import { fetchLeaderboard, isTrueDailyEntry } from '../../lib/api'
import {
  ExtraRoundStats,
  GameStats,
  getPlayerLastInitial,
  getPlayerName,
  getPlayerPrefix,
  loadExtraRoundStats,
  saveStatsToLocalStorage,
} from '../../lib/localStorage'
import { shareStatus } from '../../lib/share'
import { tomorrow } from '../../lib/words'
import {
  GUESS_DISTRIBUTION_TEXT,
  NEW_WORD_TEXT,
  STATISTICS_TITLE,
} from '../../constants/strings'
import { Histogram } from '../stats/Histogram'
import { StatBar } from '../stats/StatBar'
import { BaseModal } from './BaseModal'

const PLAYER_STATS_CACHE_PREFIX = 'playerAllTimeStats_v1_'
const PLAYER_STATS_CACHE_TTL_MS = 10 * 60 * 1000

type CachedPlayerStats = {
  fetchedAt: string
  stats: GameStats
  leaderboard?: {
    date: string
    rank: number | null
    total: number | null
    solveRate: number | null
  }
}

const normalizeName = (name: string) =>
  String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const getMyDisplayName = () => {
  const fn = getPlayerName()
  const li = getPlayerLastInitial()
  const prefix = getPlayerPrefix()
  return prefix ? `${prefix} ${fn}` : li ? `${fn} ${li}` : fn
}

const isBetterEntry = (
  a: { won: boolean; guessCount: number; totalDurationSec: number },
  b: { won: boolean; guessCount: number; totalDurationSec: number }
) => {
  if (a.won !== b.won) return a.won && !b.won
  if (a.guessCount !== b.guessCount) return a.guessCount < b.guessCount
  return a.totalDurationSec < b.totalDurationSec
}

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
  isDarkMode: boolean
  isHighContrastMode: boolean
  numberOfGuessesMade: number
  handleBonusRound?: () => void
  isBonusRoundAvailable?: boolean
  isBonusRound?: boolean
  handleTeachersRound?: () => void
  isTeachersRoundAvailable?: boolean
  isTeachersRound?: boolean
  handleGradeRound?: (grade: string) => void
  gradeRoundsPlayed?: string[]
  allRoundsComplete?: boolean
  isTeacherPlayer?: boolean
  playerGrade?: string
  onOpenLeaderboard?: () => void
  bonusSolution?: string
  bonusGuesses?: string[]
  teachersSolution?: string
  teachersGuesses?: string[]
  gradeRoundGuessesMap?: Record<string, string[]>
  gradeRoundSolutions?: Record<string, string>
  isFirstToday?: boolean
  isPersonalBest?: boolean
  onPersonalBestSeen?: () => void
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
  isDarkMode,
  isHighContrastMode,
  numberOfGuessesMade,
  handleBonusRound,
  isBonusRoundAvailable,
  isBonusRound,
  handleTeachersRound,
  isTeachersRoundAvailable,
  isTeachersRound,
  handleGradeRound,
  gradeRoundsPlayed = [],
  allRoundsComplete = false,
  isTeacherPlayer = false,
  playerGrade = '',
  onOpenLeaderboard,
  bonusSolution,
  bonusGuesses,
  teachersSolution,
  teachersGuesses,
  gradeRoundGuessesMap,
  gradeRoundSolutions,
  isFirstToday,
  isPersonalBest,
  onPersonalBestSeen,
}: Props) => {
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [leaderboardTotal, setLeaderboardTotal] = useState<number | null>(null)
  const [solveRate, setSolveRate] = useState<number | null>(null)
  const [lockMessage, setLockMessage] = useState('')
  const [displayStats, setDisplayStats] = useState<GameStats>(gameStats)
  const [extraRoundStats, setExtraRoundStats] = useState<ExtraRoundStats>(
    loadExtraRoundStats
  )

  useEffect(() => {
    setDisplayStats(gameStats)
  }, [gameStats])

  // Clear the lock message whenever the modal closes so it doesn't bleed into
  // the next open (e.g. user clicks a locked button, closes, reopens → no stale msg)
  useEffect(() => {
    if (!isOpen) setLockMessage('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setExtraRoundStats(loadExtraRoundStats())
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const myName = getMyDisplayName()
    if (!myName) return

    const myKey = normalizeName(myName)
    const cacheKey = `${PLAYER_STATS_CACHE_PREFIX}${myKey}`
    const today = new Date().toISOString().split('T')[0]
    let cachedPayload: CachedPlayerStats | null = null

    const cachedRaw = localStorage.getItem(cacheKey)
    if (cachedRaw) {
      try {
        cachedPayload = JSON.parse(cachedRaw) as CachedPlayerStats
        if (cachedPayload?.stats) {
          const useCachedTotals =
            cachedPayload.stats.totalGames >= gameStats.totalGames
          setDisplayStats({
            ...(useCachedTotals ? cachedPayload.stats : gameStats),
            currentStreak: gameStats.currentStreak,
            bestStreak: gameStats.bestStreak,
          })
        }

        if (cachedPayload?.leaderboard?.date === today) {
          setLeaderboardRank(cachedPayload.leaderboard.rank)
          setLeaderboardTotal(cachedPayload.leaderboard.total)
          setSolveRate(cachedPayload.leaderboard.solveRate)
        }
      } catch {
        // ignore malformed cache and refetch
      }
    }

    const cacheAgeMs = cachedPayload?.fetchedAt
      ? Date.now() - new Date(cachedPayload.fetchedAt).getTime()
      : Number.POSITIVE_INFINITY
    const hasFreshCache = cacheAgeMs < PLAYER_STATS_CACHE_TTL_MS
    const hasTodayLeaderboardCache = cachedPayload?.leaderboard?.date === today
    const hasUsableStatsCache =
      (cachedPayload?.stats?.totalGames ?? -1) >= gameStats.totalGames

    if (hasFreshCache && hasTodayLeaderboardCache && hasUsableStatsCache) {
      return
    }

    fetchLeaderboard(undefined, undefined, true)
      .then((entries) => {
        const todayDaily = entries.filter(
          (e) => String(e.date).startsWith(today) && isTrueDailyEntry(e)
        )

        // Deduplicate per player for ranking consistency with leaderboard modal
        const byPlayer = new Map<string, typeof todayDaily[number]>()
        for (const e of todayDaily) {
          const key = normalizeName(e.name)
          const existing = byPlayer.get(key)
          if (!existing || isBetterEntry(e, existing)) {
            byPlayer.set(key, e)
          }
        }
        const rankedDaily = Array.from(byPlayer.values()).sort((a, b) => {
          if (a.won !== b.won) return a.won ? -1 : 1
          if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
          return a.totalDurationSec - b.totalDurationSec
        })

        const myIdx = rankedDaily.findIndex(
          (e) => normalizeName(e.name) === myKey
        )
        let nextRank: number | null = null
        let nextTotal: number | null = null
        let nextSolveRate: number | null = null

        if (myIdx !== -1) {
          nextRank = myIdx + 1
          nextTotal = rankedDaily.length
          setLeaderboardRank(nextRank)
          setLeaderboardTotal(nextTotal)
        }
        if (rankedDaily.length >= 3) {
          const wins = rankedDaily.filter((e) => e.won).length
          nextSolveRate = Math.round((wins / rankedDaily.length) * 100)
          setSolveRate(nextSolveRate)
        }

        // Sync all-time per-player stats from API and cache to avoid repeated pulls
        const mine = entries.filter((e) => normalizeName(e.name) === myKey)
        if (mine.length > 0) {
          const mineDaily = mine.filter(
            (e) => isTrueDailyEntry(e) && !String(e.date).startsWith('1970')
          )
          const bestDailyByDate = new Map<string, typeof mineDaily[number]>()
          for (const entry of mineDaily) {
            const dateKey = String(entry.date || '').slice(0, 10)
            if (!dateKey) continue
            const existing = bestDailyByDate.get(dateKey)
            if (!existing || isBetterEntry(entry, existing)) {
              bestDailyByDate.set(dateKey, entry)
            }
          }
          const dailyOutcomes = Array.from(bestDailyByDate.values())
          const daysPlayed = dailyOutcomes.length

          const winDistribution = [0, 0, 0, 0, 0, 0]
          let gamesFailed = 0
          let totalGames = 0

          for (const e of dailyOutcomes) {
            totalGames += 1
            if (e.won && e.guessCount >= 1 && e.guessCount <= 6) {
              winDistribution[e.guessCount - 1] += 1
            } else if (!e.won) {
              gamesFailed += 1
            }
          }

          const syncedStats: GameStats = {
            winDistribution,
            gamesFailed,
            totalGames,
            successRate: Math.round(
              (100 * (totalGames - gamesFailed)) / Math.max(totalGames, 1)
            ),
            // In this UI, currentStreak is displayed as Days Played.
            currentStreak: daysPlayed,
            bestStreak: gameStats.bestStreak,
          }

          setDisplayStats(syncedStats)
          saveStatsToLocalStorage(syncedStats)
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              fetchedAt: new Date().toISOString(),
              stats: syncedStats,
              leaderboard: {
                date: today,
                rank: nextRank,
                total: nextTotal,
                solveRate: nextSolveRate,
              },
            })
          )
        } else {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              fetchedAt: new Date().toISOString(),
              stats: {
                ...gameStats,
                currentStreak: gameStats.currentStreak,
                bestStreak: gameStats.bestStreak,
              },
              leaderboard: {
                date: today,
                rank: nextRank,
                total: nextTotal,
                solveRate: nextSolveRate,
              },
            })
          )
        }
      })
      .catch(() => {
        // Keep cached/local stats if network fails.
      })
  }, [isOpen, gameStats])
  return (
    <BaseModal
      title={STATISTICS_TITLE}
      isOpen={isOpen}
      handleClose={handleClose}
    >
      {isPersonalBest && (
        <div
          className="mb-3 animate-bounce rounded-xl px-4 py-2 text-center"
          style={{
            background: 'linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%)',
            boxShadow: '0 0 16px 2px #f107a388',
          }}
        >
          <span className="text-sm font-extrabold tracking-wide text-white">
            ⭐ New Personal Best! ⭐
          </span>
          {onPersonalBestSeen && (
            <button
              onClick={onPersonalBestSeen}
              className="ml-3 text-xs text-white/70 hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {isBonusRound && (
        <p className="glisten-text mb-2 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
          Bonus Round
        </p>
      )}
      <StatBar gameStats={displayStats} />
      <h4 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
        {GUESS_DISTRIBUTION_TEXT}
      </h4>
      <Histogram
        isLatestGame={isLatestGame}
        gameStats={displayStats}
        isGameWon={isGameWon}
        numberOfGuessesMade={numberOfGuessesMade}
      />
      {/* Personal bests card */}
      {(() => {
        const bestIdx = displayStats.winDistribution.findIndex((c) => c > 0)
        const bestGuessCount = bestIdx >= 0 ? bestIdx + 1 : null
        return (
          <div className="mt-4 flex justify-around rounded-lg border border-gray-200 bg-gray-50 px-2 py-3 dark:border-slate-600 dark:bg-slate-800">
            <div className="text-center">
              <div className="text-xl font-bold text-orange-500">
                🔥 {displayStats.currentStreak}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Days Played
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
      })()}      {/* Extra rounds summary */}
      {(extraRoundStats.bonus.played > 0 ||
        extraRoundStats.teachers.played > 0 ||
        extraRoundStats.grade.played > 0) && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
          <p className="mb-1.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
            Extra Rounds
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {extraRoundStats.bonus.played > 0 && (
              <div className="text-center">
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {extraRoundStats.bonus.won}/{extraRoundStats.bonus.played}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Bonus</div>
              </div>
            )}
            {extraRoundStats.teachers.played > 0 && (
              <div className="text-center">
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {extraRoundStats.teachers.won}/{extraRoundStats.teachers.played}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Teachers</div>
              </div>
            )}
            {extraRoundStats.grade.played > 0 && (
              <div className="text-center">
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {extraRoundStats.grade.won}/{extraRoundStats.grade.played}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Grade Rounds</div>
              </div>
            )}
          </div>
        </div>
      )}      {/* Hard word difficulty */}
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
            <div>
              <h5>{NEW_WORD_TEXT}</h5>
              <Countdown
                className="text-lg font-medium text-gray-900 dark:text-gray-100"
                date={tomorrow}
                daysInHours={true}
              />
            </div>
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
                  isDarkMode,
                  isHighContrastMode,
                  handleShareToClipboard,
                  handleShareFailure,
                  {
                    bonusSolution,
                    bonusGuesses,
                    teachersSolution,
                    teachersGuesses,
                    gradeRoundGuessesMap,
                    gradeRoundSolutions,
                    solveRate,
                    leaderboardRank,
                    leaderboardTotal,
                    totalGames: displayStats.totalGames,
                    winRate: displayStats.successRate,
                  }
                )
              }}
            >
              <MailIcon className="mr-2 h-6 w-6 cursor-pointer dark:stroke-white" />
              Email to a Friend
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
            (() => {
              const beatPct =
                leaderboardTotal > 1
                  ? Math.round(
                      ((leaderboardTotal - leaderboardRank) /
                        (leaderboardTotal - 1)) *
                        100
                    )
                  : 0
              const message =
                leaderboardRank === 1
                  ? `YOU are #1 today. Everyone is chasing you.`
                  : beatPct >= 90
                  ? `YOU beat ${beatPct}% of players today. Keep the pressure on.`
                  : beatPct >= 70
                  ? `YOU beat ${beatPct}% of players today. Climb a little more.`
                  : `YOU are in the mix. Beat your rank and jump the board.`

              return (
                <span>
                  <strong>#{leaderboardRank}</strong> of {leaderboardTotal}{' '}
                  today. {message}{' '}
                  <span className="underline">See full leaderboard</span>
                </span>
              )
            })()
          ) : (
            <span>
              See how you compare —{' '}
              <span className="underline">view today's leaderboard</span>
            </span>
          )}
        </div>
      )}
      {/* ── TEACHER FLOW ─────────────────────────────────────────────── */}
      {/* ── TEACHER FLOW ─────────────────────────────────────────────── */}
      {(isGameLost || isGameWon) && isLatestGame && isTeacherPlayer && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {/* Teacher bonus — available right after daily, exclusive to teachers */}
          {isBonusRoundAvailable && handleBonusRound ? (
            <button
              type="button"
              className="glisten-btn inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleBonusRound}
            >
              🎉 Teacher Bonus!
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              ✓ Bonus Done
            </div>
          )}
        </div>
      )}
      {/* Teacher grade picker — available right after daily */}
      {(isGameLost || isGameWon) &&
        isLatestGame &&
        isTeacherPlayer &&
        handleGradeRound && (
          <div className="mt-4 rounded-lg border border-purple-300 bg-purple-50 p-3 dark:border-purple-700 dark:bg-purple-900/20">
            {gradeRoundsPlayed.length >= 4 ? (
              <div
                className="rounded-lg px-4 py-3 text-center"
                style={{
                  background:
                    'linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%)',
                  boxShadow: '0 0 12px 1px #f107a366',
                }}
              >
                <p className="text-sm font-extrabold text-white">
                  🏆 You played every grade today! 🏆
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Come back tomorrow for more!
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-center text-sm font-bold text-purple-700 dark:text-purple-300">
                  🎓 Try a Grade!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(['9', '10', '11', '12'] as string[]).map((g) => {
                    const labels: Record<string, string> = {
                      '9': 'Freshman',
                      '10': 'Sophomore',
                      '11': 'Junior',
                      '12': 'Senior',
                    }
                    const done = gradeRoundsPlayed.includes(g)
                    return done ? (
                      <div
                        key={g}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        {labels[g]} ✓
                      </div>
                    ) : (
                      <button
                        key={g}
                        type="button"
                        className="rounded-md border border-transparent bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        onClick={() => handleGradeRound(g)}
                      >
                        {labels[g]}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

      {/* ── STUDENT FLOW ─────────────────────────────────────────────── */}
      {(isGameLost || isGameWon) && isLatestGame && !isTeacherPlayer && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {/* Bonus round button — always visible, done = muted badge */}
          {isBonusRoundAvailable && handleBonusRound ? (
            <button
              type="button"
              className="glisten-btn inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleBonusRound}
            >
              Bonus Round!
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              ✓ Bonus Done
            </div>
          )}
          {/* Teachers round button — always visible, done = muted badge */}
          {isTeachersRound || !isTeachersRoundAvailable ? (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
              🍎 Teachers Done ✓
            </div>
          ) : (
            <button
              type="button"
              className="glisten-btn inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              onClick={handleTeachersRound}
            >
              🍎 Teachers Round!
            </button>
          )}
        </div>
      )}
      {/* Student grade picker — visible when daily is done; grades lock until all rounds complete */}
      {(isGameLost || isGameWon) &&
        isLatestGame &&
        !isTeacherPlayer &&
        handleGradeRound && (
          <div className="mt-4 rounded-lg border border-purple-300 bg-purple-50 p-3 dark:border-purple-700 dark:bg-purple-900/20">
            {gradeRoundsPlayed.filter((g) => g !== playerGrade).length >= 3 &&
            gradeRoundsPlayed.includes(playerGrade || '') ? (
              <div
                className="rounded-lg px-4 py-3 text-center"
                style={{
                  background:
                    'linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%)',
                  boxShadow: '0 0 12px 1px #f107a366',
                }}
              >
                <p className="text-sm font-extrabold text-white">
                  🏆 You played every grade today! 🏆
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Full house — come back tomorrow!
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-center text-sm font-bold text-purple-700 dark:text-purple-300">
                  ⭐ Pick Any Grade to Play!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(['9', '10', '11', '12'] as string[]).map((g) => {
                    const labels: Record<string, string> = {
                      '9': 'Freshman',
                      '10': 'Sophomore',
                      '11': 'Junior',
                      '12': 'Senior',
                    }
                    const isOwnGrade = g === playerGrade
                    const done = gradeRoundsPlayed.includes(g) || isOwnGrade
                    const locked = !done && !allRoundsComplete
                    return done ? (
                      <div
                        key={g}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        {labels[g]} ✓
                      </div>
                    ) : locked ? (
                      <button
                        key={g}
                        type="button"
                        className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500"
                        onClick={() =>
                          setLockMessage(
                            'Complete Bonus + Teachers rounds first to unlock other grades!'
                          )
                        }
                      >
                        🔒 {labels[g]}
                      </button>
                    ) : (
                      <button
                        key={g}
                        type="button"
                        className="rounded-md border border-transparent bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        onClick={() => {
                          setLockMessage('')
                          handleGradeRound(g)
                        }}
                      >
                        {labels[g]}
                      </button>
                    )
                  })}
                </div>
                {lockMessage && (
                  <p className="mt-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400">
                    🔒 {lockMessage}
                  </p>
                )}
              </>
            )}
          </div>
        )}
    </BaseModal>
  )
}
