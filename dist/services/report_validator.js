"use strict";
// src/services/report_validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCargoAgainstVesselCapacity = validateCargoAgainstVesselCapacity;
exports.validateReportInput = validateReportInput;
/**
 * Validates the input data for a report based on its type and the previous report's state.
 * Throws an error if validation fails.
 * @param reportInput The report data DTO.
 * @param previousReport The previous report object (partial) for context (e.g., passage state).
 * @param initialCargoStatus The cargo status from the voyage's departure report.
 * @param vessel The vessel object, needed to check if initial ROBs are set.
 */
// Centralized function to validate cargo against vessel capacity
function validateCargoAgainstVesselCapacity(cargoQuantity, vesselDeadweight, reportType) {
    if (cargoQuantity === undefined || cargoQuantity === null) {
        return; // Skip validation if cargoQuantity is not provided
    }
    if (vesselDeadweight === null || vesselDeadweight === undefined) {
        console.warn(`Vessel deadweight is missing for ${reportType}. Skipping cargo validation.`);
        return;
    }
    if (cargoQuantity > vesselDeadweight) {
        throw new Error(`Cargo quantity (${cargoQuantity} MT) exceeds vessel deadweight (${vesselDeadweight} MT).`);
    }
    if (cargoQuantity < 0) {
        throw new Error(`Cargo quantity (${cargoQuantity} MT) cannot be negative.`);
    }
}
function validateReportInput(reportInput, vessel, // Add vessel parameter
previousReport, // Keep previousReport optional for first departure
initialCargoStatus = null, // Add default null
previousNoonPassageState // Add previous noon state
) {
    // --- Report Sequence Validation ---
    // Skip sequence check if the current report is 'departure'.
    // The service layer handles the logic for allowing a new departure based on previous voyage state.
    if (previousReport && reportInput.reportType !== 'departure') {
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
                if (currentType !== 'berth' && currentType !== 'arrival_anchor_noon') {
                    throw new Error(`Invalid report sequence: After 'arrival', only 'berth' or 'arrival_anchor_noon' is allowed within the same voyage, not '${currentType}'.`);
                }
                break;
            case 'arrival_anchor_noon':
                if (currentType !== 'arrival_anchor_noon' && currentType !== 'berth') {
                    throw new Error(`Invalid report sequence: After 'arrival_anchor_noon', only another 'arrival_anchor_noon' or 'berth' is allowed, not '${currentType}'.`);
                }
                break;
            case 'berth':
                // After berth, only another Berth is allowed *within the same voyage*. Departure is handled by the service layer.
                if (currentType !== 'berth') {
                    throw new Error(`Invalid report sequence: After 'berth', only 'berth' is allowed within the same voyage, not '${currentType}'.`);
                }
                break;
        }
    }
    else if (!previousReport && reportInput.reportType !== 'departure') {
        // No previous report exists, and the current report is NOT departure. This is invalid.
        throw new Error(`Invalid report: Cannot submit '${reportInput.reportType}' as the first report of a voyage. Must be 'departure'.`);
    }
    // --- End Report Sequence Validation ---
    // --- Specific Field Validations ---
    switch (reportInput.reportType) {
        case 'departure':
            // Pass the vessel object to the specific validator
            validateDepartureReport(reportInput, vessel);
            break;
        case 'noon':
            // Pass the specific previous noon state to the noon validator
            validateNoonReport(reportInput, previousNoonPassageState);
            break;
        case 'arrival':
            validateArrivalReport(reportInput);
            break;
        case 'berth':
            validateBerthReport(reportInput, vessel); // Removed initialCargoStatus argument
            break;
        case 'arrival_anchor_noon':
            validateArrivalAnchorNoonReport(reportInput);
            break;
        default:
            // This should ideally be caught by the type system, but good practice
            throw new Error(`Invalid report type provided: ${reportInput?.reportType}`);
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
function validateDepartureReport(reportInput, vessel) {
    // Validate cargo against vessel capacity
    validateCargoAgainstVesselCapacity(reportInput.cargoQuantity, vessel.deadweight, reportInput.reportType);
    // Check if initial ROBs are provided when they shouldn't be
    if (vessel.initialRobLsifo !== null) { // Vessel initial ROBs are already set
        const hasInitialRobInput = (reportInput.initialRobLsifo !== undefined && reportInput.initialRobLsifo !== null ||
            reportInput.initialRobLsmgo !== undefined && reportInput.initialRobLsmgo !== null ||
            reportInput.initialRobCylOil !== undefined && reportInput.initialRobCylOil !== null ||
            reportInput.initialRobMeOil !== undefined && reportInput.initialRobMeOil !== null ||
            reportInput.initialRobAeOil !== undefined && reportInput.initialRobAeOil !== null);
        if (hasInitialRobInput) {
            throw new Error("Initial ROB fields cannot be provided for subsequent departure reports after the first one has been approved.");
        }
    }
    const requiredFields = [
        // BaseReportData fields (already mandatory in type)
        'vesselId', 'reportDate', 'reportTime', 'timeZone', 'windDirection', 'seaDirection',
        'swellDirection', 'windForce', 'seaState', 'swellHeight', 'meConsumptionLsifo',
        'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo',
        'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil',
        'supplyAeOil', 'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
        'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut',
        'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed', // Added mePresentRpm, meCurrentSpeed
        // DepartureSpecificData fields
        'departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime',
        'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
        'faspDate', 'faspTime',
        'faspLatDeg', 'faspLatMin', 'faspLatDir', // Replaced faspLatitude
        'faspLonDeg', 'faspLonMin', 'faspLonDir', // Replaced faspLongitude
        'faspCourse',
        'harbourDistance', 'harbourTime', // Removed distanceSinceLastReport
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
    // Check for presence before range validation, as they are optional in BaseReportData but required here
    if (reportInput.mePresentRpm === undefined || reportInput.mePresentRpm === null || reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid or missing mePresentRpm value: ${reportInput.mePresentRpm}. Must be provided and non-negative for Departure.`);
    }
    if (reportInput.meCurrentSpeed === undefined || reportInput.meCurrentSpeed === null || reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid or missing meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be provided and non-negative for Departure.`);
    }
    // Validate Machinery for Departure
    validateMachineryInput(reportInput);
}
// --- Specific Report Validators ---
function validateNoonReport(reportInput, previousPassageState) {
    // 1. Validate mandatory Noon-specific fields (Distance is always required)
    if (reportInput.distanceSinceLastReport === undefined || reportInput.distanceSinceLastReport === null || reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Missing or invalid mandatory field for noon report: distanceSinceLastReport (must be >= 0).`);
    }
    // Removed the mandatory check for passageState itself. It can be null now.
    // if (!reportInput.passageState || !['NOON', 'SOSP', 'ROSP'].includes(reportInput.passageState)) {
    //     throw new Error(`Missing or invalid mandatory field for noon report: passageState.`);
    // }
    // 2. Validate State Transition Logic (Handles null passageState)
    if (previousPassageState === 'SOSP') {
        // If previous was SOSP, current MUST be SOSP or ROSP (cannot be null/empty)
        if (reportInput.passageState !== 'SOSP' && reportInput.passageState !== 'ROSP') {
            throw new Error(`Invalid passageState transition: Previous state was SOSP, current state must be SOSP or ROSP, but got '${reportInput.passageState ?? 'None'}'.`);
        }
    }
    else { // Previous state was null, NOON, or ROSP
        // If previous was not SOSP, current cannot be ROSP
        if (reportInput.passageState === 'ROSP') {
            throw new Error(`Invalid passageState transition: Previous state was ${previousPassageState || 'None/Departure'}, current state cannot be ROSP.`);
        }
        // Allow null or SOSP if previous was not SOSP
    }
    // 3. Validate Conditional Fields based on current passageState
    // Always validate Noon Date/Time/Lat/Lon/Course as they are now mandatory base fields for Noon report
    if (!reportInput.noonDate || !reportInput.noonTime ||
        reportInput.noonLatDeg === undefined || reportInput.noonLatMin === undefined || !reportInput.noonLatDir ||
        reportInput.noonLonDeg === undefined || reportInput.noonLonMin === undefined || !reportInput.noonLonDir ||
        reportInput.noonCourse === undefined || reportInput.mePresentRpm === undefined || reportInput.meCurrentSpeed === undefined) { // Added mePresentRpm, meCurrentSpeed check
        throw new Error(`Missing mandatory fields for Noon report: noonDate, noonTime, noonLatitude (Deg/Min/Dir), noonLongitude (Deg/Min/Dir), noonCourse, mePresentRpm, meCurrentSpeed.`);
    }
    // Add range checks for noon lat/lon/course if needed
    // Validate SOSP/ROSP fields only if the state is selected
    if (reportInput.passageState === 'SOSP') {
        if (!reportInput.sospDate || !reportInput.sospTime ||
            reportInput.sospLatDeg === undefined || reportInput.sospLatMin === undefined || !reportInput.sospLatDir ||
            reportInput.sospLonDeg === undefined || reportInput.sospLonMin === undefined || !reportInput.sospLonDir ||
            reportInput.sospCourse === undefined) {
            throw new Error(`Missing mandatory fields for SOSP passage state: sospDate, sospTime, sospLatitude (Deg/Min/Dir), sospLongitude (Deg/Min/Dir), sospCourse.`);
        }
        // Add specific format/range checks if needed
    }
    else if (reportInput.passageState === 'ROSP') {
        if (!reportInput.rospDate || !reportInput.rospTime ||
            reportInput.rospLatDeg === undefined || reportInput.rospLatMin === undefined || !reportInput.rospLatDir ||
            reportInput.rospLonDeg === undefined || reportInput.rospLonMin === undefined || !reportInput.rospLonDir ||
            reportInput.rospCourse === undefined) {
            throw new Error(`Missing mandatory fields for ROSP passage state: rospDate, rospTime, rospLatitude (Deg/Min/Dir), rospLongitude (Deg/Min/Dir), rospCourse.`);
        }
        // Add specific format/range checks if needed
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
    if (reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid mePresentRpm value: ${reportInput.mePresentRpm}. Must be non-negative.`);
    }
    if (reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be non-negative.`);
    }
    // Add more checks for other BaseReportData fields if necessary
    // 5. Validate Machinery for Noon
    validateMachineryInput(reportInput);
}
function validateArrivalReport(reportInput) {
    // 1. Validate mandatory Arrival-specific fields
    const requiredFields = [
        // Base fields are already checked by TS/BaseReportData type
        // Add base machinery fields that are required input
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
        'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut',
        'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed', // Added mePresentRpm, meCurrentSpeed
        // Arrival Specific fields:
        'eospDate', 'eospTime',
        'eospLatDeg', 'eospLatMin', 'eospLatDir', // Replaced eospLatitude
        'eospLonDeg', 'eospLonMin', 'eospLonDir', // Replaced eospLongitude
        'eospCourse',
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
    // Check for presence before range validation, as they are optional in BaseReportData but required here
    if (reportInput.mePresentRpm === undefined || reportInput.mePresentRpm === null || reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid or missing mePresentRpm value: ${reportInput.mePresentRpm}. Must be provided and non-negative for Arrival.`);
    }
    if (reportInput.meCurrentSpeed === undefined || reportInput.meCurrentSpeed === null || reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid or missing meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be provided and non-negative for Arrival.`);
    }
    // Add more checks for other BaseReportData fields if necessary
    // 4. Validate Machinery (assuming mandatory for Arrival)
    // Machinery validation might not apply to Berth reports, or might be optional.
    // Let's assume it's still required for now based on previous patterns.
    // If not, this call can be moved into the specific validators where needed.
    // 4. Validate Machinery for Arrival
    validateMachineryInput(reportInput);
}
// Removed initialCargoStatus parameter
function validateBerthReport(reportInput, vessel) {
    // 1. Validate mandatory Berth Navigation fields (including Berth Number)
    const navFields = [
        'berthDate', 'berthTime', 'berthNumber', // Added berthNumber
        'berthLatDeg', 'berthLatMin', 'berthLatDir', // Replaced berthLatitude
        'berthLonDeg', 'berthLonMin', 'berthLonDir' // Replaced berthLongitude
    ];
    for (const field of navFields) {
        if (reportInput[field] === undefined || reportInput[field] === null || reportInput[field] === '') {
            throw new Error(`Missing mandatory field for berth report: ${field}`);
        }
    }
    // Add lat/lon range checks if needed
    // 2. Validate mandatory Cargo Ops Time fields
    const timeFields = ['cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime'];
    for (const field of timeFields) {
        if (!reportInput[field]) { // Check for empty string, null, undefined
            throw new Error(`Missing mandatory cargo operations time field for berth report: ${field}`);
        }
    }
    // 3. Validate Cargo Amount Input (Non-negative check)
    // Both fields are optional now, but if provided, must be non-negative.
    if (reportInput.cargoLoaded !== undefined && reportInput.cargoLoaded !== null && reportInput.cargoLoaded < 0) {
        throw new Error(`Invalid 'cargoLoaded' field for berth report. Must be >= 0 if provided.`);
    }
    if (reportInput.cargoUnloaded !== undefined && reportInput.cargoUnloaded !== null && reportInput.cargoUnloaded < 0) {
        throw new Error(`Invalid 'cargoUnloaded' field for berth report. Must be >= 0 if provided.`);
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
    // Consumption/Supply fields are still required by BaseReportData type, rely on TS for presence check.
    // ME Params and Engine Units are optional in BaseReportData now and not applicable to Berth.
    // Removed call to validateMachineryInput for Berth reports.
}
function validateMachineryInput(reportInput) {
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
function validateArrivalAnchorNoonReport(reportInput) {
    // 1. Validate mandatory fields for Arrival Anchor Noon report
    const requiredFields = [
        'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
        'noonDate', 'noonTime',
        'noonLatDeg', 'noonLatMin', 'noonLatDir',
        'noonLonDeg', 'noonLonMin', 'noonLonDir',
        'noonCourse', 'mePresentRpm', 'meCurrentSpeed',
        // BaseReportData fields that are mandatory
        'windDirection', 'seaDirection', 'swellDirection', 'windForce', 'seaState', 'swellHeight',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        // Optional ME fields from BaseReportData, but usually expected for a "Noon" type report
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
        'meScavengeAirTemp', 'meTcRpm1', /* meTcRpm2 is optional */ 'meTcExhaustTempIn', 'meTcExhaustTempOut',
        'meThrustBearingTemp', 'meDailyRunHours',
    ];
    for (const field of requiredFields) {
        const value = reportInput[field]; // Use type assertion
        if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
            // Allow 0 for numeric fields
            if (typeof value === 'number' && value === 0) {
                continue;
            }
            // Allow ME consumption fields to be 0 or null/undefined if vessel is stopped (handled by optionality in type)
            // This check might be redundant if the field is truly optional in the type and not in requiredFields
            // However, if it's in requiredFields but can be 0/null, this logic is fine.
            if (field.startsWith('meConsumption') && (value === null || value === undefined || Number(value) === 0)) {
                continue;
            }
            throw new Error(`Missing mandatory field for Arrival Anchor Noon report: ${field}`);
        }
    }
    // 2. Specific range checks (reuse from other validators if applicable)
    if (reportInput.windForce < 0 || reportInput.windForce > 12) {
        throw new Error(`Invalid windForce value: ${reportInput.windForce}. Must be between 0 and 12.`);
    }
    if (reportInput.seaState < 0 || reportInput.seaState > 9) {
        throw new Error(`Invalid seaState value: ${reportInput.seaState}. Must be between 0 and 9.`);
    }
    if (reportInput.swellHeight < 0 || reportInput.swellHeight > 9) {
        throw new Error(`Invalid swellHeight value: ${reportInput.swellHeight}. Must be between 0 and 9.`);
    }
    if (reportInput.distanceSinceLastReport < 0) {
        throw new Error(`Invalid distanceSinceLastReport: ${reportInput.distanceSinceLastReport}. Must be >= 0.`);
    }
    if (reportInput.noonCourse < 0 || reportInput.noonCourse > 360) {
        throw new Error(`Invalid noonCourse: ${reportInput.noonCourse}. Must be between 0 and 360.`);
    }
    if (reportInput.mePresentRpm !== undefined && reportInput.mePresentRpm !== null && reportInput.mePresentRpm < 0) {
        throw new Error(`Invalid mePresentRpm value: ${reportInput.mePresentRpm}. Must be non-negative.`);
    }
    if (reportInput.meCurrentSpeed !== undefined && reportInput.meCurrentSpeed !== null && reportInput.meCurrentSpeed < 0) {
        throw new Error(`Invalid meCurrentSpeed value: ${reportInput.meCurrentSpeed}. Must be non-negative.`);
    }
    // Add more checks for other BaseReportData fields if necessary
    // 3. Validate Machinery 
    validateMachineryInput(reportInput);
}
