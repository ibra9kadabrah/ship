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
    const latestReport = await ReportModel.getLatestReportForVessel(vesselId);

    if (!latestReport) {
      // No reports found for this vessel at all.
      return 'NO_VOYAGE_ACTIVE';
    }

    // --- NEW: Check for pending or changes_requested status first ---
    if (latestReport.status === 'pending' || latestReport.status === 'changes_requested') {
      return 'REPORT_PENDING';
    }
    // --- END NEW ---

    // Check if the latest report is linked to a completed voyage
    if (latestReport.voyageId) {
      const voyage = await VoyageModel.findById(latestReport.voyageId);
      if (voyage && voyage.status === 'completed') {
        // The last action was part of a voyage that is now finished.
        return 'NO_VOYAGE_ACTIVE';
      }
    }

    // Handle specific cases based on the latest report's type and status
    if (latestReport.reportType === 'departure') {
      if (latestReport.status === 'rejected') {
        return 'NO_VOYAGE_ACTIVE';
      } else if (latestReport.status === 'approved') {
        return 'DEPARTED';
      } else {
        return 'NO_VOYAGE_ACTIVE';
      }
    }

    switch (latestReport.reportType) {
      case 'noon':
        return 'AT_SEA';
      case 'arrival':
        return 'ARRIVED';
      case 'berth':
        return 'BERTHED';
      case 'arrival_anchor_noon':
        return 'AT_ANCHOR';
      default:
        console.warn(`Unexpected report type found for latest report: ${latestReport.reportType}`);
        return 'NO_VOYAGE_ACTIVE';
    }
  },

  async getCarryOverCargoDetails(vesselId: string): Promise<{ lastCargoType: string | null; lastCargoQuantity: number; lastCargoUnit: string; cargoStatus: CargoStatus } | null> {
    console.log(`[VoyageService] Attempting to getCarryOverCargoDetails for vesselId: ${vesselId}`);

    const latestApprovedEndReport = await ReportModel.getLatestApprovedArrivalOrBerthReport(vesselId);

    if (latestApprovedEndReport) {
      console.log(`[VoyageService] Found latest approved end report: ID=${latestApprovedEndReport.id}, Type=${latestApprovedEndReport.reportType}, Status=${latestApprovedEndReport.status}`);
      
      const reportData = latestApprovedEndReport as any;

      const cargoQuantity = (reportData.cargoQuantity !== null && reportData.cargoQuantity !== undefined)
                            ? Number(reportData.cargoQuantity)
                            : 0;
      
      const cargoType = reportData.cargoType || null;
      
      const cargoStatus: CargoStatus = cargoQuantity > 0 ? 'Loaded' : 'Empty';
      
      const cargoUnit = reportData.cargoUnit || 'MT';


      console.log(`[VoyageService] Extracted cargo details: Type=${cargoType}, Quantity=${cargoQuantity}, Unit=${cargoUnit}, Status=${cargoStatus}`);
      return {
        lastCargoType: cargoType,
        lastCargoQuantity: cargoQuantity,
        lastCargoUnit: cargoUnit,
        cargoStatus: cargoStatus,
      };
    } else {
      console.log(`[VoyageService] No approved 'Arrival' or 'Berth' report found for vesselId: ${vesselId}. No carry-over cargo.`);
      return null;
    }
  }
};

export default VoyageService;
