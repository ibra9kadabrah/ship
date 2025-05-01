// src/services/report_validator.ts

import {
    CreateReportDTO,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    PassageState, // Import PassageState
    CargoStatus, // Import CargoStatus
    Report // Import Report type
} from '../types/report';
import { Vessel } from '../types/vessel'; // Import Vessel type

/**
 * Validates the input data for a report based on its type and the previous report's state.
 * Throws an error if validation fails.
 * @param reportInput The report data DTO.
 * @param previousReport The previous report object (partial) for context (e.g., passage state).
 * @param initialCargoStatus The cargo status from the voyage's departure report.
 * @param vessel The vessel object, needed to check if initial ROBs are set.
 */
export function validateReportInput(
    reportInput: CreateReportDTO, 
    vessel: Vessel, // Add vessel parameter
    previousReport?: Partial<Report> | null, 
    initialCargoStatus: CargoStatus | null = null // Add default null
): void {

    // --- Report Sequence Validation ---
    if (previousReport) { // Only check sequence if there's a previous report in the voyage
        const previousType = previousReport.reportType;
        const currentType = reportInput.reportType;

        switch (previousType) {
            case 'departure':
                if (currentType !== 'noon' && currentType !== 'arrival') {
                    throw new Error(`Invalid report sequence: After 'departure', only 'noon' or 'arrival' is allowed, not '${currentType}'.`);
                }
                break;
            case 'noon':
                if (currentType !== 'noon' && currentType !== 'arrival') {
                    throw new Error(`Invalid report sequence: After 'noon', only 'noon' or 'arrival' is allowed, not '${currentType}'.`);
                }
                break;
            case 'arrival':
                // After arrival, only Berth or a *new* Departure is allowed.
                // The service layer handles the new voyage logic for departure.
                if (currentType !== 'berth' && currentType !== 'departure') { 
                    throw new Error(`Invalid report sequence: After 'arrival', only 'berth' or 'departure' is allowed, not '${currentType}'.`);
                }
                break;
            case 'berth':
                 // After berth, only another Berth or a *new* Departure is allowed.
                if (currentType !== 'berth' && currentType !== 'departure') {
                    throw new Error(`Invalid report sequence: After 'berth', only 'berth' or 'departure' is allowed, not '${currentType}'.`);
                }
                break;
        }
    } else { 
        // No previous report for this voyage exists.
        // The only valid report type here is 'departure'.
        // Note: The service layer separately handles the "first report ever for vessel must be departure" rule.
        if (reportInput.reportType !== 'departure') {
             throw new Error(`Invalid report: Cannot submit '${reportInput.reportType}' as the first report of a voyage. Must be 'departure'.`);
        }
    }
    // --- End Report Sequence Validation ---


    // --- Specific Field Validations ---
    switch (reportInput.reportType) {
        case 'departure':
            // Pass the vessel object to the specific validator
            validateDepartureReport(reportInput, vessel); 
            break;
        case 'noon':
            validateNoonReport(reportInput, previousReport?.passageState as PassageState | null); // Cast to PassageState
            break;
        case 'arrival':
            validateArrivalReport(reportInput);
            break;
        case 'berth':
            validateBerthReport(reportInput, initialCargoStatus); // Pass initial cargo status
            break;
        default:
            // This should ideally be caught by the type system, but good practice
            throw new Error(`Invalid report type provided: ${(reportInput as any)?.reportType}`);
    }

    // REMOVED: Common machinery validation call from here. It will be called within specific validators.
    // validateMachineryInput(reportInput); 
}

// --- Helper Validation Functions ---

// Note: This function now needs the vessel object to check if initial ROBs are already set.
// However, validateReportInput calls this *before* passing the vessel object down.
// We need to adjust the main validateReportInput function to pass the vessel object here.
// For now, let's add the logic assuming 'vessel' is available.
// We will fix the call signature in the next step.
function validateDepartureReport(reportInput: DepartureSpecificData, vessel: Vessel): void { 

    // Check if initial ROBs are provided when they shouldn't be
    if (vessel.initialRobLsifo !== null) { // Vessel initial ROBs are already set
        const hasInitialRobInput = (
            reportInput.initialRobLsifo !== undefined && reportInput.initialRobLsifo !== null ||
            reportInput.initialRobLsmgo !== undefined && reportInput.initialRobLsmgo !== null ||
            reportInput.initialRobCylOil !== undefined && reportInput.initialRobCylOil !== null ||
            reportInput.initialRobMeOil !== undefined && reportInput.initialRobMeOil !== null ||
            reportInput.initialRobAeOil !== undefined && reportInput.initialRobAeOil !== null
        );
        if (hasInitialRobInput) {
            throw new Error("Initial ROB fields cannot be provided for subsequent departure reports after the first one has been approved.");
        }
    }

    const requiredFields: Array<keyof DepartureSpecificData> = [
        // BaseReportData fields (already mandatory in type)
        'vesselId', 'reportDate', 'reportTime', 'timeZone', 'windDirection', 'seaDirection', 
        'swellDirection', 'windForce', 'seaState', 'swellHeight', 'meConsumptionLsifo', 
        'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 
        'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 
        'supplyAeOil', 'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 
        'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 
        'meThrustBearingTemp', 'meDailyRunHours',
        // DepartureSpecificData fields
        'departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime',
        'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
        'faspDate', 'faspTime', 'faspLatitude', 'faspLongitude', 'faspCourse',
        'harbourDistance', 'harbourTime', 'distanceSinceLastReport',
    ];

    for (const field of requiredFields) {
        const value = reportInput[field];
        if (value === undefined || value === null || value === '') {
            // Allow 0 for numeric fields
            if (typeof value === 'number' && value === 0) {
                continue; 
            }
            throw new Error(`Missing mandatory field for departure report: ${field}`);
        }
    }
    // Add specific range checks if needed (e.g., windForce 0-12)
    if (reportInput.windForce < 0 || reportInput.windForce > 12) {
         throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
    }
     if (reportInput.seaState < 0 || reportInput.seaState > 9) {
         throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
    }
     if (reportInput.swellHeight < 0 || reportInput.swellHeight > 9) { // Assuming 0-9 meter range
         throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
    }
    // Validate Machinery for Departure
    validateMachineryInput(reportInput);
}

// --- Specific Report Validators ---

function validateNoonReport(reportInput: NoonSpecificData, previousPassageState?: PassageState | null): void {
    // 1. Validate mandatory Noon-specific fields
    if (reportInput.distanceSinceLastReport === undefined || reportInput.distanceSinceLastReport === null || reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Missing or invalid mandatory field for noon report: distanceSinceLastReport (must be >= 0).`);
    }
    if (!reportInput.passageState || !['NOON', 'SOSP', 'ROSP'].includes(reportInput.passageState)) {
        throw new Error(`Missing or invalid mandatory field for noon report: passageState.`);
    }

    // 2. Validate State Transition Logic
    if (previousPassageState === 'SOSP') {
        if (reportInput.passageState !== 'SOSP' && reportInput.passageState !== 'ROSP') {
            throw new Error(`Invalid passageState transition: Previous state was SOSP, current state must be SOSP or ROSP, but got ${reportInput.passageState}.`);
        }
    } else { // Previous state was NOON, ROSP, or this is the first noon report (previousPassageState is null/undefined)
        if (reportInput.passageState !== 'NOON' && reportInput.passageState !== 'SOSP') {
            throw new Error(`Invalid passageState transition: Previous state was ${previousPassageState || 'None/Departure'}, current state must be NOON or SOSP, but got ${reportInput.passageState}.`);
        }
    }

    // 3. Validate Conditional Fields based on current passageState
    switch (reportInput.passageState) {
        case 'NOON':
            if (!reportInput.noonDate || !reportInput.noonTime || reportInput.noonLatitude === undefined || reportInput.noonLongitude === undefined) {
                throw new Error(`Missing mandatory fields for NOON passage state: noonDate, noonTime, noonLatitude, noonLongitude.`);
            }
            // Add specific format/range checks if needed (e.g., latitude -90 to 90)
            break;
        case 'SOSP':
            if (!reportInput.sospDate || !reportInput.sospTime || reportInput.sospLatitude === undefined || reportInput.sospLongitude === undefined) {
                throw new Error(`Missing mandatory fields for SOSP passage state: sospDate, sospTime, sospLatitude, sospLongitude.`);
            }
            break;
        case 'ROSP':
            if (!reportInput.rospDate || !reportInput.rospTime || reportInput.rospLatitude === undefined || reportInput.rospLongitude === undefined) {
                throw new Error(`Missing mandatory fields for ROSP passage state: rospDate, rospTime, rospLatitude, rospLongitude.`);
            }
            break;
    }

    // 4. Validate common BaseReportData fields (ranges, etc.) - Reuse checks from departure if applicable
    if (reportInput.windForce < 0 || reportInput.windForce > 12) {
         throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
    }
     if (reportInput.seaState < 0 || reportInput.seaState > 9) {
         throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
    }
     if (reportInput.swellHeight < 0 || reportInput.swellHeight > 9) { // Assuming 0-9 meter range
         throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
    }
    // Add more checks for other BaseReportData fields if necessary

    // 5. Validate Machinery for Noon
    validateMachineryInput(reportInput);
}

function validateArrivalReport(reportInput: ArrivalSpecificData): void {
    // 1. Validate mandatory Arrival-specific fields
    const requiredFields: Array<keyof ArrivalSpecificData> = [
        // Base fields are already checked by TS/BaseReportData type
        // Arrival Specific fields:
        'eospDate', 'eospTime', 'eospLatitude', 'eospLongitude', 'eospCourse',
        'distanceSinceLastReport', 'harbourDistance', 'harbourTime',
        'estimatedBerthingDate', 'estimatedBerthingTime'
    ];

    for (const field of requiredFields) {
        const value = reportInput[field];
        if (value === undefined || value === null || value === '') {
             // Allow 0 for numeric fields like distance/course
             if (typeof value === 'number' && value === 0) {
                 continue; 
             }
            throw new Error(`Missing mandatory field for arrival report: ${field}`);
        }
    }

    // 2. Specific format/range checks
    if (reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Invalid distanceSinceLastReport: ${reportInput.distanceSinceLastReport}. Must be >= 0.`);
    }
    if (reportInput.harbourDistance < 0) {
        throw new Error(`Invalid harbourDistance: ${reportInput.harbourDistance}. Must be >= 0.`);
    }
    // Basic HH:MM check for harbourTime
    if (!/^\d{2}:\d{2}$/.test(reportInput.harbourTime)) {
        throw new Error(`Invalid harbourTime format: ${reportInput.harbourTime}. Must be HH:MM.`);
    }
    // Add lat/lon/course range checks if needed

    // 3. Validate common BaseReportData fields (ranges, etc.)
    if (reportInput.windForce < 0 || reportInput.windForce > 12) {
         throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
    }
     if (reportInput.seaState < 0 || reportInput.seaState > 9) {
         throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
    }
     if (reportInput.swellHeight < 0 || reportInput.swellHeight > 9) { 
         throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
    }
    // Add more checks for other BaseReportData fields if necessary

    // 4. Validate Machinery (assuming mandatory for Arrival)
    // Machinery validation might not apply to Berth reports, or might be optional.
    // Let's assume it's still required for now based on previous patterns.
    // If not, this call can be moved into the specific validators where needed.
    // 4. Validate Machinery for Arrival
    validateMachineryInput(reportInput);
}

function validateBerthReport(reportInput: BerthSpecificData, initialCargoStatus: CargoStatus | null): void {
    // 1. Validate mandatory Berth Navigation fields
    const navFields: Array<keyof BerthSpecificData> = ['berthDate', 'berthTime', 'berthLatitude', 'berthLongitude'];
    for (const field of navFields) {
        if (reportInput[field] === undefined || reportInput[field] === null || reportInput[field] === '') {
            throw new Error(`Missing mandatory field for berth report: ${field}`);
        }
    }
    // Add lat/lon range checks if needed

    // 2. Validate mandatory Cargo Ops Time fields
    const timeFields: Array<keyof BerthSpecificData> = ['cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime'];
     for (const field of timeFields) {
        if (!reportInput[field]) { // Check for empty string, null, undefined
            throw new Error(`Missing mandatory cargo operations time field for berth report: ${field}`);
        }
    }

    // 3. Validate Conditional Cargo Amount Input
    if (!initialCargoStatus) {
         throw new Error("Cannot validate berth report without knowing the initial cargo status from departure.");
    }
    if (initialCargoStatus === 'Loaded') {
        if (reportInput.cargoUnloaded === undefined || reportInput.cargoUnloaded === null || reportInput.cargoUnloaded < 0) {
             throw new Error(`Missing or invalid 'cargoUnloaded' field for berth report (required when initial status was 'Loaded'). Must be >= 0.`);
        }
        if (reportInput.cargoLoaded !== undefined && reportInput.cargoLoaded !== null && reportInput.cargoLoaded !== 0) {
             throw new Error(`Invalid 'cargoLoaded' field for berth report. Should not be provided or must be 0 when initial status was 'Loaded'.`);
        }
    } else if (initialCargoStatus === 'Empty') {
         if (reportInput.cargoLoaded === undefined || reportInput.cargoLoaded === null || reportInput.cargoLoaded < 0) {
             throw new Error(`Missing or invalid 'cargoLoaded' field for berth report (required when initial status was 'Empty'). Must be >= 0.`);
        }
         if (reportInput.cargoUnloaded !== undefined && reportInput.cargoUnloaded !== null && reportInput.cargoUnloaded !== 0) {
             throw new Error(`Invalid 'cargoUnloaded' field for berth report. Should not be provided or must be 0 when initial status was 'Empty'.`);
        }
    }

     // 4. Validate common BaseReportData fields (weather might be optional/irrelevant at berth?)
     // Re-evaluate which base fields are truly mandatory for a Berth report.
     // For now, keep weather checks as an example, but they might need removal/adjustment.
     if (reportInput.windForce < 0 || reportInput.windForce > 12) {
          throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
     }
      if (reportInput.seaState < 0 || reportInput.seaState > 9) {
          throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
     }
      if (reportInput.swellHeight < 0 || reportInput.swellHeight > 9) { 
          throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
     }
     // Consumption/Supply/Machinery might also be optional or have different rules at berth.
     // Assuming machinery is NOT required for Berth for now.
     // validateMachineryInput(reportInput); 
}


function validateMachineryInput(reportInput: CreateReportDTO): void {
     // Machinery Validation (Common to applicable reports like Departure, Noon, Arrival)
     const requiredUnits = [1, 2, 3, 4, 5, 6];
     const providedUnitNumbers = reportInput.engineUnits?.map(u => u.unitNumber) ?? [];
     if (!requiredUnits.every(num => providedUnitNumbers.includes(num))) {
         throw new Error("Engine unit data for units 1-6 is required.");
     }
     const requiredAux = ['DG1'];
     const providedAuxNames = reportInput.auxEngines?.map(a => a.engineName) ?? [];
     if (!requiredAux.every(name => providedAuxNames.includes(name))) {
         throw new Error("Auxiliary engine data for DG1 is required.");
     }
}
