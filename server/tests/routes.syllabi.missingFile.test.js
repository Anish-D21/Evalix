import { test } from 'node:test';
import assert from 'node:assert';

test('POST /api/syllabi returns 400 when no file is attached', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1; // simulate a connected DB so requireDb lets this through to controller validation

  const res = await request(app).post('/api/syllabi');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'MISSING_FILE');
});
