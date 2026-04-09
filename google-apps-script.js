// ===========================================================
// INSTRUCTIONS:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this entire file
// 4. Click Deploy > New Deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the new deployment URL and update API_URL in src/lib/api.ts
// ===========================================================

const SHEET_NAME = 'GameData'

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow([
      'timestamp', 'name', 'grade', 'date', 'word', 'won',
      'guessCount', 'gameType', 'gameStartTime', 'gameEndTime',
      'totalDurationSec', 'timeToFirstGuessSec', 'device',
      'screenWidth', 'guesses'
    ])
  }
  return sheet
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const sheet = getOrCreateSheet()

    sheet.appendRow([
      new Date().toISOString(),
      data.name || '',
      data.grade || '',
      data.date || '',
      data.word || '',
      data.won === true,
      data.guessCount || 0,
      data.gameType || 'daily',
      data.gameStartTime || '',
      data.gameEndTime || '',
      data.totalDurationSec || 0,
      data.timeToFirstGuessSec || 0,
      data.device || '',
      data.screenWidth || 0,
      JSON.stringify(data.guesses || [])
    ])

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || ''

    if (action === 'leaderboard') {
      const dateFilter = e.parameter.date || ''
      const gradeFilter = e.parameter.grade || ''

      const sheet = getOrCreateSheet()
      const rows = sheet.getDataRange().getValues()
      const headers = rows[0]

      const results = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const entry = {}
        headers.forEach((h, idx) => { entry[h] = row[idx] })

        // Apply filters
        if (dateFilter && entry.date !== dateFilter) continue
        if (gradeFilter && String(entry.grade) !== gradeFilter) continue

        results.push({
          name: entry.name,
          grade: entry.grade,
          date: entry.date,
          won: entry.won === true || entry.won === 'TRUE',
          guessCount: Number(entry.guessCount) || 0,
          gameType: entry.gameType || 'daily',
          totalDurationSec: Number(entry.totalDurationSec) || 0
        })
      }

      // Sort: winners first, then fewest guesses, then fastest
      results.sort((a, b) => {
        if (a.won !== b.won) return a.won ? -1 : 1
        if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
        return a.totalDurationSec - b.totalDurationSec
      })

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', data: results }))
        .setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', data: [] }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}
