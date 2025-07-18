import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection'; // For transactions
import {
    Report,
    CreateReportDTO,
    ReportStatus,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    ArrivalAnchorNoonSpecificData,
    EngineUnitData,
    AuxEngineData,
    CargoStatus,
    PassageState,
    // FullReportViewDTO // Not returned by submit
} from '../../types/report';
// ReportRecordData is imported from './helpers/report-builder'
import { Voyage } from '../../types/voyage';
import { Vessel } from '../../types/vessel';
// import { User } from '../../types/user'; // CaptainId is string

import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model';
import VoyageModel from '../../models/voyage.model';
import ReportEngineUnitModel from '../../models/report_engine_unit.model';
import ReportAuxEngineModel from '../../models/report_aux_engine.model';

import { VoyageLifecycleService, PreviousVoyageFinalState } from '../voyage_lifecycle.service';
import { DistanceCalculationInput, calculateDistances, DistanceCalculationOutput } from '../distance_calculator';

// Helper Modules
import { ReportBuilder, ReportRecordData, InitialRobData as ReportBuilderInitialRobData } from './helpers/report-builder';
import { RobCalculator, RobCalculationResult, InitialRobData as RobCalcInitialRobData } from './helpers/rob-calculator';
import { CargoCalculator } from './helpers/cargo-calculator';
import { PerformanceCalculator } from './helpers/performance-calculator';
import { ValidationOrchestrator } from './helpers/validation-orchestrator';
import { ReportQueryService } from './report-query.service'; // To fetch the full report at the end

export class ReportSubmissionService {
  private reportQueryService: ReportQueryService;

  constructor() {
    // Instantiate helpers if they were classes with non-static methods
    // For now, they are mostly static, so direct calls are fine.
    this.reportQueryService = new ReportQueryService();
  }

  async submitReport(
    reportInput: CreateReportDTO,
    captainId: string
  ): Promise<Report> { // Original service returned Report, not FullReportViewDTO
    const reportId = uuidv4();

    // --- 0. Pre-validation: Captain's pending reports for this vessel ---
    await ValidationOrchestrator.checkCaptainPendingReports(captainId, reportInput.vesselId, pool);

    // --- 1. Fetch Vessel ---
    const vessel = await VesselModel.findById(reportInput.vesselId);
    if (!vessel) throw new Error(`Vessel with ID ${reportInput.vesselId} not found.`);

    // --- 2. Determine Voyage Context and Previous Report ---
    let voyageToUse: Voyage | null = null;
    let previousReportForCalculations: Partial<Report> | null = null;
    let voyageIdToUse: string | null = null;
    let previousVoyageState: PreviousVoyageFinalState | null = null;

    const activeVoyageCheck = await VoyageModel.findActiveByVesselId(reportInput.vesselId);

    if (reportInput.reportType === 'departure') {
      previousVoyageState = await VoyageLifecycleService.findLatestCompletedVoyageFinalState(reportInput.vesselId);
      if (previousVoyageState) {
        // Apply defaults from previous voyage if not provided in DTO
        const depInput = reportInput as DepartureSpecificData;
        if (depInput.cargoQuantity === undefined && previousVoyageState.cargoQuantity !== null) {
          depInput.cargoQuantity = previousVoyageState.cargoQuantity;
        }
        if (depInput.cargoType === undefined && previousVoyageState.cargoType !== null) {
          depInput.cargoType = previousVoyageState.cargoType;
        }
        if (depInput.cargoStatus === undefined && previousVoyageState.cargoStatus !== null) {
          depInput.cargoStatus = previousVoyageState.cargoStatus;
        }
      }

      // --- START: Cargo Continuity Validation for Departure Reports ---
      const absoluteLatestApprovedReportFromDb = await ReportModel.getLatestApprovedReportForVessel(reportInput.vesselId);
      
      if (absoluteLatestApprovedReportFromDb) {
        const latestReportRecord = absoluteLatestApprovedReportFromDb as ReportRecordData;

        const depInput = reportInput as DepartureSpecificData;
        const submittedCargoQuantity = depInput.cargoQuantity !== undefined ? Number(depInput.cargoQuantity) : null;
        const submittedCargoType = depInput.cargoType;
        const submittedCargoStatus = depInput.cargoStatus;

        const lastKnownCargoQuantity = latestReportRecord.cargoQuantity ?? 0;
        const lastKnownCargoType = latestReportRecord.cargoType ?? null;
        const lastKnownCargoStatus = latestReportRecord.cargoStatus ?? 'Empty';

        let mismatch = false;
        if (submittedCargoQuantity === null || Math.abs(submittedCargoQuantity - lastKnownCargoQuantity) > 1e-5) { // Compare numbers with tolerance
            mismatch = true;
        }
        if (submittedCargoType !== lastKnownCargoType) {
            mismatch = true;
        }
        if (submittedCargoStatus !== lastKnownCargoStatus) {
            mismatch = true;
        }

        if (mismatch) {
          throw new Error(
            `Cargo details mismatch. New Departure Report - Submitted: Qty=${submittedCargoQuantity ?? 'N/A'}, Type=${submittedCargoType ?? 'N/A'}, Status=${submittedCargoStatus ?? 'N/A'}. ` +
            `Vessel's Last Known State: Qty=${lastKnownCargoQuantity}, Type=${lastKnownCargoType}, Status=${lastKnownCargoStatus}. ` +
            `Ensure departure cargo details match the vessel's current state.`
          );
        }
      }
      // --- END: Cargo Continuity Validation ---

      CargoCalculator.validateCargoAgainstVesselCapacity(
        (reportInput as DepartureSpecificData).cargoQuantity ?? 0,
        vessel.deadweight,
        'departure'
      );
      if (previousVoyageState && previousVoyageState.reportId) {
        previousReportForCalculations = await ReportModel.findById(previousVoyageState.reportId);
      } else {
        previousReportForCalculations = await ReportModel.getLatestReportForVessel(vessel.id); // Could be null
      }
    } else { // Noon, Arrival, Berth, AAN
      if (!activeVoyageCheck) {
        throw new Error(`No active voyage found for vessel ${reportInput.vesselId}. Cannot submit ${reportInput.reportType} report.`);
      }
      voyageToUse = activeVoyageCheck;
      voyageIdToUse = voyageToUse.id;
      previousReportForCalculations = await ReportModel.getLatestReportForVoyage(voyageToUse.id); // Get latest for *this* voyage
    }

    if (reportInput.reportType !== 'departure' && voyageIdToUse) {
      await ValidationOrchestrator.checkVoyagePendingReports(captainId, voyageIdToUse, pool);
    }

    const departureReportForValidation = (reportInput.reportType === 'berth' && voyageIdToUse)
      ? await ReportModel.getFirstReportForVoyage(voyageIdToUse)
      : null;
    const initialCargoStatusForValidation = (departureReportForValidation?.reportType === 'departure')
      ? (departureReportForValidation as DepartureSpecificData).cargoStatus
      : null;
    let previousNoonPassageState: PassageState | null = null;
    if (reportInput.reportType === 'noon' && voyageIdToUse) {
      const previousNoonReport = await ReportModel.getLatestNoonReportForVoyage(voyageIdToUse);
      previousNoonPassageState = previousNoonReport?.passageState ?? null;
    }

    ValidationOrchestrator.validateReportInput(
      reportInput,
      vessel,
      previousReportForCalculations,
      initialCargoStatusForValidation,
      previousNoonPassageState
    );

    const robCalcs: RobCalculationResult = RobCalculator.calculateRobs(
      vessel,
      reportInput,
      previousReportForCalculations,
      previousVoyageState
    );

    const distanceCalcVoyageDistance = voyageToUse?.voyageDistance ??
      (reportInput.reportType === 'departure' ? (reportInput as DepartureSpecificData).voyageDistance : 0);

    const distanceInput: DistanceCalculationInput = {
      reportType: reportInput.reportType,
      harbourDistance: reportInput.reportType === 'departure' ? (reportInput as DepartureSpecificData).harbourDistance : undefined,
      distanceSinceLastReport: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival' || reportInput.reportType === 'arrival_anchor_noon') && 'distanceSinceLastReport' in reportInput ?
        (reportInput as NoonSpecificData | ArrivalSpecificData | ArrivalAnchorNoonSpecificData).distanceSinceLastReport : undefined,
      previousReportData: previousReportForCalculations,
      voyageDistance: distanceCalcVoyageDistance
    };
    const distanceOutput = calculateDistances(distanceInput);

    let previousApprovedReportsForPerf: Partial<Report>[] = [];
    if (voyageIdToUse) {
        previousApprovedReportsForPerf = (await ReportModel._getAllReportsForVoyage(voyageIdToUse))
                                            .filter(r => r.status === 'approved');
    }
    const sailingTimeVoyage = PerformanceCalculator.calculateSailingTimeVoyage(
      reportInput.meDailyRunHours,
      previousApprovedReportsForPerf
    );
    const avgSpeedVoyage = PerformanceCalculator.calculateAverageSpeedVoyage(
      distanceOutput.totalDistanceTravelled,
      sailingTimeVoyage
    );

    let berthCalculatedCargoQuantity: number | null = null;
    if (reportInput.reportType === 'berth' && voyageIdToUse) {
      berthCalculatedCargoQuantity = await CargoCalculator.calculateNewBerthCargoQuantity(
        reportId,
        voyageIdToUse,
        reportInput as BerthSpecificData,
        vessel.deadweight,
        pool
      );
    }

    const reportCalculations = {
        totalConsumptions: robCalcs.totalConsumptions,
        currentRobs: robCalcs.currentRobs,
        distanceOutput: distanceOutput,
        sailingTimeVoyage: sailingTimeVoyage,
        avgSpeedVoyage: avgSpeedVoyage,
        berthCalculatedCargoQuantity: berthCalculatedCargoQuantity,
        initialRobDataForRecord: robCalcs.inputInitialRobData
    };

    const reportRecordData = ReportBuilder.buildReportRecord(
      reportId,
      reportInput,
      captainId,
      null,
      reportCalculations
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let finalVoyageIdToAssociateWithReport: string;

      if (reportInput.reportType === 'departure') {
        const createdOrEnsuredVoyage = await VoyageLifecycleService.ensureNewVoyageIsCreated(
          reportInput.vesselId,
          reportInput as Report & DepartureSpecificData,
          client
        );
        finalVoyageIdToAssociateWithReport = createdOrEnsuredVoyage.id;
      } else {
        if (!voyageIdToUse) {
          throw new Error("Internal error: voyageIdToUse is not set for non-departure report within transaction.");
        }
        finalVoyageIdToAssociateWithReport = voyageIdToUse;
      }
      
      reportRecordData.voyageId = finalVoyageIdToAssociateWithReport;

      await ReportModel._createReportRecord(reportRecordData, client);

      if (reportInput.reportType !== 'berth' && reportInput.engineUnits?.length) {
        if (!await ReportEngineUnitModel.createMany(reportId, reportInput.engineUnits, client)) {
          throw new Error("Failed to create engine units");
        }
      }
      if (reportInput.auxEngines?.length) {
        if (!await ReportAuxEngineModel.createMany(reportId, reportInput.auxEngines, client)) {
          throw new Error("Failed to create aux engines");
        }
      }
      if (reportInput.reportType === 'departure') {
          const createdReportCheck = await ReportModel.findById(reportId, client);
          if (createdReportCheck && createdReportCheck.voyageId !== finalVoyageIdToAssociateWithReport) {
              await ReportModel.updateVoyageId(reportId, finalVoyageIdToAssociateWithReport, client);
          }
      }
      
      await client.query('COMMIT');
      
      const fullReport = await this.reportQueryService.getReportById(reportId);
      return fullReport as Report;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Report submission transaction failed for report ${reportId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}