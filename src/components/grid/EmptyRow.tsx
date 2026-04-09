import { Cell } from './Cell'

type Props = {
  solution: string
  bonusEnter?: 'grow' | 'shrink' | null
  bonusEnterBaseDelay?: number
}

export const EmptyRow = ({ solution, bonusEnter, bonusEnterBaseDelay = 0 }: Props) => {
  const emptyCells = Array.from(Array(solution.length))

  return (
    <div className="mb-1 flex justify-center">
      {emptyCells.map((_, i) => (
        <Cell
          key={i}
          bonusEnter={bonusEnter}
          bonusEnterDelay={bonusEnter ? bonusEnterBaseDelay + i * 60 : 0}
        />
      ))}
    </div>
  )
}
