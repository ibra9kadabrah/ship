// src/services/distance_calculator.ts

import { ReportType, Report } from '../types/report'; // Import Report type

// Use Partial<Report> for previous report data as model returns that
type PreviousReportData = Partial<Report> | null; 

// Input needed for distance calculations
export interface DistanceCalculationInput {
    reportType: ReportType;
    harbourDistance?: number | null; // Only for departure
    distanceSinceLastReport?: number | null; // For departure, noon, arrival
    previousReportData: PreviousReportData; // Contains previous totalDistanceTravelled
    voyageDistance: number; // Total distance for the voyage
}

// Output of distance calculations
export interface DistanceCalculationOutput {
    totalDistanceTravelled?: number;
    distanceToGo?: number;
}

// --- Calculation Function ---

/**
 * Calculates total distance travelled and distance remaining for a voyage.
 */
export function calculateDistances(input: DistanceCalculationInput): DistanceCalculationOutput {
    let totalDistanceTravelled: number | undefined = undefined;
    let distanceToGo: number | undefined = undefined;
    const distSinceLast = input.distanceSinceLastReport ?? 0;

    if (input.reportType === 'departure' || input.reportType === 'noon' || input.reportType === 'arrival' || input.reportType === 'arrival_anchor_noon') {
        if (input.reportType === 'departure') {
            // For departure, total travelled is simply the harbour distance.
            totalDistanceTravelled = input.harbourDistance ?? 0;
        } else if (input.previousReportData) {
            // For Noon/Arrival, add distance since last to previous report's total
            totalDistanceTravelled = (input.previousReportData.totalDistanceTravelled ?? 0) + distSinceLast;
        } else {
            // Edge case: Noon/Arrival report without a preceding report in the data? 
            // This shouldn't happen with correct service logic but handle defensively.
            console.warn(`Calculating distance for ${input.reportType} without previous report data.`);
            totalDistanceTravelled = distSinceLast; // Best guess? Or throw error?
        }

        // Calculate distance to go based on the *voyage's* total distance
        if (totalDistanceTravelled !== undefined) {
            distanceToGo = input.voyageDistance - totalDistanceTravelled;
            // Ensure distance to go isn't negative
            distanceToGo = Math.max(0, distanceToGo); 
        }
    }
    // For 'berth' reports, distances might not be relevant, return undefined

    return {
        totalDistanceTravelled: totalDistanceTravelled,
        distanceToGo: distanceToGo,
    };
}
