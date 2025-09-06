import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate must be below 10%
  },
};

// Base URLs - these should be set via environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:8080';
const TASK_URL = __ENV.TASK_URL || 'http://localhost:8081';
const NOTIFICATION_URL = __ENV.NOTIFICATION_URL || 'http://localhost:8082';

// Test data
const testUser = {
  username: 'loadtest',
  email: 'loadtest@example.com',
  password: 'loadtest123'
};

let authToken = '';

export function setup() {
  console.log('Setting up load test...');
  
  // Register test user
  const registerPayload = JSON.stringify(testUser);
  const registerResponse = http.post(`${AUTH_URL}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerResponse.status !== 201) {
    console.log('User might already exist, trying to login...');
    
    // Try to login
    const loginPayload = JSON.stringify({
      username: testUser.username,
      password: testUser.password
    });
    
    const loginResponse = http.post(`${AUTH_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginResponse.status === 200) {
      authToken = JSON.parse(loginResponse.body).token;
    } else {
      console.error('Failed to authenticate test user');
      return null;
    }
  } else {
    authToken = JSON.parse(registerResponse.body).token;
  }
  
  console.log('Test user authenticated successfully');
  return { authToken };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.authToken}`,
  };

  // Test 1: Health checks
  const healthChecks = [
    { name: 'Auth Health', url: `${AUTH_URL}/health` },
    { name: 'Task Health', url: `${TASK_URL}/health` },
    { name: 'Notification Health', url: `${NOTIFICATION_URL}/health` },
  ];

  healthChecks.forEach(healthCheck => {
    const response = http.get(healthCheck.url);
    const success = check(response, {
      [`${healthCheck.name} status is 200`]: (r) => r.status === 200,
      [`${healthCheck.name} response time < 200ms`]: (r) => r.timings.duration < 200,
    });
    
    if (!success) {
      errorRate.add(1);
    }
  });

  // Test 2: Get user info
  const userResponse = http.get(`${AUTH_URL}/api/auth/user`, { headers });
  check(userResponse, {
    'User info status is 200': (r) => r.status === 200,
    'User info response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test 3: Get tasks
  const tasksResponse = http.get(`${TASK_URL}/api/tasks`, { headers });
  check(tasksResponse, {
    'Get tasks status is 200': (r) => r.status === 200,
    'Get tasks response time < 400ms': (r) => r.timings.duration < 400,
  });

  // Test 4: Create a task
  const taskPayload = JSON.stringify({
    title: `Load Test Task ${Date.now()}`,
    description: 'Task created during load testing',
    priority: 'medium'
  });
  
  const createTaskResponse = http.post(`${TASK_URL}/api/tasks`, taskPayload, { headers });
  const createTaskSuccess = check(createTaskResponse, {
    'Create task status is 201': (r) => r.status === 201,
    'Create task response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test 5: Get notifications
  const notificationsResponse = http.get(`${NOTIFICATION_URL}/api/notifications`, { headers });
  check(notificationsResponse, {
    'Get notifications status is 200': (r) => r.status === 200,
    'Get notifications response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test 6: Update task (if we successfully created one)
  if (createTaskSuccess && createTaskResponse.status === 201) {
    const taskId = JSON.parse(createTaskResponse.body).id;
    const updatePayload = JSON.stringify({
      title: `Updated Load Test Task ${Date.now()}`,
      description: 'Updated task description',
      status: 'in-progress',
      priority: 'high'
    });
    
    const updateTaskResponse = http.put(`${TASK_URL}/api/tasks/${taskId}`, updatePayload, { headers });
    check(updateTaskResponse, {
      'Update task status is 200': (r) => r.status === 200,
      'Update task response time < 500ms': (r) => r.timings.duration < 500,
    });
  }

  // Test 7: Frontend page load (if available)
  const frontendResponse = http.get(BASE_URL);
  check(frontendResponse, {
    'Frontend page loads': (r) => r.status === 200,
    'Frontend response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // Random sleep between requests
  sleep(Math.random() * 2 + 1); // Sleep between 1-3 seconds
}

export function teardown(data) {
  console.log('Cleaning up load test...');
  
  // Clean up test data if needed
  // Note: In a real scenario, you might want to clean up test tasks
  console.log('Load test completed');
}
