import http from 'node:http';

/**
 * Starts a minimal local HTTP server that mimics the FastAPI NLP
 * service's {success, data, error} envelope for a configurable set of
 * routes. Used by nlpClient tests and controller/route tests so the
 * Node -> NLP communication layer is exercised end to end (real HTTP,
 * real JSON/multipart parsing) without depending on the actual Python
 * service being up during automated test runs.
 *
 * `handlers` maps "METHOD path" -> (req, body) => { status, body }.
 */
export function startMockNlpServer(handlers) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    const key = `${req.method} ${req.url}`;
    const handler = handlers[key];

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'no handler' } }));
      return;
    }

    let parsedBody = rawBody;
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json') && rawBody.length > 0) {
      parsedBody = JSON.parse(rawBody.toString('utf-8'));
    }

    const { status, body } = await handler(req, parsedBody);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

export function stopMockNlpServer(server) {
  return new Promise((resolve) => server.close(resolve));
}
