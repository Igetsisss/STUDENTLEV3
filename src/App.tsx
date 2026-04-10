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
import { MvpModal } from './components/modals/MvpModal'
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
  HARD_MODE_ALERT_MESSAGE,
  NOT_ENOUGH_LETTERS_MESSAGE,
  SHARE_FAILURE_TEXT,
  WIN_MESSAGES,
  WORD_NOT_FOUND_MESSAGE,
} from './constants/strings'
import { useAlert } from './context/AlertContext'
import { isInAppBrowser } from './lib/browser'
import {
  getStoredIsHighContrastMode,
  loadGameStateFromLocalStorage,
  loadBonusGameStateFromLocalStorage,
  saveBonusGameStateToLocalStorage,
  saveGameStateToLocalStorage,
  setStoredIsHighContrastMode,
} from './lib/localStorage'
import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from './lib/localStorage'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  findFirstUnusedReveal,
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
import { submitGameData, fetchLeaderboard, computeMvp } from './lib/api'
import { useGameTracker } from './hooks/useGameTracker'

function App() {
  const isLatestGame = getIsLatestGame()
  const gameDate = getGameDate()
  const bonusSolution = getBonusSolution()
  const hasLoadedRef = useRef(false)

  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  const { showError: showErrorAlert, showSuccess: showSuccessAlert } =
    useAlert()
  const [currentGuess, setCurrentGuess] = useState('')
  const [isGameWon, setIsGameWon] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [isMvpModalOpen, setIsMvpModalOpen] = useState(false)
  const [isMvp, setIsMvp] = useState(false)
  const [mvpData, setMvpData] = useState<{ name: string; winRate: number; avgGuesses: number; totalGames: number } | null>(null)
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameLost, setIsGameLost] = useState(false)
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
  const [isBonusRound, setIsBonusRound] = useState(false)
  const currentMaxChallenges = isBonusRound ? MAX_BONUS_CHALLENGES : MAX_CHALLENGES
  const [activeSolution, setActiveSolution] = useState(dailySolution)
  const [isClearing, setIsClearing] = useState(false)
  const [bonusEnter, setBonusEnter] = useState<'grow' | 'shrink' | null>(null)
  const [isGridHidden, setIsGridHidden] = useState(false)

  const tracker = useGameTracker()
  const hasSubmittedRef = useRef(false)
  const alreadyCompleteOnLoadRef = useRef(false)

  const [isFirstToday, setIsFirstToday] = useState(() => {
    const stored = localStorage.getItem('firstToPlayDate')
    return stored === new Date().toISOString().split('T')[0]
  })

  // Store completed daily game for side-by-side display
  const [dailyGuesses, setDailyGuesses] = useState<string[]>([])
  const [bonusGuesses, setBonusGuesses] = useState<string[]>([])
  const [bothComplete, setBothComplete] = useState(false)

  const [guesses, setGuesses] = useState<string[]>(() => {
    // Check if there's a bonus round in progress
    const bonusLoaded = loadBonusGameStateFromLocalStorage()
    if (bonusLoaded && bonusLoaded.solution === bonusSolution) {
      // Bonus round was in progress — restore it
      const dailyLoaded = loadGameStateFromLocalStorage(isLatestGame)
      if (dailyLoaded) {
        setDailyGuesses(dailyLoaded.guesses)
      }

      setIsBonusRound(true)
      setActiveSolution(bonusSolution)

      const bonusWon = bonusLoaded.guesses.includes(bonusSolution)
      const bonusLost =
        bonusLoaded.guesses.length === MAX_CHALLENGES && !bonusWon

      if (bonusWon) {
        setIsGameWon(true)
        setBonusGuesses(bonusLoaded.guesses)
        // Check if both are done for side-by-side
        if (dailyLoaded) {
          const dailyDone =
            dailyLoaded.guesses.includes(dailySolution) ||
            dailyLoaded.guesses.length === MAX_CHALLENGES
          if (dailyDone) setBothComplete(true)
        }
      }
      if (bonusLost) {
        setIsGameLost(true)
        setBonusGuesses(bonusLoaded.guesses)
        if (dailyLoaded) {
          const dailyDone =
            dailyLoaded.guesses.includes(dailySolution) ||
            dailyLoaded.guesses.length === MAX_CHALLENGES
          if (dailyDone) setBothComplete(true)
        }
      }
      return bonusLoaded.guesses
    }

    // Normal daily game load
    const loaded = loadGameStateFromLocalStorage(isLatestGame)
    if (loaded?.solution !== dailySolution) {
      return []
    }
    const gameWasWon = loaded.guesses.includes(dailySolution)
    if (gameWasWon) {
      setIsGameWon(true)
      setDailyGuesses(loaded.guesses)
    }
    if (loaded.guesses.length === MAX_CHALLENGES && !gameWasWon) {
      setIsGameLost(true)
      setDailyGuesses(loaded.guesses)
    }
    return loaded.guesses
  })

  const [stats, setStats] = useState(() => loadStats())

  const [isHardMode, setIsHardMode] = useState(
    localStorage.getItem('gameMode')
      ? localStorage.getItem('gameMode') === 'hard'
      : false
  )

  const gradeStatKey = 'gradeNumber'
  const grade = localStorage.getItem(gradeStatKey)

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
    if (hasGrade && !hasName) {
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

  // On page load: check all-time MVP and see if current player has earned it
  useEffect(() => {
    const firstName = localStorage.getItem('playerName') || ''
    const lastInitial = localStorage.getItem('playerLastInitial') || ''
    if (!firstName) return // no name yet, skip
    const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName

    fetchLeaderboard()
      .then((data) => {
        const mvpEntry = computeMvp(data)
        if (mvpEntry && mvpEntry.name === displayName) {
          setIsMvp(true)
          setMvpData({
            name: mvpEntry.name,
            winRate: mvpEntry.winRate,
            avgGuesses: mvpEntry.avgGuesses,
            totalGames: mvpEntry.totalGames,
          })
          const lastAwarded = localStorage.getItem('mvpAwardedTo')
          if (lastAwarded !== displayName) {
            localStorage.setItem('mvpAwardedTo', displayName)
            setIsMvpModalOpen(true)
          }
        } else {
          setIsMvp(false)
        }
      })
      .catch(() => { /* silently ignore MVP check errors */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleHardMode = (isHard: boolean) => {
    if (guesses.length === 0 || localStorage.getItem('gameMode') === 'hard') {
      setIsHardMode(isHard)
      localStorage.setItem('gameMode', isHard ? 'hard' : 'normal')
    } else {
      showErrorAlert(HARD_MODE_ALERT_MESSAGE)
    }
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
    if (isBonusRound) {
      saveBonusGameStateToLocalStorage({
        guesses,
        solution: bonusSolution,
      })
    } else {
      saveGameStateToLocalStorage(getIsLatestGame(), {
        guesses,
        solution: dailySolution,
      })
    }
  }, [guesses, isBonusRound])

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
        if (existing.filter((e) => e.gameType === 'daily').length === 0) {
          setIsFirstToday(true)
          localStorage.setItem('firstToPlayDate', today)
        }
      } catch { /* ignore — don't block submission */ }
    }

    const firstName = localStorage.getItem('playerName') || ''
    const lastInitial = localStorage.getItem('playerLastInitial') || ''
    const playerName = lastInitial ? `${firstName} ${lastInitial}` : firstName
    if (!firstName) return // don't submit nameless games
    const gradeRaw = localStorage.getItem('gradeNumber') || ''
    const gradeClean = gradeRaw.replace(/"/g, '')
    const trackingData = tracker.getSubmissionData()
    const d = solutionGameDate
    const puzzleDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    submitGameData({
      name: playerName,
      grade: gradeClean,
      date: puzzleDateStr,
      word: activeSolution,
      won,
      guessCount,
      gameType: isBonusRound ? 'bonus' : 'daily',
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

    // enforce hard mode - all guesses must contain all previously revealed letters
    if (isHardMode) {
      const firstMissingReveal = findFirstUnusedReveal(currentGuess, guesses)
      if (firstMissingReveal) {
        setCurrentRowClass('jiggle')
        return showErrorAlert(firstMissingReveal, {
          onClose: clearCurrentRowClass,
        })
      }
    }

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
        if (isLatestGame && !isBonusRound) {
          setStats(addStatsForCompletedGame(stats, guesses.length))
          setDailyGuesses(newGuesses)
        }
        if (isBonusRound) {
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          // Both complete if daily was also done
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(true, newGuesses.length)
        return setIsGameWon(true)
      }

      if (guesses.length === currentMaxChallenges - 1) {
        if (isLatestGame && !isBonusRound) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
          setDailyGuesses(newGuesses)
        }
        if (isBonusRound) {
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
        submitGame(false, newGuesses.length)
        setIsGameLost(true)
        showErrorAlert(CORRECT_WORD_MESSAGE(activeSolution), {
          persist: true,
          delayMs: REVEAL_TIME_MS * activeSolution.length + 1,
        })
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

  return (
    <Div100vh>
      <div className="flex h-full flex-col">
        <Navbar
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsGradeModalOpen={setIsGradeModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          setIsLeaderboardModalOpen={setIsLeaderboardModalOpen}
          isMvp={isMvp}
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
          {bothComplete ? (
            <div className="flex grow flex-col justify-center pb-6 short:pb-2">
              <div className="flex justify-center gap-4">
                <CompletedGrid
                  solution={dailySolution}
                  guesses={dailyGuesses}
                  label="Daily"
                />
                <CompletedGrid
                  solution={bonusSolution}
                  guesses={bonusGuesses}
                  label="Bonus"
                />
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
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            solution={activeSolution}
            guesses={guesses}
            isRevealing={isRevealing}
          />
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
            isHardMode={isHardMode}
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
            bonusSolution={getBonusSolution()}
            bonusGuesses={bonusGuesses}
            onOpenLeaderboard={() => {
              setIsStatsModalOpen(false)
              setIsLeaderboardModalOpen(true)
            }}
            isFirstToday={isFirstToday}
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
            isHardMode={isHardMode}
            handleHardMode={handleHardMode}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={handleHighContrastMode}
          />
          <GradeModal isOpen={isGradeModalOpen} handleClose={() => jack()} />
          {mvpData && (
            <MvpModal
              isOpen={isMvpModalOpen}
              handleClose={() => setIsMvpModalOpen(false)}
              playerName={mvpData.name}
              winRate={mvpData.winRate}
              avgGuesses={mvpData.avgGuesses}
              totalGames={mvpData.totalGames}
            />
          )}
          <AlertContainer />
        </div>
      </div>
    </Div100vh>
  )
}

export default App
