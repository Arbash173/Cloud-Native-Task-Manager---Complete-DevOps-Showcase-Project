import { API_ENDPOINTS } from '../config/api';

describe('API Configuration', () => {
  test('API_ENDPOINTS is defined', () => {
    expect(API_ENDPOINTS).toBeDefined();
    expect(typeof API_ENDPOINTS).toBe('object');
  });

  test('API_ENDPOINTS has required endpoints', () => {
    expect(API_ENDPOINTS.LOGIN).toBeDefined();
    expect(API_ENDPOINTS.TASKS).toBeDefined();
    expect(API_ENDPOINTS.NOTIFICATIONS).toBeDefined();
  });
});
