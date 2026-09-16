import { test } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('GET /api/health still works and correctly reports a reachable NLP service', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'GET /api/nlp/health': async () => ({
      status: 200,
      body: { success: true, data: { status: 'ok', modelsReady: true }, error: null },
    }),
  });
  process.env.FASTAPI_URL = url;

  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');

  const res = await request(app).get('/api/health');

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.service, 'evalix-server');
  assert.strictEqual(res.body.data.nlpService, 'online');

  await stopMockNlpServer(nlpServer);
});

test('GET /api/health reports nlpService offline when the NLP service is unreachable', async () => {
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');

  const res = await request(app).get('/api/health');

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.nlpService, 'offline');
});

test('GET /api/does-not-exist returns the standard 404 envelope', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');

  const res = await request(app).get('/api/does-not-exist');

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});
