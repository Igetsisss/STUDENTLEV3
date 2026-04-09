import { MAX_CHALLENGES } from '../../constants/settings'
import { unicodeSplit } from '../../lib/words'
import { CompletedRow } from './CompletedRow'
import { CurrentRow } from './CurrentRow'
import { EmptyRow } from './EmptyRow'

const CLEARING_STAGGER_MS = 50

type Props = {
  solution: string
  guesses: string[]
  currentGuess: string
  isRevealing?: boolean
  currentRowClassName: string
  isClearing?: boolean
}

export const Grid = ({
  solution,
  guesses,
  currentGuess,
  isRevealing,
  currentRowClassName,
  isClearing,
}: Props) => {
  const empties =
    guesses.length < MAX_CHALLENGES - 1
      ? Array.from(Array(MAX_CHALLENGES - 1 - guesses.length))
      : []

  return (
    <>
      {guesses.map((guess, i) => {
        const numCols = unicodeSplit(guess).length
        const clearingBaseDelay = isClearing
          ? (guesses.length - 1 - i) * numCols * CLEARING_STAGGER_MS
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
        />
      )}
      {empties.map((_, i) => (
        <EmptyRow key={i} solution={solution} />
      ))}
    </>
  )
}
