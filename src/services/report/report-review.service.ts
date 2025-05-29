import db from '../../db/connection'; // For transactions
import {
    Report,
    ReviewReportDTO,
    FullReportViewDTO,
    ReportStatus,
    DepartureSpecificData,
    // ReportType // Not directly used but good for context
} from '../../types/report';
import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model';
import VoyageModel from '../../models/voyage.model';
import { ReportQueryService } from './report-query.service'; // To fetch the full report after review

export class ReportReviewService {
  private reportQueryService: ReportQueryService;

  constructor() {
    this.reportQueryService = new ReportQueryService();
  }

  async reviewReport(
    reportId: string,
    reviewData: ReviewReportDTO,
    reviewerId: string
  ): Promise<FullReportViewDTO> {
    const reviewTransaction = () => {
      // 1. Fetch the report being reviewed *within the transaction*
      const reportToReview = ReportModel.findById(reportId);
      if (!reportToReview) {
        throw new Error(`Report with ID ${reportId} not found.`);
      }
      // 2. Check current status *within the transaction*
      if (reportToReview.status !== 'pending') {
        throw new Error(`Report ${reportId} has already been reviewed (status: ${reportToReview.status}).`);
      }

      let robUpdateSuccess = true; // Assume success unless update is needed and fails

      // --- Voyage Creation/Completion/Linking Logic on Departure Approval ---
      if (reviewData.status === 'approved' && reportToReview.reportType === 'departure') {
        console.log(`[ReportReviewService] Approving departure report ${reportId}. Handling voyage logic...`);
        const vesselId = reportToReview.vesselId as string; // Should exist

        // 1. Check and complete previous voyage
        const actualPreviousReport = ReportModel.findPreviousReport(reportId, vesselId);
        if (actualPreviousReport && (actualPreviousReport.reportType === 'arrival' || actualPreviousReport.reportType === 'berth')) {
          if (actualPreviousReport.voyageId) {
            VoyageModel.completeVoyage(actualPreviousReport.voyageId);
            console.log(`[ReportReviewService] Completed previous voyage ${actualPreviousReport.voyageId} during approval of report ${reportId}`);
          } else {
            console.warn(`[ReportReviewService] Previous report ${actualPreviousReport.id} was ${actualPreviousReport.reportType} but had no voyageId to complete.`);
          }
        } else {
          console.log(`[ReportReviewService] No previous arrival/berth report found for vessel ${vesselId} before report ${reportId}, or previous report had no voyageId. No voyage marked as completed.`);
        }

        // 2. Create the new voyage (assuming reportToReview has enough data)
        const departureData = reportToReview as Report & DepartureSpecificData;
        if (!departureData.departurePort || !departureData.destinationPort || departureData.voyageDistance === null || departureData.voyageDistance === undefined || !departureData.reportDate) {
          throw new Error(`Cannot create voyage: Missing required data (ports, distance, date) on departure report ${reportId}.`);
        }
        const voyageData = {
          vesselId: vesselId,
          departurePort: departureData.departurePort,
          destinationPort: departureData.destinationPort,
          voyageDistance: departureData.voyageDistance,
          startDate: departureData.reportDate
        };
        const newVoyage = VoyageModel.create(voyageData);
        console.log(`[ReportReviewService] Created new voyage ${newVoyage.id} during approval of report ${reportId}`);

        // 3. Link the report to the new voyage
        const linkSuccess = ReportModel.updateVoyageId(reportId, newVoyage.id);
        if (!linkSuccess) {
          throw new Error(`Failed to link report ${reportId} to new voyage ${newVoyage.id}.`);
        }

        // 4. Vessel ROB update logic
        const vesselForRobUpdate = VesselModel.findById(vesselId);
        if (!vesselForRobUpdate) {
          throw new Error(`Associated vessel ${vesselId} not found for report ${reportId} during ROB update check.`);
        }
        if (vesselForRobUpdate.initialRobLsifo === null) { // First *approved* departure
          console.log(`[ReportReviewService] Updating initial ROBs for vessel ${vesselId} as part of first departure approval (${reportId}).`);
          const initialRobDataFromReport = {
            initialRobLsifo: reportToReview.initialRobLsifo,
            initialRobLsmgo: reportToReview.initialRobLsmgo,
            initialRobCylOil: reportToReview.initialRobCylOil,
            initialRobMeOil: reportToReview.initialRobMeOil,
            initialRobAeOil: reportToReview.initialRobAeOil,
          };
          const validInitialRobData = Object.fromEntries(
            Object.entries(initialRobDataFromReport).filter(([_, v]) => v !== null && v !== undefined)
          );
          if (Object.keys(validInitialRobData).length > 0) {
            robUpdateSuccess = VesselModel.updateInitialRob(vesselId, validInitialRobData);
            if (!robUpdateSuccess) {
              console.error(`[ReportReviewService] Failed to update initial ROB for vessel ${vesselId} while approving report ${reportId}.`);
            }
          } else {
            console.warn(`[ReportReviewService] First departure report ${reportId} approved, but no initial ROB data found in the report record to update vessel ${vesselId}.`);
          }
        }
      }
      // --- END NEW Logic ---

      // 4. Update the report status itself
      const statusUpdateSuccess = ReportModel.reviewReport(reportId, reviewData, reviewerId);

      if (!robUpdateSuccess) {
        throw new Error(`Failed to update initial ROB for vessel ${reportToReview.vesselId}.`);
      }
      if (!statusUpdateSuccess) {
        throw new Error(`Failed to update report status for ${reportId}.`);
      }
    };

    // Execute the transaction using db.transaction
    // The actual execution of the function passed to db.transaction needs to be called.
    // db.transaction expects a callback that it will execute.
    const transactionFn = db.transaction(reviewTransaction);

    try {
      transactionFn(); // Execute the transaction
      // If transaction succeeded, fetch and return the updated report view
      return this.reportQueryService.getReportById(reportId);
    } catch (error) {
      console.error(`Report review transaction failed for report ${reportId}:`, error);
      throw error;
    }
  }

  // Extracted private methods (can be further refined or kept within reviewReport if simple enough)
  // For now, the logic is kept inline in reviewReport for directness as per original service structure.
  // If these become complex, they can be extracted:
  // private handleDepartureApproval(...) {}
  // private updateVesselInitialRobs(...) {}
}