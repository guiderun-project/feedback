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
  module.exports = { handleSubmission };
}
