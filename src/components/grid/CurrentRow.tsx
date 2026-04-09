import { unicodeSplit } from '../../lib/words'
import { Cell } from './Cell'

type Props = {
  guess: string
  className: string
  solution: string
  bonusEnter?: 'grow' | 'shrink' | null
  bonusEnterBaseDelay?: number
}

export const CurrentRow = ({ guess, className, solution, bonusEnter, bonusEnterBaseDelay = 0 }: Props) => {
  const splitGuess = unicodeSplit(guess)
  const numCols = solution.length
  const emptyCells = Array.from(Array(numCols - splitGuess.length))
  const classes = `flex justify-center mb-1 ${className}`

  return (
    <div className={classes}>
      {splitGuess.map((letter, i) => (
        <Cell key={i} value={letter} />
      ))}
      {emptyCells.map((_, i) => {
        // Right-to-left: rightmost empty cell first
        const colIndex = splitGuess.length + i
        const colFromRight = numCols - 1 - colIndex
        return (
          <Cell
            key={i}
            bonusEnter={bonusEnter}
            bonusEnterDelay={
              bonusEnter ? bonusEnterBaseDelay + colFromRight * 60 : 0
            }
          />
        )
      })}
    </div>
  )
}
