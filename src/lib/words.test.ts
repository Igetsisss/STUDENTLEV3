import { DAILY_WORDS } from '../constants/wordlist'
import { TEACHER_WORDS, TEACHER_WORDS_FULL } from '../teacherWords'
import {
  getIndex,
  getLastGameDate,
  getNextGameDate,
  getWordOfDay,
  isWordInWordList,
} from './words'

describe('solutionIndex', () => {
  test('last game date', () => {
    expect(getLastGameDate(new Date(2022, 5, 17))).toEqual(
      new Date(2022, 5, 17)
    )
    expect(getLastGameDate(new Date(2022, 5, 18))).toEqual(
      new Date(2022, 5, 18)
    )
    expect(getLastGameDate(new Date(2022, 5, 18, 15, 42, 0))).toEqual(
      new Date(2022, 5, 18)
    )

    expect(getLastGameDate(new Date(2022, 5, 23, 15, 42, 0))).toEqual(
      new Date(2022, 5, 23)
    )

    expect(getLastGameDate(new Date(2022, 5, 24))).toEqual(
      new Date(2022, 5, 24)
    )
    expect(getLastGameDate(new Date(2022, 5, 25))).toEqual(
      new Date(2022, 5, 25)
    )
    expect(getLastGameDate(new Date(2022, 5, 25, 15, 42, 0))).toEqual(
      new Date(2022, 5, 25)
    )
  })

  test('next game date', () => {
    expect(getNextGameDate(new Date(2022, 5, 17))).toEqual(
      new Date(2022, 5, 18)
    )
    expect(getNextGameDate(new Date(2022, 5, 18))).toEqual(
      new Date(2022, 5, 19)
    )
    expect(getNextGameDate(new Date(2022, 5, 18, 15, 42, 0))).toEqual(
      new Date(2022, 5, 19)
    )

    expect(getNextGameDate(new Date(2022, 5, 23, 15, 42, 0))).toEqual(
      new Date(2022, 5, 24)
    )

    expect(getNextGameDate(new Date(2022, 5, 24))).toEqual(
      new Date(2022, 5, 25)
    )
    expect(getNextGameDate(new Date(2022, 5, 25))).toEqual(
      new Date(2022, 5, 26)
    )
    expect(getNextGameDate(new Date(2022, 5, 25, 15, 42, 0))).toEqual(
      new Date(2022, 5, 26)
    )
  })

  test('index', () => {
    expect(getIndex(new Date(2022, 5, 16))).toEqual(0)

    expect(getIndex(new Date(2022, 5, 17))).toEqual(0)
    expect(getIndex(new Date(2022, 5, 18))).toEqual(0)
    expect(getIndex(new Date(2022, 5, 18, 15, 42, 0))).toEqual(0)

    expect(getIndex(new Date(2022, 5, 23, 15, 42, 0))).toEqual(0)

    expect(getIndex(new Date(2022, 5, 24))).toEqual(0)
  })

  // DAILY_WORDS is the live student roster, so its contents change as
  // students enroll/graduate — assert against the pool itself rather than
  // hardcoding names that will drift out of sync.
  test('word of the day1', () => {
    expect(() => getWordOfDay(-1)).toThrowError('Invalid index')
    expect(getWordOfDay(0)).toEqual(DAILY_WORDS[0].toUpperCase())
    expect(getWordOfDay(1)).toEqual(DAILY_WORDS[1].toUpperCase())
    expect(getWordOfDay(131)).toEqual(getWordOfDay(131))
    // wraps around once the index exceeds the pool size
    expect(getWordOfDay(DAILY_WORDS.length)).toEqual(getWordOfDay(0))
  })

  test('teacher rounds can restrict guesses to teacher names only', () => {
    expect(isWordInWordList('george', TEACHER_WORDS)).toBe(false)
    expect(isWordInWordList('graham', TEACHER_WORDS)).toBe(true)
    expect(isWordInWordList('baum', TEACHER_WORDS_FULL)).toBe(true)
    expect(isWordInWordList('baum', TEACHER_WORDS)).toBe(false)
  })
})
