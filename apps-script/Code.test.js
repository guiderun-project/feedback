const assert = require('assert');
const { handleSubmission } = require('./Code.js');

function testAppendsValidFeedback() {
  const result = handleSubmission({ feedback: '  강의가 유익했어요  ', website: '' });
  assert.strictEqual(result.action, 'append');
  assert.strictEqual(result.row[1], '강의가 유익했어요');
  assert.ok(result.row[0] instanceof Date);
}

function testIgnoresHoneypotFill() {
  const result = handleSubmission({ feedback: 'buy now', website: 'http://spam.example' });
  assert.strictEqual(result.action, 'ignore');
}

function testRejectsEmptyFeedback() {
  const result = handleSubmission({ feedback: '   ', website: '' });
  assert.strictEqual(result.action, 'error');
}

function testRejectsMissingFeedback() {
  const result = handleSubmission({ website: '' });
  assert.strictEqual(result.action, 'error');
}

testAppendsValidFeedback();
testIgnoresHoneypotFill();
testRejectsEmptyFeedback();
testRejectsMissingFeedback();
console.log('Code.test.js: all tests passed');
