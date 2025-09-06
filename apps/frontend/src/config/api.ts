// API Configuration with Environment Variables
// This solves the API connectivity issue by using proper environment configuration

const API_CONFIG = {
  // Auth Service API
  AUTH_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  
  // Task Service API
  TASK_BASE_URL: process.env.REACT_APP_TASK_API_URL || 'http://localhost:8081',
  
  // Notification Service API
  NOTIFICATION_BASE_URL: process.env.REACT_APP_NOTIFICATION_API_URL || 'http://localhost:8082',
  
  // Application Configuration
  APP_NAME: process.env.REACT_APP_APP_NAME || 'Task Manager',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_CONFIG.AUTH_BASE_URL}/api/auth/login`,
  REGISTER: `${API_CONFIG.AUTH_BASE_URL}/api/auth/register`,
  VALIDATE_TOKEN: `${API_CONFIG.AUTH_BASE_URL}/api/auth/validate`,
  GET_USER: `${API_CONFIG.AUTH_BASE_URL}/api/auth/user`,
  
  // Task endpoints
  TASKS: `${API_CONFIG.TASK_BASE_URL}/api/tasks`,
  TASK_BY_ID: (id: number) => `${API_CONFIG.TASK_BASE_URL}/api/tasks/${id}`,
  
  // Notification endpoints
  NOTIFICATIONS: `${API_CONFIG.NOTIFICATION_BASE_URL}/api/notifications`,
  MARK_NOTIFICATION_READ: (id: number) => `${API_CONFIG.NOTIFICATION_BASE_URL}/api/notifications/${id}/read`,
  MARK_ALL_READ: `${API_CONFIG.NOTIFICATION_BASE_URL}/api/notifications/read-all`,
};

// Health check endpoints
export const HEALTH_ENDPOINTS = {
  AUTH: `${API_CONFIG.AUTH_BASE_URL}/health`,
  TASK: `${API_CONFIG.TASK_BASE_URL}/health`,
  NOTIFICATION: `${API_CONFIG.NOTIFICATION_BASE_URL}/health`,
};

export default API_CONFIG;
