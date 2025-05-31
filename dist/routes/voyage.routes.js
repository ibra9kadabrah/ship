"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
// Import controller actions
const voyage_controller_1 = require("../controllers/voyage.controller");
const router = (0, express_1.Router)();
// GET /api/voyages/current/details - Fetch details of the captain's current active voyage
router.get('/current/details', auth_middleware_1.authenticate, // Ensure user is logged in
auth_middleware_1.authorizeCaptain, // Ensure user is a captain
voyage_controller_1.getCurrentVoyageDetails // Handle the request
);
// GET /api/voyages/current/state - Fetch the current logical state of the voyage
router.get('/current/state', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, voyage_controller_1.getCurrentVoyageState // Handle the request
);
// GET /api/voyages/carry-over-cargo/:vesselId - Fetch carry-over cargo details for a specific vessel
router.get('/carry-over-cargo/:vesselId', auth_middleware_1.authenticate, // Ensure user is logged in
// No specific role authorization here, as this might be used by different roles
// or the service/controller can handle finer-grained access if needed.
// If only captains should access this for *their* vessel,
// we might need a different authorization middleware or logic in the controller.
// For now, assuming any authenticated user can request this for any vesselId.
voyage_controller_1.getCarryOverCargo // Handle the request
);
// Add other voyage-related routes here if needed in the future
exports.default = router;
