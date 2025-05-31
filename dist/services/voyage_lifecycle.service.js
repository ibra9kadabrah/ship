"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoyageLifecycleService = void 0;
const voyage_model_1 = __importDefault(require("../models/voyage.model"));
const report_model_1 = __importDefault(require("../models/report.model"));
// Helper to get a comparable timestamp from a report
// Adapted from excel_data_aggregation.service.ts
const getReportTimestamp = (report) => {
    let dateStr;
    let timeStr;
    // Prioritize specific report type date/time fields
    if (report.reportType === 'noon' || report.reportType === 'arrival_anchor_noon') {
        dateStr = report.noonDate;
        timeStr = report.noonTime;
    }
    else if (report.reportType === 'berth') {
        dateStr = report.berthDate;
        timeStr = report.berthTime;
    }
    else { // Defaults to base reportDate and reportTime for departure, arrival, etc.
        dateStr = report.reportDate;
        timeStr = report.reportTime;
    }
    if (dateStr && timeStr) {
        try {
            // Ensure time has seconds for consistent Date parsing
            const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr.length === 8 ? timeStr : `${timeStr}:00`; // Handle HH:mm and HH:mm:ss
            const dateTimeString = `${dateStr}T${formattedTime}Z`; // Assume UTC if not specified
            const timestamp = new Date(dateTimeString).getTime();
            if (isNaN(timestamp)) {
                console.warn(`[VoyageLifecycleService.getReportTimestamp] Parsed NaN for report ${report.id} with date '${dateStr}' and time '${timeStr}'. DateTimeString: ${dateTimeString}`);
                return 0;
            }
            return timestamp;
        }
        catch (e) {
            console.error(`[VoyageLifecycleService.getReportTimestamp] Error parsing date/time for report ${report.id} (type: ${report.reportType}) with date '${dateStr}' and time '${timeStr}':`, e);
            return 0;
        }
    }
    console.warn(`[VoyageLifecycleService.getReportTimestamp] Missing date/time for report ${report.id} (type: ${report.reportType})`);
    return 0;
};
exports.VoyageLifecycleService = {
    /**
     * Finds the approved departure report for the voyage that chronologically follows
     * a voyage associated with the given currentVoyageStartDate for a specific vessel.
     *
     * @param vesselId The ID of the vessel.
     * @param currentVoyageStartDate The start date (YYYY-MM-DD) of the current voyage, used as a reference.
     * @returns The next voyage's approved departure report, or null if not found.
     */
    async getNextVoyageDepartureReport(vesselId, currentVoyageId, // Added currentVoyageId
    currentVoyageStartDate // Kept for reference and logging, but ID is primary
    ) {
        if (!vesselId || !currentVoyageId) { // Check currentVoyageId
            console.warn('[VLS.getNext] Missing vesselId or currentVoyageId.');
            return null;
        }
        try {
            const allVesselVoyages = voyage_model_1.default.findAllByVesselId(vesselId);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] No voyages found for vessel ${vesselId}.`);
                return null;
            }
            // Sort voyages by start date to ensure chronological order
            allVesselVoyages.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            console.log(`[VLS.getNext] Processing for vesselId: ${vesselId}, currentVoyageStartDate: ${currentVoyageStartDate}`);
            allVesselVoyages.forEach((v, idx) => {
                console.log(`[VLS.getNext] Sorted Voyage List [${idx}]: ID=${v.id}, StartDate=${v.startDate}, Status=${v.status}`);
            });
            const currentVoyageReferenceTime = new Date(currentVoyageStartDate).getTime();
            console.log(`[VLS.getNext] currentVoyageReferenceTime (from currentVoyageStartDate): ${currentVoyageReferenceTime}`);
            // Find the index of the current voyage using its ID for accuracy
            let currentVoyageIndex = -1;
            for (let i = 0; i < allVesselVoyages.length; i++) {
                if (allVesselVoyages[i].id === currentVoyageId) { // Match by ID now
                    currentVoyageIndex = i;
                    console.log(`[VLS.getNext] Matched current voyage by ID: Index=${i}, ID=${allVesselVoyages[i].id}, StartDate=${allVesselVoyages[i].startDate}`);
                    break;
                }
            }
            if (currentVoyageIndex === -1) {
                // Fallback to startDate match if ID was not found, though this shouldn't happen if currentVoyageId is valid.
                // Or, more strictly, consider it an error if ID is not found.
                // For now, keeping the log specific to ID if currentVoyageId was the primary search key.
                console.log(`[VLS.getNext] Could not find current voyage with ID ${currentVoyageId} for vessel ${vesselId} in sorted list. (StartDate for reference: ${currentVoyageStartDate})`);
                return null;
            }
            console.log(`[VLS.getNext] Found currentVoyageIndex: ${currentVoyageIndex}`);
            if (currentVoyageIndex < allVesselVoyages.length - 1) {
                const nextVoyage = allVesselVoyages[currentVoyageIndex + 1];
                console.log(`[VLS.getNext] Identified next candidate voyage: ID=${nextVoyage.id}, StartDate=${nextVoyage.startDate}, Status=${nextVoyage.status}`);
                const nextVoyageReports = report_model_1.default._getAllReportsForVoyage(nextVoyage.id);
                const nextApprovedDepartureReport = nextVoyageReports.find((r) => r.reportType === 'departure' && r.status === 'approved');
                if (nextApprovedDepartureReport) {
                    console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Found approved departure report for next voyage ${nextVoyage.id}: ReportID=${nextApprovedDepartureReport.id}`);
                    return nextApprovedDepartureReport;
                }
                else {
                    console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] No approved departure report found for next voyage ${nextVoyage.id}.`);
                    return null;
                }
            }
            else {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Current voyage (StartDate: ${currentVoyageStartDate}) is the latest voyage for vessel ${vesselId}. No subsequent voyage found.`);
                return null;
            }
        }
        catch (error) {
            console.error('[VoyageLifecycleService.getNextVoyageDepartureReport] Error fetching next voyage departure data:', error);
            return null; // Or rethrow, depending on desired error handling
        }
    },
    async findLatestCompletedVoyageFinalState(vesselId) {
        if (!vesselId) {
            console.warn('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Missing vesselId.');
            return null;
        }
        console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Searching for vessel ${vesselId}`);
        try {
            const allVesselVoyages = voyage_model_1.default.findAllByVesselId(vesselId);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No voyages found for vessel ${vesselId}.`);
                return null;
            }
            // Filter for completed voyages and sort them by start date descending to get the latest first
            // Assuming Voyage type has a 'status' and 'startDate' field.
            // And VoyageStatusValue.COMPLETED exists. If not, use string 'completed'.
            const completedVoyages = allVesselVoyages
                .filter((v) => v.status === 'completed') // Use direct string literal from VoyageStatus type
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            if (completedVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No completed voyages found for vessel ${vesselId}.`);
                return null;
            }
            const latestCompletedVoyage = completedVoyages[0];
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Latest completed voyage for vessel ${vesselId} is ${latestCompletedVoyage.id}, started ${latestCompletedVoyage.startDate}`);
            const reportsForLatestCompletedVoyage = report_model_1.default._getAllReportsForVoyage(latestCompletedVoyage.id);
            const approvedReports = reportsForLatestCompletedVoyage
                .filter(r => r.status === 'approved') // Use direct string literal from ReportStatus type
                .sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a)); // Cast to Report, assuming data integrity
            if (approvedReports.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No approved reports found for latest completed voyage ${latestCompletedVoyage.id}.`);
                return null;
            }
            // Prioritize Berth report, then Arrival report
            // Assuming ReportModel._getAllReportsForVoyage returns full Report objects or they are filtered to be so.
            let finalReport = approvedReports.find(r => r.reportType === 'berth');
            if (!finalReport) {
                finalReport = approvedReports.find(r => r.reportType === 'arrival');
            }
            if (!finalReport) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No final Berth or Arrival report found for voyage ${latestCompletedVoyage.id}.`);
                return null;
            }
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Final report for voyage ${latestCompletedVoyage.id} is ${finalReport.id} (type: ${finalReport.reportType})`);
            // Get the destination port of the completed voyage to serve as the next departure port
            let lastPortOfCallData = null;
            const departureReportForCompletedVoyage = reportsForLatestCompletedVoyage.find(r => r.reportType === 'departure' && r.status === 'approved' // Ensure it's the approved departure
            );
            if (departureReportForCompletedVoyage && departureReportForCompletedVoyage.destinationPort) {
                lastPortOfCallData = departureReportForCompletedVoyage.destinationPort;
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Last port of call (destination of completed voyage ${latestCompletedVoyage.id}) was: ${lastPortOfCallData}`);
            }
            else {
                // This case might occur if a voyage was somehow completed without a clear departure destination
                // or if the departure report is missing/not approved.
                // Alternatively, if the final report is an arrival/berth, its port could be used.
                // For now, we prioritize the original destination from the departure report.
                if (!lastPortOfCallData) { // This check remains, if departureReportForCompletedVoyage or its destinationPort was not found
                    console.warn(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Could not determine last port of call from the departure report of completed voyage ${latestCompletedVoyage.id}.`);
                }
            }
            // Extract data. Fields like cargoQuantity, cargoType, cargoStatus, currentRob*
            // are assumed to be available on the finalReport object (potentially after casting or checking type).
            // The exact fields on BerthSpecificData or ArrivalSpecificData need to be confirmed from types.
            // For now, we assume they are directly on the report object or its specific data part.
            // Cargo data might need specific logic if not directly available as "current state"
            // For BerthReport, cargo state might be after loading/unloading.
            // For ArrivalReport, it's the state on arrival.
            // The plan implies these are the values to carry over/default from.
            // The Report type union includes DepartureSpecificData which has cargoQuantity, cargoType, cargoStatus.
            // These fields should be populated correctly by the services creating/updating these reports.
            return {
                voyageId: latestCompletedVoyage.id,
                reportId: finalReport.id,
                reportType: finalReport.reportType,
                cargoQuantity: finalReport.cargoQuantity ?? null,
                cargoType: finalReport.cargoType ?? null,
                cargoStatus: finalReport.cargoStatus ?? null,
                finalRobLsifo: finalReport.currentRobLsifo ?? null, // These are on BaseReport
                finalRobLsmgo: finalReport.currentRobLsmgo ?? null, // These are on BaseReport
                finalRobCylOil: finalReport.currentRobCylOil ?? null,
                finalRobMeOil: finalReport.currentRobMeOil ?? null,
                finalRobAeOil: finalReport.currentRobAeOil ?? null,
                lastPortOfCall: lastPortOfCallData,
            };
        }
        catch (error) {
            console.error('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Error fetching data:', error);
            return null;
        }
    },
    async ensureNewVoyageIsCreated(vesselId, newDepartureReport) {
        if (!vesselId || !newDepartureReport || newDepartureReport.reportType !== 'departure') {
            throw new Error('[VoyageLifecycleService.ensureNewVoyageIsCreated] Invalid input: vesselId and a valid departure report are required.');
        }
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Processing for vessel ${vesselId} with new departure report ${newDepartureReport.id}`);
        // 1. Find any currently 'active' voyage for the vessel.
        const allVesselVoyages = voyage_model_1.default.findAllByVesselId(vesselId);
        const activeVoyage = allVesselVoyages.find(v => v.status === 'active');
        // 2. If an active voyage exists, update its status to 'completed'.
        if (activeVoyage) {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Found active voyage ${activeVoyage.id}. Completing it.`);
            // VoyageModel.completeVoyage only sets status and updatedAt.
            // If endDate needs to be set, it would require a different mechanism or an enhanced VoyageModel.completeVoyage.
            // For now, we rely on the existing VoyageModel.completeVoyage.
            const completed = voyage_model_1.default.completeVoyage(activeVoyage.id);
            if (completed) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Voyage ${activeVoyage.id} marked as completed.`);
                // If we need to set endDate, we'd do it here if VoyageModel had a suitable update method.
                // e.g., VoyageModel.update(activeVoyage.id, { endDate: newDepartureReport.reportDate });
            }
            else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to complete voyage ${activeVoyage.id}.`);
            }
        }
        else {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] No active voyage found for vessel ${vesselId}. Proceeding to create a new one.`);
        }
        // 3. Create a new Voyage record.
        const newVoyageDto = {
            vesselId: vesselId,
            departurePort: newDepartureReport.departurePort,
            destinationPort: newDepartureReport.destinationPort,
            voyageDistance: newDepartureReport.voyageDistance,
            startDate: newDepartureReport.reportDate, // Or faspDate if preferred
        };
        const createdVoyage = voyage_model_1.default.create(newVoyageDto);
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New voyage ${createdVoyage.id} created with status 'active'.`);
        // 4. Associate the newReport with this new voyage.
        // ReportService will handle setting the voyageId on the report when it calls ReportModel._createReportRecord.
        // However, if the report is already created (e.g., if this service is called after report creation),
        // we might need to update it. The plan implies this service is called as part of report submission.
        // For now, we assume ReportService will correctly use the returned voyageId.
        // If newDepartureReport.id exists and its voyageId is not yet set or different, update it.
        if (newDepartureReport.id && newDepartureReport.voyageId !== createdVoyage.id) {
            const updated = report_model_1.default.updateVoyageId(newDepartureReport.id, createdVoyage.id);
            if (updated) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Linked report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            }
            else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to link report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            }
        }
        else if (!newDepartureReport.id) {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New departure report does not have an ID yet. ReportService should set voyageId upon its creation using new voyage ${createdVoyage.id}.`);
        }
        // 5. Return the newly created Voyage.
        return createdVoyage;
    }
};
