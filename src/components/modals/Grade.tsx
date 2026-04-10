import './gradestyle.css'

import { useState, useEffect } from 'react'

import {
  GradeNumber,
  GameStats,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
  saveGameStateToLocalStorage,
  saveStatsToLocalStorage,
  loadStatsFromLocalStorage,
} from '../../lib/localStorage'
import { setBonusPlayedToday } from '../../utils/bonusRound'
import { setTeachersPlayedToday } from '../../utils/teachersRound'
import { fetchLeaderboard, submitHistoricalStats, LeaderboardEntry } from '../../lib/api'
import { getSolution, getGameDate } from '../../lib/words'
import { Cell } from '../grid/Cell'
import { BaseModal } from './BaseModal2'

const gradeStatKey = 'gradeNumber'

const BLOCKED_WORDS = [
  'nigger', 'nigga', 'n1gger', 'n1gga', 'faggot', 'fag', 'chink', 'spic',
  'kike', 'wetback', 'beaner', 'gook', 'cunt', 'retard', 'tranny',
]

const containsProfanity = (text: string): boolean => {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '')
  return BLOCKED_WORDS.some((w) => normalized.includes(w))
}

const capitalizeName = (name: string): string =>
  name.trim().replace(/\b\w/g, (c) => c.toUpperCase())

type Step = 'grade' | 'name' | 'initial' | 'checking' | 'confirm'

type ExistingAccount = {
  displayName: string
  totalGames: number
  wins: number
  grade: string
  avgGuesses: number
  todayResult: 'won' | 'lost' | null
  todayGuessCount: number | null
  inProgressGuesses: string[]
  reconstructedStats: GameStats
  todayBonusPlayed: boolean
  todayTeachersPlayed: boolean
}

type Props = {
  isOpen: boolean
  handleClose: () => void
}

export const GradeModal = ({ isOpen, handleClose }: Props) => {
  const hasExistingGrade = !!localStorage.getItem(gradeStatKey)
  const hasExistingName = !!localStorage.getItem('playerName')

  // If they already have a grade + name, go straight to nothing (shouldn't open)
  // If they have grade but no name, skip the grade step
  const initialStep: Step = hasExistingGrade ? 'name' : 'grade'

  const [step, setStep] = useState<Step>(initialStep)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [playerName, setPlayerName] = useState('')
  const [lastInitial, setLastInitial] = useState('')

  // Derive whether the current player is a teacher at each step
  const currentGrade = selectedGrade || (localStorage.getItem(gradeStatKey) || '').replace(/"/g, '')
  const isTeacherFlow = currentGrade === '0'
  const [existingAccount, setExistingAccount] = useState<ExistingAccount | null>(null)
  const [nameError, setNameError] = useState('')
  const [forceOpen, setForceOpen] = useState(false)

  const handleGradeNext = () => {
    if (!selectedGrade) return
    localStorage.setItem(gradeStatKey, JSON.stringify(selectedGrade))
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
    localStorage.setItem('playerName', capitalized)
    setNameError('')
    setStep('initial')
  }

  const handleInitialDone = () => {
    const displayName = lastInitial.trim()
      ? `${capitalizeName(playerName)} ${lastInitial.trim().toUpperCase()}`
      : capitalizeName(playerName)

    // Save everything to localStorage right now so the game can start immediately
    const parts = displayName.split(' ')
    const initial = parts.length > 1 ? parts[parts.length - 1] : ''
    const name = initial ? parts.slice(0, -1).join(' ') : displayName

    localStorage.setItem('playerName', name)
    if (initial) localStorage.setItem('playerLastInitial', initial)
    if (!localStorage.getItem('hasSeenInfo')) {
      localStorage.setItem('showInfoAfterReload', 'true')
    }

    if (!localStorage.getItem('historicalStatsSubmitted')) {
      const stats = loadStatsFromLocalStorage()
      const gradeRaw = (localStorage.getItem('gradeNumber') || '').replace(/"/g, '')
      if (stats && stats.totalGames > 0 && gradeRaw) {
        localStorage.setItem('historicalStatsSubmitted', 'true')
        submitHistoricalStats(displayName, gradeRaw, stats.winDistribution, stats.gamesFailed)
      }
    }

    // Queue a background duplicate-account check after reload
    localStorage.setItem('pendingAccountCheck', displayName)

    handleClose()
    window.location.reload()
  }

  // Background account check — runs once on mount if pendingAccountCheck is set
  useEffect(() => {
    const pending = localStorage.getItem('pendingAccountCheck')
    if (!pending) return

    fetchLeaderboard().then((data: LeaderboardEntry[]) => {
      const matches = data.filter(
        (e) => e.name.toLowerCase() === pending.toLowerCase()
      )
      if (matches.length === 0) {
        localStorage.removeItem('pendingAccountCheck')
        return
      }
      // Build a quick stats summary for the confirmation screen
      const wins = matches.filter((e) => e.won)
      const gradeNum = matches[0].grade
      const gradeLabel: Record<string, string> = {
        '0': 'Teachers',
        '9': 'Freshman (9th)',
        '10': 'Sophomore (10th)',
        '11': 'Junior (11th)',
        '12': 'Senior (12th)',
      }
      const avgGuesses =
        wins.length > 0
          ? wins.reduce((s, e) => s + e.guessCount, 0) / wins.length
          : 0
      const today = new Date().toISOString().split('T')[0]
      const todayEntry = matches.find(
        (e) => e.gameType === 'daily' && String(e.date).startsWith(today)
      )
      const dailyMatches = matches.filter(
        (e) => e.gameType === 'daily' && !String(e.date).startsWith('1970')
      )
      const dailyWins = dailyMatches.filter((e) => e.won)
      const dailyLosses = dailyMatches.filter((e) => !e.won)
      const winDist = Array(6).fill(0)
      dailyWins.forEach((e) => {
        const idx = Math.min(e.guessCount - 1, 5)
        if (idx >= 0) winDist[idx]++
      })
      const totalDailyGames = dailyWins.length + dailyLosses.length
      const successRate =
        totalDailyGames > 0
          ? Math.round((dailyWins.length / totalDailyGames) * 100)
          : 0
      // Streak = total games played (no consecutive-day requirement)
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

      setExistingAccount({
        displayName: matches[0].name,
        totalGames: matches.length,
        wins: wins.length,
        grade: gradeLabel[String(gradeNum)] || `Grade ${gradeNum}`,
        avgGuesses,
        todayResult: todayEntry ? (todayEntry.won ? 'won' : 'lost') : null,
        todayGuessCount: todayEntry ? todayEntry.guessCount : null,
        inProgressGuesses: [],
        reconstructedStats,
        todayBonusPlayed: !!todayBonusEntry,
        todayTeachersPlayed: !!todayTeachersEntry,
      })
      setStep('confirm')
      setForceOpen(true)
    }).catch(() => {
      localStorage.removeItem('pendingAccountCheck')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClaimAccount = () => {
    // "Yes, that's me" — use the exact name from the sheet
    const account = existingAccount!
    const name = account.displayName
    const parts = name.split(' ')
    const initial = parts.length > 1 ? parts[parts.length - 1] : ''
    const firstName = initial ? parts.slice(0, -1).join(' ') : name

    localStorage.setItem('playerName', firstName)
    if (initial) localStorage.setItem('playerLastInitial', initial)
    if (!localStorage.getItem('hasSeenInfo')) {
      localStorage.setItem('showInfoAfterReload', 'true')
    }

    localStorage.removeItem('pendingAccountCheck')

    // Write reconstructed stats to localStorage so the stats modal shows real data
    saveStatsToLocalStorage(account.reconstructedStats)
    localStorage.setItem('historicalStatsSubmitted', 'true') // no need to re-backfill

    // Restore their game state so App.tsx treats this reload identically to local play.
    // Priority: use actual keystroke data; fall back to constructing a minimal complete state.
    try {
      const todaySolution = getSolution(getGameDate()).solution
      let guessesToSave: string[] = account.inProgressGuesses

      if (guessesToSave.length === 0 && account.todayResult === 'won') {
        // No keystroke data but we know they won — write solution as the only guess.
        // App.tsx sees guesses.includes(solution) → isGameWon = true.
        guessesToSave = [todaySolution]
      } else if (guessesToSave.length === 0 && account.todayResult === 'lost') {
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
    if (account.todayBonusPlayed) setBonusPlayedToday()
    if (account.todayTeachersPlayed) setTeachersPlayedToday()

    handleClose()
    window.location.reload()
  }

  const handleMakeNewAccount = () => {
    // "No, make a new one" — go back to the name step
    localStorage.removeItem('pendingAccountCheck')
    setPlayerName('')
    setLastInitial('')
    setExistingAccount(null)
    setStep('name')
  }

  return (
    <BaseModal
      title={
        step === 'grade'
          ? 'What Grade are you in?'
          : step === 'name'
          ? (isTeacherFlow ? 'What is your last name?' : 'What is your first name?')
          : step === 'initial'
          ? (isTeacherFlow ? 'First name initial?' : 'Last name initial?')
          : 'Is this you?'
      }
      isOpen={isOpen || forceOpen}
      handleClose={step === 'confirm' ? () => {} : handleClose}
    >
      <br />

      {step === 'grade' && (
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
                <option value="0">Teachers</option>
              </select>
            </div>
          </form>
          <br />
          <div className="enterbutton" onClick={handleGradeNext}>
            <button disabled={!selectedGrade}>Next</button>
          </div>
        </>
      )}

      {step === 'name' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder={isTeacherFlow ? 'Last name' : 'First name'}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value)
                if (nameError) setNameError('')
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
              <p className="mt-2 text-center text-sm text-red-500">{nameError}</p>
            )}
          </div>
          <br />
          <div className="enterbutton" onClick={handleNameNext}>
            <button disabled={!playerName.trim()}>Next</button>
          </div>
        </>
      )}

      {step === 'initial' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="e.g. S"
              value={lastInitial}
              onChange={(e) =>
                setLastInitial(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1))
              }
              maxLength={1}
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-bold uppercase tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
            {isTeacherFlow
              ? 'Your first initial helps tell apart teachers with the same last name on the leaderboard (e.g. “Smith J”). We only store your last name + initial.'
              : 'Your last initial helps tell apart players with the same first name on the leaderboard (e.g. “Jack S”). We never store your full last name.'}
          </p>
          <div className="enterbutton" onClick={handleInitialDone}>
            <button>Done</button>
          </div>
        </>
      )}

      {step === 'confirm' && existingAccount && (
        <>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            We found an account with that name. Is this you?
          </p>

          {existingAccount.todayResult === null && existingAccount.inProgressGuesses.length > 0 && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300">
              🔄 You're on guess {existingAccount.inProgressGuesses.length + 1} of 6 today — logging in will pick up where you left off!
            </div>
          )}

          {existingAccount.todayResult !== null && (
            <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
              existingAccount.todayResult === 'won'
                ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300'
                : 'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-300'
            }`}>
              {existingAccount.todayResult === 'won'
                ? `✅ You already won today's game in ${existingAccount.todayGuessCount ?? '?'} guess${existingAccount.todayGuessCount === 1 ? '' : 'es'}!`
                : '❌ You already played today — better luck tomorrow!'}
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
                  {Math.round((existingAccount.wins / existingAccount.totalGames) * 100)}%
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
              No, this isn't me — make a new account
            </button>
          </div>
        </>
      )}
    </BaseModal>
  )
}

const grade = localStorage.getItem(gradeStatKey)
