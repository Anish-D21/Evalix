import { test, mock } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('POST /api/questions/generate forwards to the NLP service and persists each question', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'POST /api/nlp/generate-questions': async (req, body) => {
      assert.strictEqual(body.requests.length, 1);
      return {
        status: 200,
        body: {
          success: true,
          data: {
            questions: [
              {
                topicId: null,
                topicName: 'Machine Learning',
                text: 'Define Machine Learning.',
                marks: 2,
                difficulty: 'easy',
                bloomLevel: 'remember',
                questionType: 'descriptive',
                status: 'draft',
                validation: { valid: true, issues: [] },
              },
            ],
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
  const { default: Question } = await import('../models/Question.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Question, 'insertMany', async (docs) => docs.map((d, i) => ({ _id: `q-${i}`, ...d })));
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app)
    .post('/api/questions/generate')
    .send({ requests: [{ topic: 'Machine Learning', bloomLevel: 'remember', difficulty: 'easy', marks: 2 }] });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.questions.length, 1);
  assert.strictEqual(res.body.data.questions[0].text, 'Define Machine Learning.');
  assert.strictEqual(res.body.data.questions[0].status, 'draft');

  mock.restoreAll();
  await stopMockNlpServer(nlpServer);
});

test('POST /api/questions/generate returns 400 when requests is empty', async () => {
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).post('/api/questions/generate').send({ requests: [] });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'MISSING_REQUESTS');
});
