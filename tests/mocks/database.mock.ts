// Mock database connections and models for isolated unit testing

import { Pool, PoolClient } from 'pg';

// Mock Pool client for database operations
export const mockPoolClient: Partial<PoolClient> = {
  query: jest.fn(),
  release: jest.fn(),
  end: jest.fn(),
};

// Mock Pool for database connection
export const mockPool: Partial<Pool> = {
  connect: jest.fn().mockResolvedValue(mockPoolClient),
  query: jest.fn(),
  end: jest.fn(),
};

// Helper to reset all database mocks
export function resetDatabaseMocks() {
  jest.clearAllMocks();
  (mockPool.query as jest.Mock).mockReset();
  (mockPool.connect as jest.Mock).mockReset();
  (mockPoolClient.query as jest.Mock).mockReset();
  (mockPoolClient.release as jest.Mock).mockReset();
}

// Mock database responses for common queries
export const mockDatabaseResponses = {
  // Mock vessel query response
  vessel: {
    id: 'vessel-123',
    name: 'Test Vessel',
    imoNumber: '1234567',
    deadweight: 25000,
    initialRobLsifo: null, // Will be set by first departure
    initialRobLsmgo: null,
    initialRobCylOil: null,
    initialRobMeOil: null,
    initialRobAeOil: null,
  },
  
  // Mock previous report response
  previousReport: {
    id: 'report-456',
    reportType: 'noon',
    currentRobLsifo: 1000,
    currentRobLsmgo: 500,
    currentRobCylOil: 100,
    currentRobMeOil: 200,
    currentRobAeOil: 150,
    totalDistanceTravelled: 500,
    meDailyRunHours: 20,
  },
  
  // Mock voyage data
  voyage: {
    id: 'voyage-789',
    vesselId: 'vessel-123',
    totalDistance: 1200,
    status: 'in_progress',
  },
};