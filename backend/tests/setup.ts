/**
 * Jest test setup configuration
 */

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});