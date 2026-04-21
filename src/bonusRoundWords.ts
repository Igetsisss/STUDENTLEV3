import { WORDS } from './constants/wordlist'

// Bonus word pool: harder names only (5+ characters), excluded short common names.
// Words are interleaved by length group so the letter count varies each day
// instead of running in long same-length streaks.
const hardWords = WORDS.filter(
  (w) => w.replace(/-/g, '').replace(/ /g, '').length >= 5
)

// Group by effective length, longest groups first
const lengthMap = new Map<number, string[]>()
for (const w of hardWords) {
  const len = w.replace(/-/g, '').replace(/ /g, '').length
  if (!lengthMap.has(len)) lengthMap.set(len, [])
  lengthMap.get(len)!.push(w)
}
const groups = [...lengthMap.entries()]
  .sort((a, b) => b[0] - a[0])
  .map(([, words]) => words)

// Round-robin through length groups: longest, 2nd-longest, 3rd-longest, repeat.
// Consecutive days get different letter counts.
const interleaved: string[] = []
const maxGroupLen = Math.max(...groups.map((g) => g.length))
for (let i = 0; i < maxGroupLen; i++) {
  for (const group of groups) {
    if (i < group.length) interleaved.push(group[i])
  }
}

export const BONUS_WORDS = interleaved
