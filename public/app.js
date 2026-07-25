var ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbzKHY3oOm9M-4UxE1USJIlC2lL44NMvRCq2is7NHHOIbAhAyu7rAX1AJ6ol57FHqfo/exec';

function isValidFeedback(text) {
  return typeof text === 'string' && text.trim().length > 0;
}

function initFeedbackForm() {
  var form = document.getElementById('feedback-form');
  var feedbackField = document.getElementById('feedback');
  var honeypotField = document.getElementById('website');
  var submitButton = document.getElementById('submit-button');
  var resultMessage = document.getElementById('result-message');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var text = feedbackField.value;
    if (!isValidFeedback(text)) {
      return;
    }

    submitButton.disabled = true;
    resultMessage.hidden = true;

    fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        feedback: text,
        website: honeypotField.value
      })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.status === 'error') {
          throw new Error('server rejected submission');
        }
        feedbackField.value = '';
        resultMessage.textContent = '의견이 제출되었습니다. 감사합니다 🙏';
        resultMessage.hidden = false;
      })
      .catch(function () {
        resultMessage.textContent = '제출에 실패했습니다. 다시 시도해주세요.';
        resultMessage.hidden = false;
      })
      .finally(function () {
        submitButton.disabled = false;
      });
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initFeedbackForm);
}

if (typeof module !== 'undefined') {
  module.exports = { isValidFeedback };
}
