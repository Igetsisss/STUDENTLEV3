import { getGameDate, getIndex, localeAwareUpperCase } from '../lib/words'
import { TEACHER_WORDS } from '../teacherWords'

const TEACHERS_PLAYED_KEY = 'teachersRoundPlayedDate'

export const hasTeachersBeenPlayedToday = (): boolean => {
  const lastPlayed = localStorage.getItem(TEACHERS_PLAYED_KEY)
  if (!lastPlayed) return false
  const today = new Date().toISOString().slice(0, 10)
  return lastPlayed === today
}

export const setTeachersPlayedToday = (): void => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(TEACHERS_PLAYED_KEY, today)
}

export const clearTeachersPlayedToday = (): void => {
  localStorage.removeItem(TEACHERS_PLAYED_KEY)
}

export const getTeachersSolution = (): string => {
  const gameDate = getGameDate()
  const index = getIndex(gameDate)
  // Offset by half the list length so teachers solution differs from bonus solution
  const offsetIndex =
    (index + Math.floor(TEACHER_WORDS.length / 2)) % TEACHER_WORDS.length
  return localeAwareUpperCase(TEACHER_WORDS[offsetIndex % TEACHER_WORDS.length])
}
