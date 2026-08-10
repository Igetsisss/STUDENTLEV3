import { useEffect, useMemo, useRef, useState } from 'react'

import {
  AllTimeEntry,
  LeaderboardEntry,
  MvpEntry,
  computeAllTimeLeaderboard,
  computeMvp,
  computeStreaks,
  fetchCurrentRoster,
  fetchLeaderboard,
} from '../../lib/api'
import { getTodayDateKey } from '../../lib/dateutils'
import {
  getPlayerLastInitial,
  getPlayerName,
  getPlayerPrefix,
} from '../../lib/localStorage'
import { BaseModal } from './BaseModal'

// ── In-memory leaderboard cache ──────────────────────────────────────────────
// Keyed by "<viewMode>:<filterGrade>" (e.g. "today:", "alltime:11"). Once
// fetched, a key stays cached indefinitely — opening the leaderboard never
// re-fetches on its own. The only thing that invalidates it is the player
// finishing a game (see the effect below): standings only change when
// someone submits a result, so there's nothing to gain from polling on a
// timer, just a slower modal.
type LeaderboardCacheEntry = {
  fetchedAt: number
  raw: LeaderboardEntry[]
}
const leaderboardCache = new Map<string, LeaderboardCacheEntry>()
let currentRosterCache: Record<string, number> | null = null

type Props = {
  isOpen: boolean
  handleClose: () => void
  solutionLength: number
  isGameComplete: boolean
  activeGuessWords: readonly string[]
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
  '0': 'TCH',
  '9': 'FR',
  '10': 'SO',
  '11': 'JR',
  '12': 'SR',
}

// Today's entries are submitted live, using whatever grade the player is
// registered as right now, so they can't belong to someone already removed
// from the roster — this cutoff is just a defensive fallback in case a
// "played today" flag hasn't finished writing by the time the leaderboard
// re-fetches. Fall 2026 rollover — see
// supabase/migrations/005-fall-2026-grade-rollover.sql.
const SENIOR_ALUM_CUTOFF = '2026-08-04T12:19:50.813937Z'

const isAlumByTimestamp = (grade: number, submittedAt?: string): boolean =>
  grade === 12 && !!submittedAt && submittedAt < SENIOR_ALUM_CUTOFF

// All-time entries can be years old, so instead of guessing from a date
// cutoff, the caller passes whether this person is still on the current
// roster (computeAllTimeLeaderboard already resolved that against
// player_profiles) — a graduated senior is simply missing from it.
const gradeLabelFor = (grade: number, isAlum: boolean): string =>
  isAlum ? 'Alum' : gradeLabels[String(grade)]

const gradeShortFor = (grade: number, isAlum: boolean): string =>
  isAlum ? 'ALM' : gradeShort[String(grade)]

const gradeBadgeClassFor = (grade: number, isAlum: boolean): string =>
  isAlum
    ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    : gradeBadgeClass[String(grade)]

const formatTime = (sec: number): string => {
  if (!sec || sec <= 0) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const toTitleCase = (name: string): string =>
  name.replace(/\b\w/g, (c) => c.toUpperCase())

const samePlayer = (left?: string | null, right?: string | null) =>
  String(left || '')
    .toLowerCase()
    .trim() ===
  String(right || '')
    .toLowerCase()
    .trim()

// Tokens that are title prefixes — not real name words.
const NAME_PREFIXES = new Set([
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'coach',
  'prof',
])

// Returns true when any "real" word in the name (not a prefix or single-letter
// initial) exactly matches one of the valid solution words — meaning the player
// may have set their name to today's answer for some still-unplayed mode/grade
// and it should be hidden. validWords already excludes lengths the viewer has
// completed today, so this stays accurate as they play more modes.
const shouldRedactName = (name: string, validWords: Set<string>): boolean => {
  if (validWords.size === 0) return false
  const tokens = String(name || '')
    .trim()
    .split(/\s+/)
  for (const token of tokens) {
    const letters = token.replace(/[^a-zA-Z]/g, '').toLowerCase()
    if (letters.length <= 1 || NAME_PREFIXES.has(letters)) continue
    if (validWords.has(letters)) return true
  }
  return false
}

const RedactedName = ({ length }: { length: number }) => (
  <span
    title="Name hidden — could be today's answer"
    className="select-none rounded px-0.5 font-mono text-gray-400 dark:text-gray-600"
    aria-label="hidden"
  >
    {'█'.repeat(length)}
  </span>
)

const getTodayLeaderLabel = (
  filterType: 'daily' | 'bonus' | 'teachers' | 'graderound'
) => {
  if (filterType === 'bonus') return "Today's Bonus Leader"
  if (filterType === 'teachers') return "Today's Teacher Leader"
  if (filterType === 'graderound') return "Today's Grade Round Leader"
  return "Today's Leader"
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
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-sm rounded-2xl px-6 py-5 shadow-2xl"
        style={{
          zIndex: 10000,
          background:
            'linear-gradient(145deg, #1a1200 0%, #2e1f00 40%, #1a1200 100%)',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          boxShadow:
            '0 0 0 2px #b8860b, 0 0 24px 4px #f5c518aa, 0 8px 32px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* gold shimmer bar */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
          style={{
            background:
              'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)',
          }}
        />
        <button
          className="absolute right-3 top-3 font-bold"
          style={{ color: '#b8860b' }}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <p
          className="mb-1 text-center text-xl font-extrabold"
          style={{ color: '#f5c518', textShadow: '0 0 12px #f5c51888' }}
        >
          🏆 What is the MVP?
        </p>
        <p
          className="mb-3 text-center text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#c9a227' }}
        >
          Most Valuable Player
        </p>
        <p className="mb-4 text-sm" style={{ color: '#e8d5a0' }}>
          The <strong style={{ color: '#f5c518' }}>MVP</strong> is the best
          overall Studentle player at the school, based on <em>all-time</em>{' '}
          stats — not just today. There is only
          <strong style={{ color: '#f5c518' }}> one MVP</strong> at a time. To
          qualify, you need at least{' '}
          <strong style={{ color: '#f5c518' }}>3 games</strong> played. MVP uses
          total games across all modes (daily, bonus, teachers, and grade
          rounds). The Today tab has its own leader. The all-time MVP is the
          school-wide crown.
        </p>
        <div
          className="mb-4 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(245,197,24,0.08)',
            border: '1px solid #7b5800',
          }}
        >
          <p
            className="mb-2 text-xs font-bold uppercase"
            style={{ color: '#f5c518', letterSpacing: '0.1em' }}
          >
            How the score is calculated
          </p>
          <ul className="space-y-1 text-sm" style={{ color: '#e8d5a0' }}>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>
                Weighted Difficulty Score
              </span>{' '}
              — You earn more points for winning harder rounds:
              <ul className="ml-4 mt-1 list-disc text-xs">
                <li>
                  Bonus Round win: <b>1.5</b> pts
                </li>
                <li>
                  Teacher Round win: <b>1.2</b> pts
                </li>
                <li>
                  Your Grade's Daily win: <b>1.0</b> pts
                </li>
                <li>
                  Other Grade win: <b>0.8</b> pts
                </li>
                <li>
                  Losses: <b>0</b> pts
                </li>
              </ul>
            </li>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>
                Final MVP Score
              </span>{' '}
              — Calculated as: <br />
              <span className="ml-2 text-xs">
                (<b>Total Weighted Points</b> / <b>Average Guesses</b>) ×{' '}
                <b>Win Rate</b>
              </span>
            </li>
            <li>
              <span className="font-bold" style={{ color: '#f5c518' }}>
                Top 10 MVPs
              </span>{' '}
              — The leaderboard shows the 10 players with the highest MVP Score.
            </li>
          </ul>
        </div>
        <p className="text-center text-xs italic" style={{ color: '#a07820' }}>
          Recalculated live from all-time game data. One crown, one leader.
          Anyone can take it — keep playing!
        </p>
        {/* gold shimmer bar bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl"
          style={{
            background:
              'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)',
          }}
        />
      </div>
    </div>
  )
}

export const LeaderboardModal = ({
  isOpen,
  handleClose,
  solutionLength,
  isGameComplete,
  activeGuessWords,
}: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [allTimeEntries, setAllTimeEntries] = useState<AllTimeEntry[]>([])
  const [mvp, setMvp] = useState<MvpEntry | null>(null)
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [filterType, setFilterType] = useState<
    'daily' | 'bonus' | 'teachers' | 'graderound'
  >('daily')
  const [gradeRoundFilter, setGradeRoundFilter] = useState<string>('9')
  const [viewMode, setViewMode] = useState<'today' | 'alltime'>('today')
  const [isMvpExplainerOpen, setIsMvpExplainerOpen] = useState(false)

  // Words that are still a secret: exactly the valid-guess list for the ONE
  // game currently active on the main board (whatever mode/grade the player
  // is actually mid-puzzle on), passed down from App.tsx. This is not tab-
  // or filter-dependent — it doesn't matter which leaderboard tab you're
  // looking at, only whether the name you're looking at could be the answer
  // to the game you're actively playing. Once that game is complete there's
  // nothing left to protect.
  const validWordsForLength = useMemo(() => {
    if (isGameComplete) return new Set<string>()
    return new Set(activeGuessWords.map((w) => w.toLowerCase()))
  }, [isGameComplete, activeGuessWords])

  const today = getTodayDateKey()

  // Bumped after a game finishes (see the effect below) to force a refetch
  // even though isOpen/viewMode/filterGrade haven't changed — covers the
  // case where the leaderboard is already open when the game completes.
  const [refreshTick, setRefreshTick] = useState(0)

  // Fetch raw data from Supabase.
  // For "today" we always fetch ALL game types so switching between Daily /
  // Bonus / Teachers / Grade Round tabs is instant (client-side filter only —
  // no new network request).  Grade filter still applies server-side so users
  // only wait once when they change the grade dropdown.
  // For "all-time" we pass the grade filter so the paginated query stays lean,
  // plus the current roster so grades reflect who's promoted/graduated since.
  useEffect(() => {
    if (!isOpen) return
    const cacheKey = `${viewMode}:${filterGrade}`
    const cached = leaderboardCache.get(cacheKey)
    if (cached) {
      const data = cached.raw
      if (viewMode === 'today') {
        setEntries(data)
      } else {
        setAllTimeEntries(
          computeAllTimeLeaderboard(data, currentRosterCache ?? {})
        )
      }
      setMvp(computeMvp(data))
      setStreaks(computeStreaks(data))
      return
    }
    setLoading(true)
    if (viewMode === 'today') {
      fetchLeaderboard(today, filterGrade)
        .then((data) => {
          leaderboardCache.set(cacheKey, { fetchedAt: Date.now(), raw: data })
          setEntries(data)
          setMvp(computeMvp(data))
          setStreaks(computeStreaks(data))
        })
        .finally(() => setLoading(false))
    } else {
      Promise.all([
        fetchLeaderboard(undefined, filterGrade, true),
        currentRosterCache
          ? Promise.resolve(currentRosterCache)
          : fetchCurrentRoster(),
      ])
        .then(([data, roster]) => {
          currentRosterCache = roster
          leaderboardCache.set(cacheKey, { fetchedAt: Date.now(), raw: data })
          setAllTimeEntries(computeAllTimeLeaderboard(data, roster))
          setMvp(computeMvp(data))
          setStreaks(computeStreaks(data))
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, filterGrade, viewMode, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Invalidate the cache when a game finishes — that's the only time
  // standings actually change, so it's the only time worth re-fetching.
  // Waits a few seconds first so the just-submitted game has actually landed
  // in the database before we go ask it for "current standing" — fetching
  // immediately can race the insert and still show the pre-game numbers.
  const wasGameCompleteRef = useRef(isGameComplete)
  useEffect(() => {
    const justCompleted = isGameComplete && !wasGameCompleteRef.current
    wasGameCompleteRef.current = isGameComplete
    if (!justCompleted) return
    const timer = window.setTimeout(() => {
      leaderboardCache.clear()
      currentRosterCache = null
      setRefreshTick((n) => n + 1)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [isGameComplete])

  const filtered = (() => {
    const byType = entries.filter((e) => {
      const type = String(e.gameType || '')
        .toLowerCase()
        .trim()
      if (filterType === 'graderound') {
        // Show anyone who played that grade's word (gameType=grade11, grade10, etc.)
        // Legacy rows used gameType='grade' with the player's own grade — include those too.
        return (
          type === `grade${gradeRoundFilter}` ||
          (type === 'grade' && String(e.grade) === gradeRoundFilter)
        )
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
  const todayLeader = filtered[0] ?? null
  const myName = (() => {
    const fn = getPlayerName()
    const li = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    return prefix ? `${prefix} ${fn}` : li ? `${fn} ${li}` : fn
  })()

  const myRank =
    filtered.findIndex((e) => e.name.toLowerCase() === myName.toLowerCase()) + 1
  const rankedAllTimeEntries = (() => {
    if (!mvp) return allTimeEntries
    return [...allTimeEntries].sort((a, b) => {
      const aIsMvp = samePlayer(a.name, mvp.name)
      const bIsMvp = samePlayer(b.name, mvp.name)
      if (aIsMvp === bIsMvp) return 0
      return aIsMvp ? -1 : 1
    })
  })()

  return (
    <BaseModal
      title="Leaderboard"
      isOpen={isOpen}
      handleClose={handleClose}
      maxWidthClassName="sm:max-w-lg"
    >
      {/* ── View mode row: Today | All-Time + grade filter ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              setViewMode('today')
              setFilterType('daily')
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              viewMode === 'today'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode('alltime')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              viewMode === 'alltime'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            All&#8209;Time
          </button>
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
              filterType === 'daily'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setFilterType('bonus')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'bonus'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Bonus
          </button>
          <button
            onClick={() => setFilterType('teachers')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'teachers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            🍎 Teachers
          </button>
          <button
            onClick={() => setFilterType('graderound')}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              filterType === 'graderound'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Grade Rounds
          </button>
        </div>
      )}

      {/* ── Grade round sub-selector ── */}
      {viewMode === 'today' && filterType === 'graderound' && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setGradeRoundFilter('9')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '9'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-emerald-400 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            Freshman
          </button>
          <button
            onClick={() => setGradeRoundFilter('10')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '10'
                ? 'border-sky-500 bg-sky-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-sky-400 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            Sophomore
          </button>
          <button
            onClick={() => setGradeRoundFilter('11')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '11'
                ? 'border-violet-500 bg-violet-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-violet-400 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            Junior
          </button>
          <button
            onClick={() => setGradeRoundFilter('12')}
            className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all ${
              gradeRoundFilter === '12'
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-rose-400 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            Senior
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </span>
        </div>
      ) : viewMode === 'alltime' ? (
        rankedAllTimeEntries.length === 0 ? (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            No data yet
          </p>
        ) : (
          <>
            <p className="mb-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {rankedAllTimeEntries.length} player
              {rankedAllTimeEntries.length !== 1 ? 's' : ''}
            </p>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full table-fixed text-sm text-gray-800 dark:text-gray-200">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                    <th className="w-6 pb-1.5 pr-1">#</th>
                    <th className="pb-1.5 pr-1">Name</th>
                    <th className="w-11 pb-1.5 pr-1 text-center">Grade</th>
                    <th className="w-12 pb-1.5 pr-1 text-center">Days</th>
                    <th className="w-10 pb-1.5 pr-1 text-center">Wins</th>
                    <th className="w-12 py-1 text-right">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedAllTimeEntries.map((entry, i) => {
                    const isMvpRow = mvp && samePlayer(entry.name, mvp.name)
                    const isMe =
                      entry.name.toLowerCase() === myName.toLowerCase()
                    const redact =
                      !isMe && shouldRedactName(entry.name, validWordsForLength)
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 dark:border-gray-700 ${
                          isMe
                            ? 'font-bold text-blue-600 dark:text-blue-400'
                            : isMvpRow
                            ? 'all-time-mvp-row font-bold'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <td className="py-1 pr-1">
                          {isMvpRow ? (
                            <span className="all-time-mvp-crown">👑</span>
                          ) : (
                            i + 1
                          )}
                        </td>
                        <td className="truncate py-1 pr-1">
                          <span
                            className={
                              isMvpRow && !isMe
                                ? 'all-time-mvp-name'
                                : undefined
                            }
                          >
                            {redact ? (
                              <RedactedName length={solutionLength} />
                            ) : (
                              toTitleCase(entry.name)
                            )}
                          </span>
                          {!redact &&
                            (streaks.get(entry.name.toLowerCase().trim()) ??
                              0) >= 2 && (
                              <span className="ml-1 text-xs text-orange-500">
                                🔥{streaks.get(entry.name.toLowerCase().trim())}
                              </span>
                            )}
                        </td>
                        <td className="py-1.5 pr-1 text-center">
                          <span
                            className={`inline-block rounded px-1 py-0.5 text-xs font-bold ${
                              gradeBadgeClassFor(entry.grade, entry.isAlum) ??
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {gradeShortFor(entry.grade, entry.isAlum) ??
                              String(entry.grade)}
                          </span>
                        </td>
                        <td className="py-1.5 pr-1 text-center">
                          {entry.totalDays}
                        </td>
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
            ? `No ${
                gradeLabels[gradeRoundFilter] || ''
              } round results yet today`
            : 'No results yet for today'}
        </p>
      ) : (
        <>
          <p className="mb-1 text-right text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} today
          </p>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full table-fixed text-sm text-gray-800 dark:text-gray-200">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-gray-300 text-left dark:border-gray-600">
                  <th className="w-6 pb-1.5 pr-1">#</th>
                  <th className="pb-1.5 pr-1">Name</th>
                  <th className="w-11 pb-1.5 pr-1 text-center">Grade</th>
                  <th className="w-14 pb-1.5 pr-1 text-center">Guesses</th>
                  <th className="w-12 pb-1.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const isMvpRow = mvp && samePlayer(entry.name, mvp.name)
                  const isTodayLeader = i === 0
                  const isMe = entry.name.toLowerCase() === myName.toLowerCase()
                  const redact =
                    !isMe && shouldRedactName(entry.name, validWordsForLength)
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 dark:border-gray-700 ${
                        isMe
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : isTodayLeader
                          ? 'today-leader-row font-bold'
                          : isMvpRow
                          ? 'font-bold'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <td className="py-1.5 pr-1 text-center">
                        <span
                          className={
                            isTodayLeader
                              ? 'today-leader-rank'
                              : 'text-xs text-gray-400'
                          }
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="truncate py-1.5 pr-1">
                        <span
                          className={
                            isMe
                              ? undefined
                              : isTodayLeader
                              ? 'today-leader-name'
                              : isMvpRow
                              ? 'all-time-mvp-name'
                              : undefined
                          }
                        >
                          {redact ? (
                            <RedactedName length={solutionLength} />
                          ) : (
                            toTitleCase(entry.name)
                          )}
                        </span>
                        {!redact && isMvpRow && (
                          <span className="all-time-mvp-pill ml-1">MVP</span>
                        )}
                        {!redact &&
                          (streaks.get(entry.name.toLowerCase().trim()) ?? 0) >=
                            2 && (
                            <span className="ml-1 text-xs text-orange-500">
                              🔥{streaks.get(entry.name.toLowerCase().trim())}
                            </span>
                          )}
                      </td>
                      <td className="py-1.5 pr-1 text-center">
                        <span
                          className={`inline-block rounded px-1 py-0.5 text-xs font-bold ${
                            gradeBadgeClassFor(
                              entry.grade,
                              isAlumByTimestamp(entry.grade, entry.submittedAt)
                            ) ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {gradeShortFor(
                            entry.grade,
                            isAlumByTimestamp(entry.grade, entry.submittedAt)
                          ) ?? String(entry.grade)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-1 text-center font-mono">
                        {entry.won ? (
                          entry.guessCount
                        ) : (
                          <span className="font-bold text-red-500">✕</span>
                        )}
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
              Your rank:{' '}
              <span className="font-bold text-blue-500">#{myRank}</span> of{' '}
              {filtered.length}
            </p>
          )}
        </>
      )}

      {viewMode === 'today' && todayLeader && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-900/10">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
            {getTodayLeaderLabel(filterType)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                <span className="today-leader-name">
                  {toTitleCase(todayLeader.name)}
                </span>
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                {gradeLabelFor(
                  todayLeader.grade,
                  isAlumByTimestamp(todayLeader.grade, todayLeader.submittedAt)
                ) || `Grade ${todayLeader.grade}`}
                {mvp && samePlayer(todayLeader.name, mvp.name)
                  ? ' • All-Time MVP'
                  : ''}
              </p>
            </div>
            <div className="flex gap-4 text-center text-xs text-amber-800 dark:text-amber-200">
              <div>
                <p className="font-bold">
                  {todayLeader.won ? todayLeader.guessCount : 'X'}
                </p>
                <p>Guesses</p>
              </div>
              <div>
                <p className="font-bold">
                  {formatTime(todayLeader.totalDurationSec)}
                </p>
                <p>Time</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'alltime' &&
        mvp &&
        (() => {
          const mvpKey = mvp.name.toLowerCase().trim()
          const mvpCurrentGrade = currentRosterCache?.[mvpKey]
          const mvpIsAlum = mvpCurrentGrade === undefined && mvp.grade === 12
          const mvpGrade = mvpCurrentGrade ?? mvp.grade
          return (
            <div
              className="relative mt-3 overflow-hidden rounded-xl px-3 py-2.5"
              style={{
                background:
                  'linear-gradient(145deg, #1a1200 0%, #2e1f00 50%, #1a1200 100%)',
                boxShadow: '0 0 0 2px #b8860b, 0 0 16px 2px #f5c51888',
              }}
            >
              {/* shimmer top */}
              <div
                className="absolute inset-x-0 top-0 h-0.5"
                style={{
                  background:
                    'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)',
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <button
                    onClick={() => setIsMvpExplainerOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest underline decoration-dotted underline-offset-2"
                    style={{ color: '#c9a227' }}
                    title="What is MVP? Click to learn more"
                  >
                    🏆 All-Time MVP
                  </button>
                  <p
                    className="all-time-mvp-name truncate text-base font-extrabold leading-tight"
                    style={{ textShadow: '0 0 10px #f5c51888' }}
                  >
                    {toTitleCase(mvp.name)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ color: '#1a1200', background: '#f5c518' }}
                >
                  {mvpIsAlum ? 'ALM' : gradeShort[String(mvpGrade)] ?? mvpGrade}
                </span>
              </div>

              <div
                className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg py-1.5 text-center"
                style={{ background: 'rgba(245,197,24,0.08)' }}
              >
                <div>
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: '#f5c518' }}
                  >
                    {Math.round(mvp.winRate * 100)}%
                  </p>
                  <p
                    className="text-[9px] leading-tight"
                    style={{ color: '#c9a227' }}
                  >
                    Win Rate
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: '#f5c518' }}
                  >
                    {mvp.avgGuesses > 0 ? mvp.avgGuesses.toFixed(1) : '-'}
                  </p>
                  <p
                    className="text-[9px] leading-tight"
                    style={{ color: '#c9a227' }}
                  >
                    Avg Guess
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: '#f5c518' }}
                  >
                    {mvp.totalGames}
                  </p>
                  <p
                    className="text-[9px] leading-tight"
                    style={{ color: '#c9a227' }}
                  >
                    Games
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: '#f5c518' }}
                  >
                    {mvp.wins}
                  </p>
                  <p
                    className="text-[9px] leading-tight"
                    style={{ color: '#c9a227' }}
                  >
                    Wins
                  </p>
                </div>
              </div>
              {/* shimmer bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{
                  background:
                    'linear-gradient(90deg, #7b5800, #f5c518, #ffe066, #f5c518, #7b5800)',
                }}
              />
            </div>
          )
        })()}

      <MvpExplainerModal
        isOpen={isMvpExplainerOpen}
        onClose={() => setIsMvpExplainerOpen(false)}
      />
    </BaseModal>
  )
}
