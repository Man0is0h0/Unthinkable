import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // IMPORTANT: Allows browser to send HttpOnly cookies automatically
});

// Intercept failed requests and retry them once to handle Render/Neon cold starts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // Only retry once
    if (!config || config._retry) {
      return Promise.reject(error);
    }
    
    // Check if it's a network error (no response) or a 5xx server error
    if (!error.response || error.response.status >= 500) {
      config._retry = true;
      console.warn("Server might be waking up (Cold Start). Retrying request in 2 seconds...");
      // Wait 2 seconds for server to wake up
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(config);
    }
    return Promise.reject(error);
  }
);

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
