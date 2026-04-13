import { CompletedRow } from './CompletedRow'
import { EmptyRow } from './EmptyRow'
import { MAX_CHALLENGES } from '../../constants/settings'

type Props = {
  solution: string
  guesses: string[]
  label: string
  maxChallenges?: number
}

export const CompletedGrid = ({ solution, guesses, label, maxChallenges = MAX_CHALLENGES }: Props) => {
  const empties = Array.from(
    Array(Math.max(0, maxChallenges - guesses.length))
  )

  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div style={{ zoom: 0.55 }}>
        {guesses.map((guess, i) => (
          <CompletedRow key={i} solution={solution} guess={guess} />
        ))}
        {empties.map((_, i) => (
          <EmptyRow key={i} solution={solution} />
        ))}
      </div>
    </div>
  )
}
