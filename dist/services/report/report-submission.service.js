"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportSubmissionService = void 0;
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../../db/connection")); // For transactions
// import { User } from '../../types/user'; // CaptainId is string
const report_model_1 = __importDefault(require("../../models/report.model"));
const vessel_model_1 = __importDefault(require("../../models/vessel.model"));
const voyage_model_1 = __importDefault(require("../../models/voyage.model"));
const report_engine_unit_model_1 = __importDefault(require("../../models/report_engine_unit.model"));
const report_aux_engine_model_1 = __importDefault(require("../../models/report_aux_engine.model"));
const voyage_lifecycle_service_1 = require("../voyage_lifecycle.service");
const distance_calculator_1 = require("../distance_calculator");
// Helper Modules
const report_builder_1 = require("./helpers/report-builder");
const rob_calculator_1 = require("./helpers/rob-calculator");
const cargo_calculator_1 = require("./helpers/cargo-calculator");
const performance_calculator_1 = require("./helpers/performance-calculator");
const validation_orchestrator_1 = require("./helpers/validation-orchestrator");
const report_query_service_1 = require("./report-query.service"); // To fetch the full report at the end
class ReportSubmissionService {
    constructor() {
        // Instantiate helpers if they were classes with non-static methods
        // For now, they are mostly static, so direct calls are fine.
        this.reportQueryService = new report_query_service_1.ReportQueryService();
    }
    async submitReport(reportInput, captainId) {
        const reportId = (0, uuid_1.v4)();
        // --- 0. Pre-validation: Captain's pending reports for this vessel ---
        validation_orchestrator_1.ValidationOrchestrator.checkCaptainPendingReports(captainId, reportInput.vesselId);
        // --- 1. Fetch Vessel ---
        const vessel = vessel_model_1.default.findById(reportInput.vesselId);
        if (!vessel)
            throw new Error(`Vessel with ID ${reportInput.vesselId} not found.`);
        // --- 2. Determine Voyage Context and Previous Report ---
        let voyageToUse = undefined;
        let previousReportForCalculations = null;
        let voyageIdToUse = null;
        let previousVoyageState = null;
        const activeVoyageCheck = voyage_model_1.default.findActiveByVesselId(reportInput.vesselId);
        if (reportInput.reportType === 'departure') {
            previousVoyageState = await voyage_lifecycle_service_1.VoyageLifecycleService.findLatestCompletedVoyageFinalState(reportInput.vesselId);
            if (previousVoyageState) {
                // Apply defaults from previous voyage if not provided in DTO
                const depInput = reportInput;
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
            const absoluteLatestApprovedReportFromDb = report_model_1.default.getLatestApprovedReportForVessel(reportInput.vesselId);
            // Cast to a type that includes all potential DB fields for easier access
            // ReportRecordData from report.model.ts is suitable here as it represents the flat DB structure.
            // We need to import it or ensure Report type from ../types/report includes all these as optional.
            // For now, assuming Report type from ../types/report.ts (imported as Report) has these as optional top-level fields
            // as per its definition (lines 324-326 in the version I saw).
            // If ReportModel returns Partial<Report>, and Report is the union, this is tricky.
            if (absoluteLatestApprovedReportFromDb) {
                // Cast to ReportRecordData to access the flat DB structure fields
                const latestReportRecord = absoluteLatestApprovedReportFromDb;
                const depInput = reportInput;
                const submittedCargoQuantity = depInput.cargoQuantity !== undefined ? Number(depInput.cargoQuantity) : null;
                const submittedCargoType = depInput.cargoType;
                const submittedCargoStatus = depInput.cargoStatus;
                // Access fields from the ReportRecordData type
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
                    throw new Error(`Cargo details mismatch. New Departure Report - Submitted: Qty=${submittedCargoQuantity ?? 'N/A'}, Type=${submittedCargoType ?? 'N/A'}, Status=${submittedCargoStatus ?? 'N/A'}. ` +
                        `Vessel's Last Known State: Qty=${lastKnownCargoQuantity}, Type=${lastKnownCargoType}, Status=${lastKnownCargoStatus}. ` +
                        `Ensure departure cargo details match the vessel's current state.`);
                }
            }
            // --- END: Cargo Continuity Validation ---
            // Validate cargo quantity against DWT (already present, good)
            cargo_calculator_1.CargoCalculator.validateCargoAgainstVesselCapacity(reportInput.cargoQuantity ?? 0, vessel.deadweight, 'departure');
            // For ROB calculations, previousReportForCalculations will be based on previousVoyageState or vessel's initial ROBs.
            if (previousVoyageState && previousVoyageState.reportId) {
                previousReportForCalculations = report_model_1.default.findById(previousVoyageState.reportId);
            }
            else {
                previousReportForCalculations = report_model_1.default.getLatestReportForVessel(vessel.id); // Could be null
            }
        }
        else { // Noon, Arrival, Berth, AAN
            if (!activeVoyageCheck) {
                throw new Error(`No active voyage found for vessel ${reportInput.vesselId}. Cannot submit ${reportInput.reportType} report.`);
            }
            voyageToUse = activeVoyageCheck;
            voyageIdToUse = voyageToUse.id;
            previousReportForCalculations = report_model_1.default.getLatestReportForVoyage(voyageToUse.id); // Get latest for *this* voyage
        }
        // --- Check for Pending Reports for the voyage (if not departure) ---
        if (reportInput.reportType !== 'departure' && voyageIdToUse) {
            validation_orchestrator_1.ValidationOrchestrator.checkVoyagePendingReports(captainId, voyageIdToUse);
        }
        // --- 3. Input Validation (using ValidationOrchestrator) ---
        const departureReportForValidation = (reportInput.reportType === 'berth' && voyageIdToUse)
            ? report_model_1.default.getFirstReportForVoyage(voyageIdToUse)
            : null;
        const initialCargoStatusForValidation = (departureReportForValidation?.reportType === 'departure')
            ? departureReportForValidation.cargoStatus
            : null;
        let previousNoonPassageState = null;
        if (reportInput.reportType === 'noon' && voyageIdToUse) {
            const previousNoonReport = report_model_1.default.getLatestNoonReportForVoyage(voyageIdToUse);
            previousNoonPassageState = previousNoonReport?.passageState ?? null;
        }
        validation_orchestrator_1.ValidationOrchestrator.validateReportInput(reportInput, vessel, previousReportForCalculations, initialCargoStatusForValidation, previousNoonPassageState);
        // --- 4. Perform Calculations ---
        const robCalcs = rob_calculator_1.RobCalculator.calculateRobs(vessel, reportInput, previousReportForCalculations, previousVoyageState // This is null for non-departure types
        );
        const distanceCalcVoyageDistance = voyageToUse?.voyageDistance ??
            (reportInput.reportType === 'departure' ? reportInput.voyageDistance : 0);
        const distanceInput = {
            reportType: reportInput.reportType,
            harbourDistance: reportInput.reportType === 'departure' ? reportInput.harbourDistance : undefined,
            distanceSinceLastReport: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival' || reportInput.reportType === 'arrival_anchor_noon') && 'distanceSinceLastReport' in reportInput ?
                reportInput.distanceSinceLastReport : undefined,
            previousReportData: previousReportForCalculations,
            voyageDistance: distanceCalcVoyageDistance
        };
        const distanceOutput = (0, distance_calculator_1.calculateDistances)(distanceInput);
        // Cumulative Sailing Time & Avg Speed
        let previousApprovedReportsForPerf = [];
        if (voyageIdToUse) {
            previousApprovedReportsForPerf = report_model_1.default._getAllReportsForVoyage(voyageIdToUse)
                .filter(r => r.status === 'approved');
        }
        const sailingTimeVoyage = performance_calculator_1.PerformanceCalculator.calculateSailingTimeVoyage(reportInput.meDailyRunHours, // meDailyRunHours is on BaseReportData, so available on reportInput
        previousApprovedReportsForPerf);
        const avgSpeedVoyage = performance_calculator_1.PerformanceCalculator.calculateAverageSpeedVoyage(distanceOutput.totalDistanceTravelled, sailingTimeVoyage);
        let berthCalculatedCargoQuantity = null;
        if (reportInput.reportType === 'berth' && voyageIdToUse) {
            berthCalculatedCargoQuantity = cargo_calculator_1.CargoCalculator.calculateNewBerthCargoQuantity(reportId, voyageIdToUse, reportInput, vessel.deadweight);
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
        const reportRecordData = report_builder_1.ReportBuilder.buildReportRecord(reportId, reportInput, captainId, null, // voyageIdToAssociate will be set inside transaction
        reportCalculations);
        // --- 6. Execute Transaction ---
        const transactionFn = connection_1.default.transaction(async () => {
            let finalVoyageIdToAssociateWithReport;
            if (reportInput.reportType === 'departure') {
                const createdOrEnsuredVoyage = await voyage_lifecycle_service_1.VoyageLifecycleService.ensureNewVoyageIsCreated(reportInput.vesselId, reportInput // Cast, assuming it's populated enough
                );
                finalVoyageIdToAssociateWithReport = createdOrEnsuredVoyage.id;
            }
            else {
                if (!voyageIdToUse) {
                    throw new Error("Internal error: voyageIdToUse is not set for non-departure report within transaction.");
                }
                finalVoyageIdToAssociateWithReport = voyageIdToUse;
            }
            // Update voyageId in the record before creating
            reportRecordData.voyageId = finalVoyageIdToAssociateWithReport;
            report_model_1.default._createReportRecord(reportRecordData);
            if (reportInput.reportType !== 'berth' && reportInput.engineUnits?.length) {
                if (!report_engine_unit_model_1.default.createMany(reportId, reportInput.engineUnits)) {
                    throw new Error("Failed to create engine units");
                }
            }
            if (reportInput.auxEngines?.length) {
                if (!report_aux_engine_model_1.default.createMany(reportId, reportInput.auxEngines)) {
                    throw new Error("Failed to create aux engines");
                }
            }
            // Ensure report is linked if it was a departure and VoyageLifecycleService didn't update an existing report ID
            if (reportInput.reportType === 'departure') {
                const createdReportCheck = report_model_1.default.findById(reportId);
                if (createdReportCheck && createdReportCheck.voyageId !== finalVoyageIdToAssociateWithReport) {
                    report_model_1.default.updateVoyageId(reportId, finalVoyageIdToAssociateWithReport);
                }
            }
            return reportId;
        });
        try {
            await transactionFn(); // Execute the transaction
            // Fetch the full report using ReportQueryService to ensure consistency with getReportById
            const fullReport = await this.reportQueryService.getReportById(reportId);
            return fullReport; // Cast to Report as per original signature
        }
        catch (error) {
            console.error(`Report submission transaction failed for report ${reportId}:`, error);
            throw error;
        }
    }
}
exports.ReportSubmissionService = ReportSubmissionService;
