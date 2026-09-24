import axios from 'axios';

// Centralized Axios instance. The frontend only ever talks to the Node
// backend — it must never call MongoDB or the FastAPI NLP service directly.
//
// Deliberately no default Content-Type header here. Axios sets the
// correct one automatically per request based on the body it's given:
// 'application/json' for a plain JS object (e.g. blueprint/question
// config), or the correct 'multipart/form-data; boundary=...' for a
// FormData body (e.g. syllabus file upload) — but only when nothing
// else has already forced a Content-Type. A hardcoded 'application/json'
// default here previously overrode FormData's boundary, which silently
// broke every file upload (confirmed: multer never saw it as multipart,
// so req.file/req.body came back empty).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export function getErrorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'Something went wrong. Please try again.';
}

export default api;
