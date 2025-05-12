import ExcelJS from 'exceljs';
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model';
import { Voyage } from '../types/voyage'; 
import {
    Report,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    ArrivalAnchorNoonSpecificData
} from '../types/report';

// Helper function to format date and time
function formatDateTime(dateStr?: string | null, timeStr?: string | null): string {
    if (dateStr && timeStr) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year} ${timeStr}`;
    }
    return '';
}

export const ExcelExportService = {
    async exportMRVExcel(voyageId: string): Promise<Buffer> {
        console.log(`[ExcelExportService] Starting MRV Excel export for voyageId: ${voyageId}`);
        // 1. Fetch data
        const voyage = await VoyageModel.findById(voyageId);
        if (!voyage) {
            console.error(`[ExcelExportService] Voyage with ID ${voyageId} not found.`);
            throw new Error(`Voyage with ID ${voyageId} not found.`);
        }
        console.log(`[ExcelExportService] Fetched voyage:`, JSON.stringify(voyage, null, 2));

        const vessel = await VesselModel.findById(voyage.vesselId);
        if (!vessel) {
            console.error(`[ExcelExportService] Vessel with ID ${voyage.vesselId} not found for voyage ${voyageId}.`);
            throw new Error(`Vessel with ID ${voyage.vesselId} not found.`);
        }
        console.log(`[ExcelExportService] Fetched vessel:`, JSON.stringify(vessel, null, 2));

        const reports = await ReportModel._getAllReportsForVoyage(voyageId);
        const approvedReports = reports.filter(r => r.status === 'approved');
        console.log(`[ExcelExportService] Total reports: ${reports.length}, Approved reports: ${approvedReports.length}`);

        // 2. Data Aggregation
        console.log('[ExcelExportService] Separating reports by type...');
        let departureReport: Partial<Report> | undefined;
        let arrivalReport: Partial<Report> | undefined;
        const noonReports: Partial<Report>[] = [];
        const arrivalAnchorNoonReports: Partial<Report>[] = [];
        const berthReports: Partial<Report>[] = [];

        approvedReports.forEach(report => {
            if (report.reportType === 'departure') {
                departureReport = report;
            } else if (report.reportType === 'noon') {
                noonReports.push(report);
            } else if (report.reportType === 'arrival') {
                arrivalReport = report;
            } else if (report.reportType === 'arrival_anchor_noon') {
                arrivalAnchorNoonReports.push(report);
            } else if (report.reportType === 'berth') {
                berthReports.push(report);
            }
        });
        console.log(
          `[ExcelExportService] Departure: ${departureReport ? 1 : 0}, Noon: ${noonReports.length}, Arrival: ${
            arrivalReport ? 1 : 0
          }, AAN: ${arrivalAnchorNoonReports.length}, Berth: ${berthReports.length}`
        );

        // --- Sort reports chronologically ---
        console.log('[ExcelExportService] Sorting reports by date/time...');
        const getTime = (report: Partial<Report>): number => {
            let dateStr: string | undefined | null;
            let timeStr: string | undefined | null;
            if (report.reportType === 'noon' || report.reportType === 'arrival_anchor_noon') {
                dateStr = (report as NoonSpecificData | ArrivalAnchorNoonSpecificData).noonDate;
                timeStr = (report as NoonSpecificData | ArrivalAnchorNoonSpecificData).noonTime;
            } else if (report.reportType === 'berth') {
                dateStr = (report as BerthSpecificData).berthDate;
                timeStr = (report as BerthSpecificData).berthTime;
            } else if (report.reportType === 'departure') {
                dateStr = (report as DepartureSpecificData).reportDate; // Use report date/time for sorting reference
                timeStr = (report as DepartureSpecificData).reportTime;
            } else if (report.reportType === 'arrival') {
                 dateStr = (report as ArrivalSpecificData).reportDate; // Use report date/time for sorting reference
                 timeStr = (report as ArrivalSpecificData).reportTime;
            }

            if (dateStr && timeStr) {
                try {
                    return new Date(`${dateStr}T${timeStr}Z`).getTime();
                } catch (e) {
                    console.error(`[ExcelExportService] Error parsing date/time for report ${report.id}:`, e);
                    return 0; // Fallback for parsing errors
                }
            }
            return 0; // Fallback if date/time is missing
        };

        noonReports.sort((a, b) => getTime(a) - getTime(b));
        arrivalAnchorNoonReports.sort((a, b) => getTime(a) - getTime(b));
        berthReports.sort((a, b) => getTime(a) - getTime(b));
        console.log('[ExcelExportService] Reports sorted.');

        // Combine all reports to find the last one for total distance
        const allSortedReports = [
            ...(departureReport ? [departureReport] : []),
            ...noonReports,
            ...(arrivalReport ? [arrivalReport] : []),
            ...arrivalAnchorNoonReports,
            ...berthReports
        ].sort((a, b) => getTime(a) - getTime(b)); // Ensure combined list is sorted

        const lastReportOfVoyage = allSortedReports.length > 0 ? allSortedReports[allSortedReports.length - 1] : undefined;
        // Use totalDistanceTravelled from the last report for the final distance value
        const finalTotalVoyageDistance = lastReportOfVoyage?.totalDistanceTravelled ?? 0;
        console.log(`[ExcelExportService] Final total voyage distance from last report (${lastReportOfVoyage?.id}, type: ${lastReportOfVoyage?.reportType}): ${finalTotalVoyageDistance}`);


        // --- Fetch Next Voyage Departure FASP Time (for Phase 3) ---
        console.log('[ExcelExportService] Fetching next voyage FASP time...');
        let nextVoyageFaspDateTime: string | null = null;
        try {
            const allVesselVoyages = await VoyageModel.findAllByVesselId(vessel.id);
            allVesselVoyages.sort(
                (a: Voyage, b: Voyage) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
            const currentVoyageIndex = allVesselVoyages.findIndex((v: Voyage) => v.id === voyageId);
            console.log(`[ExcelExportService] Current voyage index: ${currentVoyageIndex}, Total vessel voyages: ${allVesselVoyages.length}`);

            if (currentVoyageIndex !== -1 && currentVoyageIndex < allVesselVoyages.length - 1) {
                const nextVoyage = allVesselVoyages[currentVoyageIndex + 1];
                console.log(`[ExcelExportService] Next voyage ID: ${nextVoyage.id}`);
                const nextVoyageReports = await ReportModel._getAllReportsForVoyage(nextVoyage.id);
                const nextDepReport = nextVoyageReports.find(
                    (r) => r.reportType === 'departure' && r.status === 'approved'
                ) as DepartureSpecificData | undefined;
                if (nextDepReport?.faspDate && nextDepReport?.faspTime) {
                    nextVoyageFaspDateTime = formatDateTime(nextDepReport.faspDate, nextDepReport.faspTime);
                    console.log(`[ExcelExportService] Next voyage FASP time from departure report: ${nextVoyageFaspDateTime}`);
                } else {
                    console.log('[ExcelExportService] Next voyage departure report or FASP time not found.');
                }
            } else {
                 console.log('[ExcelExportService] No subsequent voyage found for this vessel.');
            }
        } catch (error) {
            console.error("[ExcelExportService] Error fetching next voyage FASP time:", error);
        }

        if (!nextVoyageFaspDateTime && berthReports.length > 0) {
            console.log('[ExcelExportService] Attempting to use last berth report Cargo Ops End time for Phase 3 Dep. Time.');
            const lastBerthRep = berthReports[berthReports.length - 1] as BerthSpecificData | undefined;
            if (lastBerthRep?.cargoOpsEndDate && lastBerthRep?.cargoOpsEndTime) {
                 nextVoyageFaspDateTime = formatDateTime(lastBerthRep.cargoOpsEndDate, lastBerthRep.cargoOpsEndTime);
                 console.log(`[ExcelExportService] Phase 3 Dep. Time from last berth report: ${nextVoyageFaspDateTime}`);
            } else {
                console.log('[ExcelExportService] Last berth report or its Cargo Ops End time not found.');
            }
        }
        console.log(`[ExcelExportService] Final nextVoyageFaspDateTime for Phase 3: ${nextVoyageFaspDateTime}`);
        // --- End Fetch Next Voyage Departure FASP Time ---

        console.log('[ExcelExportService] Aggregating data for Phase 1: Departure to Anchorage...');
        const departureToAnchorage = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0, hoursUnderway: 0, distanceTravelled: 0,
        };
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            departureToAnchorage.startROB_LSIFO = depData.initialRobLsifo ?? 0;
            departureToAnchorage.startROB_LSMGO = depData.initialRobLsmgo ?? 0;
            departureToAnchorage.bunkerSupplies_LSIFO += depData.supplyLsifo ?? 0;
            departureToAnchorage.bunkerSupplies_LSMGO += depData.supplyLsmgo ?? 0;
            departureToAnchorage.fuelConsumption_LSIFO += departureReport.totalConsumptionLsifo ?? 0;
            departureToAnchorage.fuelConsumption_LSMGO += departureReport.totalConsumptionLsmgo ?? 0;
            departureToAnchorage.hoursUnderway += departureReport.meDailyRunHours ?? 0;
            departureToAnchorage.distanceTravelled += depData.harbourDistance ?? 0;
            console.log('[ExcelExportService] Departure report processed for Phase 1:', JSON.stringify(departureToAnchorage, null, 2));
        } else {
            console.log('[ExcelExportService] No departure report found for Phase 1 initial ROB.');
        }

        let arrivalAtAnchorageTime: number | null = null;
        if (arrivalReport?.reportType === 'arrival') {
            const arrData = arrivalReport as ArrivalSpecificData;
            console.log('[ExcelExportService] Processing arrival report for EOSP time. EOSP Date:', arrData.eospDate, 'EOSP Time:', arrData.eospTime);
            if (arrData.eospDate && arrData.eospTime) {
                try {
                    arrivalAtAnchorageTime = new Date(`${arrData.eospDate}T${arrData.eospTime}Z`).getTime();
                    console.log(`[ExcelExportService] Parsed arrivalAtAnchorageTime (EOSP): ${arrivalAtAnchorageTime}`);
                } catch (e) { console.error("[ExcelExportService] Error parsing arrival EOSP date/time:", e); }
            } else {
                console.log('[ExcelExportService] Arrival report EOSP date or time missing.');
            }
        } else {
            console.log('[ExcelExportService] No arrival report found to determine EOSP for Phase 1 boundary.');
        }

        console.log('[ExcelExportService] Processing noon reports for Phase 1...');
        for (const noonRep of noonReports) {
            if (noonRep.reportType === 'noon') {
                const noonData = noonRep as NoonSpecificData;
                if (noonData.noonDate && noonData.noonTime && arrivalAtAnchorageTime !== null) {
                    try {
                        const noonReportTime = new Date(`${noonData.noonDate}T${noonData.noonTime}Z`).getTime();
                        if (noonReportTime >= arrivalAtAnchorageTime) {
                            console.log(`[ExcelExportService] Noon report ${noonRep.id} is at or after EOSP, stopping Phase 1 noon processing.`);
                            break;
                        }
                    } catch (e) { console.error("[ExcelExportService] Error parsing noon report date/time for phase 1 boundary check:", e); }
                }
                departureToAnchorage.fuelConsumption_LSIFO += (noonRep.totalConsumptionLsifo ?? 0);
                departureToAnchorage.fuelConsumption_LSMGO += (noonRep.totalConsumptionLsmgo ?? 0);
                departureToAnchorage.bunkerSupplies_LSIFO += noonRep.supplyLsifo ?? 0;
                departureToAnchorage.bunkerSupplies_LSMGO += noonRep.supplyLsmgo ?? 0;
                departureToAnchorage.hoursUnderway += noonRep.meDailyRunHours ?? 0;
                departureToAnchorage.distanceTravelled += noonRep.distanceSinceLastReport ?? 0;
            }
        }
        console.log('[ExcelExportService] After noon reports, Phase 1 data:', JSON.stringify(departureToAnchorage, null, 2));

        console.log('[ExcelExportService] Processing AAN reports for Phase 1...');
        arrivalAnchorNoonReports.forEach((aanRep) => {
            if (aanRep.reportType === 'arrival_anchor_noon') {
                const aanData = aanRep as ArrivalAnchorNoonSpecificData;
                let includeInPhase1 = true;
                if (arrivalAtAnchorageTime !== null && aanData.noonDate && aanData.noonTime) {
                    try {
                        const aanReportTime = new Date(`${aanData.noonDate}T${aanData.noonTime}Z`).getTime();
                        if (aanReportTime > arrivalAtAnchorageTime) {
                            console.log(`[ExcelExportService] AAN report ${aanRep.id} is after EOSP, excluding from Phase 1.`);
                            includeInPhase1 = false;
                        }
                    } catch (e) { console.error("[ExcelExportService] Error parsing AAN report date/time for phase 1 boundary check:", e); }
                }

                if (includeInPhase1) {
                    departureToAnchorage.fuelConsumption_LSIFO += (aanRep.totalConsumptionLsifo ?? 0);
                    departureToAnchorage.fuelConsumption_LSMGO += (aanRep.totalConsumptionLsmgo ?? 0);
                    departureToAnchorage.bunkerSupplies_LSIFO += aanRep.supplyLsifo ?? 0;
                    departureToAnchorage.bunkerSupplies_LSMGO += aanRep.supplyLsmgo ?? 0;
                    departureToAnchorage.hoursUnderway += aanRep.meDailyRunHours ?? 0;
                    departureToAnchorage.distanceTravelled += aanRep.distanceSinceLastReport ?? 0;
                }
            }
        });
        console.log('[ExcelExportService] After AAN reports, Phase 1 data:', JSON.stringify(departureToAnchorage, null, 2));
        
        // Determine the last report before shifting starts (EOSP or last AAN)
        let lastRepBeforeShifting: Partial<Report> | undefined =
            arrivalAnchorNoonReports.length > 0
                ? arrivalAnchorNoonReports[arrivalAnchorNoonReports.length - 1] // Last AAN report
                : arrivalReport?.reportType === 'arrival'
                ? arrivalReport // Arrival report itself if no AAN reports
                : undefined;

        if (arrivalReport?.reportType === 'arrival') {
            // Only add arrival report's sea passage data if it's NOT the last report before shifting
            if (lastRepBeforeShifting !== arrivalReport) {
                console.log('[ExcelExportService] Adding arrival report sea passage data (distance, consumption, supply, hours) to Phase 1.');
                departureToAnchorage.fuelConsumption_LSIFO += (arrivalReport.totalConsumptionLsifo ?? 0);
                departureToAnchorage.fuelConsumption_LSMGO += (arrivalReport.totalConsumptionLsmgo ?? 0);
                departureToAnchorage.bunkerSupplies_LSIFO += arrivalReport.supplyLsifo ?? 0;
                departureToAnchorage.bunkerSupplies_LSMGO += arrivalReport.supplyLsmgo ?? 0;
                departureToAnchorage.hoursUnderway += arrivalReport.meDailyRunHours ?? 0;
                departureToAnchorage.distanceTravelled += arrivalReport.distanceSinceLastReport ?? 0;
            } else {
                 console.log('[ExcelExportService] Arrival report is the last report before shifting, its sea passage data will not be added to Phase 1. Harbour data will be added to Phase 2.');
            }
        }
        console.log('[ExcelExportService] Final Phase 1 (departureToAnchorage) data:', JSON.stringify(departureToAnchorage, null, 2));
        
        // Calculate ROB at end of Phase 1 (Arrival at Anchorage/Port)
        // This will be used for both populating Phase 1 Excel cells and as Start ROB for Phase 2
        let robAtAnchorageLSIFO = departureToAnchorage.startROB_LSIFO + departureToAnchorage.bunkerSupplies_LSIFO - departureToAnchorage.fuelConsumption_LSIFO;
        let robAtAnchorageLSMGO = departureToAnchorage.startROB_LSMGO + departureToAnchorage.bunkerSupplies_LSMGO - departureToAnchorage.fuelConsumption_LSMGO;
        console.log(`[ExcelExportService] Initial Calculated ROB Arrival at Anchorage. LSIFO: ${robAtAnchorageLSIFO}, LSMGO: ${robAtAnchorageLSMGO}`);

        // Override with actual reported values if available and appropriate
        if (arrivalReport?.reportType === 'arrival' && lastRepBeforeShifting === arrivalReport) {
            console.log('[ExcelExportService] Overriding calculated ROB at Anchorage with Arrival Report current ROB.');
            robAtAnchorageLSIFO = arrivalReport.currentRobLsifo ?? robAtAnchorageLSIFO;
            robAtAnchorageLSMGO = arrivalReport.currentRobLsmgo ?? robAtAnchorageLSMGO;
        } else if (arrivalAnchorNoonReports.length > 0 && lastRepBeforeShifting === arrivalAnchorNoonReports[arrivalAnchorNoonReports.length -1] ) {
            // Ensure lastRepBeforeShifting is indeed the last AAN if we use it
            const lastAAN = arrivalAnchorNoonReports[arrivalAnchorNoonReports.length -1];
            if (lastAAN) { 
                console.log('[ExcelExportService] Overriding calculated ROB at Anchorage with last AAN Report current ROB.');
                robAtAnchorageLSIFO = lastAAN.currentRobLsifo ?? robAtAnchorageLSIFO;
                robAtAnchorageLSMGO = lastAAN.currentRobLsmgo ?? robAtAnchorageLSMGO;
            }
        }
        console.log(`[ExcelExportService] Final ROB Arrival at Anchorage (End of Phase 1) - LSIFO: ${robAtAnchorageLSIFO}, LSMGO: ${robAtAnchorageLSMGO}`);


        console.log('[ExcelExportService] Aggregating data for Phase 2: Anchorage to Berth...');
        const anchorageToBerth = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0, hoursUnderway: 0, distanceTravelled: 0,
        };

        // Start ROB for Phase 2 ("ROB Prior Shift") must equal "ROB Arrival at Anchorage" from end of Phase 1.
        anchorageToBerth.startROB_LSIFO = robAtAnchorageLSIFO;
        anchorageToBerth.startROB_LSMGO = robAtAnchorageLSMGO;
        console.log(
            `[ExcelExportService] Setting Phase 2 Start ROB (Prior Shift) from calculated end of Phase 1 ROB. LSIFO: ${robAtAnchorageLSIFO}, LSMGO: ${robAtAnchorageLSMGO}`
        );
        
        // The 'lastRepBeforeShifting' variable is still useful for determining the *timing* of the shift start.

        let firstBerthRepTime: number | null = null;
        if (berthReports.length > 0 && berthReports[0]?.reportType === 'berth') {
            const firstBerthData = berthReports[0] as BerthSpecificData;
            console.log('[ExcelExportService] Processing first berth report for Phase 2 end time. Berth Date:', firstBerthData.berthDate, 'Berth Time:', firstBerthData.berthTime);
            if (firstBerthData.berthDate && firstBerthData.berthTime) {
                try {
                    firstBerthRepTime = new Date(`${firstBerthData.berthDate}T${firstBerthData.berthTime}Z`).getTime();
                    console.log(`[ExcelExportService] Parsed firstBerthRepTime: ${firstBerthRepTime}`);
                } catch (e) { console.error("[ExcelExportService] Error parsing first berth report date/time:", e); }
            } else {
                console.log('[ExcelExportService] First berth report date or time missing.');
            }
        } else {
            console.log('[ExcelExportService] No first berth report found for Phase 2 end boundary.');
        }
        
        console.log('[ExcelExportService] Processing noon reports for Phase 2 (shifting)...');
        for (const noonRep of noonReports) {
            if (noonRep.reportType === 'noon') {
                const noonData = noonRep as NoonSpecificData;
                if (noonData.noonDate && noonData.noonTime && arrivalAtAnchorageTime !== null) {
                    try {
                        const noonReportTime = new Date(`${noonData.noonDate}T${noonData.noonTime}Z`).getTime();
                        if (noonReportTime > arrivalAtAnchorageTime && (firstBerthRepTime === null || noonReportTime < firstBerthRepTime)) {
                            console.log(`[ExcelExportService] Including noon report ${noonRep.id} in Phase 2.`);
                            anchorageToBerth.fuelConsumption_LSIFO += (noonRep.totalConsumptionLsifo ?? 0);
                            anchorageToBerth.fuelConsumption_LSMGO += (noonRep.totalConsumptionLsmgo ?? 0);
                            anchorageToBerth.bunkerSupplies_LSIFO += noonRep.supplyLsifo ?? 0;
                            anchorageToBerth.bunkerSupplies_LSMGO += noonRep.supplyLsmgo ?? 0;
                            anchorageToBerth.hoursUnderway += noonRep.meDailyRunHours ?? 0;
                            anchorageToBerth.distanceTravelled += noonRep.distanceSinceLastReport ?? 0;
                        }
                    } catch (e) { console.error("[ExcelExportService] Error parsing noon report date/time for phase 2 boundary check:", e); }
                }
            }
        }

        // Add consumption, supply, distance, hours from reports strictly within Phase 2
        // Phase 2 starts *after* lastRepBeforeShifting and ends *at* firstBerthRepTime

        // Add harbour metrics from arrival report if it marks the start of shifting
        if (arrivalReport?.reportType === 'arrival' && lastRepBeforeShifting === arrivalReport) {
            console.log('[ExcelExportService] Adding arrival report harbour metrics (consumption, time, distance) to Phase 2.');
            const arrivalReportData = arrivalReport as ArrivalSpecificData;
            // Assuming harbour consumption is part of totalConsumption for arrival report
            anchorageToBerth.fuelConsumption_LSIFO += (arrivalReport.totalConsumptionLsifo ?? 0);
            anchorageToBerth.fuelConsumption_LSMGO += (arrivalReport.totalConsumptionLsmgo ?? 0);
            // Add harbour time
            if (arrivalReportData.harbourTime) {
                const timeParts = arrivalReportData.harbourTime.split(':');
                if (timeParts.length === 2) {
                    const hours = parseInt(timeParts[0], 10);
                    const minutes = parseInt(timeParts[1], 10);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                         anchorageToBerth.hoursUnderway += hours + minutes / 60;
                         console.log(`[ExcelExportService] Added harbour time from arrival report: ${hours + minutes / 60} hours`);
                    }
                }
            }
            // Add harbour distance
            anchorageToBerth.distanceTravelled += arrivalReportData.harbourDistance ?? 0;
            console.log(`[ExcelExportService] Added harbour distance from arrival report: ${arrivalReportData.harbourDistance ?? 0} NM`);
            // Add any supplies reported in the arrival report (though unusual for harbour phase)
            anchorageToBerth.bunkerSupplies_LSIFO += arrivalReport.supplyLsifo ?? 0;
            anchorageToBerth.bunkerSupplies_LSMGO += arrivalReport.supplyLsmgo ?? 0;
        }


        if (berthReports.length > 0 && berthReports[0]?.reportType === 'berth') {
            console.log('[ExcelExportService] Adding first berth report supplies to Phase 2.');
            const firstBerthReportData = berthReports[0] as BerthSpecificData;
            anchorageToBerth.bunkerSupplies_LSIFO += firstBerthReportData.supplyLsifo ?? 0;
            anchorageToBerth.bunkerSupplies_LSMGO += firstBerthReportData.supplyLsmgo ?? 0;
        }
        console.log('[ExcelExportService] Final Phase 2 (anchorageToBerth) data:', JSON.stringify(anchorageToBerth, null, 2));
        
        console.log('[ExcelExportService] Aggregating data for Phase 3: At Berth...');
        const atBerth = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0,
        };

        if (berthReports.length > 0) {
            const firstBerthRep = berthReports[0];
            if (firstBerthRep) {
                console.log(`[ExcelExportService] Phase 3 Start ROB from first berth report: ${firstBerthRep.id}`);
                atBerth.startROB_LSIFO = firstBerthRep.currentRobLsifo ?? 0;
                atBerth.startROB_LSMGO = firstBerthRep.currentRobLsmgo ?? 0;
            } else {
                console.log('[ExcelExportService] First berth report is undefined, cannot set Phase 3 Start ROB.');
            }
            berthReports.forEach((br) => {
                if (br.reportType === 'berth') {
                    atBerth.bunkerSupplies_LSIFO += br.supplyLsifo ?? 0;
                    atBerth.bunkerSupplies_LSMGO += br.supplyLsmgo ?? 0;
                    atBerth.fuelConsumption_LSIFO += br.totalConsumptionLsifo ?? 0;
                    atBerth.fuelConsumption_LSMGO += br.totalConsumptionLsmgo ?? 0;
                }
            });
        } else {
            console.log('[ExcelExportService] No berth reports found for Phase 3 aggregation.');
        }
        console.log('[ExcelExportService] Final Phase 3 (atBerth) data:', JSON.stringify(atBerth, null, 2));
        
        console.log('[ExcelExportService] Creating Excel workbook and worksheet...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('MRV DCS Report');
        console.log('[ExcelExportService] Populating Excel headers and static content...');
        worksheet.getCell('A1').value = 'EU MRV & IMO DCS Combined "Per Voyage Reporting" Form';
        worksheet.mergeCells('A1:BX1');
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        const thinBorder = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
        } as ExcelJS.Borders;
        worksheet.getColumn('A').width = 15;
        worksheet.getColumn('B').width = 30;
        worksheet.getColumn('C').width = 30;
        worksheet.getColumn('D').width = 20;
        worksheet.getColumn('E').width = 30; 
        worksheet.getCell('E3').alignment = { horizontal: 'left' }; worksheet.getCell('E3').font = {};
        worksheet.getCell('E4').alignment = { horizontal: 'left' }; worksheet.getCell('E4').font = {};
        worksheet.getCell('E5').alignment = { horizontal: 'left' }; worksheet.getCell('E5').font = {};

        [
            'G','H','I','J','K','L','M','N','O','S','T','U','V','W','X','Y','Z','AA','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AU'
        ].forEach(col => { worksheet.getColumn(col).width = 10; worksheet.getColumn(col).numFmt = '0.00'; });
        worksheet.getColumn('P').width = 20; worksheet.getColumn('Q').width = 20; worksheet.getColumn('AB').width = 20;
        worksheet.getColumn('AW').width = 12; worksheet.getColumn('AX').width = 15;
        worksheet.getColumn('AY').width = 15; worksheet.getColumn('AZ').width = 20;
        worksheet.getCell('A3').value = 'Ship Name:'; worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('E3').value = vessel.name; 
        worksheet.getCell('A4').value = 'IMO No.:'; worksheet.getCell('A4').font = { bold: true };
        worksheet.getCell('E4').value = vessel.imoNumber; 
        worksheet.getCell('J4').value = '* in case of "Other Cargo Ship" or if you wish to further specify ship type, please do so below:';
        worksheet.getCell('A5').value = 'Ship Type:'; worksheet.getCell('A5').font = { bold: true };
        worksheet.getCell('E5').value = vessel.type; 
        const headerRow7 = worksheet.getRow(7); headerRow7.font = { bold: true }; headerRow7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell('D7').value = 'Departure'; worksheet.getCell('E7').value = 'Arr. Anchor';
        worksheet.getCell('F7').value = 'Fuel Quantity ROB (at departure and at arrival at anchorage) in MT'; 
        worksheet.mergeCells('F7:O7');
        worksheet.getCell('P7').value = 'Initiate shift to Berth'; worksheet.getCell('Q7').value = 'Arrival in Port';
        worksheet.getCell('R7').value = 'Fuel Quantity ROB (prior shift and at arrival in port) in MT'; 
        worksheet.mergeCells('R7:AA7');
        worksheet.getCell('AB7').value = 'Dep. for next voyage';
        worksheet.getCell('AC7').value = 'Fuel Quantity ROB (arrival and at departure for next voyage) in MT'; 
        worksheet.mergeCells('AC7:AL7');
        worksheet.getCell('AM7').value = 'Total Fuel Consumption during the voyage, in Metric Tonnes (MT)'; worksheet.mergeCells('AM7:AV7');
        worksheet.getCell('AW7').value = 'Hours Underway'; worksheet.getCell('AX7').value = 'Distance';
        worksheet.getCell('AY7').value = 'Cargo '; worksheet.getCell('AZ7').value = 'Carried';
        worksheet.getCell('BA7').value = 'Cargo Units'; worksheet.getCell('BB7').value = 'Default Weight (MT)';
        worksheet.getCell('BC7').value = '(in case applicable)';
        worksheet.getCell('BE7').value = 'Guidance on Cargo Units Selection'; worksheet.mergeCells('BE7:BL7'); 
        worksheet.getCell('BN7').value = 'Type of Ship'; worksheet.getCell('BP7').value = 'Cargo Units'; worksheet.mergeCells('BP7:BU7'); 
        const headerRow8 = worksheet.getRow(8); headerRow8.font = { bold: true }; headerRow8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        [
            'A8','B8','C8','D8','E8','F8','P8','Q8','R8','AB8','AC8','AM8','AW8','AX8','AY8','AZ8','BA8','BB8','BC8'
        ].forEach(c => worksheet.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true });
        worksheet.getCell('A8').value = 'Voyage No.'; worksheet.getCell('B8').value = 'Departure Port (Port,Country)';
        worksheet.getCell('C8').value = 'Arrival Port (Port, Country)'; worksheet.getCell('D8').value = 'Date/Time (GMT)'; 
        worksheet.getCell('E8').value = 'Date/Time (GMT)'; worksheet.getCell('F8').value = 'ROB Qty'; 
        ['G8','H8','I8','J8','K8','L8','M8','N8','O8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('P8').value = 'Date/Time (GMT)'; worksheet.getCell('Q8').value = 'Date/Time (GMT)'; 
        worksheet.getCell('R8').value = 'ROB Qty';
        ['S8','T8','U8','V8','W8','X8','Y8','Z8','AA8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('AB8').value = 'Date/Time (GMT)'; worksheet.getCell('AC8').value = 'ROB Qty';
        ['AD8','AE8','AF8','AG8','AH8','AI8','AJ8','AK8','AL8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        ['AM8','AN8','AO8','AP8','AQ8','AR8','AS8','AT8','AU8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('AW8').value = '(hh:mm)'; worksheet.getCell('AX8').value = 'Travelled (NM)';
        
        const dataRow = 9; 
        console.log('[ExcelExportService] Populating main voyage data row...');
        worksheet.getCell(`A${dataRow}`).value = voyage.voyageNumber || voyage.id; 
        worksheet.getCell(`B${dataRow}`).value = voyage.departurePort; worksheet.getCell(`C${dataRow}`).value = voyage.destinationPort;
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            worksheet.getCell(`D${dataRow}`).value = formatDateTime(depData.reportDate, depData.reportTime);
        }
        worksheet.getCell(`E${dataRow}`).value = arrivalAtAnchorageTime ? formatDateTime(new Date(arrivalAtAnchorageTime).toISOString().split('T')[0], new Date(arrivalAtAnchorageTime).toISOString().split('T')[1].substring(0,5)) : '';
        
        // Phase 1 Details (Departure to Anchorage)
        console.log('[ExcelExportService] Populating Phase 1 details...');
        worksheet.getCell(`F${dataRow}`).value = 'ROB Departure';
        worksheet.getCell(`G${dataRow}`).value = 0.00; // HFO
        worksheet.getCell(`H${dataRow}`).value = departureToAnchorage.startROB_LSIFO; 
        worksheet.getCell(`I${dataRow}`).value = departureToAnchorage.startROB_LSMGO; 
        [...'JKLMNOP'].forEach((c) => (worksheet.getCell(`${c}${dataRow}`).value = 0.00));

        // Variables robAtAnchorageLSIFO and robAtAnchorageLSMGO are already declared and calculated above.
        // We just use them here.
        // let robAtAnchorageLSIFO = departureToAnchorage.startROB_LSIFO + departureToAnchorage.bunkerSupplies_LSIFO - departureToAnchorage.fuelConsumption_LSIFO; // Redundant declaration
        // let robAtAnchorageLSMGO = departureToAnchorage.startROB_LSMGO + departureToAnchorage.bunkerSupplies_LSMGO - departureToAnchorage.fuelConsumption_LSMGO; // Redundant declaration
        // console.log(`[ExcelExportService] Calculating ROB Arrival at Anchorage. Initial LSIFO: ${departureToAnchorage.startROB_LSIFO}, Supplies: ${departureToAnchorage.bunkerSupplies_LSIFO}, Cons: ${departureToAnchorage.fuelConsumption_LSIFO}`); // Moved up
        // console.log(`[ExcelExportService] Calculating ROB Arrival at Anchorage. Initial LSMGO: ${departureToAnchorage.startROB_LSMGO}, Supplies: ${departureToAnchorage.bunkerSupplies_LSMGO}, Cons: ${departureToAnchorage.fuelConsumption_LSMGO}`); // Moved up

        // if (arrivalReport?.reportType === 'arrival' && lastRepBeforeShifting === arrivalReport) { // Logic moved up
        //     console.log('[ExcelExportService] Overriding calculated ROB at Anchorage with Arrival Report current ROB.');
        //     robAtAnchorageLSIFO = arrivalReport.currentRobLsifo ?? robAtAnchorageLSIFO;
        //     robAtAnchorageLSMGO = arrivalReport.currentRobLsmgo ?? robAtAnchorageLSMGO;
        // } else if (arrivalAnchorNoonReports.length > 0) { // Logic moved up
        //     const lastAAN = arrivalAnchorNoonReports[arrivalAnchorNoonReports.length -1];
        //     if (lastAAN) { 
        //         console.log('[ExcelExportService] Overriding calculated ROB at Anchorage with last AAN Report current ROB.');
        //         robAtAnchorageLSIFO = lastAAN.currentRobLsifo ?? robAtAnchorageLSIFO;
        //         robAtAnchorageLSMGO = lastAAN.currentRobLsmgo ?? robAtAnchorageLSMGO;
        //     }
        // }
        // console.log(`[ExcelExportService] ROB Arrival at Anchorage - LSIFO: ${robAtAnchorageLSIFO}, LSMGO: ${robAtAnchorageLSMGO}`); // Log moved up
        worksheet.getCell(`F${dataRow + 1}`).value = 'ROB Arrival at Anchorage';
        worksheet.getCell(`G${dataRow + 1}`).value = 0.00; 
        worksheet.getCell(`H${dataRow + 1}`).value = robAtAnchorageLSIFO; // Uses the finalized robAtAnchorageLSIFO from above
        worksheet.getCell(`I${dataRow + 1}`).value = robAtAnchorageLSMGO; // Uses the finalized robAtAnchorageLSMGO from above
        [...'JKLMNOP'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 1}`).value = 0.00));

        worksheet.getCell(`F${dataRow + 2}`).value = 'Bunker Supply'; 
        worksheet.getCell(`G${dataRow + 2}`).value = 0.00; 
        worksheet.getCell(`H${dataRow + 2}`).value = departureToAnchorage.bunkerSupplies_LSIFO; 
        worksheet.getCell(`I${dataRow + 2}`).value = departureToAnchorage.bunkerSupplies_LSMGO; 
        [...'JKLMNOP'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 2}`).value = 0.00));

        worksheet.getCell(`F${dataRow + 3}`).value = 'Fuel Consumed during Sea Passage';
        worksheet.getCell(`G${dataRow + 3}`).value = 0.00; 
        worksheet.getCell(`H${dataRow + 3}`).value = departureToAnchorage.fuelConsumption_LSIFO; 
        worksheet.getCell(`I${dataRow + 3}`).value = departureToAnchorage.fuelConsumption_LSMGO; 
        [...'JKLMNOP'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 3}`).value = 0.00));

        // Phase 2 Details (Anchorage to Berth) - Align detail rows with dataRow
        console.log('[ExcelExportService] Populating Phase 2 details...');
        let initiateShiftTimeFormatted = '';
        if (lastRepBeforeShifting) {
            if (lastRepBeforeShifting.reportType === 'arrival') {
                const arrivalData = lastRepBeforeShifting as ArrivalSpecificData;
                // Prioritize estimatedBerthingDate/Time from Arrival Report
                if (arrivalData.estimatedBerthingDate && arrivalData.estimatedBerthingTime) {
                    initiateShiftTimeFormatted = formatDateTime(arrivalData.estimatedBerthingDate, arrivalData.estimatedBerthingTime);
                    console.log(`[ExcelExportService] Initiate Shift Time from Arrival Report estimatedBerthingDate/Time: ${initiateShiftTimeFormatted}`);
                } else if (arrivalData.eospDate && arrivalData.eospTime) { // Fallback to EOSP
                    initiateShiftTimeFormatted = formatDateTime(arrivalData.eospDate, arrivalData.eospTime);
                    console.log(`[ExcelExportService] Initiate Shift Time from Arrival Report eospDate/Time: ${initiateShiftTimeFormatted}`);
                }
            } else if (lastRepBeforeShifting.reportType === 'arrival_anchor_noon') {
                const aanData = lastRepBeforeShifting as ArrivalAnchorNoonSpecificData;
                initiateShiftTimeFormatted = formatDateTime(aanData.noonDate, aanData.noonTime);
                console.log(`[ExcelExportService] Initiate Shift Time from AAN Report noonDate/Time: ${initiateShiftTimeFormatted}`);
            }
        }
        if (!initiateShiftTimeFormatted) {
            console.log('[ExcelExportService] Initiate Shift Time could not be determined from available report data.');
        }
        worksheet.getCell(`P${dataRow}`).value = initiateShiftTimeFormatted; 
        worksheet.getCell(`Q${dataRow}`).value = firstBerthRepTime ? formatDateTime(new Date(firstBerthRepTime).toISOString().split('T')[0], new Date(firstBerthRepTime).toISOString().split('T')[1].substring(0,5)) : '';
        
        worksheet.getCell(`R${dataRow}`).value = 'ROB Prior Shift'; 
        worksheet.getCell(`S${dataRow}`).value = 0.00; 
        worksheet.getCell(`T${dataRow}`).value = anchorageToBerth.startROB_LSIFO; 
        worksheet.getCell(`U${dataRow}`).value = anchorageToBerth.startROB_LSMGO; 
        [...'VWXYZAA'].forEach((c) => (worksheet.getCell(`${c}${dataRow}`).value = 0.00));

        let robAtPortLSIFO = anchorageToBerth.startROB_LSIFO + anchorageToBerth.bunkerSupplies_LSIFO - anchorageToBerth.fuelConsumption_LSIFO;
        let robAtPortLSMGO = anchorageToBerth.startROB_LSMGO + anchorageToBerth.bunkerSupplies_LSMGO - anchorageToBerth.fuelConsumption_LSMGO;
        if (berthReports.length > 0 && berthReports[0]) {
            robAtPortLSIFO = berthReports[0].currentRobLsifo ?? robAtPortLSIFO;
            robAtPortLSMGO = berthReports[0].currentRobLsmgo ?? robAtPortLSMGO;
        }
        worksheet.getCell(`R${dataRow + 1}`).value = 'ROB Arrival in Port';
        worksheet.getCell(`S${dataRow + 1}`).value = 0.00; 
        worksheet.getCell(`T${dataRow + 1}`).value = robAtPortLSIFO; 
        worksheet.getCell(`U${dataRow + 1}`).value = robAtPortLSMGO; 
        [...'VWXYZAA'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 1}`).value = 0.00));

        worksheet.getCell(`R${dataRow + 2}`).value = 'Bunker Supply'; 
        worksheet.getCell(`S${dataRow + 2}`).value = 0.00; 
        worksheet.getCell(`T${dataRow + 2}`).value = anchorageToBerth.bunkerSupplies_LSIFO; 
        worksheet.getCell(`U${dataRow + 2}`).value = anchorageToBerth.bunkerSupplies_LSMGO; 
        [...'VWXYZAA'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 2}`).value = 0.00));

        worksheet.getCell(`R${dataRow + 3}`).value = 'Fuel Consumed during Shifting';
        worksheet.getCell(`S${dataRow + 3}`).value = 0.00; 
        worksheet.getCell(`T${dataRow + 3}`).value = anchorageToBerth.fuelConsumption_LSIFO; 
        worksheet.getCell(`U${dataRow + 3}`).value = anchorageToBerth.fuelConsumption_LSMGO; 
        [...'VWXYZAA'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 3}`).value = 0.00));

        // Phase 3 Details (At Berth) - Align detail rows with dataRow
        console.log('[ExcelExportService] Populating Phase 3 details...');
        worksheet.getCell(`AB${dataRow}`).value = nextVoyageFaspDateTime || 'N/A'; 
        
        worksheet.getCell(`AC${dataRow}`).value = 'ROB At Berth Start'; 
        worksheet.getCell(`AD${dataRow}`).value = 0.00; 
        worksheet.getCell(`AE${dataRow}`).value = atBerth.startROB_LSIFO; 
        worksheet.getCell(`AF${dataRow}`).value = atBerth.startROB_LSMGO;
        [...'AGAHAIJAKAL'].forEach((c) => (worksheet.getCell(`${c}${dataRow}`).value = 0.00));
        
        const robAtDepNextVoyLSIFO = atBerth.startROB_LSIFO + atBerth.bunkerSupplies_LSIFO - atBerth.fuelConsumption_LSIFO;
        const robAtDepNextVoyLSMGO = atBerth.startROB_LSMGO + atBerth.bunkerSupplies_LSMGO - atBerth.fuelConsumption_LSMGO;
        worksheet.getCell(`AC${dataRow + 1}`).value = 'ROB At Dep. Next Voyage';
        worksheet.getCell(`AD${dataRow + 1}`).value = 0.00; 
        worksheet.getCell(`AE${dataRow + 1}`).value = robAtDepNextVoyLSIFO; 
        worksheet.getCell(`AF${dataRow + 1}`).value = robAtDepNextVoyLSMGO; 
        [...'AGAHAIJAKAL'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 1}`).value = 0.00));

        worksheet.getCell(`AC${dataRow + 2}`).value = 'Bunker Supply'; 
        worksheet.getCell(`AD${dataRow + 2}`).value = 0.00; 
        worksheet.getCell(`AE${dataRow + 2}`).value = atBerth.bunkerSupplies_LSIFO; 
        worksheet.getCell(`AF${dataRow + 2}`).value = atBerth.bunkerSupplies_LSMGO; 
        [...'AGAHAIJAKAL'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 2}`).value = 0.00));

        worksheet.getCell(`AC${dataRow + 3}`).value = 'Fuel Consumed At Berth';
        worksheet.getCell(`AD${dataRow + 3}`).value = 0.00; 
        worksheet.getCell(`AE${dataRow + 3}`).value = atBerth.fuelConsumption_LSIFO; 
        worksheet.getCell(`AF${dataRow + 3}`).value = atBerth.fuelConsumption_LSMGO; 
        [...'AGAHAIJAKAL'].forEach((c) => (worksheet.getCell(`${c}${dataRow + 3}`).value = 0.00));

        // Totals
        console.log('[ExcelExportService] Populating Totals...');
        const totalConsumedLsifoVoyage =
            departureToAnchorage.fuelConsumption_LSIFO + anchorageToBerth.fuelConsumption_LSIFO + atBerth.fuelConsumption_LSIFO;
        const totalConsumedLsmgoVoyage =
            departureToAnchorage.fuelConsumption_LSMGO + anchorageToBerth.fuelConsumption_LSMGO + atBerth.fuelConsumption_LSMGO;
        worksheet.getCell(`AM${dataRow}`).value = 0.00; 
        worksheet.getCell(`AN${dataRow}`).value = totalConsumedLsifoVoyage; 
        worksheet.getCell(`AO${dataRow}`).value = totalConsumedLsmgoVoyage; 
        [...'APAQARASATAU'].forEach((c) => (worksheet.getCell(`${c}${dataRow}`).value = 0.00));

        // Hours Underway remains sum of Phase 1 & 2
        const totalHoursUnderway = departureToAnchorage.hoursUnderway + anchorageToBerth.hoursUnderway;
        // Distance Travelled now uses the value from the last report of the entire voyage
        // const totalDistanceTravelled = departureToAnchorage.distanceTravelled + anchorageToBerth.distanceTravelled; // OLD Calculation
        const formatHHMM = (hours: number) => {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        worksheet.getCell(`AW${dataRow}`).value = formatHHMM(totalHoursUnderway);
        worksheet.getCell(`AX${dataRow}`).value = finalTotalVoyageDistance; // Use final total distance
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            worksheet.getCell(`AY${dataRow}`).value = depData.cargoQuantity || 0;
            worksheet.getCell(`AZ${dataRow}`).value = depData.cargoType || '';
        } else {
            worksheet.getCell(`AY${dataRow}`).value = 0;
            worksheet.getCell(`AZ${dataRow}`).value = '';
        }
        worksheet.getCell(`BA${dataRow}`).value = ''; 
        worksheet.getCell(`BB${dataRow}`).value = ''; 
        worksheet.getCell(`BC${dataRow}`).value = ''; 

        // Apply borders and number formats to data area
        console.log('[ExcelExportService] Applying borders and number formats...');
        for (let i = 1; i <= 8; i++) { 
            worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => { cell.border = thinBorder; });
        }
        
        const mainDataLastRow = dataRow + 3; 

        for (let i = dataRow; i <= mainDataLastRow; i++) { 
            for (let j = 1; j <= 55; j++) { 
                 const cell = worksheet.getCell(i, j);
                 cell.border = thinBorder;
                 if ( (j >= 7 && j <= 15) || (j >= 19 && j <= 27) || (j >= 30 && j <= 38) || (j >= 39 && j <= 47) ) { 
                    if (typeof cell.value === 'number') cell.numFmt = '0.00';
                 }
            }
        }
        for (let i = 1; i <= 8; i++) {
            worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
                if (!cell.border) cell.border = thinBorder; 
            });
        }


        // Add Guidance Table Headers (Row 8, starting from BE)
        worksheet.getCell('BE8').value = 'Type of Ship';
        worksheet.getCell('BF8').value = 'Cargo Unit';
        worksheet.getCell('BG8').value = 'Default Weight (MT)';
        worksheet.getCell('BH8').value = 'Type of Ship';
        worksheet.getCell('BI8').value = 'Cargo Unit';
        worksheet.getCell('BJ8').value = 'Default Weight (MT)';
        worksheet.getCell('BK8').value = 'Type of Ship';
        worksheet.getCell('BL8').value = 'Cargo Unit';
        worksheet.getCell('BM8').value = 'Default Weight (MT)';
        ['BE8', 'BF8', 'BG8', 'BH8', 'BI8', 'BJ8', 'BK8', 'BL8', 'BM8'].forEach(cellRef => {
            worksheet.getCell(cellRef).font = { bold: true };
            worksheet.getCell(cellRef).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            worksheet.getCell(cellRef).border = thinBorder; 
        });


        // Add Guidance Table Data (Starting from Row 9, BE onwards)
        const guidanceData = [
            ['Bulk Carrier', 'Tonnes', 1, 'Gas Carrier', 'Cubic Metres (m3)', 0.5, 'Ro-ro Ship', 'No. of Cargo Units (Trailers)', 25],
            ['Oil Tanker', 'Tonnes', 1, '', '', null, '', 'No. of Lane Metres', 5], 
            ['Chemical Tanker', 'Tonnes', 1, 'LNG Carrier', 'Cubic Metres (m3)', 0.5, 'Container Ship', 'TEU (20ft equivalent unit)', 15],
            ['Container Ship', 'Tonnes', 1, '', '', null, '', 'FEU (40ft equivalent unit)', 25],
            ['General Cargo Ship', 'Tonnes', 1, 'Passenger Ship', 'No. of Passengers', 0.1, '', '', null],
            ['Refrigerated Cargo Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Combination Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Other Cargo Ship', 'Tonnes', 1, '', '', null, '', '', null],
        ];

        let currentGuidanceRow = dataRow; 
        guidanceData.forEach((rowData) => {
            worksheet.getCell(`BE${currentGuidanceRow}`).value = rowData[0];
            worksheet.getCell(`BF${currentGuidanceRow}`).value = rowData[1];
            worksheet.getCell(`BG${currentGuidanceRow}`).value = rowData[2]; 
            worksheet.getCell(`BH${currentGuidanceRow}`).value = rowData[3];
            worksheet.getCell(`BI${currentGuidanceRow}`).value = rowData[4];
            worksheet.getCell(`BJ${currentGuidanceRow}`).value = rowData[5]; 
            worksheet.getCell(`BK${currentGuidanceRow}`).value = rowData[6];
            worksheet.getCell(`BL${currentGuidanceRow}`).value = rowData[7];
            worksheet.getCell(`BM${currentGuidanceRow}`).value = rowData[8]; 
            
            for (let k = 57; k <= 65; k++) { 
                const cell = worksheet.getCell(currentGuidanceRow, k);
                cell.border = thinBorder;
                if (k === 59 || k === 62 || k === 65) { 
                     if(typeof cell.value === 'number') {
                        cell.numFmt = '0.00';
                     } else if (cell.value === null) {
                        cell.value = ''; 
                     }
                }
            }
            currentGuidanceRow++;
        });
        
        // Set column widths for guidance table
        worksheet.getColumn('BE').width = 25; 
        worksheet.getColumn('BF').width = 25; 
        worksheet.getColumn('BG').width = 20; 
        worksheet.getColumn('BH').width = 25; 
        worksheet.getColumn('BI').width = 25; 
        worksheet.getColumn('BJ').width = 20; 
        worksheet.getColumn('BK').width = 25; 
        worksheet.getColumn('BL').width = 25; 
        worksheet.getColumn('BM').width = 20; 


        // 4. Return Excel Buffer
        console.log('[ExcelExportService] Writing Excel buffer...');
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('[ExcelExportService] Excel export process completed successfully.');
        return buffer as Buffer; 
    }
};
