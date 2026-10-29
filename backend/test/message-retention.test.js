import test from 'node:test';
import assert from 'node:assert/strict';
import { isMessageRetained, messageCutoff } from '../src/messageRetention.js';

const now = Date.parse('2026-10-29T10:00:00.000Z');

test('retains messages newer than 24 hours', () => {
  assert.equal(isMessageRetained({ createdAt: new Date(now - (23 * 60 * 60 * 1000)) }, now), true);
});

test('excludes messages older than 24 hours', () => {
  assert.equal(isMessageRetained({ createdAt: new Date(now - (24 * 60 * 60 * 1000) - 1) }, now), false);
});

test('uses the creation timestamp for pagination cutoff compatibility', () => {
  const cutoff = messageCutoff(now);
  const page = [
    { id: 'newer', createdAt: new Date(now - 60 * 60 * 1000) },
    { id: 'older', createdAt: new Date(now - 25 * 60 * 60 * 1000) },
  ]
    .filter((message) => new Date(message.createdAt) >= cutoff)
    .sort((left, right) => right.createdAt - left.createdAt);
  assert.deepEqual(page.map((message) => message.id), ['newer']);
});
