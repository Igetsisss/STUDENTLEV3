import { MAX_BONUS_CHALLENGES, MAX_CHALLENGES } from '../constants/settings'
import { getGuessStatuses } from './statuses'
import { solutionIndex, unicodeSplit } from './words'

// Detect Firefox without ua-parser-js — Firefox Mobile has a broken Web Share API
const isFirefoxBrowser = () => /Firefox/i.test(navigator.userAgent)

// Detect mobile/smarttv/wearable devices that actually support Web Share
const isShareCapableDevice = () =>
  /Mobile|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) ||
  /SmartTV|Tizen|webOS|Android TV/i.test(navigator.userAgent) ||
  /WearOS|Wear OS|Galaxy Watch/i.test(navigator.userAgent)

export type ShareOptions = {
  bonusSolution?: string
  bonusGuesses?: string[]
  teachersSolution?: string
  teachersGuesses?: string[]
  gradeRoundGuessesMap?: Record<string, string[]>
  gradeRoundSolutions?: Record<string, string>
  solveRate?: number | null
  leaderboardRank?: number | null
  leaderboardTotal?: number | null
  totalGames?: number
  winRate?: number
}

const SHARE_GRADE_LABELS: Record<string, string> = {
  '9': 'Freshman',
  '10': 'Sophomore',
  '11': 'Junior',
  '12': 'Senior',
}

const buildEmailSubject = (
  guessCount: number,
  lost: boolean,
  rank: number | null,
  total: number | null
): string => {
  const placement =
    rank !== null && total !== null ? `I placed #${rank}/${total} today` : null
  if (lost)
    return `Today's Studentle humbled me 💀 — bet you can't solve it either`
  if (guessCount === 1 && placement)
    return `${placement} in 1 GUESS on Studentle #${solutionIndex + 1}`
  if (guessCount === 1)
    return `I solved Studentle #${solutionIndex + 1} in 1 GUESS`
  if (placement)
    return `${placement} in ${guessCount} guesses on Studentle #${solutionIndex + 1}`
  if (guessCount === 2)
    return `Studentle #${solutionIndex + 1} in 2 guesses 🎯 — think you can beat me?`
  if (guessCount <= 4)
    return `Studentle #${solutionIndex + 1} solved in ${guessCount}/6 🔥 — can you top that?`
  return `I finally cracked today's Studentle 😅 — now it's your turn`
}

const buildEmailBody = (
  solution: string,
  guesses: string[],
  lost: boolean,
  tiles: string[],
  options: ShareOptions
): string => {
  const {
    bonusSolution,
    bonusGuesses,
    teachersSolution,
    teachersGuesses,
    gradeRoundGuessesMap,
    gradeRoundSolutions,
    solveRate,
    leaderboardRank,
    leaderboardTotal,
    totalGames,
    winRate,
  } = options

  const dailyResult = lost
    ? `X/${MAX_CHALLENGES}`
    : `${guesses.length}/${MAX_CHALLENGES}`

  let body =
    `Studentle is a daily word puzzle made by HIES students — ` +
    `Wordle but instead of words it's people in your grade!\n\n` +
    `Here are my results:\n\n`

  body += `━━━━━━━━━━━━━━━━━━━━━━\n`
  body += `🏆 STUDENTLE #${solutionIndex + 1}\n`
  body += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  // Daily
  body += `📅 Daily — ${dailyResult}\n`
  body += generateEmojiGrid(solution, guesses, tiles)

  // Bonus
  if (bonusSolution && bonusGuesses && bonusGuesses.length > 0) {
    const bonusWon = bonusGuesses[bonusGuesses.length - 1] === bonusSolution
    body += `\n\n🎉 Bonus Round — ${
      bonusWon
        ? `${bonusGuesses.length}/${MAX_BONUS_CHALLENGES}`
        : `X/${MAX_BONUS_CHALLENGES}`
    }\n`
    body += generateEmojiGrid(bonusSolution, bonusGuesses, tiles)
  }

  // Teachers
  if (teachersSolution && teachersGuesses && teachersGuesses.length > 0) {
    const teachersWon =
      teachersGuesses[teachersGuesses.length - 1] === teachersSolution
    body += `\n\n🍎 Teachers Round — ${
      teachersWon ? `${teachersGuesses.length}/${MAX_CHALLENGES}` : `X/${MAX_CHALLENGES}`
    }\n`
    body += generateEmojiGrid(teachersSolution, teachersGuesses, tiles)
  }

  // Grade rounds
  if (gradeRoundGuessesMap && gradeRoundSolutions) {
    for (const grade of ['9', '10', '11', '12']) {
      const gGuesses = gradeRoundGuessesMap[grade]
      const gSolution = gradeRoundSolutions[grade]
      if (gGuesses && gGuesses.length > 0 && gSolution) {
        const gWon = gGuesses[gGuesses.length - 1] === gSolution
        body += `\n\n🎓 ${SHARE_GRADE_LABELS[grade] ?? 'Grade'} Round — ${
          gWon ? `${gGuesses.length}/${MAX_CHALLENGES}` : `X/${MAX_CHALLENGES}`
        }\n`
        body += generateEmojiGrid(gSolution, gGuesses, tiles)
      }
    }
  }

  body += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`

  // Stats callout
  const statParts: string[] = []
  if (totalGames != null && totalGames > 0)
    statParts.push(`${totalGames} games played`)
  if (winRate != null) statParts.push(`${winRate}% win rate`)
  if (leaderboardRank != null && leaderboardTotal != null)
    statParts.push(`#${leaderboardRank} of ${leaderboardTotal} today`)
  if (solveRate != null)
    statParts.push(`only ${solveRate}% solved today's puzzle`)
  if (statParts.length > 0) {
    body += `\n📊 My stats: ${statParts.join(' · ')}\n`
  }

  body += `\nPlay free at studentle.org`

  return body
}

export const shareStatus = (
  solution: string,
  guesses: string[],
  lost: boolean,
  isDarkMode: boolean,
  isHighContrastMode: boolean,
  handleShareToClipboard: () => void,
  handleShareFailure: () => void,
  options: ShareOptions = {}
) => {
  const tiles = getEmojiTiles(isDarkMode, isHighContrastMode)
  const subject = buildEmailSubject(
    guesses.length,
    lost,
    options.leaderboardRank ?? null,
    options.leaderboardTotal ?? null
  )
  const body = buildEmailBody(solution, guesses, lost, tiles, options)

  // Open the device's default email client
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailtoUrl
}

export const generateEmojiGrid = (
  solution: string,
  guesses: string[],
  tiles: string[]
) => {
  return guesses
    .map((guess) => {
      const status = getGuessStatuses(solution, guess)
      const splitGuess = unicodeSplit(guess)

      return splitGuess
        .map((_, i) => {
          switch (status[i]) {
            case 'correct':
              return tiles[0]
            case 'present':
              return tiles[1]
            default:
              return tiles[2]
          }
        })
        .join('')
    })
    .join('\n')
}

const attemptShare = (shareData: object) => {
  return (
    // Deliberately exclude Firefox Mobile, because its Web Share API isn't working correctly
    !isFirefoxBrowser() &&
    isShareCapableDevice() &&
    navigator.canShare &&
    navigator.canShare(shareData) &&
    !!navigator.share
  )
}

const getEmojiTiles = (isDarkMode: boolean, isHighContrastMode: boolean) => {
  let tiles: string[] = []
  tiles.push(isHighContrastMode ? '🟧' : '🟩')
  tiles.push(isHighContrastMode ? '🟦' : '🟨')
  tiles.push(isDarkMode ? '⬛' : '⬜')
  return tiles
}
