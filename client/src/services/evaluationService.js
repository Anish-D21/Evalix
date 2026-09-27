import api from './api.js';

/**
 * Service for Answer Evaluation.
 * Communicates with Node backend (/api/evaluations/evaluate).
 */

export function evaluateStudentAnswer(payload) {
  // payload: { question?, referenceAnswer?, rubric?, rubricId?, studentAnswer }
  return api.post('/evaluations/evaluate', payload).then((res) => res.data.data);
}
