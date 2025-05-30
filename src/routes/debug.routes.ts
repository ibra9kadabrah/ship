// src/routes/debug.routes.ts
import { Router } from 'express';
import { DebugController } from '../controllers/debug.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with authentication
// router.get('/distance-values', authenticate, DebugController.checkDistanceValues); // Temporarily disabled
// router.post('/fix-distance-values', authenticate, DebugController.fixDistanceValues); // Temporarily disabled
// router.get('/table-schema', authenticate, DebugController.checkTableSchema); // Temporarily disabled
// router.get('/recalculate-report-distance/:reportId', authenticate, DebugController.recalculateSingleReportDistances); // Temporarily disabled
router.get('/excel-data/:voyageId', authenticate, DebugController.getExcelDebugData); // New endpoint for Excel debug data

export default router;