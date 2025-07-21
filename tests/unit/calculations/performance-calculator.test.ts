import { PerformanceCalculator } from '../../../src/services/report/helpers/performance-calculator';
import { Report } from '../../../src/types/report';

describe('PerformanceCalculator', () => {
  describe('calculateSailingTimeVoyage', () => {
    it('should calculate total sailing time with all report types', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: 20 },
        { reportType: 'noon', meDailyRunHours: 22 },
        { reportType: 'arrival', meDailyRunHours: 18 },
        { reportType: 'arrival_anchor_noon', meDailyRunHours: 16 },
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        24, // current report run hours
        previousReports
      );

      expect(result).toBe(100); // 20 + 22 + 18 + 16 + 24
    });

    it('should exclude berth reports from sailing time calculation', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: 20 },
        { reportType: 'berth', meDailyRunHours: 12 }, // Should be excluded
        { reportType: 'noon', meDailyRunHours: 22 },
        { reportType: 'berth', meDailyRunHours: 8 }, // Should be excluded
        { reportType: 'arrival', meDailyRunHours: 18 },
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        15, // current report run hours
        previousReports
      );

      expect(result).toBe(75); // 20 + 22 + 18 + 15 (berth reports excluded)
    });

    it('should handle null ME daily run hours as zero', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: null } as any,
        { reportType: 'noon', meDailyRunHours: 20 },
        { reportType: 'arrival', meDailyRunHours: null } as any,
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        null, // current report run hours is null
        previousReports
      );

      expect(result).toBe(20); // 0 + 20 + 0 + 0
    });

    it('should handle undefined ME daily run hours as zero', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: undefined },
        { reportType: 'noon', meDailyRunHours: 18 },
        { reportType: 'arrival', meDailyRunHours: undefined },
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        undefined, // current report run hours is undefined
        previousReports
      );

      expect(result).toBe(18); // 0 + 18 + 0 + 0
    });

    it('should handle empty previous reports array', () => {
      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        25,
        []
      );

      expect(result).toBe(25); // Only current report hours
    });

    it('should handle reports without meDailyRunHours field', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure' }, // No meDailyRunHours field
        { reportType: 'noon', meDailyRunHours: 20 },
        { reportType: 'arrival' }, // No meDailyRunHours field
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        15,
        previousReports
      );

      expect(result).toBe(35); // 0 + 20 + 0 + 15
    });

    it('should handle mix of berth and non-berth reports with null values', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: 22 },
        { reportType: 'berth', meDailyRunHours: 10 }, // Excluded
        { reportType: 'noon', meDailyRunHours: null } as any, // Treated as 0
        { reportType: 'berth', meDailyRunHours: null } as any, // Excluded anyway
        { reportType: 'arrival', meDailyRunHours: 19 },
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        16,
        previousReports
      );

      expect(result).toBe(57); // 22 + 0 + 19 + 16
    });

    it('should handle zero ME daily run hours', () => {
      const previousReports: Partial<Report>[] = [
        { reportType: 'departure', meDailyRunHours: 0 },
        { reportType: 'noon', meDailyRunHours: 0 },
      ];

      const result = PerformanceCalculator.calculateSailingTimeVoyage(
        0,
        previousReports
      );

      expect(result).toBe(0);
    });
  });

  describe('calculateAverageSpeedVoyage', () => {
    it('should calculate average speed correctly', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        480, // total distance (NM)
        24   // sailing time (hours)
      );

      expect(result).toBeCloseTo(20, 1); // 480 / 24 = 20 knots
    });

    it('should handle fractional results', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        500, // total distance
        30   // sailing time
      );

      expect(result).toBeCloseTo(16.67, 1); // 500 / 30 = 16.666...
    });

    it('should return zero when distance is zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        0,  // no distance
        24  // sailing time
      );

      expect(result).toBe(0);
    });

    it('should return zero when sailing time is zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        480, // distance
        0    // no sailing time
      );

      expect(result).toBe(0);
    });

    it('should return zero when both distance and time are zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        0, // no distance
        0  // no time
      );

      expect(result).toBe(0);
    });

    it('should handle null distance as zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        null, // null distance
        24    // sailing time
      );

      expect(result).toBe(0);
    });

    it('should handle undefined distance as zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        undefined, // undefined distance
        24         // sailing time
      );

      expect(result).toBe(0);
    });

    it('should handle null sailing time as zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        480, // distance
        null // null sailing time
      );

      expect(result).toBe(0);
    });

    it('should handle undefined sailing time as zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        480,       // distance
        undefined  // undefined sailing time
      );

      expect(result).toBe(0);
    });

    it('should handle negative values by treating them as zero', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        -100, // negative distance (treated as 0)
        20    // positive time
      );

      expect(result).toBe(0);
    });

    it('should handle very small distances and times', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        0.1, // very small distance
        0.01 // very small time
      );

      expect(result).toBeCloseTo(10, 1); // 0.1 / 0.01 = 10
    });

    it('should handle very large distances and times', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        10000, // large distance
        500    // large time
      );

      expect(result).toBeCloseTo(20, 1); // 10000 / 500 = 20
    });

    it('should handle floating point precision correctly', () => {
      const result = PerformanceCalculator.calculateAverageSpeedVoyage(
        333.33, // distance with decimal
        16.5    // time with decimal
      );

      expect(result).toBeCloseTo(20.20, 1); // 333.33 / 16.5 ≈ 20.20
    });
  });
});