import { Cell } from './Cell'

type Props = {
  solution: string
  bonusEnter?: 'grow' | 'shrink' | null
  bonusEnterBaseDelay?: number
  isClearing?: boolean
  clearingBaseDelay?: number
}

export const EmptyRow = ({ solution, bonusEnter, bonusEnterBaseDelay = 0, isClearing, clearingBaseDelay = 0 }: Props) => {
  const numCols = solution.length
  const emptyCells = Array.from(Array(numCols))

  return (
    <div className="mb-1 flex justify-center">
      {emptyCells.map((_, i) => (
        <Cell
          key={i}
          bonusEnter={bonusEnter}
          bonusEnterDelay={
            bonusEnter ? bonusEnterBaseDelay + i * 60 : 0
          }
          isClearing={isClearing}
          clearingDelay={isClearing ? clearingBaseDelay + i * 60 : 0}
        />
      ))}
    </div>
  )
}
