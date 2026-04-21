function doGet(e) {
  try {
    var tabName = (e && e.parameter && e.parameter.tab) || "Attendance";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse({ ok: false, error: "Sheet not found: " + tabName }, 404);
    }

    var values = sheet.getDataRange().getValues();
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

  var headers = values[0];
  var targetRow = -1;

  for (var i = 1; i < values.length; i++) {
    var matched = true;

    for (var key in match) {
      var columnIndex = headers.indexOf(key);
      if (columnIndex === -1 || String(values[i][columnIndex]).trim() !== String(match[key]).trim()) {
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
    return jsonResponse({ ok: false, error: "Matching row not found" }, 404);
  }

  for (var updateKey in updateData) {
    var updateColumnIndex = headers.indexOf(updateKey);
    if (updateColumnIndex !== -1) {
      sheet.getRange(targetRow, updateColumnIndex + 1).setValue(updateData[updateKey]);
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
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
