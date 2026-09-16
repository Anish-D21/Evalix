import { test, mock } from 'node:test';
import assert from 'node:assert';

test('GET /api/syllabi/:id returns 404 for a non-existent syllabus', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Syllabus } = await import('../models/Syllabus.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Syllabus, 'findById', async () => null);
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).get('/api/syllabi/000000000000000000000000');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'SYLLABUS_NOT_FOUND');

  mock.restoreAll();
});
