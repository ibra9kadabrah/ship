import { 
  calculateDistances,
  DistanceCalculationInput,
  DistanceCalculationOutput 
} from '../../../src/services/distance_calculator';
import { ReportType } from '../../../src/types/report';

describe('Distance Calculator', () => {
  describe('calculateDistances', () => {
    describe('departure reports', () => {
      it('should calculate distance for departure report with harbour distance', () => {
        const input: DistanceCalculationInput = {
          reportType: 'departure',
          harbourDistance: 25,
          distanceSinceLastReport: 0, // Not used for departure
          previousReportData: null,
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 25,
          distanceToGo: 1175, // 1200 - 25
        });
      });

      it('should handle departure without harbour distance', () => {
        const input: DistanceCalculationInput = {
          reportType: 'departure',
          harbourDistance: null,
          distanceSinceLastReport: 0,
          previousReportData: null,
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 0,
          distanceToGo: 1200, // 1200 - 0
        });
      });

      it('should handle departure with undefined harbour distance', () => {
        const input: DistanceCalculationInput = {
          reportType: 'departure',
          harbourDistance: undefined,
          distanceSinceLastReport: 0,
          previousReportData: null,
          voyageDistance: 800,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 0,
          distanceToGo: 800,
        });
      });
    });

    describe('noon reports', () => {
      it('should calculate distance for noon report with previous report data', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 150,
          previousReportData: { totalDistanceTravelled: 300 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 450, // 300 + 150
          distanceToGo: 750, // 1200 - 450
        });
      });

      it('should handle noon report without previous report data', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 150,
          previousReportData: null,
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 150, // Best guess fallback
          distanceToGo: 1050, // 1200 - 150
        });
      });

      it('should handle null distance since last report', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: null,
          previousReportData: { totalDistanceTravelled: 500 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 500, // 500 + 0
          distanceToGo: 700, // 1200 - 500
        });
      });
    });

    describe('arrival reports', () => {
      it('should calculate distance for arrival report', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival',
          harbourDistance: undefined,
          distanceSinceLastReport: 75,
          previousReportData: { totalDistanceTravelled: 1100 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 1175, // 1100 + 75
          distanceToGo: 25, // 1200 - 1175
        });
      });

      it('should handle arrival report that completes voyage exactly', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival',
          harbourDistance: undefined,
          distanceSinceLastReport: 100,
          previousReportData: { totalDistanceTravelled: 1100 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 1200, // 1100 + 100
          distanceToGo: 0, // 1200 - 1200
        });
      });

      it('should handle arrival report that exceeds planned voyage distance', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival',
          harbourDistance: undefined,
          distanceSinceLastReport: 200,
          previousReportData: { totalDistanceTravelled: 1100 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 1300, // 1100 + 200
          distanceToGo: 0, // Math.max(0, 1200 - 1300) = 0
        });
      });
    });

    describe('arrival_anchor_noon reports', () => {
      it('should calculate distance for arrival anchor noon report', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival_anchor_noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 50,
          previousReportData: { totalDistanceTravelled: 1000 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 1050, // 1000 + 50
          distanceToGo: 150, // 1200 - 1050
        });
      });
    });

    describe('berth reports', () => {
      it('should return undefined values for berth reports', () => {
        const input: DistanceCalculationInput = {
          reportType: 'berth',
          harbourDistance: undefined,
          distanceSinceLastReport: 0,
          previousReportData: { totalDistanceTravelled: 800 },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: undefined,
          distanceToGo: undefined,
        });
      });
    });

    describe('edge cases', () => {
      it('should handle previous report with missing totalDistanceTravelled', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 100,
          previousReportData: {}, // No totalDistanceTravelled
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 100, // 0 + 100
          distanceToGo: 1100, // 1200 - 100
        });
      });

      it('should handle previous report with null totalDistanceTravelled', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival',
          harbourDistance: undefined,
          distanceSinceLastReport: 150,
          previousReportData: { totalDistanceTravelled: null },
          voyageDistance: 1200,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 150, // 0 + 150
          distanceToGo: 1050, // 1200 - 150
        });
      });

      it('should handle zero voyage distance', () => {
        const input: DistanceCalculationInput = {
          reportType: 'departure',
          harbourDistance: 10,
          distanceSinceLastReport: 0,
          previousReportData: null,
          voyageDistance: 0,
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 10,
          distanceToGo: 0, // Math.max(0, 0 - 10) = 0
        });
      });

      it('should handle negative distance calculations gracefully', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 100,
          previousReportData: { totalDistanceTravelled: 50 },
          voyageDistance: 120, // Voyage distance less than total travelled
        };

        const result = calculateDistances(input);

        expect(result).toEqual({
          totalDistanceTravelled: 150, // 50 + 100
          distanceToGo: 0, // Math.max(0, 120 - 150) = 0
        });
      });
    });

    describe('console warning behavior', () => {
      beforeEach(() => {
        // Restore console.warn to capture warning messages
        (console.warn as jest.Mock).mockRestore();
        jest.spyOn(console, 'warn').mockImplementation(() => {});
      });

      it('should log warning for noon report without previous report data', () => {
        const input: DistanceCalculationInput = {
          reportType: 'noon',
          harbourDistance: undefined,
          distanceSinceLastReport: 100,
          previousReportData: null,
          voyageDistance: 1200,
        };

        calculateDistances(input);

        expect(console.warn).toHaveBeenCalledWith(
          'Calculating distance for noon without previous report data.'
        );
      });

      it('should log warning for arrival report without previous report data', () => {
        const input: DistanceCalculationInput = {
          reportType: 'arrival',
          harbourDistance: undefined,
          distanceSinceLastReport: 100,
          previousReportData: null,
          voyageDistance: 1200,
        };

        calculateDistances(input);

        expect(console.warn).toHaveBeenCalledWith(
          'Calculating distance for arrival without previous report data.'
        );
      });
    });
  });
});