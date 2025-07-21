import { RobCalculator, InitialRobData } from '../../../src/services/report/helpers/rob-calculator';
import { CreateReportDTO, DepartureSpecificData } from '../../../src/types/report';
import { PreviousVoyageFinalState } from '../../../src/services/voyage_lifecycle.service';
import {
  mockVessel,
  mockVesselWithInitialRobs,
  createDepartureInput,
} from '../../fixtures/test-data';

// Mock the bunker calculator functions
jest.mock('../../../src/services/bunker_calculator', () => ({
  calculateTotalConsumptions: jest.fn((input) => ({
    totalConsumptionLsifo: (input.meConsumptionLsifo || 0) + (input.boilerConsumptionLsifo || 0) + (input.auxConsumptionLsifo || 0),
    totalConsumptionLsmgo: (input.meConsumptionLsmgo || 0) + (input.boilerConsumptionLsmgo || 0) + (input.auxConsumptionLsmgo || 0),
    totalConsumptionCylOil: input.meConsumptionCylOil || 0,
    totalConsumptionMeOil: input.meConsumptionMeOil || 0,
    totalConsumptionAeOil: input.meConsumptionAeOil || 0,
  })),
  calculateCurrentRobs: jest.fn((previousRob, totalConsumptions, supplies) => ({
    currentRobLsifo: Math.max(0, previousRob.lsifo - totalConsumptions.totalConsumptionLsifo + (supplies.supplyLsifo || 0)),
    currentRobLsmgo: Math.max(0, previousRob.lsmgo - totalConsumptions.totalConsumptionLsmgo + (supplies.supplyLsmgo || 0)),
    currentRobCylOil: Math.max(0, previousRob.cylOil - totalConsumptions.totalConsumptionCylOil + (supplies.supplyCylOil || 0)),
    currentRobMeOil: Math.max(0, previousRob.meOil - totalConsumptions.totalConsumptionMeOil + (supplies.supplyMeOil || 0)),
    currentRobAeOil: Math.max(0, previousRob.aeOil - totalConsumptions.totalConsumptionAeOil + (supplies.supplyAeOil || 0)),
  }))
}));

describe('RobCalculator', () => {
  describe('getPreviousRobs', () => {
    describe('departure reports', () => {
      it('should use previous voyage final ROBs for departure', () => {
        const previousVoyageState = {
          voyageId: 'prev-voyage-123',
          finalRobLsifo: 1800,
          finalRobLsmgo: 900,
          finalRobCylOil: 450,
          finalRobMeOil: 720,
          finalRobAeOil: 540,
        } as PreviousVoyageFinalState;

        const result = RobCalculator.getPreviousRobs(
          null,
          mockVessel,
          previousVoyageState,
          'departure'
        );

        expect(result).toEqual({
          lsifo: 1800,
          lsmgo: 900,
          cylOil: 450,
          meOil: 720,
          aeOil: 540,
        });
      });

      it('should use vessel initial ROBs when no previous voyage', () => {
        const result = RobCalculator.getPreviousRobs(
          null,
          mockVesselWithInitialRobs,
          null,
          'departure'
        );

        expect(result).toEqual({
          lsifo: 2000,
          lsmgo: 1000,
          cylOil: 500,
          meOil: 800,
          aeOil: 600,
        });
      });

      it('should return zeros for first-ever vessel departure', () => {
        const result = RobCalculator.getPreviousRobs(
          null,
          mockVessel, // Has initialRobLsifo: null
          null,
          'departure'
        );

        expect(result).toEqual({
          lsifo: 0,
          lsmgo: 0,
          cylOil: 0,
          meOil: 0,
          aeOil: 0,
        });
      });

      it('should handle null values in previous voyage state', () => {
        const previousVoyageState = {
          voyageId: 'prev-voyage-123',
          finalRobLsifo: null,
          finalRobLsmgo: 900,
          finalRobCylOil: null,
          finalRobMeOil: 720,
          finalRobAeOil: null,
        } as any;

        const result = RobCalculator.getPreviousRobs(
          null,
          mockVessel,
          previousVoyageState,
          'departure'
        );

        expect(result).toEqual({
          lsifo: 0,
          lsmgo: 900,
          cylOil: 0,
          meOil: 720,
          aeOil: 0,
        });
      });
    });

    describe('non-departure reports', () => {
      it('should use previous report ROBs for noon report', () => {
        const previousReport = {
          currentRobLsifo: 1500,
          currentRobLsmgo: 750,
          currentRobCylOil: 375,
          currentRobMeOil: 600,
          currentRobAeOil: 450,
        } as any;

        const result = RobCalculator.getPreviousRobs(
          previousReport,
          mockVessel,
          null,
          'noon'
        );

        expect(result).toEqual({
          lsifo: 1500,
          lsmgo: 750,
          cylOil: 375,
          meOil: 600,
          aeOil: 450,
        });
      });

      it('should handle missing fields in previous report', () => {
        const previousReport = {
          currentRobLsifo: 1500,
          // Missing other ROB fields
        } as any;

        const result = RobCalculator.getPreviousRobs(
          previousReport,
          mockVessel,
          null,
          'arrival'
        );

        expect(result).toEqual({
          lsifo: 1500,
          lsmgo: 0,
          cylOil: 0,
          meOil: 0,
          aeOil: 0,
        });
      });

      it('should handle null values in previous report ROBs', () => {
        const previousReport = {
          currentRobLsifo: null,
          currentRobLsmgo: 750,
          currentRobCylOil: null,
          currentRobMeOil: 600,
          currentRobAeOil: null,
        } as any;

        const result = RobCalculator.getPreviousRobs(
          previousReport,
          mockVessel,
          null,
          'berth'
        );

        expect(result).toEqual({
          lsifo: 0,
          lsmgo: 750,
          cylOil: 0,
          meOil: 600,
          aeOil: 0,
        });
      });

      it('should return zeros when no previous report for non-departure', () => {
        const result = RobCalculator.getPreviousRobs(
          null,
          mockVessel,
          null,
          'noon'
        );

        expect(result).toEqual({
          lsifo: 0,
          lsmgo: 0,
          cylOil: 0,
          meOil: 0,
          aeOil: 0,
        });
      });
    });
  });

  describe('determineInputInitialRobs', () => {
    it('should extract initial ROBs from departure report', () => {
      const departureInput = createDepartureInput(20000, {
        lsifo: 2000,
        lsmgo: 1000,
        cylOil: 500,
        meOil: 800,
        aeOil: 600,
      });

      const result = RobCalculator.determineInputInitialRobs(departureInput);

      expect(result).toEqual({
        initialRobLsifo: 2000,
        initialRobLsmgo: 1000,
        initialRobCylOil: 500,
        initialRobMeOil: 800,
        initialRobAeOil: 600,
      });
    });

    it('should return null for non-departure reports', () => {
      const noonInput = {
        reportType: 'noon',
        // Other fields...
      } as CreateReportDTO;

      const result = RobCalculator.determineInputInitialRobs(noonInput);

      expect(result).toBe(null);
    });

    it('should handle null/undefined values in departure input', () => {
      const departureInput = {
        reportType: 'departure',
        cargoQuantity: 20000,
        initialRobLsifo: null,
        initialRobLsmgo: undefined,
        initialRobCylOil: 500,
        initialRobMeOil: null,
        initialRobAeOil: 600,
      } as any;

      const result = RobCalculator.determineInputInitialRobs(departureInput);

      expect(result).toEqual({
        initialRobLsifo: null,
        initialRobLsmgo: undefined,
        initialRobCylOil: 500,
        initialRobMeOil: null,
        initialRobAeOil: 600,
      });
    });
  });

  describe('calculateRobs', () => {
    describe('first-ever departure reports', () => {
      it('should use DTO initial ROBs for vessel first report', () => {
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

        const result = RobCalculator.calculateRobs(
          mockVessel, // initialRobLsifo is null (first report)
          departureInput,
          null,
          null
        );

        // Should use DTO's initial ROBs as "previous" for calculation
        expect(result.previousRob).toEqual({
          lsifo: 2000,
          lsmgo: 1000,
          cylOil: 500,
          meOil: 800,
          aeOil: 600,
        });

        expect(result.inputInitialRobData).toEqual({
          initialRobLsifo: 2000,
          initialRobLsmgo: 1000,
          initialRobCylOil: 500,
          initialRobMeOil: 800,
          initialRobAeOil: 600,
        });
      });

      it('should throw error for first departure without initial ROBs', () => {
        const incompleteInput = {
          reportType: 'departure',
          cargoQuantity: 20000,
          initialRobLsifo: 2000,
          // Missing other initial ROBs
        } as any;

        expect(() => {
          RobCalculator.calculateRobs(
            mockVessel,
            incompleteInput,
            null,
            null
          );
        }).toThrow('Initial ROB values (Lsifo, Lsmgo, CylOil, MeOil, AeOil) are required for the vessel\'s first-ever departure report.');
      });
    });

    describe('subsequent departure reports', () => {
      it('should use previous voyage state for new departure', () => {
        const departureInput = createDepartureInput(18000);
        departureInput.meConsumptionLsifo = 30;

        const previousVoyageState = {
          voyageId: 'prev-voyage-123',
          finalRobLsifo: 1800,
          finalRobLsmgo: 900,
          finalRobCylOil: 450,
          finalRobMeOil: 720,
          finalRobAeOil: 540,
        } as PreviousVoyageFinalState;

        const result = RobCalculator.calculateRobs(
          mockVesselWithInitialRobs,
          departureInput,
          null,
          previousVoyageState
        );

        expect(result.previousRob).toEqual({
          lsifo: 1800,
          lsmgo: 900,
          cylOil: 450,
          meOil: 720,
          aeOil: 540,
        });
      });

      it('should use vessel initial ROBs when no previous voyage state', () => {
        const departureInput = createDepartureInput(18000);

        const result = RobCalculator.calculateRobs(
          mockVesselWithInitialRobs,
          departureInput,
          null,
          null
        );

        expect(result.previousRob).toEqual({
          lsifo: 2000,
          lsmgo: 1000,
          cylOil: 500,
          meOil: 800,
          aeOil: 600,
        });
      });
    });

    describe('non-departure reports', () => {
      it('should use previous report ROBs for noon report', () => {
        const noonInput = {
          reportType: 'noon',
          meConsumptionLsifo: 40,
          meConsumptionLsmgo: 20,
        } as CreateReportDTO;

        const previousReport = {
          currentRobLsifo: 1500,
          currentRobLsmgo: 750,
          currentRobCylOil: 375,
          currentRobMeOil: 600,
          currentRobAeOil: 450,
        } as any;

        const result = RobCalculator.calculateRobs(
          mockVessel,
          noonInput,
          previousReport,
          null
        );

        expect(result.previousRob).toEqual({
          lsifo: 1500,
          lsmgo: 750,
          cylOil: 375,
          meOil: 600,
          aeOil: 450,
        });

        expect(result.inputInitialRobData).toBe(null); // Only for departures
      });
    });

    describe('consumption and supply calculations', () => {
      it('should calculate current ROBs correctly with supplies', () => {
        const departureInput = createDepartureInput(20000, {
          lsifo: 1000,
          lsmgo: 500,
          cylOil: 250,
          meOil: 400,
          aeOil: 300,
        });

        // Add consumption data
        departureInput.meConsumptionLsifo = 100;
        departureInput.meConsumptionLsmgo = 50;
        departureInput.meConsumptionCylOil = 25;
        departureInput.meConsumptionMeOil = 30;
        departureInput.meConsumptionAeOil = 20;

        // Add supply data
        departureInput.supplyLsifo = 500;
        departureInput.supplyLsmgo = 200;

        const result = RobCalculator.calculateRobs(
          mockVessel,
          departureInput,
          null,
          null
        );

        // Verify mocked calculations are called and return expected structure
        expect(result.totalConsumptions).toBeDefined();
        expect(result.currentRobs).toBeDefined();
        expect(result.currentRobs.currentRobLsifo).toBeDefined();
        expect(result.currentRobs.currentRobLsmgo).toBeDefined();
      });
    });
  });
});