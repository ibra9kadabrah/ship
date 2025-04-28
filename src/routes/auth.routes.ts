import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/initial-admin', AuthController.createInitialAdmin);

// Admin-only routes
router.post('/register', authenticate, authorizeAdmin, AuthController.register);

export default router;