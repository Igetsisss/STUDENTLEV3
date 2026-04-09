import { WORDS } from './constants/wordlist'

// Bonus word pool: same grade-specific list in reverse order,
// ensuring a different word is selected for the bonus round each day.
export const BONUS_WORDS = [...WORDS].reverse()
