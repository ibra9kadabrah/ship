// src/services/voyage.service.ts
import { Voyage, VoyageState } from '../types/voyage';
import { Report } from '../types/report'; // Import Report type
import VoyageModel from '../models/voyage.model';
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';

export const VoyageService = {

  /**
   * Determines the current logical state of the voyage for a given vessel.
   * This is based on the *absolute latest* report (regardless of status) for the vessel.
   * @param vesselId The ID of the vessel.
   * @returns The current VoyageState.
   */
  async getCurrentVoyageState(vesselId: string): Promise<VoyageState> {
    // Get the absolute latest report for the vessel
    const latestReport = ReportModel.getLatestReportForVessel(vesselId);

    if (!latestReport) {
      // No reports found for this vessel at all.
      return 'NO_VOYAGE_ACTIVE';
    }

    // --- NEW: Check for pending status first ---
    if (latestReport.status === 'pending') {
      // If the latest report is pending, block all new submissions.
      return 'REPORT_PENDING'; 
    }
    // --- END NEW ---

    // Check if the latest report is linked to a completed voyage
    if (latestReport.voyageId) {
      const voyage = VoyageModel.findById(latestReport.voyageId);
      if (voyage && voyage.status === 'completed') {
        // The last action was part of a voyage that is now finished.
        return 'NO_VOYAGE_ACTIVE';
      }
    }

    // Handle specific cases based on the latest report's type and status
    if (latestReport.reportType === 'departure') {
      if (latestReport.status === 'rejected') {
        // If the latest departure was rejected, the vessel is ready for a new departure.
        return 'NO_VOYAGE_ACTIVE';
      } else {
        // If the latest departure is pending or approved, the voyage is considered active.
        return 'DEPARTED';
      }
    }

    // If the latest report is not a departure, determine state based on its type.
    // The status (pending/approved/rejected) doesn't change the *current* physical state
    // for noon, arrival, or berth reports in terms of allowed next actions.
    // A rejected noon report still means the vessel is AT_SEA physically.
    switch (latestReport.reportType) {
      case 'noon':
        return 'AT_SEA';
      case 'arrival':
        return 'ARRIVED';
      case 'berth':
        // If the latest non-pending report is berth, the state is BERTHED.
        // This allows submitting another Berth report or starting a new Departure.
        return 'BERTHED'; 
      default:
        // Should not happen with valid ReportType
        console.warn(`Unexpected report type found for latest report: ${latestReport.reportType}`);
        return 'NO_VOYAGE_ACTIVE'; // Default fallback
    }
  },

  // Add other voyage-related service methods if needed later...
  // e.g., getVoyageDetails, etc.

};

export default VoyageService;
