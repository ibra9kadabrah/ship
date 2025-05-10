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
// This should align with the type in report.model.ts and the DB schema
type ReportRecordData = {
    id: string; voyageId: string | null; vesselId: string; reportType: ReportType; status: ReportStatus; captainId: string;
    reviewerId?: string | null; reviewDate?: string | null; reviewComments?: string | null; reportDate: string; reportTime: string; timeZone: string;
    departurePort?: string | null; destinationPort?: string | null; voyageDistance?: number | null; etaDate?: string | null; etaTime?: string | null;
    fwdDraft?: number | null; aftDraft?: number | null; cargoQuantity?: number | null; cargoType?: string | null; cargoStatus?: CargoStatus | null;
    faspDate?: string | null; faspTime?: string | null; 
    faspLatDeg?: number | null; faspLatMin?: number | null; faspLatDir?: 'N' | 'S' | null;
    faspLonDeg?: number | null; faspLonMin?: number | null; faspLonDir?: 'E' | 'W' | null;
    faspCourse?: number | null;
    harbourDistance?: number | null; harbourTime?: string | null; distanceSinceLastReport?: number | null; totalDistanceTravelled?: number | null; distanceToGo?: number | null;
    windDirection?: CardinalDirection | null; seaDirection?: CardinalDirection | null; swellDirection?: CardinalDirection | null; windForce?: number | null; seaState?: number | null; swellHeight?: number | null;
    meConsumptionLsifo?: number | null; meConsumptionLsmgo?: number | null; meConsumptionCylOil?: number | null; meConsumptionMeOil?: number | null; meConsumptionAeOil?: number | null;
    boilerConsumptionLsifo?: number | null; boilerConsumptionLsmgo?: number | null; auxConsumptionLsifo?: number | null; auxConsumptionLsmgo?: number | null;
    supplyLsifo?: number | null; supplyLsmgo?: number | null; supplyCylOil?: number | null; supplyMeOil?: number | null; supplyAeOil?: number | null;
    totalConsumptionLsifo?: number | null; totalConsumptionLsmgo?: number | null; totalConsumptionCylOil?: number | null; totalConsumptionMeOil?: number | null; totalConsumptionAeOil?: number | null;
    currentRobLsifo?: number | null; currentRobLsmgo?: number | null; currentRobCylOil?: number | null; currentRobMeOil?: number | null; currentRobAeOil?: number | null;
    initialRobLsifo?: number | null; // Added for storing input on first departure
    initialRobLsmgo?: number | null;
    initialRobCylOil?: number | null;
    initialRobMeOil?: number | null;
    initialRobAeOil?: number | null;
    meFoPressure?: number | null; meLubOilPressure?: number | null; meFwInletTemp?: number | null; meLoInletTemp?: number | null; meScavengeAirTemp?: number | null;
    meTcRpm1?: number | null; meTcRpm2?: number | null; meTcExhaustTempIn?: number | null; meTcExhaustTempOut?: number | null; meThrustBearingTemp?: number | null; meDailyRunHours?: number | null;
    mePresentRpm?: number | null; // Added Present RPM
    meCurrentSpeed?: number | null; // Added Current Speed
    passageState?: PassageState | null;
    noonDate?: string | null; noonTime?: string | null; 
    noonLatDeg?: number | null; noonLatMin?: number | null; noonLatDir?: 'N' | 'S' | null;
    noonLonDeg?: number | null; noonLonMin?: number | null; noonLonDir?: 'E' | 'W' | null;
    noonCourse?: number | null; // Added noonCourse
    sospDate?: string | null; sospTime?: string | null; 
    sospLatDeg?: number | null; sospLatMin?: number | null; sospLatDir?: 'N' | 'S' | null;
    sospLonDeg?: number | null; sospLonMin?: number | null; sospLonDir?: 'E' | 'W' | null;
    sospCourse?: number | null; // Added sospCourse
    rospDate?: string | null; rospTime?: string | null; 
    rospLatDeg?: number | null; rospLatMin?: number | null; rospLatDir?: 'N' | 'S' | null;
    rospLonDeg?: number | null; rospLonMin?: number | null; rospLonDir?: 'E' | 'W' | null;
    rospCourse?: number | null; // Added rospCourse
    eospDate?: string | null; eospTime?: string | null; 
    eospLatDeg?: number | null; eospLatMin?: number | null; eospLatDir?: 'N' | 'S' | null;
    eospLonDeg?: number | null; eospLonMin?: number | null; eospLonDir?: 'E' | 'W' | null;
    eospCourse?: number | null;
    estimatedBerthingDate?: string | null; estimatedBerthingTime?: string | null;
    berthDate?: string | null; berthTime?: string | null; 
    berthLatDeg?: number | null; berthLatMin?: number | null; berthLatDir?: 'N' | 'S' | null;
    berthLonDeg?: number | null; berthLonMin?: number | null; berthLonDir?: 'E' | 'W' | null;
    cargoLoaded?: number | null; cargoUnloaded?: number | null;
    cargoOpsStartDate?: string | null; cargoOpsStartTime?: string | null; cargoOpsEndDate?: string | null; cargoOpsEndTime?: string | null;
    berthNumber?: string | null; // Added Berth Number
    // Calculated Performance Metrics
    sailingTimeVoyage?: number | null;
    avgSpeedVoyage?: number | null;
};

// Local interface for ROB data used in reviewReport
interface InitialRobData {
  initialRobLsifo?: number | null;
  initialRobLsmgo?: number | null;
  initialRobCylOil?: number | null;
  initialRobMeOil?: number | null;
  initialRobAeOil?: number | null;
}

export const ReportService = {

    async submitReport(reportInput: CreateReportDTO, captainId: string): Promise<Report> {
        const reportId = uuidv4();

        // --- Pre-validation steps ---
        // --- 1. Fetch Vessel ---
        const vessel = VesselModel.findById(reportInput.vesselId);
        if (!vessel) throw new Error(`Vessel with ID ${reportInput.vesselId} not found.`);

        // --- 2. Determine Voyage and Previous Report ---
        let voyageToUse: Voyage | undefined = undefined; // Use undefined initially
        let previousReport: Partial<Report> | null = null;
        let previousActiveVoyage: Voyage | null = null; // To potentially complete
        let voyageIdToUse: string | null = null; // Use null initially
        let createNewVoyage = false; // Flag to create voyage in transaction

        const activeVoyageCheck = VoyageModel.findActiveByVesselId(reportInput.vesselId);

        if (reportInput.reportType === 'departure') {
            createNewVoyage = true; // Default to creating a new voyage for departure
            if (activeVoyageCheck) {
                // If an active voyage exists, check its last report type
                const latestReportForActiveVoyage = ReportModel.getLatestReportForVoyage(activeVoyageCheck.id);
                if (latestReportForActiveVoyage && (latestReportForActiveVoyage.reportType === 'arrival' || latestReportForActiveVoyage.reportType === 'berth')) {
                    // Previous voyage ended (arrival/berth), okay to start a new one.
                    // Mark the previous one as completed later in the transaction.
                    previousActiveVoyage = activeVoyageCheck; 
                    createNewVoyage = true;
                } else if (latestReportForActiveVoyage) { 
                    // Active voyage exists and didn't end with arrival/berth. 
                    throw new Error(`Cannot submit departure report: An active voyage (${activeVoyageCheck.id}) is already in progress for this vessel and did not end with Arrival or Berth.`);
                }
                // If activeVoyageCheck exists but latestReport is null (edge case?), allow new voyage creation.
            } 
            // Note: Voyage creation is deferred to transaction. voyageIdToUse remains null for now.
            previousReport = ReportModel.getLatestReportForVessel(vessel.id); // Get latest overall for vessel ROB calculation
        } else {
            // For Noon, Arrival, Berth - must link to the currently active voyage
            if (!activeVoyageCheck) {
                throw new Error(`No active voyage found for vessel ${reportInput.vesselId}. Cannot submit ${reportInput.reportType} report.`);
            }
            voyageToUse = activeVoyageCheck;
            voyageIdToUse = voyageToUse.id; // Assign existing voyage ID
            previousReport = ReportModel.getLatestReportForVoyage(voyageToUse.id); // Get latest for *this* voyage
        }

        // --- Check for Pending Reports (BEFORE Validation) ---
        // Use the determined voyageIdToUse if it's not a departure report
        if (reportInput.reportType !== 'departure' && voyageIdToUse && ReportModel.hasPendingReportsForVoyage(captainId, voyageIdToUse)) {
            throw new Error(`Cannot submit report: A previous report for voyage ${voyageIdToUse} submitted by this captain is still pending review.`);
        }

        // --- 3. Validation (Now with previous report and initial cargo status context) ---
        const voyageIdForValidation = voyageToUse?.id; 
        const departureReportForValidation = (reportInput.reportType === 'berth' && voyageIdForValidation) 
            ? ReportModel.getFirstReportForVoyage(voyageIdForValidation)
            : null;
        const initialCargoStatusForValidation = (departureReportForValidation?.reportType === 'departure') 
            ? departureReportForValidation.cargoStatus 
            : null;
        
        // --- Fetch previous Noon state specifically for Noon report validation ---
        let previousNoonPassageState: PassageState | null = null;
        if (reportInput.reportType === 'noon' && voyageIdToUse) {
            const previousNoonReport = ReportModel.getLatestNoonReportForVoyage(voyageIdToUse);
            previousNoonPassageState = previousNoonReport?.passageState ?? null;
        }

        // Pass the correct previous report context AND previous noon state to the validator
        // For departure, previousReport is latest for vessel (can be null)
        // For others, previousReport is latest for the active voyage (should exist unless first noon)
        validateReportInput(
            reportInput, 
            vessel, // Pass the fetched vessel object
            previousReport, 
            initialCargoStatusForValidation,
            previousNoonPassageState // Pass the previous noon state
        ); 

        // --- 4. Determine Previous ROB & Handle Initial ROB Input ---
        const isFirstReportForVessel = vessel.initialRobLsifo === null;
        const previousRob: PreviousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
        let initialRobInputData: InitialRobData | null = null; // Store the input initial ROBs temporarily

        if (isFirstReportForVessel) {
            if (reportInput.reportType !== 'departure') throw new Error("Cannot submit non-departure report as the first report. Initial ROB must be set via a departure report.");
            if (!hasAllInitialRobs(reportInput)) throw new Error("Initial ROB values are required for the first report of this vessel.");
            
            initialRobInputData = {}; // Prepare to store input values
             Object.keys(previousRob).forEach(key => {
                const robKey = `initialRob${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof DepartureSpecificData;
                if (reportInput.reportType === 'departure' && reportInput[robKey] !== undefined) {
                    (previousRob as any)[key] = reportInput[robKey] ?? 0; // Use input as previous for calculation
                    (initialRobInputData as any)[robKey] = reportInput[robKey]; // Store input for saving to report record
                }
            });
        } else {
             // Use the correct previousReport based on whether it's departure or not
             const reportToGetRobsFrom = previousReport; 
             if (reportToGetRobsFrom) {
                previousRob.lsifo = ('currentRobLsifo' in reportToGetRobsFrom && typeof reportToGetRobsFrom.currentRobLsifo === 'number') ? reportToGetRobsFrom.currentRobLsifo : 0;
                previousRob.lsmgo = ('currentRobLsmgo' in reportToGetRobsFrom && typeof reportToGetRobsFrom.currentRobLsmgo === 'number') ? reportToGetRobsFrom.currentRobLsmgo : 0;
                previousRob.cylOil = ('currentRobCylOil' in reportToGetRobsFrom && typeof reportToGetRobsFrom.currentRobCylOil === 'number') ? reportToGetRobsFrom.currentRobCylOil : 0;
                previousRob.meOil = ('currentRobMeOil' in reportToGetRobsFrom && typeof reportToGetRobsFrom.currentRobMeOil === 'number') ? reportToGetRobsFrom.currentRobMeOil : 0;
                previousRob.aeOil = ('currentRobAeOil' in reportToGetRobsFrom && typeof reportToGetRobsFrom.currentRobAeOil === 'number') ? reportToGetRobsFrom.currentRobAeOil : 0;
            } else { // Should only happen if it's NOT the first report for vessel, but IS the first for the voyage
                previousRob.lsifo = vessel.initialRobLsifo ?? 0; 
                previousRob.lsmgo = vessel.initialRobLsmgo ?? 0;
                previousRob.cylOil = vessel.initialRobCylOil ?? 0;
                previousRob.meOil = vessel.initialRobMeOil ?? 0;
                previousRob.aeOil = vessel.initialRobAeOil ?? 0;
            }
        }

        // --- 5. Perform Calculations using Modules & Cumulative Data ---
        // Fetch previous approved reports for cumulative calculations
        let previousApprovedReports: Partial<Report>[] = [];
        if (voyageIdToUse) {
            // Need a new model function to get all *approved* reports for a voyage
            // For now, let's assume ReportModel._getAllReportsForVoyage can be adapted or a new one created
            // Placeholder: Assume we get the right reports here
            previousApprovedReports = ReportModel._getAllReportsForVoyage(voyageIdToUse) 
                                        .filter(r => r.status === 'approved'); 
        }

        // Calculate Cumulative Sailing Time
        const currentSailingTime = reportInput.meDailyRunHours ?? 0;
        const previousTotalSailingTime = previousApprovedReports.reduce((sum, report) => {
            // Only sum from reports that have the field and are not Berth reports (as ME might not run)
            if (report.reportType !== 'berth' && report.meDailyRunHours !== null && report.meDailyRunHours !== undefined) {
                return sum + report.meDailyRunHours;
            }
            return sum;
        }, 0);
        const calculatedSailingTimeVoyage = previousTotalSailingTime + currentSailingTime;

        // Calculate Bunker ROBs
        const consumptionInput: BunkerConsumptionInput = reportInput; 
        const supplyInput: BunkerSupplyInput = reportInput; 
        const totalConsumptions = calculateTotalConsumptions(consumptionInput);
        const currentRobs = calculateCurrentRobs(previousRob, totalConsumptions, supplyInput);

        // Determine voyage distance for calculation (use input if new departure, else from voyageToUse)
        const distanceCalcVoyageDistance = voyageToUse?.voyageDistance ?? (reportInput.reportType === 'departure' ? reportInput.voyageDistance : 0);

        const distanceInput: DistanceCalculationInput = {
            reportType: reportInput.reportType,
            harbourDistance: reportInput.reportType === 'departure' ? reportInput.harbourDistance : undefined,
            // Only include distanceSinceLastReport for Noon and Arrival reports
            distanceSinceLastReport: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival') && 'distanceSinceLastReport' in reportInput ?
                reportInput.distanceSinceLastReport : undefined,
            previousReportData: previousReport,
            voyageDistance: distanceCalcVoyageDistance
        };
        const distances = calculateDistances(distanceInput);

        // Calculate Average Voyage Speed
        // Use a distinct variable name here to avoid redeclaration error
        const totalDistanceForAvgSpeed = distances.totalDistanceTravelled ?? 0; 
        const calculatedAvgSpeedVoyage = (calculatedSailingTimeVoyage > 0 && totalDistanceForAvgSpeed > 0) 
            ? totalDistanceForAvgSpeed / calculatedSailingTimeVoyage 
            : 0; // Avoid division by zero, default to 0

        // --- 6. Prepare Data for Persistence ---
        let calculatedCargoQuantity: number | null = null;
        let calculatedCargoStatus: CargoStatus | null = null;
        // Change const to let to allow modification within the 'berth' block
        let calculatedTotalDistance: number | null = distances.totalDistanceTravelled ?? null; 
        let calculatedDistanceToGo: number | null = distances.distanceToGo ?? null;

        if (reportInput.reportType === 'berth') {
            // --- Corrected Cargo Calculation Logic for Berth ---
            // Find the most recent report with a cargo quantity (Berth or Departure)
            const latestBerthReport = ReportModel.getLatestReportForVoyageByType(voyageIdToUse!, 'berth');
            const departureReport = ReportModel.getFirstReportForVoyage(voyageIdToUse!);

            let baseCargoQuantity = 0;
            // Safely access cargoQuantity, checking if the property exists and is a number
            if (latestBerthReport && 'cargoQuantity' in latestBerthReport && typeof latestBerthReport.cargoQuantity === 'number') {
                baseCargoQuantity = latestBerthReport.cargoQuantity;
            } else if (departureReport && 'cargoQuantity' in departureReport && typeof departureReport.cargoQuantity === 'number') {
                baseCargoQuantity = departureReport.cargoQuantity;
            } else {
                // Should not happen in a valid voyage, but default to 0 as a safeguard
                console.warn(`Could not find a previous cargo quantity for voyage ${voyageIdToUse!}. Defaulting to 0.`);
            }

            const cargoLoaded = reportInput.cargoLoaded ?? 0;
            const cargoUnloaded = reportInput.cargoUnloaded ?? 0;

            // Calculate new quantity based on the correctly identified base quantity
            const newCargoQuantity = baseCargoQuantity + cargoLoaded - cargoUnloaded;

            // Fetch vessel deadweight for validation
            const vesselDeadweight = vessel.deadweight;
            if (vesselDeadweight === null || vesselDeadweight === undefined) {
                // This should ideally not happen if vessel data is complete
                console.warn(`Vessel ${vessel.id} deadweight is missing. Skipping upper cargo limit validation.`);
            } else {
                if (newCargoQuantity > vesselDeadweight) {
                    throw new Error(`Calculated cargo quantity (${newCargoQuantity} MT) exceeds vessel deadweight (${vesselDeadweight} MT).`);
                }
            }

            // Validate non-negative cargo quantity
            if (newCargoQuantity < 0) {
                throw new Error(`Calculated cargo quantity (${newCargoQuantity} MT) cannot be negative.`);
            }

            // Assign the newly calculated quantity
            calculatedCargoQuantity = newCargoQuantity;
            // Cargo status is no longer relevant for berth reports in this new logic
            calculatedCargoStatus = null;
            // --- End New Cargo Calculation Logic ---


            // --- Distance calculation adjustment for first berth report ---
            // (Keep existing logic for distance calculation)
            if (previousReport?.reportType !== 'berth') {
                 const arrivalReport = ReportModel.getLatestReportForVoyageByType(voyageIdToUse!, 'arrival');
                 if (!arrivalReport) {
                     console.warn(`No preceding arrival report found for voyage ${voyageIdToUse!} when calculating first berth report distance. Using previous report's distance.`);
                     calculatedTotalDistance = previousReport!.totalDistanceTravelled ?? 0; 
                     calculatedDistanceToGo = previousReport!.distanceToGo ?? (voyageToUse!.voyageDistance - (previousReport!.totalDistanceTravelled ?? 0));
                 } else {
                     const arrivalHarbourDistance = ('harbourDistance' in arrivalReport && typeof arrivalReport.harbourDistance === 'number') ? arrivalReport.harbourDistance : 0;
                     const arrivalTotalDistance = arrivalReport.totalDistanceTravelled ?? 0;
                     calculatedTotalDistance = arrivalTotalDistance + arrivalHarbourDistance; 
                     calculatedDistanceToGo = voyageToUse!.voyageDistance - (calculatedTotalDistance ?? 0);
                 }
            } else {
                 calculatedTotalDistance = previousReport!.totalDistanceTravelled ?? 0; 
                 calculatedDistanceToGo = voyageToUse!.voyageDistance - (calculatedTotalDistance ?? 0); 
            }
        }

        // Add initial ROBs input data to the record data if it's the first departure report
        const initialRobFieldsForRecord = (isFirstReportForVessel && reportInput.reportType === 'departure' && initialRobInputData) 
            ? { 
                initialRobLsifo: initialRobInputData.initialRobLsifo,
                initialRobLsmgo: initialRobInputData.initialRobLsmgo,
                initialRobCylOil: initialRobInputData.initialRobCylOil,
                initialRobMeOil: initialRobInputData.initialRobMeOil,
                initialRobAeOil: initialRobInputData.initialRobAeOil,
              } 
            : {};

        // Construct the base record data, voyageId will be set in transaction
        // Use Omit to exclude voyageId initially
        const reportRecordDataBase: Omit<ReportRecordData, 'voyageId'> & typeof initialRobFieldsForRecord = {
            id: reportId, vesselId: reportInput.vesselId, reportType: reportInput.reportType,
            status: 'pending', captainId: captainId, reviewerId: null, reviewDate: null, reviewComments: null,
            reportDate: reportInput.reportDate, reportTime: reportInput.reportTime, timeZone: reportInput.timeZone,
            departurePort: reportInput.reportType === 'departure' ? reportInput.departurePort : null,
            destinationPort: reportInput.reportType === 'departure' ? reportInput.destinationPort : null,
            voyageDistance: reportInput.reportType === 'departure' ? reportInput.voyageDistance : null,
            etaDate: reportInput.reportType === 'departure' ? reportInput.etaDate : null,
            etaTime: reportInput.reportType === 'departure' ? reportInput.etaTime : null,
            fwdDraft: reportInput.reportType === 'departure' ? reportInput.fwdDraft : null,
            aftDraft: reportInput.reportType === 'departure' ? reportInput.aftDraft : null,
            // Use calculatedCargoQuantity for berth, input for departure, null otherwise
            cargoQuantity: reportInput.reportType === 'berth' ? calculatedCargoQuantity : (reportInput.reportType === 'departure' ? reportInput.cargoQuantity : null),
            cargoType: reportInput.reportType === 'departure' ? reportInput.cargoType : null,
            // Set cargoStatus to null for berth, input for departure, null otherwise
            cargoStatus: reportInput.reportType === 'departure' ? reportInput.cargoStatus : null,
            faspDate: reportInput.reportType === 'departure' ? reportInput.faspDate : null,
            faspTime: reportInput.reportType === 'departure' ? reportInput.faspTime : null,
            faspLatDeg: reportInput.reportType === 'departure' ? reportInput.faspLatDeg : null,
            faspLatMin: reportInput.reportType === 'departure' ? reportInput.faspLatMin : null,
            faspLatDir: reportInput.reportType === 'departure' ? reportInput.faspLatDir : null,
            faspLonDeg: reportInput.reportType === 'departure' ? reportInput.faspLonDeg : null,
            faspLonMin: reportInput.reportType === 'departure' ? reportInput.faspLonMin : null,
            faspLonDir: reportInput.reportType === 'departure' ? reportInput.faspLonDir : null,
            faspCourse: reportInput.reportType === 'departure' ? reportInput.faspCourse : null,
            harbourDistance: (reportInput.reportType === 'departure' || reportInput.reportType === 'arrival') ? reportInput.harbourDistance : null,
            harbourTime: (reportInput.reportType === 'departure' || reportInput.reportType === 'arrival') ? reportInput.harbourTime : null,
            distanceSinceLastReport: null, // This input field is not stored directly
            windDirection: reportInput.windDirection ?? null, 
            seaDirection: reportInput.seaDirection ?? null, 
            swellDirection: reportInput.swellDirection ?? null,
            windForce: reportInput.windForce ?? null,
            seaState: reportInput.seaState ?? null,
            swellHeight: reportInput.swellHeight ?? null,
            // Set ME/AE consumption to null for Berth reports
            meConsumptionLsifo: reportInput.reportType === 'berth' ? null : (reportInput.meConsumptionLsifo ?? null),
            meConsumptionLsmgo: reportInput.reportType === 'berth' ? null : (reportInput.meConsumptionLsmgo ?? null),
            meConsumptionCylOil: reportInput.reportType === 'berth' ? null : (reportInput.meConsumptionCylOil ?? null),
            meConsumptionMeOil: reportInput.reportType === 'berth' ? null : (reportInput.meConsumptionMeOil ?? null),
            meConsumptionAeOil: reportInput.reportType === 'berth' ? null : (reportInput.meConsumptionAeOil ?? null),
            boilerConsumptionLsifo: reportInput.boilerConsumptionLsifo ?? null, // Keep Boiler/Aux consumption as is for now
            boilerConsumptionLsmgo: reportInput.boilerConsumptionLsmgo ?? null,
            auxConsumptionLsifo: reportInput.auxConsumptionLsifo ?? null,
            auxConsumptionLsmgo: reportInput.auxConsumptionLsmgo ?? null,
            supplyLsifo: reportInput.supplyLsifo ?? null,
            supplyLsmgo: reportInput.supplyLsmgo ?? null,
            supplyCylOil: reportInput.supplyCylOil ?? null,
            supplyMeOil: reportInput.supplyMeOil ?? null,
            supplyAeOil: reportInput.supplyAeOil ?? null,
            // Set ME Params to null for Berth reports
            meFoPressure: reportInput.reportType === 'berth' ? null : (reportInput.meFoPressure ?? null),
            meLubOilPressure: reportInput.reportType === 'berth' ? null : (reportInput.meLubOilPressure ?? null),
            meFwInletTemp: reportInput.reportType === 'berth' ? null : (reportInput.meFwInletTemp ?? null),
            meLoInletTemp: reportInput.reportType === 'berth' ? null : (reportInput.meLoInletTemp ?? null),
            meScavengeAirTemp: reportInput.reportType === 'berth' ? null : (reportInput.meScavengeAirTemp ?? null),
            meTcRpm1: reportInput.reportType === 'berth' ? null : (reportInput.meTcRpm1 ?? null),
            meTcRpm2: reportInput.reportType === 'berth' ? null : (reportInput.meTcRpm2 ?? null),
            meTcExhaustTempIn: reportInput.reportType === 'berth' ? null : (reportInput.meTcExhaustTempIn ?? null),
            meTcExhaustTempOut: reportInput.reportType === 'berth' ? null : (reportInput.meTcExhaustTempOut ?? null),
            meThrustBearingTemp: reportInput.reportType === 'berth' ? null : (reportInput.meThrustBearingTemp ?? null),
            meDailyRunHours: reportInput.reportType === 'berth' ? null : (reportInput.meDailyRunHours ?? null),
            mePresentRpm: reportInput.reportType === 'berth' ? null : (reportInput.mePresentRpm ?? null),
            meCurrentSpeed: reportInput.reportType === 'berth' ? null : (reportInput.meCurrentSpeed ?? null),
            // Calculated consumptions should reflect the input (which might be null for ME/AE in Berth)
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
            totalDistanceTravelled: calculatedTotalDistance,
            distanceToGo: calculatedDistanceToGo,
            // PassageState is only for 'noon' reports
            passageState: reportInput.reportType === 'noon' ? (reportInput.passageState || null) : null,
            // Noon fields for 'noon' and 'arrival_anchor_noon'
            noonDate: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonDate : null,
            noonTime: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonTime : null,
            noonLatDeg: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLatDeg : null,
            noonLatMin: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLatMin : null,
            noonLatDir: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLatDir : null,
            noonLonDeg: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLonDeg : null,
            noonLonMin: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLonMin : null,
            noonLonDir: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonLonDir : null,
            noonCourse: (reportInput.reportType === 'noon' || reportInput.reportType === 'arrival_anchor_noon') ? reportInput.noonCourse : null,
            // SOSP/ROSP fields are only for 'noon' reports with specific passageState
            sospDate: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospDate : null,
            sospTime: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospTime : null,
            sospLatDeg: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLatDeg : null,
            sospLatMin: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLatMin : null,
            sospLatDir: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLatDir : null,
            sospLonDeg: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLonDeg : null,
            sospLonMin: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLonMin : null,
            sospLonDir: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospLonDir : null,
            sospCourse: reportInput.reportType === 'noon' && reportInput.passageState === 'SOSP' ? reportInput.sospCourse : null,
            rospDate: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospDate : null,
            rospTime: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospTime : null,
            rospLatDeg: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLatDeg : null,
            rospLatMin: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLatMin : null,
            rospLatDir: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLatDir : null,
            rospLonDeg: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLonDeg : null,
            rospLonMin: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLonMin : null,
            rospLonDir: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospLonDir : null,
            rospCourse: reportInput.reportType === 'noon' && reportInput.passageState === 'ROSP' ? reportInput.rospCourse : null,
            // EOSP fields are only for 'arrival' reports
            eospDate: reportInput.reportType === 'arrival' ? reportInput.eospDate : null,
            eospTime: reportInput.reportType === 'arrival' ? reportInput.eospTime : null,
            eospLatDeg: reportInput.reportType === 'arrival' ? reportInput.eospLatDeg : null,
            eospLatMin: reportInput.reportType === 'arrival' ? reportInput.eospLatMin : null,
            eospLatDir: reportInput.reportType === 'arrival' ? reportInput.eospLatDir : null,
            eospLonDeg: reportInput.reportType === 'arrival' ? reportInput.eospLonDeg : null,
            eospLonMin: reportInput.reportType === 'arrival' ? reportInput.eospLonMin : null,
            eospLonDir: reportInput.reportType === 'arrival' ? reportInput.eospLonDir : null,
            eospCourse: reportInput.reportType === 'arrival' ? reportInput.eospCourse : null,
            estimatedBerthingDate: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingDate : null,
            estimatedBerthingTime: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingTime : null,
            // Berth fields are only for 'berth' reports
             berthDate: reportInput.reportType === 'berth' ? reportInput.berthDate : null,
             berthTime: reportInput.reportType === 'berth' ? reportInput.berthTime : null,
             berthLatDeg: reportInput.reportType === 'berth' ? reportInput.berthLatDeg : null,
             berthLatMin: reportInput.reportType === 'berth' ? reportInput.berthLatMin : null,
             berthLatDir: reportInput.reportType === 'berth' ? reportInput.berthLatDir : null,
             berthLonDeg: reportInput.reportType === 'berth' ? reportInput.berthLonDeg : null,
             berthLonMin: reportInput.reportType === 'berth' ? reportInput.berthLonMin : null,
             berthLonDir: reportInput.reportType === 'berth' ? reportInput.berthLonDir : null,
             cargoLoaded: reportInput.reportType === 'berth' ? (reportInput.cargoLoaded ?? null) : null,
             cargoUnloaded: reportInput.reportType === 'berth' ? (reportInput.cargoUnloaded ?? null) : null,
             cargoOpsStartDate: reportInput.reportType === 'berth' ? reportInput.cargoOpsStartDate : null,
             cargoOpsStartTime: reportInput.reportType === 'berth' ? reportInput.cargoOpsStartTime : null,
             cargoOpsEndDate: reportInput.reportType === 'berth' ? reportInput.cargoOpsEndDate : null,
             cargoOpsEndTime: reportInput.reportType === 'berth' ? reportInput.cargoOpsEndTime : null,
             berthNumber: reportInput.reportType === 'berth' ? reportInput.berthNumber : null,
             // Add calculated performance metrics
             sailingTimeVoyage: calculatedSailingTimeVoyage,
             avgSpeedVoyage: calculatedAvgSpeedVoyage,
             ...initialRobFieldsForRecord 
        };

        // --- 7. Execute Transaction ---
        const transaction = db.transaction(() => {
            let finalVoyageId: string;

            // Determine voyageId for the report record
            // For departure, it will be null initially. For others, use the active voyage ID.
            const voyageIdForRecord = (reportInput.reportType === 'departure') ? null : voyageIdToUse!;
            
            // Update reportRecordData with the voyageId (or null) before saving
            // Ensure the type of reportRecordDataBase allows voyageId to be null
            // The ReportRecordData type in report.model.ts was updated to allow null
            const fullReportRecordData = { ...reportRecordDataBase, voyageId: voyageIdForRecord };

            // Insert the report record
            ReportModel._createReportRecord(fullReportRecordData); 

            // Insert machinery data - Skip Engine Units for Berth reports
            if (reportInput.reportType !== 'berth' && reportInput.engineUnits?.length) { // Insert units only if not Berth
                if (!ReportEngineUnitModel.createMany(reportId, reportInput.engineUnits)) {
                    throw new Error("Failed to create engine units");
                }
            }
            if (reportInput.auxEngines?.length) { // Insert aux engines (still relevant for Berth)
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
        // Allow voyageId to be null for pending departure reports
        if (!reportBase.vesselId || !reportBase.captainId) { 
             throw new Error(`Report ${id} is missing essential IDs (vesselId, captainId).`);
        }
        // If voyageId is null, we might need to skip fetching voyage-related data below
        const hasVoyageId = reportBase.voyageId !== null && reportBase.voyageId !== undefined;

        // 2. Fetch related data in parallel (potentially)
        const vesselPromise = VesselModel.findById(reportBase.vesselId);
        const captainPromise = UserModel.findById(reportBase.captainId);
        // Conditionally fetch departure report only if voyageId exists
        const departureReportPromise = hasVoyageId 
            ? ReportModel.getFirstReportForVoyage(reportBase.voyageId!) // Use non-null assertion as hasVoyageId is true
            : Promise.resolve(null); 
        const engineUnitsPromise = ReportEngineUnitModel.findByReportId(id);
        const auxEnginesPromise = ReportAuxEngineModel.findByReportId(id);

        // 3. Await all promises
        const [vessel, captain, departureReport, engineUnits, auxEngines] = await Promise.all([
            vesselPromise,
            captainPromise,
            departureReportPromise, // This promise now resolves to null if no voyageId
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
            // Safely access cargo details, prioritizing the fetched departure report (if available)
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

    // Define InitialRobData interface locally if not imported
    // interface InitialRobData {
    //   initialRobLsifo?: number | null;
    //   initialRobLsmgo?: number | null;
    //   initialRobCylOil?: number | null;
    //   initialRobMeOil?: number | null;
    //   initialRobAeOil?: number | null;
    // }

    async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Promise<FullReportViewDTO> {
        
        const reviewTransaction = db.transaction(() => {
            // 1. Fetch the report being reviewed *within the transaction*
            const reportToReview = ReportModel.findById(id); 
            if (!reportToReview) {
                throw new Error(`Report with ID ${id} not found.`);
            }
            // 2. Check current status *within the transaction*
            if (reportToReview.status !== 'pending') {
                throw new Error(`Report ${id} has already been reviewed (status: ${reportToReview.status}).`);
            }

            // 3. Check if approving the first-ever departure report
            let robUpdateSuccess = true; // Assume success unless update is needed and fails
            if (reviewData.status === 'approved' && reportToReview.reportType === 'departure') {
                const vessel = VesselModel.findById(reportToReview.vesselId as string);
                if (!vessel) {
                    throw new Error(`Associated vessel ${reportToReview.vesselId} not found for report ${id}.`);
                }
                // Check if vessel's initial ROBs are still null
                if (vessel.initialRobLsifo === null) { 
                    console.log(`Approving the first departure report (${id}) for vessel ${vessel.id}. Updating initial ROBs.`);
                    
                    // Extract initial ROBs from the report data
                    // Extract initial ROBs from the report data fetched from the DB
                    // ReportModel.findById now selects these new columns
                    const initialRobData = {
                        initialRobLsifo: reportToReview.initialRobLsifo, 
                        initialRobLsmgo: reportToReview.initialRobLsmgo,
                        initialRobCylOil: reportToReview.initialRobCylOil,
                        initialRobMeOil: reportToReview.initialRobMeOil,
                        initialRobAeOil: reportToReview.initialRobAeOil,
                    };
                    // Filter out any null/undefined values
                    const validInitialRobData = Object.fromEntries(
                         Object.entries(initialRobData).filter(([_, v]) => v !== null && v !== undefined)
                    );

                    if (Object.keys(validInitialRobData).length > 0) {
                         robUpdateSuccess = VesselModel.updateInitialRob(vessel.id, validInitialRobData);
                         if (!robUpdateSuccess) {
                             // Error will be thrown after transaction attempt
                             console.error(`Failed to update initial ROB for vessel ${vessel.id} while approving report ${id}.`);
                         }
                    } else {
                         console.warn(`First departure report ${id} approved, but no initial ROB data found in the report record to update vessel ${vessel.id}.`);
                    }
                }
            }

            // --- NEW: Voyage Creation/Completion/Linking Logic on Departure Approval ---
            let newVoyageId: string | null = null; // To store the ID if a new voyage is created
            if (reviewData.status === 'approved' && reportToReview.reportType === 'departure') {
                console.log(`Approving departure report ${id}. Handling voyage logic...`);
                const vesselId = reportToReview.vesselId as string;

                // 1. Check and complete previous voyage
                // Use the new model function to find the report right before this one
                const actualPreviousReport = ReportModel.findPreviousReport(id, vesselId); 
                if (actualPreviousReport && (actualPreviousReport.reportType === 'arrival' || actualPreviousReport.reportType === 'berth')) {
                    // Ensure the previous report is linked to a voyage before trying to complete it
                    if (actualPreviousReport.voyageId) { 
                        VoyageModel.completeVoyage(actualPreviousReport.voyageId);
                        console.log(`Completed previous voyage ${actualPreviousReport.voyageId} during approval of report ${id}`);
                    } else {
                        // This case should ideally not happen if logic is correct, but log a warning
                        console.warn(`Previous report ${actualPreviousReport.id} was ${actualPreviousReport.reportType} but had no voyageId to complete.`);
                    }
                } else {
                    // Log cases where no completion happens: either no previous report, or it wasn't arrival/berth
                    console.log(`No previous arrival/berth report found for vessel ${vesselId} before report ${id}, or previous report had no voyageId. No voyage marked as completed.`);
                }

                // 2. Create the new voyage
                // Ensure reportToReview has the necessary fields (might need casting or fetching full report if findById returns Partial)
                // Let's assume findById returns enough data for now, but fetching full might be safer
                const departureData = reportToReview as DepartureSpecificData; 
                if (!departureData.departurePort || !departureData.destinationPort || departureData.voyageDistance === null || departureData.voyageDistance === undefined || !departureData.reportDate) {
                     throw new Error(`Cannot create voyage: Missing required data (ports, distance, date) on departure report ${id}.`);
                }
                const voyageData = {
                    vesselId: vesselId,
                    departurePort: departureData.departurePort,
                    destinationPort: departureData.destinationPort,
                    voyageDistance: departureData.voyageDistance,
                    startDate: departureData.reportDate // Use reportDate as voyage start date
                };
                const newVoyage = VoyageModel.create(voyageData);
                newVoyageId = newVoyage.id; // Store the new ID
                console.log(`Created new voyage ${newVoyageId} during approval of report ${id}`);

                // 3. Link the report to the new voyage
                const linkSuccess = ReportModel.updateVoyageId(id, newVoyageId); // Use the new model function
                if (!linkSuccess) {
                    // Throw error to rollback transaction
                    throw new Error(`Failed to link report ${id} to new voyage ${newVoyageId}.`);
                }
                
                // 4. Vessel ROB update logic (already exists, keep it here)
                // This logic should remain within the "if (approved && departure)" block
                // Ensure 'vessel' variable is available or re-fetch if necessary
                // Re-fetch vessel inside transaction to ensure consistency
                 const vesselForRobUpdate = VesselModel.findById(vesselId); 
                 if (!vesselForRobUpdate) {
                     // This should ideally not happen if the report exists, but good practice
                     throw new Error(`Associated vessel ${vesselId} not found for report ${id} during ROB update check.`);
                 }
                 // Check if vessel's initial ROBs are still null (means this is the first *approved* departure)
                 if (vesselForRobUpdate.initialRobLsifo === null) { 
                     console.log(`Updating initial ROBs for vessel ${vesselId} as part of first departure approval (${id}).`);
                     // Extract initial ROBs from the report data being reviewed
                     const initialRobData = {
                         initialRobLsifo: reportToReview.initialRobLsifo, 
                         initialRobLsmgo: reportToReview.initialRobLsmgo,
                         initialRobCylOil: reportToReview.initialRobCylOil,
                         initialRobMeOil: reportToReview.initialRobMeOil,
                         initialRobAeOil: reportToReview.initialRobAeOil,
                     };
                     // Filter out any null/undefined values before updating
                     const validInitialRobData = Object.fromEntries(
                          Object.entries(initialRobData).filter(([_, v]) => v !== null && v !== undefined)
                     );

                     if (Object.keys(validInitialRobData).length > 0) {
                          robUpdateSuccess = VesselModel.updateInitialRob(vesselId, validInitialRobData);
                          if (!robUpdateSuccess) {
                              // Error will be thrown later when checking flags
                              console.error(`Failed to update initial ROB for vessel ${vesselId} while approving report ${id}.`);
                          }
                     } else {
                          // This might happen if the first departure report somehow didn't have initial ROBs saved
                          console.warn(`First departure report ${id} approved, but no initial ROB data found in the report record to update vessel ${vesselId}.`);
                     }
                 }
            }
            // --- END NEW Logic ---


            // 4. Update the report status itself
            const statusUpdateSuccess = ReportModel.reviewReport(id, reviewData, reviewerId);

            // 5. Check results and throw if necessary to rollback transaction
            if (!robUpdateSuccess) {
                 throw new Error(`Failed to update initial ROB for vessel ${reportToReview.vesselId}.`);
            }
             if (!statusUpdateSuccess) {
                 // This case should ideally be covered by the initial status check, but as a safeguard:
                 throw new Error(`Failed to update report status for ${id}.`);
             }

        }); // End of transaction definition

        // Execute the transaction
        try {
            reviewTransaction();
            // If transaction succeeded, fetch and return the updated report view
            return this.getReportById(id);
        } catch (error) {
            console.error(`Report review transaction failed for report ${id}:`, error);
            // Re-throw the error to be handled by the controller
            throw error; 
        }
    },

    // Updated return type to reflect joined names from the model
    async getPendingReports(vesselId?: string): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
        const reportsWithNames = ReportModel.getPendingReports(vesselId);
        // The model now returns the names, so just return the result.
        // No need for the console warning anymore regarding base data only for this specific function.
        return reportsWithNames; 
    },

    // _validateReportInput is deprecated as validation is now inline and requires previous state
    // _validateReportInput(reportInput: CreateReportDTO): void {
    //     // Use the imported validator function
    //     validateReportInput(reportInput); 
    // }

    async getReportsByCaptainId(captainId: string): Promise<Partial<Report>[]> {
        // Fetch reports using the new model function
        const reports = ReportModel.findByCaptainId(captainId);
        // For now, return the partial data. If full data (like machinery) is needed later,
        // we would need to iterate and fetch related data similar to getReportById.
        console.warn("getReportsByCaptainId returns base data only; related machinery not fetched.");
        return reports;
    },

    // Get all reports (for admin/office history view)
    // Updated return type to reflect joined names from the model
    async getAllReports(vesselId?: string): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
        // TODO: Add pagination/filtering parameters later
        const reportsWithNames = ReportModel.findAll(vesselId); 
        // No longer need the warning as the model now fetches names
        return reportsWithNames;
    },
};
