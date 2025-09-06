import React, { useState } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { CreateTaskRequest, UpdateTaskRequest } from '../services/api';

const TaskList: React.FC = () => {
  const { tasks, isLoading, error, fetchTasks, createTask, updateTask, deleteTask } = useTasks();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      });
      setFormData({ title: '', description: '', status: 'pending', priority: 'medium' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await updateTask(editingTask, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
      });
      setEditingTask(null);
      setFormData({ title: '', description: '', status: 'pending', priority: 'medium' });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const startEdit = (task: any) => {
    setEditingTask(task.id);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
    });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', status: 'pending', priority: 'medium' });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTasks(newFilters.status || undefined, newFilters.priority || undefined);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Tasks</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Task'}
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex gap-2">
            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              className="form-control"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="card mb-3">
          <div className="card-header">
            <h3 className="card-title">Create New Task</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Form */}
      {editingTask && (
        <div className="card mb-3">
          <div className="card-header">
            <h3 className="card-title">Edit Task</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleUpdateTask}>
              <div className="form-group">
                <label htmlFor="edit-title">Title</label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-priority">Priority</label>
                <select
                  id="edit-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success">
                  Update Task
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="loading">Loading tasks...</div>
      ) : (
        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="card">
              <div className="card-body text-center">
                <p className="text-muted">No tasks found. Create your first task!</p>
              </div>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <div>
                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-description">{task.description}</p>
                    <small className="text-muted">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                      {task.updated_at !== task.created_at && (
                        <> • Updated: {new Date(task.updated_at).toLocaleDateString()}</>
                      )}
                    </small>
                  </div>
                  <div className="task-meta">
                    <span className={`task-status ${task.status}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                    <span className={`task-priority ${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                
                <div className="task-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => startEdit(task)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TaskList;
