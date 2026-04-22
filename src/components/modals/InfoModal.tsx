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
        Guess the student's name in 6 tries. Each guess must be a name from
        your grade — tile colors show how close you are.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell
          isRevealing={true}
          isCompleted={true}
          value="G"
          status="correct"
        />
        <Cell value="R" isCompleted={true} />
        <Cell value="A" isCompleted={true} />
        <Cell value="C" isCompleted={true} />
        <Cell value="E" isCompleted={true} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        <strong>G</strong> is in the name and in the correct spot.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell value="C" isCompleted={true} />
        <Cell value="H" isCompleted={true} />
        <Cell
          isRevealing={true}
          isCompleted={true}
          value="A"
          status="present"
        />
        <Cell value="S" isCompleted={true} />
        <Cell value="E" isCompleted={true} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        <strong>A</strong> is in the name but in the wrong spot.
      </p>

      <div className="mb-1 mt-4 flex justify-center">
        <Cell value="J" isCompleted={true} />
        <Cell value="A" isCompleted={true} />
        <Cell value="C" isCompleted={true} />
        <Cell isRevealing={true} isCompleted={true} value="K" status="absent" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        <strong>K</strong> is not in the name in any spot.
      </p>

      <p className="mt-6 text-sm italic text-gray-500 dark:text-gray-300">
        Coded and maintained by Jack Underwood
      </p>
    </BaseModal>
  )
}
