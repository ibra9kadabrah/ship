import { PoolClient } from 'pg';
import pool from '../../../db/connection';
import { Report, ReportType, BerthSpecificData, DepartureSpecificData } from '../../../types/report';
import { Vessel } from '../../../types/vessel';
import ReportModel from '../../../models/report.model';
import { ReportRecordData } from './report-builder'; // Import ReportRecordData

export class CargoCalculator {
  /**
   * Validates the cargo quantity against the vessel's deadweight.
   * Moved from report_validator.ts
   */
  static validateCargoAgainstVesselCapacity(
    cargoQuantity: number | null | undefined,
    vesselDeadweight: number | null | undefined,
    reportType: ReportType // reportType is useful for logging/error context
  ): void {
    if (cargoQuantity === undefined || cargoQuantity === null) {
      return; // Skip validation if cargoQuantity is not provided
    }

    if (vesselDeadweight === null || vesselDeadweight === undefined) {
      console.warn(`Vessel deadweight is missing for ${reportType} report. Skipping cargo capacity validation.`);
      return;
    }

    if (cargoQuantity < 0) {
      throw new Error(`Cargo quantity (${cargoQuantity} MT) cannot be negative.`);
    }

    if (cargoQuantity > vesselDeadweight) {
      throw new Error(`Cargo quantity (${cargoQuantity} MT) exceeds vessel deadweight (${vesselDeadweight} MT).`);
    }
  }

  /**
   * Calculates the cargo quantity for a new berth report based on previous operations in the voyage.
   * Logic extracted from the original ReportService.submitReport.
   */
  static async calculateNewBerthCargoQuantity(
    reportId: string, // ID of the current berth report being submitted
    voyageId: string,
    currentBerthInput: BerthSpecificData, // The cargoLoaded/Unloaded for the current operation
    vesselDeadweight: number | null | undefined,
    client: PoolClient | import('pg').Pool = pool
  ): Promise<number> {
    console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Calculating for voyageId: ${voyageId}, new berth report: ${reportId}`);

    const approvedDepartureReportFromModel = await ReportModel.findLatestApprovedDepartureReportForVoyage(voyageId, client);
    let baseCargoQuantity = 0;

    if (approvedDepartureReportFromModel && approvedDepartureReportFromModel.reportType === 'departure') {
      const departureReport = approvedDepartureReportFromModel as Partial<DepartureSpecificData>;
      if (typeof departureReport.cargoQuantity === 'number') {
        baseCargoQuantity = departureReport.cargoQuantity;
        console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Initial baseCargoQuantity from approved departure ${approvedDepartureReportFromModel.id}: ${baseCargoQuantity}`);
      }
    } else {
      console.warn(`[CargoCalculator.calculateNewBerthCargoQuantity] Could not find an approved Departure report or its cargoQuantity for voyage ${voyageId}. Defaulting baseCargoQuantity to 0.`);
    }

    const previousApprovedBerthReports = (await ReportModel._getAllReportsForVoyage(voyageId, client))
      .filter(r => r.reportType === 'berth' && r.status === 'approved' && r.id !== reportId)
      .sort((a, b) => new Date(`${a.reportDate}T${a.reportTime}`).getTime() - new Date(`${b.reportDate}T${b.reportTime}`).getTime());

    for (const prevBerth of previousApprovedBerthReports) {
      const loaded = (prevBerth as BerthSpecificData).cargoLoaded ?? 0;
      const unloaded = (prevBerth as BerthSpecificData).cargoUnloaded ?? 0;
      baseCargoQuantity += loaded - unloaded;
      console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] After prevBerth ${prevBerth.id}: loaded=${loaded}, unloaded=${unloaded}, new baseCargoQuantity=${baseCargoQuantity}`);
    }
    console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Final baseCargoQuantity before current op: ${baseCargoQuantity}`);

    const cargoLoadedForCurrentOp = currentBerthInput.cargoLoaded ?? 0;
    const cargoUnloadedForCurrentOp = currentBerthInput.cargoUnloaded ?? 0;

    const newCargoQuantity = baseCargoQuantity + cargoLoadedForCurrentOp - cargoUnloadedForCurrentOp;

    this.validateCargoAgainstVesselCapacity(newCargoQuantity, vesselDeadweight, 'berth');

    console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Calculated new cargo quantity for report ${reportId}: ${newCargoQuantity}`);
    return newCargoQuantity;
  }

  /**
   * Calculates the cargo quantity for a resubmitted berth report.
   * Logic extracted from the original ReportService.resubmitReport.
   */
  static async calculateResubmittedBerthCargoQuantity(
    reportBeingResubmitted: Report, // The full original report object being resubmitted
    changes: Partial<BerthSpecificData>, // The changes being applied
    vessel: Vessel,
    client: PoolClient | import('pg').Pool = pool
  ): Promise<number | null> { // Returns null if cargo not changed or not a berth report
    if (reportBeingResubmitted.reportType !== 'berth' || !reportBeingResubmitted.voyageId) {
        return null;
    }

    const voyageId = reportBeingResubmitted.voyageId;
    const originalBerthDataAsRecord = reportBeingResubmitted as ReportRecordData;

    if (changes.cargoLoaded === undefined && changes.cargoUnloaded === undefined) {
      return originalBerthDataAsRecord.cargoQuantity ?? null;
    }
    console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Recalculating cargo for resubmitted berth report ${reportBeingResubmitted.id} in voyage ${voyageId}`);


    const voyageReportsPriorToCurrent = (await ReportModel._getAllReportsForVoyage(voyageId, client))
      .filter(r =>
        r.id !== reportBeingResubmitted.id &&
        r.status === 'approved' &&
        new Date(`${r.reportDate}T${r.reportTime}Z`).getTime() < new Date(`${originalBerthDataAsRecord.reportDate}T${originalBerthDataAsRecord.reportTime}Z`).getTime()
      )
      .sort((a, b) => new Date(`${a.reportDate}T${a.reportTime}Z`).getTime() - new Date(`${b.reportDate}T${b.reportTime}Z`).getTime());

    let baseCargoQuantity = 0;
    const departureReportFromModel = voyageReportsPriorToCurrent.find(r => r.reportType === 'departure');

    if (departureReportFromModel && departureReportFromModel.reportType === 'departure') {
      const departureReport = departureReportFromModel as Partial<DepartureSpecificData>;
      if (typeof departureReport.cargoQuantity === 'number') {
        baseCargoQuantity = departureReport.cargoQuantity;
      }
    } else {
      const firstVoyageReport = await ReportModel.getFirstReportForVoyage(voyageId, client);
      if (firstVoyageReport && firstVoyageReport.reportType === 'departure') {
        const typedFirstVoyageReport = firstVoyageReport as Partial<DepartureSpecificData>;
        if (typeof typedFirstVoyageReport.cargoQuantity === 'number') {
          baseCargoQuantity = typedFirstVoyageReport.cargoQuantity;
        }
      } else {
        console.warn(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Could not determine initial cargo quantity for voyage ${voyageId}. Using 0 as base.`);
      }
    }
    console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Initial base for resubmission: ${baseCargoQuantity}`);


    voyageReportsPriorToCurrent.forEach(prevReport => {
      if (prevReport.reportType === 'berth') {
        const prevBerth = prevReport as Report & BerthSpecificData;
        const loaded = prevBerth.cargoLoaded ?? 0;
        const unloaded = prevBerth.cargoUnloaded ?? 0;
        baseCargoQuantity += loaded - unloaded;
        console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] After prior berth ${prevReport.id}: loaded=${loaded}, unloaded=${unloaded}, new base=${baseCargoQuantity}`);
      }
    });

    const currentCargoLoaded = changes.cargoLoaded !== undefined ? Number(changes.cargoLoaded) : Number((originalBerthDataAsRecord as BerthSpecificData).cargoLoaded ?? 0);
    const currentCargoUnloaded = changes.cargoUnloaded !== undefined ? Number(changes.cargoUnloaded) : Number((originalBerthDataAsRecord as BerthSpecificData).cargoUnloaded ?? 0);
    
    const finalCargoQuantity = baseCargoQuantity + currentCargoLoaded - currentCargoUnloaded;

    this.validateCargoAgainstVesselCapacity(
      finalCargoQuantity,
      vessel.deadweight,
      'berth'
    );
    console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Final recalculated cargo for ${reportBeingResubmitted.id}: ${finalCargoQuantity}`);
    return finalCargoQuantity;
  }
}