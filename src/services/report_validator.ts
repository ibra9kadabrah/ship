// src/services/report_validator.ts

import {
    CreateReportDTO,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    PassageState // Import PassageState
} from '../types/report';

/**
 * Validates the input data for a report based on its type and the previous report's state.
 * Throws an error if validation fails.
 * @param reportInput The report data DTO.
 * @param previousPassageState The passageState of the previous report for this voyage.
 */
export function validateReportInput(reportInput: CreateReportDTO, previousPassageState?: PassageState | null): void {
    // Remove the warning as we implement more types
    // console.warn(`Validation logic in validateReportInput for type ${reportInput.reportType} is not fully implemented.`);

    // Example structure:
    switch (reportInput.reportType) {
        case 'departure':
            validateDepartureReport(reportInput);
            break;
        case 'noon':
            validateNoonReport(reportInput, previousPassageState); // Pass previous state
            break;
        case 'arrival':
            // validateArrivalReport(reportInput, previousPassageState); // Placeholder for future
            break;
        case 'berth':
            // validateBerthReport(reportInput);
            break;
        default:
            // This should ideally be caught by the type system, but good practice
            throw new Error(`Invalid report type provided: ${(reportInput as any)?.reportType}`);
    }

    // Common validations (e.g., machinery) can go here or within specific validators
    validateMachineryInput(reportInput); 
}

// --- Helper Validation Functions ---

function validateDepartureReport(reportInput: DepartureSpecificData): void {
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

    // 5. Validate Machinery (assuming mandatory for Noon)
    validateMachineryInput(reportInput);
}

// TODO: Implement validateArrivalReport, validateBerthReport

function validateMachineryInput(reportInput: CreateReportDTO): void {
     // Machinery Validation (Common to applicable reports like Departure, Noon)
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
