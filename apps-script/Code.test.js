const assert = require('assert');
const { handleSubmission, shouldRateLimit } = require('./Code.js');

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

function testAllowsUnderLimit() {
  assert.strictEqual(shouldRateLimit(0), false);
  assert.strictEqual(shouldRateLimit(19), false);
}

function testBlocksAtLimit() {
  assert.strictEqual(shouldRateLimit(20), true);
  assert.strictEqual(shouldRateLimit(21), true);
}

testAppendsValidFeedback();
testIgnoresHoneypotFill();
testRejectsEmptyFeedback();
testRejectsMissingFeedback();
testAllowsUnderLimit();
testBlocksAtLimit();
console.log('Code.test.js: all tests passed');
