import { hasSupabaseConfig, supabase } from './supabase'
// Cloud-first save: writes to Supabase player_state_snapshots and localStorage
export const saveGameState = async (
  isLatestGame: boolean,
  gameState: StoredGameState,
  playerName: string,
  grade: string
) => {
  const key = isLatestGame ? 'gameState' : 'archiveGameState'
  const versioned = buildVersionedStoredGameState(gameState)
  localStorage.setItem(key, JSON.stringify(versioned))
  saveRoundStateSchemaVersion()

  if (hasSupabaseConfig && supabase && playerName && grade) {
    try {
      const now = new Date().toISOString()
      await supabase
        .from('player_state_snapshots')
        .upsert(
          {
            player_key: `${playerName.toLowerCase().trim()}|${grade}`,
            player_name: playerName,
            player_name_key: playerName.toLowerCase().trim(),
            grade: Number(grade) || 0,
            state: { ...gameState, isLatestGame, version: ROUND_STATE_SCHEMA_VERSION, updatedAt: now },
            device: navigator.userAgent || '',
            app_version: 'v2',
            updated_at: now,
          },
          { onConflict: 'player_key' }
        )
    } catch (e) {
      // fallback: already saved to localStorage
    }
  }
}

// Cloud-first load: tries Supabase player_state_snapshots, falls back to localStorage
export const loadGameState = async (
  isLatestGame: boolean,
  playerName: string,
  grade: string
): Promise<StoredGameState | null> => {
  const key = isLatestGame ? 'gameState' : 'archiveGameState'
  if (hasSupabaseConfig && supabase && playerName && grade) {
    try {
      const { data, error } = await supabase
        .from('player_state_snapshots')
        .select('state')
        .eq('player_key', `${playerName.toLowerCase().trim()}|${grade}`)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (!error && data && data.length > 0 && data[0].state) {
        const state = data[0].state as StoredGameState & { isLatestGame?: boolean, version?: number, updatedAt?: string }
        if (state && (state.isLatestGame === isLatestGame || state.isLatestGame === undefined)) {
          // Accept both versioned and unversioned
          return { guesses: state.guesses, solution: state.solution }
        }
      }
    } catch (e) {
      // fallback below
    }
  }
  // fallback to localStorage
  const local = localStorage.getItem(key)
  if (local) {
    try {
      const parsed = JSON.parse(local) as unknown
      if (isVersionedStoredGameState(parsed)) {
        return parsed.state
      }
      if (isStoredGameState(parsed)) {
        return parsed
      }
    } catch {
      localStorage.removeItem(key)
    }
  }
  return null
}
const gameStateKey = 'gameState'
const archiveGameStateKey = 'archiveGameState'
const bonusGameStateKey = 'bonusGameState'
const highContrastKey = 'highContrast'
const activeRoundStateKey = 'activeRoundState'
const roundStateSchemaVersionKey = 'roundStateSchemaVersion'
const ROUND_STATE_SCHEMA_VERSION = 2

export type StoredGameState = {
  guesses: string[]
  solution: string
}

type VersionedStoredGameState = {
  version: number
  updatedAt: string
  state: StoredGameState
}

export type ActiveRoundState = {
  type: 'daily' | 'bonus' | 'teachers' | 'grade'
  grade?: string
}

type VersionedActiveRoundState = {
  version: number
  updatedAt: string
  state: ActiveRoundState
}

const saveRoundStateSchemaVersion = () => {
  localStorage.setItem(
    roundStateSchemaVersionKey,
    String(ROUND_STATE_SCHEMA_VERSION)
  )
}

const buildVersionedStoredGameState = (
  gameState: StoredGameState
): VersionedStoredGameState => ({
  version: ROUND_STATE_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  state: gameState,
})

const buildVersionedActiveRoundState = (
  activeRoundState: ActiveRoundState
): VersionedActiveRoundState => ({
  version: ROUND_STATE_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  state: activeRoundState,
})

const isStoredGameState = (value: unknown): value is StoredGameState => {
  if (!value || typeof value !== 'object') return false
  const maybeState = value as StoredGameState
  return Array.isArray(maybeState.guesses) && typeof maybeState.solution === 'string'
}

const isVersionedStoredGameState = (
  value: unknown
): value is VersionedStoredGameState => {
  if (!value || typeof value !== 'object') return false
  const maybeState = value as VersionedStoredGameState
  return (
    typeof maybeState.version === 'number' &&
    typeof maybeState.updatedAt === 'string' &&
    isStoredGameState(maybeState.state)
  )
}

const isActiveRoundState = (value: unknown): value is ActiveRoundState => {
  if (!value || typeof value !== 'object') return false
  const maybeState = value as ActiveRoundState
  return (
    (maybeState.type === 'daily' ||
      maybeState.type === 'bonus' ||
      maybeState.type === 'teachers' ||
      maybeState.type === 'grade') &&
    (maybeState.grade == null || typeof maybeState.grade === 'string')
  )
}

const isVersionedActiveRoundState = (
  value: unknown
): value is VersionedActiveRoundState => {
  if (!value || typeof value !== 'object') return false
  const maybeState = value as VersionedActiveRoundState
  return (
    typeof maybeState.version === 'number' &&
    typeof maybeState.updatedAt === 'string' &&
    isActiveRoundState(maybeState.state)
  )
}

const saveVersionedState = <T>(key: string, state: T) => {
  localStorage.setItem(key, JSON.stringify(state))
  saveRoundStateSchemaVersion()
}

const loadVersionedStoredGameState = (
  key: string
): VersionedStoredGameState | null => {
  const state = localStorage.getItem(key)
  if (!state) return null

  try {
    const parsed = JSON.parse(state) as unknown
    if (isVersionedStoredGameState(parsed)) {
      saveRoundStateSchemaVersion()
      return parsed
    }

    if (isStoredGameState(parsed)) {
      const migrated = buildVersionedStoredGameState(parsed)
      saveVersionedState(key, migrated)
      return migrated
    }
  } catch {
    localStorage.removeItem(key)
  }

  return null
}

const loadVersionedActiveRoundState = (
  key: string
): VersionedActiveRoundState | null => {
  const state = localStorage.getItem(key)
  if (!state) return null

  try {
    const parsed = JSON.parse(state) as unknown
    if (isVersionedActiveRoundState(parsed)) {
      saveRoundStateSchemaVersion()
      return parsed
    }

    if (isActiveRoundState(parsed)) {
      const migrated = buildVersionedActiveRoundState(parsed)
      saveVersionedState(key, migrated)
      return migrated
    }
  } catch {
    localStorage.removeItem(key)
  }

  return null
}

export const getStoredRoundStateSchemaVersion = () => {
  const raw = localStorage.getItem(roundStateSchemaVersionKey)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export const ensureRoundStateSchemaVersion = () => {
  saveRoundStateSchemaVersion()
}

export const loadStoredGameStateMetadata = (
  isLatestGame: boolean
): VersionedStoredGameState | null => {
  const key = isLatestGame ? gameStateKey : archiveGameStateKey
  return loadVersionedStoredGameState(key)
}

export const saveGameStateToLocalStorage = (
  isLatestGame: boolean,
  gameState: StoredGameState
) => {
  const key = isLatestGame ? gameStateKey : archiveGameStateKey
  saveVersionedState(key, buildVersionedStoredGameState(gameState))
}

export const loadGameStateFromLocalStorage = (
  isLatestGame: boolean
): StoredGameState | null => {
  return loadStoredGameStateMetadata(isLatestGame)?.state ?? null
}

export const loadBonusGameStateMetadata = () =>
  loadVersionedStoredGameState(bonusGameStateKey)

export const loadTeachersGameStateMetadata = () =>
  loadVersionedStoredGameState(teachersGameStateKey)

export const loadGradeRoundGameStateMetadata = (grade: string) =>
  loadVersionedStoredGameState(gradeRoundGameStateKeyPrefix + grade)

export const loadActiveRoundStateMetadata = () =>
  loadVersionedActiveRoundState(activeRoundStateKey)



export const saveBonusGameStateToLocalStorage = (
  gameState: StoredGameState
) => {
  saveVersionedState(
    bonusGameStateKey,
    buildVersionedStoredGameState(gameState)
  )
}

export const loadBonusGameStateFromLocalStorage = () => {
  return loadBonusGameStateMetadata()?.state ?? null
}

export const clearBonusGameState = () => {
  localStorage.removeItem(bonusGameStateKey)
}

const teachersGameStateKey = 'teachersGameState'

export const saveTeachersGameStateToLocalStorage = (
  gameState: StoredGameState
) => {
  saveVersionedState(
    teachersGameStateKey,
    buildVersionedStoredGameState(gameState)
  )
}

export const loadTeachersGameStateFromLocalStorage = () => {
  return loadTeachersGameStateMetadata()?.state ?? null
}

export const clearTeachersGameState = () => {
  localStorage.removeItem(teachersGameStateKey)
}

const gradeRoundGameStateKeyPrefix = 'gradeRoundGameState_'

export const saveGradeRoundGameStateToLocalStorage = (
  grade: string,
  gameState: StoredGameState
) => {
  saveVersionedState(
    gradeRoundGameStateKeyPrefix + grade,
    buildVersionedStoredGameState(gameState)
  )
}

export const loadGradeRoundGameStateFromLocalStorage = (grade: string) => {
  return loadGradeRoundGameStateMetadata(grade)?.state ?? null
}

export const clearGradeRoundGameState = (grade: string) => {
  localStorage.removeItem(gradeRoundGameStateKeyPrefix + grade)
}

export const saveActiveRoundToLocalStorage = (
  activeRoundState: ActiveRoundState
) => {
  saveVersionedState(
    activeRoundStateKey,
    buildVersionedActiveRoundState(activeRoundState)
  )
}

export const loadActiveRoundFromLocalStorage = () => {
  return loadActiveRoundStateMetadata()?.state ?? null
}

export const clearActiveRoundFromLocalStorage = () => {
  localStorage.removeItem(activeRoundStateKey)
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
