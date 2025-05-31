"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vessel_controller_1 = __importDefault(require("../controllers/vessel.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware"); // Added authorizeCaptain
const router = (0, express_1.Router)();
// Admin-only routes (create, update, delete)
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, vessel_controller_1.default.createVessel);
router.put('/:id', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, vessel_controller_1.default.updateVessel);
router.delete('/:id', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, vessel_controller_1.default.deleteVessel);
// Office and admin routes (read)
router.get('/', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, vessel_controller_1.default.getAllVessels);
router.get('/search', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, vessel_controller_1.default.searchVessels);
router.get('/my-vessel', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, vessel_controller_1.default.getMyVessel); // Added route for captain's vessel
router.get('/:vesselId/previous-voyage-final-state', auth_middleware_1.authenticate, auth_middleware_1.authorizeCaptain, vessel_controller_1.default.getPreviousVoyageFinalState); // Added new route
router.get('/:id', auth_middleware_1.authenticate, auth_middleware_1.authorizeOffice, vessel_controller_1.default.getVesselById);
exports.default = router;
