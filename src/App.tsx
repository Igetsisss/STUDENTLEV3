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
import { MigrateStatsModal } from './components/modals/MigrateStatsModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { StatsModal } from './components/modals/StatsModal'
import { Navbar } from './components/navbar/Navbar'
import {
  DATE_LOCALE,
  DISCOURAGE_INAPP_BROWSERS,
  LONG_ALERT_TIME_MS,
  MAX_CHALLENGES,
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
  const [isMigrateStatsModalOpen, setIsMigrateStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
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
  const [activeSolution, setActiveSolution] = useState(dailySolution)
  const [isClearing, setIsClearing] = useState(false)
  const [bonusEnter, setBonusEnter] = useState<'grow' | 'shrink' | null>(null)

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

  // On page load: if game is already complete, show stats after 1 second
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const isComplete = isGameWon || isGameLost
    if (isComplete && grade != null && grade !== 'undefined') {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, 1000)
    }
  }, [])

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
    if (isGameWon) {
      const winMessage =
        WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
      const delayMs = REVEAL_TIME_MS * activeSolution.length

      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => setIsStatsModalOpen(true),
      })
    }

    if (isGameLost) {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, (activeSolution.length + 1) * REVEAL_TIME_MS)
    }
  }, [isGameWon, isGameLost, showSuccessAlert])

  const onChar = (value: string) => {
    if (
      unicodeLength(`${currentGuess}${value}`) <= activeSolution.length &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon &&
      !isClearing
    ) {
      setCurrentGuess(`${currentGuess}${value}`)
    }
  }

  const onDelete = () => {
    if (isClearing) return
    setCurrentGuess(
      new GraphemeSplitter().splitGraphemes(currentGuess).slice(0, -1).join('')
    )
  }

  const onEnter = () => {
    if (isGameWon || isGameLost || isClearing) {
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
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
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
        return setIsGameWon(true)
      }

      if (guesses.length === MAX_CHALLENGES - 1) {
        if (isLatestGame && !isBonusRound) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
          setDailyGuesses(newGuesses)
        }
        if (isBonusRound) {
          setBonusPlayedToday()
          setBonusGuesses(newGuesses)
          if (dailyGuesses.length > 0) setBothComplete(true)
        }
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
    setIsInfoModalOpen(true)
  }

  const handleBonusRound = () => {
    // Close the stats modal
    setIsStatsModalOpen(false)

    // Save current daily guesses for side-by-side
    setDailyGuesses([...guesses])

    // Start the reverse domino clearing animation (bottom-right to top-left)
    setIsClearing(true)

    // Calculate total clearing time: all rows (MAX_CHALLENGES), each cell 60ms stagger
    const numCols = activeSolution.length
    const totalCells = MAX_CHALLENGES * numCols
    const totalClearTime = totalCells * 60 + 500

    setTimeout(() => {
      setIsClearing(false)

      // Set up the bonus round
      setActiveSolution(bonusSolution)
      setIsBonusRound(true)
      setGuesses([])
      setCurrentGuess('')
      setIsGameWon(false)
      setIsGameLost(false)
      setBothComplete(false)

      // Wait 600ms pause then start the fill animation (bottom-right to top-left)
      setTimeout(() => {
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
      }, 600)
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
          <GradeModal isOpen={isGradeModalOpen} handleClose={() => jack()} />
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
            handleMigrateStatsButton={() => {
              setIsStatsModalOpen(false)
              setIsMigrateStatsModalOpen(true)
            }}
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
          <MigrateStatsModal
            isOpen={isMigrateStatsModalOpen}
            handleClose={() => setIsMigrateStatsModalOpen(false)}
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
          <AlertContainer />
        </div>
      </div>
    </Div100vh>
  )
}

export default App
