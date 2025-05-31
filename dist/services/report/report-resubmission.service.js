"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportResubmissionService = void 0;
const connection_1 = __importDefault(require("../../db/connection")); // For transactions
const report_model_1 = __importDefault(require("../../models/report.model"));
const vessel_model_1 = __importDefault(require("../../models/vessel.model")); // Needed for cargo validation
const report_engine_unit_model_1 = __importDefault(require("../../models/report_engine_unit.model"));
const report_aux_engine_model_1 = __importDefault(require("../../models/report_aux_engine.model"));
const report_query_service_1 = require("./report-query.service"); // To fetch the full report after resubmission
// RobCalculator itself doesn't export calculateTotalConsumptions or calculateCurrentRobs
// import { RobCalculator, RobCalculationResult } from './helpers/rob-calculator';
const cargo_calculator_1 = require("./helpers/cargo-calculator");
const voyage_lifecycle_service_1 = require("../voyage_lifecycle.service"); // For previous ROBs
const bunker_calculator_1 = require("../bunker_calculator");
class ReportResubmissionService {
    constructor() {
        this.reportQueryService = new report_query_service_1.ReportQueryService();
    }
    async resubmitReport(reportIdFromParams, // Renamed to avoid conflict with report.id
    captainId, changes // Changes can be partial
    ) {
        console.log(`[ReportResubmissionService] Called for reportId: ${reportIdFromParams} by captainId: ${captainId}`);
        console.log(`[ReportResubmissionService] Incoming 'changes' payload:`, JSON.stringify(changes, null, 2));
        const transactionExecution = async () => {
            const report = report_model_1.default.findById(reportIdFromParams);
            if (!report || !report.id) { // Ensure report and report.id exist
                throw new Error(`Report with ID ${reportIdFromParams} not found or has no ID.`);
            }
            const currentReportId = report.id; // report.id is now a string
            if (report.captainId !== captainId) {
                throw new Error(`Captain ${captainId} is not authorized to resubmit report ${currentReportId}.`);
            }
            if (report.status !== 'changes_requested') {
                throw new Error(`Report ${currentReportId} is not in 'changes_requested' status. Current status: ${report.status}.`);
            }
            if (!report.vesselId) {
                throw new Error("Vessel ID is missing from the report, cannot resubmit.");
            }
            const vesselIdChecked = report.vesselId;
            const vessel = vessel_model_1.default.findById(vesselIdChecked);
            if (!vessel) {
                throw new Error(`Vessel with ID ${vesselIdChecked} not found during resubmission.`);
            }
            let previousRobForRecalc = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
            let previousVoyageStateForRob = null;
            if (report.reportType === 'departure') {
                previousVoyageStateForRob = await voyage_lifecycle_service_1.VoyageLifecycleService.findLatestCompletedVoyageFinalState(vesselIdChecked);
                if (previousVoyageStateForRob) {
                    previousRobForRecalc = {
                        lsifo: previousVoyageStateForRob.finalRobLsifo ?? 0,
                        lsmgo: previousVoyageStateForRob.finalRobLsmgo ?? 0,
                        cylOil: previousVoyageStateForRob.finalRobCylOil ?? 0,
                        meOil: previousVoyageStateForRob.finalRobMeOil ?? 0,
                        aeOil: previousVoyageStateForRob.finalRobAeOil ?? 0,
                    };
                }
                else if (vessel.initialRobLsifo !== null) {
                    previousRobForRecalc = {
                        lsifo: vessel.initialRobLsifo ?? 0,
                        lsmgo: vessel.initialRobLsmgo ?? 0,
                        cylOil: vessel.initialRobCylOil ?? 0,
                        meOil: vessel.initialRobMeOil ?? 0,
                        aeOil: vessel.initialRobAeOil ?? 0,
                    };
                }
                else {
                    const depReport = report;
                    previousRobForRecalc = {
                        lsifo: depReport.initialRobLsifo ?? 0,
                        lsmgo: depReport.initialRobLsmgo ?? 0,
                        cylOil: depReport.initialRobCylOil ?? 0,
                        meOil: depReport.initialRobMeOil ?? 0,
                        aeOil: depReport.initialRobAeOil ?? 0,
                    };
                }
            }
            else if (report.voyageId) {
                const reportBeforeThisInVesselHistory = report_model_1.default.findPreviousReport(currentReportId, vesselIdChecked);
                if (reportBeforeThisInVesselHistory && reportBeforeThisInVesselHistory.voyageId === report.voyageId) {
                    previousRobForRecalc = {
                        lsifo: reportBeforeThisInVesselHistory.currentRobLsifo ?? 0,
                        lsmgo: reportBeforeThisInVesselHistory.currentRobLsmgo ?? 0,
                        cylOil: reportBeforeThisInVesselHistory.currentRobCylOil ?? 0,
                        meOil: reportBeforeThisInVesselHistory.currentRobMeOil ?? 0,
                        aeOil: reportBeforeThisInVesselHistory.currentRobAeOil ?? 0,
                    };
                }
                else {
                    const voyageDeparture = report_model_1.default.getFirstReportForVoyage(report.voyageId);
                    if (voyageDeparture && voyageDeparture.id !== currentReportId) {
                        previousRobForRecalc = {
                            lsifo: voyageDeparture.currentRobLsifo ?? 0,
                            lsmgo: voyageDeparture.currentRobLsmgo ?? 0,
                            cylOil: voyageDeparture.currentRobCylOil ?? 0,
                            meOil: voyageDeparture.currentRobMeOil ?? 0,
                            aeOil: voyageDeparture.currentRobAeOil ?? 0,
                        };
                    }
                    else {
                        console.warn(`[ReportResubmissionService] Could not determine previous ROBs for non-departure report ${currentReportId}. Using zeros.`);
                    }
                }
            }
            const mergedReportDataForCalc = { ...report, ...changes };
            const recalculatedTotalConsumptions = (0, bunker_calculator_1.calculateTotalConsumptions)(mergedReportDataForCalc);
            const recalculatedCurrentRobs = (0, bunker_calculator_1.calculateCurrentRobs)(previousRobForRecalc, recalculatedTotalConsumptions, mergedReportDataForCalc);
            const { engineUnits, auxEngines, ...restOfChanges } = changes;
            const updateData = { ...restOfChanges };
            if (report.reportType === 'berth' && report.voyageId) {
                const berthChanges = changes;
                if (berthChanges.cargoLoaded !== undefined || berthChanges.cargoUnloaded !== undefined) {
                    const newCargoQuantity = cargo_calculator_1.CargoCalculator.calculateResubmittedBerthCargoQuantity(report, berthChanges, vessel);
                    if (newCargoQuantity !== null) {
                        updateData.cargoQuantity = newCargoQuantity;
                    }
                }
            }
            updateData.status = 'pending';
            updateData.reviewerId = null;
            updateData.reviewDate = null;
            updateData.reviewComments = null;
            updateData.modification_checklist = null;
            updateData.requested_changes_comment = null;
            updateData.updatedAt = new Date().toISOString();
            updateData.totalConsumptionLsifo = recalculatedTotalConsumptions.totalConsumptionLsifo;
            updateData.totalConsumptionLsmgo = recalculatedTotalConsumptions.totalConsumptionLsmgo;
            updateData.totalConsumptionCylOil = recalculatedTotalConsumptions.totalConsumptionCylOil;
            updateData.totalConsumptionMeOil = recalculatedTotalConsumptions.totalConsumptionMeOil;
            updateData.totalConsumptionAeOil = recalculatedTotalConsumptions.totalConsumptionAeOil;
            updateData.currentRobLsifo = recalculatedCurrentRobs.currentRobLsifo;
            updateData.currentRobLsmgo = recalculatedCurrentRobs.currentRobLsmgo;
            updateData.currentRobCylOil = recalculatedCurrentRobs.currentRobCylOil;
            updateData.currentRobMeOil = recalculatedCurrentRobs.currentRobMeOil;
            updateData.currentRobAeOil = recalculatedCurrentRobs.currentRobAeOil;
            if (engineUnits && report.reportType !== 'berth') {
                report_engine_unit_model_1.default.deleteByReportId(currentReportId);
                report_engine_unit_model_1.default.createMany(currentReportId, engineUnits);
            }
            if (auxEngines) {
                report_aux_engine_model_1.default.deleteByReportId(currentReportId);
                report_aux_engine_model_1.default.createMany(currentReportId, auxEngines);
            }
            const success = report_model_1.default.update(currentReportId, updateData);
            if (!success) {
                throw new Error(`Failed to update report ${currentReportId} during resubmission.`);
            }
            return currentReportId;
        };
        const transactionFn = connection_1.default.transaction(transactionExecution);
        try {
            const updatedReportId = await transactionFn();
            return this.reportQueryService.getReportById(updatedReportId);
        }
        catch (error) {
            console.error(`Report resubmission transaction failed for report ${reportIdFromParams}:`, error);
            throw error;
        }
    }
}
exports.ReportResubmissionService = ReportResubmissionService;
