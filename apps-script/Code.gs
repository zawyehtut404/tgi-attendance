function doGet(e) {
  try {
    var tabName = (e && e.parameter && e.parameter.tab) || "Attendance";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse({ ok: false, error: "Sheet not found: " + tabName }, 404);
    }

    // Return display values so time/date cells come back as readable strings.
    // Using getValues() can return Date objects (e.g. time-only cells as 1899-12-30),
    // which then JSON-serialize into confusing ISO strings on the client.
    var values = sheet.getDataRange().getDisplayValues();
    if (!values || values.length === 0) {
      return jsonResponse({ ok: true, data: [] });
    }

    var headers = values[0];
    var rows = [];

    for (var i = 1; i < values.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      rows.push(row);
    }

    return jsonResponse({ ok: true, data: rows });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || "{}");
    var action = payload.action || "";

    if (action === "append") {
      return appendRecord(payload);
    }

    if (action === "updateByMatch") {
      return updateRecordByMatch(payload);
    }

    if (action === "sendTelegram") {
      return sendTelegramFromScript(payload);
    }

    return jsonResponse({ ok: false, error: "Unsupported action: " + action }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }
}

function appendRecord(payload) {
  var tabName = payload.tab || "Attendance";
  var record = payload.record || {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);

  if (!sheet) {
    return jsonResponse({ ok: false, error: "Sheet not found: " + tabName }, 404);
  }

  // Idempotency guard: avoid duplicate rows when client retries (offline sync / flaky network).
  // We treat a row as duplicate if Name+Date+ClockIn are the same (using display values + normalization).
  var tz = Session.getScriptTimeZone();
  function normalizeDateKey(value) {
    if (value === null || value === undefined) return "";
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, tz, "yyyy-MM-dd");
    }
    var s = String(value).replace(/^'+/, "").trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      var dd = parseInt(m[1], 10);
      var mm = parseInt(m[2], 10);
      var yyyy = parseInt(m[3], 10);
      if (yyyy < 100) yyyy = 2000 + yyyy;
      var mm2 = (mm < 10 ? "0" : "") + mm;
      var dd2 = (dd < 10 ? "0" : "") + dd;
      return yyyy + "-" + mm2 + "-" + dd2;
    }
    return s;
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/^'+/, "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  var headersForDedup = getHeaders(sheet);
  var nameIdx = headersForDedup.indexOf("Name");
  var dateIdx = headersForDedup.indexOf("Date");
  var clockInIdx = headersForDedup.indexOf("ClockIn");

  if (nameIdx !== -1 && dateIdx !== -1 && clockInIdx !== -1) {
    var targetName = normalizeText(record["Name"]);
    var targetDate = normalizeDateKey(record["Date"]);
    var targetClockIn = normalizeText(record["ClockIn"]);

    if (targetName && targetDate && targetClockIn) {
      var range = sheet.getDataRange();
      var displayValues = range.getDisplayValues();

      // Assume first row is headers (same as getHeaders). Start at 1.
      for (var r = 1; r < displayValues.length; r++) {
        var rowName = normalizeText(displayValues[r][nameIdx]);
        var rowDate = normalizeDateKey(displayValues[r][dateIdx]);
        var rowClockIn = normalizeText(displayValues[r][clockInIdx]);

        if (rowName === targetName && rowDate === targetDate && rowClockIn === targetClockIn) {
          return jsonResponse({
            ok: true,
            message: "Duplicate ignored",
            rowNumber: r + 1,
            tab: tabName
          });
        }
      }
    }
  }

  var headers = getHeaders(sheet);
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    row.push(record[headers[i]] || "");
  }

  sheet.appendRow(row);
  return jsonResponse({ ok: true, message: "Record appended" });
}

function updateRecordByMatch(payload) {
  var tabName = payload.tab || "Attendance";
  var match = payload.match || {};
  var updateData = payload.updateData || {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);

  if (!sheet) {
    return jsonResponse({ ok: false, error: "Sheet not found: " + tabName }, 404);
  }

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return jsonResponse({ ok: false, error: "Sheet is empty" }, 404);
  }
  // Use display values for matching so we compare what the user sees in the sheet
  // (avoids Date object vs string mismatches due to locale/format).
  var displayValues = sheet.getDataRange().getDisplayValues();

  var headers = values[0];
  var targetRow = -1;
  var tz = Session.getScriptTimeZone();

  function normalizeDateKey(value) {
    if (value === null || value === undefined) return "";

    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, tz, "yyyy-MM-dd");
    }

    var s = String(value).replace(/^'+/, "").trim();

    // Accept d/M/yyyy, dd/MM/yyyy, dd/MM/yy
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      var dd = parseInt(m[1], 10);
      var mm = parseInt(m[2], 10);
      var yyyy = parseInt(m[3], 10);
      if (yyyy < 100) yyyy = 2000 + yyyy;
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        var mm2 = (mm < 10 ? "0" : "") + mm;
        var dd2 = (dd < 10 ? "0" : "") + dd;
        return yyyy + "-" + mm2 + "-" + dd2;
      }
    }

    return s;
  }

  function normalizeMatchValue(key, value) {
    if (value === null || value === undefined) return "";

    // Normalize Date objects in sheets (or if client passed a Date somehow).
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      if (String(key).toLowerCase() === "date") return normalizeDateKey(value);
      return Utilities.formatDate(value, tz, "HH:mm:ss");
    }

    // Normalize text values: remove leading apostrophes used to force text in Sheets.
    if (String(key).toLowerCase() === "date") return normalizeDateKey(value);
    return String(value).replace(/^'+/, "").trim().replace(/\s+/g, " ");
  }

  for (var i = 1; i < values.length; i++) {
    var matched = true;

    for (var key in match) {
      var columnIndex = headers.indexOf(key);
      if (columnIndex === -1) {
        matched = false;
        break;
      }

      var sheetVal = normalizeMatchValue(key, displayValues[i][columnIndex]);
      var matchVal = normalizeMatchValue(key, match[key]);

      if (sheetVal !== matchVal) {
        matched = false;
        break;
      }
    }

    if (matched) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({
      ok: false,
      error: "Matching row not found",
      details: {
        tab: tabName,
        match: match
      }
    }, 404);
  }

  for (var updateKey in updateData) {
    var updateColumnIndex = headers.indexOf(updateKey);
    if (updateColumnIndex !== -1) {
      // Keep user intent (text) but strip only the forced-text apostrophe if present.
      var v = updateData[updateKey];
      if (typeof v === "string") {
        v = v.replace(/^'+/, "");
      }
      sheet.getRange(targetRow, updateColumnIndex + 1).setValue(v);
    }
  }

  return jsonResponse({ ok: true, message: "Record updated", rowNumber: targetRow });
}

function sendTelegramFromScript(payload) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_BOT_TOKEN");
  var chatId = props.getProperty("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    return jsonResponse({ ok: false, error: "Telegram properties are missing" }, 500);
  }

  var message = payload.message || "";
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: message
    }),
    muteHttpExceptions: true
  });

  return jsonResponse({ ok: true, message: "Telegram message sent" });
}

function getHeaders(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return [];
  }

  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function jsonResponse(data, statusCode) {
  // ContentService doesn't support setting HTTP status codes; include it in JSON for clients.
  if (statusCode && typeof data === "object" && data) {
    data.statusCode = statusCode;
  }
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
