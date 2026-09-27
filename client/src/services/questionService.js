import api from './api.js';

/**
 * Service for Question generation, listing, updating, deleting, and approving.
 * Communicates with Node backend (/api/questions).
 */

export function generateQuestions(payload) {
  // payload: { requests: [{ topicId, topicName, bloomLevel, difficulty, marks, questionType? }], examId? }
  return api.post('/questions/generate', payload).then((res) => res.data.data);
}

export function listQuestions(params = {}) {
  return api.get('/questions', { params }).then((res) => res.data.data);
}

export function getQuestion(id) {
  return api.get(`/questions/${id}`).then((res) => res.data.data);
}

export function updateQuestion(id, updates) {
  return api.put(`/questions/${id}`, updates).then((res) => res.data.data);
}

export function deleteQuestion(id) {
  return api.delete(`/questions/${id}`).then((res) => res.data.data);
}

export function approveQuestion(id) {
  return api.post(`/questions/${id}/approve`).then((res) => res.data.data);
}
