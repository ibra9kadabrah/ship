import { PoolClient } from 'pg';
import pool from '../db/connection';
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
    lastPortOfCall: string | null; // Added for next voyage's departure port
}
 
export const VoyageLifecycleService = {
    async getNextVoyageDepartureReport(
        vesselId: string,
        currentVoyageId: string, // Added currentVoyageId
        currentVoyageStartDate: string, // Kept for reference and logging, but ID is primary
        client: PoolClient | import('pg').Pool = pool
    ): Promise<(Report & DepartureSpecificData) | null> {
        if (!vesselId || !currentVoyageId) { // Check currentVoyageId
            console.warn('[VLS.getNext] Missing vesselId or currentVoyageId.');
            return null;
        }

        try {
            const allVesselVoyages = await VoyageModel.findAllByVesselId(vesselId, client);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.getNextVoyageDepartureReport] No voyages found for vessel ${vesselId}.`);
                return null;
            }

            allVesselVoyages.sort(
                (a: Voyage, b: Voyage) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
            console.log(`[VLS.getNext] Processing for vesselId: ${vesselId}, currentVoyageStartDate: ${currentVoyageStartDate}`);
            allVesselVoyages.forEach((v, idx) => {
                console.log(`[VLS.getNext] Sorted Voyage List [${idx}]: ID=${v.id}, StartDate=${v.startDate}, Status=${v.status}`);
            });

            const currentVoyageReferenceTime = new Date(currentVoyageStartDate).getTime();
            console.log(`[VLS.getNext] currentVoyageReferenceTime (from currentVoyageStartDate): ${currentVoyageReferenceTime}`);
            
            let currentVoyageIndex = -1;
            for (let i = 0; i < allVesselVoyages.length; i++) {
                if (allVesselVoyages[i].id === currentVoyageId) { // Match by ID now
                    currentVoyageIndex = i;
                    console.log(`[VLS.getNext] Matched current voyage by ID: Index=${i}, ID=${allVesselVoyages[i].id}, StartDate=${allVesselVoyages[i].startDate}`);
                    break;
                }
            }
            
            if (currentVoyageIndex === -1) {
                console.log(`[VLS.getNext] Could not find current voyage with ID ${currentVoyageId} for vessel ${vesselId} in sorted list. (StartDate for reference: ${currentVoyageStartDate})`);
                return null;
            }

            console.log(`[VLS.getNext] Found currentVoyageIndex: ${currentVoyageIndex}`);

            for (let j = currentVoyageIndex + 1; j < allVesselVoyages.length; j++) {
                const nextVoyageCandidate = allVesselVoyages[j];
                console.log(`[VLS.getNext] Checking next candidate voyage [${j}]: ID=${nextVoyageCandidate.id}, StartDate=${nextVoyageCandidate.startDate}, Status=${nextVoyageCandidate.status}`);

                const nextVoyageReports = await ReportModel._getAllReportsForVoyage(nextVoyageCandidate.id, client);
                const nextApprovedDepartureReport = nextVoyageReports.find(
                    (r) => r.reportType === 'departure' && r.status === 'approved'
                ) as (Report & DepartureSpecificData) | undefined;

                if (nextApprovedDepartureReport) {
                    console.log(`[VLS.getNext] Found approved departure report for next voyage ${nextVoyageCandidate.id}: ReportID=${nextApprovedDepartureReport.id}`);
                    return nextApprovedDepartureReport;
                } else {
                    console.log(`[VLS.getNext] No approved departure report found for candidate voyage ${nextVoyageCandidate.id}. Checking next...`);
                }
            }

            console.log(`[VLS.getNext] No subsequent voyage with an approved departure report found after current voyage ID ${currentVoyageId} (StartDate: ${currentVoyageStartDate}).`);
            return null;
        } catch (error) {
            console.error('[VoyageLifecycleService.getNextVoyageDepartureReport] Error fetching next voyage departure data:', error);
            return null;
        }
    },

    async findLatestCompletedVoyageFinalState(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<PreviousVoyageFinalState | null> {
        if (!vesselId) {
            console.warn('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Missing vesselId.');
            return null;
        }
        console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Searching for vessel ${vesselId}`);

        try {
            const allVesselVoyages = await VoyageModel.findAllByVesselId(vesselId, client);
            if (!allVesselVoyages || allVesselVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No voyages found for vessel ${vesselId}.`);
                return null;
            }

            const completedVoyages = allVesselVoyages
                .filter((v: Voyage) => v.status === 'completed')
                .sort((a: Voyage, b: Voyage) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

            if (completedVoyages.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No completed voyages found for vessel ${vesselId}.`);
                return null;
            }

            const latestCompletedVoyage = completedVoyages[0];
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Latest completed voyage for vessel ${vesselId} is ${latestCompletedVoyage.id}, started ${latestCompletedVoyage.startDate}`);

            const reportsForLatestCompletedVoyage = await ReportModel._getAllReportsForVoyage(latestCompletedVoyage.id, client);
            
            const approvedReports = reportsForLatestCompletedVoyage
                .filter(r => r.status === 'approved')
                .sort((a, b) => getReportTimestamp(b as Report) - getReportTimestamp(a as Report));

            if (approvedReports.length === 0) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No approved reports found for latest completed voyage ${latestCompletedVoyage.id}.`);
                return null;
            }

            let finalReport: Report | undefined = approvedReports.find(r => (r as Report).reportType === 'berth') as Report | undefined;
            if (!finalReport) {
                finalReport = approvedReports.find(r => (r as Report).reportType === 'arrival') as Report | undefined;
            }

            if (!finalReport) {
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] No final Berth or Arrival report found for voyage ${latestCompletedVoyage.id}.`);
                return null;
            }
            
            console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Final report for voyage ${latestCompletedVoyage.id} is ${finalReport.id} (type: ${finalReport.reportType})`);

            let lastPortOfCallData: string | null = null;
            const departureReportForCompletedVoyage = (await ReportModel._getAllReportsForVoyage(latestCompletedVoyage.id, client)).find(
                r => r.reportType === 'departure' && r.status === 'approved'
            ) as (Report & DepartureSpecificData) | undefined;

            if (departureReportForCompletedVoyage && departureReportForCompletedVoyage.destinationPort) {
                lastPortOfCallData = departureReportForCompletedVoyage.destinationPort;
                console.log(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Last port of call (destination of completed voyage ${latestCompletedVoyage.id}) was: ${lastPortOfCallData}`);
            } else {
                 if (!lastPortOfCallData) {
                    console.warn(`[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Could not determine last port of call from the departure report of completed voyage ${latestCompletedVoyage.id}.`);
                }
            }

            return {
                voyageId: latestCompletedVoyage.id,
                reportId: finalReport.id,
                reportType: finalReport.reportType,
                cargoQuantity: (finalReport as Report & DepartureSpecificData).cargoQuantity ?? null,
                cargoType: (finalReport as Report & DepartureSpecificData).cargoType ?? null,
                cargoStatus: (finalReport as Report & DepartureSpecificData).cargoStatus ?? null,
                finalRobLsifo: finalReport.currentRobLsifo ?? null,
                finalRobLsmgo: finalReport.currentRobLsmgo ?? null,
                finalRobCylOil: finalReport.currentRobCylOil ?? null,
                finalRobMeOil: finalReport.currentRobMeOil ?? null,
                finalRobAeOil: finalReport.currentRobAeOil ?? null,
                lastPortOfCall: lastPortOfCallData,
            };

        } catch (error) {
            console.error('[VoyageLifecycleService.findLatestCompletedVoyageFinalState] Error fetching data:', error);
            return null;
        }
    },

    async ensureNewVoyageIsCreated(
        vesselId: string,
        newDepartureReport: Report & DepartureSpecificData,
        client: PoolClient | import('pg').Pool = pool
    ): Promise<Voyage> {
        if (!vesselId || !newDepartureReport || newDepartureReport.reportType !== 'departure') {
            throw new Error('[VoyageLifecycleService.ensureNewVoyageIsCreated] Invalid input: vesselId and a valid departure report are required.');
        }
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Processing for vessel ${vesselId} with new departure report ${newDepartureReport.id}`);

        const allVesselVoyages = await VoyageModel.findAllByVesselId(vesselId, client);
        const activeVoyage = allVesselVoyages.find(v => v.status === 'active');

        if (activeVoyage) {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Found active voyage ${activeVoyage.id}. Completing it.`);
            const completed = await VoyageModel.completeVoyage(activeVoyage.id, client);
            if (completed) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Voyage ${activeVoyage.id} marked as completed.`);
            } else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to complete voyage ${activeVoyage.id}.`);
            }
        } else {
            console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] No active voyage found for vessel ${vesselId}. Proceeding to create a new one.`);
        }

        const newVoyageDto: CreateVoyageDTO = {
            vesselId: vesselId,
            departurePort: newDepartureReport.departurePort,
            destinationPort: newDepartureReport.destinationPort,
            voyageDistance: newDepartureReport.voyageDistance,
            startDate: newDepartureReport.reportDate,
        };

        const createdVoyage = await VoyageModel.create(newVoyageDto, client);
        console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New voyage ${createdVoyage.id} created with status 'active'.`);

        if (newDepartureReport.id && newDepartureReport.voyageId !== createdVoyage.id) {
            const updated = await ReportModel.updateVoyageId(newDepartureReport.id, createdVoyage.id, client);
            if (updated) {
                console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Linked report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            } else {
                console.warn(`[VoyageLifecycleService.ensureNewVoyageIsCreated] Failed to link report ${newDepartureReport.id} to new voyage ${createdVoyage.id}.`);
            }
        } else if (!newDepartureReport.id) {
             console.log(`[VoyageLifecycleService.ensureNewVoyageIsCreated] New departure report does not have an ID yet. ReportService should set voyageId upon its creation using new voyage ${createdVoyage.id}.`);
        }


        return createdVoyage;
    }
};