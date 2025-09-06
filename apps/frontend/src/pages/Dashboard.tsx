import React, { useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { useNotifications } from '../contexts/NotificationContext';

const Dashboard: React.FC = () => {
  const { tasks, getTaskStats, fetchTasks } = useTasks();
  const { notifications, unreadCount, fetchNotifications } = useNotifications();

  useEffect(() => {
    fetchTasks();
    fetchNotifications();
  }, [fetchTasks, fetchNotifications]);

  const stats = getTaskStats();

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="mb-3">Welcome to your Task Manager dashboard!</p>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="stats-card">
          <div className="stats-number">{stats.total}</div>
          <div className="stats-label">Total Tasks</div>
        </div>
        
        <div className="stats-card">
          <div className="stats-number">{stats.pending}</div>
          <div className="stats-label">Pending Tasks</div>
        </div>
        
        <div className="stats-card">
          <div className="stats-number">{stats.inProgress}</div>
          <div className="stats-label">In Progress</div>
        </div>
        
        <div className="stats-card">
          <div className="stats-number">{stats.completed}</div>
          <div className="stats-label">Completed</div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">Recent Tasks</h3>
        </div>
        <div className="card-body">
          {tasks.length === 0 ? (
            <p className="text-center text-muted">No tasks yet. Create your first task!</p>
          ) : (
            <div className="task-list">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-header">
                    <div>
                      <h4 className="task-title">{task.title}</h4>
                      <p className="task-description">{task.description}</p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">
            Notifications 
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-2">{unreadCount}</span>
            )}
          </h3>
        </div>
        <div className="card-body">
          {notifications.length === 0 ? (
            <p className="text-center text-muted">No notifications</p>
          ) : (
            <div className="notification-list">
              {notifications.slice(0, 5).map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-header">
                    <h5 className="notification-title">{notification.title}</h5>
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <span className={`notification-type ${notification.type}`}>
                    {notification.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
