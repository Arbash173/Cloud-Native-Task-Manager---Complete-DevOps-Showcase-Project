import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, Task, CreateTaskRequest, UpdateTaskRequest } from '../services/api';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (status?: string, priority?: string) => Promise<void>;
  createTask: (taskData: CreateTaskRequest) => Promise<void>;
  updateTask: (id: number, taskData: UpdateTaskRequest) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  getTaskStats: () => { total: number; pending: number; inProgress: number; completed: number };
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async (status?: string, priority?: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const fetchedTasks = await apiClient.getTasks(status, priority);
      setTasks(fetchedTasks);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMessage);
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (taskData: CreateTaskRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const newTask = await apiClient.createTask(taskData);
      setTasks(prevTasks => [newTask, ...prevTasks]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: number, taskData: UpdateTaskRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const updatedTask = await apiClient.updateTask(id, taskData);
      setTasks(prevTasks => 
        prevTasks.map(task => task.id === id ? updatedTask : task)
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await apiClient.deleteTask(id);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    const inProgress = tasks.filter(task => task.status === 'in-progress').length;
    const completed = tasks.filter(task => task.status === 'completed').length;

    return { total, pending, inProgress, completed };
  };

  // Fetch tasks on mount
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      fetchTasks();
    }
  }, []);

  const value: TaskContextType = {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskStats,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
