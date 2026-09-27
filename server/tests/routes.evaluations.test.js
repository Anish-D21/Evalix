import { test, mock } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('POST /api/evaluations/evaluate forwards to NLP service and returns evaluation result', async () => {
  const { server: nlpServer, url } = await startMockNlpServer({
    'POST /api/nlp/evaluate-answer': async (req, body) => {
      assert.ok(body.rubric);
      assert.strictEqual(body.studentAnswer, 'Machine Learning is a subset of AI.');
      return {
        status: 200,
        body: {
          success: true,
          data: {
            overallScore: 4.5,
            maxScore: 5.0,
            conceptCoverageScore: 90.0,
            relationshipScore: 100.0,
            semanticUnderstandingScore: 88.0,
            coveredConcepts: [
              {
                id: 'c1',
                name: 'Machine Learning definition',
                marks: 5.0,
                awardedMarks: 4.5,
                similarity: 0.92,
                coverage: 'full',
                importance: 'critical',
                evidence: 'Machine Learning is a subset of AI.',
              },
            ],
            partialConcepts: [],
            missingConcepts: [],
            relationships: [],
            misconceptions: [],
            overallFeedback: 'Demonstrates clear conceptual understanding.',
            strengths: ['Identified core definition accurately.'],
            improvementAreas: [],
            revisionRecommendations: [],
            confidence: 'High',
            rubricWarnings: [],
          },
          error: null,
        },
      };
    },
  });
  process.env.FASTAPI_URL = url;

  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app)
    .post('/api/evaluations/evaluate')
    .send({
      studentAnswer: 'Machine Learning is a subset of AI.',
      rubric: {
        totalMarks: 5,
        concepts: [{ id: 'c1', name: 'Machine Learning definition', marks: 5, importance: 'critical' }],
      },
    });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.overallScore, 4.5);
  assert.strictEqual(res.body.data.confidence, 'High');

  mock.restoreAll();
  await stopMockNlpServer(nlpServer);
});

test('POST /api/evaluations/evaluate rejects when studentAnswer is missing', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app)
    .post('/api/evaluations/evaluate')
    .send({
      rubric: {
        totalMarks: 5,
        concepts: [{ id: 'c1', name: 'Concept A', marks: 5 }],
      },
    });

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'MISSING_STUDENT_ANSWER');
});
