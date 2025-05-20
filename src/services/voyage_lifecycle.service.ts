import VoyageModel from '../models/voyage.model';
import ReportModel from '../models/report.model';
import { Voyage, CreateVoyageDTO } from '../types/voyage'; // Added CreateVoyageDTO
import { Report, DepartureSpecificData, BerthSpecificData, ArrivalSpecificData, ReportType, ReportStatus, CargoStatus } from '../types/report'; // Changed ReportStatusValue to ReportStatus, Added CargoStatus
import { VoyageStatus } from '../types/voyage'; // Changed VoyageStatusValue to VoyageStatus

// Helper to get a comparable timestamp from a report
// Adapted from excel_data_aggregation.service.ts
const getReportTimestamp = (report: Report): number => {
    let dateStr: string | undefined | null;
    let timeStr: string | undefined | null;

    // Prioritize specific report type date/time fields
    if (report.reportType === 'noon' || report.reportType === 'arrival_anchor_noon') {
        dateStr = (report as any).noonDate;
        timeStr = (report as any).noonTime;
    } else if (report.reportType === 'berth') {
        dateStr = (report as any).berthDate;
        timeStr = (report as any).berthTime;
    } else { // Defaults to base reportDate and reportTime for departure, arrival, etc.
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
        } catch (e) {
            console.error(`[VoyageLifecycleService.getReportTimestamp] Error parsing date/time for report ${report.id} (type: ${report.reportType}) with date '${dateStr}' and time '${timeStr}':`, e);
            return 0;
        }
    }
    console.warn(`[VoyageLifecycleService.getReportTimestamp] Missing date/time for report ${report.id} (type: ${report.reportType})`);
    return 0;
};

export interface PreviousVoyageFinalState {
    voyageId?: string;
    reportId?: string;
    reportType?: ReportType;
    cargoQuantity: number | null;
    cargoType: string | null;
    cargoStatus: CargoStatus | null; // Align with CargoStatus type
    finalRobLsifo: number | null;
    finalRobLsmgo: number | null;
    finalRobCylOil: number | null;
    finalRobMeOil: number | null;
    finalRobAeOil: number | null;
}
 
export const VoyageLifecycleService = {
    /**
     * Finds the approved departure report for the voyage that chronologically follows
     * a voyage associated with the given currentVoyageStartDate for a specific vessel.
     *
     * @param vesselId The ID of the vessel.
     * @param currentVoyageStartDate The start date (YYYY-MM-DD) of the current voyage, used as a reference.
     * @returns The next voyage's approved departure report, or null if not found.
     */
    async getNextVoyageDepartureReport(
        vesselId: string,
        currentVoyageStartDate: string
    ): Promise<(Report & DepartureSpecificData) | null> {
        if (!vesselId || !currentVoyageStartDate) {
            console.warn('[VoyageLifecycleService.getNextVoyageDepartureReport] Missing vesselId or currentVoyageStartDate.');
            return null;
        }

        try {
            const allVesselVoyages = VoyageModel.findAllByVesselId(vesselId);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] No voyages found for vessel ${vesselId}.`);
                return null;
            }

            // Sort voyages by start date to ensure chronological order
            allVesselVoyages.sort(
                (a: Voyage, b: Voyage) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );

            // Find the index of the current voyage based on its start date
            // Note: This assumes voyage start dates are unique enough for this identification.
            // A more robust approach might use currentVoyageId if available and reliable.
            const currentVoyageReferenceTime = new Date(currentVoyageStartDate).getTime();
            let currentVoyageIndex = -1;
            for (let i = 0; i < allVesselVoyages.length; i++) {
                if (new Date(allVesselVoyages[i].startDate).getTime() === currentVoyageReferenceTime) {
                    // A more precise match would be by voyageId if we pass it.
                    // For now, matching by start date of the *current* voyage being processed for Excel.
                    // This implies the `currentVoyageStartDate` must be accurate.
                    currentVoyageIndex = i;
                    break;
                }
            }
            
            // A simpler find if we assume currentVoyageStartDate is unique and matches exactly
            // const currentVoyageIndex = allVesselVoyages.findIndex(
            //     (v: Voyage) => v.startDate === currentVoyageStartDate
            // );


            if (currentVoyageIndex === -1) {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Could not find current voyage with start date ${currentVoyageStartDate} for vessel ${vesselId} in sorted list.`);
                // This could happen if the voyageId passed to excel export has a startDate not matching any in the DB,
                // or if the current voyage itself is not in the allVesselVoyages list (e.g. if it's just created and not committed/queried yet in some contexts)
                // For the purpose of finding the *next* voyage, if the current one isn't found by start date, we might not be able to reliably find the "next".
                return null;
            }

            if (currentVoyageIndex < allVesselVoyages.length - 1) {
                const nextVoyage = allVesselVoyages[currentVoyageIndex + 1];
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Identified next voyage: ID=${nextVoyage.id}, StartDate=${nextVoyage.startDate}`);

                const nextVoyageReports = ReportModel._getAllReportsForVoyage(nextVoyage.id);
                const nextApprovedDepartureReport = nextVoyageReports.find(
                    (r) => r.reportType === 'departure' && r.status === 'approved'
                ) as (Report & DepartureSpecificData) | undefined;

                if (nextApprovedDepartureReport) {
                    console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Found approved departure report for next voyage ${nextVoyage.id}: ReportID=${nextApprovedDepartureReport.id}`);
                    return nextApprovedDepartureReport;
                } else {
                    console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] No approved departure report found for next voyage ${nextVoyage.id}.`);
                    return null;
                }
            } else {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] Current voyage (StartDate: ${currentVoyageStartDate}) is the latest voyage for vessel ${vesselId}. No subsequent voyage found.`);
                return null;
            }
        } catch (error) {
            console.error('[VoyageLifecycleService.getNextVoyageDepartureReport] Error fetching next voyage departure data:', error);
            return null; // Or rethrow, depending on desired error handling
        }
    },

    async findLatestCompletedVoyageFinalState(vesselId: string): Promise<PreviousVoyageFinalState | null> {
        if (!vesselId) {
            console.warn('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Missing vesselId.');
            return null;
        }
        console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Searching for vessel ${vesselId}`);

        try {
            const allVesselVoyages = VoyageModel.findAllByVesselId(vesselId);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No voyages found for vessel ${vesselId}.`);
                return null;
            }

            // Filter for completed voyages and sort them by start date descending to get the latest first
            // Assuming Voyage type has a 'status' and 'startDate' field.
            // And VoyageStatusValue.COMPLETED exists. If not, use string 'completed'.
            const completedVoyages = allVesselVoyages
                .filter((v: Voyage) => v.status === 'completed') // Use direct string literal from VoyageStatus type
                .sort((a: Voyage, b: Voyage) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

            if (completedVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No completed voyages found for vessel ${vesselId}.`);
                return null;
            }

            const latestCompletedVoyage = completedVoyages[0];
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Latest completed voyage for vessel ${vesselId} is ${latestCompletedVoyage.id}, started ${latestCompletedVoyage.startDate}`);

            const reportsForLatestCompletedVoyage = ReportModel._getAllReportsForVoyage(latestCompletedVoyage.id);
            
            const approvedReports = reportsForLatestCompletedVoyage
                .filter(r => r.status === 'approved') // Use direct string literal from ReportStatus type
                .sort((a, b) => getReportTimestamp(b as Report) - getReportTimestamp(a as Report)); // Cast to Report, assuming data integrity

            if (approvedReports.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No approved reports found for latest completed voyage ${latestCompletedVoyage.id}.`);
                return null;
            }

            // Prioritize Berth report, then Arrival report
            // Assuming ReportModel._getAllReportsForVoyage returns full Report objects or they are filtered to be so.
            let finalReport: Report | undefined = approvedReports.find(r => (r as Report).reportType === 'berth') as Report | undefined;
            if (!finalReport) {
                finalReport = approvedReports.find(r => (r as Report).reportType === 'arrival') as Report | undefined;
            }

            if (!finalReport) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No final Berth or Arrival report found for voyage ${latestCompletedVoyage.id}.`);
                return null;
            }
            
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Final report for voyage ${latestCompletedVoyage.id} is ${finalReport.id} (type: ${finalReport.reportType})`);

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
                cargoQuantity: (finalReport as Report & DepartureSpecificData).cargoQuantity ?? null,
                cargoType: (finalReport as Report & DepartureSpecificData).cargoType ?? null,
                cargoStatus: (finalReport as Report & DepartureSpecificData).cargoStatus ?? null,
                finalRobLsifo: finalReport.currentRobLsifo ?? null, // These are on BaseReport
                finalRobLsmgo: finalReport.currentRobLsmgo ?? null, // These are on BaseReport
                finalRobCylOil: finalReport.currentRobCylOil ?? null,
                finalRobMeOil: finalReport.currentRobMeOil ?? null,
                finalRobAeOil: finalReport.currentRobAeOil ?? null,
            };

        } catch (error) {
            console.error('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Error fetching data:', error);
            return null;
        }
    },

    async ensureNewVoyageIsCreated(
        vesselId: string,
        newDepartureReport: Report & DepartureSpecificData
    ): Promise<Voyage> {
        if (!vesselId || !newDepartureReport || newDepartureReport.reportType !== 'departure') {
            throw new Error('[VoyageLifecycleService.ensureNewVoyageIsCreated] Invalid input: vesselId and a valid departure report are required.');
        }
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Processing for vessel ${vesselId} with new departure report ${newDepartureReport.id}`);

        // 1. Find any currently 'active' voyage for the vessel.
        const allVesselVoyages = VoyageModel.findAllByVesselId(vesselId);
        const activeVoyage = allVesselVoyages.find(v => v.status === 'active');

        // 2. If an active voyage exists, update its status to 'completed'.
        if (activeVoyage) {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Found active voyage ${activeVoyage.id}. Completing it.`);
            // VoyageModel.completeVoyage only sets status and updatedAt.
            // If endDate needs to be set, it would require a different mechanism or an enhanced VoyageModel.completeVoyage.
            // For now, we rely on the existing VoyageModel.completeVoyage.
            const completed = VoyageModel.completeVoyage(activeVoyage.id);
            if (completed) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Voyage ${activeVoyage.id} marked as completed.`);
                // If we need to set endDate, we'd do it here if VoyageModel had a suitable update method.
                // e.g., VoyageModel.update(activeVoyage.id, { endDate: newDepartureReport.reportDate });
            } else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to complete voyage ${activeVoyage.id}.`);
            }
        } else {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] No active voyage found for vessel ${vesselId}. Proceeding to create a new one.`);
        }

        // 3. Create a new Voyage record.
        const newVoyageDto: CreateVoyageDTO = {
            vesselId: vesselId,
            departurePort: newDepartureReport.departurePort,
            destinationPort: newDepartureReport.destinationPort,
            voyageDistance: newDepartureReport.voyageDistance,
            startDate: newDepartureReport.reportDate, // Or faspDate if preferred
        };

        const createdVoyage = VoyageModel.create(newVoyageDto);
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New voyage ${createdVoyage.id} created with status 'active'.`);

        // 4. Associate the newReport with this new voyage.
        // ReportService will handle setting the voyageId on the report when it calls ReportModel._createReportRecord.
        // However, if the report is already created (e.g., if this service is called after report creation),
        // we might need to update it. The plan implies this service is called as part of report submission.
        // For now, we assume ReportService will correctly use the returned voyageId.
        // If newDepartureReport.id exists and its voyageId is not yet set or different, update it.
        if (newDepartureReport.id && newDepartureReport.voyageId !== createdVoyage.id) {
            const updated = ReportModel.updateVoyageId(newDepartureReport.id, createdVoyage.id);
            if (updated) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Linked report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            } else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to link report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            }
        } else if (!newDepartureReport.id) {
             console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New departure report does not have an ID yet. ReportService should set voyageId upon its creation using new voyage ${createdVoyage.id}.`);
        }


        // 5. Return the newly created Voyage.
        return createdVoyage;
    }
};