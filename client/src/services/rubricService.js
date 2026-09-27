import api from './api.js';

/**
 * Service for Rubric candidate generation, listing, updating, deleting, and approving.
 * Communicates with Node backend (/api/rubrics).
 */

export function generateRubric(payload) {
  // payload: { referenceAnswer, totalMarks, questionId? }
  return api.post('/rubrics/generate', payload).then((res) => res.data.data);
}

export function createRubric(payload) {
  // payload: { questionId?, totalMarks, concepts, relationships? }
  return api.post('/rubrics', payload).then((res) => res.data.data);
}

export function listRubrics(params = {}) {
  return api.get('/rubrics', { params }).then((res) => res.data.data);
}

export function getRubric(id) {
  return api.get(`/rubrics/${id}`).then((res) => res.data.data);
}

export function updateRubric(id, updates) {
  return api.put(`/rubrics/${id}`, updates).then((res) => res.data.data);
}

export function deleteRubric(id) {
  return api.delete(`/rubrics/${id}`).then((res) => res.data.data);
}

export function approveRubric(id) {
  return api.post(`/rubrics/${id}/approve`).then((res) => res.data.data);
}
