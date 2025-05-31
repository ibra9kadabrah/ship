"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/debug.routes.ts
const express_1 = require("express");
const debug_controller_1 = require("../controllers/debug.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all routes with authentication
// router.get('/distance-values', authenticate, DebugController.checkDistanceValues); // Temporarily disabled
// router.post('/fix-distance-values', authenticate, DebugController.fixDistanceValues); // Temporarily disabled
// router.get('/table-schema', authenticate, DebugController.checkTableSchema); // Temporarily disabled
// router.get('/recalculate-report-distance/:reportId', authenticate, DebugController.recalculateSingleReportDistances); // Temporarily disabled
router.get('/excel-data/:voyageId', auth_middleware_1.authenticate, debug_controller_1.DebugController.getExcelDebugData); // New endpoint for Excel debug data
exports.default = router;
