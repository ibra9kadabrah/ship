import { Router } from 'express';
import VesselController from '../controllers/vessel.controller';
import { authenticate, authorizeAdmin, authorizeOffice } from '../middlewares/auth.middleware';

const router = Router();

// Admin-only routes (create, update, delete)
router.post('/', authenticate, authorizeAdmin, VesselController.createVessel);
router.put('/:id', authenticate, authorizeAdmin, VesselController.updateVessel);
router.delete('/:id', authenticate, authorizeAdmin, VesselController.deleteVessel);

// Office and admin routes (read)
router.get('/', authenticate, authorizeOffice, VesselController.getAllVessels);
router.get('/search', authenticate, authorizeOffice, VesselController.searchVessels);
router.get('/:id', authenticate, authorizeOffice, VesselController.getVesselById);

export default router;