import { useCallback, useEffect, useRef } from 'react'

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
  const activeSegmentStartMsRef = useRef<number | null>(null)
  const activeElapsedMsRef = useRef(0)
  const lastGuessElapsedMsRef = useRef(0)
  const currentKeystrokesRef = useRef(0)
  const currentDeletesRef = useRef(0)
  const guessesRef = useRef<GuessData[]>([])
  const firstGuessTimeRef = useRef<number | null>(null)
  const activityHandlerRef = useRef<(() => void) | null>(null)

  const isWindowActive = () => !document.hidden && document.hasFocus()

  const detachActivityListeners = useCallback(() => {
    if (activityHandlerRef.current) {
      window.removeEventListener('focus', activityHandlerRef.current)
      window.removeEventListener('blur', activityHandlerRef.current)
      document.removeEventListener(
        'visibilitychange',
        activityHandlerRef.current
      )
      activityHandlerRef.current = null
    }
  }, [])

  const reconcileActivityState = useCallback(() => {
    const nowMs = Date.now()
    const activeNow = isWindowActive()

    if (activeNow) {
      if (activeSegmentStartMsRef.current === null) {
        activeSegmentStartMsRef.current = nowMs
      }
      return
    }

    if (activeSegmentStartMsRef.current !== null) {
      activeElapsedMsRef.current += Math.max(
        0,
        nowMs - activeSegmentStartMsRef.current
      )
      activeSegmentStartMsRef.current = null
    }
  }, [])

  const getCurrentActiveElapsedMs = useCallback(() => {
    reconcileActivityState()
    const runningSegment =
      activeSegmentStartMsRef.current !== null
        ? Math.max(0, Date.now() - activeSegmentStartMsRef.current)
        : 0
    return activeElapsedMsRef.current + runningSegment
  }, [reconcileActivityState])

  const startGame = useCallback(() => {
    const now = new Date()
    gameStartTimeRef.current = now
    activeSegmentStartMsRef.current = null
    activeElapsedMsRef.current = 0
    lastGuessElapsedMsRef.current = 0
    currentKeystrokesRef.current = 0
    currentDeletesRef.current = 0
    guessesRef.current = []
    firstGuessTimeRef.current = null

    detachActivityListeners()
    activityHandlerRef.current = () => reconcileActivityState()
    window.addEventListener('focus', activityHandlerRef.current)
    window.addEventListener('blur', activityHandlerRef.current)
    document.addEventListener('visibilitychange', activityHandlerRef.current)
    reconcileActivityState()
  }, [detachActivityListeners, reconcileActivityState])

  const recordKeystroke = useCallback(() => {
    currentKeystrokesRef.current += 1
  }, [])

  const recordDelete = useCallback(() => {
    currentDeletesRef.current += 1
    currentKeystrokesRef.current += 1
  }, [])

  const recordGuess = useCallback(
    (word: string) => {
      const activeElapsedMs = getCurrentActiveElapsedMs()
      const timeSec = Math.round(
        Math.max(0, activeElapsedMs - lastGuessElapsedMsRef.current) / 1000
      )

      if (firstGuessTimeRef.current === null) {
        firstGuessTimeRef.current = Math.round(activeElapsedMs / 1000)
      }

      guessesRef.current.push({
        word,
        timeSec,
        keystrokes: currentKeystrokesRef.current,
        deletes: currentDeletesRef.current,
      })

      lastGuessElapsedMsRef.current = activeElapsedMs
      currentKeystrokesRef.current = 0
      currentDeletesRef.current = 0
    },
    [getCurrentActiveElapsedMs]
  )

  const getSubmissionData = useCallback(() => {
    const now = new Date()
    const start = gameStartTimeRef.current || now
    const totalSec = Math.round(getCurrentActiveElapsedMs() / 1000)
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
  }, [getCurrentActiveElapsedMs])

  const reset = useCallback(() => {
    detachActivityListeners()
    gameStartTimeRef.current = null
    activeSegmentStartMsRef.current = null
    activeElapsedMsRef.current = 0
    lastGuessElapsedMsRef.current = 0
    currentKeystrokesRef.current = 0
    currentDeletesRef.current = 0
    guessesRef.current = []
    firstGuessTimeRef.current = null
  }, [detachActivityListeners])

  useEffect(() => {
    return () => {
      detachActivityListeners()
    }
  }, [detachActivityListeners])

  return {
    startGame,
    recordKeystroke,
    recordDelete,
    recordGuess,
    getSubmissionData,
    reset,
  }
}
