// Test data fixtures for consistent testing across modules

import { BerthSpecificData, DepartureSpecificData } from '../../src/types/report';
import { Vessel } from '../../src/types/vessel';
import { Report } from '../../src/types/report';

// Test vessel data
export const mockVessel: Vessel = {
  id: 'vessel-123',
  name: 'MV Test Ship',
  flag: 'TEST',
  imoNumber: '1234567',
  type: 'Container Ship',
  deadweight: 25000,
  captainId: 'captain-456',
  initialRobLsifo: null,
  initialRobLsmgo: null,
  initialRobCylOil: null,
  initialRobMeOil: null,
  initialRobAeOil: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isActive: true,
  lastDestinationPort: null,
};

// Test vessel with established initial ROBs
export const mockVesselWithInitialRobs: Vessel = {
  ...mockVessel,
  initialRobLsifo: 2000,
  initialRobLsmgo: 1000,
  initialRobCylOil: 500,
  initialRobMeOil: 800,
  initialRobAeOil: 600,
};

// Mock departure report data
export const mockDepartureReportData: Partial<Report & DepartureSpecificData> = {
  id: 'report-departure-001',
  reportType: 'departure',
  voyageId: 'voyage-789',
  cargoQuantity: 20000,
  currentRobLsifo: 1950,
  currentRobLsmgo: 975,
  currentRobCylOil: 485,
  currentRobMeOil: 785,
  currentRobAeOil: 588,
  totalDistanceTravelled: 15,
  reportDate: '2024-01-15',
  reportTime: '08:00:00',
  status: 'approved'
};

// Mock berth reports for testing cargo calculations
export const mockBerthReport1 = {
  id: 'report-berth-001',
  reportType: 'berth',
  voyageId: 'voyage-789',
  cargoLoaded: 5000,
  cargoUnloaded: 0,
  cargoQuantity: 25000, // 20000 + 5000
  reportDate: '2024-01-16',
  reportTime: '14:00:00',
  status: 'approved'
} as any;

export const mockBerthReport2 = {
  id: 'report-berth-002',
  reportType: 'berth',
  voyageId: 'voyage-789',
  cargoLoaded: 0,
  cargoUnloaded: 3000,
  cargoQuantity: 22000, // 25000 - 3000
  reportDate: '2024-01-17',
  reportTime: '10:00:00',
  status: 'approved'
} as any;

export const mockBerthReport3 = {
  id: 'report-berth-003',
  reportType: 'berth',
  voyageId: 'voyage-789',
  cargoLoaded: 2000,
  cargoUnloaded: 4000,
  cargoQuantity: 20000, // 22000 + 2000 - 4000
  reportDate: '2024-01-18',
  reportTime: '16:00:00',
  status: 'approved'
} as any;

// Mock noon report for testing
export const mockNoonReport: Partial<Report> = {
  id: 'report-noon-001',
  reportType: 'noon',
  voyageId: 'voyage-789',
  currentRobLsifo: 1800,
  currentRobLsmgo: 900,
  currentRobCylOil: 450,
  currentRobMeOil: 750,
  currentRobAeOil: 550,
  totalDistanceTravelled: 250,
  meDailyRunHours: 22,
  reportDate: '2024-01-16',
  reportTime: '12:00:00',
  status: 'approved'
};

// Mock arrival report
export const mockArrivalReport: Partial<Report> = {
  id: 'report-arrival-001',
  reportType: 'arrival',
  voyageId: 'voyage-789',
  currentRobLsifo: 1200,
  currentRobLsmgo: 700,
  currentRobCylOil: 350,
  currentRobMeOil: 600,
  currentRobAeOil: 450,
  totalDistanceTravelled: 1200,
  meDailyRunHours: 18,
  reportDate: '2024-01-20',
  reportTime: '06:00:00',
  status: 'approved'
};

// Voyage data
export const mockVoyageData = {
  id: 'voyage-789',
  vesselId: 'vessel-123',
  departurePort: 'Rotterdam',
  arrivalPort: 'Singapore',
  totalDistance: 1200,
  status: 'in_progress',
};

// Edge case test data
export const mockVesselWithLowDeadweight: Vessel = {
  ...mockVessel,
  deadweight: 1000, // Very low deadweight for testing validation
};

export const mockVesselWithNullDeadweight = {
  ...mockVessel,
  deadweight: null,
} as any;

// Helper function to create a berth input for testing
export function createBerthInput(loaded: number = 0, unloaded: number = 0) {
  return {
    cargoLoaded: loaded,
    cargoUnloaded: unloaded,
    reportType: 'berth',
    berthName: 'Test Berth',
    operationType: loaded > 0 ? 'loading' : 'discharging',
  } as any;
}

// Helper function to create departure input
export function createDepartureInput(cargoQuantity: number, initialRobs?: any) {
  return {
    reportType: 'departure',
    cargoQuantity,
    initialRobLsifo: initialRobs?.lsifo ?? 2000,
    initialRobLsmgo: initialRobs?.lsmgo ?? 1000,
    initialRobCylOil: initialRobs?.cylOil ?? 500,
    initialRobMeOil: initialRobs?.meOil ?? 800,
    initialRobAeOil: initialRobs?.aeOil ?? 600,
  } as any;
}