import { Router } from 'express';
import { authenticate, authorizeCaptain } from '../middlewares/auth.middleware';
// Import controller actions
import { getCurrentVoyageDetails, getCurrentVoyageState, getCarryOverCargo } from '../controllers/voyage.controller';

const router = Router();

// GET /api/voyages/current/details - Fetch details of the captain's current active voyage
router.get(
    '/current/details',
    authenticate,      // Ensure user is logged in
    authorizeCaptain,  // Ensure user is a captain
    getCurrentVoyageDetails // Handle the request
);

// GET /api/voyages/current/state - Fetch the current logical state of the voyage
router.get(
    '/current/state',
    authenticate,
    authorizeCaptain,
    getCurrentVoyageState // Handle the request
);

// GET /api/voyages/carry-over-cargo/:vesselId - Fetch carry-over cargo details for a specific vessel
router.get(
    '/carry-over-cargo/:vesselId',
    authenticate,      // Ensure user is logged in
    // No specific role authorization here, as this might be used by different roles
    // or the service/controller can handle finer-grained access if needed.
    // If only captains should access this for *their* vessel,
    // we might need a different authorization middleware or logic in the controller.
    // For now, assuming any authenticated user can request this for any vesselId.
    getCarryOverCargo  // Handle the request
);

// Add other voyage-related routes here if needed in the future

export default router;
