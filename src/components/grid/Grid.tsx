import { MAX_CHALLENGES } from '../../constants/settings'
import { unicodeSplit } from '../../lib/words'
import { CompletedRow } from './CompletedRow'
import { CurrentRow } from './CurrentRow'
import { EmptyRow } from './EmptyRow'

const CLEARING_STAGGER_MS = 40

type Props = {
  solution: string
  guesses: string[]
  currentGuess: string
  isRevealing?: boolean
  currentRowClassName: string
  isClearing?: boolean
  bonusEnter?: 'grow' | 'shrink' | null
}

export const Grid = ({
  solution,
  guesses,
  currentGuess,
  isRevealing,
  currentRowClassName,
  isClearing,
  bonusEnter,
}: Props) => {
  const empties =
    guesses.length < MAX_CHALLENGES - 1
      ? Array.from(Array(MAX_CHALLENGES - 1 - guesses.length))
      : []

  // For clearing: bottom-right to top-left domino
  // Last row clears first, and within each row right-to-left
  const totalRows = guesses.length
  const numCols = totalRows > 0 ? unicodeSplit(guesses[0]).length : solution.length

  return (
    <>
      {guesses.map((guess, i) => {
        const cols = unicodeSplit(guess).length
        // Bottom rows start first (row index from bottom: totalRows-1-i = 0 for last row)
        const rowFromBottom = totalRows - 1 - i
        const clearingBaseDelay = isClearing
          ? rowFromBottom * cols * CLEARING_STAGGER_MS
          : undefined

        return (
          <CompletedRow
            key={i}
            solution={solution}
            guess={guess}
            isRevealing={isRevealing && guesses.length - 1 === i}
            isClearing={isClearing}
            clearingBaseDelay={clearingBaseDelay}
          />
        )
      })}
      {guesses.length < MAX_CHALLENGES && (
        <CurrentRow
          guess={currentGuess}
          className={currentRowClassName}
          solution={solution}
          bonusEnter={bonusEnter}
          bonusEnterBaseDelay={bonusEnter ? 0 : 0}
        />
      )}
      {empties.map((_, i) => (
        <EmptyRow
          key={i}
          solution={solution}
          bonusEnter={bonusEnter}
          bonusEnterBaseDelay={bonusEnter ? (i + 1) * solution.length * 50 : 0}
        />
      ))}
    </>
  )
}
