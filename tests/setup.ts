// Global test setup file
// This file is run before each test file

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Silence console.log and console.warn during tests unless explicitly testing them
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Keep console.error for debugging test failures
});

afterEach(() => {
  // Restore console methods after each test
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
});

// Custom matcher for floating point comparisons in calculations
expect.extend({
  toBeCloseToNumber(received: number, expected: number, precision = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be close to ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be close to ${expected} (within ${precision} decimal places)`,
        pass: false,
      };
    }
  },
});

// Extend jest matchers interface
export {};