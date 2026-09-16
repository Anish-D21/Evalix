import { test, mock } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('POST /api/rubrics/generate forwards to the NLP service and persists a draft rubric', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'POST /api/nlp/generate-rubric-candidates': async (req, body) => {
      assert.ok(body.referenceAnswer.length > 0);
      return {
        status: 200,
        body: {
          success: true,
          data: {
            concepts: [{ id: 'machine_learning', name: 'Machine Learning', description: '', marks: 5, importance: 'medium', acceptablePhrases: ['Machine Learning'] }],
            overlapWarnings: [],
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
  const { default: Rubric } = await import('../models/Rubric.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Rubric, 'create', async (payload) => ({ _id: 'rubric-1', ...payload }));
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app)
    .post('/api/rubrics/generate')
    .send({ referenceAnswer: 'Machine Learning is a subset of AI.', totalMarks: 5 });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.rubric.approved, false);
  assert.strictEqual(res.body.data.rubric.concepts[0].name, 'Machine Learning');

  mock.restoreAll();
  await stopMockNlpServer(nlpServer);
});

test('POST /api/rubrics/generate returns 400 for an empty reference answer', async () => {
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).post('/api/rubrics/generate').send({ referenceAnswer: '' });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'MISSING_REFERENCE_ANSWER');
});

test('POST /api/rubrics/:id/approve rejects when concept marks do not sum to totalMarks', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Rubric } = await import('../models/Rubric.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Rubric, 'findById', async () => ({
    _id: 'rubric-2',
    totalMarks: 10,
    concepts: [{ id: 'c1', name: 'Only Concept', marks: 5 }],
    approved: false,
    save: async function () {
      return this;
    },
  }));
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).post('/api/rubrics/rubric-2/approve');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'RUBRIC_MARKS_MISMATCH');

  mock.restoreAll();
});

test('POST /api/rubrics/:id/approve succeeds when concept marks sum matches totalMarks', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Rubric } = await import('../models/Rubric.js');
  const { default: mongoose } = await import('mongoose');

  const doc = {
    _id: 'rubric-3',
    totalMarks: 10,
    concepts: [{ id: 'c1', name: 'Concept A', marks: 6 }, { id: 'c2', name: 'Concept B', marks: 4 }],
    approved: false,
    save: async function () {
      this.approved = true;
      return this;
    },
  };
  mock.method(Rubric, 'findById', async () => doc);
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).post('/api/rubrics/rubric-3/approve');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.approved, true);

  mock.restoreAll();
});
