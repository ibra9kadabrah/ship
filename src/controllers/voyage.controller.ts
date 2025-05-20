import { Request, Response, NextFunction } from 'express';
// Use default imports for the models
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model';
import ReportModel from '../models/report.model';
import VoyageService from '../services/voyage.service'; // Import the new service
// Use standard Request type; middleware modifies it globally
// import { AuthenticatedRequest } from '../middlewares/auth.middleware'; 

export const getCurrentVoyageDetails = async (req: Request, res: Response, next: NextFunction) => {
    // req.user is added by the authenticate middleware
    const userId = req.user?.id; 

    if (!userId) {
        // This should technically be caught by the authenticate middleware, but good practice
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        // 1. Find the captain's assigned vessel
        const vessel = await VesselModel.findByCaptainId(userId);
        if (!vessel) {
            return res.status(404).json({ message: 'No vessel assigned to this captain.' });
        }

        // 2. Find the active voyage for this vessel
        const activeVoyage = await VoyageModel.findActiveByVesselId(vessel.id);
        if (!activeVoyage) {
            return res.status(404).json({ message: 'No active voyage found for this vessel.' });
        }

        // 3. Find the approved Departure report associated with this active voyage
        // An active voyage should be initiated by an approved departure report.
        const departureReport = await ReportModel.findLatestApprovedDepartureReport(vessel.id);

        // Check if this departure report actually belongs to the identified activeVoyage
        if (!departureReport || departureReport.voyageId !== activeVoyage.id || departureReport.reportType !== 'departure') {
            console.error(`Inconsistent state: Active voyage ${activeVoyage.id} for vessel ${vessel.id} does not have a valid, approved departure report linked to it. Found departure report ID: ${departureReport?.id}, linked to voyage: ${departureReport?.voyageId}, type: ${departureReport?.reportType}`);
            return res.status(500).json({ message: 'Internal server error: Could not retrieve initial voyage details due to inconsistent voyage/report state.' });
        }

        // 4. Fetch the latest approved report for progress data (can be any type)
        const latestApprovedReport = await ReportModel.getLatestApprovedReportForVoyage(activeVoyage.id);

        // 5. Construct and send the response
        const voyageDetails = {
            vesselName: vessel.name,
            vesselImoNumber: vessel.imoNumber,
            vesselType: vessel.type, // Added vessel type
            vesselDeadweight: vessel.deadweight,
            voyageId: activeVoyage.id,
            departurePort: activeVoyage.departurePort,
            destinationPort: activeVoyage.destinationPort,
            voyageDistance: activeVoyage.voyageDistance, // Add total voyage distance
            actualDepartureDate: (departureReport as any).reportDate, // Add ATD Date
            actualDepartureTime: (departureReport as any).reportTime, // Add ATD Time
            etaDate: (departureReport as any).etaDate, // Get ETA from Departure Report
            etaTime: (departureReport as any).etaTime, // Get ETA from Departure Report
            initialCargoStatus: (departureReport as any).cargoStatus,
            totalDistanceTravelled: latestApprovedReport?.totalDistanceTravelled ?? 0,
            distanceToGo: latestApprovedReport?.distanceToGo ?? activeVoyage.voyageDistance, // Default to full distance if no progress
        };

        res.status(200).json(voyageDetails);

    } catch (error) {
        console.error('Error fetching current voyage details:', error);
        next(error); // Pass error to the global error handler
    }
};

// --- NEW Controller action to get the current voyage state ---
export const getCurrentVoyageState = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        // 1. Find the captain's assigned vessel
        const vessel = await VesselModel.findByCaptainId(userId);
        if (!vessel) {
            // If no vessel assigned, there's no voyage state to determine
            // Return a specific state or handle as needed by frontend
            return res.status(200).json({ voyageState: 'NO_VESSEL_ASSIGNED' }); // Or maybe 404? Discuss FE handling.
        }

        // 2. Get the voyage state from the service
        const voyageState = await VoyageService.getCurrentVoyageState(vessel.id);

        // 3. Send the response
        res.status(200).json({ voyageState });

    } catch (error) {
        console.error('Error fetching current voyage state:', error);
        next(error); // Pass error to the global error handler
    }
};


export const getCarryOverCargo = async (req: Request, res: Response, next: NextFunction) => {
    const vesselId = req.params.vesselId;

    if (!vesselId) {
        return res.status(400).json({ message: 'Vessel ID is required.' });
    }

    try {
        const cargoDetails = await VoyageService.getCarryOverCargoDetails(vesselId);
        if (!cargoDetails) {
            // It's not an error if no cargo is carried over, frontend can handle this
            return res.status(200).json(null);
        }
        res.status(200).json(cargoDetails);
    } catch (error) {
        console.error(`Error fetching carry-over cargo for vessel ${vesselId}:`, error);
        next(error);
    }
};
