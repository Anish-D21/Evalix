import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import connectDB from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Phase 0: only the health route is wired up.
// Auth, syllabi, blueprints, questions, rubrics, exams, submissions,
// evaluations, and analytics routes are added in later phases.
app.use('/api/health', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] Evalix backend listening on port ${env.port}`);
  });
}

start();

export default app;
