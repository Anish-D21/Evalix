import { test } from 'node:test';
import assert from 'node:assert';
import { connectDB } from '../config/db.js';

/**
 * Tests config/db.js's graceful-degradation behavior. Never connects to
 * a real database (no credentials are hardcoded here or anywhere in the
 * test suite) — verifies connectDB() resolves to null instead of
 * throwing/crashing the process, both when MONGODB_URI is unset and
 * when it points to an unreachable host. This is Phase 0's original
 * design, unchanged by Phase 7 — these tests just formalize it.
 */

test('connectDB resolves to null when MONGODB_URI is not set', async () => {
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = '';

  const result = await connectDB();
  assert.strictEqual(result, null);

  process.env.MONGODB_URI = originalUri;
});

test('connectDB resolves to null (not throws) when MONGODB_URI is unreachable', async () => {
  const originalUri = process.env.MONGODB_URI;
  // Syntactically valid but definitely-unreachable — no real credentials,
  // no real cluster. serverSelectionTimeoutMS (3s, in config/db.js)
  // keeps this test fast rather than hanging.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/nonexistent-test-db';

  const result = await connectDB();
  assert.strictEqual(result, null);

  process.env.MONGODB_URI = originalUri;
});
