import { test } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('generateQuestions surfaces the NLP service error envelope on validation failure', async () => {
  const { server, url } = await startMockNlpServer({
    'POST /api/nlp/generate-questions': async () => ({
      status: 422,
      body: { success: false, data: null, error: { code: 'MISSING_TOPIC', message: 'requests[0]: topic must not be empty.' } },
    }),
  });
  process.env.FASTAPI_URL = url;
  const { generateQuestions, NlpServiceError } = await import('../services/nlpClient.js');

  await assert.rejects(
    () => generateQuestions({ requests: [{ topic: '', bloomLevel: 'remember', difficulty: 'easy', marks: 2 }] }),
    (err) => {
      assert.ok(err instanceof NlpServiceError);
      assert.strictEqual(err.code, 'MISSING_TOPIC');
      assert.strictEqual(err.statusCode, 422);
      return true;
    }
  );

  await stopMockNlpServer(server);
});
