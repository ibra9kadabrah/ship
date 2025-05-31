"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', auth_controller_1.default.login);
router.post('/initial-admin', auth_controller_1.default.createInitialAdmin);
// Admin-only routes
router.post('/register', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, auth_controller_1.default.register);
router.get('/users', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, auth_controller_1.default.getUsersByRole); // Added route to get users by role
exports.default = router;
