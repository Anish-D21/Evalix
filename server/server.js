import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import env from './config/env.js';
import connectDB from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import syllabiRoutes from './routes/syllabi.routes.js';
import blueprintsRoutes from './routes/blueprints.routes.js';
import questionsRoutes from './routes/questions.routes.js';
import rubricsRoutes from './routes/rubrics.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Phase 0: only the health route was wired up.
// Phase 7: syllabi, blueprints, questions, and rubrics all forward to
// the NLP service (see services/nlpClient.js) and persist results to
// MongoDB. No auth middleware yet — that's Phase 8.
app.use('/api/health', healthRoutes);
app.use('/api/syllabi', syllabiRoutes);
app.use('/api/blueprints', blueprintsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/rubrics', rubricsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] Evalix backend listening on port ${env.port}`);
  });
}

// Only auto-start when run directly (`node server.js`), not when
// imported by tests (e.g. via supertest) — this guard means importing
// this module for testing never triggers a real MongoDB connection
// attempt or binds a real port as a side effect. Route/middleware
// registration above is completely unchanged from Phase 0's behavior.
//
// Comparing `import.meta.url` (a file:// URL, e.g.
// "file:///D:/Desktop/Evalix/evalix/server/server.js" on Windows)
// against a bare `file://${process.argv[1]}` string breaks on Windows,
// since process.argv[1] is a native path with a drive letter and
// backslashes ("D:\Desktop\..."), not a URL — the naive concatenation
// never matches. fileURLToPath() converts this module's own URL into a
// native OS path (correctly handling the drive letter and slash
// direction on Windows), and path.resolve() normalizes process.argv[1]
// the same way, so the comparison works identically on Windows, macOS,
// and Linux.
const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  start();
}

export default app;
export { start, connectDB };
