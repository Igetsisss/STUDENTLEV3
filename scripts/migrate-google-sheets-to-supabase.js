/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_SHEET_ID = '1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg'
const BATCH_SIZE = 500

const sheetId = process.env.LEGACY_GOOGLE_SHEET_ID || DEFAULT_SHEET_ID
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Missing SUPABASE_URL/REACT_APP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const normalizeLegacyGrade = (rawGrade) => {
  const clean = String(rawGrade || '').replace(/"/g, '').trim()
  const legacyMap = {
    '8': '11',
    '27': '11',
    '7': '10',
    '28': '10',
  }
  return legacyMap[clean] || clean
}

const normalizeNameKey = (name) =>
  String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()

const buildPlayerKey = (playerName, grade) =>
  `${normalizeNameKey(playerName)}|${normalizeLegacyGrade(grade)}`

const parseBoolean = (value) => value === true || String(value) === 'TRUE'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toStringOrNull = (value) => {
  const stringified = String(value || '').trim()
  return stringified ? stringified : null
}

const looksLikeDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())

const looksLikeTimestamp = (value) => {
  const stringified = String(value || '').trim()
  if (!stringified) return false
  return !Number.isNaN(Date.parse(stringified))
}

const normalizeGameType = (value) => String(value || '').toLowerCase().trim()

const isKnownGameType = (value) => {
  const gameType = normalizeGameType(value)
  return (
    gameType === 'daily' ||
    gameType === 'bonus' ||
    gameType === 'teachers' ||
    gameType === 'grade' ||
    /^grade\d+$/.test(gameType)
  )
}

const parseGvizResponse = (text) => {
  const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '')
  const data = JSON.parse(jsonStr)
  const rows = []

  if (data.table && data.table.rows) {
    for (const row of data.table.rows) {
      rows.push(
        row.c.map((cell) => {
          if (!cell) return null
          if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
            const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/)
            if (match) {
              const year = match[1]
              const month = String(Number(match[2]) + 1).padStart(2, '0')
              const day = String(Number(match[3])).padStart(2, '0')
              return `${year}-${month}-${day}`
            }
          }
          if (cell.f != null) return cell.f
          return cell.v
        })
      )
    }
  }

  return rows
}

const fetchGvizRows = async (sheetName) => {
  const url = sheetName
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`
    : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`
  const response = await fetch(url)
  const text = await response.text()
  return parseGvizResponse(text)
}

const chunk = (items, size) => {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const insertInBatches = async (table, rows) => {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    if (batch.length === 0) continue
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      throw new Error(`Failed inserting into ${table}: ${error.message}`)
    }
  }
}

const upsertInBatches = async (table, rows, onConflict) => {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    if (batch.length === 0) continue
    const { error } = await supabase.from(table).upsert(batch, { onConflict })
    if (error) {
      throw new Error(`Failed upserting into ${table}: ${error.message}`)
    }
  }
}

const assertEmptyDestination = async () => {
  const tables = [
    'game_submissions',
    'keystroke_logs',
    'player_profiles',
    'player_state_snapshots',
    'signup_events',
  ]

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) {
      throw new Error(`Failed checking ${table}: ${error.message}`)
    }
    if ((count || 0) > 0) {
      throw new Error(
        `Destination table ${table} is not empty. Clear it first before migrating.`
      )
    }
  }
}

const collectPlayerProfile = (profiles, playerName, grade, source, registeredAt) => {
  if (!playerName) return
  const cleanGrade = normalizeLegacyGrade(grade)
  const playerKey = buildPlayerKey(playerName, cleanGrade)
  const existing = profiles.get(playerKey)
  const candidate = {
    player_key: playerKey,
    player_name: playerName,
    player_name_key: normalizeNameKey(playerName),
    grade: Number(cleanGrade) || 0,
    source: source || 'migration',
    registered_at_client: registeredAt || null,
    updated_at: registeredAt || new Date().toISOString(),
  }

  if (!existing) {
    profiles.set(playerKey, candidate)
    return
  }

  const existingTs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0
  const candidateTs = candidate.updated_at ? new Date(candidate.updated_at).getTime() : 0
  if (candidateTs >= existingTs) {
    profiles.set(playerKey, candidate)
  }
}

const buildGuessArray = (row) => {
  const guesses = []
  for (let guessIndex = 0; guessIndex < 6; guessIndex += 1) {
    const base = 13 + guessIndex * 4
    const word = String(row[base] || '').trim()
    if (!word) continue
    guesses.push({
      word,
      timeSec: toNumber(row[base + 1]),
      keystrokes: toNumber(row[base + 2]),
      deletes: toNumber(row[base + 3]),
    })
  }
  return guesses
}

const main = async () => {
  console.log('Checking destination tables...')
  await assertEmptyDestination()

  console.log('Fetching Google Sheets data...')
  const [mainRows, stateRows, keystrokeRows] = await Promise.all([
    fetchGvizRows(),
    fetchGvizRows('Sheet2'),
    fetchGvizRows('KeystrokeLogs'),
  ])

  const playerProfiles = new Map()
  const signupEvents = []
  const gameSubmissions = []
  const stateSnapshots = []
  const keystrokeLogs = []

  for (const row of mainRows) {
    const playerName = String(row[0] || '').trim()
    const grade = normalizeLegacyGrade(row[1] || '')
    if (!playerName || !grade) continue

    const playerKey = buildPlayerKey(playerName, grade)
    const gameType = String(row[6] || 'daily').toLowerCase().trim()
    const createdAt = toStringOrNull(row[37]) || toStringOrNull(row[8]) || new Date().toISOString()

    collectPlayerProfile(playerProfiles, playerName, grade, gameType === 'signup' ? 'signup' : 'migration', createdAt)

    if (gameType === 'signup') {
      signupEvents.push({
        player_key: playerKey,
        player_name: playerName,
        player_name_key: normalizeNameKey(playerName),
        grade: Number(grade) || 0,
        registered_at_client: createdAt,
        source: 'legacy_sheet',
        user_agent: null,
        screen_width: toNumber(row[12]) || null,
        screen_height: null,
        created_at: createdAt,
      })
      continue
    }

    gameSubmissions.push({
      player_key: playerKey,
      player_name: playerName,
      player_name_key: normalizeNameKey(playerName),
      grade: Number(grade) || 0,
      game_date: String(row[2] || '1970-01-01').slice(0, 10),
      word: String(row[3] || '').trim() || 'XXXXX',
      won: parseBoolean(row[4]),
      guess_count: toNumber(row[5]),
      game_type: gameType || 'daily',
      game_start_time: toStringOrNull(row[7]),
      game_end_time: toStringOrNull(row[8]),
      total_duration_sec: toNumber(row[9]),
      time_to_first_guess_sec: toNumber(row[10]),
      device: toStringOrNull(row[11]),
      screen_width: toNumber(row[12]) || null,
      guesses: buildGuessArray(row),
      created_at: createdAt,
    })
  }

  for (const row of stateRows) {
    const updatedAt = toStringOrNull(row[0]) || new Date().toISOString()
    const playerKey = String(row[1] || '').trim()
    const playerName = String(row[2] || '').trim()
    const grade = normalizeLegacyGrade(row[3] || '')
    if (!playerKey || !playerName || !grade) continue

    let state = {}
    try {
      state = JSON.parse(String(row[4] || '{}'))
    } catch {
      state = {}
    }

    stateSnapshots.push({
      player_key: playerKey,
      player_name: playerName,
      player_name_key: normalizeNameKey(playerName),
      grade: Number(grade) || 0,
      state,
      device: toStringOrNull(row[5]),
      app_version: toStringOrNull(row[6]) || 'legacy-sheet',
      updated_at: updatedAt,
      created_at: updatedAt,
    })

    collectPlayerProfile(playerProfiles, playerName, grade, 'state_sync', updatedAt)
  }

  for (const row of keystrokeRows) {
    const receivedAt = toStringOrNull(row[0]) || new Date().toISOString()
    const sessionId = String(row[1] || '').trim()
    const playerName = String(row[2] || '').trim()
    const grade = normalizeLegacyGrade(row[3] || '')
    if (!sessionId || !playerName || !grade) continue

    const gameDate =
      row
        .map((value) => String(value || '').trim())
        .find((value) => looksLikeDateOnly(value)) || '1970-01-01'
    const gameType =
      row
        .map((value) => String(value || '').trim())
        .find((value) => isKnownGameType(value)) || 'daily'
    const eventTimestamp =
      row
        .map((value) => String(value || '').trim())
        .find(
          (value) =>
            looksLikeTimestamp(value) &&
            !looksLikeDateOnly(value) &&
            value !== receivedAt
        ) || receivedAt

    keystrokeLogs.push({
      session_id: sessionId,
      player_key: buildPlayerKey(playerName, grade),
      player_name: playerName,
      player_name_key: normalizeNameKey(playerName),
      grade: Number(grade) || 0,
      game_date: String(gameDate).slice(0, 10),
      game_type: normalizeGameType(gameType),
      event_timestamp: eventTimestamp,
      sequence_number: toNumber(row[7]),
      key_type: String(row[8] || '').trim(),
      key_value: String(row[9] || '').trim(),
      reason: toStringOrNull(row[10]),
      guess_number: toNumber(row[11]),
      input_before: String(row[12] || ''),
      input_after: String(row[13] || ''),
      received_at: receivedAt,
    })
  }

  console.log(`Migrating ${gameSubmissions.length} game submissions...`)
  await insertInBatches('game_submissions', gameSubmissions)

  console.log(`Migrating ${keystrokeLogs.length} keystroke log rows...`)
  await insertInBatches('keystroke_logs', keystrokeLogs)

  console.log(`Migrating ${signupEvents.length} signup events...`)
  await insertInBatches('signup_events', signupEvents)

  console.log(`Migrating ${stateSnapshots.length} state snapshots...`)
  await upsertInBatches('player_state_snapshots', stateSnapshots, 'player_key')

  const profiles = Array.from(playerProfiles.values())
  console.log(`Migrating ${profiles.length} player profiles...`)
  await upsertInBatches('player_profiles', profiles, 'player_key')

  console.log('Migration complete.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})