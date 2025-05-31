"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = exports.ReportServiceFacade = void 0;
const report_submission_service_1 = require("./report-submission.service");
const report_review_service_1 = require("./report-review.service");
const report_query_service_1 = require("./report-query.service");
const report_resubmission_service_1 = require("./report-resubmission.service");
const excel_export_service_1 = require("../excel_export.service"); // Assuming this remains separate or is also refactored
class ReportServiceFacade {
    // excelExportService might be instantiated if it's a class, or called statically
    // For now, assuming direct call to ExcelExportService.exportMRVExcel if it's static
    constructor() {
        this.submissionService = new report_submission_service_1.ReportSubmissionService();
        this.reviewService = new report_review_service_1.ReportReviewService();
        this.queryService = new report_query_service_1.ReportQueryService();
        this.resubmissionService = new report_resubmission_service_1.ReportResubmissionService();
    }
    async submitReport(reportInput, captainId) {
        return this.submissionService.submitReport(reportInput, captainId);
    }
    async getReportById(id) {
        return this.queryService.getReportById(id);
    }
    async reviewReport(id, reviewData, reviewerId) {
        return this.reviewService.reviewReport(id, reviewData, reviewerId);
    }
    async resubmitReport(reportId, captainId, changes) {
        return this.resubmissionService.resubmitReport(reportId, captainId, changes);
    }
    async getPendingReports(vesselId) {
        return this.queryService.getPendingReports(vesselId);
    }
    async getReportsByCaptainId(captainId) {
        return this.queryService.getReportsByCaptainId(captainId);
    }
    async getAllReports(vesselId) {
        return this.queryService.getAllReports(vesselId);
    }
    async exportMRVExcel(voyageId) {
        // Assuming ExcelExportService has a static method or is instantiated elsewhere
        // If it were part of this refactor, it would be a service here.
        return excel_export_service_1.ExcelExportService.exportMRVExcel(voyageId);
    }
}
exports.ReportServiceFacade = ReportServiceFacade;
// Export a singleton instance to maintain compatibility with existing imports
exports.ReportService = new ReportServiceFacade();
