import { test } from 'node:test';
import assert from 'node:assert';

test('generateRubricCandidates throws NlpServiceError when the service is unreachable', async () => {
  // Point at a port nothing is listening on.
  process.env.FASTAPI_URL = 'http://127.0.0.1:1';
  const { generateRubricCandidates, NlpServiceError } = await import('../services/nlpClient.js');

  await assert.rejects(
    () => generateRubricCandidates({ referenceAnswer: 'Machine Learning is a subset of AI.' }),
    (err) => {
      assert.ok(err instanceof NlpServiceError);
      assert.strictEqual(err.code, 'NLP_SERVICE_UNREACHABLE');
      assert.strictEqual(err.statusCode, 503);
      return true;
    }
  );
});
