import { PoolClient } from 'pg';
import pool from '../../../db/connection';
import {
    CreateReportDTO,
    Report,
    ReportType,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    ArrivalAnchorNoonSpecificData,
    PassageState,
    CargoStatus,
} from '../../../types/report';
import { Vessel } from '../../../types/vessel';
import ReportModel from '../../../models/report.model';
import { CargoCalculator } from './cargo-calculator'; // For cargo capacity validation

// Result type for pre-submission validation
export interface PreSubmissionValidationResult {
    isValid: boolean;
    message?: string;
    vessel?: Vessel; // Return vessel if fetched
    previousReportForCalculations?: Partial<Report> | null;
    initialCargoStatusForValidation?: CargoStatus | null;
    previousNoonPassageState?: PassageState | null;
}

export class ValidationOrchestrator {
  /**
   * Checks if the captain already has any pending reports for the given vessel.
   * Throws an error if pending reports exist.
   */
  static async checkCaptainPendingReports(captainId: string, vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<void> {
    if (await ReportModel.hasPendingReports(captainId, vesselId, client)) {
      throw new Error(`Cannot submit new report: Captain ${captainId} already has a pending report for vessel ${vesselId}.`);
    }
  }

  /**
   * Checks if there are pending reports for a specific voyage by the captain.
   * Throws an error if pending reports exist for that voyage.
   */
  static async checkVoyagePendingReports(captainId: string, voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<void> {
    if (await ReportModel.hasPendingReportsForVoyage(captainId, voyageId, client)) {
      throw new Error(`Cannot submit report: A previous report for voyage ${voyageId} submitted by this captain is still pending review.`);
    }
  }


  /**
   * Validates the input data for a report based on its type and the previous report's state.
   * Throws an error if validation fails.
   * Moved from report_validator.ts
   */
  static validateReportInput(
    reportInput: CreateReportDTO,
    vessel: Vessel,
    previousReport: Partial<Report> | null,
    initialCargoStatus: CargoStatus | null = null,
    previousNoonPassageState?: PassageState | null
  ): void {
    // --- Report Sequence Validation ---
    if (previousReport && reportInput.reportType !== 'departure') {
      const previousType = previousReport.reportType;
      const currentType = reportInput.reportType;

      switch (previousType) {
        case 'departure':
          if (currentType !== 'noon' && currentType !== 'arrival') {
            throw new Error(`Invalid report sequence: After 'departure', only 'noon' or 'arrival' is allowed, not '${currentType}'.`);
          }
          break;
        case 'noon':
          if (currentType !== 'noon' && currentType !== 'arrival') {
            throw new Error(`Invalid report sequence: After 'noon', only 'noon' or 'arrival' is allowed, not '${currentType}'.`);
          }
          break;
        case 'arrival':
          if (currentType !== 'berth' && currentType !== 'arrival_anchor_noon') {
            throw new Error(`Invalid report sequence: After 'arrival', only 'berth' or 'arrival_anchor_noon' is allowed within the same voyage, not '${currentType}'.`);
          }
          break;
        case 'arrival_anchor_noon':
          if (currentType !== 'arrival_anchor_noon' && currentType !== 'berth') {
            throw new Error(`Invalid report sequence: After 'arrival_anchor_noon', only another 'arrival_anchor_noon' or 'berth' is allowed, not '${currentType}'.`);
          }
          break;
        case 'berth':
          if (currentType !== 'berth') {
            throw new Error(`Invalid report sequence: After 'berth', only 'berth' is allowed within the same voyage, not '${currentType}'.`);
          }
          break;
      }
    } else if (!previousReport && reportInput.reportType !== 'departure') {
      throw new Error(`Invalid report: Cannot submit '${reportInput.reportType}' as the first report of a voyage. Must be 'departure'.`);
    }

    // --- Specific Field Validations ---
    switch (reportInput.reportType) {
      case 'departure':
        this.validateDepartureReport(reportInput as DepartureSpecificData, vessel);
        break;
      case 'noon':
        this.validateNoonReport(reportInput as NoonSpecificData, previousNoonPassageState);
        break;
      case 'arrival':
        this.validateArrivalReport(reportInput as ArrivalSpecificData);
        break;
      case 'berth':
        this.validateBerthReport(reportInput as BerthSpecificData, vessel);
        break;
      case 'arrival_anchor_noon':
        this.validateArrivalAnchorNoonReport(reportInput as ArrivalAnchorNoonSpecificData);
        break;
      default:
        throw new Error(`Invalid report type provided: ${(reportInput as any)?.reportType}`);
    }
  }

  // --- Helper Validation Functions (moved from report_validator.ts) ---

  private static validateDepartureReport(reportInput: DepartureSpecificData, vessel: Vessel): void {
    CargoCalculator.validateCargoAgainstVesselCapacity(
      reportInput.cargoQuantity,
      vessel.deadweight,
      reportInput.reportType
    );

    if (vessel.initialRobLsifo !== null) {
      const hasInitialRobInput = (
        reportInput.initialRobLsifo !== undefined && reportInput.initialRobLsifo !== null ||
        reportInput.initialRobLsmgo !== undefined && reportInput.initialRobLsmgo !== null ||
        reportInput.initialRobCylOil !== undefined && reportInput.initialRobCylOil !== null ||
        reportInput.initialRobMeOil !== undefined && reportInput.initialRobMeOil !== null ||
        reportInput.initialRobAeOil !== undefined && reportInput.initialRobAeOil !== null
      );
      if (hasInitialRobInput) {
        throw new Error("Initial ROB fields cannot be provided for subsequent departure reports after the first one has been approved.");
      }
    }

    const requiredFields: Array<keyof DepartureSpecificData> = [
      'vesselId', 'reportDate', 'reportTime', 'timeZone', 'windDirection', 'seaDirection',
      'swellDirection', 'windForce', 'seaState', 'swellHeight', 'meConsumptionLsifo',
      'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
      'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo',
      'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil',
      'supplyAeOil', 'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
      'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut',
      'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed',
      'departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime',
      'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
      'faspDate', 'faspTime',
      'faspLatDeg', 'faspLatMin', 'faspLatDir',
      'faspLonDeg', 'faspLonMin', 'faspLonDir',
      'faspCourse',
      'harbourDistance', 'harbourTime',
    ];
    this.checkRequiredFields(reportInput, requiredFields, 'departure');
    this.validateCommonRanges(reportInput);
    if (reportInput.mePresentRpm === undefined || reportInput.mePresentRpm === null || reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid or missing mePresentRpm value: ${reportInput.mePresentRpm}. Must be provided and non-negative for Departure.`);
    }
    if (reportInput.meCurrentSpeed === undefined || reportInput.meCurrentSpeed === null || reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid or missing meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be provided and non-negative for Departure.`);
    }
    this.validateMachineryInput(reportInput);
  }

  private static validateNoonReport(reportInput: NoonSpecificData, previousPassageState?: PassageState | null): void {
    if (reportInput.distanceSinceLastReport === undefined || reportInput.distanceSinceLastReport === null || reportInput.distanceSinceLastReport < 0) {
      throw new Error(`Missing or invalid mandatory field for noon report: distanceSinceLastReport (must be >= 0).`);
    }
    if (previousPassageState === 'SOSP') {
      if (reportInput.passageState !== 'SOSP' && reportInput.passageState !== 'ROSP') {
        throw new Error(`Invalid passageState transition: Previous state was SOSP, current state must be SOSP or ROSP, but got '${reportInput.passageState ?? 'None'}'.`);
      }
    } else {
      if (reportInput.passageState === 'ROSP') {
        throw new Error(`Invalid passageState transition: Previous state was ${previousPassageState || 'None/Departure'}, current state cannot be ROSP.`);
      }
    }
    if (!reportInput.noonDate || !reportInput.noonTime ||
        reportInput.noonLatDeg === undefined || reportInput.noonLatMin === undefined || !reportInput.noonLatDir ||
        reportInput.noonLonDeg === undefined || reportInput.noonLonMin === undefined || !reportInput.noonLonDir ||
        reportInput.noonCourse === undefined || reportInput.mePresentRpm === undefined || reportInput.meCurrentSpeed === undefined) {
      throw new Error(`Missing mandatory fields for Noon report: noonDate, noonTime, noonLatitude (Deg/Min/Dir), noonLongitude (Deg/Min/Dir), noonCourse, mePresentRpm, meCurrentSpeed.`);
    }
    if (reportInput.passageState === 'SOSP') {
      if (!reportInput.sospDate || !reportInput.sospTime ||
          reportInput.sospLatDeg === undefined || reportInput.sospLatMin === undefined || !reportInput.sospLatDir ||
          reportInput.sospLonDeg === undefined || reportInput.sospLonMin === undefined || !reportInput.sospLonDir ||
          reportInput.sospCourse === undefined) {
        throw new Error(`Missing mandatory fields for SOSP passage state: sospDate, sospTime, sospLatitude (Deg/Min/Dir), sospLongitude (Deg/Min/Dir), sospCourse.`);
      }
    } else if (reportInput.passageState === 'ROSP') {
       if (!reportInput.rospDate || !reportInput.rospTime ||
           reportInput.rospLatDeg === undefined || reportInput.rospLatMin === undefined || !reportInput.rospLatDir ||
           reportInput.rospLonDeg === undefined || reportInput.rospLonMin === undefined || !reportInput.rospLonDir ||
           reportInput.rospCourse === undefined) {
        throw new Error(`Missing mandatory fields for ROSP passage state: rospDate, rospTime, rospLatitude (Deg/Min/Dir), rospLongitude (Deg/Min/Dir), rospCourse.`);
      }
    }
    this.validateCommonRanges(reportInput);
     if (reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid mePresentRpm value: ${reportInput.mePresentRpm}. Must be non-negative.`);
    }
    if (reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be non-negative.`);
    }
    this.validateMachineryInput(reportInput);
  }

  private static validateArrivalReport(reportInput: ArrivalSpecificData): void {
    const requiredFields: Array<keyof ArrivalSpecificData> = [
      'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
      'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut',
      'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed',
      'eospDate', 'eospTime',
      'eospLatDeg', 'eospLatMin', 'eospLatDir',
      'eospLonDeg', 'eospLonMin', 'eospLonDir',
      'eospCourse',
      'distanceSinceLastReport', 'harbourDistance', 'harbourTime',
      'estimatedBerthingDate', 'estimatedBerthingTime'
    ];
    this.checkRequiredFields(reportInput, requiredFields, 'arrival');
    if (reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Invalid distanceSinceLastReport: ${reportInput.distanceSinceLastReport}. Must be >= 0.`);
    }
    if (reportInput.harbourDistance < 0) {
        throw new Error(`Invalid harbourDistance: ${reportInput.harbourDistance}. Must be >= 0.`);
    }
    if (!/^\d{2}:\d{2}$/.test(reportInput.harbourTime)) {
        throw new Error(`Invalid harbourTime format: ${reportInput.harbourTime}. Must be HH:MM.`);
    }
    this.validateCommonRanges(reportInput);
    if (reportInput.mePresentRpm === undefined || reportInput.mePresentRpm === null || reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid or missing mePresentRpm value: ${reportInput.mePresentRpm}. Must be provided and non-negative for Arrival.`);
    }
    if (reportInput.meCurrentSpeed === undefined || reportInput.meCurrentSpeed === null || reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid or missing meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be provided and non-negative for Arrival.`);
    }
    this.validateMachineryInput(reportInput);
  }

  private static validateBerthReport(reportInput: BerthSpecificData, vessel: Vessel): void {
    const navFields: Array<keyof BerthSpecificData> = [
      'berthDate', 'berthTime', 'berthNumber',
      'berthLatDeg', 'berthLatMin', 'berthLatDir',
      'berthLonDeg', 'berthLonMin', 'berthLonDir'
    ];
    this.checkRequiredFields(reportInput, navFields, 'berth (navigation)');
    const timeFields: Array<keyof BerthSpecificData> = ['cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime'];
    for (const field of timeFields) {
      if (!reportInput[field]) {
        throw new Error(`Missing mandatory cargo operations time field for berth report: ${field}`);
      }
    }
    if (reportInput.cargoLoaded !== undefined && reportInput.cargoLoaded !== null && reportInput.cargoLoaded < 0) {
      throw new Error(`Invalid 'cargoLoaded' field for berth report. Must be >= 0 if provided.`);
    }
    if (reportInput.cargoUnloaded !== undefined && reportInput.cargoUnloaded !== null && reportInput.cargoUnloaded < 0) {
      throw new Error(`Invalid 'cargoUnloaded' field for berth report. Must be >= 0 if provided.`);
    }
    // Cargo capacity validation for loaded/unloaded amounts is handled by CargoCalculator during quantity calculation
    this.validateCommonRanges(reportInput);
  }

  private static validateArrivalAnchorNoonReport(reportInput: ArrivalAnchorNoonSpecificData): void {
    const requiredFields: Array<keyof ArrivalAnchorNoonSpecificData> = [
      'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
      'noonDate', 'noonTime',
      'noonLatDeg', 'noonLatMin', 'noonLatDir',
      'noonLonDeg', 'noonLonMin', 'noonLonDir',
      'noonCourse', 'mePresentRpm', 'meCurrentSpeed',
      'windDirection', 'seaDirection', 'swellDirection', 'windForce', 'seaState', 'swellHeight',
      'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
      'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
      'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
      'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
      'meScavengeAirTemp', 'meTcRpm1', 'meTcExhaustTempIn', 'meTcExhaustTempOut',
      'meThrustBearingTemp', 'meDailyRunHours',
    ];
    this.checkRequiredFields(reportInput, requiredFields, 'Arrival Anchor Noon', true);
    this.validateCommonRanges(reportInput);
    if (reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Invalid distanceSinceLastReport: ${reportInput.distanceSinceLastReport}. Must be >= 0.`);
    }
    if (reportInput.noonCourse < 0 || reportInput.noonCourse > 360) {
        throw new Error(`Invalid noonCourse: ${reportInput.noonCourse}. Must be between 0 and 360.`);
    }
    if (reportInput.mePresentRpm !== undefined && reportInput.mePresentRpm !== null && reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid mePresentRpm value: ${reportInput.mePresentRpm}. Must be non-negative.`);
    }
    if (reportInput.meCurrentSpeed !== undefined && reportInput.meCurrentSpeed !== null && reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be non-negative.`);
    }
    this.validateMachineryInput(reportInput);
  }

  private static validateMachineryInput(reportInput: CreateReportDTO): void {
    const requiredUnits = [1, 2, 3, 4, 5, 6];
    const providedUnitNumbers = reportInput.engineUnits?.map(u => u.unitNumber) ?? [];
    if (!requiredUnits.every(num => providedUnitNumbers.includes(num))) {
      throw new Error("Engine unit data for units 1-6 is required.");
    }
    const requiredAux = ['DG1'];
    const providedAuxNames = reportInput.auxEngines?.map(a => a.engineName) ?? [];
    if (!requiredAux.every(name => providedAuxNames.includes(name))) {
      throw new Error("Auxiliary engine data for DG1 is required.");
    }
  }

  private static checkRequiredFields<T extends CreateReportDTO>(
    reportInput: T,
    fields: Array<keyof T>,
    reportTypeName: string,
    allowZeroForConsumption = false
  ): void {
    for (const field of fields) {
      const value = reportInput[field];
      if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
        if (typeof value === 'number' && value === 0) continue;

        if (allowZeroForConsumption && typeof field === 'string' && field.startsWith('meConsumption') && (value === null || value === undefined || Number(value) === 0)) {
            continue;
        }
        throw new Error(`Missing mandatory field for ${reportTypeName} report: ${String(field)}`);
      }
    }
  }

  private static validateCommonRanges(reportInput: CreateReportDTO): void {
    if (reportInput.windForce !== undefined && reportInput.windForce !== null && (reportInput.windForce < 0 || reportInput.windForce > 12)) {
      throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
    }
    if (reportInput.seaState !== undefined && reportInput.seaState !== null && (reportInput.seaState < 0 || reportInput.seaState > 9)) {
      throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
    }
    if (reportInput.swellHeight !== undefined && reportInput.swellHeight !== null && (reportInput.swellHeight < 0 || reportInput.swellHeight > 9)) {
      throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
    }
  }
}