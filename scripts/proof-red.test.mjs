// TEMPORARY proof of design-system #21: a failing check job must keep Pages from deploying.
// Reverted in the next commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('proof: CI is red on purpose', () => {
  assert.fail('temporary proof commit for #21: the check job must fail and nothing may deploy');
});
