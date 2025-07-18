import { Request, Response } from 'express';
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model'; // Import VoyageModel
import ReportModel from '../models/report.model'; // Import ReportModel
import { CreateVesselDTO, UpdateVesselDTO, Vessel } from '../types/vessel'; // Import Vessel type
import { VoyageLifecycleService } from '../services/voyage_lifecycle.service'; // Added

export const VesselController = {
  // Create a new vessel
  async createVessel(req: Request, res: Response): Promise<void> {
    try {
      const vesselData: CreateVesselDTO = req.body;
      
      // Check if IMO number already exists
      const existingVessel = await VesselModel.findByImo(vesselData.imoNumber);
      if (existingVessel) {
        res.status(400).json({ error: 'Vessel with this IMO number already exists' });
        return;
      }
      
      const vessel = await VesselModel.create(vesselData);
      res.status(201).json(vessel);
    } catch (error) {
      console.error('Error creating vessel:', error);
      res.status(500).json({ error: 'Failed to create vessel' });
    }
  },
  
  // Get all vessels
  async getAllVessels(req: Request, res: Response): Promise<void> {
    try {
      const vessels = await VesselModel.findAll();
      res.status(200).json(vessels);
    } catch (error) {
      console.error('Error fetching vessels:', error);
      res.status(500).json({ error: 'Failed to fetch vessels' });
    }
  },
  
  // Get vessel by ID
  async getVesselById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vessel = await VesselModel.findById(id);
      
      if (!vessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      res.status(200).json(vessel);
    } catch (error) {
      console.error('Error fetching vessel:', error);
      res.status(500).json({ error: 'Failed to fetch vessel' });
    }
  },
  
  // Update vessel
  async updateVessel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vesselData: UpdateVesselDTO = req.body;
      
      // Check if vessel exists
      const existingVessel = await VesselModel.findById(id);
      if (!existingVessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      // If IMO is being updated, check if it's unique
      if (vesselData.imoNumber && vesselData.imoNumber !== existingVessel.imoNumber) {
        const vesselWithImo = await VesselModel.findByImo(vesselData.imoNumber);
        if (vesselWithImo) {
          res.status(400).json({ error: 'Vessel with this IMO number already exists' });
          return;
        }
      }
      
      const updatedVessel = await VesselModel.update(id, vesselData);
      res.status(200).json(updatedVessel);
    } catch (error) {
      console.error('Error updating vessel:', error);
      res.status(500).json({ error: 'Failed to update vessel' });
    }
  },
  
  // Delete vessel
  async deleteVessel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if vessel exists
      const existingVessel = await VesselModel.findById(id);
      if (!existingVessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      await VesselModel.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting vessel:', error);
      res.status(500).json({ error: 'Failed to delete vessel' });
    }
  },
  
  // Search vessels
  async searchVessels(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      
      const vessels = await VesselModel.search(query);
      res.status(200).json(vessels);
    } catch (error) {
      console.error('Error searching vessels:', error);
      res.status(500).json({ error: 'Failed to search vessels' });
    }
  },

  // Get the vessel assigned to the currently logged-in captain
  async getMyVessel(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'captain') {
        res.status(403).json({ error: 'Access denied. Only captains can access their assigned vessel.' });
        return;
      }
      
      const captainId = req.user.id;
      const vessel = await VesselModel.findByCaptainId(captainId);
      
      if (!vessel) {
        res.status(404).json({ error: 'No active vessel assigned to this captain.' });
        return;
      }
      
      const latestApprovedDeparture = await ReportModel.findLatestApprovedDepartureReport(vessel.id);
      const lastDestinationPort = (latestApprovedDeparture && 'destinationPort' in latestApprovedDeparture) 
                                    ? latestApprovedDeparture.destinationPort 
                                    : null;

      let previousNoonPassageState = null;
      const activeVoyage = await VoyageModel.findActiveByVesselId(vessel.id);
      if (activeVoyage) {
        const latestNoonReport = await ReportModel.getLatestNoonReportForVoyage(activeVoyage.id);
        if (latestNoonReport) {
          previousNoonPassageState = latestNoonReport.passageState ?? null;
        }
      }

      const vesselInfoResponse = {
        ...vessel,
        lastDestinationPort: lastDestinationPort,
        previousNoonPassageState: previousNoonPassageState
      };

      res.status(200).json(vesselInfoResponse);
    } catch (error) {
      console.error('Error fetching assigned vessel:', error);
      res.status(500).json({ error: 'Failed to fetch assigned vessel' });
    }
  },

  // Get final cargo and ROB state from the latest completed voyage for a vessel
  async getPreviousVoyageFinalState(req: Request, res: Response): Promise<void> {
    try {
      const { vesselId } = req.params;
      if (!vesselId) {
        res.status(400).json({ error: 'Vessel ID is required' });
        return;
      }

      const finalState = await VoyageLifecycleService.findLatestCompletedVoyageFinalState(vesselId);

      if (!finalState) {
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
    } catch (error) {
      console.error('Error fetching previous voyage final state:', error);
      res.status(500).json({ error: 'Failed to fetch previous voyage final state' });
    }
  }
};

export default VesselController;
