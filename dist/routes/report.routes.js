"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/report.routes.ts
const express_1 = require("express");
const report_controller_1 = __importDefault(require("../controllers/report.controller"));
const report_modification_controller_1 = require("../controllers/report_modification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Captain routes
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, report_controller_1.default.submitReport);
router.get('/my-history', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, report_controller_1.default.getMyReportHistory); // Added route for captain's history
router.patch('/:id/resubmit', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, report_controller_1.default.resubmitReport); // Route for captain to resubmit a report with changes
// Office/admin routes
router.get('/pending', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_controller_1.default.getPendingReports);
// Allow Captains to also get a report by ID, e.g., for modification flow
// For now, allow any authenticated user. Stricter checks can be in service layer if needed.
router.get('/:id', auth_middleware_1.authenticate, report_controller_1.default.getReportById);
router.patch('/:id/review', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_controller_1.default.reviewReport); // Changed PUT to PATCH
// Admin/Office route to get all reports
router.get('/', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_controller_1.default.getAllReports); // Changed middleware
// Admin/Office route to export MRV Excel
router.get('/:voyageId/export-mrv-excel', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_controller_1.default.exportMRVExcel);
// Office Report Modification Routes
// The '/reports' prefix is handled by how this router is mounted in app.ts
router.post('/:reportId/preview-cascade', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_modification_controller_1.ReportModificationController.previewCascade);
router.post('/:reportId/modify-cascade', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, report_modification_controller_1.ReportModificationController.modifyWithCascade);
exports.default = router;
