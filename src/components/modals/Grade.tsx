import { normalizeGrade } from '../../lib/gradeUtils'
import './gradestyle.css'

import { Filter } from 'bad-words'
import { useEffect, useState } from 'react'

import { parseNameFromEmail } from '../../lib/auth'
import {
  LeaderboardEntry,
  fetchLeaderboard,
  isTrueDailyEntry,
  linkEmailToCurrentAccount,
  submitHistoricalStats,
  submitNameStepRegistration,
  submitSignupEvent,
} from '../../lib/api'
import {
  GameStats,
  clearActiveRoundFromLocalStorage,
  clearBonusGameState,
  clearDailyGameStates,
  clearGradeRoundGameState,
  clearPendingAccountCheck,
  clearPlayerLastInitial,
  clearPlayerPrefix,
  clearTeachersGameState,
  getMsAuthEmail,
  getPendingAccountCheck,
  getPlayerGrade,
  getPlayerLastInitial,
  getPlayerName,
  getPlayerPrefix,
  hasSeenInfoModal,
  hasSubmittedHistoricalStats,
  loadStatsFromLocalStorage,
  saveGameStateToLocalStorage,
  saveStatsToLocalStorage,
  setHistoricalStatsSubmitted,
  setPendingAccountCheck,
  setPlayerGrade,
  setPlayerLastInitial as lsSetPlayerLastInitial,
  setPlayerName as lsSetPlayerName,
  setPlayerPrefix,
  setShouldShowInfoAfterReload,
  setShouldShowWelcomeAfterReload,
} from '../../lib/localStorage'
import { getGameDate, getSolution } from '../../lib/words'
import {
  clearBonusPlayedToday,
  setBonusPlayedToday,
} from '../../utils/bonusRound'
import {
  clearGradeRoundPlayedToday,
  setGradeRoundPlayedToday,
} from '../../utils/gradeRound'
import {
  clearTeachersPlayedToday,
  setTeachersPlayedToday,
} from '../../utils/teachersRound'
import { BaseModal } from './BaseModal2'

const LEGACY_GRADE_NORMALIZATION_MAP: Record<string, string> = {
  '7': '10',
  '8': '11',
  '27': '11',
  '28': '10',
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`

// bad-words ships a large curated profanity list (~400+ terms).
// We extend it with extra slurs and common leet-speak bypasses.
const _profanityFilter = new Filter()
_profanityFilter.addWords(
  // Extra slurs not always in the base list
  'nigg',
  'nigga',
  'chink',
  'spic',
  'spick',
  'kike',
  'wetback',
  'beaner',
  'gook',
  'tranny',
  'dyke',
  'retard',
  // Leet-speak variants the library won't catch on its own
  'fuk',
  'fuq',
  'phuck',
  'fvck',
  'fck',
  'sh1t',
  'shyt',
  'sht',
  'b1tch',
  'biatch',
  'btch',
  'n1gg',
  'n1gga',
  'n1gger'
)

// Pre-normalizes leet-speak before passing to the filter so variants
// like "sh1thead" or "f4ggot" are caught.
const normalizeLeetSpeak = (text: string): string =>
  text
    .replace(/4|@/gi, 'a')
    .replace(/3/g, 'e')
    .replace(/1|!/gi, 'i')
    .replace(/0/g, 'o')
    .replace(/5|\$/gi, 's')
    .replace(/7/g, 't')
    .replace(/9/g, 'g')
    .replace(/8/g, 'b')

const containsProfanity = (text: string): boolean => {
  const normalized = normalizeLeetSpeak(text)
  // Check both the raw input and the leet-normalized form
  return (
    _profanityFilter.isProfane(text) || _profanityFilter.isProfane(normalized)
  )
}

// Banned player keys — normalized as "firstname lastinitial" (lowercase, trimmed).
// Add entries here to block a player from registering or playing.
const BANNED_PLAYERS = new Set(['parker t'])

const isBannedPlayer = (name: string, lastInit: string): boolean => {
  const key = `${name.trim().toLowerCase()} ${lastInit.trim().toLowerCase()}`
  return BANNED_PLAYERS.has(key)
}

const capitalizeName = (name: string): string =>
  name.trim().replace(/\b\w/g, (c) => c.toUpperCase())

const normalizeAccountName = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const normalizeGradeCode = (value: string | number): string =>
  String(value ?? '')
    .replace(/"/g, '')
    .trim()

const isBetterDailyResult = (
  a: { won: boolean; guessCount: number; totalDurationSec: number },
  b: { won: boolean; guessCount: number; totalDurationSec: number }
) => {
  if (a.won !== b.won) return a.won && !b.won
  if (a.guessCount !== b.guessCount) return a.guessCount < b.guessCount
  return a.totalDurationSec < b.totalDurationSec
}

type Step = 'grade' | 'name' | 'initial' | 'prefix' | 'checking' | 'confirm'

type ExistingAccount = {
  displayName: string
  totalGames: number
  wins: number
  grade: string
  gradeCode: string
  avgGuesses: number
  todayResult: 'won' | 'lost' | null
  todayGuessCount: number | null
  inProgressGuesses: string[]
  reconstructedStats: GameStats
  todayBonusPlayed: boolean
  todayTeachersPlayed: boolean
  todayGradeRoundsPlayed: string[]
}

type Props = {
  isOpen: boolean
  handleClose: () => void
  isGameActive?: boolean
  isInfoOpen?: boolean
}

export const GradeModal = ({
  isOpen,
  handleClose,
  isGameActive = false,
  isInfoOpen = false,
}: Props) => {
  const hasExistingGrade = !!getPlayerGrade()

  const hasCompletedRegistration = (() => {
    const grd = getPlayerGrade()
    if (!grd) return false
    if (!getPlayerName()) return false
    return grd === '0'
      ? !!getPlayerPrefix()
      : !!getPlayerLastInitial()
  })()

  // If they already have a grade + name, go straight to nothing (shouldn't open)
  // If they have grade but no name, skip the grade step
  const initialStep: Step = hasExistingGrade ? 'name' : 'grade'

  const [step, setStep] = useState<Step>(initialStep)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [playerName, setPlayerName] = useState('')
  const [lastInitial, setLastInitial] = useState('')
  const [selectedPrefix, setSelectedPrefix] = useState('')

  // Pre-fill name/initial from the Microsoft sign-in email for first-time registrations.
  // Only runs when the fields are still empty (i.e. the player hasn't typed anything yet).
  useEffect(() => {
    const msEmail = getMsAuthEmail()
    if (!msEmail || playerName || lastInitial) return
    const { firstName, lastInitial: li } = parseNameFromEmail(msEmail)
    if (firstName) setPlayerName(firstName)
    if (li) setLastInitial(li)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive whether the current player is a teacher at each step
  const currentGrade =
    selectedGrade ||
    getPlayerGrade()
  const isTeacherFlow = currentGrade === '0'
  const [existingAccount, setExistingAccount] =
    useState<ExistingAccount | null>(null)
  const [nameError, setNameError] = useState('')
  const [forceOpen, setForceOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAccountData, setPendingAccountData] =
    useState<ExistingAccount | null>(null)

  const handleGradeNext = () => {
    if (!selectedGrade) return
    setPlayerGrade(normalizeGrade(selectedGrade))
    setStep('name')
  }

  const handleNameNext = () => {
    if (!playerName.trim()) return
    if (containsProfanity(playerName)) {
      setNameError('That name is not allowed. Please use your real name.')
      return
    }
    const capitalized = capitalizeName(playerName)
    setPlayerName(capitalized)
    setNameError('')
    const gradeRawValEarly = getPlayerGrade()
    const isTeacher = gradeRawValEarly === '0' || selectedGrade === '0'
    setStep(isTeacher ? 'prefix' : 'initial')
  }

  const handlePrefixDone = async () => {
    if (!selectedPrefix) return
    const lastName = capitalizeName(playerName)
    const displayName = `${selectedPrefix} ${lastName}`
    const gradeRawVal = getPlayerGrade()
    const gradeRaw = normalizeGrade(gradeRawVal)
    lsSetPlayerName(lastName)
    setPlayerPrefix(selectedPrefix)
    clearPlayerLastInitial()

    const sessionEmail = getMsAuthEmail()
    // Await both writes so the page reload doesn't cancel the in-flight requests.
    await Promise.all([
      sessionEmail ? linkEmailToCurrentAccount(sessionEmail).catch(() => {}) : Promise.resolve(),
      submitSignupEvent(displayName, gradeRaw),
    ])
    submitNameStepRegistration(displayName, gradeRaw)
    if (!hasSeenInfoModal()) {
      setShouldShowInfoAfterReload()
    }
    // One-time welcome banner on the very first login
    if (!hasCompletedRegistration) {
      setShouldShowWelcomeAfterReload()
    }
    if (!hasSubmittedHistoricalStats()) {
      const stats = loadStatsFromLocalStorage()
      if (stats && stats.totalGames > 0 && gradeRaw) {
        setHistoricalStatsSubmitted()
        submitHistoricalStats(
          displayName,
          gradeRaw,
          stats.winDistribution,
          stats.gamesFailed
        )
      }
    }
    setPendingAccountCheck(displayName)
    handleClose()
    window.location.reload()
  }

  const handleInitialDone = async () => {
    if (!lastInitial.trim()) return
    if (isBannedPlayer(playerName, lastInitial)) {
      setNameError('This name is not allowed.')
      return
    }
    // Student only: "Jack S"
    const displayName = lastInitial.trim()
      ? `${capitalizeName(playerName)} ${lastInitial.trim().toUpperCase()}`
      : capitalizeName(playerName)
    const gradeRawVal = getPlayerGrade()
    const gradeRaw = normalizeGrade(gradeRawVal)
    const parts = displayName.split(' ')
    const initial = parts.length > 1 ? parts[parts.length - 1] : ''
    const name = initial ? parts.slice(0, -1).join(' ') : displayName
    lsSetPlayerName(name)
    if (initial) lsSetPlayerLastInitial(initial)

    const sessionEmail = getMsAuthEmail()
    // Await both writes so the page reload doesn't cancel the in-flight requests.
    await Promise.all([
      sessionEmail ? linkEmailToCurrentAccount(sessionEmail).catch(() => {}) : Promise.resolve(),
      submitSignupEvent(displayName, gradeRaw),
    ])
    submitNameStepRegistration(displayName, gradeRaw)
    if (!hasSeenInfoModal()) {
      setShouldShowInfoAfterReload()
    }
    // One-time welcome banner on the very first login
    if (!hasCompletedRegistration) {
      setShouldShowWelcomeAfterReload()
    }
    if (!hasSubmittedHistoricalStats()) {
      const stats = loadStatsFromLocalStorage()
      if (stats && stats.totalGames > 0 && gradeRaw) {
        setHistoricalStatsSubmitted()
        submitHistoricalStats(
          displayName,
          gradeRaw,
          stats.winDistribution,
          stats.gamesFailed
        )
      }
    }

    // Queue a background duplicate-account check after reload
    setPendingAccountCheck(displayName)

    handleClose()
    window.location.reload()
  }

  // Background account check — runs silently, does NOT open modal during loading
  useEffect(() => {
    const pending = getPendingAccountCheck()
    if (!pending) return
    const pendingGradeRaw = getPlayerGrade()
    const pendingGrade = normalizeGrade(pendingGradeRaw)

    fetchLeaderboard()
      .then((data: LeaderboardEntry[]) => {
        const pendingNameNorm = normalizeAccountName(pending)
        const pendingGradeNorm = normalizeGradeCode(pendingGrade)
        const matches = data.filter((e) => {
          const rowNameNorm = normalizeAccountName(e.name)
          const rowGradeNorm = normalizeGradeCode(e.grade)
          return (
            rowNameNorm === pendingNameNorm && rowGradeNorm === pendingGradeNorm
          )
        })
        if (matches.length === 0) {
          clearPendingAccountCheck()
          return
        }
        // Build a quick stats summary for the confirmation screen
        const wins = matches.filter((e) => e.won)
        const gradeNumRaw = String(matches[0].grade)
        const gradeNum = normalizeGrade(gradeNumRaw)
        const gradeLabel: Record<string, string> = {
          '0': 'Teachers',
          '9': 'Freshman (9th)',
          '10': 'Sophomore (10th)',
          '11': 'Junior (11th)',
          '12': 'Senior (12th)',
        }
        const isOwnDailyType = (e: LeaderboardEntry) => isTrueDailyEntry(e)
        const avgGuesses =
          wins.length > 0
            ? wins.reduce((s, e) => s + e.guessCount, 0) / wins.length
            : 0
        const gameDay = getGameDate()
        const today = formatDateKey(gameDay)
        const todayEntry = matches.find(
          (e) => isOwnDailyType(e) && String(e.date).startsWith(today)
        )
        const dailyMatches = matches.filter(
          (e) => isOwnDailyType(e) && !String(e.date).startsWith('1970')
        )
        const bestDailyByDate = new Map<string, LeaderboardEntry>()
        for (const entry of dailyMatches) {
          const dateKey = String(entry.date || '').slice(0, 10)
          if (!dateKey) continue
          const existing = bestDailyByDate.get(dateKey)
          if (!existing || isBetterDailyResult(entry, existing)) {
            bestDailyByDate.set(dateKey, entry)
          }
        }
        const dailyOutcomes = Array.from(bestDailyByDate.values())
        const dailyWins = dailyOutcomes.filter((e) => e.won)
        const dailyLosses = dailyOutcomes.filter((e) => !e.won)
        const winDist = Array(6).fill(0)
        dailyWins.forEach((e) => {
          const idx = Math.min(e.guessCount - 1, 5)
          if (idx >= 0) winDist[idx]++
        })
        const totalDailyGames = dailyOutcomes.length
        const successRate =
          totalDailyGames > 0
            ? Math.round((dailyWins.length / totalDailyGames) * 100)
            : 0
        const currentStreak = totalDailyGames
        const bestStreak = totalDailyGames

        const reconstructedStats: GameStats = {
          winDistribution: winDist,
          gamesFailed: dailyLosses.length,
          currentStreak,
          bestStreak,
          totalGames: totalDailyGames,
          successRate,
        }

        const todayBonusEntry = matches.find(
          (e) => e.gameType === 'bonus' && String(e.date).startsWith(today)
        )
        const todayTeachersEntry = matches.find(
          (e) => e.gameType === 'teachers' && String(e.date).startsWith(today)
        )
        const todayGradeRoundsPlayed = ['9', '10', '11', '12'].filter((g) =>
          matches.some(
            (e) =>
              String(e.gameType || '')
                .toLowerCase()
                .trim() === `grade${g}` && String(e.date).startsWith(today)
          )
        )

        // Store account silently — modal will open once game is idle
        setPendingAccountData({
          displayName: matches[0].name,
          totalGames: matches.length,
          wins: wins.length,
          grade: gradeLabel[String(gradeNum)] || `Grade ${gradeNum}`,
          gradeCode: String(gradeNum),
          avgGuesses,
          todayResult: todayEntry ? (todayEntry.won ? 'won' : 'lost') : null,
          todayGuessCount: todayEntry ? todayEntry.guessCount : null,
          inProgressGuesses: [],
          reconstructedStats,
          todayBonusPlayed: !!todayBonusEntry,
          todayTeachersPlayed: !!todayTeachersEntry,
          todayGradeRoundsPlayed,
        })
      })
      .catch(() => {
        clearPendingAccountCheck()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show account found popup once game is idle (done or not started) and info is closed
  useEffect(() => {
    if (!pendingAccountData) return
    if (isGameActive || isInfoOpen) return
    setExistingAccount(pendingAccountData)
    setStep('confirm')
    setForceOpen(true)
    setPendingAccountData(null)
  }, [pendingAccountData, isGameActive, isInfoOpen])

  const handleClaimAccount = async () => {
    setIsSaving(true)
    // "Yes, that's me" — use the exact name returned by the live account check.
    const account = existingAccount!
    const name = account.displayName
    const parts = name.split(' ')
    // Detect teacher prefix: first part ends with "." or is a known prefix
    const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Coach', 'Prof.']
    const isTeacher = PREFIXES.includes(parts[0])
    if (isTeacher) {
      const prefix = parts[0]
      const lastName = parts.slice(1).join(' ')
      lsSetPlayerName(lastName)
      setPlayerPrefix(prefix)
      clearPlayerLastInitial()
    } else {
      const initial = parts.length > 1 ? parts[parts.length - 1] : ''
      const firstName = initial ? parts.slice(0, -1).join(' ') : name
      lsSetPlayerName(firstName)
      if (initial) lsSetPlayerLastInitial(initial)
      clearPlayerPrefix()
    }
    if (!hasSeenInfoModal()) {
      setShouldShowInfoAfterReload()
    }
    setPlayerGrade(account.gradeCode)

    clearPendingAccountCheck()

    // Treat the live leaderboard/API as source of truth for "played today" status.
    // Re-fetch here so claim restore always uses fresh server data.
    let todayResult: 'won' | 'lost' | null = account.todayResult
    let todayBonusPlayed = account.todayBonusPlayed
    let todayTeachersPlayed = account.todayTeachersPlayed
    let todayGradeRoundsPlayed = account.todayGradeRoundsPlayed

    try {
      const rows = await fetchLeaderboard()
      const nameNorm = normalizeAccountName(account.displayName)
      const gradeNorm = normalizeGradeCode(account.gradeCode)
      const matches = rows.filter(
        (e) =>
          normalizeAccountName(e.name) === nameNorm &&
          normalizeGradeCode(e.grade) === gradeNorm
      )

      const gameDay = getGameDate()
      const today = formatDateKey(gameDay)
      const isOwnDailyType = (e: LeaderboardEntry) => isTrueDailyEntry(e)

      const todayEntry = matches.find(
        (e) => isOwnDailyType(e) && String(e.date).startsWith(today)
      )
      todayResult = todayEntry ? (todayEntry.won ? 'won' : 'lost') : null
      todayBonusPlayed = matches.some(
        (e) =>
          String(e.gameType || '')
            .toLowerCase()
            .trim() === 'bonus' && String(e.date).startsWith(today)
      )
      todayTeachersPlayed = matches.some(
        (e) =>
          String(e.gameType || '')
            .toLowerCase()
            .trim() === 'teachers' && String(e.date).startsWith(today)
      )
      todayGradeRoundsPlayed = ['9', '10', '11', '12'].filter((g) =>
        matches.some(
          (e) =>
            String(e.gameType || '')
              .toLowerCase()
              .trim() === `grade${g}` && String(e.date).startsWith(today)
        )
      )
    } catch {
      // Keep previously computed account values if live fetch fails.
    }

    // Treat leaderboard/API as source of truth for "played today" status.
    // Clear local round state first, then restore only what API confirms.
    clearDailyGameStates()
    clearBonusGameState()
    clearActiveRoundFromLocalStorage()
    clearTeachersGameState()
    clearBonusPlayedToday()
    clearTeachersPlayedToday()
    for (const g of ['9', '10', '11', '12']) {
      clearGradeRoundGameState(g)
      clearGradeRoundPlayedToday(g)
    }

    // Write reconstructed stats to localStorage so the stats modal shows real data
    saveStatsToLocalStorage(account.reconstructedStats)
    localStorage.setItem('historicalStatsSubmitted', 'true') // no need to re-backfill

    // Restore their game state so App.tsx treats this reload identically to local play.
    // Priority: use actual keystroke data; fall back to constructing a minimal complete state.
    try {
      const todaySolution = getSolution(getGameDate()).solution
      let guessesToSave: string[] = account.inProgressGuesses

      if (guessesToSave.length === 0 && todayResult === 'won') {
        // No keystroke data but we know they won — write solution as the only guess.
        // App.tsx sees guesses.includes(solution) → isGameWon = true.
        guessesToSave = [todaySolution]
      } else if (guessesToSave.length === 0 && todayResult === 'lost') {
        // No keystroke data but we know they lost — write 6 non-solution guesses.
        // App.tsx sees length === MAX_CHALLENGES && !includes(solution) → isGameLost = true.
        guessesToSave = Array(6).fill('AAAAA')
      }

      if (guessesToSave.length > 0) {
        saveGameStateToLocalStorage(true, {
          guesses: guessesToSave,
          solution: todaySolution,
        })
      }
    } catch {
      // If we can't resolve the solution, just skip — game starts fresh
    }

    // Cross-device: restore bonus/teachers played status from server data
    if (todayBonusPlayed) setBonusPlayedToday()
    if (todayTeachersPlayed) setTeachersPlayedToday()
    for (const g of todayGradeRoundsPlayed) {
      setGradeRoundPlayedToday(g)
    }

    // reload immediately after synchronous writes; isSaving shows briefly
    // Skip one cloud hydration pass after account restore so stale cloud state
    // cannot overwrite the just-restored local daily/round state.
    localStorage.setItem('skipCloudHydrationOnce', 'true')
    handleClose()
    window.location.reload()
  }

  const handleMakeNewAccount = () => {
    // "No, make a new one" — go back to the name step
    clearPendingAccountCheck()
    setPlayerName('')
    setLastInitial('')
    setExistingAccount(null)
    setStep('name')
  }

  return (
    <BaseModal
      title={
        isSaving
          ? 'Restoring your account...'
          : step === 'grade'
          ? 'What Grade are you in?'
          : step === 'name'
          ? isTeacherFlow
            ? 'What is your last name?'
            : 'What is your first name?'
          : step === 'prefix'
          ? 'What is your title?'
          : step === 'initial'
          ? 'Last name initial?'
          : 'Is this you?'
      }
      isOpen={isOpen || forceOpen}
      handleClose={handleClose}
      isDismissible={hasCompletedRegistration && !isSaving && !forceOpen}
    >
      <br />

      {isSaving && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Restoring your account...
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            This only takes a second
          </p>
        </div>
      )}

      {!isSaving && step === 'grade' && (
        <>
          <form>
            <div className="select">
              <select
                name="format"
                id="format"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                defaultValue=""
              >
                <option hidden disabled value="">
                  {' '}
                  Choose Your Grade{' '}
                </option>
                <option value="9">Freshman (9th Grade)</option>
                <option value="10">Sophomore (10th Grade)</option>
                <option value="11">Junior (11th Grade)</option>
                <option value="12">Senior (12th Grade)</option>
                <option value="0">Teacher</option>
              </select>
            </div>
          </form>
          <br />
          <div className="enterbutton" onClick={handleGradeNext}>
            <button disabled={!selectedGrade}>Next</button>
          </div>
        </>
      )}

      {!isSaving && step === 'name' && (
        <>
          {!hasExistingGrade && (
            <button
              onClick={() => setStep('grade')}
              className="mb-3 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ← Back
            </button>
          )}
          <div className="mb-4">
            <input
              type="text"
              placeholder={isTeacherFlow ? 'Last name' : 'First name'}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value)
                if (nameError) setNameError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameNext()
              }}
              maxLength={20}
              autoFocus
              className={`w-full rounded-md border px-3 py-2 text-center text-lg focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-white ${
                nameError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
              }`}
            />
            {nameError && (
              <p className="mt-2 text-center text-sm text-red-500">
                {nameError}
              </p>
            )}
          </div>
          <br />
          <div className="enterbutton" onClick={handleNameNext}>
            <button disabled={!playerName.trim()}>Next</button>
          </div>
        </>
      )}

      {!isSaving && step === 'initial' && !isTeacherFlow && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="e.g. S"
              value={lastInitial}
              onChange={(e) =>
                setLastInitial(
                  e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1)
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInitialDone()
              }}
              maxLength={1}
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-bold uppercase tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
            Your last initial helps tell apart players with the same first name
            on the leaderboard (e.g. "Jack S"). We never store your full last
            name.
          </p>
          {nameError && (
            <p className="mb-2 text-center text-sm text-red-500">{nameError}</p>
          )}
          <div className="enterbutton" onClick={handleInitialDone}>
            <button disabled={!lastInitial.trim()}>Done</button>
          </div>
        </>
      )}

      {!isSaving && step === 'prefix' && (
        <>
          <form>
            <div className="select">
              <select
                value={selectedPrefix}
                onChange={(e) => setSelectedPrefix(e.target.value)}
                defaultValue=""
              >
                <option hidden disabled value="">
                  Choose Your Title
                </option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Miss">Miss</option>
                <option value="Dr.">Dr.</option>
                <option value="Coach">Coach</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
          </form>
          <br />
          <div className="enterbutton" onClick={handlePrefixDone}>
            <button disabled={!selectedPrefix}>Done</button>
          </div>
        </>
      )}

      {!isSaving && step === 'confirm' && existingAccount && (
        <>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            We found an account with that name. Is this you?
          </p>

          {existingAccount.todayResult === null &&
            existingAccount.inProgressGuesses.length > 0 && (
              <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300">
                🔄 You&apos;re on guess{' '}
                {existingAccount.inProgressGuesses.length + 1} of 6 today -
                logging in will pick up where you left off!
              </div>
            )}

          {existingAccount.todayResult !== null && (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                existingAccount.todayResult === 'won'
                  ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300'
                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-300'
              }`}
            >
              {existingAccount.todayResult === 'won'
                ? `✅ You already won today's game in ${
                    existingAccount.todayGuessCount ?? '?'
                  } guess${existingAccount.todayGuessCount === 1 ? '' : 'es'}!`
                : '❌ You already played today - better luck tomorrow!'}
            </div>
          )}

          <div className="mb-5 rounded-xl border-2 border-blue-400 bg-blue-50 px-4 py-4 text-left dark:bg-blue-900/20">
            <p className="mb-1 text-base font-extrabold text-blue-700 dark:text-blue-300">
              {existingAccount.displayName}
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {existingAccount.grade}
            </p>
            <div className="flex justify-around text-center text-xs">
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {existingAccount.totalGames}
                </p>
                <p className="text-gray-500 dark:text-gray-400">Games</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {existingAccount.wins}
                </p>
                <p className="text-gray-500 dark:text-gray-400">Wins</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {Math.round(
                    (existingAccount.wins / existingAccount.totalGames) * 100
                  )}
                  %
                </p>
                <p className="text-gray-500 dark:text-gray-400">Win Rate</p>
              </div>
              {existingAccount.avgGuesses > 0 && (
                <div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {existingAccount.avgGuesses.toFixed(1)}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Avg</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="enterbutton" onClick={handleClaimAccount}>
              <button>✅ Yes, that's me!</button>
            </div>
            <button
              onClick={handleMakeNewAccount}
              className="w-full rounded-md py-2 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              No, this isn&apos;t me - make a new account
            </button>
          </div>
        </>
      )}
    </BaseModal>
  )
}
