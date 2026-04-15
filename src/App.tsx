import './App.css'

import { ClockIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { default as GraphemeSplitter } from 'grapheme-splitter'
import { useEffect, useState, useRef } from 'react'
import Div100vh from 'react-div-100vh'

import { AlertContainer } from './components/alerts/AlertContainer'
import { Grid } from './components/grid/Grid'
import { CompletedGrid } from './components/grid/CompletedGrid'
import { Keyboard } from './components/keyboard/Keyboard'
import { DatePickerModal } from './components/modals/DatePickerModal'
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
  MAX_CHALLENGES,
  MAX_BONUS_CHALLENGES,
  REVEAL_TIME_MS,
  WELCOME_GRADE_MODAL_MS,
  WELCOME_INFO_MODAL_MS,
} from './constants/settings'
import {
  CORRECT_WORD_MESSAGE,
  DISCOURAGE_INAPP_BROWSER_TEXT,
  GAME_COPIED_MESSAGE,
  NOT_ENOUGH_LETTERS_MESSAGE,
  SHARE_FAILURE_TEXT,
  WIN_MESSAGES,
  WORD_NOT_FOUND_MESSAGE,
} from './constants/strings'
import { useAlert } from './context/AlertContext'
import { isInAppBrowser } from './lib/browser'
import {
  getStoredIsHighContrastMode,
  loadActiveRoundFromLocalStorage,
  loadGameStateFromLocalStorage,
  loadBonusGameStateFromLocalStorage,
  saveBonusGameStateToLocalStorage,
  saveGameStateToLocalStorage,
  loadTeachersGameStateFromLocalStorage,
  saveTeachersGameStateToLocalStorage,
  saveGradeRoundGameStateToLocalStorage,
  loadGradeRoundGameStateFromLocalStorage,
  saveActiveRoundToLocalStorage,
  setStoredIsHighContrastMode,
} from './lib/localStorage'
import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from './lib/localStorage'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  getGameDate,
  getIsLatestGame,
  isWinningWord,
  isWordInWordList,
  setGameDate,
  solution as dailySolution,
  solutionGameDate,
  unicodeLength,
} from './lib/words'
import {
  getBonusSolution,
  hasBonusBeenPlayedToday,
  setBonusPlayedToday,
} from './utils/bonusRound'
import {
  getTeachersSolution,
  hasTeachersBeenPlayedToday,
  setTeachersPlayedToday,
} from './utils/teachersRound'
import { getTeachersBonusSolution } from './teacherWords'
import {
  getGradeRoundSolution,
  hasGradeRoundBeenPlayedToday,
  setGradeRoundPlayedToday,
  GRADE_LABELS,
} from './utils/gradeRound'
import {
  submitGameData,
  fetchLeaderboard,
  fetchPlayerStateFromCloud,
  syncPlayerStateToCloud,
  isTrueDailyEntry,
} from './lib/api'
import { useGameTracker } from './hooks/useGameTracker'

type RoundRestoreMode = 'daily' | 'bonus' | 'teachers' | 'grade'

type ResolvedRoundState = {
  mode: RoundRestoreMode
  guesses: string[]
  solution: string
  outcome: 'empty' | 'in-progress' | 'won' | 'lost'
  grade?: string
}

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
    outcome: getStoredRoundOutcome(storedState.guesses, solution, maxChallenges),
    grade,
  }
}

function App() {
  const isLatestGame = getIsLatestGame()
  const gameDate = getGameDate()
  // Teachers get their own bonus using all teacher names; students get the regular bonus
  const bonusSolution = (() => {
    const g = localStorage.getItem('gradeNumber')
    return g === '"0"' ? getTeachersBonusSolution() : getBonusSolution()
  })()
  const teachersSolution = getTeachersSolution()
  const hasLoadedRef = useRef(false)

  // Legacy teachers registered as students before teacher support existed.
  // Normalize their gradeNumber to "0" in localStorage so every downstream
  // calculation (daily solution, word list, bonus, gameType) is correct.
  ;(() => {
    const fn = localStorage.getItem('playerName') || ''
    const li = localStorage.getItem('playerLastInitial') || ''
    const prefix = localStorage.getItem('playerPrefix') || ''
    const storedName = prefix ? `${prefix} ${fn}` : li ? `${fn} ${li}` : fn
    const key = storedName.toLowerCase().replace(/\s+/g, ' ').trim()
    const legacyTeacherKeys = ['harvey m', 'katie cruce', 'katie c', 'evan bassett', 'bassett evan', 'amanda adams']
    if (legacyTeacherKeys.includes(key)) {
      const currentGrade = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
      if (currentGrade !== '0') {
        localStorage.setItem('gradeNumber', '"0"')
      }
    }
  })()

  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  const effectiveDailySolution = (() => {
    const g = localStorage.getItem('gradeNumber')
    return g === '"0"' ? teachersSolution : dailySolution
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
      : restoredGradeStates.find((state) => state.outcome === 'in-progress') ?? null
  const initialRoundState = (() => {
    if (
      activeRoundPreference?.type === 'teachers' &&
      restoredTeachersState?.outcome === 'in-progress'
    ) {
      return restoredTeachersState
    }

    if (
      activeRoundPreference?.type === 'bonus' &&
      restoredBonusState?.outcome === 'in-progress'
    ) {
      return restoredBonusState
    }

    if (activeRoundPreference?.type === 'grade') {
      const matchingGradeState = restoredGradeStates.find(
        (state) =>
          state.outcome === 'in-progress' && state.grade === activeRoundPreference.grade
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
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [isPersonalBest, setIsPersonalBest] = useState(false)
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameWon, setIsGameWon] = useState(initialRoundState.outcome === 'won')
  const [isGameLost, setIsGameLost] = useState(initialRoundState.outcome === 'lost')
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme')
      ? localStorage.getItem('theme') === 'dark'
      : prefersDarkMode
      ? true
      : false
  )
  const [isHighContrastMode, setIsHighContrastMode] = useState(
    getStoredIsHighContrastMode()
  )

  const [isRevealing, setIsRevealing] = useState(false)
  const [isBonusRound, setIsBonusRound] = useState(initialRoundState.mode === 'bonus')
  const [isTeachersRound, setIsTeachersRound] = useState(initialRoundState.mode === 'teachers')
  const [isGradeRound, setIsGradeRound] = useState(initialRoundState.mode === 'grade')
  const [gradeRoundGrade, setGradeRoundGrade] = useState<string>(
    initialRoundState.mode === 'grade' ? initialRoundState.grade ?? '' : ''
  )
  const [gradeRoundsPlayed, setGradeRoundsPlayed] = useState<string[]>(() => {
    // Restore which grade rounds were completed today
    const today = new Date().toISOString().slice(0, 10)
    const played = ['9', '10', '11', '12'].filter(
      (g) => localStorage.getItem('gradeRoundPlayedDate_' + g) === today
    )
    // Pre-mark player's own grade as done — they shouldn't replay it
    const ownGrade = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
    if (['9', '10', '11', '12'].includes(ownGrade) && !played.includes(ownGrade)) {
      const dLoaded = loadGameStateFromLocalStorage(true)
      if (dLoaded && (dLoaded.guesses.includes(dailySolution) || dLoaded.guesses.length >= MAX_CHALLENGES)) {
        played.push(ownGrade)
      }
    }
    return played
  })
  const currentMaxChallenges = isBonusRound ? MAX_BONUS_CHALLENGES : MAX_CHALLENGES
  const [activeSolution, setActiveSolution] = useState(initialRoundState.solution)
  const [isClearing, setIsClearing] = useState(false)
  const [bonusEnter, setBonusEnter] = useState<'grow' | 'shrink' | null>(null)
  const [isGridHidden, setIsGridHidden] = useState(false)

  const tracker = useGameTracker()
  const hasSubmittedRef = useRef(false)
  const alreadyCompleteOnLoadRef = useRef(false)
  const cloudHydrationAttemptedRef = useRef(false)
  const cloudSyncTimerRef = useRef<number | null>(null)
  const titleTapCountRef = useRef(0)
  const titleTapTimerRef = useRef<number | null>(null)
  const isSpaceHeldRef = useRef(false)
  const resetArmedRef = useRef(false)
  const releasedSpaceAfterArmedRef = useRef(false)

  const [isFirstToday, setIsFirstToday] = useState(() => {
    const stored = localStorage.getItem('firstToPlayDate')
    return stored === new Date().toISOString().split('T')[0]
  })

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
    restoredTeachersState && ['won', 'lost'].includes(restoredTeachersState.outcome)
      ? restoredTeachersState.guesses
      : []
  )
  const [gradeRoundGuessesMap, setGradeRoundGuessesMap] = useState<Record<string, string[]>>(
    () =>
      restoredGradeStates.reduce<Record<string, string[]>>((acc, state) => {
        if (state.grade && ['won', 'lost'].includes(state.outcome)) {
          acc[state.grade] = state.guesses
        }
        return acc
      }, {})
  )
  const [bothComplete, setBothComplete] = useState(() => {
    const hasCompletedDaily = !!restoredDailyState && ['won', 'lost'].includes(restoredDailyState.outcome)
    const hasCompletedExtra =
      (!!restoredBonusState && ['won', 'lost'].includes(restoredBonusState.outcome)) ||
      (!!restoredTeachersState && ['won', 'lost'].includes(restoredTeachersState.outcome)) ||
      restoredGradeStates.some((state) => ['won', 'lost'].includes(state.outcome))

    return hasCompletedDaily && hasCompletedExtra
  })
  const hasAnyCompletedBoard =
    dailyGuesses.length > 0 ||
    bonusGuesses.length > 0 ||
    teachersGuesses.length > 0 ||
    Object.keys(gradeRoundGuessesMap).length > 0
  const showCompletedLayout = bothComplete && hasAnyCompletedBoard

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

  const gradeStatKey = 'gradeNumber'
  const grade = localStorage.getItem(gradeStatKey)
  // grade is stored as JSON string e.g. '"0"' for teachers, '"9"' for Freshman, etc.
  const isTeacherPlayer = grade === '"0"'

  useEffect(() => {
    if (grade == null) {
      setTimeout(() => {
        setIsGradeModalOpen(true)
      }, WELCOME_GRADE_MODAL_MS)
    }
  })
  useEffect(() => {
    if (grade == 'undefined') {
      setTimeout(() => {
        setIsGradeModalOpen(true)
      }, WELCOME_GRADE_MODAL_MS)
    }
  })

  // Prompt existing users (have grade but no name) to enter name
  useEffect(() => {
    const hasGrade = grade != null && grade !== 'undefined' && grade !== 'null'
    const hasName = !!localStorage.getItem('playerName')
    const currentGrade = (grade || '').replace(/"/g, '')
    const isTeacher = currentGrade === '0'
    const hasPrefix = !!localStorage.getItem('playerPrefix')
    const hasInitial = !!localStorage.getItem('playerLastInitial')
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
    if (localStorage.getItem('showInfoAfterReload')) {
      localStorage.removeItem('showInfoAfterReload')
      localStorage.setItem('hasSeenInfo', 'true')
      setTimeout(() => {
        setIsInfoModalOpen(true)
      }, 500)
    }
  }, [])

  // On page load: hydrate localStorage from Sheet2 cloud state if newer/different.
  useEffect(() => {
    if (cloudHydrationAttemptedRef.current) return
    cloudHydrationAttemptedRef.current = true

    // After account claim restore, skip one hydration cycle to avoid stale
    // cloud state clobbering freshly restored local progress.
    if (localStorage.getItem('skipCloudHydrationOnce') === 'true') {
      localStorage.removeItem('skipCloudHydrationOnce')
      return
    }

    // During account-claim flow, leaderboard/API should drive restoration.
    // Skip cloud hydration so stale snapshots cannot override claim results.
    if (localStorage.getItem('pendingAccountCheck')) return

    const firstName = localStorage.getItem('playerName') || ''
    const lastInitial = localStorage.getItem('playerLastInitial') || ''
    const prefix = localStorage.getItem('playerPrefix') || ''
    const displayName = prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
    const gradeRaw = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
    if (!displayName || !gradeRaw) return

    fetchPlayerStateFromCloud(displayName, gradeRaw)
      .then((snapshot) => {
        if (!snapshot || !snapshot.state) return
        const lastApplied = localStorage.getItem('cloudStateAppliedAt') || ''
        if (lastApplied === snapshot.updatedAt) return

        let changed = false
        for (const [k, v] of Object.entries(snapshot.state)) {
          if (localStorage.getItem(k) !== v) {
            localStorage.setItem(k, v)
            changed = true
          }
        }

        if (changed) {
          localStorage.setItem('cloudStateAppliedAt', snapshot.updatedAt)
          window.location.reload()
        }
      })
      .catch(() => {
        // Keep local state if cloud read fails.
      })
  }, [])

  // On page load: restore all completed round guesses and bothComplete state
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
      setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({ ...prev, ...gradeMap }))
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
    const hasName = !!localStorage.getItem('playerName')
    if (isComplete && grade != null && grade !== 'undefined') {
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
    // @ts-ignore
    window.setGameDate = setGameDate
  }, [])

  useEffect(() => {
    DISCOURAGE_INAPP_BROWSERS &&
      isInAppBrowser() &&
      showErrorAlert(DISCOURAGE_INAPP_BROWSER_TEXT, {
        persist: false,
        durationMs: 7000,
      })
  }, [showErrorAlert])

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
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
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
  }, [guesses, isBonusRound, isTeachersRound, isGradeRound, gradeRoundGrade])

  // Debounced full-state sync to Sheet2 for seamless cross-device continuity.
  useEffect(() => {
    const firstName = localStorage.getItem('playerName') || ''
    const lastInitial = localStorage.getItem('playerLastInitial') || ''
    const prefix = localStorage.getItem('playerPrefix') || ''
    const displayName = prefix
      ? `${prefix} ${firstName}`
      : lastInitial
      ? `${firstName} ${lastInitial}`
      : firstName
    const gradeRaw = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
    if (!displayName || !gradeRaw) return

    if (cloudSyncTimerRef.current !== null) {
      window.clearTimeout(cloudSyncTimerRef.current)
    }

    cloudSyncTimerRef.current = window.setTimeout(() => {
      const baseKeys = [
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
        if (k.startsWith('gradeRoundGameState_') || k.startsWith('gradeRoundPlayedDate_')) {
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
    }, 800)

    return () => {
      if (cloudSyncTimerRef.current !== null) {
        window.clearTimeout(cloudSyncTimerRef.current)
      }
    }
  }, [
    guesses,
    stats,
    isGameWon,
    isGameLost,
    isBonusRound,
    isTeachersRound,
    isGradeRound,
    gradeRoundGrade,
    gradeRoundsPlayed,
    isDarkMode,
    isHighContrastMode,
  ])

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
  }, [isGameWon, isGameLost, showSuccessAlert])

  const onChar = (value: string) => {
    const canAdd =
      unicodeLength(`${currentGuess}${value}`) <= activeSolution.length &&
      guesses.length < currentMaxChallenges &&
      !isGameWon &&
      !isClearing &&
      !isGradeModalOpen

    if (canAdd) {
      const newGuess = `${currentGuess}${value}`
      setCurrentGuess(newGuess)
      tracker.recordKeystroke()
    }
  }

  const onDelete = () => {
    if (isClearing || isGradeModalOpen) {
      return
    }
    if (currentGuess.length === 0) {
      return
    }
    const newGuess = new GraphemeSplitter()
      .splitGraphemes(currentGuess)
      .slice(0, -1)
      .join('')
    setCurrentGuess(newGuess)
    tracker.recordDelete()
  }

  const submitGame = async (won: boolean, guessCount: number) => {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true

    // Check Google Sheets: if no one has played today yet, this player is first
    if (!isBonusRound) {
      try {
        const _d = solutionGameDate
        const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
        const existing = await fetchLeaderboard(today)
        const gradeRawCheck = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
        const gradeCleanCheck = ({ '8': '11', '27': '11', '7': '10', '28': '10' } as Record<string,string>)[gradeRawCheck] || gradeRawCheck
        const existingDailyCount = existing.filter(
          (e) =>
            String(e.grade) === gradeCleanCheck &&
            isTrueDailyEntry(e)
        ).length
        if (existingDailyCount === 0) {
          setIsFirstToday(true)
          localStorage.setItem('firstToPlayDate', today)
        }
      } catch { /* ignore — don't block submission */ }
    }

    const firstName = localStorage.getItem('playerName') || ''
    const lastInitial = localStorage.getItem('playerLastInitial') || ''
    const prefix = localStorage.getItem('playerPrefix') || ''
    let playerName = prefix ? `${prefix} ${firstName}` : lastInitial ? `${firstName} ${lastInitial}` : firstName
    if (!firstName) return // don't submit nameless games
    const gradeRaw = localStorage.getItem('gradeNumber') || ''
    const gradeCleanRaw = gradeRaw.replace(/"/g, '')
    const gradeNorm: Record<string, string> = { '8': '11', '27': '11', '7': '10', '28': '10' }
    let gradeClean = gradeNorm[gradeCleanRaw] || gradeCleanRaw
    // Legacy name/grade corrections (players who registered before certain features existed)
    const normalizePlayerKey = (name: string) =>
      String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const legacyNameFixes: Record<string, { name: string; grade: string }> = {
      'harvey m': { name: 'Mrs. Harvey', grade: '0' },
      'evan bassett': { name: 'Dr. Bassett', grade: '0' },
      'bassett evan': { name: 'Dr. Bassett', grade: '0' },
      'katie cruce': { name: 'Mrs. Cruce', grade: '0' },
      'amanda adams': { name: 'Mrs. Adams', grade: '0' },
      'Katie C': { name: 'Mrs. Cruce', grade: '0' },
      'katie C': { name: 'Mrs. Cruce', grade: '0' },
      'harvey M': { name: 'Mrs. Harvey', grade: '0' },
      'Harvey M': { name: 'Mrs. Harvey', grade: '0' },
    }
    const legacyFix = legacyNameFixes[normalizePlayerKey(playerName)]
    if (legacyFix) { playerName = legacyFix.name; gradeClean = legacyFix.grade }
    const trackingData = tracker.getSubmissionData()
    const d = solutionGameDate
    const puzzleDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dailyGameType: 'daily' | 'teachers' =
      gradeClean === '0' ? 'teachers' : 'daily'

    submitGameData({
      name: playerName,
      grade: gradeClean,
      date: puzzleDateStr,
      word: activeSolution,
      won,
      guessCount,
      gameType: isGradeRound ? `grade${gradeRoundGrade}` : isTeachersRound ? 'teachers' : isBonusRound ? 'bonus' : dailyGameType,
      ...trackingData,
    })
  }

  const onEnter = () => {
    if (isGameWon || isGameLost || isClearing || isGradeModalOpen) {
      return
    }

    if (!(unicodeLength(currentGuess) === activeSolution.length)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(NOT_ENOUGH_LETTERS_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    if (!isWordInWordList(currentGuess)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(WORD_NOT_FOUND_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
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
        if (isLatestGame && !isBonusRound && !isTeachersRound && !isGradeRound) {
          const newStats = addStatsForCompletedGame(stats, guesses.length)
          setStats(newStats)
          setDailyGuesses(newGuesses)
          // Personal best: first win ever, or beat lowest guess count on record
          const guessCount = guesses.length + 1
          const prevBestIdx = stats.winDistribution.findIndex((c: number) => c > 0)
          const isFirstWin = prevBestIdx === -1
          const beatsBest = !isFirstWin && guessCount < prevBestIdx + 1
          if (isFirstWin || beatsBest) setIsPersonalBest(true)
          // Pre-mark own grade as done so it can't be replayed
          const ownGrade = (grade || '').replace(/"/g, '')
          if (['9', '10', '11', '12'].includes(ownGrade) && !gradeRoundsPlayed.includes(ownGrade)) {
            setGradeRoundsPlayed((prev: string[]) => [...prev, ownGrade])
          }
        }
        if (isBonusRound) {
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isTeachersRound) {
          setTeachersPlayedToday()
          setTeachersGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isGradeRound && gradeRoundGrade) {
          setGradeRoundPlayedToday(gradeRoundGrade)
          setGradeRoundsPlayed((prev: string[]) => [...prev, gradeRoundGrade])
          setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({ ...prev, [gradeRoundGrade]: newGuesses }))
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(true, newGuesses.length)
        return setIsGameWon(true)
      }

      if (guesses.length === currentMaxChallenges - 1) {
        if (isLatestGame && !isBonusRound && !isTeachersRound && !isGradeRound) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
          setDailyGuesses(newGuesses)
          // Pre-mark own grade as done so it can't be replayed
          const ownGrade = (grade || '').replace(/"/g, '')
          if (['9', '10', '11', '12'].includes(ownGrade) && !gradeRoundsPlayed.includes(ownGrade)) {
            setGradeRoundsPlayed((prev: string[]) => [...prev, ownGrade])
          }
        }
        if (isBonusRound) {
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isTeachersRound) {
          setTeachersPlayedToday()
          setTeachersGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        if (isGradeRound && gradeRoundGrade) {
          setGradeRoundPlayedToday(gradeRoundGrade)
          setGradeRoundsPlayed((prev: string[]) => [...prev, gradeRoundGrade])
          setGradeRoundGuessesMap((prev: Record<string, string[]>) => ({ ...prev, [gradeRoundGrade]: newGuesses }))
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(false, newGuesses.length)
        setIsGameLost(true)
        if (!isBonusRound && !isTeachersRound && !isGradeRound) {
          showErrorAlert(CORRECT_WORD_MESSAGE(activeSolution), {
            persist: true,
            delayMs: REVEAL_TIME_MS * activeSolution.length + 1,
          })
        }
      }
    }
  }

  function jack() {
    setIsGradeModalOpen(false)
    if (!localStorage.getItem('hasSeenInfo')) {
      localStorage.setItem('hasSeenInfo', 'true')
      setIsInfoModalOpen(true)
    }
  }

  const handleBonusRound = () => {
    // Close the stats modal
    setIsStatsModalOpen(false)

    // Save current daily guesses for side-by-side
    setDailyGuesses([...guesses])

    // Start the fall-off-screen clearing animation
    setIsClearing(true)

    // Each row falls 110ms after the previous; last row needs 700ms to finish falling
    const totalRows = MAX_CHALLENGES
    const totalClearTime = totalRows * 110 + 700 + 150 // rows * stagger + fall duration + buffer

    setTimeout(() => {
      setIsClearing(false)
      setIsGridHidden(true)

      // Set up the bonus round
      setActiveSolution(bonusSolution)
      setIsBonusRound(true)
      setIsTeachersRound(false)
      setIsGradeRound(false)
      setGuesses([])
      setCurrentGuess('')
      setIsGameWon(false)
      setIsGameLost(false)
      setBothComplete(false)
      tracker.reset()
      tracker.startGame()
      hasSubmittedRef.current = false

      // Wait 1 second with nothing visible, then start the fill animation
      setTimeout(() => {
        setIsGridHidden(false)
        setBonusEnter('grow')

        // Show toast
        showSuccessAlert('Bonus Round!', {
          delayMs: 100,
        })

        // Clear the enter animation after it finishes
        const totalEnterTime = MAX_CHALLENGES * bonusSolution.length * 60 + 500
        setTimeout(() => {
          setBonusEnter(null)
        }, totalEnterTime)
      }, 1000)
    }, totalClearTime)
  }

  const handleTeachersRound = () => {
    setIsStatsModalOpen(false)
    setDailyGuesses([...guesses])

    setIsClearing(true)
    const totalRows = MAX_CHALLENGES
    const totalClearTime = totalRows * 110 + 700 + 150

    setTimeout(() => {
      setIsClearing(false)
      setIsGridHidden(true)

      setActiveSolution(teachersSolution)
      setIsTeachersRound(true)
      setIsBonusRound(false)
      setIsGradeRound(false)
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

        showSuccessAlert('Teachers Round!', {
          delayMs: 100,
        })

        const totalEnterTime = MAX_CHALLENGES * teachersSolution.length * 60 + 500
        setTimeout(() => {
          setBonusEnter(null)
        }, totalEnterTime)
      }, 1000)
    }, totalClearTime)
  }

  const handleGradeRound = (grade: string) => {
    const gradeSolution = getGradeRoundSolution(grade)
    if (!gradeSolution) return
    setIsStatsModalOpen(false)
    setDailyGuesses([...guesses])

    setIsClearing(true)
    const totalRows = MAX_CHALLENGES
    const totalClearTime = totalRows * 110 + 700 + 150

    setTimeout(() => {
      setIsClearing(false)
      setIsGridHidden(true)

      setActiveSolution(gradeSolution)
      setIsGradeRound(true)
      setGradeRoundGrade(grade)
      setIsBonusRound(false)
      setIsTeachersRound(false)
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

        showSuccessAlert(`${GRADE_LABELS[grade] ?? 'Grade'} Round!`, {
          delayMs: 100,
        })

        const totalEnterTime = MAX_CHALLENGES * gradeSolution.length * 60 + 500
        setTimeout(() => {
          setBonusEnter(null)
        }, totalEnterTime)
      }, 1000)
    }, totalClearTime)
  }

  return (
    <Div100vh>
      <div className="flex h-full flex-col">
        <Navbar
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          setIsLeaderboardModalOpen={setIsLeaderboardModalOpen}
          onTitleTap={handleTitleTap}
        />

        {!isLatestGame && (
          <div className="flex items-center justify-center">
            <ClockIcon className="h-6 w-6 stroke-gray-600 dark:stroke-gray-300" />
            <p className="text-base text-gray-600 dark:text-gray-300">
              {format(gameDate, 'd MMMM yyyy', { locale: DATE_LOCALE })}
            </p>
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
                {(Object.entries(gradeRoundGuessesMap) as [string, string[]][]).map(([g, gGuesses]) => (
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
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
          />
          <StatsModal
            isOpen={isStatsModalOpen}
            handleClose={() => setIsStatsModalOpen(false)}
            solution={activeSolution}
            guesses={guesses}
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
            numberOfGuessesMade={guesses.length}
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
          />
          <DatePickerModal
            isOpen={isDatePickerModalOpen}
            initialDate={solutionGameDate}
            handleSelectDate={(d) => {
              setIsDatePickerModalOpen(false)
              setGameDate(d)
            }}
            handleClose={() => setIsDatePickerModalOpen(false)}
          />
          <LeaderboardModal
            isOpen={isLeaderboardModalOpen}
            handleClose={() => setIsLeaderboardModalOpen(false)}
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
            handleClose={() => jack()}
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
