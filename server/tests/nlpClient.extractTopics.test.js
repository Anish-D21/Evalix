import { test } from 'node:test';
import assert from 'node:assert';
import { startMockNlpServer, stopMockNlpServer } from './helpers/mockNlpServer.js';

test('extractTopics forwards a real multipart file upload and unwraps the response', async () => {
  const { server, url } = await startMockNlpServer({
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
  const { extractTopics } = await import('../services/nlpClient.js');

  const result = await extractTopics(Buffer.from('Unit 1: Test\nMachine Learning\n'), 'syllabus.txt', 'text/plain');
  assert.strictEqual(result.originalFileName, 'syllabus.txt');
  assert.strictEqual(result.units[0].topics[0], 'Machine Learning');

  await stopMockNlpServer(server);
});
