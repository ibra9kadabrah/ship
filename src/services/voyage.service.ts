// src/services/voyage.service.ts
import { Voyage, VoyageState, VoyageWithCargo } from '../types/voyage'; // Added VoyageWithCargo
import { Report, CargoStatus } from '../types/report'; // Import Report type and CargoStatus
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

    // --- NEW: Check for pending or changes_requested status first ---
    if (latestReport.status === 'pending' || latestReport.status === 'changes_requested') {
      // If the latest report is pending or needs changes, block all new submissions for subsequent reports.
      // If this latest report IS a departure report, the voyage isn't truly active yet.
      // If it's a later report type (e.g. Noon) that's pending/changes_requested, the voyage itself is active, but new reports are blocked.
      // For the dashboard's purpose of enabling forms, 'REPORT_PENDING' should suffice.
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
      } else if (latestReport.status === 'approved') {
        // Only if the latest departure is APPROVED, the voyage is considered active.
        return 'DEPARTED';
      } else {
        // If departure is any other status (e.g. somehow not caught by pending/changes_requested above, though unlikely)
        // treat as if no voyage is active for form enabling purposes.
        return 'NO_VOYAGE_ACTIVE';
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

  /**
   * Gets the cargo details from the end of the last completed voyage for a vessel,
   * to be potentially carried over to a new departure report.
   * @param vesselId The ID of the vessel.
   * @returns An object with cargo details if applicable, otherwise null.
   */
  async getCarryOverCargoDetails(vesselId: string): Promise<{ lastCargoType: string | null; lastCargoQuantity: number; lastCargoUnit: string; cargoStatus: CargoStatus } | null> {
    console.log(`[VoyageService] Attempting to getCarryOverCargoDetails for vesselId: ${vesselId}`);

    // Find the latest 'Arrival' or 'Berth' report that is 'approved' for this vessel.
    // Use the newly added method in ReportModel
    const latestApprovedEndReport = ReportModel.getLatestApprovedArrivalOrBerthReport(vesselId);

    if (latestApprovedEndReport) {
      console.log(`[VoyageService] Found latest approved end report: ID=${latestApprovedEndReport.id}, Type=${latestApprovedEndReport.reportType}, Status=${latestApprovedEndReport.status}`);
      
      // Extract cargo details from the report.
      // The report type should have these fields.
      // Need to ensure the Report type definition includes these for Arrival/Berth.
      const reportData = latestApprovedEndReport as any; // Cast to access potential cargo fields

      // Ensure we handle cases where cargoQuantity might be 0 or null
      const cargoQuantity = (reportData.cargoQuantity !== null && reportData.cargoQuantity !== undefined)
                            ? Number(reportData.cargoQuantity)
                            : 0;
      
      const cargoType = reportData.cargoType || null; // Default to null if undefined/empty
      
      // Determine cargoStatus based on quantity.
      // This aligns with how DepartureForm might interpret it.
      const cargoStatus: CargoStatus = cargoQuantity > 0 ? 'Loaded' : 'Empty';
      
      // Assuming a default unit like 'MT' if not explicitly stored or needed differently.
      // The frontend type `CarryOverCargo` expects `lastCargoUnit`.
      // If the report doesn't store unit, we might need a default or adjust.
      // For now, let's assume 'MT' or get it from report if available.
      const cargoUnit = reportData.cargoUnit || 'MT';


      console.log(`[VoyageService] Extracted cargo details: Type=${cargoType}, Quantity=${cargoQuantity}, Unit=${cargoUnit}, Status=${cargoStatus}`);
      return {
        lastCargoType: cargoType,
        lastCargoQuantity: cargoQuantity,
        lastCargoUnit: cargoUnit, // Added unit
        cargoStatus: cargoStatus, // This was the field name in the original return type, let's keep it consistent for now
                                  // but the frontend type uses `lastCargoStatus`. This might need alignment.
                                  // For now, matching the method's declared return type.
      };
    } else {
      console.log(`[VoyageService] No approved 'Arrival' or 'Berth' report found for vesselId: ${vesselId}. No carry-over cargo.`);
      return null;
    }
  }
};

export default VoyageService;
