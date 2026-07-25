const assert = require('assert');
const { isValidFeedback } = require('./public/app.js');

assert.strictEqual(isValidFeedback('좋은 프로그램이었어요'), true);
assert.strictEqual(isValidFeedback('   '), false);
assert.strictEqual(isValidFeedback(''), false);
console.log('app.test.js: all tests passed');
