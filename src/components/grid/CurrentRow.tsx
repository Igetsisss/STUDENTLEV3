import { unicodeSplit } from '../../lib/words'
import { Cell } from './Cell'

type Props = {
  guess: string
  className: string
  solution: string
  bonusEnter?: 'grow' | 'shrink' | null
  bonusEnterBaseDelay?: number
  isClearing?: boolean
  clearingBaseDelay?: number
}

export const CurrentRow = ({ guess, className, solution, bonusEnter, bonusEnterBaseDelay = 0, isClearing, clearingBaseDelay = 0 }: Props) => {
  const splitGuess = unicodeSplit(guess)
  const numCols = solution.length
  const emptyCells = Array.from(Array(numCols - splitGuess.length))
  const classes = `flex justify-center mb-1 ${className}`

  return (
    <div className={classes}>
      {splitGuess.map((letter, i) => (
        <Cell
          key={i}
          value={letter}
          isClearing={isClearing}
          clearingDelay={isClearing ? clearingBaseDelay + i * 60 : 0}
        />
      ))}
      {emptyCells.map((_, i) => {
        const colIndex = splitGuess.length + i
        return (
          <Cell
            key={i}
            bonusEnter={bonusEnter}
            bonusEnterDelay={
              bonusEnter ? bonusEnterBaseDelay + colIndex * 60 : 0
            }
            isClearing={isClearing}
            clearingDelay={isClearing ? clearingBaseDelay + colIndex * 60 : 0}
          />
        )
      })}
    </div>
  )
}
