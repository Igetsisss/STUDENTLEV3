import { FRESHMAN, JUNIOR, SENIOR, SOPHOMORE } from '../constants/wordlist'
import { getGameDate, getIndex, localeAwareUpperCase } from '../lib/words'
import { TEACHER_WORDS } from '../teacherWords'

const GRADE_ROUND_PLAYED_KEY_PREFIX = 'gradeRoundPlayedDate_'

export const GRADE_WORD_LISTS: Record<string, string[]> = {
  '9': FRESHMAN,
  '10': SOPHOMORE,
  '11': JUNIOR,
  '12': SENIOR,
  '0': TEACHER_WORDS,
}

export const GRADE_LABELS: Record<string, string> = {
  '9': 'Freshman',
  '10': 'Sophomore',
  '11': 'Junior',
  '12': 'Senior',
  '0': 'Teachers',
}

export const getGradeRoundSolution = (grade: string): string => {
  const words = GRADE_WORD_LISTS[grade]
  if (!words || words.length === 0) return ''
  const gameDate = getGameDate()
  const index = getIndex(gameDate)
  // Each grade round shows that grade's actual daily word (offset 0)
  // Teachers grade round matches getTeachersSolution() offset
  const offset = grade === '0' ? Math.floor(TEACHER_WORDS.length / 2) : 0
  return localeAwareUpperCase(words[(index + offset) % words.length])
}

export const hasGradeRoundBeenPlayedToday = (grade: string): boolean => {
  const lastPlayed = localStorage.getItem(GRADE_ROUND_PLAYED_KEY_PREFIX + grade)
  if (!lastPlayed) return false
  const today = new Date().toISOString().slice(0, 10)
  return lastPlayed === today
}

export const setGradeRoundPlayedToday = (grade: string): void => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(GRADE_ROUND_PLAYED_KEY_PREFIX + grade, today)
}

export const clearGradeRoundPlayedToday = (grade: string): void => {
  localStorage.removeItem(GRADE_ROUND_PLAYED_KEY_PREFIX + grade)
}
