// Mock database dependencies - must be at the very top
const mockPoolClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockPoolClient),
  query: jest.fn(),
  end: jest.fn(),
};

// Mock the database connection first
jest.mock('../../../src/db/connection', () => mockPool);

// Mock the ReportModel
jest.mock('../../../src/models/report.model');

import { CargoCalculator } from '../../../src/services/report/helpers/cargo-calculator';
import { BerthSpecificData } from '../../../src/types/report';
import ReportModel from '../../../src/models/report.model';
import {
  mockVessel,
  mockDepartureReportData,
  mockBerthReport1,
  mockBerthReport2,
  mockBerthReport3,
  createBerthInput
} from '../../fixtures/test-data';

const mockedReportModel = ReportModel as jest.Mocked<typeof ReportModel>;

// Helper to reset all database mocks
function resetDatabaseMocks() {
  jest.clearAllMocks();
  (mockPool.query as jest.Mock).mockReset();
  (mockPool.connect as jest.Mock).mockReset();
  (mockPoolClient.query as jest.Mock).mockReset();
  (mockPoolClient.release as jest.Mock).mockReset();
}

describe('CargoCalculator', () => {
  beforeEach(() => {
    resetDatabaseMocks();
    jest.clearAllMocks();
  });

  describe('validateCargoAgainstVesselCapacity', () => {
    it('should pass validation when cargo is within vessel capacity', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(20000, 25000, 'departure');
      }).not.toThrow();
    });

    it('should pass validation when cargo equals vessel deadweight', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(25000, 25000, 'berth');
      }).not.toThrow();
    });

    it('should throw error when cargo exceeds vessel deadweight', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(30000, 25000, 'departure');
      }).toThrow('Cargo quantity (30000 MT) exceeds vessel deadweight (25000 MT).');
    });

    it('should throw error when cargo quantity is negative', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(-1000, 25000, 'berth');
      }).toThrow('Cargo quantity (-1000 MT) cannot be negative.');
    });

    it('should skip validation when cargo quantity is null', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(null, 25000, 'departure');
      }).not.toThrow();
    });

    it('should skip validation when cargo quantity is undefined', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(undefined, 25000, 'departure');
      }).not.toThrow();
    });

    it('should skip validation when vessel deadweight is null', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(20000, null, 'departure');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Vessel deadweight is missing for departure report. Skipping cargo capacity validation.'
      );
      
      consoleSpy.mockRestore();
    });

    it('should skip validation when vessel deadweight is undefined', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(20000, undefined, 'berth');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Vessel deadweight is missing for berth report. Skipping cargo capacity validation.'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('calculateNewBerthCargoQuantity', () => {
    beforeEach(() => {
      // Set up default mocks for database calls
      mockedReportModel.findLatestApprovedDepartureReportForVoyage.mockResolvedValue(mockDepartureReportData as any);
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([]);
    });

    it('should calculate cargo quantity for first berth operation (loading)', async () => {
      const berthInput = createBerthInput(5000, 0); // Load 5000 MT
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(result).toBe(25000); // 20000 (departure cargo) + 5000 (loaded)
      expect(mockedReportModel.findLatestApprovedDepartureReportForVoyage).toHaveBeenCalledWith('voyage-789', mockPoolClient);
    });

    it('should calculate cargo quantity for first berth operation (discharging)', async () => {
      const berthInput = createBerthInput(0, 3000); // Unload 3000 MT
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(result).toBe(17000); // 20000 (departure cargo) - 3000 (unloaded)
    });

    it('should calculate cargo quantity with multiple previous berth operations', async () => {
      // Mock previous berth reports
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockBerthReport1 as any, // +5000
        mockBerthReport2 as any, // -3000
      ]);

      const berthInput = createBerthInput(2000, 1000); // Load 2000, Unload 1000
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-003',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      // 20000 (departure) + 5000 (berth1 load) - 3000 (berth2 unload) + 2000 (current load) - 1000 (current unload) = 23000
      expect(result).toBe(23000);
    });

    it('should handle missing departure report', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockedReportModel.findLatestApprovedDepartureReportForVoyage.mockResolvedValue(null);

      const berthInput = createBerthInput(1000, 0);
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(result).toBe(1000); // 0 (no departure) + 1000 (loaded)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not find an approved Departure report')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle departure report without cargo quantity', async () => {
      const departureWithoutCargo = { ...mockDepartureReportData, cargoQuantity: undefined };
      mockedReportModel.findLatestApprovedDepartureReportForVoyage.mockResolvedValue(departureWithoutCargo as any);

      const berthInput = createBerthInput(2000, 500);
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(result).toBe(1500); // 0 (no cargo in departure) + 2000 - 500
    });

    it('should validate final cargo quantity against vessel capacity', async () => {
      const berthInput = createBerthInput(10000, 0); // Large load that would exceed capacity
      
      await expect(
        CargoCalculator.calculateNewBerthCargoQuantity(
          'new-berth-001',
          'voyage-789',
          berthInput,
          mockVessel.deadweight,
          mockPoolClient as any
        )
      ).rejects.toThrow('Cargo quantity (30000 MT) exceeds vessel deadweight (25000 MT).');
    });

    it('should handle null cargo loaded and unloaded values', async () => {
      const berthInput = {
        cargoLoaded: null,
        cargoUnloaded: null,
        reportType: 'berth',
        portName: 'Test Port',
        berthName: 'Test Berth',
        operationType: 'other',
      } as any;
      
      const result = await CargoCalculator.calculateNewBerthCargoQuantity(
        'new-berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(result).toBe(20000); // 20000 (departure cargo) + 0 - 0
    });
  });

  describe('calculateResubmittedBerthCargoQuantity', () => {
    beforeEach(() => {
      // Mock voyage reports for resubmission testing
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any,
        mockBerthReport1 as any,
      ]);
      mockedReportModel.getFirstReportForVoyage.mockResolvedValue(mockDepartureReportData as any);
    });

    it('should return null for non-berth reports', async () => {
      const noonReport = { ...mockDepartureReportData, reportType: 'noon' as any };
      const changes: Partial<BerthSpecificData> = { cargoLoaded: 1000 };
      
      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        noonReport as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      expect(result).toBe(null);
    });

    it('should return null when no voyage ID', async () => {
      const berthReportWithoutVoyage = { ...mockBerthReport1, voyageId: undefined };
      const changes: Partial<BerthSpecificData> = { cargoLoaded: 1000 };
      
      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        berthReportWithoutVoyage as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      expect(result).toBe(null);
    });

    it('should return original cargo when no cargo changes', async () => {
      const changes = {} as any; // No cargo changes
      
      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport2 as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      expect(result).toBe((mockBerthReport2 as any).cargoQuantity);
    });

    it('should recalculate cargo when cargo loaded changes', async () => {
      // Original: cargoLoaded: 5000, cargoUnloaded: 0
      // New: cargoLoaded: 4000, cargoUnloaded: 0 (reduced to stay within vessel capacity)
      const changes: Partial<BerthSpecificData> = { cargoLoaded: 4000 };
      
      // Mock reports prior to current berth (none in this case)
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any // Only departure before this berth
      ]);

      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport1 as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      // 20000 (departure) + 4000 (new loaded) - 0 (unloaded) = 24000
      expect(result).toBe(24000);
    });

    it('should recalculate cargo when cargo unloaded changes', async () => {
      // Original: cargoLoaded: 0, cargoUnloaded: 3000
      // New: cargoLoaded: 0, cargoUnloaded: 5000
      const changes: Partial<BerthSpecificData> = { cargoUnloaded: 5000 };
      
      // Mock reports prior to berth2 (departure + berth1)
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any,
        mockBerthReport1 as any
      ]);

      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport2 as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      // 20000 (departure) + 5000 (berth1 loaded) - 5000 (new unloaded) = 20000
      expect(result).toBe(20000);
    });

    it('should handle complex multi-berth scenario', async () => {
      // Mock multiple prior berth operations
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any,
        mockBerthReport1 as any, // +5000
        mockBerthReport2 as any, // -3000
      ]);

      const changes: Partial<BerthSpecificData> = { 
        cargoLoaded: 3000,  // Change from 2000
        cargoUnloaded: 2000 // Change from 4000
      };

      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport3 as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      // 20000 (departure) + 5000 (berth1) - 3000 (berth2) + 3000 (new loaded) - 2000 (new unloaded) = 23000
      expect(result).toBe(23000);
    });

    it('should handle missing departure report in voyage', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock no departure in prior reports
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([]);
      mockedReportModel.getFirstReportForVoyage.mockResolvedValue(null);

      const changes: Partial<BerthSpecificData> = { cargoLoaded: 1000 };

      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport1 as any,
        changes,
        mockVessel,
        mockPoolClient as any
      );

      // 0 (no departure found) + 1000 (new loaded) - 0 (unloaded) = 1000
      expect(result).toBe(1000);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine initial cargo quantity')
      );
      
      consoleSpy.mockRestore();
    });

    it('should validate final cargo against vessel capacity', async () => {
      const changes: Partial<BerthSpecificData> = { cargoLoaded: 20000 }; // Huge load
      
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any
      ]);

      await expect(
        CargoCalculator.calculateResubmittedBerthCargoQuantity(
          mockBerthReport1 as any,
          changes,
          mockVessel,
          mockPoolClient as any
        )
      ).rejects.toThrow('Cargo quantity (40000 MT) exceeds vessel deadweight (25000 MT).');
    });

    it('should use original values when changes are undefined', async () => {
      // Test that original cargoLoaded and cargoUnloaded are used when not in changes
      const changes: Partial<BerthSpecificData> = { cargoLoaded: undefined };
      
      mockedReportModel._getAllReportsForVoyage.mockResolvedValue([
        mockDepartureReportData as any
      ]);

      const result = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
        mockBerthReport1 as any, // Has cargoLoaded: 5000, cargoUnloaded: 0
        changes,
        mockVessel,
        mockPoolClient as any
      );

      // Should use original cargoLoaded (5000)
      // 20000 (departure) + 5000 (original loaded) - 0 (original unloaded) = 25000
      expect(result).toBe(25000);
    });
  });
});