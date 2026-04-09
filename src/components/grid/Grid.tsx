import { MAX_CHALLENGES } from '../../constants/settings'
import { CompletedRow } from './CompletedRow'
import { CurrentRow } from './CurrentRow'
import { EmptyRow } from './EmptyRow'

const CELL_STAGGER_MS = 60

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

  const numCols = solution.length

  // Clearing: bottom-right → top-left (right-to-left per row, then up)
  const totalGuessRows = guesses.length

  // Enter: also bottom-right → top-left
  // Total enter rows = MAX_CHALLENGES (1 CurrentRow + empties)
  // CurrentRow is rowIndex 0 (top), EmptyRow[i] is rowIndex i+1
  // Bottom row appears first, top row appears last
  const totalEnterRows = MAX_CHALLENGES
  // CurrentRow is at the top → appears last
  const currentRowEnterBase = bonusEnter
    ? (totalEnterRows - 1) * numCols * CELL_STAGGER_MS
    : 0

  return (
    <>
      {guesses.map((guess, i) => {
        // Row from bottom: 0 = bottom row (appears first)
        const rowFromBottom = totalGuessRows - 1 - i
        const clearingBaseDelay = isClearing
          ? rowFromBottom * numCols * CELL_STAGGER_MS
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
          bonusEnterBaseDelay={currentRowEnterBase}
        />
      )}
      {empties.map((_, i) => {
        // EmptyRow[i] is at rowIndex i+1 from top
        // Row from bottom = totalEnterRows - 1 - (i + 1) = totalEnterRows - 2 - i
        const rowFromBottom = totalEnterRows - 2 - i
        const enterBase = bonusEnter
          ? rowFromBottom * numCols * CELL_STAGGER_MS
          : 0
        return (
          <EmptyRow
            key={i}
            solution={solution}
            bonusEnter={bonusEnter}
            bonusEnterBaseDelay={enterBase}
          />
        )
      })}
    </>
  )
}
