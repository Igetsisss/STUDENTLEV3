import './gradestyle.css'

import { useState } from 'react'

import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../../lib/localStorage'
import { Cell } from '../grid/Cell'
import { BaseModal } from './BaseModal2'

const gradeStatKey = 'gradeNumber'

type Step = 'grade' | 'name' | 'initial'

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

  const handleGradeNext = () => {
    if (!selectedGrade) return
    localStorage.setItem(gradeStatKey, JSON.stringify(selectedGrade))
    setStep('name')
  }

  const handleNameNext = () => {
    if (!playerName.trim()) return
    localStorage.setItem('playerName', playerName.trim())
    setStep('initial')
  }

  const handleInitialDone = () => {
    if (lastInitial.trim()) {
      localStorage.setItem('playerLastInitial', lastInitial.trim().toUpperCase())
    }
    if (!localStorage.getItem('hasSeenInfo')) {
      localStorage.setItem('showInfoAfterReload', 'true')
    }
    handleClose()
    window.location.reload()
  }

  return (
    <BaseModal
      title={
        step === 'grade'
          ? 'What Grade are you in?'
          : step === 'name'
          ? 'What is your first name?'
          : 'Last name initial?'
      }
      isOpen={isOpen}
      handleClose={handleClose}
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
              placeholder="First name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
            />
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
            Your last initial helps tell apart players with the same first name on the leaderboard (e.g. "Jack S"). We never store your full last name.
          </p>
          <div className="enterbutton" onClick={handleInitialDone}>
            <button>Done</button>
          </div>
        </>
      )}
    </BaseModal>
  )
}

const grade = localStorage.getItem(gradeStatKey)
