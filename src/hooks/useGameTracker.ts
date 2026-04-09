import { useCallback, useRef } from 'react'

import { GuessData } from '../lib/api'

export type GameTracker = {
  startGame: () => void
  recordKeystroke: () => void
  recordDelete: () => void
  recordGuess: (word: string) => void
  getSubmissionData: () => {
    gameStartTime: string
    gameEndTime: string
    totalDurationSec: number
    timeToFirstGuessSec: number
    device: string
    screenWidth: number
    guesses: GuessData[]
  }
  reset: () => void
}

export const useGameTracker = (): GameTracker => {
  const gameStartTimeRef = useRef<Date | null>(null)
  const lastGuessTimeRef = useRef<Date | null>(null)
  const currentKeystrokesRef = useRef(0)
  const currentDeletesRef = useRef(0)
  const guessesRef = useRef<GuessData[]>([])
  const firstGuessTimeRef = useRef<number | null>(null)

  const startGame = useCallback(() => {
    const now = new Date()
    gameStartTimeRef.current = now
    lastGuessTimeRef.current = now
    currentKeystrokesRef.current = 0
    currentDeletesRef.current = 0
    guessesRef.current = []
    firstGuessTimeRef.current = null
  }, [])

  const recordKeystroke = useCallback(() => {
    currentKeystrokesRef.current += 1
  }, [])

  const recordDelete = useCallback(() => {
    currentDeletesRef.current += 1
    currentKeystrokesRef.current += 1
  }, [])

  const recordGuess = useCallback((word: string) => {
    const now = new Date()
    const prevTime = lastGuessTimeRef.current || now
    const timeSec = Math.round((now.getTime() - prevTime.getTime()) / 1000)

    if (firstGuessTimeRef.current === null && gameStartTimeRef.current) {
      firstGuessTimeRef.current = Math.round(
        (now.getTime() - gameStartTimeRef.current.getTime()) / 1000
      )
    }

    guessesRef.current.push({
      word,
      timeSec,
      keystrokes: currentKeystrokesRef.current,
      deletes: currentDeletesRef.current,
    })

    lastGuessTimeRef.current = now
    currentKeystrokesRef.current = 0
    currentDeletesRef.current = 0
  }, [])

  const getSubmissionData = useCallback(() => {
    const now = new Date()
    const start = gameStartTimeRef.current || now
    const totalSec = Math.round((now.getTime() - start.getTime()) / 1000)
    const isMobile = window.innerWidth < 768

    return {
      gameStartTime: start.toISOString(),
      gameEndTime: now.toISOString(),
      totalDurationSec: totalSec,
      timeToFirstGuessSec: firstGuessTimeRef.current || 0,
      device: isMobile ? 'mobile' : 'desktop',
      screenWidth: window.innerWidth,
      guesses: [...guessesRef.current],
    }
  }, [])

  const reset = useCallback(() => {
    gameStartTimeRef.current = null
    lastGuessTimeRef.current = null
    currentKeystrokesRef.current = 0
    currentDeletesRef.current = 0
    guessesRef.current = []
    firstGuessTimeRef.current = null
  }, [])

  return {
    startGame,
    recordKeystroke,
    recordDelete,
    recordGuess,
    getSubmissionData,
    reset,
  }
}
