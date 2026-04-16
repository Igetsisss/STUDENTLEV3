import { memo } from 'react'
import { MAX_CHALLENGES } from '../../constants/settings'
import { CompletedRow } from './CompletedRow'
import { CurrentRow } from './CurrentRow'
import { EmptyRow } from './EmptyRow'

const CELL_STAGGER_MS = 60
const FALL_ROW_STAGGER_MS = 110 // stagger between rows for the fall animation

type Props = {
  solution: string
  guesses: string[]
  currentGuess: string
  isRevealing?: boolean
  currentRowClassName: string
  isClearing?: boolean
  bonusEnter?: 'grow' | 'shrink' | null
  maxChallenges?: number
}

export const GridInner = ({
  solution,
  guesses,
  currentGuess,
  isRevealing,
  currentRowClassName,
  isClearing,
  bonusEnter,
  maxChallenges = MAX_CHALLENGES,
}: Props) => {
  const empties =
    guesses.length < maxChallenges - 1
      ? Array.from(Array(maxChallenges - 1 - guesses.length))
      : []

  const numCols = solution.length

  // Clearing: top-left → bottom-right (left-to-right per row, top row first)
  const totalGuessRows = guesses.length

  // Enter: top-left → bottom-right
  // CurrentRow is row 0 (top), EmptyRow[i] is row i+1
  const currentRowEnterBase = bonusEnter ? 0 : 0

  return (
    <>
      {guesses.map((guess, i) => {
      // Fall: all cells in the same row fall at once, rows stagger top-to-bottom
        const clearingBaseDelay = isClearing
          ? i * FALL_ROW_STAGGER_MS
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
      {guesses.length < maxChallenges && (
        <CurrentRow
          guess={currentGuess}
          className={currentRowClassName}
          solution={solution}
          bonusEnter={bonusEnter}
          bonusEnterBaseDelay={currentRowEnterBase}
          isClearing={isClearing}
          clearingBaseDelay={
            isClearing ? totalGuessRows * FALL_ROW_STAGGER_MS : 0
          }
        />
      )}
      {empties.map((_, i) => {
        // CurrentRow is row 0, EmptyRow[0] is row 1, etc.
        const rowIndex = totalGuessRows + 1 + i
        const enterBase = bonusEnter
          ? (i + 1) * numCols * CELL_STAGGER_MS
          : 0
        const clearBase = isClearing
          ? rowIndex * FALL_ROW_STAGGER_MS
          : 0
        return (
          <EmptyRow
            key={i}
            solution={solution}
            bonusEnter={bonusEnter}
            bonusEnterBaseDelay={enterBase}
            isClearing={isClearing}
            clearingBaseDelay={clearBase}
          />
        )
      })}
    </>
  )
}

export const Grid = memo(GridInner)
