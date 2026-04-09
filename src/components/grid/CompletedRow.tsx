import { getGuessStatuses } from '../../lib/statuses'
import { unicodeSplit } from '../../lib/words'
import { Cell } from './Cell'

type Props = {
  solution: string
  guess: string
  isRevealing?: boolean
  isClearing?: boolean
  clearingBaseDelay?: number
}

export const CompletedRow = ({
  solution,
  guess,
  isRevealing,
  isClearing,
  clearingBaseDelay = 0,
}: Props) => {
  const statuses = getGuessStatuses(solution, guess)
  const splitGuess = unicodeSplit(guess)
  const numCols = splitGuess.length

  return (
    <div className="mb-1 flex justify-center">
      {splitGuess.map((letter, i) => (
        <Cell
          key={i}
          value={letter}
          status={statuses[i]}
          position={i}
          isRevealing={isRevealing}
          isCompleted
          isClearing={isClearing}
          clearingDelay={
            isClearing ? clearingBaseDelay + (numCols - 1 - i) * 50 : 0
          }
        />
      ))}
    </div>
  )
}
