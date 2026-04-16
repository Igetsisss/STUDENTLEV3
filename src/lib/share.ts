import { MAX_CHALLENGES, MAX_BONUS_CHALLENGES } from '../constants/settings'
import { GAME_TITLE } from '../constants/strings'
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

export const shareStatus = (
  solution: string,
  guesses: string[],
  lost: boolean,
  isDarkMode: boolean,
  isHighContrastMode: boolean,
  handleShareToClipboard: () => void,
  handleShareFailure: () => void,
  bonusSolution?: string,
  bonusGuesses?: string[]
) => {
  const tiles = getEmojiTiles(isDarkMode, isHighContrastMode)

  let textToShare =
    `${GAME_TITLE} ${solutionIndex} ${
      lost ? 'X' : guesses.length
    }/${MAX_CHALLENGES}\n\n` +
    generateEmojiGrid(solution, guesses, tiles)

  if (bonusSolution && bonusGuesses && bonusGuesses.length > 0) {
    const bonusWon = bonusGuesses[bonusGuesses.length - 1] === bonusSolution
    textToShare +=
      `\n\nBonus Round ${bonusWon ? bonusGuesses.length : 'X'}/${MAX_BONUS_CHALLENGES}\n` +
      generateEmojiGrid(bonusSolution, bonusGuesses, tiles)
  }

  textToShare += '\n\nstudentle.org'

  const shareData = { text: textToShare }

  let shareSuccess = false

  try {
    if (attemptShare(shareData)) {
      navigator.share(shareData)
      shareSuccess = true
    }
  } catch (error) {
    shareSuccess = false
  }

  try {
    if (!shareSuccess) {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(textToShare)
          .then(handleShareToClipboard)
          .catch(handleShareFailure)
      } else {
        handleShareFailure()
      }
    }
  } catch (error) {
    handleShareFailure()
  }
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
