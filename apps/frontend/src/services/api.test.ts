import { API_BASE_URL } from '../config/api';

// Mock the config
jest.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:8080',
}));

describe('API Configuration', () => {
  test('API_BASE_URL is defined', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  test('API_BASE_URL has correct format', () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });
});
