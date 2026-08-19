import axios from 'axios';

// Centralized Axios instance. The frontend only ever talks to the Node
// backend — it must never call MongoDB or the FastAPI NLP service directly.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
