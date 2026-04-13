// ===========================================================
// INSTRUCTIONS:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this entire file
// 4. Save, then Deploy > New Deployment (or "Manage deployments" to update existing)
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the deployment URL and update API_URL in src/lib/api.ts
// ===========================================================

var SHEET_ID = '1iHHuks_7DRK0X1y-wtuSmlx9GdceovPlK2RqxOQpZbg';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── Live keystroke batch ──────────────────────────────────────────────────
    if (data.action === 'keystrokes') {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var kSheet = ss.getSheetByName('KeystrokeLogs');
      if (!kSheet) {
        kSheet = ss.insertSheet('KeystrokeLogs');
        kSheet.appendRow([
          'receivedAt', 'sessionId', 'playerName', 'grade', 'date', 'gameType',
          'eventTimestamp', 'seq', 'keyType', 'keyValue', 'reason',
          'guessNum', 'inputBefore', 'inputAfter'
        ]);
      }
      var receivedAt = new Date().toISOString();
      var events = data.events || [];
      var kRows = events.map(function(ev, idx) {
        return [
          receivedAt,
          data.sessionId || '',
          data.playerName || '',
          data.grade || '',
          data.date || '',
          data.gameType || '',
          ev.timestamp || '',
          idx + 1,
          ev.keyType || '',
          ev.keyValue || '',
          ev.reason || '',
          ev.guessNum != null ? ev.guessNum : '',
          ev.inputBefore || '',
          ev.inputAfter || ''
        ];
      });
      if (kRows.length > 0) {
        kSheet.getRange(kSheet.getLastRow() + 1, 1, kRows.length, kRows[0].length).setValues(kRows);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Signup event → Sheet2 account registry ────────────────────────────────
    if (data.action === 'signup') {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var regSheet = ss.getSheetByName('Sheet2') || ss.getSheetByName('Accounts');
      if (!regSheet) {
        regSheet = ss.insertSheet('Accounts');
        regSheet.appendRow(['ID', 'Name', 'Grade', 'Registered At', 'User Agent', 'Screen Width', 'Screen Height']);
        regSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
        regSheet.setFrozenRows(1);
      }
      // Update existing row if same ID already exists, otherwise append
      var existingId = data.playerId || '';
      var updated = false;
      if (existingId) {
        var allRows = regSheet.getDataRange().getValues();
        for (var ri = 1; ri < allRows.length; ri++) {
          if (String(allRows[ri][0]) === existingId) {
            regSheet.getRange(ri + 1, 1, 1, 7).setValues([[
              existingId,
              data.playerName || '',
              data.grade || '',
              data.registeredAtClient || new Date().toISOString(),
              data.userAgent || '',
              data.screenWidth || 0,
              data.screenHeight || 0
            ]]);
            updated = true;
            break;
          }
        }
      }
      if (!updated) {
        regSheet.appendRow([
          existingId,
          data.playerName || '',
          data.grade || '',
          data.registeredAtClient || new Date().toISOString(),
          data.userAgent || '',
          data.screenWidth || 0,
          data.screenHeight || 0
        ]);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── End-of-game summary ───────────────────────────────────────────────────
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    var row = [
      data.name || '',
      data.grade || '',
      data.date || '',
      data.word || '',
      data.won || false,
      data.guessCount || 0,
      data.gameType || 'daily',
      data.gameStartTime || '',
      data.gameEndTime || '',
      data.totalDurationSec || 0,
      data.timeToFirstGuessSec || 0,
      data.device || '',
      data.screenWidth || 0
    ];

    for (var i = 1; i <= 6; i++) {
      var g = data.guesses && data.guesses[i - 1] ? data.guesses[i - 1] : {};
      row.push(g.word || '');
      row.push(g.timeSec || 0);
      row.push(g.keystrokes || 0);
      row.push(g.deletes || 0);
    }

    row.push(new Date().toISOString()); // timestamp
    row.push(data.playerId || '');       // player account ID

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    var allData = sheet.getDataRange().getValues();
    var rows = allData.slice(1);

    var action = (e.parameter && e.parameter.action) || 'leaderboard';
    var filterGrade = e.parameter.grade || '';
    var callback = e.parameter.callback || '';

    if (action === 'leaderboard') {
      var results = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var gameType = String(r[6] || 'daily').toLowerCase().trim();

        // Exclude signup rows — reference only, never shown on leaderboard
        if (gameType === 'signup') continue;

        if (filterGrade && String(r[1]) !== filterGrade) continue;

        results.push({
          name: r[0],
          grade: r[1],
          date: r[2],
          won: r[4] === true || r[4] === 'TRUE',
          guessCount: Number(r[5]) || 0,
          gameType: gameType,
          totalDurationSec: Number(r[9]) || 0
        });
      }

      results.sort(function(a, b) {
        if (a.won !== b.won) return a.won ? -1 : 1;
        if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount;
        return a.totalDurationSec - b.totalDurationSec;
      });

      var jsonStr = JSON.stringify({ status: 'ok', data: results });

      if (callback) {
        return ContentService
          .createTextOutput(callback + '(' + jsonStr + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }

      return ContentService
        .createTextOutput(jsonStr)
        .setMimeType(ContentService.MimeType.JSON);
    }

    var emptyStr = JSON.stringify({ status: 'ok', data: [] });
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + emptyStr + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(emptyStr)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errStr = JSON.stringify({ status: 'error', message: err.toString() });
    var cb = (e.parameter && e.parameter.callback) || '';
    if (cb) {
      return ContentService
        .createTextOutput(cb + '(' + errStr + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errStr)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Run this ONCE from the Apps Script editor to give all existing players an ID ──
// Open Apps Script > select backfillAccounts > click Run
function backfillAccounts() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var gameSheet = ss.getSheetByName('Sheet1');

  // Get or create the Accounts sheet (use existing Sheet2 if present)
  var accSheet = ss.getSheetByName('Accounts') || ss.getSheetByName('Sheet2');
  if (!accSheet) {
    accSheet = ss.insertSheet('Accounts');
  }
  // Add header row if sheet is empty
  if (accSheet.getLastRow() === 0) {
    accSheet.appendRow(['ID', 'Name', 'Grade', 'Registered At', 'User Agent', 'Screen Width', 'Screen Height']);
    accSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    accSheet.setFrozenRows(1);
  }

  // Build a set of names already in the Accounts sheet (lowercase for matching)
  var existingRows = accSheet.getDataRange().getValues();
  var existingNames = {};
  for (var i = 1; i < existingRows.length; i++) {
    var n = String(existingRows[i][1] || '').toLowerCase().trim();
    if (n) existingNames[n] = true;
  }

  // Scan Sheet1 for unique player names (skip signup/keystroke rows)
  var gameData = gameSheet.getDataRange().getValues();
  var seen = {};       // name -> { name, grade, firstDate }
  for (var r = 1; r < gameData.length; r++) {
    var row = gameData[r];
    var rawName = String(row[0] || '').trim();
    var rawGrade = String(row[1] || '').trim();
    var gameType = String(row[6] || '').toLowerCase().trim();
    if (!rawName || gameType === 'signup') continue;
    var nameKey = rawName.toLowerCase();
    if (!seen[nameKey]) {
      seen[nameKey] = { name: rawName, grade: rawGrade, firstDate: String(row[2] || '') };
    }
  }

  // For each unique name not yet in Accounts, generate an ID and add a row
  var added = 0;
  for (var key in seen) {
    if (existingNames[key]) continue;
    var player = seen[key];
    var newId = Utilities.getUuid();
    accSheet.appendRow([
      newId,
      player.name,
      player.grade,
      player.firstDate || new Date().toISOString(),
      'backfill',   // user agent — marks this as a backfilled record
      0,
      0
    ]);
    added++;
  }

  SpreadsheetApp.getUi().alert('Backfill complete. ' + added + ' accounts added.');
}
