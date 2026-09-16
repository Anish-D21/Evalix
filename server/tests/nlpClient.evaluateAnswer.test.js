import { test } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('evaluateAnswer unwraps a successful NLP response', async () => {
  const { server, url } = await startMockNlpServer({
    'POST /api/nlp/evaluate-answer': async () => ({
      status: 200,
      body: { success: true, data: { overallScore: 4.5, maxScore: 5, confidence: 'High' }, error: null },
    }),
  });
  process.env.FASTAPI_URL = url;
  const { evaluateAnswer } = await import('../services/nlpClient.js');

  const result = await evaluateAnswer({
    rubric: { totalMarks: 5, concepts: [{ id: 'c1', name: 'Test', marks: 5 }] },
    studentAnswer: 'Test answer',
  });
  assert.strictEqual(result.overallScore, 4.5);

  await stopMockNlpServer(server);
});
