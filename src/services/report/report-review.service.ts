import pool from '../../db/connection'; // For transactions
import {
    Report,
    ReviewReportDTO,
    FullReportViewDTO,
    ReportStatus,
    DepartureSpecificData,
} from '../../types/report';
import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model';
import VoyageModel from '../../models/voyage.model';
import { ReportQueryService } from './report-query.service';

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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reportToReview = await ReportModel.findById(reportId, client);
      if (!reportToReview) {
        throw new Error(`Report with ID ${reportId} not found.`);
      }
      if (reportToReview.status !== 'pending') {
        throw new Error(`Report ${reportId} has already been reviewed (status: ${reportToReview.status}).`);
      }

      if (reviewData.status === 'approved' && reportToReview.reportType === 'departure') {
        console.log(`[ReportReviewService] Approving departure report ${reportId}. Handling voyage logic...`);
        const vesselId = reportToReview.vesselId as string;

        const actualPreviousReport = await ReportModel.findPreviousReport(reportId, vesselId, client);
        if (actualPreviousReport && (actualPreviousReport.reportType === 'arrival' || actualPreviousReport.reportType === 'berth')) {
          if (actualPreviousReport.voyageId) {
            await VoyageModel.completeVoyage(actualPreviousReport.voyageId, client);
            console.log(`[ReportReviewService] Completed previous voyage ${actualPreviousReport.voyageId} during approval of report ${reportId}`);
          } else {
            console.warn(`[ReportReviewService] Previous report ${actualPreviousReport.id} was ${actualPreviousReport.reportType} but had no voyageId to complete.`);
          }
        } else {
          console.log(`[ReportReviewService] No previous arrival/berth report found for vessel ${vesselId} before report ${reportId}, or previous report had no voyageId. No voyage marked as completed.`);
        }

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
        const newVoyage = await VoyageModel.create(voyageData, client);
        console.log(`[ReportReviewService] Created new voyage ${newVoyage.id} during approval of report ${reportId}`);

        const linkSuccess = await ReportModel.updateVoyageId(reportId, newVoyage.id, client);
        if (!linkSuccess) {
          throw new Error(`Failed to link report ${reportId} to new voyage ${newVoyage.id}.`);
        }

        const vesselForRobUpdate = await VesselModel.findById(vesselId, client);
        if (!vesselForRobUpdate) {
          throw new Error(`Associated vessel ${vesselId} not found for report ${reportId} during ROB update check.`);
        }
        if (vesselForRobUpdate.initialRobLsifo === null) {
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
            const robUpdateSuccess = await VesselModel.updateInitialRob(vesselId, validInitialRobData, client);
            if (!robUpdateSuccess) {
              console.error(`[ReportReviewService] Failed to update initial ROB for vessel ${vesselId} while approving report ${reportId}.`);
              throw new Error(`Failed to update initial ROB for vessel ${reportToReview.vesselId}.`);
            }
          } else {
            console.warn(`[ReportReviewService] First departure report ${reportId} approved, but no initial ROB data found in the report record to update vessel ${vesselId}.`);
          }
        }
      }

      const statusUpdateSuccess = await ReportModel.reviewReport(reportId, reviewData, reviewerId, client);

      if (!statusUpdateSuccess) {
        throw new Error(`Failed to update report status for ${reportId}.`);
      }

      await client.query('COMMIT');
      return this.reportQueryService.getReportById(reportId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Report review transaction failed for report ${reportId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}