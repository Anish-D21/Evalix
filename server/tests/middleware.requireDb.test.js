import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Discovered via live Phase 7 integration testing: without this guard,
 * a write attempt while MongoDB is disconnected doesn't fail until
 * Mongoose's default 10-second buffering timeout, surfacing as an
 * opaque INTERNAL_ERROR. This confirms the fast, specific failure path
 * instead — no real MongoDB connection is used anywhere in this test.
 */
test('write routes return 503 DATABASE_UNAVAILABLE immediately when MongoDB is not connected', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  assert.strictEqual(mongoose.connection.readyState, 0, 'precondition: no real DB connection in this test run');

  const start = Date.now();
  const res = await request(app)
    .post('/api/syllabi')
    .attach('file', Buffer.from('Unit 1: Test\n'), 'syllabus.txt');
  const elapsedMs = Date.now() - start;

  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'DATABASE_UNAVAILABLE');
  // The whole point of the guard: fail in well under Mongoose's 10s
  // default buffering timeout, not after it.
  assert.ok(elapsedMs < 2000, `expected a fast failure, took ${elapsedMs}ms`);
});

test('GET routes also return 503 DATABASE_UNAVAILABLE when MongoDB is not connected', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');

  const res = await request(app).get('/api/syllabi/000000000000000000000000');

  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.body.error.code, 'DATABASE_UNAVAILABLE');
});
