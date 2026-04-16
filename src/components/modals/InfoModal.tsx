import { Cell } from '../grid/Cell'
import { BaseModal } from './BaseModal'

type Props = {
  isOpen: boolean
  handleClose: () => void
}

export const InfoModal = ({ isOpen, handleClose }: Props) => {
  return (
    <BaseModal title="How to play" isOpen={isOpen} handleClose={handleClose}>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Studentle works like Wordle. Guess the student, and tile colors show
        how close you are.
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
        The key twist: answers come from your grade, so your guesses should be
        people in your grade.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell
          isRevealing={true}
          isCompleted={true}
          value="J"
          status="correct"
        />
        <Cell value="A" isCompleted={true} />
        <Cell value="C" isCompleted={true} />
        <Cell value="K" isCompleted={true} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        The letter J is in the Student's name and in the correct spot.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell value="G" isCompleted={true} />
        <Cell value="E" isCompleted={true} />
        <Cell
          isRevealing={true}
          isCompleted={true}
          value="O"
          status="present"
        />
        <Cell value="R" isCompleted={true} />
        <Cell value="G" isCompleted={true} />
        <Cell value="E" isCompleted={true} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        The letter O is in the Student's name but in the wrong spot.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell value="C" isCompleted={true} />
        <Cell value="O" isCompleted={true} />
        <Cell isRevealing={true} isCompleted={true} value="L" status="absent" />
        <Cell value="T" isCompleted={true} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        The letter L is not in the Student's name in any spot.
      </p>

      <p className="mt-6 text-sm italic text-gray-500 dark:text-gray-300">
        Forked from Reactle —{' '}
        <a
          href="https://github.com/Igetsisss/STUDENTLEV3"
          className="font-bold underline"
        >
          view source
        </a>{' '}
      </p>
      <p className="text-sm italic text-gray-500 dark:text-gray-300">
        Coded and maintained by Jack Underwood
      </p>
    </BaseModal>
  )
}
