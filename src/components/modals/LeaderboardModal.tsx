import { useEffect, useState } from 'react'

import { fetchLeaderboard, LeaderboardEntry } from '../../lib/api'
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

export const LeaderboardModal = ({ isOpen, handleClose }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [filterType, setFilterType] = useState<'daily' | 'bonus'>('daily')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetchLeaderboard('', filterGrade)
      .then((data) => {
        // Filter to today client-side (sheet dates may be full ISO strings)
        const todayEntries = data.filter(
          (e) => e.date && String(e.date).startsWith(today)
        )
        setEntries(todayEntries)
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">Grade</th>
                <th className="py-1 pr-2">Guesses</th>
                <th className="py-1">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    entry.name === localStorage.getItem('playerName')
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <td className="py-1 pr-2">{i + 1}</td>
                  <td className="py-1 pr-2">{entry.name}</td>
                  <td className="py-1 pr-2">
                    {gradeLabels[String(entry.grade)] || entry.grade}
                  </td>
                  <td className="py-1 pr-2">
                    {entry.won ? entry.guessCount : 'X'}
                  </td>
                  <td className="py-1">
                    {formatTime(entry.totalDurationSec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  )
}
