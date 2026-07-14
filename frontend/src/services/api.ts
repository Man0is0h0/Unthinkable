import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Match FastAPI port
  withCredentials: true, // IMPORTANT: Allows browser to send HttpOnly cookies automatically
});

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login on unauthenticated
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
