// src/routes/debug.routes.ts
import { Router } from 'express';
import DebugController from '../controllers/debug.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with authentication
router.get('/distance-values', authenticate, DebugController.checkDistanceValues);
router.post('/fix-distance-values', authenticate, DebugController.fixDistanceValues);
router.get('/table-schema', authenticate, DebugController.checkTableSchema);
router.get('/recalculate-report-distance/:reportId', authenticate, DebugController.recalculateSingleReportDistances); // Added

export default router;