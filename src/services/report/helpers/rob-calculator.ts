import {
    Report,
    CreateReportDTO,
    ReportType,
    DepartureSpecificData,
} from '../../../types/report';
import { Vessel } from '../../../types/vessel';
import { PreviousVoyageFinalState } from '../../voyage_lifecycle.service'; // Adjust path as needed
import {
    calculateTotalConsumptions,
    calculateCurrentRobs,
    PreviousRob,
    TotalConsumptions,
    CurrentRobs,
    BunkerConsumptionInput,
    BunkerSupplyInput
} from '../../bunker_calculator'; // Adjust path as needed

// Re-defined or imported from report-builder.ts or a shared types file
export interface InitialRobData {
  initialRobLsifo?: number | null;
  initialRobLsmgo?: number | null;
  initialRobCylOil?: number | null;
  initialRobMeOil?: number | null;
  initialRobAeOil?: number | null;
}

export interface RobCalculationResult {
    previousRob: PreviousRob;
    totalConsumptions: TotalConsumptions;
    currentRobs: CurrentRobs;
    // This will store the initial ROBs that were *input* by the user for a departure report,
    // which might be different from previousRob if it's the vessel's very first report.
    // These are the values that should be saved to the report's initialRob* fields.
    inputInitialRobData?: InitialRobData | null;
}

// Helper to check if all required Initial ROBs are present in DepartureSpecificData
function hasAllDepartureInitialRobs(data: DepartureSpecificData): data is DepartureSpecificData & { initialRobLsifo: number; initialRobLsmgo: number; initialRobCylOil: number; initialRobMeOil: number; initialRobAeOil: number; } {
    return data.initialRobLsifo !== undefined && data.initialRobLsifo !== null &&
           data.initialRobLsmgo !== undefined && data.initialRobLsmgo !== null &&
           data.initialRobCylOil !== undefined && data.initialRobCylOil !== null &&
           data.initialRobMeOil !== undefined && data.initialRobMeOil !== null &&
           data.initialRobAeOil !== undefined && data.initialRobAeOil !== null;
}


export class RobCalculator {
  /**
   * Determines the ROBs from the previous report or vessel's initial state.
   */
  static getPreviousRobs(
    previousReport: Partial<Report> | null,
    vessel: Vessel,
    previousVoyageState: PreviousVoyageFinalState | null,
    currentReportType: ReportType
  ): PreviousRob {
    const previousRob: PreviousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };

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
        } else if (vessel.initialRobLsifo !== null) { // Vessel has established initial ROBs
            previousRob.lsifo = vessel.initialRobLsifo ?? 0;
            previousRob.lsmgo = vessel.initialRobLsmgo ?? 0;
            previousRob.cylOil = vessel.initialRobCylOil ?? 0;
            previousRob.meOil = vessel.initialRobMeOil ?? 0;
            previousRob.aeOil = vessel.initialRobAeOil ?? 0;
        }
        // If it's the vessel's very first departure and vessel.initialRobLsifo is null,
        // the `calculateRobs` method will handle using the DTO's initialRob* fields as the "previous" for calculation.
    } else if (previousReport) {
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
  static determineInputInitialRobs(reportInput: CreateReportDTO): InitialRobData | null {
    if (reportInput.reportType === 'departure') {
        const depInput = reportInput as DepartureSpecificData;
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
  static calculateRobs(
    vessel: Vessel,
    reportInput: CreateReportDTO,
    previousReportForCalculations: Partial<Report> | null, // Previous report in the *same* voyage, or last of *previous* voyage for a new departure
    previousVoyageState: PreviousVoyageFinalState | null   // State of the *absolute last completed* voyage
  ): RobCalculationResult {
    let effectivePreviousRob: PreviousRob;
    const inputInitialRobData = this.determineInputInitialRobs(reportInput);

    const isFirstEverReportForVessel = vessel.initialRobLsifo === null;

    if (reportInput.reportType === 'departure') {
        if (isFirstEverReportForVessel) {
            // Vessel's first report ever. "Previous ROB" for calculation *is* the initial ROB from DTO.
            if (!hasAllDepartureInitialRobs(reportInput as DepartureSpecificData)) {
                throw new Error("Initial ROB values (Lsifo, Lsmgo, CylOil, MeOil, AeOil) are required for the vessel's first-ever departure report.");
            }
            const depInput = reportInput as DepartureSpecificData;
            effectivePreviousRob = {
                lsifo: depInput.initialRobLsifo ?? 0,
                lsmgo: depInput.initialRobLsmgo ?? 0,
                cylOil: depInput.initialRobCylOil ?? 0,
                meOil: depInput.initialRobMeOil ?? 0,
                aeOil: depInput.initialRobAeOil ?? 0,
            };
        } else {
            // Not the first-ever report for the vessel, but it's a departure.
            // Use ROBs from previous voyage's end or vessel's established initial ROBs.
            effectivePreviousRob = this.getPreviousRobs(null, vessel, previousVoyageState, 'departure');
        }
    } else {
        // For Noon, Arrival, Berth: use previous report from the *current* voyage.
        effectivePreviousRob = this.getPreviousRobs(previousReportForCalculations, vessel, null, reportInput.reportType);
    }

    const consumptionInput: BunkerConsumptionInput = reportInput; // Assuming CreateReportDTO is a superset
    const supplyInput: BunkerSupplyInput = reportInput;         // Assuming CreateReportDTO is a superset

    const totalConsumptions = calculateTotalConsumptions(consumptionInput);
    const currentRobs = calculateCurrentRobs(effectivePreviousRob, totalConsumptions, supplyInput);

    return {
        previousRob: effectivePreviousRob,
        totalConsumptions,
        currentRobs,
        inputInitialRobData // This will be null for non-departure reports
    };
  }
}