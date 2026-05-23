// IT영업부 매출 현황 - Google Apps Script API
// Google Sheets를 DB로 사용하는 REST API

var SHEET_NAME = 'salesData';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'client', 'type', 'amount', 'date', 'desc', 'createdAt']);
  }
  return sheet;
}

// GET: 전체 데이터 조회
function doGet(e) {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var data = [];

  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST: 추가(add) 또는 수정(update)
function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;

  if (action === 'add') {
    return addEntry(payload.entry);
  } else if (action === 'update') {
    return updateEntry(payload.entry);
  } else if (action === 'delete') {
    return deleteEntry(payload.id);
  }

  return error('Unknown action');
}

function addEntry(entry) {
  var sheet = getSheet();
  var now = new Date().toISOString().slice(0, 10);
  sheet.appendRow([
    entry.id,
    entry.client,
    entry.type,
    entry.amount,
    entry.date,
    entry.desc || '',
    now
  ]);
  return ok();
}

function updateEntry(entry) {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(entry.id)) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        entry.id,
        entry.client,
        entry.type,
        entry.amount,
        entry.date,
        entry.desc || '',
        rows[i][6]
      ]]);
      return ok();
    }
  }
  return error('Entry not found');
}

function deleteEntry(id) {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return ok();
    }
  }
  return error('Entry not found');
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
