// Global test setup
import { jest } from '@jest/globals';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CLIENT_URL = 'http://localhost:5173';