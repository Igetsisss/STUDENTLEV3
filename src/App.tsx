import './App.css'

import { ClockIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { default as GraphemeSplitter } from 'grapheme-splitter'
import { useEffect, useRef, useState } from 'react'
import Div100vh from 'react-div-100vh'

import { BONUS_WORDS } from './bonusRoundWords'
import { AlertContainer } from './components/alerts/AlertContainer'
import { CompletedGrid } from './components/grid/CompletedGrid'
import { Grid } from './components/grid/Grid'
import { Keyboard } from './components/keyboard/Keyboard'
import { GradeModal } from './components/modals/Grade'
import { InfoModal } from './components/modals/InfoModal'
import { LeaderboardModal } from './components/modals/LeaderboardModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { StatsModal } from './components/modals/StatsModal'
import { Navbar } from './components/navbar/Navbar'
import {
  DATE_LOCALE,
  DISCOURAGE_INAPP_BROWSERS,
  LONG_ALERT_TIME_MS,
  MAX_BONUS_CHALLENGES,
  MAX_CHALLENGES,
  REVEAL_TIME_MS,
  WELCOME_GRADE_MODAL_MS,
} from './constants/settings'
import {
  CORRECT_TEACHER_MESSAGE,
  CORRECT_WORD_MESSAGE,
  DISCOURAGE_INAPP_BROWSER_TEXT,
  GAME_COPIED_MESSAGE,
  MIGRATION_RECOVERY_NOTICE_TEXT,
  NOT_ENOUGH_LETTERS_MESSAGE,
  SHARE_FAILURE_TEXT,
  TEACHER_NOT_FOUND_MESSAGE,
  WIN_MESSAGES,
  WORD_NOT_FOUND_MESSAGE,
} from './constants/strings'
import { VALID_GUESSES } from './constants/validGuesses'
import { useAlert } from './context/AlertContext'
import { useGameTracker } from './hooks/useGameTracker'
import {
  type TodayLeader,
  computeMvp,
  fetchLeaderboard,
  fetchPlayerStateFromCloud,
  fetchTodayLeader,
  isTrueDailyEntry,
  submitGameData,
  syncPlayerStateToCloud,
} from './lib/api'
import { isInAppBrowser } from './lib/browser'
import {
  clearShouldShowInfoAfterReload,
  clearShouldShowWelcomeAfterReload,
  ensureRoundStateSchemaVersion,
  getFirstToPlayDate,
  getGradeRoundsPlayedToday,
  getPendingAccountCheck,
  getPlayerGrade,
  getPlayerLastInitial,
  getPlayerName,
  getPlayerPrefix,
  getShouldShowInfoAfterReload,
  getShouldShowWelcomeAfterReload,
  getStoredIsHighContrastMode,
  getTheme,
  hasSeenInfoModal,
  loadActiveRoundFromLocalStorage,
  loadBonusGameStateFromLocalStorage,
  loadGameStateFromLocalStorage,
  loadGradeRoundGameStateFromLocalStorage,
  loadTeachersGameStateFromLocalStorage,
  recordExtraRoundResult,
  saveActiveRoundToLocalStorage,
  saveBonusGameStateToLocalStorage,
  saveGameStateToLocalStorage,
  saveGradeRoundGameStateToLocalStorage,
  saveTeachersGameStateToLocalStorage,
  setFirstToPlayDate,
  setHasSeenInfoModal,
  setPlayerGrade,
  setStoredIsHighContrastMode,
  setTheme,
} from './lib/localStorage'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  solution as dailySolution,
  getGameDate,
  getIsLatestGame,
  isWordInWordList,
  solutionGameDate,
  solutionIndex,
  unicodeLength,
} from './lib/words'
import {
  TEACHER_WORDS,
  TEACHER_WORDS_FULL,
  getTeachersBonusSolution,
} from './teacherWords'
import {
  getBonusSolution,
  hasBonusBeenPlayedToday,
  setBonusPlayedToday,
} from './utils/bonusRound'
import {
  GRADE_LABELS,
  GRADE_WORD_LISTS,
  getGradeRoundSolution,
  hasGradeRoundBeenPlayedToday,
  setGradeRoundPlayedToday,
} from './utils/gradeRound'
import {
  getTeachersSolution,
  hasTeachersBeenPlayedToday,
  setTeachersPlayedToday,
} from './utils/teachersRound'

type RoundRestoreMode = 'daily' | 'bonus' | 'teachers' | 'grade'

type ResolvedRoundState = {
  mode: RoundRestoreMode
  guesses: string[]
  solution: string
  outcome: 'empty' | 'in-progress' | 'won' | 'lost'
  grade?: string
}

const LEGACY_GRADE_NORMALIZATION_MAP: Record<string, string> = {
  '7': '10',
  '8': '11',
  '27': '11',
  '28': '10',
}

const LEGACY_TEACHER_KEYS = [
  'harvey m',
  'katie cruce',
  'katie c',
  'evan bassett',
  'bassett evan',
  'amanda adams',
]

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`

const MIGRATION_RECOVERY_NOTICE_DATE =
  process.env.REACT_APP_MIGRATION_NOTICE_DATE || '2026-04-16'

const getStoredRoundOutcome = (
  guesses: string[],
  solution: string,
  maxChallenges: number
): ResolvedRoundState['outcome'] => {
  if (guesses.includes(solution)) {
    return 'won'
  }

  if (guesses.length >= maxChallenges) {
    return 'lost'
  }

  if (guesses.length > 0) {
    return 'in-progress'
  }

  return 'empty'
}

const resolveStoredRoundState = (
  mode: RoundRestoreMode,
  storedState: { guesses: string[]; solution: string } | null,
  solution: string,
  maxChallenges: number,
  grade?: string
): ResolvedRoundState | null => {
  if (!storedState || storedState.solution !== solution) {
    return null
  }

  return {
    mode,
    guesses: storedState.guesses,
    solution,
    outcome: getStoredRoundOutcome(
      storedState.guesses,
      solution,
      maxChallenges
    ),
    grade,
  }
}

const isRoundStateStorageKey = (key: string) =>
  key === 'gameState' ||
  key === 'archiveGameState' ||
  key === 'bonusGameState' ||
  key === 'teachersGameState' ||
  key === 'activeRoundState' ||
  key.startsWith('gradeRoundGameState_')

const getRoundStateUpdatedAtFromSerializedValue = (value: string | null) => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as { updatedAt?: string }
    return typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
  } catch {
    return null
  }
}

const isCloudRoundStateNewer = (
  localValue: string | null,
  cloudValue: string
) => {
  if (!localValue) return true

  const localUpdatedAt = getRoundStateUpdatedAtFromSerializedValue(localValue)
  const cloudUpdatedAt = getRoundStateUpdatedAtFromSerializedValue(cloudValue)

  if (!cloudUpdatedAt) {
    return false
  }

  if (!localUpdatedAt) {
    return true
  }

  return new Date(cloudUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()
}

function App() {
  const isLatestGame = getIsLatestGame()
  const gameDate = getGameDate()
  // Teachers get their own bonus using all teacher names; students get the regular bonus
  const bonusSolution = (() => {
    const g = getPlayerGrade()
    return g === '0' ? getTeachersBonusSolution() : getBonusSolution()
  })()
  const teachersSolution = getTeachersSolution()
  const hasLoadedRef = useRef(false)

  // Legacy teachers registered as students before teacher support existed.
  // Normalize their gradeNumber to "0" in localStorage so every downstream
  // calculation (daily solution, word list, bonus, gameType) is correct.
  ;(() => {
    const fn = getPlayerName()
    const li = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    const storedName = prefix ? `${prefix} ${fn}` : li ? `${fn} ${li}` : fn
    const key = storedName.toLowerCase().replace(/\s+/g, ' ').trim()
    if (LEGACY_TEACHER_KEYS.includes(key)) {
      const currentGrade = getPlayerGrade()
      if (currentGrade !== '0') {
        setPlayerGrade('0')
      }
    }
  })()

  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  const effectiveDailySolution = (() => {
    const g = getPlayerGrade()
    return g === '0' ? teachersSolution : dailySolution
  })()
  const restoredDailyState = resolveStoredRoundState(
    'daily',
    loadGameStateFromLocalStorage(isLatestGame),
    effectiveDailySolution,
    MAX_CHALLENGES
  )
  const restoredBonusState = resolveStoredRoundState(
    'bonus',
    loadBonusGameStateFromLocalStorage(),
    bonusSolution,
    MAX_BONUS_CHALLENGES
  )
  const restoredTeachersState = resolveStoredRoundState(
    'teachers',
    loadTeachersGameStateFromLocalStorage(),
    teachersSolution,
    MAX_CHALLENGES
  )
  const restoredGradeStates = ['9', '10', '11', '12']
    .map((grade) =>
      resolveStoredRoundState(
        'grade',
        loadGradeRoundGameStateFromLocalStorage(grade),
        getGradeRoundSolution(grade),
        MAX_CHALLENGES,
        grade
      )
    )
    .filter((state): state is ResolvedRoundState => state !== null)
  const activeRoundPreference = loadActiveRoundFromLocalStorage()
  const inProgressRoundFallback =
    restoredTeachersState?.outcome === 'in-progress'
      ? restoredTeachersState
      : restoredBonusState?.outcome === 'in-progress'
      ? restoredBonusState
      : restoredGradeStates.find((state) => state.outcome === 'in-progress') ??
        null
  const initialRoundState = (() => {
    // Restore the last active round regardless of whether it was in-progress or
    // already completed — so refreshing after winning still shows your result.
    if (activeRoundPreference?.type === 'teachers' && restoredTeachersState) {
      return restoredTeachersState
    }

    if (activeRoundPreference?.type === 'bonus' && restoredBonusState) {
      return restoredBonusState
    }

    if (activeRoundPreference?.type === 'grade') {
      const matchingGradeState = restoredGradeStates.find(
        (state) => state.grade === activeRoundPreference.grade
      )
      if (matchingGradeState) {
        return matchingGradeState
      }
    }

    if (activeRoundPreference?.type === 'daily' && restoredDailyState) {
      return restoredDailyState
    }

    return (
      inProgressRoundFallback ??
      restoredDailyState ?? {
        mode: 'daily' as const,
        guesses: [],
        solution: effectiveDailySolution,
        outcome: 'empty' as const,
      }
    )
  })()

  const { showError: showErrorAlert, showSuccess: showSuccessAlert } =
    useAlert()
  const [currentGuess, setCurrentGuess] = useState('')
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [isAllTimeMvp, setIsAllTimeMvp] = useState(false)
  const [isPersonalBest, setIsPersonalBest] = useState(false)
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameWon, setIsGameWon] = useState(
    initialRoundState.outcome === 'won'
  )
  const [isGameLost, setIsGameLost] = useState(
    initialRoundState.outcome === 'lost'
  )
  const [isDarkMode, setIsDarkMode] = useState(
    getTheme() ? getTheme() === 'dark' : prefersDarkMode
  )
  const [isHighContrastMode, setIsHighContrastMode] = useState(
    getStoredIsHighContrastMode()
  )

  const [isRevealing, setIsRevealing] = useState(false)
  const [isBonusRound, setIsBonusRound] = useState(
    initialRoundState.mode === 'bonus'
  )
  const [isTeachersRound, setIsTeachersRound] = useState(
    initialRoundState.mode === 'teachers'
  )
  const [isGradeRound, setIsGradeRound] = useState(
    initialRoundState.mode === 'grade'
  )
  const [gradeRoundGrade, setGradeRoundGrade] = useState<string>(
    initialRoundState.mode === 'grade' ? initialRoundState.grade ?? '' : ''
  )
  const [gradeRoundsPlayed, setGradeRoundsPlayed] = useState<string[]>(() => {
    const played = getGradeRoundsPlayedToday()
    const ownGrade = getPlayerGrade()
    if (
      ['9', '10', '11', '12'].includes(ownGrade) &&
      !played.includes(ownGrade)
    ) {
      const dLoaded = loadGameStateFromLocalStorage(true)
      if (
        dLoaded &&
        (dLoaded.guesses.includes(dailySolution) ||
          dLoaded.guesses.length >= MAX_CHALLENGES)
      ) {
        played.push(ownGrade)
      }
    }
    return played
  })
  const currentMaxChallenges = isBonusRound
    ? MAX_BONUS_CHALLENGES
    : MAX_CHALLENGES
  const [activeSolution, setActiveSolution] = useState(
    initialRoundState.solution
  )
  const [isClearing, setIsClearing] = useState(false)
  const [bonusEnter, setBonusEnter] = useState<'grow' | 'shrink' | null>(null)
  const [isGridHidden, setIsGridHidden] = useState(false)

  const tracker = useGameTracker()
  const hasSubmittedRef = useRef(false)
  const alreadyCompleteOnLoadRef = useRef(false)
  const cloudHydrationAttemptedRef = useRef(false)
  const titleTapCountRef = useRef(0)
  const titleTapTimerRef = useRef<number | null>(null)
  const isSpaceHeldRef = useRef(false)
  const resetArmedRef = useRef(false)
  const releasedSpaceAfterArmedRef = useRef(false)

  const [isFirstToday, setIsFirstToday] = useState(
    () => getFirstToPlayDate() === new Date().toISOString().split('T')[0]
  )

  const [todayLeader, setTodayLeader] = useState<TodayLeader | null>(null)

  // Store completed daily game for side-by-side display
  const [dailyGuesses, setDailyGuesses] = useState<string[]>(
    restoredDailyState && ['won', 'lost'].includes(restoredDailyState.outcome)
      ? restoredDailyState.guesses
      : []
  )
  const [bonusGuesses, setBonusGuesses] = useState<string[]>(
    restoredBonusState && ['won', 'lost'].includes(restoredBonusState.outcome)
      ? restoredBonusState.guesses
      : []
  )
  const [teachersGuesses, setTeachersGuesses] = useState<string[]>(
    restoredTeachersState &&
      ['won', 'lost'].includes(restoredTeachersState.outcome)
      ? restoredTeachersState.guesses
      : []
  )
  const [gradeRoundGuessesMap, setGradeRoundGuessesMap] = useState<
    Record<string, string[]>
  >(() =>
    restoredGradeStates.reduce<Record<string, string[]>>((acc, state) => {
      if (state.grade && ['won', 'lost'].includes(state.outcome)) {
        acc[state.grade] = state.guesses
      }
      return acc
    }, {})
  )
  const [bothComplete, setBothComplete] = useState(() => {
    const hasCompletedDaily =
      !!restoredDailyState &&
      ['won', 'lost'].includes(restoredDailyState.outcome)
    const hasCompletedExtra =
      (!!restoredBonusState &&
        ['won', 'lost'].includes(restoredBonusState.outcome)) ||
      (!!restoredTeachersState &&
        ['won', 'lost'].includes(restoredTeachersState.outcome)) ||
      restoredGradeStates.some((state) =>
        ['won', 'lost'].includes(state.outcome)
      )

    return hasCompletedDaily && hasCompletedExtra
  })
  const hasAnyCompletedBoard =
    dailyGuesses.length > 0 ||
    bonusGuesses.length > 0 ||
    teachersGuesses.length > 0 ||
    Object.keys(gradeRoundGuessesMap).length > 0
  const hasActiveUnfinishedExtraRound =
    (isBonusRound || isTeachersRound || isGradeRound) &&
    !isGameWon &&
    !isGameLost
  const showCompletedLayout =
    bothComplete && hasAnyCompletedBoard && !hasActiveUnfinishedExtraRound

  const handleTitleTap = () => {
    // Reset gesture: hold Space while tapping logo 10+ times.
    if (!isSpaceHeldRef.current) {
      return
    }

    titleTapCountRef.current += 1

    if (titleTapTimerRef.current !== null) {
      window.clearTimeout(titleTapTimerRef.current)
    }

    if (titleTapCountRef.current >= 10) {
      // Arm reset; actual reset requires releasing Space and pressing 9.
      resetArmedRef.current = true
    }

    // Require sequence within a short window to avoid accidental resets.
    titleTapTimerRef.current = window.setTimeout(() => {
      titleTapCountRef.current = 0
      titleTapTimerRef.current = null
      resetArmedRef.current = false
      releasedSpaceAfterArmedRef.current = false
    }, 8000)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeldRef.current = true
      }

      if (
        (event.key === '9' || event.code === 'Digit9') &&
        resetArmedRef.current &&
        releasedSpaceAfterArmedRef.current &&
        !isSpaceHeldRef.current
      ) {
        titleTapCountRef.current = 0
        resetArmedRef.current = false
        releasedSpaceAfterArmedRef.current = false
        if (titleTapTimerRef.current !== null) {
          window.clearTimeout(titleTapTimerRef.current)
          titleTapTimerRef.current = null
        }
        window.localStorage.clear()
        window.location.reload()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeldRef.current = false
        if (resetArmedRef.current) {
          releasedSpaceAfterArmedRef.current = true
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (titleTapTimerRef.current !== null) {
        window.clearTimeout(titleTapTimerRef.current)
      }
    }
  }, [])

  const [guesses, setGuesses] = useState<string[]>(initialRoundState.guesses)

  const [stats, setStats] = useState(() => loadStats())

  const grade = getPlayerGrade()
  const currentPlayerDisplayName = (() => {
    const firstName = getPlayerName()
    const lastInitial = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    return prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
  })()
  // grade is a clean plain string: '0' for teachers, '9'/'10'/'11'/'12' for students.
  const isTeacherPlayer = grade === '0'

  // Fetch today's grade leader on mount (fire-and-forget)
  useEffect(() => {
    const rawGrade = getPlayerGrade()
    if (!rawGrade) return
    // Use local date to match how game_date is stored in game_submissions
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`
    fetchTodayLeader(rawGrade, today).then((leader) => {
      setTodayLeader(leader)
    })
  }, [])

  useEffect(() => {
    let isCancelled = false

    if (!currentPlayerDisplayName || !grade) {
      setIsAllTimeMvp(false)
      return () => {
        isCancelled = true
      }
    }

    fetchLeaderboard(undefined, undefined, true)
      .then((data) => {
        if (isCancelled) return
        const mvp = computeMvp(data)
        const isCurrentPlayerMvp =
          !!mvp &&
          mvp.name.toLowerCase().trim() ===
            currentPlayerDisplayName.toLowerCase().trim()
        setIsAllTimeMvp(isCurrentPlayerMvp)
      })
      .catch(() => {
        if (!isCancelled) {
          setIsAllTimeMvp(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [currentPlayerDisplayName, grade, isGameWon, isGameLost, bothComplete])

  useEffect(() => {
    const hasValidGrade = grade !== ''

    if (hasValidGrade) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsGradeModalOpen(true)
    }, WELCOME_GRADE_MODAL_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [grade])

  // Prompt existing users (have grade but no name) to enter name
  useEffect(() => {
    const hasGrade = grade !== ''
    const hasName = !!getPlayerName()
    const currentGrade = grade
    const isTeacher = currentGrade === '0'
    const hasPrefix = !!getPlayerPrefix()
    const hasInitial = !!getPlayerLastInitial()
    const hasRequiredIdentifier = isTeacher ? hasPrefix : hasInitial
    if (hasGrade && (!hasName || !hasRequiredIdentifier)) {
      // Delay past stats modal (1000ms) so name prompt always appears on top
      setTimeout(() => {
        setIsStatsModalOpen(false)
        setIsGradeModalOpen(true)
      }, 1200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On page load: show info modal if first time after grade selection
  useEffect(() => {
    if (getShouldShowInfoAfterReload()) {
      clearShouldShowInfoAfterReload()
      setHasSeenInfoModal()
      setTimeout(() => {
        setIsInfoModalOpen(true)
      }, 500)
    }
  }, [])

  // On page load: show one-time welcome message after first-ever registration
  useEffect(() => {
    if (!getShouldShowWelcomeAfterReload()) return
    clearShouldShowWelcomeAfterReload()
    const gradeLabel: Record<string, string> = {
      '0': 'Teacher',
      '9': 'Freshman',
      '10': 'Sophomore',
      '11': 'Junior',
      '12': 'Senior',
    }
    const name = currentPlayerDisplayName
    const gradeCode = getPlayerGrade()
    const label = gradeLabel[gradeCode] ?? ''
    const message = label
      ? `Welcome to Studentle, ${name}! You're registered as a ${label}.`
      : `Welcome to Studentle, ${name}!`
    setTimeout(() => {
      showSuccessAlert(message, { persist: true })
    }, 800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On page load: hydrate localStorage from cloud state if the remote snapshot is newer.
  useEffect(() => {
    if (cloudHydrationAttemptedRef.current) return
    cloudHydrationAttemptedRef.current = true
    ensureRoundStateSchemaVersion()

    // After account claim restore, skip one hydration cycle to avoid stale
    // cloud state clobbering freshly restored local progress.
    if (localStorage.getItem('skipCloudHydrationOnce') === 'true') {
      localStorage.removeItem('skipCloudHydrationOnce')
      return
    }

    // During account-claim flow, leaderboard/API should drive restoration.
    // Skip cloud hydration so stale snapshots cannot override claim results.
    if (getPendingAccountCheck()) return

    const firstName = getPlayerName()
    const lastInitial = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    const displayName = prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
    const gradeRaw = getPlayerGrade()
    if (!displayName || !gradeRaw) return

    fetchPlayerStateFromCloud(displayName, gradeRaw)
      .then((snapshot) => {
        if (!snapshot || !snapshot.state) return
        const lastApplied = localStorage.getItem('cloudStateAppliedAt') || ''
        if (lastApplied === snapshot.updatedAt) return

        let changed = false
        for (const [k, v] of Object.entries(snapshot.state)) {
          const localValue = localStorage.getItem(k)
          if (localValue === v) continue

          if (isRoundStateStorageKey(k)) {
            if (!isCloudRoundStateNewer(localValue, v)) {
              continue
            }

            localStorage.setItem(k, v)
            changed = true
            continue
          }

          localStorage.setItem(k, v)
          changed = true
        }

        if (changed) {
          localStorage.setItem('cloudStateAppliedAt', snapshot.updatedAt)
          showSuccessAlert('Syncing your progress…')
          setTimeout(() => window.location.reload(), 800)
        }
      })
      .catch(() => {
        // Keep local state if cloud read fails.
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On page load: restore all completed round guesses and bothComplete state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Load bonus guesses if bonus was finished today
    const bLoaded = loadBonusGameStateFromLocalStorage()
    if (bLoaded && bLoaded.solution === bonusSolution) {
      const bWon = bLoaded.guesses.includes(bonusSolution)
      const bLost = bLoaded.guesses.length >= MAX_BONUS_CHALLENGES && !bWon
      if (bWon || bLost) setBonusGuesses(bLoaded.guesses)
    }
    // Load teachers guesses if teachers was finished today (students only — teachers play daily as their teacher-word game)
    if (!isTeacherPlayer) {
      const tLoaded = loadTeachersGameStateFromLocalStorage()
      if (tLoaded && tLoaded.solution === teachersSolution) {
        const tWon = tLoaded.guesses.includes(teachersSolution)
        const tLost = tLoaded.guesses.length >= MAX_CHALLENGES && !tWon
        if (tWon || tLost) setTeachersGuesses(tLoaded.guesses)
      }
    }
    // Load daily guesses if daily was finished today
    const dLoaded = loadGameStateFromLocalStorage(isLatestGame)
    if (dLoaded && dLoaded.solution === effectiveDailySolution) {
      const dWon = dLoaded.guesses.includes(effectiveDailySolution)
      const dLost = dLoaded.guesses.length >= MAX_CHALLENGES && !dWon
      if (dWon || dLost) setDailyGuesses(dLoaded.guesses)
    }
    // Load grade round guesses for all grades played today
    const gradeMap: Record<string, string[]> = {}
    for (const g of ['9', '10', '11', '12']) {
      if (hasGradeRoundBeenPlayedToday(g)) {
        const gLoaded = loadGradeRoundGameStateFromLocalStorage(g)
        const gSol = getGradeRoundSolution(g)
        if (gLoaded && gLoaded.solution === gSol) {
          gradeMap[g] = gLoaded.guesses
        }
      }
    }
    if (Object.keys(gradeMap).length > 0) {
      setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({
        ...prev,
        ...gradeMap,
      }))
    }
    // Restore bothComplete only when daily is complete and at least one extra round is done.
    const dLoadedNow = loadGameStateFromLocalStorage(isLatestGame)
    const dailyDoneNow =
      !!dLoadedNow &&
      dLoadedNow.solution === effectiveDailySolution &&
      (dLoadedNow.guesses.includes(effectiveDailySolution) ||
        dLoadedNow.guesses.length >= MAX_CHALLENGES)
    const extrasDoneNow =
      hasBonusBeenPlayedToday() ||
      hasTeachersBeenPlayedToday() ||
      ['9', '10', '11', '12'].some((g) => hasGradeRoundBeenPlayedToday(g))

    if (dailyDoneNow && extrasDoneNow) {
      setBothComplete(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On page load: if game is already complete, show stats after 1 second
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const isComplete = isGameWon || isGameLost
    const hasName = !!getPlayerName()
    if (isComplete && grade !== '') {
      hasSubmittedRef.current = true // already done, don't re-submit
      alreadyCompleteOnLoadRef.current = true
      if (hasName) {
        setTimeout(() => {
          setIsStatsModalOpen(true)
        }, 1000)
      }
      // If no name, the name-prompt modal will open instead; stats can be opened manually
    } else if (!isComplete) {
      tracker.startGame()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    DISCOURAGE_INAPP_BROWSERS &&
      isInAppBrowser() &&
      showErrorAlert(DISCOURAGE_INAPP_BROWSER_TEXT, {
        persist: false,
        durationMs: 7000,
      })
  }, [showErrorAlert])

  useEffect(() => {
    if (formatDateKey(new Date()) !== MIGRATION_RECOVERY_NOTICE_DATE) {
      return
    }

    const noticeStorageKey = `migrationRecoveryNoticeSeen:${MIGRATION_RECOVERY_NOTICE_DATE}`
    if (localStorage.getItem(noticeStorageKey) === 'true') {
      return
    }

    localStorage.setItem(noticeStorageKey, 'true')
    showSuccessAlert(MIGRATION_RECOVERY_NOTICE_TEXT, {
      delayMs: 800,
      durationMs: 18000,
    })
  }, [showSuccessAlert])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (isHighContrastMode) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isDarkMode, isHighContrastMode])

  const handleDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    setTheme(isDark ? 'dark' : 'light')
  }

  const handleHighContrastMode = (isHighContrast: boolean) => {
    setIsHighContrastMode(isHighContrast)
    setStoredIsHighContrastMode(isHighContrast)
  }

  const clearCurrentRowClass = () => {
    setCurrentRowClass('')
  }

  // Persist game state
  useEffect(() => {
    if (isGradeRound && gradeRoundGrade) {
      saveActiveRoundToLocalStorage({ type: 'grade', grade: gradeRoundGrade })
      saveGradeRoundGameStateToLocalStorage(gradeRoundGrade, {
        guesses,
        solution: getGradeRoundSolution(gradeRoundGrade),
      })
    } else if (isTeachersRound) {
      saveActiveRoundToLocalStorage({ type: 'teachers' })
      saveTeachersGameStateToLocalStorage({
        guesses,
        solution: teachersSolution,
      })
    } else if (isBonusRound) {
      saveActiveRoundToLocalStorage({ type: 'bonus' })
      saveBonusGameStateToLocalStorage({
        guesses,
        solution: bonusSolution,
      })
    } else {
      saveActiveRoundToLocalStorage({ type: 'daily' })
      saveGameStateToLocalStorage(getIsLatestGame(), {
        guesses,
        solution: effectiveDailySolution,
      })
    }
  }, [guesses, isBonusRound, isTeachersRound, isGradeRound, gradeRoundGrade]) // eslint-disable-line react-hooks/exhaustive-deps

  // Full-state sync for seamless cross-device continuity — pushed when it
  // actually matters (the tab is being backgrounded/closed, or a game just
  // finished) rather than ~800ms after every single guess. Syncing on every
  // keystroke-adjacent change fired a network request mid-guess constantly,
  // which was the source of the "laggy while typing" complaint; resuming on
  // a new device only ever needs whatever was last pushed before the player
  // actually left, so tying the push to visibility/completion loses nothing.
  const syncStateToCloud = () => {
    const firstName = getPlayerName()
    const lastInitial = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    ensureRoundStateSchemaVersion()
    const displayName = prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
    const gradeRaw = getPlayerGrade()
    if (!displayName || !gradeRaw) return

    const baseKeys = [
      'roundStateSchemaVersion',
      'gradeNumber',
      'playerName',
      'playerLastInitial',
      'playerPrefix',
      'gameState',
      'archiveGameState',
      'bonusGameState',
      'teachersGameState',
      'activeRoundState',
      'gameStats',
      'bonusRoundPlayedDate',
      'teachersRoundPlayedDate',
      'firstToPlayDate',
      'theme',
      'highContrast',
      'historicalStatsSubmitted',
      'hasSeenInfo',
    ]

    const dynamicKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (
        k.startsWith('gradeRoundGameState_') ||
        k.startsWith('gradeRoundPlayedDate_')
      ) {
        dynamicKeys.push(k)
      }
    }

    const state: Record<string, string> = {}
    for (const key of Array.from(new Set([...baseKeys, ...dynamicKeys]))) {
      const val = localStorage.getItem(key)
      if (val !== null) state[key] = val
    }

    syncPlayerStateToCloud(displayName, gradeRaw, state).catch(() => {
      // Keep local gameplay fully offline-first.
    })
  }

  // Primary trigger: push right before the player actually leaves — tab
  // switch, minimize, backgrounding on mobile, or closing the tab (which
  // fires 'hidden' just before unload in every modern browser).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') syncStateToCloud()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Secondary trigger: push immediately on a completed game — a meaningful
  // checkpoint worth saving right away rather than waiting for a tab switch.
  useEffect(() => {
    if (!isGameWon && !isGameLost) return
    syncStateToCloud()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameWon, isGameLost])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isGameWon && !alreadyCompleteOnLoadRef.current) {
      const winMessage =
        WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
      const delayMs = REVEAL_TIME_MS * activeSolution.length

      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => setIsStatsModalOpen(true),
      })
    }

    if (isGameLost && !alreadyCompleteOnLoadRef.current) {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, (activeSolution.length + 1) * REVEAL_TIME_MS)
    }
  }, [isGameWon, isGameLost, showSuccessAlert]) // eslint-disable-line react-hooks/exhaustive-deps

  const isAnyModalOpen =
    isGradeModalOpen ||
    isStatsModalOpen ||
    isInfoModalOpen ||
    isLeaderboardModalOpen ||
    isSettingsModalOpen

  const onChar = (value: string) => {
    const canAddRegardlessOfLength =
      guesses.length < currentMaxChallenges &&
      !isGameWon &&
      !isClearing &&
      !isAnyModalOpen

    if (!canAddRegardlessOfLength) return

    // Physical key presses come through a native window listener (see
    // Keyboard.tsx) that can fire faster than this component re-renders with
    // an updated `currentGuess` closure — fast typing was silently dropping
    // letters. Use the functional updater so each keystroke always builds on
    // the latest guess, not whatever was captured when the listener was
    // (re-)subscribed.
    setCurrentGuess((prev) => {
      const canAdd = unicodeLength(`${prev}${value}`) <= activeSolution.length
      if (!canAdd) return prev
      tracker.recordKeystroke()
      return `${prev}${value}`
    })
  }

  const onDelete = () => {
    if (isClearing || isAnyModalOpen) {
      return
    }
    setCurrentGuess((prev) => {
      if (prev.length === 0) return prev
      tracker.recordDelete()
      return new GraphemeSplitter().splitGraphemes(prev).slice(0, -1).join('')
    })
  }

  const submitGame = async (won: boolean, guessCount: number) => {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true

    // Check the live leaderboard: if no one has played today yet, this player is first
    if (!isBonusRound) {
      try {
        const _d = solutionGameDate
        const today = formatDateKey(_d)
        const existing = await fetchLeaderboard(today)
        const gradeRawCheck = getPlayerGrade()
        const gradeCleanCheck =
          LEGACY_GRADE_NORMALIZATION_MAP[gradeRawCheck] || gradeRawCheck
        const existingDailyCount = existing.filter(
          (e) => String(e.grade) === gradeCleanCheck && isTrueDailyEntry(e)
        ).length
        if (existingDailyCount === 0) {
          setIsFirstToday(true)
          setFirstToPlayDate(today)
        }
      } catch {
        // ignore - don't block submission
      }
    }

    const firstName = getPlayerName()
    const lastInitial = getPlayerLastInitial()
    const prefix = getPlayerPrefix()
    let playerName = prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
    if (!firstName) return // don't submit nameless games
    const gradeCleanRaw = getPlayerGrade()
    let gradeClean =
      LEGACY_GRADE_NORMALIZATION_MAP[gradeCleanRaw] || gradeCleanRaw
    // Legacy name/grade corrections (players who registered before certain features existed)
    const normalizePlayerKey = (name: string) =>
      String(name || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    const legacyNameFixes: Record<string, { name: string; grade: string }> = {
      'harvey m': { name: 'Mrs. Harvey', grade: '0' },
      'evan bassett': { name: 'Dr. Bassett', grade: '0' },
      'bassett evan': { name: 'Dr. Bassett', grade: '0' },
      'katie cruce': { name: 'Mrs. Cruce', grade: '0' },
      'katie c': { name: 'Mrs. Cruce', grade: '0' },
      'amanda adams': { name: 'Mrs. Adams', grade: '0' },
    }
    const legacyFix = legacyNameFixes[normalizePlayerKey(playerName)]
    if (legacyFix) {
      playerName = legacyFix.name
      gradeClean = legacyFix.grade
    }
    const trackingData = tracker.getSubmissionData()
    const d = solutionGameDate
    const puzzleDateStr = formatDateKey(d)
    const dailyGameType: 'teachers' | `grade${string}` =
      gradeClean === '0' ? 'teachers' : `grade${gradeClean}`

    submitGameData({
      name: playerName,
      grade: gradeClean,
      date: puzzleDateStr,
      word: activeSolution,
      won,
      guessCount,
      gameType: isGradeRound
        ? `grade${gradeRoundGrade}`
        : isTeachersRound
        ? 'teachers'
        : isBonusRound
        ? 'bonus'
        : dailyGameType,
      ...trackingData,
    })
  }

  const onEnter = () => {
    if (isGameWon || isGameLost || isClearing || isAnyModalOpen) {
      return
    }

    if (!(unicodeLength(currentGuess) === activeSolution.length)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(NOT_ENOUGH_LETTERS_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    const allowedGuessWords = (() => {
      if (isBonusRound && isTeacherPlayer) {
        return TEACHER_WORDS_FULL
      }

      if (isBonusRound) {
        return BONUS_WORDS
      }

      if (isGradeRound && gradeRoundGrade) {
        return GRADE_WORD_LISTS[gradeRoundGrade]
      }

      if (isTeachersRound || isTeacherPlayer) {
        return TEACHER_WORDS
      }

      // Daily: restrict to the player's own grade list
      return VALID_GUESSES
    })()

    if (!isWordInWordList(currentGuess, allowedGuessWords)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(
        isTeacherPlayer ? TEACHER_NOT_FOUND_MESSAGE : WORD_NOT_FOUND_MESSAGE,
        { onClose: clearCurrentRowClass }
      )
    }

    // enforce hard mode check removed — hard mode no longer supported

    setIsRevealing(true)
    setTimeout(() => {
      setIsRevealing(false)
    }, REVEAL_TIME_MS * activeSolution.length)

    const winningWord = currentGuess === activeSolution

    if (
      unicodeLength(currentGuess) === activeSolution.length &&
      guesses.length < currentMaxChallenges &&
      !isGameWon
    ) {
      tracker.recordGuess(currentGuess)
      const newGuesses = [...guesses, currentGuess]
      setGuesses(newGuesses)
      setCurrentGuess('')

      if (winningWord) {
        if (
          isLatestGame &&
          !isBonusRound &&
          !isTeachersRound &&
          !isGradeRound
        ) {
          const newStats = addStatsForCompletedGame(stats, guesses.length)
          setStats(newStats)
          setDailyGuesses(newGuesses)
          // Personal best: first win ever, or beat lowest guess count on record
          const guessCount = guesses.length + 1
          const prevBestIdx = stats.winDistribution.findIndex(
            (c: number) => c > 0
          )
          const isFirstWin = prevBestIdx === -1
          const beatsBest = !isFirstWin && guessCount < prevBestIdx + 1
          if (isFirstWin || beatsBest) setIsPersonalBest(true)
          // Pre-mark own grade as done so it can't be replayed
          const ownGrade = (grade || '').replace(/"/g, '')
          if (
            ['9', '10', '11', '12'].includes(ownGrade) &&
            !gradeRoundsPlayed.includes(ownGrade)
          ) {
            setGradeRoundsPlayed((prev: string[]) => [...prev, ownGrade])
          }
        }
        if (isBonusRound) {
          recordExtraRoundResult('bonus', true)
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isTeachersRound) {
          recordExtraRoundResult('teachers', true)
          setTeachersPlayedToday()
          setTeachersGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isGradeRound && gradeRoundGrade) {
          recordExtraRoundResult('grade', true)
          setGradeRoundPlayedToday(gradeRoundGrade)
          setGradeRoundsPlayed((prev: string[]) => [...prev, gradeRoundGrade])
          setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({
            ...prev,
            [gradeRoundGrade]: newGuesses,
          }))
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(true, newGuesses.length)
        return setIsGameWon(true)
      }

      if (guesses.length === currentMaxChallenges - 1) {
        if (
          isLatestGame &&
          !isBonusRound &&
          !isTeachersRound &&
          !isGradeRound
        ) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
          setDailyGuesses(newGuesses)
          // Pre-mark own grade as done so it can't be replayed
          const ownGrade = (grade || '').replace(/"/g, '')
          if (
            ['9', '10', '11', '12'].includes(ownGrade) &&
            !gradeRoundsPlayed.includes(ownGrade)
          ) {
            setGradeRoundsPlayed((prev: string[]) => [...prev, ownGrade])
          }
        }
        if (isBonusRound) {
          recordExtraRoundResult('bonus', false)
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isTeachersRound) {
          recordExtraRoundResult('teachers', false)
          setTeachersPlayedToday()
          setTeachersGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isGradeRound && gradeRoundGrade) {
          recordExtraRoundResult('grade', false)
          setGradeRoundPlayedToday(gradeRoundGrade)
          setGradeRoundsPlayed((prev: string[]) => [...prev, gradeRoundGrade])
          setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({
            ...prev,
            [gradeRoundGrade]: newGuesses,
          }))
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(false, newGuesses.length)
        setIsGameLost(true)
        if (!isBonusRound && !isTeachersRound && !isGradeRound) {
          showErrorAlert(
            isTeacherPlayer
              ? CORRECT_TEACHER_MESSAGE(activeSolution)
              : CORRECT_WORD_MESSAGE(activeSolution),
            {
              persist: true,
              delayMs: REVEAL_TIME_MS * activeSolution.length + 1,
            }
          )
        }
      }
    }
  }

  function handleGradeModalClose() {
    setIsGradeModalOpen(false)
    if (!hasSeenInfoModal()) {
      setHasSeenInfoModal()
      setIsInfoModalOpen(true)
    }
  }

  // Shared animation + state wiring for every extra round (bonus, teachers, grade).
  // Runs the fall-clear animation, resets game state, then plays the fill-in entrance.
  const startExtraRound = (config: {
    solution: string
    setupRound: () => void
    toastMessage: string
  }) => {
    setIsStatsModalOpen(false)
    // Only snapshot guesses as daily when actually transitioning FROM the daily round.
    // If we're already in bonus/teachers/grade and starting another extra round,
    // guesses belongs to that extra round — don't overwrite the saved daily board.
    if (!isBonusRound && !isTeachersRound && !isGradeRound) {
      setDailyGuesses([...guesses])
    }
    setIsClearing(true)
    const totalClearTime = MAX_CHALLENGES * 110 + 700 + 150

    setTimeout(() => {
      setIsClearing(false)
      setIsGridHidden(true)

      setActiveSolution(config.solution)
      config.setupRound()
      setGuesses([])
      setCurrentGuess('')
      setIsGameWon(false)
      setIsGameLost(false)
      setBothComplete(false)
      tracker.reset()
      tracker.startGame()
      hasSubmittedRef.current = false

      setTimeout(() => {
        setIsGridHidden(false)
        setBonusEnter('grow')
        showSuccessAlert(config.toastMessage, { delayMs: 100 })
        const totalEnterTime =
          MAX_CHALLENGES * config.solution.length * 60 + 500
        setTimeout(() => {
          setBonusEnter(null)
        }, totalEnterTime)
      }, 1000)
    }, totalClearTime)
  }

  const handleBonusRound = () =>
    startExtraRound({
      solution: bonusSolution,
      setupRound: () => {
        setIsBonusRound(true)
        setIsTeachersRound(false)
        setIsGradeRound(false)
      },
      toastMessage: 'Bonus Round!',
    })

  const handleTeachersRound = () =>
    startExtraRound({
      solution: teachersSolution,
      setupRound: () => {
        setIsTeachersRound(true)
        setIsBonusRound(false)
        setIsGradeRound(false)
      },
      toastMessage: 'Teachers Round!',
    })

  const handleGradeRound = (grade: string) => {
    const gradeSolution = getGradeRoundSolution(grade)
    if (!gradeSolution) return
    startExtraRound({
      solution: gradeSolution,
      setupRound: () => {
        setIsGradeRound(true)
        setGradeRoundGrade(grade)
        setIsBonusRound(false)
        setIsTeachersRound(false)
      },
      toastMessage: `${GRADE_LABELS[grade] ?? 'Grade'} Round!`,
    })
  }

  return (
    <Div100vh>
      <div className="flex h-full flex-col">
        <Navbar
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          setIsLeaderboardModalOpen={setIsLeaderboardModalOpen}
          onTitleTap={handleTitleTap}
          isMvp={isAllTimeMvp}
        />

        {!isLatestGame && (
          <div className="flex items-center justify-center">
            <ClockIcon className="h-6 w-6 stroke-gray-600 dark:stroke-gray-300" />
            <p className="text-base text-gray-600 dark:text-gray-300">
              {format(gameDate, 'd MMMM yyyy', { locale: DATE_LOCALE })}
            </p>
          </div>
        )}

        {/* Current round label — only shown when not in daily mode */}
        {(isBonusRound || isTeachersRound || isGradeRound) && (
          <div className="flex justify-center pt-1">
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
              {isBonusRound
                ? 'Bonus Round'
                : isTeachersRound
                ? 'Teachers Round'
                : `${GRADE_LABELS[gradeRoundGrade] ?? 'Grade'} Round`}
            </span>
          </div>
        )}

        <div className="mx-auto flex w-full grow flex-col px-1 pt-2 pb-8 sm:px-6 md:max-w-7xl lg:px-8 short:pb-2 short:pt-2">
          {showCompletedLayout ? (
            <div className="flex grow flex-col overflow-y-auto pb-2 short:pb-1">
              <div className="flex flex-wrap justify-center gap-3 py-2">
                <CompletedGrid
                  solution={effectiveDailySolution}
                  guesses={dailyGuesses}
                  label="Daily"
                />
                {bonusGuesses.length > 0 && (
                  <CompletedGrid
                    solution={bonusSolution}
                    guesses={bonusGuesses}
                    label="Bonus"
                    maxChallenges={MAX_BONUS_CHALLENGES}
                  />
                )}
                {teachersGuesses.length > 0 && (
                  <CompletedGrid
                    solution={teachersSolution}
                    guesses={teachersGuesses}
                    label="Teachers"
                  />
                )}
                {(
                  Object.entries(gradeRoundGuessesMap) as [string, string[]][]
                ).map(([g, gGuesses]) => (
                  <CompletedGrid
                    key={g}
                    solution={getGradeRoundSolution(g)}
                    guesses={gGuesses}
                    label={GRADE_LABELS[g]}
                  />
                ))}
              </div>
            </div>
          ) : isGridHidden ? (
            <div className="flex grow flex-col justify-center pb-6 short:pb-2" />
          ) : (
            <div className="flex grow flex-col justify-center pb-6 short:pb-2">
              <Grid
                solution={activeSolution}
                guesses={guesses}
                currentGuess={currentGuess}
                isRevealing={isRevealing}
                currentRowClassName={currentRowClass}
                isClearing={isClearing}
                bonusEnter={bonusEnter}
                maxChallenges={currentMaxChallenges}
              />
            </div>
          )}
          {!showCompletedLayout && (
            <Keyboard
              onChar={onChar}
              onDelete={onDelete}
              onEnter={onEnter}
              solution={activeSolution}
              guesses={guesses}
              isRevealing={isRevealing}
            />
          )}

          {/* ── Round picker — shown on main screen after daily is done ── */}
          {(isGameWon || isGameLost) &&
            isLatestGame &&
            !isBonusRound &&
            !isTeachersRound &&
            !isGradeRound && (
              <div className="flex flex-wrap justify-center gap-2 px-2 pt-2 pb-1">
                {!hasBonusBeenPlayedToday() ? (
                  <button
                    type="button"
                    className="glisten-btn rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700"
                    onClick={handleBonusRound}
                  >
                    🎉 Bonus Round
                  </button>
                ) : (
                  <span className="rounded-full border border-blue-300 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-500 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    ✓ Bonus Done
                  </span>
                )}
                {!isTeacherPlayer &&
                  (!hasTeachersBeenPlayedToday() ? (
                    <button
                      type="button"
                      className="glisten-btn rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                      onClick={handleTeachersRound}
                    >
                      🍎 Teachers Round
                    </button>
                  ) : (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      ✓ Teachers Done
                    </span>
                  ))}
                {(() => {
                  const prereqsDone =
                    hasBonusBeenPlayedToday() &&
                    (isTeacherPlayer || hasTeachersBeenPlayedToday())
                  return (['9', '10', '11', '12'] as const).map((g) => {
                    const done = gradeRoundsPlayed.includes(g)
                    if (done) {
                      return (
                        <span
                          key={g}
                          className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500"
                        >
                          {GRADE_LABELS[g]} ✓
                        </span>
                      )
                    }
                    if (!prereqsDone) {
                      return (
                        <span
                          key={g}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600"
                          title="Complete Bonus and Teachers rounds first"
                        >
                          🔒 {GRADE_LABELS[g]}
                        </span>
                      )
                    }
                    return (
                      <button
                        key={g}
                        type="button"
                        className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-purple-700"
                        onClick={() => handleGradeRound(g)}
                      >
                        {GRADE_LABELS[g]}
                      </button>
                    )
                  })
                })()}
              </div>
            )}
          {/* Daily info strip — puzzle number + today's grade leader — always visible */}
          <div className="flex items-center justify-between px-4 pt-2 pb-1 text-xs text-gray-400 dark:text-gray-500">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              #{solutionIndex + 1}
            </span>
            {todayLeader &&
              (() => {
                // Redact leader name if any token is a valid guess for the active
                // puzzle and the game isn't complete yet (spoiler prevention).
                const gameComplete = isGameWon || isGameLost
                const leaderNameHidden =
                  !gameComplete &&
                  String(todayLeader.name || '')
                    .trim()
                    .split(/\s+/)
                    .some((token) => {
                      const letters = token
                        .replace(/[^a-zA-Z]/g, '')
                        .toLowerCase()
                      return (
                        letters.length > 1 &&
                        letters.length === activeSolution.length &&
                        VALID_GUESSES.includes(letters)
                      )
                    })
                return leaderNameHidden ? null : todayLeader.name
                    .split(' ')[0]
                    .toLowerCase() !== effectiveDailySolution.toLowerCase() ? (
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Today&apos;s leader:{' '}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {todayLeader.name}
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {' '}
                      ({todayLeader.guessCount}/6)
                    </span>
                  </span>
                ) : (
                  <span className="italic">No winner yet — be first!</span>
                )
              })()}
          </div>
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
          />
          <StatsModal
            isOpen={isStatsModalOpen}
            handleClose={() => setIsStatsModalOpen(false)}
            solution={effectiveDailySolution}
            guesses={dailyGuesses.length > 0 ? dailyGuesses : guesses}
            gameStats={stats}
            isLatestGame={isLatestGame}
            isGameLost={isGameLost}
            isGameWon={isGameWon}
            handleShareToClipboard={() => showSuccessAlert(GAME_COPIED_MESSAGE)}
            handleShareFailure={() =>
              showErrorAlert(SHARE_FAILURE_TEXT, {
                durationMs: LONG_ALERT_TIME_MS,
              })
            }
            isDarkMode={isDarkMode}
            isHighContrastMode={isHighContrastMode}
            numberOfGuessesMade={
              isBonusRound || isTeachersRound || isGradeRound
                ? dailyGuesses.length
                : guesses.length
            }
            handleBonusRound={handleBonusRound}
            isBonusRoundAvailable={
              !isBonusRound &&
              !hasBonusBeenPlayedToday() &&
              isLatestGame &&
              (isGameWon || isGameLost)
            }
            isBonusRound={isBonusRound}
            bonusSolution={bonusSolution}
            bonusGuesses={bonusGuesses}
            handleTeachersRound={handleTeachersRound}
            isTeachersRoundAvailable={
              // Teachers never see the "Teachers Round" button — they ARE teachers
              !isTeacherPlayer &&
              !isTeachersRound &&
              !hasTeachersBeenPlayedToday() &&
              isLatestGame &&
              (isGameWon || isGameLost)
            }
            isTeachersRound={isTeachersRound}
            handleGradeRound={handleGradeRound}
            gradeRoundsPlayed={gradeRoundsPlayed}
            isTeacherPlayer={isTeacherPlayer}
            playerGrade={(grade || '').replace(/"/g, '')}
            allRoundsComplete={
              isTeacherPlayer
                ? // Teachers: "all rounds" means bonus has been played
                  isLatestGame &&
                  (isGameWon || isGameLost || dailyGuesses.length > 0) &&
                  hasBonusBeenPlayedToday()
                : // Students: bonus + teachers both done
                  isLatestGame &&
                  (isGameWon || isGameLost || dailyGuesses.length > 0) &&
                  hasBonusBeenPlayedToday() &&
                  hasTeachersBeenPlayedToday()
            }
            onOpenLeaderboard={() => {
              setIsStatsModalOpen(false)
              setIsLeaderboardModalOpen(true)
            }}
            isFirstToday={isFirstToday}
            isPersonalBest={isPersonalBest}
            onPersonalBestSeen={() => setIsPersonalBest(false)}
            teachersSolution={teachersSolution}
            teachersGuesses={teachersGuesses}
            gradeRoundGuessesMap={gradeRoundGuessesMap}
            gradeRoundSolutions={Object.fromEntries(
              ['9', '10', '11', '12'].map((g) => [g, getGradeRoundSolution(g)])
            )}
          />
          <LeaderboardModal
            isOpen={isLeaderboardModalOpen}
            handleClose={() => setIsLeaderboardModalOpen(false)}
            solutionLength={activeSolution.length}
            isGameComplete={isGameWon || isGameLost}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            handleClose={() => setIsSettingsModalOpen(false)}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={handleHighContrastMode}
          />
          <GradeModal
            isOpen={isGradeModalOpen}
            handleClose={() => handleGradeModalClose()}
            isGameActive={!isGameWon && !isGameLost && guesses.length > 0}
            isInfoOpen={isInfoModalOpen}
          />
          <AlertContainer />
        </div>
      </div>
    </Div100vh>
  )
}

export default App
