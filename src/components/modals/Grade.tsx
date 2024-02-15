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

  const handleGradeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGrade(event.target.value)
  }

  const handleEnterButtonClick = () => {
    // Do something with the selected grade, such as sending it to a server or updating the app state

    console.log(`Selected grade: ${selectedGrade}`)
    console.log(selectedGrade)
    localStorage.setItem(gradeStatKey, JSON.stringify(selectedGrade))
    const grade = localStorage.getItem(gradeStatKey)
    console.log('THERE GRADE IS' + grade)
    handleClose()
    window.location.reload()
    console.log('reloded')
    handleClose()
  }

  return (
    <BaseModal
      title="What Grade are you in?"
      isOpen={isOpen}
      handleClose={handleClose}
    >
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Since Studenle is not limited to one grade we have to ask you what grade
        you are in order to give you the correct Studentle

        *Edit 2/15/24 I updated it to 9th and im not doing any others so don't ask
      </p>
      <br></br>
      <form>
        <div className="select">
          <select
            name="format"
            id="format"
            value={selectedGrade}
            onChange={handleGradeChange}
          >
            <option hidden disabled selected>
              {' '}
              Choose Your Grade{' '}
            </option>
          
            <option value="7" disabled>8th</option>

            <option value="8">9th</option>
          </select>
        </div>
      </form>
      <br></br>
      <div className="enterbutton" onClick={handleEnterButtonClick}>
        <button disabled={!selectedGrade}>Enter</button>
      </div>
    </BaseModal>
  )
}

const grade = localStorage.getItem(gradeStatKey)

