import { useEffect, useState } from 'react'

import { computeAllTimeLeaderboard, computeMvp, computeStreaks, fetchLeaderboard, AllTimeEntry, LeaderboardEntry, MvpEntry } from '../../lib/api'
import { BaseModal } from './BaseModal'

type Props = {
  isOpen: boolean
  handleClose: () => void
}

const gradeLabels: Record<string, string> = {
  '0': 'Teacher',
  '9': 'Freshman',
  '10': 'Sophomore',
  '11': 'Junior',
  '12': 'Senior',
}

const gradeBadgeClass: Record<string, string> = {
  '0': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  '9': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  '10': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  '11': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  '12': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

const gradeShort: Record<string, string> = {
  '0': 'TCH', '9': 'FR', '10': 'SO', '11': 'JR', '12': 'SR',
}

const formatTime = (sec: number): string => {
  if (!sec || sec <= 0) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const toTitleCase = (name: string): string =>
  name.replace(/\b\w/g, (c) => c.toUpperCase())

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
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative max-w-sm w-full rounded-2xl px-6 py-5 shadow-2xl"
        style={{
          zIndex: 10000,
          background: 'linear-gradient(145deg, #1a1200 0%, #2e1f00 40%, #1a1200 100%)',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          boxShadow: '0 0 0 2px #b8860b, 0 0 24px 4px #f5c518aa, 0 8px 32px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* gold shimmer bar */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)' }} />
        <button
          className="absolute right-3 top-3 font-bold"
          style={{ color: '#b8860b' }}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <p className="mb-1 text-center text-xl font-extrabold" style={{ color: '#f5c518', textShadow: '0 0 12px #f5c51888' }}>
          🏆 What is the MVP?
        </p>
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: '#c9a227' }}>
          Most Valuable Player
        </p>
        <p className="mb-4 text-sm" style={{ color: '#e8d5a0' }}>
          The <strong style={{ color: '#f5c518' }}>MVP</strong> is the best overall Studentle player at the
          school, based on <em>all-time</em> stats — not just today. There is only
          <strong style={{ color: '#f5c518' }}> one MVP</strong> at a time. To qualify,
          you need at least <strong style={{ color: '#f5c518' }}>3 games</strong> played.
          MVP uses total games across all modes (daily, bonus, teachers, and grade rounds).
          The All-Time table above is separate and counts <strong style={{ color: '#f5c518' }}>days</strong>.
        </p>
        <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid #7b5800' }}>
          <p className="mb-2 text-xs font-bold uppercase" style={{ color: '#f5c518', letterSpacing: '0.1em' }}>
            How the score is calculated
          </p>
          <ul className="space-y-1 text-sm" style={{ color: '#e8d5a0' }}>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>35 pts</span> — Volume (total games played across all modes)
            </li>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>40 pts</span> — Win rate (% of all games solved)
            </li>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>25 pts</span> — Guess efficiency (fewer guesses = higher score)
            </li>
          </ul>
        </div>
        <p className="text-center text-xs italic" style={{ color: '#a07820' }}>
          Recalculated live from all-time game data. One crown, one leader.
          Anyone can take it — keep playing!
        </p>
        {/* gold shimmer bar bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl" style={{ background: 'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)' }} />
      </div>
    </div>
  )
}

export const LeaderboardModal = ({ isOpen, handleClose }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [allTimeEntries, setAllTimeEntries] = useState<AllTimeEntry[]>([])
  const [mvp, setMvp] = useState<MvpEntry | null>(null)
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [filterType, setFilterType] = useState<'daily' | 'bonus' | 'teachers' | 'graderound'>('daily')
  const [gradeRoundFilter, setGradeRoundFilter] = useState<string>('9')
  const [viewMode, setViewMode] = useState<'today' | 'alltime'>('today')
  const [isMvpExplainerOpen, setIsMvpExplainerOpen] = useState(false)

  const _ld = new Date()
  const today = `${_ld.getFullYear()}-${String(_ld.getMonth() + 1).padStart(2, '0')}-${String(_ld.getDate()).padStart(2, '0')}`

  // Grade rounds are filtered client-side by gameType and only exist in Today view.
  // Keep grade filtering active for All-Time regardless of last selected Today tab.
  const effectiveFetchGrade =
    viewMode === 'today' && filterType === 'graderound' ? '' : filterGrade

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    if (viewMode === 'today') {
      fetchLeaderboard(today, effectiveFetchGrade)
        .then((data) => {
          setEntries(data)
          setMvp(computeMvp(data))
          setStreaks(computeStreaks(data))
        })
        .finally(() => setLoading(false))
    } else {
      fetchLeaderboard(undefined, effectiveFetchGrade, true)
        .then((data) => {
          setAllTimeEntries(computeAllTimeLeaderboard(data))
          setMvp(computeMvp(data))
          setStreaks(computeStreaks(data))
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, filterGrade, filterType, viewMode])

  const filtered = (() => {
    const byType = entries.filter((e) => {
      const type = String(e.gameType || '').toLowerCase().trim()
      if (filterType === 'graderound') {
        // Show anyone who played that grade's word (gameType=grade11, grade10, etc.)
        // Legacy rows used gameType='grade' with the player's own grade — include those too.
        return type === `grade${gradeRoundFilter}` || (type === 'grade' && String(e.grade) === gradeRoundFilter)
      }
      if (filterType === 'daily') {
        // Daily entries are now submitted as grade11/grade10/etc.
        // Show entries where the gameType matches the player's own registered grade.
        // Also accept legacy 'daily' rows for backward compatibility.
        return type === `grade${e.grade}` || type === 'daily'
      }
      return type === filterType
    })
    // Deduplicate: one entry per player name — keep their best result
    const map = new Map<string, LeaderboardEntry>()
    for (const e of byType) {
      const key = e.name.toLowerCase()
      const existing = map.get(key)
      if (!existing) {
        map.set(key, e)
      } else {
        // Bonus / teachers / grade rounds: keep best result
        const existingWon = existing.won
        const newWon = e.won
        if (newWon && !existingWon) {
          map.set(key, e)
        } else if (newWon && existingWon) {
          if (
            e.guessCount < existing.guessCount ||
            (e.guessCount === existing.guessCount &&
              e.totalDurationSec < existing.totalDurationSec)
          ) {
            map.set(key, e)
          }
        }
      }
    }
    const out = Array.from(map.values())
    // Re-sort after dedup: value-swaps for daily can shift worse entries to earlier
    // positions. Always rank by: wins first, then fewest guesses, then fastest.
    out.sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1
      if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
      return a.totalDurationSec - b.totalDurationSec
    })
    return out
  })()
  const myName = (() => {
    const fn = localStorage.getItem('playerName') || ''
    const li = localStorage.getItem('playerLastInitial') || ''
    const prefix = localStorage.getItem('playerPrefix') || ''
    return prefix ? `${prefix} ${fn}` : li ? `${fn} ${li}` : fn
  })()

  const myRank = filtered.findIndex((e) => e.name.toLowerCase() === myName.toLowerCase()) + 1

  return (
    <BaseModal title="Leaderboard" isOpen={isOpen} handleClose={handleClose}>
      {/* ── View mode row: Today | All-Time + grade filter ── */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode('today')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              viewMode === 'today'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >Today</button>
          <button
            onClick={() => setViewMode('alltime')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              viewMode === 'alltime'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >All&#8209;Time</button>
        </div>
        {/* Grade filter — hidden when viewing grade rounds */}
        {(viewMode === 'alltime' || filterType !== 'graderound') && (
          <select
            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-slate-800 dark:text-white"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="">All Grades</option>
            <option value="9">Freshman</option>
            <option value="10">Sophomore</option>
            <option value="11">Junior</option>
            <option value="12">Senior</option>
            <option value="0">Teacher</option>
          </select>
        )}
      </div>

      {/* ── Today sub-tabs: Daily | Bonus | Teachers | Grade Rounds ── */}
      {viewMode === 'today' && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType('daily')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'daily' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >Daily</button>
          <button
            onClick={() => setFilterType('bonus')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'bonus' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >Bonus</button>
          <button
            onClick={() => setFilterType('teachers')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'teachers' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >🍎 Teachers</button>
          <button
            onClick={() => setFilterType('graderound')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'graderound' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >Grade Rounds</button>
        </div>
      )}

      {/* ── Grade round sub-selector ── */}
      {viewMode === 'today' && filterType === 'graderound' && (
        <div className="mb-3 flex gap-1.5 flex-wrap">
          <button onClick={() => setGradeRoundFilter('9')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '9' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600 hover:border-emerald-400 dark:border-gray-600 dark:text-gray-300'
            }`}>Freshman</button>
          <button onClick={() => setGradeRoundFilter('10')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '10' ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-sky-400 dark:border-gray-600 dark:text-gray-300'
            }`}>Sophomore</button>
          <button onClick={() => setGradeRoundFilter('11')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '11' ? 'bg-violet-500 text-white border-violet-500' : 'border-gray-300 text-gray-600 hover:border-violet-400 dark:border-gray-600 dark:text-gray-300'
            }`}>Junior</button>
          <button onClick={() => setGradeRoundFilter('12')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '12' ? 'bg-rose-500 text-white border-rose-500' : 'border-gray-300 text-gray-600 hover:border-rose-400 dark:border-gray-600 dark:text-gray-300'
            }`}>Senior</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
        </div>
      ) : viewMode === 'alltime' ? (
        allTimeEntries.length === 0 ? (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">No data yet</p>
        ) : (
          <>
            <p className="mb-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {allTimeEntries.length} player{allTimeEntries.length !== 1 ? 's' : ''}
            </p>
            <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm text-gray-800 dark:text-gray-200">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                  <th className="w-6 pb-1.5 pr-1">#</th>
                  <th className="pb-1.5 pr-1">Name</th>
                  <th className="w-10 pb-1.5 pr-1 text-center">Grade</th>
                  <th className="w-12 pb-1.5 pr-1 text-center">Days</th>
                  <th className="w-10 pb-1.5 pr-1 text-center">Wins</th>
                  <th className="w-12 py-1 text-right">Win%</th>
                </tr>
              </thead>
              <tbody>
                {allTimeEntries.map((entry, i) => {
                  const isMvpRow =
                    mvp && entry.name.toLowerCase() === mvp.name.toLowerCase()
                  const isMe = entry.name.toLowerCase() === myName.toLowerCase()
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 dark:border-gray-700 ${
                        isMe
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : isMvpRow
                          ? 'font-bold'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <td className="py-1 pr-1">{i + 1}</td>
                      <td className="truncate py-1 pr-1">
                        {isMvpRow && <span className="mr-0.5">👑</span>}
                        <span
                          style={
                            isMvpRow && !isMe ? { color: '#d4a017' } : undefined
                          }
                        >
                          {toTitleCase(entry.name)}
                        </span>
                        {(streaks.get(entry.name.toLowerCase().trim()) ?? 0) >= 2 && (
                          <span className="ml-1 text-xs text-orange-500">
                            🔥{streaks.get(entry.name.toLowerCase().trim())}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-1 text-center">
                        <span className={`inline-block rounded px-1 py-0.5 text-xs font-bold ${gradeBadgeClass[String(entry.grade)] ?? 'bg-gray-100 text-gray-600'}`}>
                          {gradeShort[String(entry.grade)] ?? String(entry.grade)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-1 text-center">{entry.totalDays}</td>
                      <td className="py-1 pr-1 text-center">{entry.wins}</td>
                      <td className="py-1 text-right">
                        {Math.round(entry.winRate * 100)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          {filterType === 'graderound'
            ? `No ${gradeLabels[gradeRoundFilter] || ''} round results yet today`
            : 'No results yet for today'}
        </p>
      ) : (
        <>
          <p className="mb-1 text-right text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} today
          </p>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm text-gray-800 dark:text-gray-200">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                  <th className="w-6 pb-1.5 pr-1">#</th>
                  <th className="pb-1.5 pr-1">Name</th>
                  <th className="w-10 pb-1.5 pr-1 text-center">Grade</th>
                  <th className="w-14 pb-1.5 pr-1 text-center">Guesses</th>
                  <th className="w-14 pb-1.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const isMvpRow =
                    mvp && entry.name.toLowerCase() === mvp.name.toLowerCase()
                  const isMe = entry.name.toLowerCase() === myName.toLowerCase()
                  const podium =
                    i === 0
                      ? { bg: 'rgba(255,215,0,0.12)', medal: '🥇', color: '#b8860b' }
                      : i === 1
                      ? { bg: 'rgba(192,192,192,0.12)', medal: '🥈', color: '#888' }
                      : i === 2
                      ? { bg: 'rgba(205,127,50,0.12)', medal: '🥉', color: '#a06030' }
                      : null
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 dark:border-gray-700 ${
                        isMe
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : isMvpRow
                          ? 'font-bold'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                      style={podium && !isMe ? { background: podium.bg } : undefined}
                    >
                      <td className="py-1.5 pr-1 text-center">
                        {podium ? (
                          <span className="text-base leading-none">{podium.medal}</span>
                        ) : (
                          <span className="text-xs text-gray-400">{i + 1}</span>
                        )}
                      </td>
                      <td className="max-w-[110px] truncate py-1.5 pr-1">
                        {isMvpRow && <span className="mr-0.5">👑</span>}
                        <span
                          style={
                            isMe
                              ? undefined
                              : podium
                              ? { color: podium.color, fontWeight: 700 }
                              : isMvpRow
                              ? { color: '#d4a017' }
                              : undefined
                          }
                        >
                          {toTitleCase(entry.name)}
                        </span>
                        {(streaks.get(entry.name.toLowerCase().trim()) ?? 0) >= 2 && (
                          <span className="ml-1 text-xs text-orange-500">
                            🔥{streaks.get(entry.name.toLowerCase().trim())}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-1 text-center">
                        <span className={`inline-block rounded px-1 py-0.5 text-xs font-bold ${gradeBadgeClass[String(entry.grade)] ?? 'bg-gray-100 text-gray-600'}`}>
                          {gradeShort[String(entry.grade)] ?? String(entry.grade)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-1 text-center font-mono">
                        {entry.won ? entry.guessCount : <span className="font-bold text-red-500">✕</span>}
                      </td>
                      <td className="py-1.5 text-right font-mono text-xs">
                        {formatTime(entry.totalDurationSec)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {myRank > 0 && (
            <p className="mt-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
              Your rank: <span className="font-bold text-blue-500">#{myRank}</span> of {filtered.length}
            </p>
          )}
        </>
      )}

      {mvp && (
        <div
          className="mt-4 rounded-xl px-4 py-3 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1a1200 0%, #2e1f00 50%, #1a1200 100%)',
            boxShadow: '0 0 0 2px #b8860b, 0 0 16px 2px #f5c51866',
          }}
        >
          {/* shimmer top */}
          <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: 'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)' }} />
          {/* Header */}
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: '#c9a227' }}>
            🏆 All-Time{' '}
            <button
              onClick={() => setIsMvpExplainerOpen(true)}
              className="underline decoration-dotted underline-offset-2"
              style={{ color: '#f5c518' }}
              title="What is MVP? Click to learn more"
            >
              MVP
            </button>
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-lg" style={{ color: '#f5c518', textShadow: '0 0 8px #f5c51888' }}>
                {toTitleCase(mvp.name)}
              </p>
              <p className="text-xs" style={{ color: '#a07820' }}>
                {gradeLabels[String(mvp.grade)] || `Grade ${mvp.grade}`}
              </p>
            </div>
            <div className="flex gap-4 text-center text-xs">
              <div>
                <p className="font-bold" style={{ color: '#f5c518' }}>
                  {Math.round(mvp.winRate * 100)}%
                </p>
                <p style={{ color: '#c9a227' }}>Win Rate</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: '#f5c518' }}>
                  {mvp.avgGuesses > 0 ? mvp.avgGuesses.toFixed(1) : '-'}
                </p>
                <p style={{ color: '#c9a227' }}>Avg Guesses</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: '#f5c518' }}>{mvp.totalGames}</p>
                <p style={{ color: '#c9a227' }}>Games</p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-xs italic" style={{ color: '#7b5800' }}>
            One school-wide MVP is calculated from all-time games across all modes.
            The table above tracks all-time daily days.{' '}
            <button
              onClick={() => setIsMvpExplainerOpen(true)}
              className="underline decoration-dotted underline-offset-2"
              style={{ color: '#a07820' }}
            >
              How is this calculated?
            </button>
          </p>
          {/* shimmer bottom */}
          <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: 'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)' }} />
        </div>
      )}

      <MvpExplainerModal
        isOpen={isMvpExplainerOpen}
        onClose={() => setIsMvpExplainerOpen(false)}
      />
    </BaseModal>
  )
}
