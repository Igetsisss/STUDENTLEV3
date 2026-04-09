import { unicodeSplit } from '../../lib/words'
import { Cell } from './Cell'

type Props = {
  guess: string
  className: string
  solution: string
}

export const CurrentRow = ({ guess, className, solution }: Props) => {
  const splitGuess = unicodeSplit(guess)
  const emptyCells = Array.from(Array(solution.length - splitGuess.length))
  const classes = `flex justify-center mb-1 ${className}`

  return (
    <div className={classes}>
      {splitGuess.map((letter, i) => (
        <Cell key={i} value={letter} />
      ))}
      {emptyCells.map((_, i) => (
        <Cell key={i} />
      ))}
    </div>
  )
}
