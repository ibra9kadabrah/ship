import { CargoCalculator } from '../../../src/services/report/helpers/cargo-calculator';

describe('CargoCalculator - Core Validation', () => {
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

    it('should handle edge case with zero cargo', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(0, 25000, 'departure');
      }).not.toThrow();
    });

    it('should handle edge case with zero deadweight', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(1000, 0, 'departure');
      }).toThrow('Cargo quantity (1000 MT) exceeds vessel deadweight (0 MT).');
    });

    it('should handle large cargo values within limits', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(99999, 100000, 'departure');
      }).not.toThrow();
    });

    it('should handle fractional cargo values', () => {
      expect(() => {
        CargoCalculator.validateCargoAgainstVesselCapacity(24999.5, 25000, 'departure');
      }).not.toThrow();
    });
  });
});