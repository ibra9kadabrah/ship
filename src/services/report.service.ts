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
// Includes the new optional initial ROB fields
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
    initialRobLsifo?: number | null; // Added for storing input on first departure
    initialRobLsmgo?: number | null;
    initialRobCylOil?: number | null;
    initialRobMeOil?: number | null;
    initialRobAeOil?: number | null;
    meFoPressure?: number | null; meLubOilPressure?: number | null; meFwInletTemp?: number | null; meLoInletTemp?: number | null; meScavengeAirTemp?: number | null;
    meTcRpm1?: number | null; meTcRpm2?: number | null; meTcExhaustTempIn?: number | null; meTcExhaustTempOut?: number | null; meThrustBearingTemp?: number | null; meDailyRunHours?: number | null;
    passageState?: PassageState | null;
    noonDate?: string | null; noonTime?: string | null; noonLatitude?: number | null; noonLongitude?: number | null;
    sospDate?: string | null; sospTime?: string | null; sospLatitude?: number | null; sospLongitude?: number | null;
    rospDate?: string | null; rospTime?: string | null; rospLatitude?: number | null; rospLongitude?: number | null;
    eospDate?: string | null; eospTime?: string | null; eospLatitude?: number | null; eospLongitude?: number | null; eospCourse?: number | null;
    estimatedBerthingDate?: string | null; estimatedBerthingTime?: string | null;
    berthDate?: string | null; berthTime?: string | null; berthLatitude?: number | null; berthLongitude?: number | null;
    cargoLoaded?: number | null; cargoUnloaded?: number | null; 
    cargoOpsStartDate?: string | null; cargoOpsStartTime?: string | null; cargoOpsEndDate?: string | null; cargoOpsEndTime?: string | null;
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

        // Pass the correct previous report context to the validator
        // For departure, previousReport is latest for vessel (can be null)
        // For others, previousReport is latest for the active voyage (should exist unless first noon)
        validateReportInput(
            reportInput, 
            vessel, // Pass the fetched vessel object
            previousReport, 
            initialCargoStatusForValidation 
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

        // --- 5. Perform Calculations using Modules ---
        const consumptionInput: BunkerConsumptionInput = reportInput; 
        const supplyInput: BunkerSupplyInput = reportInput; 
        const totalConsumptions = calculateTotalConsumptions(consumptionInput);
        const currentRobs = calculateCurrentRobs(previousRob, totalConsumptions, supplyInput);

        // Determine voyage distance for calculation (use input if new departure, else from voyageToUse)
        const distanceCalcVoyageDistance = voyageToUse?.voyageDistance ?? (reportInput.reportType === 'departure' ? reportInput.voyageDistance : 0);

        const distanceInput: DistanceCalculationInput = {
            reportType: reportInput.reportType,
            harbourDistance: reportInput.reportType === 'departure' ? reportInput.harbourDistance : undefined, 
            distanceSinceLastReport: reportInput.reportType !== 'berth' && 'distanceSinceLastReport' in reportInput ? 
                reportInput.distanceSinceLastReport : undefined, 
            previousReportData: previousReport,
            voyageDistance: distanceCalcVoyageDistance
        };
        const distances = calculateDistances(distanceInput);

        // --- 6. Prepare Data for Persistence ---
        let calculatedCargoQuantity: number | null = null;
        let calculatedCargoStatus: CargoStatus | null = null;
        let calculatedTotalDistance: number | null = distances.totalDistanceTravelled ?? null; 
        let calculatedDistanceToGo: number | null = distances.distanceToGo ?? null; 

        if (reportInput.reportType === 'berth') {
            const departureReport = ReportModel.getFirstReportForVoyage(voyageIdToUse!);
            if (!departureReport || departureReport.reportType !== 'departure') {
                 throw new Error(`Cannot process berth report without a valid departure report for voyage ${voyageIdToUse!}`);
            }
            const initialCargoStatus = initialCargoStatusForValidation; 
            const initialCargoQuantity = departureReport.cargoQuantity ?? 0;
            const previousCargoQuantityValue = (previousReport && 'cargoQuantity' in previousReport && previousReport.cargoQuantity !== null) 
                ? previousReport.cargoQuantity 
                : initialCargoQuantity; 
            const baseQuantity = previousCargoQuantityValue ?? 0; 

            if (initialCargoStatus === 'Loaded') {
                calculatedCargoQuantity = baseQuantity - (reportInput.cargoUnloaded ?? 0);
            } else if (initialCargoStatus === 'Empty') {
                calculatedCargoQuantity = baseQuantity + (reportInput.cargoLoaded ?? 0);
            } else {
                 calculatedCargoQuantity = baseQuantity; 
            }
            calculatedCargoStatus = initialCargoStatus ?? null; 

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
            cargoQuantity: reportInput.reportType === 'berth' ? calculatedCargoQuantity : (reportInput.reportType === 'departure' ? reportInput.cargoQuantity : null),
            cargoType: reportInput.reportType === 'departure' ? reportInput.cargoType : null, 
            cargoStatus: reportInput.reportType === 'berth' ? calculatedCargoStatus : (reportInput.reportType === 'departure' ? reportInput.cargoStatus : null),
            faspDate: reportInput.reportType === 'departure' ? reportInput.faspDate : null,
            faspTime: reportInput.reportType === 'departure' ? reportInput.faspTime : null,
            faspLatitude: reportInput.reportType === 'departure' ? reportInput.faspLatitude : null,
            faspLongitude: reportInput.reportType === 'departure' ? reportInput.faspLongitude : null,
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
            eospDate: reportInput.reportType === 'arrival' ? reportInput.eospDate : null,
            eospTime: reportInput.reportType === 'arrival' ? reportInput.eospTime : null,
            eospLatitude: reportInput.reportType === 'arrival' ? reportInput.eospLatitude : null,
            eospLongitude: reportInput.reportType === 'arrival' ? reportInput.eospLongitude : null,
            eospCourse: reportInput.reportType === 'arrival' ? reportInput.eospCourse : null,
            estimatedBerthingDate: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingDate : null,
            estimatedBerthingTime: reportInput.reportType === 'arrival' ? reportInput.estimatedBerthingTime : null,
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

            // Insert machinery data
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
    async getPendingReports(): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
        const reportsWithNames = ReportModel.getPendingReports();
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
    async getAllReports(): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
        // TODO: Add pagination/filtering parameters later
        const reportsWithNames = ReportModel.findAll(); 
        // No longer need the warning as the model now fetches names
        return reportsWithNames;
    },
};
