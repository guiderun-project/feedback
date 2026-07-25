var RATE_LIMIT_MAX = 20;
var RATE_LIMIT_WINDOW_SECONDS = 60;

function shouldRateLimit(count) {
  return count >= RATE_LIMIT_MAX;
}

function isRateLimited() {
  var cache = CacheService.getScriptCache();
  var bucket = Math.floor(new Date().getTime() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  var key = 'rl_' + bucket;
  var count = Number(cache.get(key) || '0');
  if (shouldRateLimit(count)) {
    return true;
  }
  cache.put(key, String(count + 1), RATE_LIMIT_WINDOW_SECONDS + 10);
  return false;
}

function handleSubmission(payload) {
  var feedback = payload && typeof payload.feedback === 'string' ? payload.feedback.trim() : '';
  var honeypot = payload && typeof payload.website === 'string' ? payload.website.trim() : '';

  if (honeypot !== '') {
    return { action: 'ignore' };
  }
  if (feedback === '') {
    return { action: 'error', message: 'empty feedback' };
  }
  return { action: 'append', row: [new Date(), feedback] };
}

function doPost(e) {
  if (isRateLimited()) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var payload = JSON.parse(e.postData.contents);
  var decision = handleSubmission(payload);

  if (decision.action === 'append') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feedback');
    sheet.appendRow(decision.row);
  }

  var status = decision.action === 'error' ? 'error' : 'ok';
  return ContentService
    .createTextOutput(JSON.stringify({ status: status }))
    .setMimeType(ContentService.MimeType.JSON);
}

if (typeof module !== 'undefined') {
  module.exports = { handleSubmission, shouldRateLimit };
}
