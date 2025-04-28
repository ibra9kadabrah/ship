import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection'; // For transactions
import {
    Report, CreateReportDTO, ReportStatus, ReviewReportDTO, DepartureSpecificData,
    NoonSpecificData, ArrivalSpecificData, BerthSpecificData, ReportType,
    EngineUnitData, AuxEngineData, CardinalDirection, CargoStatus, BaseReportData,
    PassageState, FullReportViewDTO // Import PassageState and FullReportViewDTO
} from '../types/report';
import { Voyage } from '../types/voyage';
import { User } from '../types/user'; // Import User type
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';
import UserModel from '../models/user.model'; // Import UserModel
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
    // Arrival Report Specific Fields (align with schema)
    eospDate?: string | null; eospTime?: string | null; eospLatitude?: number | null; eospLongitude?: number | null; eospCourse?: number | null;
    estimatedBerthingDate?: string | null; estimatedBerthingTime?: string | null;
    // Berth Report Specific Fields (align with schema)
    berthDate?: string | null; berthTime?: string | null; berthLatitude?: number | null; berthLongitude?: number | null;
    cargoLoaded?: number | null; cargoUnloaded?: number | null; 
    // cargoQuantity is already defined above
    cargoOpsStartDate?: string | null; cargoOpsStartTime?: string | null; cargoOpsEndDate?: string | null; cargoOpsEndTime?: string | null;
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
        // No need for previousPassageState here, pass full previousReport to validator

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
            if (!previousReport && reportInput.reportType !== 'noon') { 
                 // Allow first noon report, but not others without a previous report
                 throw new Error(`Cannot find previous report for active voyage ${voyage.id}. A departure report might be missing.`);
            }
        }

        // --- Check for Pending Reports (BEFORE Validation) ---
        if (reportInput.reportType !== 'departure') { // Don't check for the very first report
             // Check for existing pending reports for this voyage by this captain
             if (ReportModel.hasPendingReportsForVoyage(captainId, voyage.id)) {
                 throw new Error(`Cannot submit report: A previous report for voyage ${voyage.id} submitted by this captain is still pending review.`);
             }
        }

        // --- 3. Validation (Now with previous report and initial cargo status context) ---
        // Fetch departure report *before* validation if needed for initial cargo status
        const departureReportForValidation = (reportInput.reportType === 'berth') 
            ? ReportModel.getFirstReportForVoyage(voyage.id)
            : null;
        // Safely access cargoStatus only if it's a departure report
        const initialCargoStatusForValidation = (departureReportForValidation?.reportType === 'departure') 
            ? departureReportForValidation.cargoStatus 
            : null;

        validateReportInput(
            reportInput, 
            previousReport, // Pass the entire previous report object
            initialCargoStatusForValidation // Pass cargo status only for berth reports (or null)
        ); 

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
                // Safely access ROBs using 'in' check and ensure they are numbers
                previousRob.lsifo = ('currentRobLsifo' in previousReport && typeof previousReport.currentRobLsifo === 'number') ? previousReport.currentRobLsifo : 0;
                previousRob.lsmgo = ('currentRobLsmgo' in previousReport && typeof previousReport.currentRobLsmgo === 'number') ? previousReport.currentRobLsmgo : 0;
                previousRob.cylOil = ('currentRobCylOil' in previousReport && typeof previousReport.currentRobCylOil === 'number') ? previousReport.currentRobCylOil : 0;
                previousRob.meOil = ('currentRobMeOil' in previousReport && typeof previousReport.currentRobMeOil === 'number') ? previousReport.currentRobMeOil : 0;
                previousRob.aeOil = ('currentRobAeOil' in previousReport && typeof previousReport.currentRobAeOil === 'number') ? previousReport.currentRobAeOil : 0;
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
            distanceSinceLastReport: reportInput.reportType !== 'berth' && 'distanceSinceLastReport' in reportInput ? 
                reportInput.distanceSinceLastReport : undefined, 
            previousReportData: previousReport,
            voyageDistance: voyage.voyageDistance
        };
        const distances = calculateDistances(distanceInput);

        // --- 6. Prepare Data for Persistence ---

        // Calculate Berth specific fields if applicable
        let calculatedCargoQuantity: number | null = null;
        let calculatedCargoStatus: CargoStatus | null = null;
        let calculatedTotalDistance: number | null = distances.totalDistanceTravelled ?? null; // Default from calculator
        let calculatedDistanceToGo: number | null = distances.distanceToGo ?? null; // Default from calculator

        if (reportInput.reportType === 'berth') {
            // Fetch departure report to get initial cargo state
            const departureReport = ReportModel.getFirstReportForVoyage(voyage.id);
            if (!departureReport || departureReport.reportType !== 'departure') {
                 throw new Error(`Cannot process berth report without a valid departure report for voyage ${voyage.id}`);
            }
            // Use the already fetched initialCargoStatusForValidation
            const initialCargoStatus = initialCargoStatusForValidation; 
            const initialCargoQuantity = departureReport.cargoQuantity ?? 0;
            
            // Calculate cargo quantity based on initial state and berth operation
            const previousCargoQuantityValue = (previousReport && 'cargoQuantity' in previousReport && previousReport.cargoQuantity !== null) 
                ? previousReport.cargoQuantity 
                : initialCargoQuantity; // Use initial if previous doesn't have it

            // Ensure previousCargoQuantityValue is a number before calculation
            const baseQuantity = previousCargoQuantityValue ?? 0; 

            if (initialCargoStatus === 'Loaded') {
                calculatedCargoQuantity = baseQuantity - (reportInput.cargoUnloaded ?? 0);
            } else if (initialCargoStatus === 'Empty') {
                calculatedCargoQuantity = baseQuantity + (reportInput.cargoLoaded ?? 0);
            } else {
                 // If initial status is somehow null, just keep the previous quantity
                 calculatedCargoQuantity = baseQuantity; 
            }
            calculatedCargoStatus = initialCargoStatus ?? null; // Keep initial status (or null if departure was missing it)

            // Calculate distance for the *first* berth report
            if (previousReport?.reportType !== 'berth') {
                 // This is the first berth report, calculate distance based on arrival harbour distance
                 const arrivalReport = ReportModel.getLatestReportForVoyageByType(voyage.id, 'arrival'); 
                 if (!arrivalReport) {
                     // If no arrival report found (edge case?), keep distance as per previous report
                     console.warn(`No preceding arrival report found for voyage ${voyage.id} when calculating first berth report distance. Using previous report's distance.`);
                     calculatedTotalDistance = previousReport?.totalDistanceTravelled ?? 0;
                     calculatedDistanceToGo = previousReport?.distanceToGo ?? (voyage.voyageDistance - (previousReport?.totalDistanceTravelled ?? 0));
                 } else {
                     // Safely access properties on the potentially partial arrivalReport
                     const arrivalHarbourDistance = ('harbourDistance' in arrivalReport && typeof arrivalReport.harbourDistance === 'number') ? arrivalReport.harbourDistance : 0;
                     const arrivalTotalDistance = arrivalReport.totalDistanceTravelled ?? 0;
                     
                     calculatedTotalDistance = arrivalTotalDistance + arrivalHarbourDistance; // Both are numbers now
                     calculatedDistanceToGo = voyage.voyageDistance - (calculatedTotalDistance ?? 0);
                 }
            } else {
                 // Subsequent berth report, distance doesn't change
                 calculatedTotalDistance = previousReport.totalDistanceTravelled ?? 0;
                 calculatedDistanceToGo = voyage.voyageDistance - (calculatedTotalDistance ?? 0); 
            }
        }


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
            fwdDraft: reportInput.reportType === 'departure' ? reportInput.fwdDraft : null, // Assuming not relevant for berth
            aftDraft: reportInput.reportType === 'departure' ? reportInput.aftDraft : null, // Assuming not relevant for berth
            // Cargo fields - quantity calculated for berth, others from departure/berth input
            cargoQuantity: reportInput.reportType === 'berth' ? calculatedCargoQuantity : (reportInput.reportType === 'departure' ? reportInput.cargoQuantity : null),
            cargoType: reportInput.reportType === 'departure' ? reportInput.cargoType : null, // Type doesn't change mid-voyage
            cargoStatus: reportInput.reportType === 'berth' ? calculatedCargoStatus : (reportInput.reportType === 'departure' ? reportInput.cargoStatus : null),
            faspDate: reportInput.reportType === 'departure' ? reportInput.faspDate : null,
            faspTime: reportInput.reportType === 'departure' ? reportInput.faspTime : null,
            faspLatitude: reportInput.reportType === 'departure' ? reportInput.faspLatitude : null,
            faspLongitude: reportInput.reportType === 'departure' ? reportInput.faspLongitude : null,
            faspCourse: reportInput.reportType === 'departure' ? reportInput.faspCourse : null,
            // Harbour distance/time can be present on Departure or Arrival
            harbourDistance: (reportInput.reportType === 'departure' || reportInput.reportType === 'arrival') ? reportInput.harbourDistance : null,
            harbourTime: (reportInput.reportType === 'departure' || reportInput.reportType === 'arrival') ? reportInput.harbourTime : null,
            // Distance since last report not applicable for Berth input
            distanceSinceLastReport: null, 
            windDirection: reportInput.windDirection ?? null, // Weather might be optional at berth
            seaDirection: reportInput.seaDirection ?? null, // Weather might be optional at berth
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
            // Add calculated fields (Bunkers are standard)
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
            // Use calculated distances (special handling for berth)
            totalDistanceTravelled: calculatedTotalDistance,
            distanceToGo: calculatedDistanceToGo,
            // Nullify fields not relevant to the current report type
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
            // Add Arrival Report Specific Fields
            eospDate: reportInput.reportType === 'arrival' ? reportInput.eospDate : null,
            eospTime: reportInput.reportType === 'arrival' ? reportInput.eospTime : null,
            eospLatitude: reportInput.reportType === 'arrival' ? reportInput.eospLatitude : null,
            eospLongitude: reportInput.reportType === 'arrival' ? reportInput.eospLongitude : null,
            eospCourse: reportInput.reportType === 'arrival' ? reportInput.eospCourse : null,
            estimatedBerthingDate: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingDate : null,
            estimatedBerthingTime: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingTime : null,
             // Add Berth Report Specific Fields
             berthDate: reportInput.reportType === 'berth' ? reportInput.berthDate : null,
             berthTime: reportInput.reportType === 'berth' ? reportInput.berthTime : null,
             berthLatitude: reportInput.reportType === 'berth' ? reportInput.berthLatitude : null,
             berthLongitude: reportInput.reportType === 'berth' ? reportInput.berthLongitude : null,
             cargoLoaded: reportInput.reportType === 'berth' ? (reportInput.cargoLoaded ?? null) : null,
             cargoUnloaded: reportInput.reportType === 'berth' ? (reportInput.cargoUnloaded ?? null) : null,
             cargoOpsStartDate: reportInput.reportType === 'berth' ? reportInput.cargoOpsStartDate : null,
             cargoOpsStartTime: reportInput.reportType === 'berth' ? reportInput.cargoOpsStartTime : null,
             cargoOpsEndDate: reportInput.reportType === 'berth' ? reportInput.cargoOpsEndDate : null,
             cargoOpsEndTime: reportInput.reportType === 'berth' ? reportInput.cargoOpsEndTime : null,
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

    async getReportById(id: string): Promise<FullReportViewDTO> {
        console.log(`Searching for report with ID: ${id}, length: ${id.length}`); // Added logging
        // 1. Fetch the core report data
        const reportBase = ReportModel.findById(id);
        if (!reportBase) throw new Error(`Report with ID ${id} not found.`);
        if (!reportBase.vesselId || !reportBase.captainId || !reportBase.voyageId) {
             throw new Error(`Report ${id} is missing essential IDs (vesselId, captainId, voyageId).`);
        }

        // 2. Fetch related data in parallel (potentially)
        const vesselPromise = VesselModel.findById(reportBase.vesselId);
        const captainPromise = UserModel.findById(reportBase.captainId);
        const departureReportPromise = ReportModel.getFirstReportForVoyage(reportBase.voyageId);
        const engineUnitsPromise = ReportEngineUnitModel.findByReportId(id);
        const auxEnginesPromise = ReportAuxEngineModel.findByReportId(id);

        // 3. Await all promises
        const [vessel, captain, departureReport, engineUnits, auxEngines] = await Promise.all([
            vesselPromise,
            captainPromise,
            departureReportPromise,
            engineUnitsPromise,
            auxEnginesPromise
        ]);

        // 4. Construct the full DTO
        const fullReport: FullReportViewDTO = {
            ...(reportBase as Report), // Cast needed as findById returns Partial<Report>
            engineUnits: engineUnits || [], // Ensure arrays exist
            auxEngines: auxEngines || [], // Ensure arrays exist
            vesselName: vessel?.name ?? 'Unknown Vessel',
            captainName: captain?.name ?? 'Unknown Captain',
            // Safely access cargo details, prioritizing the fetched departure report
            voyageCargoQuantity: (departureReport?.reportType === 'departure' ? departureReport.cargoQuantity : null) 
                                ?? (reportBase.reportType === 'departure' ? reportBase.cargoQuantity : null) 
                                ?? null,
            voyageCargoType: (departureReport?.reportType === 'departure' ? departureReport.cargoType : null)
                             ?? (reportBase.reportType === 'departure' ? reportBase.cargoType : null)
                             ?? null,
            voyageCargoStatus: (departureReport?.reportType === 'departure' ? departureReport.cargoStatus : null)
                               ?? (reportBase.reportType === 'departure' ? reportBase.cargoStatus : null)
                               ?? null,
        };

        // We need to cast the final object because TS struggles with the complex conditional assignment above
        return fullReport as FullReportViewDTO; 
    },

    async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Promise<FullReportViewDTO> { // Update return type
        const existingReport = ReportModel.findById(id); // Check basic existence first
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
