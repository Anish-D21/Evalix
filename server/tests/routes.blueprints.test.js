import { test, mock } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('POST /api/blueprints/generate forwards to the NLP service and persists the result', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'POST /api/nlp/generate-blueprint': async (req, body) => {
      assert.strictEqual(body.totalMarks, 50);
      return {
        status: 200,
        body: {
          success: true,
          data: {
            totalMarks: 50,
            totalQuestions: 10,
            units: [{ unitNumber: 1, title: 'Only Unit', percentage: 100, questionCount: 10, marks: 50 }],
            difficulty: [{ label: 'easy', percentage: 40, questionCount: 4, marks: 20 }],
            bloom: [{ label: 'remember', percentage: 100, questionCount: 10, marks: 50 }],
            warnings: [],
          },
          error: null,
        },
      };
    },
  });
  process.env.FASTAPI_URL = url;

  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Blueprint } = await import('../models/Blueprint.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Blueprint, 'create', async (payload) => ({ _id: 'bp-1', ...payload }));
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app)
    .post('/api/blueprints/generate')
    .send({
      totalMarks: 50,
      totalQuestions: 10,
      units: [{ unitNumber: 1, title: 'Only Unit', weightage: 100 }],
      difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
      bloomDistribution: { remember: 100 },
    });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.totalMarks, 50);
  assert.strictEqual(res.body.data._id, 'bp-1');

  mock.restoreAll();
  await stopMockNlpServer(nlpServer);
});

test('POST /api/blueprints/generate returns 400 when units is missing', async () => {
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).post('/api/blueprints/generate').send({ totalMarks: 50, totalQuestions: 10 });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'MISSING_UNITS');
});
