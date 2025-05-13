import VoyageModel from '../models/voyage.model';
import ReportModel from '../models/report.model';
import { Voyage } from '../types/voyage';
import { Report, DepartureSpecificData } from '../types/report';

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
    }

    // Other lifecycle methods will be added here:
    // - determineVoyageContext
    // - createNewVoyage
    // - completeVoyage
    // - linkReportToVoyage
    // - updateVesselInitialRobOnFirstDepartureApproval
    // - getCarryOverCargoDetails (from existing VoyageService)
};