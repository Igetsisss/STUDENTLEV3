import { WORDS } from './constants/wordlist'

// Bonus word pool: harder names only (6+ characters), sorted longest-first.
// Short common names (mac, sam, jay, jb, etc.) are excluded so the bonus round
// is meaningfully harder than the daily puzzle.
const hardWords = WORDS.filter(
  (w) => w.replace(/-/g, '').replace(/ /g, '').length >= 5
)
const sorted = [...hardWords].sort((a, b) => b.length - a.length)

// Cycle through sorted list using the same date-based index as the main word picker.
const offset = Math.max(1, Math.floor(sorted.length / 2))
export const BONUS_WORDS = [...sorted.slice(offset), ...sorted.slice(0, offset)]
