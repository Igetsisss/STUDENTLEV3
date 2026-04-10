const gameStateKey = 'gameState'
const archiveGameStateKey = 'archiveGameState'
const bonusGameStateKey = 'bonusGameState'
const highContrastKey = 'highContrast'

export type StoredGameState = {
  guesses: string[]
  solution: string
}

export const saveGameStateToLocalStorage = (
  isLatestGame: boolean,
  gameState: StoredGameState
) => {
  const key = isLatestGame ? gameStateKey : archiveGameStateKey
  localStorage.setItem(key, JSON.stringify(gameState))
}

export const loadGameStateFromLocalStorage = (isLatestGame: boolean) => {
  const key = isLatestGame ? gameStateKey : archiveGameStateKey
  const state = localStorage.getItem(key)
  return state ? (JSON.parse(state) as StoredGameState) : null
}

export const saveBonusGameStateToLocalStorage = (
  gameState: StoredGameState
) => {
  localStorage.setItem(bonusGameStateKey, JSON.stringify(gameState))
}

export const loadBonusGameStateFromLocalStorage = () => {
  const state = localStorage.getItem(bonusGameStateKey)
  return state ? (JSON.parse(state) as StoredGameState) : null
}

export const clearBonusGameState = () => {
  localStorage.removeItem(bonusGameStateKey)
}

const teachersGameStateKey = 'teachersGameState'

export const saveTeachersGameStateToLocalStorage = (
  gameState: StoredGameState
) => {
  localStorage.setItem(teachersGameStateKey, JSON.stringify(gameState))
}

export const loadTeachersGameStateFromLocalStorage = () => {
  const state = localStorage.getItem(teachersGameStateKey)
  return state ? (JSON.parse(state) as StoredGameState) : null
}

export const clearTeachersGameState = () => {
  localStorage.removeItem(teachersGameStateKey)
}

const gameStatKey = 'gameStats'

const gradeStatKey = 'gradeNumber'

export type GameStats = {
  winDistribution: number[]
  gamesFailed: number
  currentStreak: number
  bestStreak: number
  totalGames: number
  successRate: number
}
export type GradeNumber = {
  gradeNumber: number
}

export const saveStatsToLocalStorage = (gameStats: GameStats) => {
  localStorage.setItem(gameStatKey, JSON.stringify(gameStats))
}

export const loadStatsFromLocalStorage = () => {
  const stats = localStorage.getItem(gameStatKey)
  return stats ? (JSON.parse(stats) as GameStats) : null
}

export const saveGradeToLocalStorage = (gradenumber: GradeNumber) => {
  localStorage.setItem(gradeStatKey, JSON.stringify(gradenumber))
}

export const loadGradeFromLocalStorage = () => {
  const grade = localStorage.getItem(gradeStatKey)
  return grade ? (JSON.parse(grade) as GradeNumber) : null
}

export const setStoredIsHighContrastMode = (isHighContrast: boolean) => {
  if (isHighContrast) {
    localStorage.setItem(highContrastKey, '1')
  } else {
    localStorage.removeItem(highContrastKey)
  }
}

export const getStoredIsHighContrastMode = () => {
  const highContrast = localStorage.getItem(highContrastKey)
  return highContrast === '1'
}
