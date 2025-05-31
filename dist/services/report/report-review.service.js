"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportReviewService = void 0;
const connection_1 = __importDefault(require("../../db/connection")); // For transactions
const report_model_1 = __importDefault(require("../../models/report.model"));
const vessel_model_1 = __importDefault(require("../../models/vessel.model"));
const voyage_model_1 = __importDefault(require("../../models/voyage.model"));
const report_query_service_1 = require("./report-query.service"); // To fetch the full report after review
class ReportReviewService {
    constructor() {
        this.reportQueryService = new report_query_service_1.ReportQueryService();
    }
    async reviewReport(reportId, reviewData, reviewerId) {
        const reviewTransaction = () => {
            // 1. Fetch the report being reviewed *within the transaction*
            const reportToReview = report_model_1.default.findById(reportId);
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
                const vesselId = reportToReview.vesselId; // Should exist
                // 1. Check and complete previous voyage
                const actualPreviousReport = report_model_1.default.findPreviousReport(reportId, vesselId);
                if (actualPreviousReport && (actualPreviousReport.reportType === 'arrival' || actualPreviousReport.reportType === 'berth')) {
                    if (actualPreviousReport.voyageId) {
                        voyage_model_1.default.completeVoyage(actualPreviousReport.voyageId);
                        console.log(`[ReportReviewService] Completed previous voyage ${actualPreviousReport.voyageId} during approval of report ${reportId}`);
                    }
                    else {
                        console.warn(`[ReportReviewService] Previous report ${actualPreviousReport.id} was ${actualPreviousReport.reportType} but had no voyageId to complete.`);
                    }
                }
                else {
                    console.log(`[ReportReviewService] No previous arrival/berth report found for vessel ${vesselId} before report ${reportId}, or previous report had no voyageId. No voyage marked as completed.`);
                }
                // 2. Create the new voyage (assuming reportToReview has enough data)
                const departureData = reportToReview;
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
                const newVoyage = voyage_model_1.default.create(voyageData);
                console.log(`[ReportReviewService] Created new voyage ${newVoyage.id} during approval of report ${reportId}`);
                // 3. Link the report to the new voyage
                const linkSuccess = report_model_1.default.updateVoyageId(reportId, newVoyage.id);
                if (!linkSuccess) {
                    throw new Error(`Failed to link report ${reportId} to new voyage ${newVoyage.id}.`);
                }
                // 4. Vessel ROB update logic
                const vesselForRobUpdate = vessel_model_1.default.findById(vesselId);
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
                    const validInitialRobData = Object.fromEntries(Object.entries(initialRobDataFromReport).filter(([_, v]) => v !== null && v !== undefined));
                    if (Object.keys(validInitialRobData).length > 0) {
                        robUpdateSuccess = vessel_model_1.default.updateInitialRob(vesselId, validInitialRobData);
                        if (!robUpdateSuccess) {
                            console.error(`[ReportReviewService] Failed to update initial ROB for vessel ${vesselId} while approving report ${reportId}.`);
                        }
                    }
                    else {
                        console.warn(`[ReportReviewService] First departure report ${reportId} approved, but no initial ROB data found in the report record to update vessel ${vesselId}.`);
                    }
                }
            }
            // --- END NEW Logic ---
            // 4. Update the report status itself
            const statusUpdateSuccess = report_model_1.default.reviewReport(reportId, reviewData, reviewerId);
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
        const transactionFn = connection_1.default.transaction(reviewTransaction);
        try {
            transactionFn(); // Execute the transaction
            // If transaction succeeded, fetch and return the updated report view
            return this.reportQueryService.getReportById(reportId);
        }
        catch (error) {
            console.error(`Report review transaction failed for report ${reportId}:`, error);
            throw error;
        }
    }
}
exports.ReportReviewService = ReportReviewService;
