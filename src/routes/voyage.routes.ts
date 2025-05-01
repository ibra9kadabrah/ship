import { Router } from 'express';
import { authenticate, authorizeCaptain } from '../middlewares/auth.middleware';
// Import both controller actions
import { getCurrentVoyageDetails, getCurrentVoyageState } from '../controllers/voyage.controller'; 

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

// Add other voyage-related routes here if needed in the future

export default router;
