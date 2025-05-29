import { v4 as uuidv4 } from 'uuid';
import db from '../../db/connection'; // For transactions
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
    ValidationOrchestrator.checkCaptainPendingReports(captainId, reportInput.vesselId);

    // --- 1. Fetch Vessel ---
    const vessel = VesselModel.findById(reportInput.vesselId);
    if (!vessel) throw new Error(`Vessel with ID ${reportInput.vesselId} not found.`);

    // --- 2. Determine Voyage Context and Previous Report ---
    let voyageToUse: Voyage | undefined = undefined;
    let previousReportForCalculations: Partial<Report> | null = null;
    let voyageIdToUse: string | null = null;
    let previousVoyageState: PreviousVoyageFinalState | null = null;

    const activeVoyageCheck = VoyageModel.findActiveByVesselId(reportInput.vesselId);

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
      // Validate cargo quantity after potential defaulting
      CargoCalculator.validateCargoAgainstVesselCapacity(
        (reportInput as DepartureSpecificData).cargoQuantity ?? 0, // Use ?? 0 if it can be undefined
        vessel.deadweight,
        'departure'
      );
      // For ROB calculations, previousReportForCalculations will be based on previousVoyageState or vessel's initial ROBs.
      if (previousVoyageState && previousVoyageState.reportId) {
        previousReportForCalculations = ReportModel.findById(previousVoyageState.reportId);
      } else {
        previousReportForCalculations = ReportModel.getLatestReportForVessel(vessel.id); // Could be null
      }
    } else { // Noon, Arrival, Berth, AAN
      if (!activeVoyageCheck) {
        throw new Error(`No active voyage found for vessel ${reportInput.vesselId}. Cannot submit ${reportInput.reportType} report.`);
      }
      voyageToUse = activeVoyageCheck;
      voyageIdToUse = voyageToUse.id;
      previousReportForCalculations = ReportModel.getLatestReportForVoyage(voyageToUse.id); // Get latest for *this* voyage
    }

    // --- Check for Pending Reports for the voyage (if not departure) ---
    if (reportInput.reportType !== 'departure' && voyageIdToUse) {
      ValidationOrchestrator.checkVoyagePendingReports(captainId, voyageIdToUse);
    }

    // --- 3. Input Validation (using ValidationOrchestrator) ---
    const departureReportForValidation = (reportInput.reportType === 'berth' && voyageIdToUse)
      ? ReportModel.getFirstReportForVoyage(voyageIdToUse)
      : null;
    const initialCargoStatusForValidation = (departureReportForValidation?.reportType === 'departure')
      ? (departureReportForValidation as DepartureSpecificData).cargoStatus
      : null;
    let previousNoonPassageState: PassageState | null = null;
    if (reportInput.reportType === 'noon' && voyageIdToUse) {
      const previousNoonReport = ReportModel.getLatestNoonReportForVoyage(voyageIdToUse);
      previousNoonPassageState = previousNoonReport?.passageState ?? null;
    }

    ValidationOrchestrator.validateReportInput(
      reportInput,
      vessel,
      previousReportForCalculations,
      initialCargoStatusForValidation,
      previousNoonPassageState
    );

    // --- 4. Perform Calculations ---
    const robCalcs: RobCalculationResult = RobCalculator.calculateRobs(
      vessel,
      reportInput,
      previousReportForCalculations,
      previousVoyageState // This is null for non-departure types
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

    // Cumulative Sailing Time & Avg Speed
    let previousApprovedReportsForPerf: Partial<Report>[] = [];
    if (voyageIdToUse) {
        previousApprovedReportsForPerf = ReportModel._getAllReportsForVoyage(voyageIdToUse)
                                            .filter(r => r.status === 'approved');
    }
    const sailingTimeVoyage = PerformanceCalculator.calculateSailingTimeVoyage(
      reportInput.meDailyRunHours, // meDailyRunHours is on BaseReportData, so available on reportInput
      previousApprovedReportsForPerf
    );
    const avgSpeedVoyage = PerformanceCalculator.calculateAverageSpeedVoyage(
      distanceOutput.totalDistanceTravelled,
      sailingTimeVoyage
    );

    let berthCalculatedCargoQuantity: number | null = null;
    if (reportInput.reportType === 'berth' && voyageIdToUse) {
      berthCalculatedCargoQuantity = CargoCalculator.calculateNewBerthCargoQuantity(
        reportId,
        voyageIdToUse,
        reportInput as BerthSpecificData,
        vessel.deadweight
      );
    }

    // --- 5. Prepare Data for Persistence (using ReportBuilder) ---
    const reportCalculations = {
        totalConsumptions: robCalcs.totalConsumptions,
        currentRobs: robCalcs.currentRobs,
        distanceOutput: distanceOutput,
        sailingTimeVoyage: sailingTimeVoyage,
        avgSpeedVoyage: avgSpeedVoyage,
        berthCalculatedCargoQuantity: berthCalculatedCargoQuantity,
        initialRobDataForRecord: robCalcs.inputInitialRobData
    };

    // Voyage ID association happens inside the transaction
    const reportRecordData = ReportBuilder.buildReportRecord(
      reportId,
      reportInput,
      captainId,
      null, // voyageIdToAssociate will be set inside transaction
      reportCalculations
    );


    // --- 6. Execute Transaction ---
    const transactionFn = db.transaction(async () => {
      let finalVoyageIdToAssociateWithReport: string;

      if (reportInput.reportType === 'departure') {
        const createdOrEnsuredVoyage = await VoyageLifecycleService.ensureNewVoyageIsCreated(
          reportInput.vesselId,
          reportInput as Report & DepartureSpecificData // Cast, assuming it's populated enough
        );
        finalVoyageIdToAssociateWithReport = createdOrEnsuredVoyage.id;
      } else {
        if (!voyageIdToUse) {
          throw new Error("Internal error: voyageIdToUse is not set for non-departure report within transaction.");
        }
        finalVoyageIdToAssociateWithReport = voyageIdToUse;
      }
      
      // Update voyageId in the record before creating
      reportRecordData.voyageId = finalVoyageIdToAssociateWithReport;

      ReportModel._createReportRecord(reportRecordData);

      if (reportInput.reportType !== 'berth' && reportInput.engineUnits?.length) {
        if (!ReportEngineUnitModel.createMany(reportId, reportInput.engineUnits)) {
          throw new Error("Failed to create engine units");
        }
      }
      if (reportInput.auxEngines?.length) {
        if (!ReportAuxEngineModel.createMany(reportId, reportInput.auxEngines)) {
          throw new Error("Failed to create aux engines");
        }
      }
      // Ensure report is linked if it was a departure and VoyageLifecycleService didn't update an existing report ID
      if (reportInput.reportType === 'departure') {
          const createdReportCheck = ReportModel.findById(reportId);
          if (createdReportCheck && createdReportCheck.voyageId !== finalVoyageIdToAssociateWithReport) {
              ReportModel.updateVoyageId(reportId, finalVoyageIdToAssociateWithReport);
          }
      }
      return reportId;
    });

    try {
      await transactionFn(); // Execute the transaction
      // Fetch the full report using ReportQueryService to ensure consistency with getReportById
      const fullReport = await this.reportQueryService.getReportById(reportId);
      return fullReport as Report; // Cast to Report as per original signature
    } catch (error) {
      console.error(`Report submission transaction failed for report ${reportId}:`, error);
      throw error;
    }
  }
}