import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Stress test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '3m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1000ms
    http_req_failed: ['rate<0.2'],     // Error rate must be below 20%
    errors: ['rate<0.2'],              // Custom error rate must be below 20%
  },
};

// Base URLs
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:8080';
const TASK_URL = __ENV.TASK_URL || 'http://localhost:8081';
const NOTIFICATION_URL = __ENV.NOTIFICATION_URL || 'http://localhost:8082';

// Test data
const testUsers = [
  { username: 'stressuser1', email: 'stress1@example.com', password: 'stress123' },
  { username: 'stressuser2', email: 'stress2@example.com', password: 'stress123' },
  { username: 'stressuser3', email: 'stress3@example.com', password: 'stress123' },
];

let authTokens = [];

export function setup() {
  console.log('Setting up stress test...');
  
  // Register multiple test users
  testUsers.forEach((user, index) => {
    const registerPayload = JSON.stringify(user);
    const registerResponse = http.post(`${AUTH_URL}/api/auth/register`, registerPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerResponse.status === 201) {
      authTokens.push(JSON.parse(registerResponse.body).token);
    } else {
      // Try to login if user already exists
      const loginPayload = JSON.stringify({
        username: user.username,
        password: user.password
      });
      
      const loginResponse = http.post(`${AUTH_URL}/api/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResponse.status === 200) {
        authTokens.push(JSON.parse(loginResponse.body).token);
      }
    }
  });
  
  console.log(`Registered ${authTokens.length} test users`);
  return { authTokens };
}

export default function(data) {
  // Select a random auth token
  const token = data.authTokens[Math.floor(Math.random() * data.authTokens.length)];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Random test scenarios
  const scenario = Math.floor(Math.random() * 4);
  
  switch (scenario) {
    case 0:
      // Scenario 1: Heavy task operations
      performTaskOperations(headers);
      break;
    case 1:
      // Scenario 2: Auth operations
      performAuthOperations(headers);
      break;
    case 2:
      // Scenario 3: Notification operations
      performNotificationOperations(headers);
      break;
    case 3:
      // Scenario 4: Mixed operations
      performMixedOperations(headers);
      break;
  }

  // Random sleep
  sleep(Math.random() * 0.5 + 0.1); // Sleep between 0.1-0.6 seconds
}

function performTaskOperations(headers) {
  // Get tasks
  const tasksResponse = http.get(`${TASK_URL}/api/tasks`, { headers });
  check(tasksResponse, {
    'Get tasks status is 200': (r) => r.status === 200,
  });

  // Create multiple tasks rapidly
  for (let i = 0; i < 3; i++) {
    const taskPayload = JSON.stringify({
      title: `Stress Test Task ${Date.now()}-${i}`,
      description: 'Task created during stress testing',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
    
    const createResponse = http.post(`${TASK_URL}/api/tasks`, taskPayload, { headers });
    check(createResponse, {
      'Create task status is 201': (r) => r.status === 201,
    });
  }
}

function performAuthOperations(headers) {
  // Get user info multiple times
  for (let i = 0; i < 2; i++) {
    const userResponse = http.get(`${AUTH_URL}/api/auth/user`, { headers });
    check(userResponse, {
      'User info status is 200': (r) => r.status === 200,
    });
  }

  // Validate token
  const validateResponse = http.get(`${AUTH_URL}/api/auth/validate`, { headers });
  check(validateResponse, {
    'Token validation status is 200': (r) => r.status === 200,
  });
}

function performNotificationOperations(headers) {
  // Get notifications
  const notificationsResponse = http.get(`${NOTIFICATION_URL}/api/notifications`, { headers });
  check(notificationsResponse, {
    'Get notifications status is 200': (r) => r.status === 200,
  });

  // Mark notifications as read
  const markAllReadResponse = http.put(`${NOTIFICATION_URL}/api/notifications/read-all`, {}, { headers });
  check(markAllReadResponse, {
    'Mark all read status is 200': (r) => r.status === 200,
  });
}

function performMixedOperations(headers) {
  // Mix of different operations
  const operations = [
    () => http.get(`${AUTH_URL}/health`),
    () => http.get(`${TASK_URL}/health`),
    () => http.get(`${NOTIFICATION_URL}/health`),
    () => http.get(`${AUTH_URL}/api/auth/user`, { headers }),
    () => http.get(`${TASK_URL}/api/tasks`, { headers }),
    () => http.get(`${NOTIFICATION_URL}/api/notifications`, { headers }),
  ];

  // Perform random operations
  for (let i = 0; i < 3; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const response = operation();
    
    check(response, {
      'Mixed operation successful': (r) => r.status >= 200 && r.status < 300,
    });
  }
}

export function teardown(data) {
  console.log('Cleaning up stress test...');
  console.log('Stress test completed');
}
