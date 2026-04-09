import { WORDS } from './constants/wordlist'

// Bonus word pool: offset the list so that the bonus word differs from the daily word.
// We shift by half the list length to maximize distance from the daily pick.
const offset = Math.max(1, Math.floor(WORDS.length / 2))
export const BONUS_WORDS = [...WORDS.slice(offset), ...WORDS.slice(0, offset)]
