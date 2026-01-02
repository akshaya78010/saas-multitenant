import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  registerTenant: (data) => api.post('/auth/register-tenant', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Tenant APIs
export const tenantAPI = {
  getTenant: (tenantId) => api.get(`/tenants/${tenantId}`),
  updateTenant: (tenantId, data) => api.put(`/tenants/${tenantId}`, data),
  listTenants: (params) => api.get('/tenants', { params }),
};

// User APIs
export const userAPI = {
  addUser: (tenantId, data) => api.post(`/tenants/${tenantId}/users`, data),
  listUsers: (tenantId, params) => api.get(`/tenants/${tenantId}/users`, { params }),
  updateUser: (userId, data) => api.put(`/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

// Project APIs
export const projectAPI = {
  createProject: (data) => api.post('/projects', data),
  listProjects: (params) => api.get('/projects', { params }),
  updateProject: (projectId, data) => api.put(`/projects/${projectId}`, data),
  deleteProject: (projectId) => api.delete(`/projects/${projectId}`),
};

// Task APIs
export const taskAPI = {
  createTask: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  listTasks: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  updateTaskStatus: (taskId, status) => api.patch(`/tasks/${taskId}/status`, { status }),
  updateTask: (taskId, data) => api.put(`/tasks/${taskId}`, data),
};

export default api;

