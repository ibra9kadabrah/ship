import VoyageModel from '../models/voyage.model';
import VesselModel from '../models/vessel.model';
import ReportModel from '../models/report.model';
import { Voyage } from '../types/voyage';
import { Report, DepartureSpecificData, NoonSpecificData, ArrivalSpecificData, BerthSpecificData, ArrivalAnchorNoonSpecificData } from '../types/report';
import { Vessel } from '../types/vessel';
import { VoyageLifecycleService } from './voyage_lifecycle.service';

// Define standard fuel types based on Excel columns for consistency
// TODO: Currently only LFO (mapped from Lsifo) and MGO (mapped from Lsmgo) have data in the database.
// HFO, LPG, LNG, Methanol, Ethanol, and Other fuel types are included in Excel but will show 0 values.
// Future enhancement: Add support for these additional fuel types in the database schema and report submission.
type FuelType = 'hfo' | 'lfo' | 'mgo' | 'lpgP' | 'lpgB' | 'lng' | 'methanol' | 'ethanol' | 'other';

type FuelMetrics = {
    [K in FuelType as `rob${Capitalize<K>}`]?: number;
} & {
    [K in FuelType as `supply${Capitalize<K>}`]?: number;
} & {
    [K in FuelType as `consumed${Capitalize<K>}`]?: number;
};

interface PhaseFuelData {
    robDeparture?: FuelMetrics;
    robArrival?: FuelMetrics; 
    robPriorShift?: FuelMetrics;
    robAtBerthStart?: FuelMetrics;
    robAtDepartureNextVoyage?: FuelMetrics;
    bunkerSupply: FuelMetrics;
    fuelConsumed: FuelMetrics;
}

export interface AggregatedExcelDataDTO {
    vesselName: string | null;
    vesselImoNumber: string | null;
    vesselType: string | null;
    voyageNumber: string | null;
    voyageDeparturePort: string | null;
    voyageArrivalPort: string | null;

    // Phase 1: Departure to Anchorage
    phase1_departureDateTime: string;
    phase1_arrivalAtAnchorageDateTime: string;
    phase1_robDepartureHfo: number;
    phase1_robDepartureLfo: number;
    phase1_robDepartureMgo: number;
    phase1_robDepartureLpgP: number;
    phase1_robDepartureLpgB: number;
    phase1_robDepartureLng: number;
    phase1_robDepartureMethanol: number;
    phase1_robDepartureEthanol: number;
    phase1_robDepartureOther: number;

    phase1_robArrivalAtAnchorageHfo: number;
    phase1_robArrivalAtAnchorageLfo: number;
    phase1_robArrivalAtAnchorageMgo: number;
    phase1_robArrivalAtAnchorageLpgP: number;
    phase1_robArrivalAtAnchorageLpgB: number;
    phase1_robArrivalAtAnchorageLng: number;
    phase1_robArrivalAtAnchorageMethanol: number;
    phase1_robArrivalAtAnchorageEthanol: number;
    phase1_robArrivalAtAnchorageOther: number;

    phase1_bunkerSupplyHfo: number;
    phase1_bunkerSupplyLfo: number;
    phase1_bunkerSupplyMgo: number;
    phase1_bunkerSupplyLpgP: number;
    phase1_bunkerSupplyLpgB: number;
    phase1_bunkerSupplyLng: number;
    phase1_bunkerSupplyMethanol: number;
    phase1_bunkerSupplyEthanol: number;
    phase1_bunkerSupplyOther: number;

    phase1_fuelConsumedHfo: number;
    phase1_fuelConsumedLfo: number;
    phase1_fuelConsumedMgo: number;
    phase1_fuelConsumedLpgP: number;
    phase1_fuelConsumedLpgB: number;
    phase1_fuelConsumedLng: number;
    phase1_fuelConsumedMethanol: number;
    phase1_fuelConsumedEthanol: number;
    phase1_fuelConsumedOther: number;


    // Phase 2: Anchorage to Berth
    phase2_initiateShiftDateTime: string;
    phase2_arrivalInPortDateTime: string;
    phase2_robPriorShiftHfo: number;
    phase2_robPriorShiftLfo: number;
    phase2_robPriorShiftMgo: number;
    phase2_robPriorShiftLpgP: number;
    phase2_robPriorShiftLpgB: number;
    phase2_robPriorShiftLng: number;
    phase2_robPriorShiftMethanol: number;
    phase2_robPriorShiftEthanol: number;
    phase2_robPriorShiftOther: number;

    phase2_robArrivalInPortHfo: number;
    phase2_robArrivalInPortLfo: number;
    phase2_robArrivalInPortMgo: number;
    phase2_robArrivalInPortLpgP: number;
    phase2_robArrivalInPortLpgB: number;
    phase2_robArrivalInPortLng: number;
    phase2_robArrivalInPortMethanol: number;
    phase2_robArrivalInPortEthanol: number;
    phase2_robArrivalInPortOther: number;

    phase2_bunkerSupplyHfo: number;
    phase2_bunkerSupplyLfo: number;
    phase2_bunkerSupplyMgo: number;
    phase2_bunkerSupplyLpgP: number;
    phase2_bunkerSupplyLpgB: number;
    phase2_bunkerSupplyLng: number;
    phase2_bunkerSupplyMethanol: number;
    phase2_bunkerSupplyEthanol: number;
    phase2_bunkerSupplyOther: number;

    phase2_fuelConsumedHfo: number;
    phase2_fuelConsumedLfo: number;
    phase2_fuelConsumedMgo: number;
    phase2_fuelConsumedLpgP: number;
    phase2_fuelConsumedLpgB: number;
    phase2_fuelConsumedLng: number;
    phase2_fuelConsumedMethanol: number;
    phase2_fuelConsumedEthanol: number;
    phase2_fuelConsumedOther: number;


    // Phase 3: At Berth
    phase3_departureNextVoyageDateTime: string;
    phase3_robAtBerthStartHfo: number;
    phase3_robAtBerthStartLfo: number;
    phase3_robAtBerthStartMgo: number;
    phase3_robAtBerthStartLpgP: number;
    phase3_robAtBerthStartLpgB: number;
    phase3_robAtBerthStartLng: number;
    phase3_robAtBerthStartMethanol: number;
    phase3_robAtBerthStartEthanol: number;
    phase3_robAtBerthStartOther: number;

    phase3_robAtDepartureNextVoyageHfo: number;
    phase3_robAtDepartureNextVoyageLfo: number;
    phase3_robAtDepartureNextVoyageMgo: number;
    phase3_robAtDepartureNextVoyageLpgP: number;
    phase3_robAtDepartureNextVoyageLpgB: number;
    phase3_robAtDepartureNextVoyageLng: number;
    phase3_robAtDepartureNextVoyageMethanol: number;
    phase3_robAtDepartureNextVoyageEthanol: number;
    phase3_robAtDepartureNextVoyageOther: number;

    phase3_bunkerSupplyHfo: number;
    phase3_bunkerSupplyLfo: number;
    phase3_bunkerSupplyMgo: number;
    phase3_bunkerSupplyLpgP: number;
    phase3_bunkerSupplyLpgB: number;
    phase3_bunkerSupplyLng: number;
    phase3_bunkerSupplyMethanol: number;
    phase3_bunkerSupplyEthanol: number;
    phase3_bunkerSupplyOther: number;

    phase3_fuelConsumedHfo: number;
    phase3_fuelConsumedLfo: number;
    phase3_fuelConsumedMgo: number;
    phase3_fuelConsumedLpgP: number;
    phase3_fuelConsumedLpgB: number;
    phase3_fuelConsumedLng: number;
    phase3_fuelConsumedMethanol: number;
    phase3_fuelConsumedEthanol: number;
    phase3_fuelConsumedOther: number;


    // Totals
    totalFuelConsumedHfoVoyage: number;
    totalFuelConsumedLfoVoyage: number;
    totalFuelConsumedMgoVoyage: number;
    totalFuelConsumedLpgPVoyage: number;
    totalFuelConsumedLpgBVoyage: number;
    totalFuelConsumedLngVoyage: number;
    totalFuelConsumedMethanolVoyage: number;
    totalFuelConsumedEthanolVoyage: number;
    totalFuelConsumedOtherVoyage: number;

    totalHoursUnderway: string; // hh:mm
    totalDistanceTravelledNm: number;
    averageSpeedKnots: number;

    // Cargo
    cargoQuantity: number | null;
    cargoType: string | null;
    cargoUnits: string | null;
    cargoDefaultWeight: number | null;
    cargoInCaseApplicable: string | null;
}


// Helper function to format date and time
function formatDateTime(dateStr?: string | null, timeStr?: string | null): string {
    if (!dateStr || !timeStr) return '';
    
    try {
        // Handle different date formats (YYYY-MM-DD is expected)
        const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
            console.error(`Invalid date format: ${dateStr}`);
            return '';
        }
        
        const [, year, month, day] = dateMatch;
        
        // Validate time format (HH:MM or HH:MM:SS)
        const timeMatch = timeStr.match(/(\d{2}):(\d{2})(:\d{2})?/);
        if (!timeMatch) {
            console.error(`Invalid time format: ${timeStr}`);
            return '';
        }
        
        // Use only HH:MM for display
        const displayTime = `${timeMatch[1]}:${timeMatch[2]}`;
        
        return `${day}/${month}/${year} ${displayTime}`;
    } catch (e) {
        console.error(`Error formatting date/time: ${dateStr} ${timeStr}`, e);
        return '';
    }
}

// Helper function to sort reports chronologically
const getTimeFromReport = (report: Partial<Report>): number => {
    // The report.reportDate field appears to be a full ISO timestamp string (e.g., "2025-05-29T11:52:22Z")
    // We should use this directly for sorting.
    const dateStr = report.reportDate;

    if (!dateStr) {
        console.warn(`[getTimeFromReport] Missing reportDate for report ${report.id}`);
        return 0; // Return 0 or throw error, to handle missing dates
    }

    try {
        const timestamp = new Date(dateStr).getTime();
        if (isNaN(timestamp)) {
            console.error(`[getTimeFromReport] Invalid timestamp for report ${report.id} from reportDate: '${dateStr}'`);
            return 0; // Or handle error appropriately
        }
        return timestamp;
    } catch (e) {
        console.error(`[getTimeFromReport] Error parsing reportDate for report ${report.id} ('${dateStr}'):`, e);
        return 0; // Or handle error appropriately
    }
};


export const ExcelDataAggregationService = {
    async aggregateDataForExcel(voyageId: string): Promise<AggregatedExcelDataDTO> {
        console.log(`[ExcelDataAggregationService] Starting data aggregation for voyageId: ${voyageId}`);

        const voyage = await VoyageModel.findById(voyageId);
        if (!voyage) throw new Error(`Voyage with ID ${voyageId} not found.`);
        const vessel = await VesselModel.findById(voyage.vesselId);
        if (!vessel) throw new Error(`Vessel with ID ${voyage.vesselId} not found.`);

        const allReportsForVoyage = await ReportModel._getAllReportsForVoyage(voyageId);
        console.log(`[ExcelDataAggregationService] Total reports for voyage: ${allReportsForVoyage.length}`);
        
        const approvedReports = allReportsForVoyage.filter((r: any) => r.status === 'approved');
        console.log(`[ExcelDataAggregationService] Approved reports: ${approvedReports.length}`);
        
        // Log report details before sorting
        console.log(`[ExcelDataAggregationService] Reports before sorting:`);
        approvedReports.forEach((r: any) => {
            console.log(`  - Report ${r.id}: type=${r.reportType}, date=${r.reportDate}, time=${r.reportTime}`);
        });
        
        // Sort chronologically
        approvedReports.sort((a: any, b: any) => getTimeFromReport(a) - getTimeFromReport(b));
        
        // Log report details after sorting
        console.log(`[ExcelDataAggregationService] Reports after sorting:`);
        approvedReports.forEach((r: any) => {
            console.log(`  - Report ${r.id}: type=${r.reportType}, date=${r.reportDate}, time=${r.reportTime}, timestamp=${getTimeFromReport(r)}`);
        });
        
        if (approvedReports.length === 0) throw new Error(`No approved reports found for voyage ${voyageId}.`);

        const departureReport = approvedReports.find((r: any) => r.reportType === 'departure') as (Report & DepartureSpecificData) | undefined;
        const arrivalReport = approvedReports.find((r: any) => r.reportType === 'arrival') as (Report & ArrivalSpecificData) | undefined;
        const noonReports = approvedReports.filter((r: any) => r.reportType === 'noon') as (Report & NoonSpecificData)[];
        const arrivalAnchorNoonReports = approvedReports.filter((r: any) => r.reportType === 'arrival_anchor_noon') as (Report & ArrivalAnchorNoonSpecificData)[];
        const berthReports = approvedReports.filter((r: any) => r.reportType === 'berth') as (Report & BerthSpecificData)[];

        // Pass voyage.id as the currentVoyageId, and voyage.startDate for reference / logging
        const nextVoyageDepartureReport = await VoyageLifecycleService.getNextVoyageDepartureReport(vessel!.id, voyage.id, voyage.startDate);
        let nextVoyageDepartureDateTime = 'N/A';
        if (nextVoyageDepartureReport) {
            nextVoyageDepartureDateTime = formatDateTime(nextVoyageDepartureReport.reportDate, nextVoyageDepartureReport.reportTime);
        }

        const phase1_data = {
            departureDateTime: '', arrivalAtAnchorageDateTime: '',
            robDepartureHfo: 0, robDepartureLfo: 0, robDepartureMgo: 0, robDepartureLpgP: 0, robDepartureLpgB: 0, robDepartureLng: 0, robDepartureMethanol: 0, robDepartureEthanol: 0, robDepartureOther: 0,
            robArrivalAtAnchorageHfo: 0, robArrivalAtAnchorageLfo: 0, robArrivalAtAnchorageMgo: 0, robArrivalAtAnchorageLpgP: 0, robArrivalAtAnchorageLpgB: 0, robArrivalAtAnchorageLng: 0, robArrivalAtAnchorageMethanol: 0, robArrivalAtAnchorageEthanol: 0, robArrivalAtAnchorageOther: 0,
            bunkerSupplyHfo: 0, bunkerSupplyLfo: 0, bunkerSupplyMgo: 0, bunkerSupplyLpgP: 0, bunkerSupplyLpgB: 0, bunkerSupplyLng: 0, bunkerSupplyMethanol: 0, bunkerSupplyEthanol: 0, bunkerSupplyOther: 0,
            fuelConsumedHfo: 0, fuelConsumedLfo: 0, fuelConsumedMgo: 0, fuelConsumedLpgP: 0, fuelConsumedLpgB: 0, fuelConsumedLng: 0, fuelConsumedMethanol: 0, fuelConsumedEthanol: 0, fuelConsumedOther: 0,
            hoursUnderway: 0, distanceTravelled: 0,
        };

        if (departureReport) {
            phase1_data.departureDateTime = formatDateTime(departureReport.reportDate, departureReport.reportTime);
            // Only LFO and MGO are sourced from report. Others default to 0.
            phase1_data.robDepartureLfo = departureReport.currentRobLsifo ?? 0;
            phase1_data.robDepartureMgo = departureReport.currentRobLsmgo ?? 0;

            phase1_data.bunkerSupplyLfo += departureReport.supplyLsifo ?? 0;
            phase1_data.bunkerSupplyMgo += departureReport.supplyLsmgo ?? 0;

            phase1_data.fuelConsumedLfo += departureReport.totalConsumptionLsifo ?? 0;
            phase1_data.fuelConsumedMgo += departureReport.totalConsumptionLsmgo ?? 0;

            phase1_data.hoursUnderway += departureReport.meDailyRunHours ?? 0;
            phase1_data.distanceTravelled += (departureReport as DepartureSpecificData).harbourDistance ?? 0;
        }

        let arrivalAtAnchorageTimeMillis: number | null = null;
        let reportAtAnchorage: Report | undefined = undefined;

        if (arrivalAnchorNoonReports.length > 0) {
            reportAtAnchorage = arrivalAnchorNoonReports[arrivalAnchorNoonReports.length - 1];
            if (reportAtAnchorage && (reportAtAnchorage as ArrivalAnchorNoonSpecificData).noonDate && (reportAtAnchorage as ArrivalAnchorNoonSpecificData).noonTime) {
                arrivalAtAnchorageTimeMillis = getTimeFromReport(reportAtAnchorage);
            }
        } else if (arrivalReport) {
            reportAtAnchorage = arrivalReport;
            if ((arrivalReport as ArrivalSpecificData).eospDate && (arrivalReport as ArrivalSpecificData).eospTime) {
                arrivalAtAnchorageTimeMillis = getTimeFromReport({ reportType: 'arrival', reportDate: (arrivalReport as ArrivalSpecificData).eospDate, reportTime: (arrivalReport as ArrivalSpecificData).eospTime });
            }
        }

        if (arrivalAtAnchorageTimeMillis) {
            phase1_data.arrivalAtAnchorageDateTime = formatDateTime(new Date(arrivalAtAnchorageTimeMillis).toISOString().split('T')[0], new Date(arrivalAtAnchorageTimeMillis).toISOString().split('T')[1].substring(0, 5));
        }

        for (const noonRep of noonReports) {
            const noonReportTimeMillis = getTimeFromReport(noonRep);
            if (arrivalAtAnchorageTimeMillis === null || noonReportTimeMillis < arrivalAtAnchorageTimeMillis) {
                phase1_data.fuelConsumedLfo += noonRep.totalConsumptionLsifo ?? 0;
                phase1_data.fuelConsumedMgo += noonRep.totalConsumptionLsmgo ?? 0;

                phase1_data.bunkerSupplyLfo += noonRep.supplyLsifo ?? 0;
                phase1_data.bunkerSupplyMgo += noonRep.supplyLsmgo ?? 0;

                phase1_data.hoursUnderway += noonRep.meDailyRunHours ?? 0;
                phase1_data.distanceTravelled += noonRep.distanceSinceLastReport ?? 0;
            }
        }

        for (const aanRep of arrivalAnchorNoonReports) {
            const aanReportTimeMillis = getTimeFromReport(aanRep);
            if (reportAtAnchorage !== aanRep && (arrivalAtAnchorageTimeMillis === null || aanReportTimeMillis < arrivalAtAnchorageTimeMillis)) {
                phase1_data.fuelConsumedLfo += aanRep.totalConsumptionLsifo ?? 0;
                phase1_data.fuelConsumedMgo += aanRep.totalConsumptionLsmgo ?? 0;

                phase1_data.bunkerSupplyLfo += aanRep.supplyLsifo ?? 0;
                phase1_data.bunkerSupplyMgo += aanRep.supplyLsmgo ?? 0;

                phase1_data.hoursUnderway += aanRep.meDailyRunHours ?? 0;
                phase1_data.distanceTravelled += aanRep.distanceSinceLastReport ?? 0;
            }
        }
        
        if (arrivalReport) {
            if (reportAtAnchorage !== arrivalReport) { 
                phase1_data.fuelConsumedLfo += arrivalReport.totalConsumptionLsifo ?? 0;
                phase1_data.fuelConsumedMgo += arrivalReport.totalConsumptionLsmgo ?? 0;

                phase1_data.bunkerSupplyLfo += arrivalReport.supplyLsifo ?? 0;
                phase1_data.bunkerSupplyMgo += arrivalReport.supplyLsmgo ?? 0;

                phase1_data.hoursUnderway += arrivalReport.meDailyRunHours ?? 0;
                phase1_data.distanceTravelled += arrivalReport.distanceSinceLastReport ?? 0;
            } else { 
                phase1_data.hoursUnderway += arrivalReport.meDailyRunHours ?? 0;
                phase1_data.distanceTravelled += arrivalReport.distanceSinceLastReport ?? 0;
                phase1_data.fuelConsumedLfo += arrivalReport.totalConsumptionLsifo ?? 0;
                phase1_data.fuelConsumedMgo += arrivalReport.totalConsumptionLsmgo ?? 0;

                phase1_data.bunkerSupplyLfo += arrivalReport.supplyLsifo ?? 0;
                phase1_data.bunkerSupplyMgo += arrivalReport.supplyLsmgo ?? 0;
            }
        }

        if (reportAtAnchorage) {
            phase1_data.robArrivalAtAnchorageLfo = reportAtAnchorage.currentRobLsifo ?? 0;
            phase1_data.robArrivalAtAnchorageMgo = reportAtAnchorage.currentRobLsmgo ?? 0;
            // Other fuel types remain 0 as initialized
        } else {
            phase1_data.robArrivalAtAnchorageLfo = phase1_data.robDepartureLfo + phase1_data.bunkerSupplyLfo - phase1_data.fuelConsumedLfo;
            phase1_data.robArrivalAtAnchorageMgo = phase1_data.robDepartureMgo + phase1_data.bunkerSupplyMgo - phase1_data.fuelConsumedMgo;
            // Other fuel types remain 0 as per calculation with 0 inputs
        }
        phase1_data.robArrivalAtAnchorageHfo = Math.max(0, phase1_data.robArrivalAtAnchorageHfo); // Stays 0
        phase1_data.robArrivalAtAnchorageLfo = Math.max(0, phase1_data.robArrivalAtAnchorageLfo);
        phase1_data.robArrivalAtAnchorageMgo = Math.max(0, phase1_data.robArrivalAtAnchorageMgo);
        phase1_data.robArrivalAtAnchorageLpgP = Math.max(0, phase1_data.robArrivalAtAnchorageLpgP); // Stays 0
        phase1_data.robArrivalAtAnchorageLpgB = Math.max(0, phase1_data.robArrivalAtAnchorageLpgB); // Stays 0
        phase1_data.robArrivalAtAnchorageLng = Math.max(0, phase1_data.robArrivalAtAnchorageLng); // Stays 0
        phase1_data.robArrivalAtAnchorageMethanol = Math.max(0, phase1_data.robArrivalAtAnchorageMethanol); // Stays 0
        phase1_data.robArrivalAtAnchorageEthanol = Math.max(0, phase1_data.robArrivalAtAnchorageEthanol); // Stays 0
        phase1_data.robArrivalAtAnchorageOther = Math.max(0, phase1_data.robArrivalAtAnchorageOther); // Stays 0


        const phase2_data = {
            initiateShiftDateTime: '', arrivalInPortDateTime: '',
            robPriorShiftHfo: phase1_data.robArrivalAtAnchorageHfo, robPriorShiftLfo: phase1_data.robArrivalAtAnchorageLfo, robPriorShiftMgo: phase1_data.robArrivalAtAnchorageMgo, robPriorShiftLpgP: phase1_data.robArrivalAtAnchorageLpgP, robPriorShiftLpgB: phase1_data.robArrivalAtAnchorageLpgB, robPriorShiftLng: phase1_data.robArrivalAtAnchorageLng, robPriorShiftMethanol: phase1_data.robArrivalAtAnchorageMethanol, robPriorShiftEthanol: phase1_data.robArrivalAtAnchorageEthanol, robPriorShiftOther: phase1_data.robArrivalAtAnchorageOther,
            robArrivalInPortHfo: 0, robArrivalInPortLfo: 0, robArrivalInPortMgo: 0, robArrivalInPortLpgP: 0, robArrivalInPortLpgB: 0, robArrivalInPortLng: 0, robArrivalInPortMethanol: 0, robArrivalInPortEthanol: 0, robArrivalInPortOther: 0,
            bunkerSupplyHfo: 0, bunkerSupplyLfo: 0, bunkerSupplyMgo: 0, bunkerSupplyLpgP: 0, bunkerSupplyLpgB: 0, bunkerSupplyLng: 0, bunkerSupplyMethanol: 0, bunkerSupplyEthanol: 0, bunkerSupplyOther: 0,
            fuelConsumedHfo: 0, fuelConsumedLfo: 0, fuelConsumedMgo: 0, fuelConsumedLpgP: 0, fuelConsumedLpgB: 0, fuelConsumedLng: 0, fuelConsumedMethanol: 0, fuelConsumedEthanol: 0, fuelConsumedOther: 0,
            hoursUnderway: 0, distanceTravelled: 0,
        };

        if (reportAtAnchorage) {
            if (reportAtAnchorage.reportType === 'arrival') {
                const arrivalData = reportAtAnchorage as ArrivalSpecificData;
                if (arrivalData.estimatedBerthingDate && arrivalData.estimatedBerthingTime) {
                    phase2_data.initiateShiftDateTime = formatDateTime(arrivalData.estimatedBerthingDate, arrivalData.estimatedBerthingTime);
                } else if (arrivalData.eospDate && arrivalData.eospTime) {
                    phase2_data.initiateShiftDateTime = formatDateTime(arrivalData.eospDate, arrivalData.eospTime);
                }
            } else if (reportAtAnchorage.reportType === 'arrival_anchor_noon') {
                const aanData = reportAtAnchorage as ArrivalAnchorNoonSpecificData;
                phase2_data.initiateShiftDateTime = formatDateTime(aanData.noonDate, aanData.noonTime);
            }
        }
        
        let firstBerthReportTimeMillis: number | null = null;
        const firstBerthReport = berthReports.length > 0 ? berthReports[0] : undefined;

        if (firstBerthReport) {
            firstBerthReportTimeMillis = getTimeFromReport(firstBerthReport);
            if (firstBerthReportTimeMillis) {
                phase2_data.arrivalInPortDateTime = formatDateTime(new Date(firstBerthReportTimeMillis).toISOString().split('T')[0], new Date(firstBerthReportTimeMillis).toISOString().split('T')[1].substring(0, 5));
            }
        }

        if (arrivalReport && reportAtAnchorage === arrivalReport) {
            const arrData = arrivalReport as ArrivalSpecificData;
            phase2_data.fuelConsumedLfo += arrivalReport.totalConsumptionLsifo ?? 0;
            phase2_data.fuelConsumedMgo += arrivalReport.totalConsumptionLsmgo ?? 0;
            // Other fuels remain 0

            phase2_data.bunkerSupplyLfo += arrivalReport.supplyLsifo ?? 0;
            phase2_data.bunkerSupplyMgo += arrivalReport.supplyLsmgo ?? 0;
            // Other fuels remain 0

            if (arrData.harbourTime) { 
                const timeParts = arrData.harbourTime.split(':');
                if (timeParts.length === 2) {
                    const hours = parseInt(timeParts[0], 10);
                    const minutes = parseInt(timeParts[1], 10);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                         phase2_data.hoursUnderway += hours + minutes / 60;
                    }
                }
            }
            phase2_data.distanceTravelled += arrData.harbourDistance ?? 0; 
        }

        for (const noonRep of noonReports) {
            const noonReportTimeMillis = getTimeFromReport(noonRep);
            if (arrivalAtAnchorageTimeMillis !== null && noonReportTimeMillis > arrivalAtAnchorageTimeMillis &&
                (firstBerthReportTimeMillis === null || noonReportTimeMillis < firstBerthReportTimeMillis)) {
                phase2_data.fuelConsumedLfo += noonRep.totalConsumptionLsifo ?? 0;
                phase2_data.fuelConsumedMgo += noonRep.totalConsumptionLsmgo ?? 0;
                // Other fuels remain 0

                phase2_data.bunkerSupplyLfo += noonRep.supplyLsifo ?? 0;
                phase2_data.bunkerSupplyMgo += noonRep.supplyLsmgo ?? 0;
                // Other fuels remain 0

                phase2_data.hoursUnderway += noonRep.meDailyRunHours ?? 0;
                phase2_data.distanceTravelled += noonRep.distanceSinceLastReport ?? 0;
            }
        }
        
        if (firstBerthReport) {
            phase2_data.fuelConsumedLfo += firstBerthReport.totalConsumptionLsifo ?? 0;
            phase2_data.fuelConsumedMgo += firstBerthReport.totalConsumptionLsmgo ?? 0;
            // Other fuels remain 0

            phase2_data.bunkerSupplyLfo += firstBerthReport.supplyLsifo ?? 0;
            phase2_data.bunkerSupplyMgo += firstBerthReport.supplyLsmgo ?? 0;
            // Other fuels remain 0
        }

        if (firstBerthReport) {
            phase2_data.robArrivalInPortLfo = firstBerthReport.currentRobLsifo ?? 0;
            phase2_data.robArrivalInPortMgo = firstBerthReport.currentRobLsmgo ?? 0;
            // Other fuels remain 0
        } else {
            phase2_data.robArrivalInPortLfo = phase2_data.robPriorShiftLfo + phase2_data.bunkerSupplyLfo - phase2_data.fuelConsumedLfo;
            phase2_data.robArrivalInPortMgo = phase2_data.robPriorShiftMgo + phase2_data.bunkerSupplyMgo - phase2_data.fuelConsumedMgo;
            // Other fuels remain 0
        }
        phase2_data.robArrivalInPortHfo = Math.max(0, phase2_data.robArrivalInPortHfo); // Stays 0
        phase2_data.robArrivalInPortLfo = Math.max(0, phase2_data.robArrivalInPortLfo);
        phase2_data.robArrivalInPortMgo = Math.max(0, phase2_data.robArrivalInPortMgo);
        phase2_data.robArrivalInPortLpgP = Math.max(0, phase2_data.robArrivalInPortLpgP); // Stays 0
        phase2_data.robArrivalInPortLpgB = Math.max(0, phase2_data.robArrivalInPortLpgB); // Stays 0
        phase2_data.robArrivalInPortLng = Math.max(0, phase2_data.robArrivalInPortLng); // Stays 0
        phase2_data.robArrivalInPortMethanol = Math.max(0, phase2_data.robArrivalInPortMethanol); // Stays 0
        phase2_data.robArrivalInPortEthanol = Math.max(0, phase2_data.robArrivalInPortEthanol); // Stays 0
        phase2_data.robArrivalInPortOther = Math.max(0, phase2_data.robArrivalInPortOther); // Stays 0


        const phase3_data = {
            robAtBerthStartHfo: phase2_data.robArrivalInPortHfo, robAtBerthStartLfo: phase2_data.robArrivalInPortLfo, robAtBerthStartMgo: phase2_data.robArrivalInPortMgo, robAtBerthStartLpgP: phase2_data.robArrivalInPortLpgP, robAtBerthStartLpgB: phase2_data.robArrivalInPortLpgB, robAtBerthStartLng: phase2_data.robArrivalInPortLng, robAtBerthStartMethanol: phase2_data.robArrivalInPortMethanol, robAtBerthStartEthanol: phase2_data.robArrivalInPortEthanol, robAtBerthStartOther: phase2_data.robArrivalInPortOther,
            robAtDepartureNextVoyageHfo: 0, robAtDepartureNextVoyageLfo: 0, robAtDepartureNextVoyageMgo: 0, robAtDepartureNextVoyageLpgP: 0, robAtDepartureNextVoyageLpgB: 0, robAtDepartureNextVoyageLng: 0, robAtDepartureNextVoyageMethanol: 0, robAtDepartureNextVoyageEthanol: 0, robAtDepartureNextVoyageOther: 0,
            bunkerSupplyHfo: 0, bunkerSupplyLfo: 0, bunkerSupplyMgo: 0, bunkerSupplyLpgP: 0, bunkerSupplyLpgB: 0, bunkerSupplyLng: 0, bunkerSupplyMethanol: 0, bunkerSupplyEthanol: 0, bunkerSupplyOther: 0,
            fuelConsumedHfo: 0, fuelConsumedLfo: 0, fuelConsumedMgo: 0, fuelConsumedLpgP: 0, fuelConsumedLpgB: 0, fuelConsumedLng: 0, fuelConsumedMethanol: 0, fuelConsumedEthanol: 0, fuelConsumedOther: 0,
        };

        for (const br of berthReports) {
            phase3_data.bunkerSupplyLfo += br.supplyLsifo ?? 0;
            phase3_data.bunkerSupplyMgo += br.supplyLsmgo ?? 0;
            // Other fuels remain 0

            phase3_data.fuelConsumedLfo += br.totalConsumptionLsifo ?? 0;
            phase3_data.fuelConsumedMgo += br.totalConsumptionLsmgo ?? 0;
            // Other fuels remain 0
        }

        if (nextVoyageDepartureReport) {
            phase3_data.robAtDepartureNextVoyageLfo = nextVoyageDepartureReport.currentRobLsifo ?? 0;
            phase3_data.robAtDepartureNextVoyageMgo = nextVoyageDepartureReport.currentRobLsmgo ?? 0;
            // Other fuels remain 0
        }
        // Ensure ROBs are not negative (though they will be 0 for non-LFO/MGO if sourced from nextVoyageDepartureReport which also lacks those fields)
        phase3_data.robAtDepartureNextVoyageHfo = Math.max(0, phase3_data.robAtDepartureNextVoyageHfo);
        phase3_data.robAtDepartureNextVoyageLfo = Math.max(0, phase3_data.robAtDepartureNextVoyageLfo);
        phase3_data.robAtDepartureNextVoyageMgo = Math.max(0, phase3_data.robAtDepartureNextVoyageMgo);
        phase3_data.robAtDepartureNextVoyageLpgP = Math.max(0, phase3_data.robAtDepartureNextVoyageLpgP);
        phase3_data.robAtDepartureNextVoyageLpgB = Math.max(0, phase3_data.robAtDepartureNextVoyageLpgB);
        phase3_data.robAtDepartureNextVoyageLng = Math.max(0, phase3_data.robAtDepartureNextVoyageLng);
        phase3_data.robAtDepartureNextVoyageMethanol = Math.max(0, phase3_data.robAtDepartureNextVoyageMethanol);
        phase3_data.robAtDepartureNextVoyageEthanol = Math.max(0, phase3_data.robAtDepartureNextVoyageEthanol);
        phase3_data.robAtDepartureNextVoyageOther = Math.max(0, phase3_data.robAtDepartureNextVoyageOther);


        const totalFuelConsumedHfoVoyage = phase1_data.fuelConsumedHfo + phase2_data.fuelConsumedHfo + phase3_data.fuelConsumedHfo; // Will be 0
        const totalFuelConsumedLfoVoyage = phase1_data.fuelConsumedLfo + phase2_data.fuelConsumedLfo + phase3_data.fuelConsumedLfo;
        const totalFuelConsumedMgoVoyage = phase1_data.fuelConsumedMgo + phase2_data.fuelConsumedMgo + phase3_data.fuelConsumedMgo;
        const totalFuelConsumedLpgPVoyage = phase1_data.fuelConsumedLpgP + phase2_data.fuelConsumedLpgP + phase3_data.fuelConsumedLpgP; // Will be 0
        const totalFuelConsumedLpgBVoyage = phase1_data.fuelConsumedLpgB + phase2_data.fuelConsumedLpgB + phase3_data.fuelConsumedLpgB; // Will be 0
        const totalFuelConsumedLngVoyage = phase1_data.fuelConsumedLng + phase2_data.fuelConsumedLng + phase3_data.fuelConsumedLng; // Will be 0
        const totalFuelConsumedMethanolVoyage = phase1_data.fuelConsumedMethanol + phase2_data.fuelConsumedMethanol + phase3_data.fuelConsumedMethanol; // Will be 0
        const totalFuelConsumedEthanolVoyage = phase1_data.fuelConsumedEthanol + phase2_data.fuelConsumedEthanol + phase3_data.fuelConsumedEthanol; // Will be 0
        const totalFuelConsumedOtherVoyage = phase1_data.fuelConsumedOther + phase2_data.fuelConsumedOther + phase3_data.fuelConsumedOther; // Will be 0
    
        // --- Calculate Grand Totals for "N + 1" ---
        let voyageN_TotalHours = 0;
        let voyageN_TotalDistance = 0;
        const lastReportOfVoyageN = approvedReports.length > 0 ? approvedReports[approvedReports.length - 1] : null;
    
        if (lastReportOfVoyageN) {
            console.log(`[ExcelDataAggregation] Last report of Voyage N: ${lastReportOfVoyageN.id}, type: ${lastReportOfVoyageN.reportType}`);
            console.log(`[ExcelDataAggregation] sailingTimeVoyage: ${lastReportOfVoyageN.sailingTimeVoyage}`);
            console.log(`[ExcelDataAggregation] totalDistanceTravelled: ${lastReportOfVoyageN.totalDistanceTravelled}`);
            
            // Check if cumulative fields are available
            if (lastReportOfVoyageN.sailingTimeVoyage !== null && lastReportOfVoyageN.sailingTimeVoyage !== undefined) {
                voyageN_TotalHours = lastReportOfVoyageN.sailingTimeVoyage;
            } else {
                // Fallback: sum up hours from all phases if cumulative value is missing
                console.log(`[ExcelDataAggregation] WARNING: sailingTimeVoyage is null/undefined, using phase totals`);
                voyageN_TotalHours = phase1_data.hoursUnderway + phase2_data.hoursUnderway;
            }
            
            if (lastReportOfVoyageN.totalDistanceTravelled !== null && lastReportOfVoyageN.totalDistanceTravelled !== undefined) {
                voyageN_TotalDistance = lastReportOfVoyageN.totalDistanceTravelled;
            } else {
                // Fallback: sum up distance from all phases if cumulative value is missing
                console.log(`[ExcelDataAggregation] WARNING: totalDistanceTravelled is null/undefined, using phase totals`);
                voyageN_TotalDistance = phase1_data.distanceTravelled + phase2_data.distanceTravelled;
            }
        } else {
            // No reports found, use phase totals
            console.log(`[ExcelDataAggregation] WARNING: No last report found for voyage, using phase totals`);
            voyageN_TotalHours = phase1_data.hoursUnderway + phase2_data.hoursUnderway;
            voyageN_TotalDistance = phase1_data.distanceTravelled + phase2_data.distanceTravelled;
        }
        
        let plus1_Hours = 0;
        let plus1_Distance = 0;
        let plus1_FuelConsumedLfo = 0;
        let plus1_FuelConsumedMgo = 0;
        // ... (initialize other plus1_FuelConsumed... variables to 0)
        let plus1_FuelConsumedHfo = 0;
        let plus1_FuelConsumedLpgP = 0;
        let plus1_FuelConsumedLpgB = 0;
        let plus1_FuelConsumedLng = 0;
        let plus1_FuelConsumedMethanol = 0;
        let plus1_FuelConsumedEthanol = 0;
        let plus1_FuelConsumedOther = 0;
    
        if (nextVoyageDepartureReport) {
            console.log(`[ExcelDataAggregation] Next voyage departure report found: ${nextVoyageDepartureReport.id}`);
            console.log(`[ExcelDataAggregation] Next voyage ME daily run hours: ${nextVoyageDepartureReport.meDailyRunHours}`);
            console.log(`[ExcelDataAggregation] Next voyage harbour distance: ${(nextVoyageDepartureReport as DepartureSpecificData).harbourDistance}`);
            
            plus1_Hours = nextVoyageDepartureReport.meDailyRunHours ?? 0;
            plus1_Distance = (nextVoyageDepartureReport as DepartureSpecificData).harbourDistance ?? 0;
            // Use available totalConsumption fields from the DepartureSpecificData type
            plus1_FuelConsumedLfo = nextVoyageDepartureReport.totalConsumptionLsifo ?? 0; // Maps to LFO
            plus1_FuelConsumedMgo = nextVoyageDepartureReport.totalConsumptionLsmgo ?? 0; // Maps to MGO
            // Other specific fuel types like CylOil, MeOil, AeOil are available but not directly mapped to the Excel summary columns here.
            // HFO, LPG, LNG, Methanol, Ethanol, Other will remain 0 for plus1_ as they are not on DepartureSpecificData's totalConsumption.
            // If these need to be included, the DepartureSpecificData type and report calculation logic would need to change.
        } else {
            console.log(`[ExcelDataAggregation] No next voyage departure report found`);
        }
    
        const grandTotalHoursUnderway = voyageN_TotalHours + plus1_Hours;
        const grandTotalDistanceTravelledNm = voyageN_TotalDistance + plus1_Distance;
        
        console.log(`[ExcelDataAggregation] Grand Total Calculation:`);
        console.log(`  Voyage N Total Hours: ${voyageN_TotalHours}`);
        console.log(`  Voyage N Total Distance: ${voyageN_TotalDistance}`);
        console.log(`  Plus 1 Hours: ${plus1_Hours}`);
        console.log(`  Plus 1 Distance: ${plus1_Distance}`);
        console.log(`  Grand Total Hours: ${grandTotalHoursUnderway}`);
        console.log(`  Grand Total Distance: ${grandTotalDistanceTravelledNm}`);
    
        const formatHHMM = (hours: number): string => {
            if (isNaN(hours) || hours < 0) return '00:00';
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        const totalHoursUnderwayFormatted = formatHHMM(grandTotalHoursUnderway);
        const totalDistanceTravelledNmForExcel = grandTotalDistanceTravelledNm; // Use this for the DTO
    
        let averageSpeedKnots = 0;
        if (grandTotalHoursUnderway > 0 && grandTotalDistanceTravelledNm > 0) {
            averageSpeedKnots = grandTotalDistanceTravelledNm / grandTotalHoursUnderway;
        }
        console.log(`  Average Speed: ${averageSpeedKnots} knots`);
        
        // Grand total consumptions for the summary row
        const grandTotalFuelConsumedHfoVoyage = totalFuelConsumedHfoVoyage + plus1_FuelConsumedHfo;
        const grandTotalFuelConsumedLfoVoyage = totalFuelConsumedLfoVoyage + plus1_FuelConsumedLfo;
        const grandTotalFuelConsumedMgoVoyage = totalFuelConsumedMgoVoyage + plus1_FuelConsumedMgo;
        const grandTotalFuelConsumedLpgPVoyage = totalFuelConsumedLpgPVoyage + plus1_FuelConsumedLpgP;
        const grandTotalFuelConsumedLpgBVoyage = totalFuelConsumedLpgBVoyage + plus1_FuelConsumedLpgB;
        const grandTotalFuelConsumedLngVoyage = totalFuelConsumedLngVoyage + plus1_FuelConsumedLng;
        const grandTotalFuelConsumedMethanolVoyage = totalFuelConsumedMethanolVoyage + plus1_FuelConsumedMethanol;
        const grandTotalFuelConsumedEthanolVoyage = totalFuelConsumedEthanolVoyage + plus1_FuelConsumedEthanol;
        const grandTotalFuelConsumedOtherVoyage = totalFuelConsumedOtherVoyage + plus1_FuelConsumedOther;
    
    
        const cargoQuantity = departureReport?.cargoQuantity ?? null;
        const cargoType = departureReport?.cargoType ?? null;
        const cargoUnits = (departureReport as any)?.cargoUnits ?? null; 
        const cargoDefaultWeight = (departureReport as any)?.cargoDefaultWeight ?? null;
        const cargoInCaseApplicable = (departureReport as any)?.cargoInCaseApplicable ?? null;


        const aggregatedData: AggregatedExcelDataDTO = {
            vesselName: vessel!.name,
            vesselImoNumber: vessel!.imoNumber,
            vesselType: vessel!.type,
            voyageNumber: voyage.voyageNumber || voyage.id,
            voyageDeparturePort: voyage.departurePort,
            voyageArrivalPort: voyage.destinationPort,

            phase1_departureDateTime: phase1_data.departureDateTime,
            phase1_arrivalAtAnchorageDateTime: phase1_data.arrivalAtAnchorageDateTime,
            phase1_robDepartureHfo: phase1_data.robDepartureHfo,
            phase1_robDepartureLfo: phase1_data.robDepartureLfo,
            phase1_robDepartureMgo: phase1_data.robDepartureMgo,
            phase1_robDepartureLpgP: phase1_data.robDepartureLpgP,
            phase1_robDepartureLpgB: phase1_data.robDepartureLpgB,
            phase1_robDepartureLng: phase1_data.robDepartureLng,
            phase1_robDepartureMethanol: phase1_data.robDepartureMethanol,
            phase1_robDepartureEthanol: phase1_data.robDepartureEthanol,
            phase1_robDepartureOther: phase1_data.robDepartureOther,

            phase1_robArrivalAtAnchorageHfo: phase1_data.robArrivalAtAnchorageHfo,
            phase1_robArrivalAtAnchorageLfo: phase1_data.robArrivalAtAnchorageLfo,
            phase1_robArrivalAtAnchorageMgo: phase1_data.robArrivalAtAnchorageMgo,
            phase1_robArrivalAtAnchorageLpgP: phase1_data.robArrivalAtAnchorageLpgP,
            phase1_robArrivalAtAnchorageLpgB: phase1_data.robArrivalAtAnchorageLpgB,
            phase1_robArrivalAtAnchorageLng: phase1_data.robArrivalAtAnchorageLng,
            phase1_robArrivalAtAnchorageMethanol: phase1_data.robArrivalAtAnchorageMethanol,
            phase1_robArrivalAtAnchorageEthanol: phase1_data.robArrivalAtAnchorageEthanol,
            phase1_robArrivalAtAnchorageOther: phase1_data.robArrivalAtAnchorageOther,

            phase1_bunkerSupplyHfo: phase1_data.bunkerSupplyHfo,
            phase1_bunkerSupplyLfo: phase1_data.bunkerSupplyLfo,
            phase1_bunkerSupplyMgo: phase1_data.bunkerSupplyMgo,
            phase1_bunkerSupplyLpgP: phase1_data.bunkerSupplyLpgP,
            phase1_bunkerSupplyLpgB: phase1_data.bunkerSupplyLpgB,
            phase1_bunkerSupplyLng: phase1_data.bunkerSupplyLng,
            phase1_bunkerSupplyMethanol: phase1_data.bunkerSupplyMethanol,
            phase1_bunkerSupplyEthanol: phase1_data.bunkerSupplyEthanol,
            phase1_bunkerSupplyOther: phase1_data.bunkerSupplyOther,

            phase1_fuelConsumedHfo: phase1_data.fuelConsumedHfo,
            phase1_fuelConsumedLfo: phase1_data.fuelConsumedLfo,
            phase1_fuelConsumedMgo: phase1_data.fuelConsumedMgo,
            phase1_fuelConsumedLpgP: phase1_data.fuelConsumedLpgP,
            phase1_fuelConsumedLpgB: phase1_data.fuelConsumedLpgB,
            phase1_fuelConsumedLng: phase1_data.fuelConsumedLng,
            phase1_fuelConsumedMethanol: phase1_data.fuelConsumedMethanol,
            phase1_fuelConsumedEthanol: phase1_data.fuelConsumedEthanol,
            phase1_fuelConsumedOther: phase1_data.fuelConsumedOther,

            phase2_initiateShiftDateTime: phase2_data.initiateShiftDateTime,
            phase2_arrivalInPortDateTime: phase2_data.arrivalInPortDateTime,
            phase2_robPriorShiftHfo: phase2_data.robPriorShiftHfo,
            phase2_robPriorShiftLfo: phase2_data.robPriorShiftLfo,
            phase2_robPriorShiftMgo: phase2_data.robPriorShiftMgo,
            phase2_robPriorShiftLpgP: phase2_data.robPriorShiftLpgP,
            phase2_robPriorShiftLpgB: phase2_data.robPriorShiftLpgB,
            phase2_robPriorShiftLng: phase2_data.robPriorShiftLng,
            phase2_robPriorShiftMethanol: phase2_data.robPriorShiftMethanol,
            phase2_robPriorShiftEthanol: phase2_data.robPriorShiftEthanol,
            phase2_robPriorShiftOther: phase2_data.robPriorShiftOther,

            phase2_robArrivalInPortHfo: phase2_data.robArrivalInPortHfo,
            phase2_robArrivalInPortLfo: phase2_data.robArrivalInPortLfo,
            phase2_robArrivalInPortMgo: phase2_data.robArrivalInPortMgo,
            phase2_robArrivalInPortLpgP: phase2_data.robArrivalInPortLpgP,
            phase2_robArrivalInPortLpgB: phase2_data.robArrivalInPortLpgB,
            phase2_robArrivalInPortLng: phase2_data.robArrivalInPortLng,
            phase2_robArrivalInPortMethanol: phase2_data.robArrivalInPortMethanol,
            phase2_robArrivalInPortEthanol: phase2_data.robArrivalInPortEthanol,
            phase2_robArrivalInPortOther: phase2_data.robArrivalInPortOther,

            phase2_bunkerSupplyHfo: phase2_data.bunkerSupplyHfo,
            phase2_bunkerSupplyLfo: phase2_data.bunkerSupplyLfo,
            phase2_bunkerSupplyMgo: phase2_data.bunkerSupplyMgo,
            phase2_bunkerSupplyLpgP: phase2_data.bunkerSupplyLpgP,
            phase2_bunkerSupplyLpgB: phase2_data.bunkerSupplyLpgB,
            phase2_bunkerSupplyLng: phase2_data.bunkerSupplyLng,
            phase2_bunkerSupplyMethanol: phase2_data.bunkerSupplyMethanol,
            phase2_bunkerSupplyEthanol: phase2_data.bunkerSupplyEthanol,
            phase2_bunkerSupplyOther: phase2_data.bunkerSupplyOther,

            phase2_fuelConsumedHfo: phase2_data.fuelConsumedHfo,
            phase2_fuelConsumedLfo: phase2_data.fuelConsumedLfo,
            phase2_fuelConsumedMgo: phase2_data.fuelConsumedMgo,
            phase2_fuelConsumedLpgP: phase2_data.fuelConsumedLpgP,
            phase2_fuelConsumedLpgB: phase2_data.fuelConsumedLpgB,
            phase2_fuelConsumedLng: phase2_data.fuelConsumedLng,
            phase2_fuelConsumedMethanol: phase2_data.fuelConsumedMethanol,
            phase2_fuelConsumedEthanol: phase2_data.fuelConsumedEthanol,
            phase2_fuelConsumedOther: phase2_data.fuelConsumedOther,

            phase3_departureNextVoyageDateTime: nextVoyageDepartureDateTime,
            phase3_robAtBerthStartHfo: phase3_data.robAtBerthStartHfo,
            phase3_robAtBerthStartLfo: phase3_data.robAtBerthStartLfo,
            phase3_robAtBerthStartMgo: phase3_data.robAtBerthStartMgo,
            phase3_robAtBerthStartLpgP: phase3_data.robAtBerthStartLpgP,
            phase3_robAtBerthStartLpgB: phase3_data.robAtBerthStartLpgB,
            phase3_robAtBerthStartLng: phase3_data.robAtBerthStartLng,
            phase3_robAtBerthStartMethanol: phase3_data.robAtBerthStartMethanol,
            phase3_robAtBerthStartEthanol: phase3_data.robAtBerthStartEthanol,
            phase3_robAtBerthStartOther: phase3_data.robAtBerthStartOther,

            phase3_robAtDepartureNextVoyageHfo: phase3_data.robAtDepartureNextVoyageHfo,
            phase3_robAtDepartureNextVoyageLfo: phase3_data.robAtDepartureNextVoyageLfo,
            phase3_robAtDepartureNextVoyageMgo: phase3_data.robAtDepartureNextVoyageMgo,
            phase3_robAtDepartureNextVoyageLpgP: phase3_data.robAtDepartureNextVoyageLpgP,
            phase3_robAtDepartureNextVoyageLpgB: phase3_data.robAtDepartureNextVoyageLpgB,
            phase3_robAtDepartureNextVoyageLng: phase3_data.robAtDepartureNextVoyageLng,
            phase3_robAtDepartureNextVoyageMethanol: phase3_data.robAtDepartureNextVoyageMethanol,
            phase3_robAtDepartureNextVoyageEthanol: phase3_data.robAtDepartureNextVoyageEthanol,
            phase3_robAtDepartureNextVoyageOther: phase3_data.robAtDepartureNextVoyageOther,

            phase3_bunkerSupplyHfo: phase3_data.bunkerSupplyHfo,
            phase3_bunkerSupplyLfo: phase3_data.bunkerSupplyLfo,
            phase3_bunkerSupplyMgo: phase3_data.bunkerSupplyMgo,
            phase3_bunkerSupplyLpgP: phase3_data.bunkerSupplyLpgP,
            phase3_bunkerSupplyLpgB: phase3_data.bunkerSupplyLpgB,
            phase3_bunkerSupplyLng: phase3_data.bunkerSupplyLng,
            phase3_bunkerSupplyMethanol: phase3_data.bunkerSupplyMethanol,
            phase3_bunkerSupplyEthanol: phase3_data.bunkerSupplyEthanol,
            phase3_bunkerSupplyOther: phase3_data.bunkerSupplyOther,

            phase3_fuelConsumedHfo: phase3_data.fuelConsumedHfo,
            phase3_fuelConsumedLfo: phase3_data.fuelConsumedLfo,
            phase3_fuelConsumedMgo: phase3_data.fuelConsumedMgo,
            phase3_fuelConsumedLpgP: phase3_data.fuelConsumedLpgP,
            phase3_fuelConsumedLpgB: phase3_data.fuelConsumedLpgB,
            phase3_fuelConsumedLng: phase3_data.fuelConsumedLng,
            phase3_fuelConsumedMethanol: phase3_data.fuelConsumedMethanol,
            phase3_fuelConsumedEthanol: phase3_data.fuelConsumedEthanol,
            phase3_fuelConsumedOther: phase3_data.fuelConsumedOther,

            totalFuelConsumedHfoVoyage: grandTotalFuelConsumedHfoVoyage,
            totalFuelConsumedLfoVoyage: grandTotalFuelConsumedLfoVoyage,
            totalFuelConsumedMgoVoyage: grandTotalFuelConsumedMgoVoyage,
            totalFuelConsumedLpgPVoyage: grandTotalFuelConsumedLpgPVoyage,
            totalFuelConsumedLpgBVoyage: grandTotalFuelConsumedLpgBVoyage,
            totalFuelConsumedLngVoyage: grandTotalFuelConsumedLngVoyage,
            totalFuelConsumedMethanolVoyage: grandTotalFuelConsumedMethanolVoyage,
            totalFuelConsumedEthanolVoyage: grandTotalFuelConsumedEthanolVoyage,
            totalFuelConsumedOtherVoyage: grandTotalFuelConsumedOtherVoyage,

            totalHoursUnderway: totalHoursUnderwayFormatted, // Uses grandTotalHoursUnderway
            totalDistanceTravelledNm: totalDistanceTravelledNmForExcel, // Uses grandTotalDistanceTravelledNm
            averageSpeedKnots: averageSpeedKnots, // Uses grand totals

            cargoQuantity: cargoQuantity, // This should be for voyage "N" as per Excel layout
            cargoType: cargoType,
            cargoUnits: cargoUnits, 
            cargoDefaultWeight: cargoDefaultWeight,
            cargoInCaseApplicable: cargoInCaseApplicable,
        };
        console.log("[ExcelDataAggregationService] Aggregated DTO constructed.");
        return aggregatedData;
    }
};