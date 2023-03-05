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
        Guess the Student. After each guess, the color of the tiles will
        change to show how close your guess was to the Student.
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
        Studentle was forked from Reactle an open source version of the word guessing game we all know and
        love -{' '}
        <a
          href="https://github.com/Igetsisss/STUDENTLEV3"
          className="font-bold underline"
        >
          check out the code here
        </a>{' '}
      </p>
    </BaseModal>
  )
}
