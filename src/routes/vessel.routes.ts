import { Router } from 'express';
import VesselController from '../controllers/vessel.controller';
import { authenticate, authorizeAdmin, authorizeOffice, authorizeCaptain } from '../middlewares/auth.middleware'; // Added authorizeCaptain

const router = Router();

// Admin-only routes (create, update, delete)
router.post('/', authenticate, authorizeAdmin, VesselController.createVessel);
router.put('/:id', authenticate, authorizeAdmin, VesselController.updateVessel);
router.delete('/:id', authenticate, authorizeAdmin, VesselController.deleteVessel);

// Office and admin routes (read)
router.get('/', authenticate, authorizeOffice, VesselController.getAllVessels);
router.get('/search', authenticate, authorizeOffice, VesselController.searchVessels);
router.get('/my-vessel', authenticate, authorizeCaptain, VesselController.getMyVessel); // Added route for captain's vessel
router.get('/:vesselId/previous-voyage-final-state', authenticate, authorizeCaptain, VesselController.getPreviousVoyageFinalState); // Added new route
router.get('/:id', authenticate, authorizeOffice, VesselController.getVesselById);

export default router;
