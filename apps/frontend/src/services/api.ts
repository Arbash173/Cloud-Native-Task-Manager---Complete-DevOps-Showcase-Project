import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: string;
}

export interface UpdateTaskRequest {
  title: string;
  description: string;
  status: string;
  priority: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

// API Client Class
class ApiClient {
  private authClient: AxiosInstance;
  private taskClient: AxiosInstance;
  private notificationClient: AxiosInstance;

  constructor() {
    // Create separate axios instances for each service
    this.authClient = axios.create({
      baseURL: API_ENDPOINTS.LOGIN.replace('/api/auth/login', ''),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.taskClient = axios.create({
      baseURL: API_ENDPOINTS.TASKS.replace('/api/tasks', ''),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.notificationClient = axios.create({
      baseURL: API_ENDPOINTS.NOTIFICATIONS.replace('/api/notifications', ''),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.addAuthInterceptor();
  }

  private addAuthInterceptor() {
    const addToken = (config: any) => {
      const token = this.getToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };

    this.authClient.interceptors.request.use(addToken);
    this.taskClient.interceptors.request.use(addToken);
    this.notificationClient.interceptors.request.use(addToken);
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  public setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('token');
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Auth Service Methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.authClient.post(
      '/api/auth/login',
      credentials
    );
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.authClient.post(
      '/api/auth/register',
      userData
    );
    return response.data;
  }

  async validateToken(): Promise<{ valid: boolean; user_id: number; username: string }> {
    const response = await this.authClient.get('/api/auth/validate');
    return response.data;
  }

  async getUser(): Promise<User> {
    const response: AxiosResponse<User> = await this.authClient.get('/api/auth/user');
    return response.data;
  }

  // Task Service Methods
  async getTasks(status?: string, priority?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);

    const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const response: AxiosResponse<Task[]> = await this.taskClient.get(url);
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response: AxiosResponse<Task> = await this.taskClient.get(`/api/tasks/${id}`);
    return response.data;
  }

  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    const response: AxiosResponse<Task> = await this.taskClient.post('/api/tasks', taskData);
    return response.data;
  }

  async updateTask(id: number, taskData: UpdateTaskRequest): Promise<Task> {
    const response: AxiosResponse<Task> = await this.taskClient.put(`/api/tasks/${id}`, taskData);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.taskClient.delete(`/api/tasks/${id}`);
  }

  // Notification Service Methods
  async getNotifications(): Promise<Notification[]> {
    const response: AxiosResponse<Notification[]> = await this.notificationClient.get('/api/notifications');
    return response.data;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await this.notificationClient.put(`/api/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.notificationClient.put('/api/notifications/read-all');
  }

  // Health Check Methods
  async checkAuthHealth(): Promise<{ status: string; service: string; timestamp: string }> {
    const response = await this.authClient.get('/health');
    return response.data;
  }

  async checkTaskHealth(): Promise<{ status: string; service: string; timestamp: string }> {
    const response = await this.taskClient.get('/health');
    return response.data;
  }

  async checkNotificationHealth(): Promise<{ status: string; service: string; timestamp: string }> {
    const response = await this.notificationClient.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
