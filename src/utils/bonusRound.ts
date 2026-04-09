import { BONUS_WORDS } from '../bonusRoundWords'
import { getGameDate, getIndex, localeAwareUpperCase } from '../lib/words'

const BONUS_PLAYED_KEY = 'bonusRoundPlayedDate'

export const hasBonusBeenPlayedToday = (): boolean => {
  const lastPlayed = localStorage.getItem(BONUS_PLAYED_KEY)
  if (!lastPlayed) return false
  const today = new Date().toISOString().slice(0, 10)
  return lastPlayed === today
}

export const setBonusPlayedToday = (): void => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(BONUS_PLAYED_KEY, today)
}

export const getBonusSolution = (): string => {
  const gameDate = getGameDate()
  const index = getIndex(gameDate)
  return localeAwareUpperCase(BONUS_WORDS[index % BONUS_WORDS.length])
}
