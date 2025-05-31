"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_1 = require("../services/report"); // Import the service facade
const excel_export_service_1 = require("../services/excel_export.service"); // Import ExcelExportService
const voyage_model_1 = __importDefault(require("../models/voyage.model")); // Import VoyageModel
const vessel_model_1 = __importDefault(require("../models/vessel.model")); // Import VesselModel
// Define possible report types for runtime validation
const VALID_REPORT_TYPES = ['departure', 'noon', 'arrival', 'berth', 'arrival_anchor_noon']; // Ensure berth is included
exports.ReportController = {
    // Unified endpoint for submitting any report type (captain only)
    // Note: Route needs to be updated to handle different types, e.g., POST /api/reports
    async submitReport(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (req.user.role !== 'captain') {
                res.status(403).json({ error: 'Only captains can submit reports' });
                return;
            }
            // TODO: Add more robust validation (e.g., using a library like Zod)
            const reportData = req.body;
            const captainId = req.user.id;
            // Basic validation moved here or could be in service
            // Use the runtime constant array for validation
            if (!reportData.reportType || !VALID_REPORT_TYPES.includes(reportData.reportType)) {
                res.status(400).json({ error: `Valid reportType (${VALID_REPORT_TYPES.join(', ')}) is required` });
                return;
            }
            // Add checks for required fields based on reportType if needed before calling service
            const newReport = await report_1.ReportService.submitReport(reportData, captainId);
            res.status(201).json(newReport);
        }
        catch (error) {
            console.error('Error submitting report:', error);
            // Handle specific errors thrown by the service
            if (error.message.includes("not found")) {
                res.status(404).json({ error: error.message });
            }
            else if (error.message.includes("required for the first report")) {
                res.status(400).json({ error: error.message });
            }
            else if (error.message.includes("pending reports")) { // Example check
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to submit report' });
            }
        }
    },
    // Get pending reports (admin/office only)
    async getPendingReports(req, res) {
        try {
            // Authorization check could also be middleware
            if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'office')) {
                res.status(403).json({ error: 'Admin or office access required' });
                return;
            }
            const vesselId = req.query.vesselId;
            const reports = await report_1.ReportService.getPendingReports(vesselId);
            res.status(200).json(reports);
        }
        catch (error) {
            console.error('Error fetching pending reports:', error);
            res.status(500).json({ error: 'Failed to fetch pending reports' });
        }
    },
    // Get report by ID (admin/office can access any, captain can access own or those needing their action)
    async getReportById(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) { // Should be caught by authenticate middleware, but as a safeguard
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            // First, get the report (ReportService.getReportById already throws if not found)
            const report = await report_1.ReportService.getReportById(id); // This returns FullReportViewDTO
            // Then check permissions based on role and report status/ownership
            if (req.user.role === 'admin' || req.user.role === 'office') {
                // Admin and office can access any report
                res.status(200).json(report);
            }
            else if (req.user.role === 'captain' &&
                (report.captainId === req.user.id || report.status === 'changes_requested')) {
                // Captain can access their own reports or reports with status 'changes_requested' (implicitly for them)
                // A more robust check for 'changes_requested' might be to see if it's for their vessel,
                // but for now, if they are linked to it, this is okay.
                res.status(200).json(report);
            }
            else {
                // Otherwise, deny access
                res.status(403).json({ error: 'Insufficient permissions to access this report' });
            }
        }
        catch (error) {
            console.error('Error fetching report:', error);
            if (error.message.includes("not found")) {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to fetch report' });
            }
        }
    },
    // Resubmit report with changes (captain only)
    async resubmitReport(req, res) {
        console.log(`[Controller.resubmitReport] Called for reportId: ${req.params.id}. Body:`, JSON.stringify(req.body, null, 2));
        try {
            const { id: reportId } = req.params;
            const captainId = req.user.id; // Authenticated captain
            const changes = req.body;
            const updatedReport = await report_1.ReportService.resubmitReport(reportId, captainId, changes);
            res.status(200).json(updatedReport);
        }
        catch (error) {
            console.error('Error resubmitting report:', error);
            if (error.message.includes("not found")) {
                res.status(404).json({ error: error.message });
            }
            else if (error.message.includes("not allowed") || error.message.includes("Invalid status")) {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to resubmit report' });
            }
        }
    },
    // Review report (approve/reject) (admin/office only)
    async reviewReport(req, res) {
        try {
            if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'office')) {
                res.status(403).json({ error: 'Admin or office access required' });
                return;
            }
            const { id } = req.params;
            const reviewData = req.body;
            const reviewerId = req.user.id;
            // Basic validation for status
            const validStatuses = ['approved', 'rejected', 'changes_requested'];
            if (!reviewData.status || !validStatuses.includes(reviewData.status)) {
                res.status(400).json({ error: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}.` });
                return;
            }
            // If status is 'changes_requested', ensure checklist and comment are present (or handle if optional)
            if (reviewData.status === 'changes_requested') {
                if (!reviewData.modification_checklist || reviewData.modification_checklist.length === 0) {
                    // Depending on requirements, this could be an error or allowed.
                    // For now, let's assume checklist is required if requesting changes.
                    // res.status(400).json({ error: "Modification checklist is required when requesting changes." });
                    // return;
                    // Per plan, checklist is string[] | null. Service/model will handle null.
                }
                if (!reviewData.requested_changes_comment) {
                    // Similar to checklist, decide if comment is strictly required.
                    // res.status(400).json({ error: "A comment is required when requesting changes." });
                    // return;
                    // Per plan, comment is string | null. Service/model will handle null.
                }
            }
            const updatedReport = await report_1.ReportService.reviewReport(id, reviewData, reviewerId);
            res.status(200).json(updatedReport);
        }
        catch (error) {
            console.error('Error reviewing report:', error);
            if (error.message.includes("not found")) {
                res.status(404).json({ error: error.message });
            }
            else if (error.message.includes("already been reviewed")) { // Example check
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to review report' });
            }
        }
    },
    // Get report history for the logged-in captain
    async getMyReportHistory(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            // No need to check role here as middleware should handle it
            const captainId = req.user.id;
            const reports = await report_1.ReportService.getReportsByCaptainId(captainId);
            res.status(200).json(reports);
        }
        catch (error) {
            console.error('Error fetching captain report history:', error);
            res.status(500).json({ error: 'Failed to fetch report history' });
        }
    },
    // Get all reports (admin only)
    async getAllReports(req, res) {
        try {
            // Middleware already ensures admin role
            // TODO: Add pagination/filtering query parameters (e.g., req.query.page, req.query.limit)
            const vesselId = req.query.vesselId;
            const reports = await report_1.ReportService.getAllReports(vesselId); // Call service method (to be created)
            res.status(200).json(reports);
        }
        catch (error) {
            console.error('Error fetching all reports:', error);
            res.status(500).json({ error: 'Failed to fetch all reports' });
        }
    },
    async exportMRVExcel(req, res) {
        try {
            const { voyageId } = req.params;
            if (!voyageId) {
                res.status(400).json({ error: 'Voyage ID is required' });
                return;
            }
            const excelBuffer = await excel_export_service_1.ExcelExportService.exportMRVExcel(voyageId);
            let fileName = `MRV_DCS_Report_Voyage_${voyageId.substring(0, 8)}.xlsx`; // Default filename
            const voyage = await voyage_model_1.default.findById(voyageId);
            if (voyage) {
                const vessel = await vessel_model_1.default.findById(voyage.vesselId);
                const vesselName = vessel?.name?.replace(/\s+/g, '_') || 'Vessel';
                const voyageNum = voyage.voyageNumber?.replace(/[\/\s]+/g, '_') || voyageId.substring(0, 8);
                fileName = `MRV_DCS_Report_${vesselName}_Voy${voyageNum}.xlsx`;
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(excelBuffer);
        }
        catch (error) {
            console.error('Error exporting MRV Excel:', error);
            if (error.message.includes("not found")) {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to export MRV Excel report' });
            }
        }
    }
};
// Note: We might need to export ReportType if used directly in controller validation
// export { ReportType }; 
exports.default = exports.ReportController;
