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

type Props = {
  isOpen: boolean
  handleClose: () => void
}

export const GradeModal = ({ isOpen, handleClose }: Props) => {
  const [selectedGrade, setSelectedGrade] = useState<string>()
  const [playerName, setPlayerName] = useState(
    localStorage.getItem('playerName') || ''
  )

  const handleGradeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGrade(event.target.value)
  }

  const handleEnterButtonClick = () => {
    console.log(`Selected grade: ${selectedGrade}`)
    console.log(selectedGrade)
    localStorage.setItem(gradeStatKey, JSON.stringify(selectedGrade))
    if (playerName.trim()) {
      localStorage.setItem('playerName', playerName.trim())
    }
    const grade = localStorage.getItem(gradeStatKey)
    console.log('THERE GRADE IS ' + grade)
    if (!localStorage.getItem('hasSeenInfo')) {
      localStorage.setItem('showInfoAfterReload', 'true')
    }
    handleClose()
    window.location.reload()
    console.log('reloaded')
  }

  const hasExistingName = !!localStorage.getItem('playerName')

  return (
    <BaseModal
      title="What Grade are you in?"
      isOpen={isOpen}
      handleClose={handleClose}
    >
      <br></br>
      {!hasExistingName && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      )}
      <form>
        <div className="select">
          <select
            name="format"
            id="format"
            value={selectedGrade}
            onChange={handleGradeChange}
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
      <br></br>
      <div className="enterbutton" onClick={handleEnterButtonClick}>
        <button disabled={!selectedGrade || (!hasExistingName && !playerName.trim())}>Enter</button>
      </div>
    </BaseModal>
  )
}

const grade = localStorage.getItem(gradeStatKey)
