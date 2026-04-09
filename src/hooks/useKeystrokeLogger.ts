import { useCallback, useEffect, useRef } from 'react'

import { KeystrokeEvent, sendKeystrokeBatch } from '../lib/api'

type SessionMeta = {
  playerName: string
  grade: string
  date: string
  gameType: 'daily' | 'bonus'
}

// Flush the buffer every 4 seconds so data appears nearly in real-time.
// Also flushes immediately when the buffer hits 30 events or on tab hide/unload.
const FLUSH_INTERVAL_MS = 4000
const FLUSH_AT_SIZE = 30

export type LogKeystroke = (event: Omit<KeystrokeEvent, 'timestamp'>) => void

export const useKeystrokeLogger = () => {
  const sessionIdRef = useRef<string>('')
  const metaRef = useRef<SessionMeta>({
    playerName: '',
    grade: '',
    date: new Date().toISOString().split('T')[0],
    gameType: 'daily',
  })
  const bufferRef = useRef<KeystrokeEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const flush = useCallback(() => {
    if (!bufferRef.current.length) return
    const batch = [...bufferRef.current]
    bufferRef.current = []
    sendKeystrokeBatch(sessionIdRef.current, metaRef.current, batch)
  }, [])

  // Start periodic flusher and wire up page-hide events once on mount
  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL_MS)
    const onBeforeUnload = () => flush()
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      flush()
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flush])

  // Call this at the start of each game (daily & bonus)
  const startSession = useCallback(
    (meta: SessionMeta) => {
      flush() // push any lingering events from the previous session first
      bufferRef.current = []
      // Unique session ID: name + epoch + random slug
      sessionIdRef.current = `${meta.playerName}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`
      metaRef.current = meta
    },
    [flush]
  )

  // Call this on every key event — success or blocked
  const log: LogKeystroke = useCallback(
    (event) => {
      bufferRef.current.push({ ...event, timestamp: new Date().toISOString() })
      if (bufferRef.current.length >= FLUSH_AT_SIZE) flush()
    },
    [flush]
  )

  return { log, startSession, flush }
}
