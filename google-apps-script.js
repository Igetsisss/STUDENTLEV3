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

function normalizeGrade_(raw) {
  var clean = String(raw || '').replace(/"/g, '').trim();
  var legacyMap = { '8': '11', '27': '11', '7': '10', '28': '10' };
  return legacyMap[clean] || clean;
}

function normalizeNameKey_(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getOrCreateStateSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var s = ss.getSheetByName('Sheet2');
  if (!s) s = ss.insertSheet('Sheet2');
  if (s.getLastRow() === 0) {
    s.appendRow([
      'updatedAt',
      'playerKey',
      'playerName',
      'grade',
      'stateJson',
      'device',
      'appVersion'
    ]);
  }
  return s;
}

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

    // ── Signup event (no-op — just acknowledge) ──────────────────────────────
    if (data.action === 'signup') {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Cross-device full local state sync (Sheet2) ─────────────────────────
    if (data.action === 'state_sync') {
      var stateSheet = getOrCreateStateSheet_();
      var playerName = String(data.playerName || '').trim();
      var grade = normalizeGrade_(data.grade || '');
      if (!playerName || !grade) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'Missing playerName or grade' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var playerKey = normalizeNameKey_(playerName) + '|' + grade;
      var payload = JSON.stringify(data.state || {});
      var updatedAt = new Date().toISOString();
      var rowData = [
        updatedAt,
        playerKey,
        playerName,
        grade,
        payload,
        String(data.device || ''),
        String(data.appVersion || '')
      ];

      var lastRow = stateSheet.getLastRow();
      var targetRow = -1;
      if (lastRow >= 2) {
        var keyVals = stateSheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var i = 0; i < keyVals.length; i++) {
          if (String(keyVals[i][0]) === playerKey) {
            targetRow = i + 2;
            break;
          }
        }
      }

      if (targetRow !== -1) {
        stateSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        stateSheet.appendRow(rowData);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', playerKey: playerKey, updatedAt: updatedAt }))
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

