import { Router } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import env from '../config/env.js';
import { success } from '../utils/apiResponse.js';

const router = Router();

// GET /api/health
// Reports the backend's own status plus a best-effort check of its
// downstream dependencies (Mongo, FastAPI). Used by the frontend badge
// and by uptime checks once deployed.
router.get('/', async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected

  let nlpStatus = 'unknown';
  try {
    await axios.get(`${env.fastapiUrl}/api/nlp/health`, { timeout: 2000 });
    nlpStatus = 'online';
  } catch {
    nlpStatus = 'offline';
  }

  return success(res, {
    service: 'evalix-server',
    status: 'ok',
    database: dbState === 1 ? 'connected' : 'disconnected',
    nlpService: nlpStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
