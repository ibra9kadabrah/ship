"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VesselController = void 0;
const vessel_model_1 = __importDefault(require("../models/vessel.model"));
const voyage_model_1 = __importDefault(require("../models/voyage.model")); // Import VoyageModel
const report_model_1 = __importDefault(require("../models/report.model")); // Import ReportModel
const voyage_lifecycle_service_1 = require("../services/voyage_lifecycle.service"); // Added
exports.VesselController = {
    // Create a new vessel
    createVessel(req, res) {
        try {
            const vesselData = req.body;
            // Check if IMO number already exists
            const existingVessel = vessel_model_1.default.findByImo(vesselData.imoNumber);
            if (existingVessel) {
                res.status(400).json({ error: 'Vessel with this IMO number already exists' });
                return;
            }
            const vessel = vessel_model_1.default.create(vesselData);
            res.status(201).json(vessel);
        }
        catch (error) {
            console.error('Error creating vessel:', error);
            res.status(500).json({ error: 'Failed to create vessel' });
        }
    },
    // Get all vessels
    getAllVessels(req, res) {
        try {
            const vessels = vessel_model_1.default.findAll();
            res.status(200).json(vessels);
        }
        catch (error) {
            console.error('Error fetching vessels:', error);
            res.status(500).json({ error: 'Failed to fetch vessels' });
        }
    },
    // Get vessel by ID
    getVesselById(req, res) {
        try {
            const { id } = req.params;
            const vessel = vessel_model_1.default.findById(id);
            if (!vessel) {
                res.status(404).json({ error: 'Vessel not found' });
                return;
            }
            res.status(200).json(vessel);
        }
        catch (error) {
            console.error('Error fetching vessel:', error);
            res.status(500).json({ error: 'Failed to fetch vessel' });
        }
    },
    // Update vessel
    updateVessel(req, res) {
        try {
            const { id } = req.params;
            const vesselData = req.body;
            // Check if vessel exists
            const existingVessel = vessel_model_1.default.findById(id);
            if (!existingVessel) {
                res.status(404).json({ error: 'Vessel not found' });
                return;
            }
            // If IMO is being updated, check if it's unique
            if (vesselData.imoNumber && vesselData.imoNumber !== existingVessel.imoNumber) {
                const vesselWithImo = vessel_model_1.default.findByImo(vesselData.imoNumber);
                if (vesselWithImo) {
                    res.status(400).json({ error: 'Vessel with this IMO number already exists' });
                    return;
                }
            }
            const updatedVessel = vessel_model_1.default.update(id, vesselData);
            res.status(200).json(updatedVessel);
        }
        catch (error) {
            console.error('Error updating vessel:', error);
            res.status(500).json({ error: 'Failed to update vessel' });
        }
    },
    // Delete vessel
    deleteVessel(req, res) {
        try {
            const { id } = req.params;
            // Check if vessel exists
            const existingVessel = vessel_model_1.default.findById(id);
            if (!existingVessel) {
                res.status(404).json({ error: 'Vessel not found' });
                return;
            }
            vessel_model_1.default.delete(id);
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting vessel:', error);
            res.status(500).json({ error: 'Failed to delete vessel' });
        }
    },
    // Search vessels
    searchVessels(req, res) {
        try {
            const { query } = req.query;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Search query is required' });
                return;
            }
            const vessels = vessel_model_1.default.search(query);
            res.status(200).json(vessels);
        }
        catch (error) {
            console.error('Error searching vessels:', error);
            res.status(500).json({ error: 'Failed to search vessels' });
        }
    },
    // Get the vessel assigned to the currently logged-in captain
    getMyVessel(req, res) {
        try {
            if (!req.user || req.user.role !== 'captain') {
                // This should ideally be caught by middleware, but double-check
                res.status(403).json({ error: 'Access denied. Only captains can access their assigned vessel.' });
                return;
            }
            const captainId = req.user.id;
            const vessel = vessel_model_1.default.findByCaptainId(captainId);
            if (!vessel) {
                // It's possible a captain isn't assigned a vessel yet
                res.status(404).json({ error: 'No active vessel assigned to this captain.' });
                return;
            }
            // Fetch the latest *approved departure report* for this vessel
            const latestApprovedDeparture = report_model_1.default.findLatestApprovedDepartureReport(vessel.id);
            // Get the destination port from that report, or null if none found
            const lastDestinationPort = (latestApprovedDeparture && 'destinationPort' in latestApprovedDeparture)
                ? latestApprovedDeparture.destinationPort
                : null;
            // --- Fetch previous Noon state for the active voyage ---
            let previousNoonPassageState = null;
            const activeVoyage = voyage_model_1.default.findActiveByVesselId(vessel.id);
            if (activeVoyage) {
                const latestNoonReport = report_model_1.default.getLatestNoonReportForVoyage(activeVoyage.id);
                if (latestNoonReport) {
                    previousNoonPassageState = latestNoonReport.passageState ?? null;
                }
            }
            // --- End Fetch previous Noon state ---
            // Construct the response object including the last destination port and previous noon state
            const vesselInfoResponse = {
                ...vessel, // Include all original vessel fields
                lastDestinationPort: lastDestinationPort,
                previousNoonPassageState: previousNoonPassageState // Add the fetched state
            };
            res.status(200).json(vesselInfoResponse);
        }
        catch (error) {
            console.error('Error fetching assigned vessel:', error);
            res.status(500).json({ error: 'Failed to fetch assigned vessel' });
        }
    },
    // Get final cargo and ROB state from the latest completed voyage for a vessel
    async getPreviousVoyageFinalState(req, res) {
        try {
            const { vesselId } = req.params;
            if (!vesselId) {
                res.status(400).json({ error: 'Vessel ID is required' });
                return;
            }
            const finalState = await voyage_lifecycle_service_1.VoyageLifecycleService.findLatestCompletedVoyageFinalState(vesselId);
            if (!finalState) {
                // Not an error, could be the first voyage or no completed voyages yet
                res.status(200).json({
                    message: 'No previous completed voyage final state found.',
                    cargoQuantity: null,
                    cargoType: null,
                    cargoStatus: null,
                    finalRobLsifo: null,
                    finalRobLsmgo: null,
                    finalRobCylOil: null,
                    finalRobMeOil: null,
                    finalRobAeOil: null,
                });
                return;
            }
            res.status(200).json(finalState);
        }
        catch (error) {
            console.error('Error fetching previous voyage final state:', error);
            res.status(500).json({ error: 'Failed to fetch previous voyage final state' });
        }
    }
};
exports.default = exports.VesselController;
