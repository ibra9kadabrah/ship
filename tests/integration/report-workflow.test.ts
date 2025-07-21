import { calculateTotalConsumptions, calculateCurrentRobs } from '../../src/services/bunker_calculator';
import { calculateDistances } from '../../src/services/distance_calculator';
import { CargoCalculator } from '../../src/services/report/helpers/cargo-calculator';
import { PerformanceCalculator } from '../../src/services/report/helpers/performance-calculator';
import { RobCalculator } from '../../src/services/report/helpers/rob-calculator';
import { 
  mockVessel, 
  mockVoyageData,
  createDepartureInput,
  createBerthInput
} from '../fixtures/test-data';

// Mock database dependencies for integration test
const mockPoolClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../src/models/report.model', () => ({
  findLatestApprovedDepartureReportForVoyage: jest.fn(),
  _getAllReportsForVoyage: jest.fn().mockResolvedValue([]),
  getFirstReportForVoyage: jest.fn(),
}));

describe('Report Workflow Integration Tests', () => {
  describe('Complete Departure Report Workflow', () => {
    it('should process a complete departure report with all calculations', () => {
      // Create departure report input
      const departureInput = createDepartureInput(20000, {
        lsifo: 2000,
        lsmgo: 1000,
        cylOil: 500,
        meOil: 800,
        aeOil: 600,
      });

      // Add consumption data
      departureInput.meConsumptionLsifo = 50;
      departureInput.meConsumptionLsmgo = 25;
      departureInput.meConsumptionCylOil = 10;
      departureInput.meConsumptionMeOil = 15;
      departureInput.meConsumptionAeOil = 12;
      departureInput.boilerConsumptionLsifo = 20;
      departureInput.auxConsumptionLsifo = 15;

      // Add supply data
      departureInput.supplyLsifo = 500;
      departureInput.supplyLsmgo = 200;

      // Distance data
      departureInput.harbourDistance = 25;
      
      // Performance data
      departureInput.meDailyRunHours = 20;

      // Step 1: Calculate total consumptions
      const totalConsumptions = calculateTotalConsumptions(departureInput);
      expect(totalConsumptions.totalConsumptionLsifo).toBe(85); // 50 + 20 + 15

      // Step 2: Calculate ROBs using RobCalculator
      const robCalculationResult = RobCalculator.calculateRobs(
        mockVessel, // First-ever departure
        departureInput,
        null,
        null
      );

      expect(robCalculationResult.previousRob.lsifo).toBe(2000); // From DTO initial ROBs
      expect(robCalculationResult.currentRobs.currentRobLsifo).toBe(2415); // 2000 - 85 + 500

      // Step 3: Calculate distances
      const distanceCalculation = calculateDistances({
        reportType: 'departure',
        harbourDistance: 25,
        distanceSinceLastReport: 0,
        previousReportData: null,
        voyageDistance: mockVoyageData.totalDistance,
      });

      expect(distanceCalculation.totalDistanceTravelled).toBe(25);
      expect(distanceCalculation.distanceToGo).toBe(1175); // 1200 - 25

      // Step 4: Calculate sailing time (first report)
      const sailingTime = PerformanceCalculator.calculateSailingTimeVoyage(
        20, // Current ME run hours
        []  // No previous reports
      );

      expect(sailingTime).toBe(20);

      // Step 5: Calculate average speed
      const averageSpeed = PerformanceCalculator.calculateAverageSpeedVoyage(
        25, // Total distance travelled
        20  // Sailing time
      );

      expect(averageSpeed).toBeCloseTo(1.25, 1); // 25 / 20 = 1.25 knots

      // Verify cargo capacity validation
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(
          departureInput.cargoQuantity,
          mockVessel.deadweight,
          'departure'
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle calculation errors gracefully across modules', () => {
      // Test with invalid input data
      const invalidInput = createDepartureInput(-1000); // Negative cargo

      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(
          invalidInput.cargoQuantity,
          mockVessel.deadweight,
          'departure'
        );
      }).toThrow('Cargo quantity (-1000 MT) cannot be negative.');
    });

    it('should handle missing data scenarios', () => {
      // Distance calculation without previous report for noon
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const distanceResult = calculateDistances({
        reportType: 'noon',
        distanceSinceLastReport: 100,
        previousReportData: null,
        voyageDistance: 1200,
      });

      expect(distanceResult.totalDistanceTravelled).toBe(100); // Fallback behavior
      expect(consoleSpy).toHaveBeenCalledWith(
        'Calculating distance for noon without previous report data.'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero and negative performance values', () => {
      const averageSpeed = PerformanceCalculator.calculateAverageSpeedVoyage(0, 0);
      expect(averageSpeed).toBe(0);

      const sailingTime = PerformanceCalculator.calculateSailingTimeVoyage(
        null,
        [{ reportType: 'berth', meDailyRunHours: 10 } as any] // Berth report should be excluded
      );
      expect(sailingTime).toBe(0); // null current + 0 previous (berth excluded)
    });
  });

  describe('Simplified Voyage Workflow', () => {
    it('should process basic report sequence calculations', async () => {
      // Mock the ReportModel responses
      const mockFindLatestApproved = require('../../src/models/report.model').findLatestApprovedDepartureReportForVoyage;
      const mockGetAllReports = require('../../src/models/report.model')._getAllReportsForVoyage;
      
      // Mock departure report for cargo calculations
      const mockDepartureData = {
        id: 'departure-001',
        reportType: 'departure',
        cargoQuantity: 20000,
      };
      
      mockFindLatestApproved.mockResolvedValue(mockDepartureData);
      mockGetAllReports.mockResolvedValue([]);

      // Test berth cargo calculation
      const berthInput = createBerthInput(5000, 0); // Load 5000 MT
      
      const berthCargoQuantity = await CargoCalculator.calculateNewBerthCargoQuantity(
        'berth-001',
        'voyage-789',
        berthInput,
        mockVessel.deadweight,
        mockPoolClient as any
      );

      expect(berthCargoQuantity).toBe(25000); // 20000 (departure) + 5000 (loaded)

      // Test distance calculations
      const noonDistance = calculateDistances({
        reportType: 'noon',
        distanceSinceLastReport: 250,
        previousReportData: { totalDistanceTravelled: 30 } as any,
        voyageDistance: 1200,
      });

      expect(noonDistance.totalDistanceTravelled).toBe(280); // 30 + 250
      expect(noonDistance.distanceToGo).toBe(920); // 1200 - 280

      // Test performance calculations
      const sailingTime = PerformanceCalculator.calculateSailingTimeVoyage(
        24, // Current ME run hours
        [{ reportType: 'departure', meDailyRunHours: 22 } as any]
      );

      expect(sailingTime).toBe(46); // 22 + 24

      const averageSpeed = PerformanceCalculator.calculateAverageSpeedVoyage(
        280, // Total distance
        46   // Total sailing time
      );

      expect(averageSpeed).toBeCloseTo(6.09, 1); // 280 / 46
    });
  });
});