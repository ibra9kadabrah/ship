// src/routes/report.routes.ts
import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { authenticate, authorizeAdmin, authorizeOffice, authorizeCaptain } from '../middlewares/auth.middleware';

const router = Router();

// Captain routes
router.post('/', authenticate, authorizeCaptain, ReportController.submitReport); 
router.get('/my-history', authenticate, authorizeCaptain, ReportController.getMyReportHistory); // Added route for captain's history

// Office/admin routes
router.get('/pending', authenticate, authorizeOffice, ReportController.getPendingReports);
router.get('/:id', authenticate, authorizeOffice, ReportController.getReportById);
router.patch('/:id/review', authenticate, authorizeOffice, ReportController.reviewReport); // Changed PUT to PATCH

// Admin/Office route to get all reports
router.get('/', authenticate, authorizeOffice, ReportController.getAllReports); // Changed middleware

// Admin/Office route to export MRV Excel
router.get('/:voyageId/export-mrv-excel', authenticate, authorizeOffice, ReportController.exportMRVExcel);

export default router;
