import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directories
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverage: false, // Enable manually with --coverage flag
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts', // Exclude main entry point
    '!src/db/setup-pg.ts', // Exclude database setup
    '!src/**/*.interface.ts', // Exclude type-only files
  ],
  
  // Coverage thresholds - aim high for calculation modules
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher standards for calculation modules
    './src/services/bunker_calculator.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    },
    './src/services/distance_calculator.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    },
    './src/services/report/helpers/cargo-calculator.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Timeout for tests (30 seconds for integration tests that might hit database)
  testTimeout: 30000,
  
  // Module name mapping for cleaner imports in tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};

export default config;