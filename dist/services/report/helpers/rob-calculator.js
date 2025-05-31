"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobCalculator = void 0;
const bunker_calculator_1 = require("../../bunker_calculator"); // Adjust path as needed
// Helper to check if all required Initial ROBs are present in DepartureSpecificData
function hasAllDepartureInitialRobs(data) {
    return data.initialRobLsifo !== undefined && data.initialRobLsifo !== null &&
        data.initialRobLsmgo !== undefined && data.initialRobLsmgo !== null &&
        data.initialRobCylOil !== undefined && data.initialRobCylOil !== null &&
        data.initialRobMeOil !== undefined && data.initialRobMeOil !== null &&
        data.initialRobAeOil !== undefined && data.initialRobAeOil !== null;
}
class RobCalculator {
    /**
     * Determines the ROBs from the previous report or vessel's initial state.
     */
    static getPreviousRobs(previousReport, vessel, previousVoyageState, currentReportType) {
        const previousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
        if (currentReportType === 'departure') {
            // For a new departure:
            // 1. If there's a completed previous voyage, use its final ROBs.
            // 2. Else (no previous completed voyage, could be first voyage for vessel or after a non-standard sequence),
            //    use the vessel's stored initial ROBs (which would be set by the very first departure).
            if (previousVoyageState) {
                previousRob.lsifo = previousVoyageState.finalRobLsifo ?? 0;
                previousRob.lsmgo = previousVoyageState.finalRobLsmgo ?? 0;
                previousRob.cylOil = previousVoyageState.finalRobCylOil ?? 0;
                previousRob.meOil = previousVoyageState.finalRobMeOil ?? 0;
                previousRob.aeOil = previousVoyageState.finalRobAeOil ?? 0;
            }
            else if (vessel.initialRobLsifo !== null) { // Vessel has established initial ROBs
                previousRob.lsifo = vessel.initialRobLsifo ?? 0;
                previousRob.lsmgo = vessel.initialRobLsmgo ?? 0;
                previousRob.cylOil = vessel.initialRobCylOil ?? 0;
                previousRob.meOil = vessel.initialRobMeOil ?? 0;
                previousRob.aeOil = vessel.initialRobAeOil ?? 0;
            }
            // If it's the vessel's very first departure and vessel.initialRobLsifo is null,
            // the `calculateRobs` method will handle using the DTO's initialRob* fields as the "previous" for calculation.
        }
        else if (previousReport) {
            // For non-departure reports, use the current ROBs from the immediate previous report of the *same* voyage.
            previousRob.lsifo = ('currentRobLsifo' in previousReport && typeof previousReport.currentRobLsifo === 'number') ? previousReport.currentRobLsifo : 0;
            previousRob.lsmgo = ('currentRobLsmgo' in previousReport && typeof previousReport.currentRobLsmgo === 'number') ? previousReport.currentRobLsmgo : 0;
            previousRob.cylOil = ('currentRobCylOil' in previousReport && typeof previousReport.currentRobCylOil === 'number') ? previousReport.currentRobCylOil : 0;
            previousRob.meOil = ('currentRobMeOil' in previousReport && typeof previousReport.currentRobMeOil === 'number') ? previousReport.currentRobMeOil : 0;
            previousRob.aeOil = ('currentRobAeOil' in previousReport && typeof previousReport.currentRobAeOil === 'number') ? previousReport.currentRobAeOil : 0;
        }
        // If no previous report and not a departure (e.g., error in logic upstream), ROBs remain 0.
        return previousRob;
    }
    /**
     * Determines the initial ROB values provided in the DTO for a departure report.
     * These are the values that will be stored on the report record itself.
     */
    static determineInputInitialRobs(reportInput) {
        if (reportInput.reportType === 'departure') {
            const depInput = reportInput;
            // Capture whatever is provided, even if null/undefined, for storage.
            // The `hasAllDepartureInitialRobs` check is for validation before this.
            return {
                initialRobLsifo: depInput.initialRobLsifo,
                initialRobLsmgo: depInput.initialRobLsmgo,
                initialRobCylOil: depInput.initialRobCylOil,
                initialRobMeOil: depInput.initialRobMeOil,
                initialRobAeOil: depInput.initialRobAeOil,
            };
        }
        return null;
    }
    /**
     * Calculates all ROB related values for a new report.
     */
    static calculateRobs(vessel, reportInput, previousReportForCalculations, // Previous report in the *same* voyage, or last of *previous* voyage for a new departure
    previousVoyageState // State of the *absolute last completed* voyage
    ) {
        let effectivePreviousRob;
        const inputInitialRobData = this.determineInputInitialRobs(reportInput);
        const isFirstEverReportForVessel = vessel.initialRobLsifo === null;
        if (reportInput.reportType === 'departure') {
            if (isFirstEverReportForVessel) {
                // Vessel's first report ever. "Previous ROB" for calculation *is* the initial ROB from DTO.
                if (!hasAllDepartureInitialRobs(reportInput)) {
                    throw new Error("Initial ROB values (Lsifo, Lsmgo, CylOil, MeOil, AeOil) are required for the vessel's first-ever departure report.");
                }
                const depInput = reportInput;
                effectivePreviousRob = {
                    lsifo: depInput.initialRobLsifo ?? 0,
                    lsmgo: depInput.initialRobLsmgo ?? 0,
                    cylOil: depInput.initialRobCylOil ?? 0,
                    meOil: depInput.initialRobMeOil ?? 0,
                    aeOil: depInput.initialRobAeOil ?? 0,
                };
            }
            else {
                // Not the first-ever report for the vessel, but it's a departure.
                // Use ROBs from previous voyage's end or vessel's established initial ROBs.
                effectivePreviousRob = this.getPreviousRobs(null, vessel, previousVoyageState, 'departure');
            }
        }
        else {
            // For Noon, Arrival, Berth: use previous report from the *current* voyage.
            effectivePreviousRob = this.getPreviousRobs(previousReportForCalculations, vessel, null, reportInput.reportType);
        }
        const consumptionInput = reportInput; // Assuming CreateReportDTO is a superset
        const supplyInput = reportInput; // Assuming CreateReportDTO is a superset
        const totalConsumptions = (0, bunker_calculator_1.calculateTotalConsumptions)(consumptionInput);
        const currentRobs = (0, bunker_calculator_1.calculateCurrentRobs)(effectivePreviousRob, totalConsumptions, supplyInput);
        return {
            previousRob: effectivePreviousRob,
            totalConsumptions,
            currentRobs,
            inputInitialRobData // This will be null for non-departure reports
        };
    }
}
exports.RobCalculator = RobCalculator;
