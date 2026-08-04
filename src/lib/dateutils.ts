import { addDays } from 'date-fns'

// The school (HIES, Georgia) runs on US Eastern time. The daily puzzle must
// roll over at midnight there, not at midnight in whatever time zone a
// visitor's device happens to be set to — otherwise students in different
// time zones (or anyone with a misconfigured system clock) would see
// different days' puzzles at the same real-world moment.
const SCHOOL_TIME_ZONE = 'America/New_York'

// Returns "today" as a local midnight Date, using the school's time zone to
// decide the calendar day. Intentionally returns a plain local Date (not a
// UTC/zoned timestamp) so it stays a drop-in match for the rest of the
// codebase's date-fns arithmetic (differenceInDays, addDays, etc.), which
// all treats Date objects as local-midnight day markers.
export const getToday = (): Date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [year, month, day] = parts.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const getYesterday = (): Date => addDays(getToday(), -1)

// Formats a Date as the YYYY-MM-DD key used for the game_submissions.game_date
// column. Safe to use on any Date built from local Y/M/D components (e.g.
// getToday(), or anything derived from it) — do not pass a raw `new Date()`
// here if you need the school's calendar day; use getToday() for that.
export const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`

// "Today," formatted as YYYY-MM-DD in the school's time zone — the common
// case of the two helpers above combined.
export const getTodayDateKey = (): string => formatDateKey(getToday())
