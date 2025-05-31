"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CargoCalculator = void 0;
const report_model_1 = __importDefault(require("../../../models/report.model")); // Required for fetching previous reports
class CargoCalculator {
    /**
     * Validates the cargo quantity against the vessel's deadweight.
     * Moved from report_validator.ts
     */
    static validateCargoAgainstVesselCapacity(cargoQuantity, vesselDeadweight, reportType // reportType is useful for logging/error context
    ) {
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
    static calculateNewBerthCargoQuantity(reportId, // ID of the current berth report being submitted
    voyageId, currentBerthInput, // The cargoLoaded/Unloaded for the current operation
    vesselDeadweight) {
        console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Calculating for voyageId: ${voyageId}, new berth report: ${reportId}`);
        const approvedDepartureReportFromModel = report_model_1.default.findLatestApprovedDepartureReportForVoyage(voyageId);
        let baseCargoQuantity = 0;
        if (approvedDepartureReportFromModel && approvedDepartureReportFromModel.reportType === 'departure') {
            // Cast to access departure specific fields after checking reportType
            const departureReport = approvedDepartureReportFromModel;
            if (typeof departureReport.cargoQuantity === 'number') {
                baseCargoQuantity = departureReport.cargoQuantity;
                console.log(`[CargoCalculator.calculateNewBerthCargoQuantity] Initial baseCargoQuantity from approved departure ${approvedDepartureReportFromModel.id}: ${baseCargoQuantity}`);
            }
        }
        else {
            console.warn(`[CargoCalculator.calculateNewBerthCargoQuantity] Could not find an approved Departure report or its cargoQuantity for voyage ${voyageId}. Defaulting baseCargoQuantity to 0.`);
        }
        // Get all previously approved berth reports for this voyage to sum up their operations
        const previousApprovedBerthReports = report_model_1.default._getAllReportsForVoyage(voyageId)
            .filter(r => r.reportType === 'berth' && r.status === 'approved' && r.id !== reportId)
            .sort((a, b) => new Date(`${a.reportDate}T${a.reportTime}`).getTime() - new Date(`${b.reportDate}T${b.reportTime}`).getTime());
        for (const prevBerth of previousApprovedBerthReports) {
            const loaded = prevBerth.cargoLoaded ?? 0;
            const unloaded = prevBerth.cargoUnloaded ?? 0;
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
    static calculateResubmittedBerthCargoQuantity(reportBeingResubmitted, // The full original report object being resubmitted
    changes, // The changes being applied
    vessel) {
        if (reportBeingResubmitted.reportType !== 'berth' || !reportBeingResubmitted.voyageId) {
            return null; // Or throw error, depending on how it's called
        }
        const voyageId = reportBeingResubmitted.voyageId;
        // Cast to ReportRecordData to access top-level cargoQuantity if it exists
        const originalBerthDataAsRecord = reportBeingResubmitted;
        // Only recalculate if cargoLoaded or cargoUnloaded are part of the changes
        if (changes.cargoLoaded === undefined && changes.cargoUnloaded === undefined) {
            // Access cargoQuantity from the ReportRecordData perspective
            return originalBerthDataAsRecord.cargoQuantity ?? null;
        }
        console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Recalculating cargo for resubmitted berth report ${reportBeingResubmitted.id} in voyage ${voyageId}`);
        // Fetch all approved reports for the voyage up to the one BEFORE the current report
        const voyageReportsPriorToCurrent = report_model_1.default._getAllReportsForVoyage(voyageId)
            .filter(r => r.id !== reportBeingResubmitted.id &&
            r.status === 'approved' &&
            new Date(`${r.reportDate}T${r.reportTime}Z`).getTime() < new Date(`${originalBerthDataAsRecord.reportDate}T${originalBerthDataAsRecord.reportTime}Z`).getTime())
            .sort((a, b) => new Date(`${a.reportDate}T${a.reportTime}Z`).getTime() - new Date(`${b.reportDate}T${b.reportTime}Z`).getTime());
        let baseCargoQuantity = 0;
        const departureReportFromModel = voyageReportsPriorToCurrent.find(r => r.reportType === 'departure');
        if (departureReportFromModel && departureReportFromModel.reportType === 'departure') {
            const departureReport = departureReportFromModel;
            if (typeof departureReport.cargoQuantity === 'number') {
                baseCargoQuantity = departureReport.cargoQuantity;
            }
        }
        else {
            const firstVoyageReport = report_model_1.default.getFirstReportForVoyage(voyageId);
            if (firstVoyageReport && firstVoyageReport.reportType === 'departure') {
                const typedFirstVoyageReport = firstVoyageReport;
                if (typeof typedFirstVoyageReport.cargoQuantity === 'number') {
                    baseCargoQuantity = typedFirstVoyageReport.cargoQuantity;
                }
            }
            else {
                console.warn(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Could not determine initial cargo quantity for voyage ${voyageId}. Using 0 as base.`);
            }
        }
        console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Initial base for resubmission: ${baseCargoQuantity}`);
        voyageReportsPriorToCurrent.forEach(prevReport => {
            if (prevReport.reportType === 'berth') {
                const prevBerth = prevReport; // prevReport is Partial<Report>, cast to full for BerthSpecificData
                const loaded = prevBerth.cargoLoaded ?? 0;
                const unloaded = prevBerth.cargoUnloaded ?? 0;
                baseCargoQuantity += loaded - unloaded;
                console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] After prior berth ${prevReport.id}: loaded=${loaded}, unloaded=${unloaded}, new base=${baseCargoQuantity}`);
            }
        });
        const currentCargoLoaded = changes.cargoLoaded !== undefined ? Number(changes.cargoLoaded) : Number(originalBerthDataAsRecord.cargoLoaded ?? 0);
        const currentCargoUnloaded = changes.cargoUnloaded !== undefined ? Number(changes.cargoUnloaded) : Number(originalBerthDataAsRecord.cargoUnloaded ?? 0);
        const finalCargoQuantity = baseCargoQuantity + currentCargoLoaded - currentCargoUnloaded;
        this.validateCargoAgainstVesselCapacity(finalCargoQuantity, vessel.deadweight, 'berth');
        console.log(`[CargoCalculator.calculateResubmittedBerthCargoQuantity] Final recalculated cargo for ${reportBeingResubmitted.id}: ${finalCargoQuantity}`);
        return finalCargoQuantity;
    }
}
exports.CargoCalculator = CargoCalculator;
