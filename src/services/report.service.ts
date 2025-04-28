import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection'; // For transactions
import {
    Report, CreateReportDTO, ReportStatus, ReviewReportDTO, DepartureSpecificData,
    NoonSpecificData, ArrivalSpecificData, BerthSpecificData, ReportType,
    EngineUnitData, AuxEngineData, CardinalDirection, CargoStatus, BaseReportData,
    PassageState // Import PassageState
} from '../types/report';
import { Voyage } from '../types/voyage';
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model';
import ReportEngineUnitModel from '../models/report_engine_unit.model';
import ReportAuxEngineModel from '../models/report_aux_engine.model';
// Import calculators and validator
import { calculateTotalConsumptions, calculateCurrentRobs, PreviousRob, TotalConsumptions, BunkerSupplyInput, BunkerConsumptionInput } from './bunker_calculator';
import { calculateDistances, DistanceCalculationInput, DistanceCalculationOutput } from './distance_calculator';
import { validateReportInput } from './report_validator';

// Helper function to check if all required Initial ROBs are present
function hasAllInitialRobs(data: CreateReportDTO): data is DepartureSpecificData & { initialRobLsifo: number; initialRobLsmgo: number; initialRobCylOil: number; initialRobMeOil: number; initialRobAeOil: number; } {
    if (data.reportType !== 'departure') return false;
    return data.initialRobLsifo !== undefined && data.initialRobLsifo !== null &&
           data.initialRobLsmgo !== undefined && data.initialRobLsmgo !== null &&
           data.initialRobCylOil !== undefined && data.initialRobCylOil !== null &&
           data.initialRobMeOil !== undefined && data.initialRobMeOil !== null &&
           data.initialRobAeOil !== undefined && data.initialRobAeOil !== null;
}

// Define a type for the flat data structure used for insertion by the model
type ReportRecordData = {
    id: string; voyageId: string; vesselId: string; reportType: ReportType; status: ReportStatus; captainId: string;
    reviewerId?: string | null; reviewDate?: string | null; reviewComments?: string | null; reportDate: string; reportTime: string; timeZone: string;
    departurePort?: string | null; destinationPort?: string | null; voyageDistance?: number | null; etaDate?: string | null; etaTime?: string | null;
    fwdDraft?: number | null; aftDraft?: number | null; cargoQuantity?: number | null; cargoType?: string | null; cargoStatus?: CargoStatus | null;
    faspDate?: string | null; faspTime?: string | null; faspLatitude?: number | null; faspLongitude?: number | null; faspCourse?: number | null;
    harbourDistance?: number | null; harbourTime?: string | null; distanceSinceLastReport?: number | null; totalDistanceTravelled?: number | null; distanceToGo?: number | null;
    windDirection?: CardinalDirection | null; seaDirection?: CardinalDirection | null; swellDirection?: CardinalDirection | null; windForce?: number | null; seaState?: number | null; swellHeight?: number | null;
    meConsumptionLsifo?: number | null; meConsumptionLsmgo?: number | null; meConsumptionCylOil?: number | null; meConsumptionMeOil?: number | null; meConsumptionAeOil?: number | null;
    boilerConsumptionLsifo?: number | null; boilerConsumptionLsmgo?: number | null; auxConsumptionLsifo?: number | null; auxConsumptionLsmgo?: number | null;
    supplyLsifo?: number | null; supplyLsmgo?: number | null; supplyCylOil?: number | null; supplyMeOil?: number | null; supplyAeOil?: number | null;
    totalConsumptionLsifo?: number | null; totalConsumptionLsmgo?: number | null; totalConsumptionCylOil?: number | null; totalConsumptionMeOil?: number | null; totalConsumptionAeOil?: number | null;
    currentRobLsifo?: number | null; currentRobLsmgo?: number | null; currentRobCylOil?: number | null; currentRobMeOil?: number | null; currentRobAeOil?: number | null;
    meFoPressure?: number | null; meLubOilPressure?: number | null; meFwInletTemp?: number | null; meLoInletTemp?: number | null; meScavengeAirTemp?: number | null;
    meTcRpm1?: number | null; meTcRpm2?: number | null; meTcExhaustTempIn?: number | null; meTcExhaustTempOut?: number | null; meThrustBearingTemp?: number | null; meDailyRunHours?: number | null;
    // Noon Report Specific Fields (align with schema and model type)
    passageState?: PassageState | null;
    noonDate?: string | null; noonTime?: string | null; noonLatitude?: number | null; noonLongitude?: number | null;
    sospDate?: string | null; sospTime?: string | null; sospLatitude?: number | null; sospLongitude?: number | null;
    rospDate?: string | null; rospTime?: string | null; rospLatitude?: number | null; rospLongitude?: number | null;
};


export const ReportService = {

    async submitReport(reportInput: CreateReportDTO, captainId: string): Promise<Report> {
        const reportId = uuidv4();

        // --- Pre-validation steps ---
        // --- 1. Fetch Vessel ---
        const vessel = VesselModel.findById(reportInput.vesselId);
        if (!vessel) throw new Error(`Vessel with ID ${reportInput.vesselId} not found.`);

        // --- 2. Handle Voyage & Previous Report ---
        let voyage: Voyage;
        let previousReport: Partial<Report> | null = null;
        let previousPassageState: PassageState | null = null; // Variable for previous state

        if (reportInput.reportType === 'departure') {
            const voyageData = {
                vesselId: reportInput.vesselId,
                departurePort: reportInput.departurePort,
                destinationPort: reportInput.destinationPort,
                voyageDistance: reportInput.voyageDistance,
                startDate: reportInput.reportDate
            };
            voyage = VoyageModel.create(voyageData);
            previousReport = ReportModel.getLatestReportForVessel(vessel.id); // Get latest overall for vessel
        } else {
            const activeVoyage = VoyageModel.findActiveByVesselId(reportInput.vesselId);
            if (!activeVoyage) throw new Error(`No active voyage found for vessel ${reportInput.vesselId}. Cannot submit ${reportInput.reportType} report.`);
            voyage = activeVoyage;
            previousReport = ReportModel.getLatestReportForVoyage(voyage.id); // Get latest for this voyage
            if (!previousReport) {
                 // Allow first noon report if no previous report exists for the voyage (after departure)
                 if (reportInput.reportType !== 'noon') {
                    throw new Error(`Cannot find previous report for active voyage ${voyage.id}. A departure report might be missing or this is not the first noon report.`);
                 }
            } else {
                 previousPassageState = previousReport.passageState ?? null; // Get previous state if report exists
            }
        }

        // --- 3. Validation (Now with previous state context) ---
        validateReportInput(reportInput, previousPassageState); // Pass previous state to validator

        // --- 4. Determine Previous ROB & Handle Initial ROB ---
        const isFirstReportForVessel = vessel.initialRobLsifo === null;
        const previousRob: PreviousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
        let initialRobDataToSave: any = null; // Prepare data for potential vessel update

        if (isFirstReportForVessel) {
            if (reportInput.reportType !== 'departure') throw new Error("Cannot submit non-departure report as the first report. Initial ROB must be set via a departure report.");
            if (!hasAllInitialRobs(reportInput)) throw new Error("Initial ROB values are required for the first report of this vessel.");
            
            initialRobDataToSave = { /* extract initial ROBs from reportInput */ };
             Object.keys(previousRob).forEach(key => {
                const robKey = `initialRob${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof DepartureSpecificData;
                if (reportInput.reportType === 'departure' && reportInput[robKey] !== undefined) {
                    (previousRob as any)[key] = reportInput[robKey] ?? 0;
                    initialRobDataToSave[robKey] = reportInput[robKey];
                }
            });
        } else {
             if (previousReport) {
                previousRob.lsifo = previousReport.currentRobLsifo ?? 0;
                previousRob.lsmgo = previousReport.currentRobLsmgo ?? 0;
                previousRob.cylOil = previousReport.currentRobCylOil ?? 0;
                previousRob.meOil = previousReport.currentRobMeOil ?? 0;
                previousRob.aeOil = previousReport.currentRobAeOil ?? 0;
            } else { // First report of this voyage, but not first ever
                previousRob.lsifo = vessel.initialRobLsifo ?? 0;
                previousRob.lsmgo = vessel.initialRobLsmgo ?? 0;
                previousRob.cylOil = vessel.initialRobCylOil ?? 0;
                previousRob.meOil = vessel.initialRobMeOil ?? 0;
                previousRob.aeOil = vessel.initialRobAeOil ?? 0;
            }
        }

        // --- 5. Perform Calculations using Modules ---
        const consumptionInput: BunkerConsumptionInput = reportInput; // DTO structure matches
        const supplyInput: BunkerSupplyInput = reportInput; // DTO structure matches
        const totalConsumptions = calculateTotalConsumptions(consumptionInput);
        const currentRobs = calculateCurrentRobs(previousRob, totalConsumptions, supplyInput);

        const distanceInput: DistanceCalculationInput = {
            reportType: reportInput.reportType,
            harbourDistance: reportInput.reportType === 'departure' ? reportInput.harbourDistance : undefined,
            distanceSinceLastReport: reportInput.distanceSinceLastReport,
            previousReportData: previousReport,
            voyageDistance: voyage.voyageDistance
        };
        const distances = calculateDistances(distanceInput);

        // --- 6. Prepare Data for Persistence ---
        const reportRecordData: ReportRecordData = {
            id: reportId, voyageId: voyage.id, vesselId: reportInput.vesselId, reportType: reportInput.reportType,
            status: 'pending', captainId: captainId, reviewerId: null, reviewDate: null, reviewComments: null,
            reportDate: reportInput.reportDate, reportTime: reportInput.reportTime, timeZone: reportInput.timeZone,
            // Include all fields from reportInput, using nullish coalescing for optional ones
            departurePort: reportInput.reportType === 'departure' ? reportInput.departurePort : null,
            destinationPort: reportInput.reportType === 'departure' ? reportInput.destinationPort : null,
            voyageDistance: reportInput.reportType === 'departure' ? reportInput.voyageDistance : null,
            etaDate: reportInput.reportType === 'departure' ? reportInput.etaDate : null,
            etaTime: reportInput.reportType === 'departure' ? reportInput.etaTime : null,
            fwdDraft: reportInput.reportType === 'departure' ? reportInput.fwdDraft : null,
            aftDraft: reportInput.reportType === 'departure' ? reportInput.aftDraft : null,
            cargoQuantity: reportInput.reportType === 'departure' ? reportInput.cargoQuantity : null,
            cargoType: reportInput.reportType === 'departure' ? reportInput.cargoType : null,
            cargoStatus: reportInput.reportType === 'departure' ? reportInput.cargoStatus : null,
            faspDate: reportInput.reportType === 'departure' ? reportInput.faspDate : null,
            faspTime: reportInput.reportType === 'departure' ? reportInput.faspTime : null,
            faspLatitude: reportInput.reportType === 'departure' ? reportInput.faspLatitude : null,
            faspLongitude: reportInput.reportType === 'departure' ? reportInput.faspLongitude : null,
            faspCourse: reportInput.reportType === 'departure' ? reportInput.faspCourse : null,
            harbourDistance: reportInput.reportType === 'departure' ? reportInput.harbourDistance : null,
            harbourTime: reportInput.reportType === 'departure' ? reportInput.harbourTime : null,
            distanceSinceLastReport: reportInput.distanceSinceLastReport ?? null,
            windDirection: reportInput.windDirection ?? null,
            seaDirection: reportInput.seaDirection ?? null,
            swellDirection: reportInput.swellDirection ?? null,
            windForce: reportInput.windForce ?? null,
            seaState: reportInput.seaState ?? null,
            swellHeight: reportInput.swellHeight ?? null,
            meConsumptionLsifo: reportInput.meConsumptionLsifo ?? null,
            meConsumptionLsmgo: reportInput.meConsumptionLsmgo ?? null,
            meConsumptionCylOil: reportInput.meConsumptionCylOil ?? null,
            meConsumptionMeOil: reportInput.meConsumptionMeOil ?? null,
            meConsumptionAeOil: reportInput.meConsumptionAeOil ?? null,
            boilerConsumptionLsifo: reportInput.boilerConsumptionLsifo ?? null,
            boilerConsumptionLsmgo: reportInput.boilerConsumptionLsmgo ?? null,
            auxConsumptionLsifo: reportInput.auxConsumptionLsifo ?? null,
            auxConsumptionLsmgo: reportInput.auxConsumptionLsmgo ?? null,
            supplyLsifo: reportInput.supplyLsifo ?? null,
            supplyLsmgo: reportInput.supplyLsmgo ?? null,
            supplyCylOil: reportInput.supplyCylOil ?? null,
            supplyMeOil: reportInput.supplyMeOil ?? null,
            supplyAeOil: reportInput.supplyAeOil ?? null,
            meFoPressure: reportInput.meFoPressure ?? null,
            meLubOilPressure: reportInput.meLubOilPressure ?? null,
            meFwInletTemp: reportInput.meFwInletTemp ?? null,
            meLoInletTemp: reportInput.meLoInletTemp ?? null,
            meScavengeAirTemp: reportInput.meScavengeAirTemp ?? null,
            meTcRpm1: reportInput.meTcRpm1 ?? null,
            meTcRpm2: reportInput.meTcRpm2 ?? null,
            meTcExhaustTempIn: reportInput.meTcExhaustTempIn ?? null,
            meTcExhaustTempOut: reportInput.meTcExhaustTempOut ?? null,
            meThrustBearingTemp: reportInput.meThrustBearingTemp ?? null,
            meDailyRunHours: reportInput.meDailyRunHours ?? null,
            // Add calculated fields
            totalConsumptionLsifo: totalConsumptions.totalConsumptionLsifo,
            totalConsumptionLsmgo: totalConsumptions.totalConsumptionLsmgo,
            totalConsumptionCylOil: totalConsumptions.totalConsumptionCylOil,
            totalConsumptionMeOil: totalConsumptions.totalConsumptionMeOil,
            totalConsumptionAeOil: totalConsumptions.totalConsumptionAeOil,
            currentRobLsifo: currentRobs.currentRobLsifo,
            currentRobLsmgo: currentRobs.currentRobLsmgo,
            currentRobCylOil: currentRobs.currentRobCylOil,
            currentRobMeOil: currentRobs.currentRobMeOil,
            currentRobAeOil: currentRobs.currentRobAeOil,
            totalDistanceTravelled: distances.totalDistanceTravelled ?? null,
            distanceToGo: distances.distanceToGo ?? null,
            // Add Noon Report Specific Fields
            passageState: reportInput.reportType === 'noon' ? reportInput.passageState : null,
            noonDate: reportInput.reportType === 'noon' && reportInput.passageState === 'NOON' ? reportInput.noonDate : null,
            noonTime: reportInput.reportType === 'noon' && reportInput.passageState === 'NOON' ? reportInput.noonTime : null,
            noonLatitude: reportInput.reportType === 'noon' && reportInput.passageState === 'NOON' ? reportInput.noonLatitude : null,
            noonLongitude: reportInput.reportType === 'noon' && reportInput.passageState === 'NOON' ? reportInput.noonLongitude : null,
            sospDate: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospDate : null,
            sospTime: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospTime : null,
            sospLatitude: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLatitude : null,
            sospLongitude: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLongitude : null,
            rospDate: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospDate : null,
            rospTime: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospTime : null,
            rospLatitude: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLatitude : null,
            rospLongitude: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLongitude : null,
        };

        // --- 7. Execute Transaction ---
        const transaction = db.transaction(() => {
            if (initialRobDataToSave) {
                if (!VesselModel.updateInitialRob(vessel.id, initialRobDataToSave)) {
                    throw new Error("Failed to update initial ROB on vessel record.");
                }
            }
            ReportModel._createReportRecord(reportRecordData); // Insert main report

            if (reportInput.engineUnits?.length) { // Insert units
                if (!ReportEngineUnitModel.createMany(reportId, reportInput.engineUnits)) {
                    throw new Error("Failed to create engine units");
                }
            }
            if (reportInput.auxEngines?.length) { // Insert aux engines
                if (!ReportAuxEngineModel.createMany(reportId, reportInput.auxEngines)) {
                    throw new Error("Failed to create aux engines");
                }
            }
            return reportId;
        });

        try {
            transaction();
            return this.getReportById(reportId); // Fetch the complete report
        } catch (error) {
            console.error(`Report submission transaction failed for report ${reportId}:`, error);
            throw error;
        }
    },

    async getReportById(id: string): Promise<Report> {
        const reportBase = ReportModel.findById(id);
        if (!reportBase) throw new Error(`Report with ID ${id} not found.`);

        const engineUnits = ReportEngineUnitModel.findByReportId(id);
        const auxEngines = ReportAuxEngineModel.findByReportId(id);

        // Combine base report with related data
        // Use type assertion carefully, ensure all fields align
        const fullReport: Report = {
            ...(reportBase as Report), // Cast needed, assuming findById returns all needed base fields
            engineUnits: engineUnits,
            auxEngines: auxEngines,
        };
        return fullReport;
    },

    async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Promise<Report> {
        const existingReport = ReportModel.findById(id);
        if (!existingReport) throw new Error(`Report with ID ${id} not found.`);
        if (existingReport.status !== 'pending') throw new Error(`Report ${id} has already been reviewed (status: ${existingReport.status}).`);

        const success = ReportModel.reviewReport(id, reviewData, reviewerId);
        if (!success) throw new Error(`Failed to review report ${id}.`);
        
        return this.getReportById(id);
    },

    async getPendingReports(): Promise<Report[]> {
        const reportsBase = ReportModel.getPendingReports();
        // For now, return partial data. Fetch full details if needed later.
        console.warn("getPendingReports returns base data only; related machinery not fetched.");
        return reportsBase as Report[]; // Cast needed
    },

    // _validateReportInput is deprecated as validation is now inline and requires previous state
    // _validateReportInput(reportInput: CreateReportDTO): void {
    //     // Use the imported validator function
    //     validateReportInput(reportInput); 
    // }
};
