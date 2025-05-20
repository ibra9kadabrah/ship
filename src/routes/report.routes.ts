// src/routes/report.routes.ts
import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { authenticate, authorizeAdmin, authorizeOffice, authorizeCaptain } from '../middlewares/auth.middleware';

const router = Router();

// Captain routes
router.post('/', authenticate, authorizeCaptain, ReportController.submitReport); 
router.get('/my-history', authenticate, authorizeCaptain, ReportController.getMyReportHistory); // Added route for captain's history
router.patch('/:id/resubmit', authenticate, authorizeCaptain, ReportController.resubmitReport); // Route for captain to resubmit a report with changes

// Office/admin routes
router.get('/pending', authenticate, authorizeOffice, ReportController.getPendingReports);
// Allow Captains to also get a report by ID, e.g., for modification flow
// For now, allow any authenticated user. Stricter checks can be in service layer if needed.
router.get('/:id', authenticate, ReportController.getReportById);
router.patch('/:id/review', authenticate, authorizeOffice, ReportController.reviewReport); // Changed PUT to PATCH

// Admin/Office route to get all reports
router.get('/', authenticate, authorizeOffice, ReportController.getAllReports); // Changed middleware

// Admin/Office route to export MRV Excel
router.get('/:voyageId/export-mrv-excel', authenticate, authorizeOffice, ReportController.exportMRVExcel);

export default router;
