// ─── Key registry ─────────────────────────────────────────────────────────────
// All localStorage keys used in this app. Never use raw string literals outside this file.

// Game state
const GAME_STATE_KEY = 'gameState'
const ARCHIVE_GAME_STATE_KEY = 'archiveGameState'
const BONUS_GAME_STATE_KEY = 'bonusGameState'
const TEACHERS_GAME_STATE_KEY = 'teachersGameState'
const GRADE_ROUND_GAME_STATE_PREFIX = 'gradeRoundGameState_'
const ACTIVE_ROUND_STATE_KEY = 'activeRoundState'
const ROUND_STATE_SCHEMA_VERSION_KEY = 'roundStateSchemaVersion'

// Player identity
const GRADE_NUMBER_KEY = 'gradeNumber'
const PLAYER_NAME_KEY = 'playerName'
const PLAYER_LAST_INITIAL_KEY = 'playerLastInitial'
const PLAYER_PREFIX_KEY = 'playerPrefix'
const MS_AUTH_EMAIL_KEY = 'msAuthEmail'

// Settings
const HIGH_CONTRAST_KEY = 'highContrast'
const THEME_KEY = 'theme'

// Flags
const FIRST_TO_PLAY_DATE_KEY = 'firstToPlayDate'
const HAS_SEEN_INFO_KEY = 'hasSeenInfo'
const SHOW_INFO_AFTER_RELOAD_KEY = 'showInfoAfterReload'
const HISTORICAL_STATS_SUBMITTED_KEY = 'historicalStatsSubmitted'
const PENDING_ACCOUNT_CHECK_KEY = 'pendingAccountCheck'
const WELCOME_SHOWN_EMAIL_KEY = 'welcomeShownForEmail'
const SHOW_WELCOME_AFTER_RELOAD_KEY = 'showWelcomeAfterReload'

// Stats
const GAME_STATS_KEY = 'gameStats'
const EXTRA_ROUND_STATS_KEY = 'extraRoundStats'

// Round played date markers (must match prefixes in gradeRound.ts / bonusRound.ts)
const GRADE_ROUND_PLAYED_DATE_PREFIX = 'gradeRoundPlayedDate_'

// Internal aliases so existing function bodies below continue to work unchanged.
const gameStateKey = GAME_STATE_KEY
const archiveGameStateKey = ARCHIVE_GAME_STATE_KEY
const bonusGameStateKey = BONUS_GAME_STATE_KEY
const highContrastKey = HIGH_CONTRAST_KEY
const activeRoundStateKey = ACTIVE_ROUND_STATE_KEY
const roundStateSchemaVersionKey = ROUND_STATE_SCHEMA_VERSION_KEY
const teachersGameStateKey = TEACHERS_GAME_STATE_KEY
const gradeRoundGameStateKeyPrefix = GRADE_ROUND_GAME_STATE_PREFIX

// ─── Player profile ────────────────────────────────────────────────────────────

/**
 * Returns the stored grade as a clean plain string ('0', '9', '10', '11', '12').
 * Handles legacy JSON-wrapped values like '"9"' transparently.
 */
export const getPlayerGrade = (): string =>
  (localStorage.getItem(GRADE_NUMBER_KEY) ?? '').replace(/"/g, '').trim()

/** Stores the grade as a plain string — never JSON-wrapped. */
export const setPlayerGrade = (grade: string): void =>
  localStorage.setItem(GRADE_NUMBER_KEY, grade)

export const clearPlayerGrade = (): void =>
  localStorage.removeItem(GRADE_NUMBER_KEY)

export const getPlayerName = (): string =>
  localStorage.getItem(PLAYER_NAME_KEY) ?? ''

export const setPlayerName = (name: string): void =>
  localStorage.setItem(PLAYER_NAME_KEY, name)

export const clearPlayerName = (): void =>
  localStorage.removeItem(PLAYER_NAME_KEY)

export const getPlayerLastInitial = (): string =>
  localStorage.getItem(PLAYER_LAST_INITIAL_KEY) ?? ''

export const setPlayerLastInitial = (initial: string): void =>
  localStorage.setItem(PLAYER_LAST_INITIAL_KEY, initial)

export const clearPlayerLastInitial = (): void =>
  localStorage.removeItem(PLAYER_LAST_INITIAL_KEY)

export const getPlayerPrefix = (): string =>
  localStorage.getItem(PLAYER_PREFIX_KEY) ?? ''

export const setPlayerPrefix = (prefix: string): void =>
  localStorage.setItem(PLAYER_PREFIX_KEY, prefix)

export const clearPlayerPrefix = (): void =>
  localStorage.removeItem(PLAYER_PREFIX_KEY)

export const getMsAuthEmail = (): string =>
  localStorage.getItem(MS_AUTH_EMAIL_KEY) ?? ''

export const setMsAuthEmail = (email: string): void =>
  localStorage.setItem(MS_AUTH_EMAIL_KEY, email)

// ─── Settings ──────────────────────────────────────────────────────────────────

export const getTheme = (): string | null => localStorage.getItem(THEME_KEY)

export const setTheme = (theme: 'dark' | 'light'): void =>
  localStorage.setItem(THEME_KEY, theme)

// ─── Flags ─────────────────────────────────────────────────────────────────────

export const getFirstToPlayDate = (): string =>
  localStorage.getItem(FIRST_TO_PLAY_DATE_KEY) ?? ''

export const setFirstToPlayDate = (date: string): void =>
  localStorage.setItem(FIRST_TO_PLAY_DATE_KEY, date)

/** True if the player has previously opened the info / how-to-play modal. */
export const hasSeenInfoModal = (): boolean =>
  !!localStorage.getItem(HAS_SEEN_INFO_KEY)

export const setHasSeenInfoModal = (): void =>
  localStorage.setItem(HAS_SEEN_INFO_KEY, '1')

export const getShouldShowInfoAfterReload = (): boolean =>
  !!localStorage.getItem(SHOW_INFO_AFTER_RELOAD_KEY)

export const setShouldShowInfoAfterReload = (): void =>
  localStorage.setItem(SHOW_INFO_AFTER_RELOAD_KEY, 'true')

export const clearShouldShowInfoAfterReload = (): void =>
  localStorage.removeItem(SHOW_INFO_AFTER_RELOAD_KEY)

export const hasSubmittedHistoricalStats = (): boolean =>
  !!localStorage.getItem(HISTORICAL_STATS_SUBMITTED_KEY)

export const setHistoricalStatsSubmitted = (): void =>
  localStorage.setItem(HISTORICAL_STATS_SUBMITTED_KEY, 'true')

export const getPendingAccountCheck = (): string =>
  localStorage.getItem(PENDING_ACCOUNT_CHECK_KEY) ?? ''

export const setPendingAccountCheck = (name: string): void =>
  localStorage.setItem(PENDING_ACCOUNT_CHECK_KEY, name)

export const clearPendingAccountCheck = (): void =>
  localStorage.removeItem(PENDING_ACCOUNT_CHECK_KEY)

/** Returns the email for which the one-time welcome screen has already been shown. */
export const getWelcomeShownEmail = (): string =>
  localStorage.getItem(WELCOME_SHOWN_EMAIL_KEY) ?? ''

/** Marks the one-time welcome screen as shown for this email. */
export const setWelcomeShownEmail = (email: string): void =>
  localStorage.setItem(WELCOME_SHOWN_EMAIL_KEY, email)

/** True if the app should show the one-time first-login welcome message on next load. */
export const getShouldShowWelcomeAfterReload = (): boolean =>
  !!localStorage.getItem(SHOW_WELCOME_AFTER_RELOAD_KEY)

export const setShouldShowWelcomeAfterReload = (): void =>
  localStorage.setItem(SHOW_WELCOME_AFTER_RELOAD_KEY, 'true')

export const clearShouldShowWelcomeAfterReload = (): void =>
  localStorage.removeItem(SHOW_WELCOME_AFTER_RELOAD_KEY)

/** Returns the grade rounds (9–12) completed today (by checking played-date markers). */
export const getGradeRoundsPlayedToday = (): string[] => {
  const today = new Date().toISOString().slice(0, 10)
  return ['9', '10', '11', '12'].filter(
    (g) => localStorage.getItem(GRADE_ROUND_PLAYED_DATE_PREFIX + g) === today
  )
}

// ─── Schema version ────────────────────────────────────────────────────────────
const ROUND_STATE_SCHEMA_VERSION = 2

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
  return (
    Array.isArray(maybeState.guesses) && typeof maybeState.solution === 'string'
  )
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

/** Removes both the daily and archive game state entries. */
export const clearDailyGameStates = (): void => {
  localStorage.removeItem(GAME_STATE_KEY)
  localStorage.removeItem(ARCHIVE_GAME_STATE_KEY)
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

// ─── Game statistics ──────────────────────────────────────────────────────────
export type GameStats = {
  winDistribution: number[]
  gamesFailed: number
  currentStreak: number
  bestStreak: number
  totalGames: number
  successRate: number
}

export const saveStatsToLocalStorage = (gameStats: GameStats) => {
  localStorage.setItem(GAME_STATS_KEY, JSON.stringify(gameStats))
}

export const loadStatsFromLocalStorage = () => {
  const stats = localStorage.getItem(GAME_STATS_KEY)
  return stats ? (JSON.parse(stats) as GameStats) : null
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

// ─── Extra-round stats ────────────────────────────────────────────────────────

export type ExtraRoundStats = {
  bonus: { played: number; won: number }
  teachers: { played: number; won: number }
  grade: { played: number; won: number }
}

const defaultExtraRoundStats: ExtraRoundStats = {
  bonus: { played: 0, won: 0 },
  teachers: { played: 0, won: 0 },
  grade: { played: 0, won: 0 },
}

export const loadExtraRoundStats = (): ExtraRoundStats => {
  const raw = localStorage.getItem(EXTRA_ROUND_STATS_KEY)
  if (!raw) return { ...defaultExtraRoundStats }
  try {
    const parsed = JSON.parse(raw) as ExtraRoundStats
    return {
      bonus: parsed.bonus ?? { played: 0, won: 0 },
      teachers: parsed.teachers ?? { played: 0, won: 0 },
      grade: parsed.grade ?? { played: 0, won: 0 },
    }
  } catch {
    return { ...defaultExtraRoundStats }
  }
}

export const recordExtraRoundResult = (
  type: 'bonus' | 'teachers' | 'grade',
  won: boolean
): ExtraRoundStats => {
  const stats = loadExtraRoundStats()
  const updated: ExtraRoundStats = {
    ...stats,
    [type]: {
      played: stats[type].played + 1,
      won: stats[type].won + (won ? 1 : 0),
    },
  }
  localStorage.setItem(EXTRA_ROUND_STATS_KEY, JSON.stringify(updated))
  return updated
}
