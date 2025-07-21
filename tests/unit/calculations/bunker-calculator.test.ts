import { 
  calculateTotalConsumptions, 
  calculateCurrentRobs,
  BunkerConsumptionInput,
  BunkerSupplyInput,
  PreviousRob,
  TotalConsumptions 
} from '../../../src/services/bunker_calculator';

describe('Bunker Calculator', () => {
  describe('calculateTotalConsumptions', () => {
    it('should calculate total consumption with all fuel types provided', () => {
      const input: BunkerConsumptionInput = {
        meConsumptionLsifo: 50,
        meConsumptionLsmgo: 10,
        meConsumptionCylOil: 5,
        meConsumptionMeOil: 8,
        meConsumptionAeOil: 3,
        boilerConsumptionLsifo: 20,
        boilerConsumptionLsmgo: 5,
        auxConsumptionLsifo: 15,
        auxConsumptionLsmgo: 2,
      };

      const result = calculateTotalConsumptions(input);

      expect(result).toEqual({
        totalConsumptionLsifo: 85, // 50 + 20 + 15
        totalConsumptionLsmgo: 17, // 10 + 5 + 2
        totalConsumptionCylOil: 5, // Only ME consumes
        totalConsumptionMeOil: 8,  // Only ME consumes
        totalConsumptionAeOil: 3,  // Only ME consumes
      });
    });

    it('should handle null and undefined values as zero', () => {
      const input: BunkerConsumptionInput = {
        meConsumptionLsifo: 100,
        meConsumptionLsmgo: null,
        meConsumptionCylOil: undefined,
        meConsumptionMeOil: 10,
        meConsumptionAeOil: null,
        boilerConsumptionLsifo: undefined,
        boilerConsumptionLsmgo: 5,
        auxConsumptionLsifo: null,
        auxConsumptionLsmgo: undefined,
      };

      const result = calculateTotalConsumptions(input);

      expect(result).toEqual({
        totalConsumptionLsifo: 100, // 100 + 0 + 0
        totalConsumptionLsmgo: 5,   // 0 + 5 + 0
        totalConsumptionCylOil: 0,  // Only ME, which is undefined
        totalConsumptionMeOil: 10,  // Only ME
        totalConsumptionAeOil: 0,   // Only ME, which is null
      });
    });

    it('should handle empty input object', () => {
      const input: BunkerConsumptionInput = {};

      const result = calculateTotalConsumptions(input);

      expect(result).toEqual({
        totalConsumptionLsifo: 0,
        totalConsumptionLsmgo: 0,
        totalConsumptionCylOil: 0,
        totalConsumptionMeOil: 0,
        totalConsumptionAeOil: 0,
      });
    });

    it('should handle zero values correctly', () => {
      const input: BunkerConsumptionInput = {
        meConsumptionLsifo: 0,
        meConsumptionLsmgo: 0,
        meConsumptionCylOil: 0,
        meConsumptionMeOil: 0,
        meConsumptionAeOil: 0,
        boilerConsumptionLsifo: 0,
        boilerConsumptionLsmgo: 0,
        auxConsumptionLsifo: 0,
        auxConsumptionLsmgo: 0,
      };

      const result = calculateTotalConsumptions(input);

      expect(result).toEqual({
        totalConsumptionLsifo: 0,
        totalConsumptionLsmgo: 0,
        totalConsumptionCylOil: 0,
        totalConsumptionMeOil: 0,
        totalConsumptionAeOil: 0,
      });
    });
  });

  describe('calculateCurrentRobs', () => {
    const previousRob: PreviousRob = {
      lsifo: 1000,
      lsmgo: 500,
      cylOil: 200,
      meOil: 300,
      aeOil: 250,
    };

    const totalConsumptions: TotalConsumptions = {
      totalConsumptionLsifo: 100,
      totalConsumptionLsmgo: 50,
      totalConsumptionCylOil: 10,
      totalConsumptionMeOil: 15,
      totalConsumptionAeOil: 12,
    };

    it('should calculate current ROBs with supplies', () => {
      const supplies: BunkerSupplyInput = {
        supplyLsifo: 200,
        supplyLsmgo: 100,
        supplyCylOil: 50,
        supplyMeOil: 80,
        supplyAeOil: 60,
      };

      const result = calculateCurrentRobs(previousRob, totalConsumptions, supplies);

      expect(result).toEqual({
        currentRobLsifo: 1100, // 1000 - 100 + 200
        currentRobLsmgo: 550,  // 500 - 50 + 100
        currentRobCylOil: 240, // 200 - 10 + 50
        currentRobMeOil: 365,  // 300 - 15 + 80
        currentRobAeOil: 298,  // 250 - 12 + 60
      });
    });

    it('should calculate current ROBs without supplies', () => {
      const supplies: BunkerSupplyInput = {};

      const result = calculateCurrentRobs(previousRob, totalConsumptions, supplies);

      expect(result).toEqual({
        currentRobLsifo: 900, // 1000 - 100 + 0
        currentRobLsmgo: 450, // 500 - 50 + 0
        currentRobCylOil: 190, // 200 - 10 + 0
        currentRobMeOil: 285,  // 300 - 15 + 0
        currentRobAeOil: 238,  // 250 - 12 + 0
      });
    });

    it('should handle null supply values as zero', () => {
      const supplies: BunkerSupplyInput = {
        supplyLsifo: null,
        supplyLsmgo: undefined,
        supplyCylOil: 25,
        supplyMeOil: null,
        supplyAeOil: undefined,
      };

      const result = calculateCurrentRobs(previousRob, totalConsumptions, supplies);

      expect(result).toEqual({
        currentRobLsifo: 900, // 1000 - 100 + 0
        currentRobLsmgo: 450, // 500 - 50 + 0
        currentRobCylOil: 215, // 200 - 10 + 25
        currentRobMeOil: 285,  // 300 - 15 + 0
        currentRobAeOil: 238,  // 250 - 12 + 0
      });
    });

    it('should prevent negative ROB values', () => {
      const highConsumption: TotalConsumptions = {
        totalConsumptionLsifo: 1500, // More than available
        totalConsumptionLsmgo: 600,  // More than available
        totalConsumptionCylOil: 250, // More than available
        totalConsumptionMeOil: 400,  // More than available
        totalConsumptionAeOil: 300,  // More than available
      };

      const supplies: BunkerSupplyInput = {};

      const result = calculateCurrentRobs(previousRob, highConsumption, supplies);

      // All values should be clamped to 0 (Math.max(0, negative_value))
      expect(result).toEqual({
        currentRobLsifo: 0,
        currentRobLsmgo: 0,
        currentRobCylOil: 0,
        currentRobMeOil: 0,
        currentRobAeOil: 0,
      });
    });

    it('should handle edge case with exactly zero remaining ROB', () => {
      const exactConsumption: TotalConsumptions = {
        totalConsumptionLsifo: 1000, // Exactly the previous ROB
        totalConsumptionLsmgo: 500,
        totalConsumptionCylOil: 200,
        totalConsumptionMeOil: 300,
        totalConsumptionAeOil: 250,
      };

      const supplies: BunkerSupplyInput = {};

      const result = calculateCurrentRobs(previousRob, exactConsumption, supplies);

      expect(result).toEqual({
        currentRobLsifo: 0,
        currentRobLsmgo: 0,
        currentRobCylOil: 0,
        currentRobMeOil: 0,
        currentRobAeOil: 0,
      });
    });

    it('should handle large supply quantities correctly', () => {
      const largeSupplies: BunkerSupplyInput = {
        supplyLsifo: 5000,
        supplyLsmgo: 2000,
        supplyCylOil: 1000,
        supplyMeOil: 1500,
        supplyAeOil: 1200,
      };

      const result = calculateCurrentRobs(previousRob, totalConsumptions, largeSupplies);

      expect(result).toEqual({
        currentRobLsifo: 5900, // 1000 - 100 + 5000
        currentRobLsmgo: 2450, // 500 - 50 + 2000
        currentRobCylOil: 1190, // 200 - 10 + 1000
        currentRobMeOil: 1785,  // 300 - 15 + 1500
        currentRobAeOil: 1438,  // 250 - 12 + 1200
      });
    });
  });
});