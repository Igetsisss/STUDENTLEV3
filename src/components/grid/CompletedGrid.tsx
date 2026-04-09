import { CompletedRow } from './CompletedRow'
import { EmptyRow } from './EmptyRow'
import { MAX_CHALLENGES } from '../../constants/settings'

type Props = {
  solution: string
  guesses: string[]
  label: string
}

export const CompletedGrid = ({ solution, guesses, label }: Props) => {
  const empties = Array.from(
    Array(Math.max(0, MAX_CHALLENGES - guesses.length))
  )

  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="scale-[0.55] origin-top">
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
