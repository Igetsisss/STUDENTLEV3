import { WORDS } from './constants/wordlist'

// Bonus word pool: harder names only (5+ characters after stripping hyphens/spaces).
// Short common names (mac, sam, jay, jb, etc.) are excluded so the bonus round
// is meaningfully harder than the daily puzzle.
const hardWords = WORDS.filter(
  (w) => w.replace(/-/g, '').replace(/ /g, '').length >= 5
)

// Deterministic shuffle using a fixed seed so the sequence is stable across
// sessions but not sorted by length — this gives variety in letter count each day.
const seededShuffle = (arr: string[], seed: number): string[] => {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) | 0) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const BONUS_WORDS = seededShuffle(hardWords, 0x5a3d_c1)
