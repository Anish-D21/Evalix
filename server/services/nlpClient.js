import axios from 'axios';
import env from '../config/env.js';

/**
 * Thin HTTP client for the FastAPI NLP microservice. Every function here
 * is a 1:1 pass-through to one NLP endpoint — no NLP logic (extraction,
 * allocation, template rendering, scoring, etc.) is duplicated in Node.
 * Node's job is orchestration and persistence only, per the spec's
 * architecture: React -> Express -> FastAPI, Express <-> MongoDB.
 *
 * Every function returns the NLP service's `data` payload directly (the
 * inner object of its {success, data, error} envelope) on success, and
 * throws an `NlpServiceError` on failure so callers can handle it with a
 * single catch block instead of repeating envelope-unwrapping logic.
 */

const client = axios.create({ baseURL: env.fastapiUrl, timeout: 30000 });

export class NlpServiceError extends Error {
  constructor(message, { statusCode = 502, code = 'NLP_SERVICE_ERROR', details = null } = {}) {
    super(message);
    this.name = 'NlpServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Unwraps the NLP service's {success, data, error} envelope, or raises
 * an NlpServiceError carrying the same code/message/status it returned. */
function unwrap(response) {
  const body = response.data;
  if (!body || body.success !== true) {
    throw new NlpServiceError(body?.error?.message || 'NLP service returned an unsuccessful response.', {
      statusCode: response.status,
      code: body?.error?.code || 'NLP_SERVICE_ERROR',
      details: body?.error || null,
    });
  }
  return body.data;
}

async function post(path, payload) {
  try {
    const response = await client.post(path, payload);
    return unwrap(response);
  } catch (err) {
    if (err instanceof NlpServiceError) throw err;
    if (err.response) {
      const body = err.response.data;
      throw new NlpServiceError(body?.error?.message || `NLP service returned status ${err.response.status}.`, {
        statusCode: err.response.status,
        code: body?.error?.code || 'NLP_SERVICE_ERROR',
        details: body?.error || null,
      });
    }
    throw new NlpServiceError(`Could not reach the NLP service: ${err.message}`, {
      statusCode: 503,
      code: 'NLP_SERVICE_UNREACHABLE',
    });
  }
}

/** GET /api/nlp/health */
export async function getNlpHealth() {
  const response = await client.get('/api/nlp/health');
  return response.data?.data ?? response.data;
}

/**
 * POST /api/nlp/extract-topics (multipart).
 * Uses Node's built-in fetch + FormData + Blob (stable since Node 18)
 * rather than adding the `form-data` package as a dependency.
 */
export async function extractTopics(fileBuffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimetype || 'application/octet-stream' }), filename);

  let response;
  try {
    response = await fetch(new URL('/api/nlp/extract-topics', env.fastapiUrl), { method: 'POST', body: form });
  } catch (err) {
    throw new NlpServiceError(`Could not reach the NLP service: ${err.message}`, {
      statusCode: 503,
      code: 'NLP_SERVICE_UNREACHABLE',
    });
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.success !== true) {
    throw new NlpServiceError(body?.error?.message || `NLP service returned status ${response.status}.`, {
      statusCode: response.status,
      code: body?.error?.code || 'NLP_SERVICE_ERROR',
      details: body?.error || null,
    });
  }
  return body.data;
}

/** POST /api/nlp/generate-blueprint */
export function generateBlueprint(payload) {
  return post('/api/nlp/generate-blueprint', payload);
}

/** POST /api/nlp/generate-questions */
export function generateQuestions(payload) {
  return post('/api/nlp/generate-questions', payload);
}

/** POST /api/nlp/generate-rubric-candidates */
export function generateRubricCandidates(payload) {
  return post('/api/nlp/generate-rubric-candidates', payload);
}

/** POST /api/nlp/evaluate-answer */
export function evaluateAnswer(payload) {
  return post('/api/nlp/evaluate-answer', payload);
}
