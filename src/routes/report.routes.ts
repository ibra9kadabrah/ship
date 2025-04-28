// src/routes/report.routes.ts
import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { authenticate, authorizeAdmin, authorizeOffice, authorizeCaptain } from '../middlewares/auth.middleware';

const router = Router();

// Captain routes
// Changed from /departure to / and using the unified submitReport method
router.post('/', authenticate, authorizeCaptain, ReportController.submitReport); 

// Office/admin routes
router.get('/pending', authenticate, authorizeOffice, ReportController.getPendingReports);
router.get('/:id', authenticate, authorizeOffice, ReportController.getReportById);
router.put('/:id/review', authenticate, authorizeOffice, ReportController.reviewReport);

export default router;
