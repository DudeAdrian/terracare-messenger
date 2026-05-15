/**
 * Test Setup
 * 
 * Global test configuration and mocks
 */

// Mock localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value;
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock window.ethereum for wallet tests
global.window = {
  ethereum: {
    request: jest.fn(),
    on: jest.fn()
  }
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
