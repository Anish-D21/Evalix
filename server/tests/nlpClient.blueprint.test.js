import { test } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

// Each nlpClient scenario lives in its own file: nlpClient.js reads
// FASTAPI_URL at module-load time (its axios instance's baseURL is
// fixed once created), and Node's test runner isolates process.env
// fully between separate test FILES (verified empirically) but not
// reliably between concurrently-scheduled top-level tests within one
// file — one file per scenario sidesteps that entirely rather than
// fighting it.

test('generateBlueprint unwraps a successful NLP response', async () => {
  const { server, url } = await startMockNlpServer({
    'POST /api/nlp/generate-blueprint': async () => ({
      status: 200,
      body: {
        success: true,
        data: { totalMarks: 50, totalQuestions: 10, units: [], difficulty: [], bloom: [], warnings: [] },
        error: null,
      },
    }),
  });
  process.env.FASTAPI_URL = url;
  const { generateBlueprint } = await import('../services/nlpClient.js');

  const result = await generateBlueprint({
    totalMarks: 50,
    totalQuestions: 10,
    units: [],
    difficultyDistribution: {},
    bloomDistribution: {},
  });
  assert.strictEqual(result.totalMarks, 50);

  await stopMockNlpServer(server);
});
