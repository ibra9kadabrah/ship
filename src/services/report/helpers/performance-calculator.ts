import { Report, ReportType } from '../../../types/report';

export class PerformanceCalculator {
  /**
   * Calculates the cumulative sailing time for a voyage up to the current report.
   * Excludes time from 'berth' reports as ME might not be running.
   * Logic extracted from original ReportService.submitReport.
   * @param currentReportRunHours ME daily run hours from the current report being processed.
   * @param previousApprovedReports Array of previously approved reports for the same voyage.
   * @returns Total sailing time in hours.
   */
  static calculateSailingTimeVoyage(
    currentReportRunHours: number | null | undefined,
    previousApprovedReports: Partial<Report>[] // Reports from the current voyage, already approved
  ): number {
    const currentRunHours = currentReportRunHours ?? 0;
    
    const previousTotalSailingTime = previousApprovedReports.reduce((sum, report) => {
      // Only sum from reports that have the field and are not Berth reports
      if (report.reportType !== 'berth' && report.meDailyRunHours !== null && report.meDailyRunHours !== undefined) {
        return sum + report.meDailyRunHours;
      }
      return sum;
    }, 0);

    return previousTotalSailingTime + currentRunHours;
  }

  /**
   * Calculates the average speed for the voyage.
   * Logic extracted from original ReportService.submitReport.
   * @param totalDistanceTravelled Total distance travelled in the voyage so far (NM).
   * @param sailingTimeVoyage Total sailing time for the voyage so far (hours).
   * @returns Average speed in knots.
   */
  static calculateAverageSpeedVoyage(
    totalDistanceTravelled: number | null | undefined,
    sailingTimeVoyage: number | null | undefined
  ): number {
    const distance = totalDistanceTravelled ?? 0;
    const time = sailingTimeVoyage ?? 0;

    if (time > 0 && distance > 0) {
      return distance / time;
    }
    return 0; // Avoid division by zero, default to 0
  }
}