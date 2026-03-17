import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // For httpOnly cookies
});

// Response interceptor to handle token refresh logic globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const currentPath = window.location.pathname;
    const requestUrl: string = originalRequest?.url ?? '';

    // If error is 401 and it's not during the refresh call itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed/expired
        // Avoid redirecting from public routes (like Landing) and avoid hard reload loops.
        // Also don't redirect for the bootstrap auth check itself.
        const isPublicRoute = currentPath === '/' || currentPath === '/login';
        const isBootstrapAuthCheck = requestUrl === '/auth/me';

        if (!isPublicRoute && !isBootstrapAuthCheck && currentPath !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
