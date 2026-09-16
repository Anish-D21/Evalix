import { test, mock } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

// One scenario per file: server.js (and everything it transitively
// imports, including nlpClient.js's FASTAPI_URL-dependent axios client)
// is cached after the first dynamic import() within a process, so each
// FASTAPI_URL variant needs its own fresh process — exactly like the
// nlpClient.*.test.js files.

test('POST /api/syllabi forwards the upload to the NLP service and persists the result', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'POST /api/nlp/extract-topics': async () => ({
      status: 200,
      body: {
        success: true,
        data: {
          extractedText: 'Unit 1: Test\nMachine Learning\n',
          units: [{ unitNumber: 1, title: 'Test', topics: ['Machine Learning'] }],
          originalFileName: 'syllabus.txt',
        },
        error: null,
      },
    }),
  });
  process.env.FASTAPI_URL = url;

  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Syllabus } = await import('../models/Syllabus.js');
  const { default: mongoose } = await import('mongoose');

  const savedDoc = {
    _id: 'fake-id-1',
    title: 'syllabus.txt',
    units: [{ unitNumber: 1, title: 'Test', topics: ['Machine Learning'] }],
  };
  mock.method(Syllabus, 'create', async (payload) => {
    assert.strictEqual(payload.originalFileName, 'syllabus.txt');
    assert.strictEqual(payload.units[0].topics[0], 'Machine Learning');
    return savedDoc;
  });

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1; // simulate a connected DB — no real MongoDB in this sandbox

  const res = await request(app)
    .post('/api/syllabi')
    .attach('file', Buffer.from('Unit 1: Test\nMachine Learning\n'), 'syllabus.txt');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data._id, 'fake-id-1');

  mock.restoreAll();
  await stopMockNlpServer(nlpServer);
});
