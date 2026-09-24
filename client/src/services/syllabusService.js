import api from './api.js';

// Thin wrappers around the existing `api` instance — no raw axios
// config scattered in components. Each function returns the unwrapped
// `data` payload from the backend's {success, data, error} envelope on
// success; on failure the promise rejects with the original AxiosError
// (use `getErrorMessage` from api.js in the calling component to show
// a message).

export function uploadSyllabus(file, title) {
  const formData = new FormData();
  formData.append('file', file);
  if (title && title.trim()) {
    formData.append('title', title.trim());
  }
  return api.post('/syllabi', formData).then((res) => res.data.data);
}

export function listSyllabi() {
  return api.get('/syllabi').then((res) => res.data.data);
}

export function getSyllabus(id) {
  return api.get(`/syllabi/${id}`).then((res) => res.data.data);
}

export function updateSyllabus(id, updates) {
  return api.put(`/syllabi/${id}`, updates).then((res) => res.data.data);
}

export function deleteSyllabus(id) {
  return api.delete(`/syllabi/${id}`).then((res) => res.data.data);
}
