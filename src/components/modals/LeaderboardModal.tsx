import { useEffect, useState } from 'react'

import { computeMvp, computeStreaks, fetchLeaderboard, LeaderboardEntry, MvpEntry } from '../../lib/api'
import { BaseModal } from './BaseModal'

type Props = {
  isOpen: boolean
  handleClose: () => void
}

const gradeLabels: Record<string, string> = {
  '9': 'Freshman',
  '10': 'Sophomore',
  '11': 'Junior',
  '12': 'Senior',
}

const formatTime = (sec: number): string => {
  if (!sec || sec <= 0) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const MvpExplainerModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 max-w-sm rounded-2xl border-2 border-yellow-400 bg-white px-6 py-5 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <p className="mb-1 text-center text-lg font-extrabold text-yellow-600 dark:text-yellow-400">
          🏆 What is the MVP?
        </p>
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-yellow-500">
          Most Valuable Player
        </p>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          The <strong>MVP</strong> is the best overall Studentle player at the
          school, based on <em>all-time</em> stats — not just today. To qualify
          you need at least <strong>3 games</strong> played.
        </p>
        <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20">
          <p className="mb-2 text-xs font-bold uppercase text-yellow-700 dark:text-yellow-400">
            How the score is calculated
          </p>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <span className="font-semibold text-yellow-600">60 pts</span> — Win
              rate (% of games solved)
            </li>
            <li>
              <span className="font-semibold text-yellow-600">30 pts</span> —
              Guess efficiency (fewer guesses = higher score)
            </li>
            <li>
              <span className="font-semibold text-yellow-600">10 pts</span> —
              Consistency (up to 20 games played)
            </li>
          </ul>
        </div>
        <p className="text-center text-xs italic text-gray-400 dark:text-gray-500">
          Recalculated live from all-time data. Anyone can take the crown — keep playing!
        </p>
      </div>
    </div>
  )
}

export const LeaderboardModal = ({ isOpen, handleClose }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [mvp, setMvp] = useState<MvpEntry | null>(null)
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [filterType, setFilterType] = useState<'daily' | 'bonus'>('daily')
  const [isMvpExplainerOpen, setIsMvpExplainerOpen] = useState(false)

  const _ld = new Date()
  const today = `${_ld.getFullYear()}-${String(_ld.getMonth() + 1).padStart(2, '0')}-${String(_ld.getDate()).padStart(2, '0')}`

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetchLeaderboard(today, filterGrade)
      .then((data) => {
        setEntries(data)
        setMvp(computeMvp(data))
        setStreaks(computeStreaks(data))
      })
      .finally(() => setLoading(false))
  }, [isOpen, filterGrade])

  const filtered = entries.filter((e) => e.gameType === filterType)

  return (
    <BaseModal title="Leaderboard" isOpen={isOpen} handleClose={handleClose}>
      <div className="mb-3 flex gap-2">
        <button
          className={`rounded px-3 py-1 text-sm font-semibold ${
            filterType === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
          }`}
          onClick={() => setFilterType('daily')}
        >
          Daily
        </button>
        <button
          className={`rounded px-3 py-1 text-sm font-semibold ${
            filterType === 'bonus'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
          }`}
          onClick={() => setFilterType('bonus')}
        >
          Bonus
        </button>
        <select
          className="ml-auto rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-slate-800 dark:text-white"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">All Grades</option>
          <option value="9">Freshman</option>
          <option value="10">Sophomore</option>
          <option value="11">Junior</option>
          <option value="12">Senior</option>
        </select>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          No results yet for today
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                <th className="w-7 py-1 pr-1">#</th>
                <th className="py-1 pr-1">Name</th>
                <th className="w-16 py-1 pr-1">Grade</th>
                <th className="w-14 py-1 pr-1 text-center">Guesses</th>
                <th className="w-12 py-1 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    entry.name ===
                      (() => {
                        const fn = localStorage.getItem('playerName') || ''
                        const li = localStorage.getItem('playerLastInitial') || ''
                        return li ? `${fn} ${li}` : fn
                      })()
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <td className="py-1 pr-1">{i + 1}</td>
                  <td className="truncate py-1 pr-1">
                    {entry.name}
                    {(streaks.get(entry.name) ?? 0) >= 2 && (
                      <span className="ml-1 text-xs text-orange-500">
                        🔥{streaks.get(entry.name)}
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-1 text-xs">
                    {gradeLabels[String(entry.grade)] || entry.grade}
                  </td>
                  <td className="py-1 pr-1 text-center">
                    {entry.won ? entry.guessCount : 'X'}
                  </td>
                  <td className="py-1 text-right">
                    {formatTime(entry.totalDurationSec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mvp && (
        <div className="mt-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20">
          {/* Header row: "All-Time" + clickable MVP */}
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500">
            🏆 All-Time{' '}
            <button
              onClick={() => setIsMvpExplainerOpen(true)}
              className="underline decoration-dotted underline-offset-2 hover:text-yellow-800 dark:hover:text-yellow-300"
              title="What is MVP? Click to learn more"
            >
              MVP
            </button>
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-yellow-700 dark:text-yellow-400">{mvp.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {gradeLabels[String(mvp.grade)] || `Grade ${mvp.grade}`}
              </p>
            </div>
            <div className="flex gap-4 text-center text-xs">
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {Math.round(mvp.winRate * 100)}%
                </p>
                <p className="text-gray-500 dark:text-gray-400">Win Rate</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {mvp.avgGuesses > 0 ? mvp.avgGuesses.toFixed(1) : '-'}
                </p>
                <p className="text-gray-500 dark:text-gray-400">Avg Guesses</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">{mvp.totalGames}</p>
                <p className="text-gray-500 dark:text-gray-400">Games</p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-xs italic text-gray-400 dark:text-gray-500">
            Calculated from all-time stats across every game they've played.{' '}
            <button
              onClick={() => setIsMvpExplainerOpen(true)}
              className="underline decoration-dotted underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
            >
              How is this calculated?
            </button>
          </p>
        </div>
      )}

      <MvpExplainerModal
        isOpen={isMvpExplainerOpen}
        onClose={() => setIsMvpExplainerOpen(false)}
      />
    </BaseModal>
  )
}
