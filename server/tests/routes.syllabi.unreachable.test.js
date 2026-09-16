import { test } from 'node:test';
import assert from 'node:assert';

test('POST /api/syllabi returns a 503 error when the NLP service is unreachable', async () => {
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1; // simulate a connected DB so requireDb lets this through to the NLP call

  const res = await request(app).post('/api/syllabi').attach('file', Buffer.from('Unit 1: Test\n'), 'syllabus.txt');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'NLP_SERVICE_UNREACHABLE');
  assert.strictEqual(res.status, 503);
});
