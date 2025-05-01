import { Request, Response } from 'express';
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model'; // Import VoyageModel
import ReportModel from '../models/report.model'; // Import ReportModel
import { CreateVesselDTO, UpdateVesselDTO, Vessel } from '../types/vessel'; // Import Vessel type

export const VesselController = {
  // Create a new vessel
  createVessel(req: Request, res: Response): void {
    try {
      const vesselData: CreateVesselDTO = req.body;
      
      // Check if IMO number already exists
      const existingVessel = VesselModel.findByImo(vesselData.imoNumber);
      if (existingVessel) {
        res.status(400).json({ error: 'Vessel with this IMO number already exists' });
        return;
      }
      
      const vessel = VesselModel.create(vesselData);
      res.status(201).json(vessel);
    } catch (error) {
      console.error('Error creating vessel:', error);
      res.status(500).json({ error: 'Failed to create vessel' });
    }
  },
  
  // Get all vessels
  getAllVessels(req: Request, res: Response): void {
    try {
      const vessels = VesselModel.findAll();
      res.status(200).json(vessels);
    } catch (error) {
      console.error('Error fetching vessels:', error);
      res.status(500).json({ error: 'Failed to fetch vessels' });
    }
  },
  
  // Get vessel by ID
  getVesselById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const vessel = VesselModel.findById(id);
      
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
  updateVessel(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const vesselData: UpdateVesselDTO = req.body;
      
      // Check if vessel exists
      const existingVessel = VesselModel.findById(id);
      if (!existingVessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      // If IMO is being updated, check if it's unique
      if (vesselData.imoNumber && vesselData.imoNumber !== existingVessel.imoNumber) {
        const vesselWithImo = VesselModel.findByImo(vesselData.imoNumber);
        if (vesselWithImo) {
          res.status(400).json({ error: 'Vessel with this IMO number already exists' });
          return;
        }
      }
      
      const updatedVessel = VesselModel.update(id, vesselData);
      res.status(200).json(updatedVessel);
    } catch (error) {
      console.error('Error updating vessel:', error);
      res.status(500).json({ error: 'Failed to update vessel' });
    }
  },
  
  // Delete vessel
  deleteVessel(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      
      // Check if vessel exists
      const existingVessel = VesselModel.findById(id);
      if (!existingVessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      VesselModel.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting vessel:', error);
      res.status(500).json({ error: 'Failed to delete vessel' });
    }
  },
  
  // Search vessels
  searchVessels(req: Request, res: Response): void {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      
      const vessels = VesselModel.search(query);
      res.status(200).json(vessels);
    } catch (error) {
      console.error('Error searching vessels:', error);
      res.status(500).json({ error: 'Failed to search vessels' });
    }
  },

  // Get the vessel assigned to the currently logged-in captain
  getMyVessel(req: Request, res: Response): void {
    try {
      if (!req.user || req.user.role !== 'captain') {
        // This should ideally be caught by middleware, but double-check
        res.status(403).json({ error: 'Access denied. Only captains can access their assigned vessel.' });
        return;
      }
      
      const captainId = req.user.id;
      const vessel = VesselModel.findByCaptainId(captainId);
      
      if (!vessel) {
        // It's possible a captain isn't assigned a vessel yet
        res.status(404).json({ error: 'No active vessel assigned to this captain.' });
        return;
      }
      
      // Fetch the latest *approved departure report* for this vessel
      const latestApprovedDeparture = ReportModel.findLatestApprovedDepartureReport(vessel.id);
      // Get the destination port from that report, or null if none found
      const lastDestinationPort = (latestApprovedDeparture && 'destinationPort' in latestApprovedDeparture) 
                                    ? latestApprovedDeparture.destinationPort 
                                    : null;

      // Construct the response object including the last destination port
      const vesselInfoResponse = {
        ...vessel, // Include all original vessel fields
        lastDestinationPort: lastDestinationPort 
      };

      res.status(200).json(vesselInfoResponse);
    } catch (error) {
      console.error('Error fetching assigned vessel:', error);
      res.status(500).json({ error: 'Failed to fetch assigned vessel' });
    }
  }
};

export default VesselController;
