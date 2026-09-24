import api from './api.js';

export function generateBlueprint(payload) {
  return api.post('/blueprints/generate', payload).then((res) => res.data.data);
}

export function getBlueprint(id) {
  return api.get(`/blueprints/${id}`).then((res) => res.data.data);
}

export function updateBlueprint(id, updates) {
  return api.put(`/blueprints/${id}`, updates).then((res) => res.data.data);
}
