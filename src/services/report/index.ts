import {
    Report,
    CreateReportDTO,
    ReviewReportDTO,
    FullReportViewDTO,
    // Add other necessary types that the facade methods might return or use
} from '../../types/report';

import { ReportSubmissionService } from './report-submission.service';
import { ReportReviewService } from './report-review.service';
import { ReportQueryService, ReportListDTO } from './report-query.service';
import { ReportResubmissionService } from './report-resubmission.service';
import { ExcelExportService } from '../excel_export.service'; // Assuming this remains separate or is also refactored

export class ReportServiceFacade {
  private submissionService: ReportSubmissionService;
  private reviewService: ReportReviewService;
  private queryService: ReportQueryService;
  private resubmissionService: ReportResubmissionService;
  // excelExportService might be instantiated if it's a class, or called statically
  // For now, assuming direct call to ExcelExportService.exportMRVExcel if it's static

  constructor() {
    this.submissionService = new ReportSubmissionService();
    this.reviewService = new ReportReviewService();
    this.queryService = new ReportQueryService();
    this.resubmissionService = new ReportResubmissionService();
  }

  async submitReport(reportInput: CreateReportDTO, captainId: string): Promise<Report> {
    return this.submissionService.submitReport(reportInput, captainId);
  }

  async getReportById(id: string): Promise<FullReportViewDTO> {
    return this.queryService.getReportById(id);
  }

  async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Promise<FullReportViewDTO> {
    return this.reviewService.reviewReport(id, reviewData, reviewerId);
  }

  async resubmitReport(reportId: string, captainId: string, changes: Partial<CreateReportDTO>): Promise<FullReportViewDTO> {
    return this.resubmissionService.resubmitReport(reportId, captainId, changes);
  }

  async getPendingReports(vesselId?: string): Promise<ReportListDTO[]> {
    return this.queryService.getPendingReports(vesselId);
  }

  async getReportsByCaptainId(captainId: string): Promise<Partial<Report>[]> {
    return this.queryService.getReportsByCaptainId(captainId);
  }

  async getAllReports(vesselId?: string): Promise<ReportListDTO[]> {
    return this.queryService.getAllReports(vesselId);
  }

  async exportMRVExcel(voyageId: string): Promise<Buffer> {
    // Assuming ExcelExportService has a static method or is instantiated elsewhere
    // If it were part of this refactor, it would be a service here.
    return ExcelExportService.exportMRVExcel(voyageId);
  }

  // Add any other methods that were on the original ReportService
  // For example, if there were direct calls to helper functions or other logic
}

// Export a singleton instance to maintain compatibility with existing imports
export const ReportService = new ReportServiceFacade();