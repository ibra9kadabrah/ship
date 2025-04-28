// src/models/report.model.ts
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { Report, CreateDepartureReportDTO, ReportType, ReportStatus, ReviewReportDTO, EngineUnitData, AuxEngineData } from '../types/report';
import VoyageModel from './voyage.model';
import VesselModel from './vessel.model';
import ReportEngineUnitModel from './report_engine_unit.model'; // Import new model
import ReportAuxEngineModel from './report_aux_engine.model';   // Import new model

// Helper function to check if all required Initial ROBs are present
function hasAllInitialRobs(data: CreateDepartureReportDTO): boolean {
  return data.initialRobLsifo !== undefined && data.initialRobLsifo !== null &&
         data.initialRobLsmgo !== undefined && data.initialRobLsmgo !== null &&
         data.initialRobCylOil !== undefined && data.initialRobCylOil !== null &&
         data.initialRobMeOil !== undefined && data.initialRobMeOil !== null &&
         data.initialRobAeOil !== undefined && data.initialRobAeOil !== null;
}

export const ReportModel = {
  // Create a departure report (and potentially a new voyage)
  createDepartureReport(reportData: CreateDepartureReportDTO, captainId: string): Report {
    const id = uuidv4();
    const now = new Date().toISOString();

    // --- 1. Fetch Vessel Data ---
    const vessel = VesselModel.findById(reportData.vesselId);
    if (!vessel) {
      throw new Error(`Vessel with ID ${reportData.vesselId} not found.`);
    }

    // --- 2. Create Voyage (if needed - currently always creates one for departure) ---
    // In a future refactor, might check for existing active voyage first
    const voyageData = {
      vesselId: reportData.vesselId,
      departurePort: reportData.departurePort,
      destinationPort: reportData.destinationPort,
      voyageDistance: reportData.voyageDistance,
      startDate: reportData.reportDate
    };
    const voyage = VoyageModel.create(voyageData);

    // --- 3. Determine Previous ROB ---
    const isFirstReportForVessel = vessel.initialRobLsifo === null; // Check one field is enough
    const previousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };

    if (isFirstReportForVessel) {
      // --- 3a. Handle First Report for Vessel ---
      if (!hasAllInitialRobs(reportData)) {
        throw new Error("Initial ROB values (LSIFO, LSMGO, CylOil, MeOil, AeOil) are required for the first report of this vessel.");
      }
      const initialRobData = {
        initialRobLsifo: reportData.initialRobLsifo,
        initialRobLsmgo: reportData.initialRobLsmgo,
        initialRobCylOil: reportData.initialRobCylOil,
        initialRobMeOil: reportData.initialRobMeOil,
        initialRobAeOil: reportData.initialRobAeOil,
      };
      const robUpdated = VesselModel.updateInitialRob(vessel.id, initialRobData);
      if (!robUpdated) {
        throw new Error(`Failed to update initial ROB for vessel ${vessel.id}.`);
      }
      // Use the input initial ROBs as the starting point
      previousRob.lsifo = reportData.initialRobLsifo ?? 0;
      previousRob.lsmgo = reportData.initialRobLsmgo ?? 0;
      previousRob.cylOil = reportData.initialRobCylOil ?? 0;
      previousRob.meOil = reportData.initialRobMeOil ?? 0;
      previousRob.aeOil = reportData.initialRobAeOil ?? 0;
    } else {
      // --- 3b. Handle Subsequent Reports ---
      const previousReport = this.getLatestReportForVoyage(voyage.id); // Get latest for *this* voyage
      if (previousReport) {
        // Use Current ROB from the previous report
        previousRob.lsifo = previousReport.currentRobLsifo ?? 0;
        previousRob.lsmgo = previousReport.currentRobLsmgo ?? 0;
        previousRob.cylOil = previousReport.currentRobCylOil ?? 0;
        previousRob.meOil = previousReport.currentRobMeOil ?? 0;
        previousRob.aeOil = previousReport.currentRobAeOil ?? 0;
      } else {
         // This case handles the first report of a *subsequent* voyage for the vessel
         // Use the stored Initial ROB from the vessel record
         const updatedVessel = VesselModel.findById(reportData.vesselId); // Re-fetch vessel in case ROB was just updated
         previousRob.lsifo = updatedVessel?.initialRobLsifo ?? 0;
         previousRob.lsmgo = updatedVessel?.initialRobLsmgo ?? 0;
         previousRob.cylOil = updatedVessel?.initialRobCylOil ?? 0;
         previousRob.meOil = updatedVessel?.initialRobMeOil ?? 0;
         previousRob.aeOil = updatedVessel?.initialRobAeOil ?? 0;
      }
    }

    // --- 4. Calculate Distance Fields ---
    const totalDistanceTravelled = (reportData.harbourDistance || 0) + (reportData.distanceSinceLastReport || 0);
    const distanceToGo = (voyage.voyageDistance || 0) - totalDistanceTravelled;

    // --- 5. Calculate Bunker Consumptions and Current ROBs ---
    const totalConsumptionLsifo = (reportData.meConsumptionLsifo || 0) + (reportData.boilerConsumptionLsifo || 0) + (reportData.auxConsumptionLsifo || 0);
    const totalConsumptionLsmgo = (reportData.meConsumptionLsmgo || 0) + (reportData.boilerConsumptionLsmgo || 0) + (reportData.auxConsumptionLsmgo || 0);
    const totalConsumptionCylOil = (reportData.meConsumptionCylOil || 0); // Only ME
    const totalConsumptionMeOil = (reportData.meConsumptionMeOil || 0);   // Only ME
    const totalConsumptionAeOil = (reportData.meConsumptionAeOil || 0);   // Only ME

    const currentRobLsifo = previousRob.lsifo - totalConsumptionLsifo + (reportData.supplyLsifo || 0);
    const currentRobLsmgo = previousRob.lsmgo - totalConsumptionLsmgo + (reportData.supplyLsmgo || 0);
    const currentRobCylOil = previousRob.cylOil - totalConsumptionCylOil + (reportData.supplyCylOil || 0);
    const currentRobMeOil = previousRob.meOil - totalConsumptionMeOil + (reportData.supplyMeOil || 0);
    const currentRobAeOil = previousRob.aeOil - totalConsumptionAeOil + (reportData.supplyAeOil || 0);

    // --- 6. Create the Report Record and Related Machinery Data within a Transaction ---
    const createReportTransaction = db.transaction(() => {
      const reportStmt = db.prepare(`
        INSERT INTO reports (
          id, voyageId, vesselId, reportType, status, captainId,
          reportDate, reportTime, timeZone,
          departurePort, destinationPort, voyageDistance, etaDate, etaTime, fwdDraft, aftDraft, -- Added Drafts
          cargoQuantity, cargoType, cargoStatus, 
          faspDate, faspTime, faspLatitude, faspLongitude, faspCourse, 
          harbourDistance, harbourTime, distanceSinceLastReport, 
          totalDistanceTravelled, distanceToGo, 
          windDirection, seaDirection, swellDirection, windForce, seaState, swellHeight,
          -- Bunker Consumptions
          meConsumptionLsifo, meConsumptionLsmgo, meConsumptionCylOil, meConsumptionMeOil, meConsumptionAeOil,
          boilerConsumptionLsifo, boilerConsumptionLsmgo, auxConsumptionLsifo, auxConsumptionLsmgo,
          -- Bunker Supplies
          supplyLsifo, supplyLsmgo, supplyCylOil, supplyMeOil, supplyAeOil,
          -- Calculated Bunkers
          totalConsumptionLsifo, totalConsumptionLsmgo, totalConsumptionCylOil, totalConsumptionMeOil, totalConsumptionAeOil,
          currentRobLsifo, currentRobLsmgo, currentRobCylOil, currentRobMeOil, currentRobAeOil,
          -- ME Params
          meFoPressure, meLubOilPressure, meFwInletTemp, meLoInletTemp, meScavengeAirTemp, 
          meTcRpm1, meTcRpm2, meTcExhaustTempIn, meTcExhaustTempOut, meThrustBearingTemp, meDailyRunHours,
          createdAt, updatedAt
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? 
        ) -- 72 placeholders total
      `);
      
      reportStmt.run(
      // Basic Info (1-6)
      id, voyage.id, reportData.vesselId, 'departure' as ReportType, 'pending' as ReportStatus, captainId,
      // General Info (7-9)
      reportData.reportDate, reportData.reportTime, reportData.timeZone,
      // Voyage Data (10-16)
      reportData.departurePort, reportData.destinationPort, reportData.voyageDistance, reportData.etaDate, reportData.etaTime, reportData.fwdDraft ?? null, reportData.aftDraft ?? null,
      // Cargo Info (17-19)
      reportData.cargoQuantity ?? null, reportData.cargoType ?? null, reportData.cargoStatus ?? null,   
      // FASP Data (20-24)
      reportData.faspDate ?? null, reportData.faspTime ?? null, reportData.faspLatitude ?? null, reportData.faspLongitude ?? null, reportData.faspCourse ?? null,
      // Distance Data (23-27)
      reportData.harbourDistance ?? null, reportData.harbourTime ?? null, reportData.distanceSinceLastReport ?? null, totalDistanceTravelled, distanceToGo,
      // Weather Data (28-33)
      reportData.windDirection ?? null, reportData.seaDirection ?? null, reportData.swellDirection ?? null, reportData.windForce ?? null, reportData.seaState ?? null, reportData.swellHeight ?? null,
      // Bunker Consumptions (34-42)
      reportData.meConsumptionLsifo ?? null, reportData.meConsumptionLsmgo ?? null, reportData.meConsumptionCylOil ?? null, reportData.meConsumptionMeOil ?? null, reportData.meConsumptionAeOil ?? null,
      reportData.boilerConsumptionLsifo ?? null, reportData.boilerConsumptionLsmgo ?? null, reportData.auxConsumptionLsifo ?? null, reportData.auxConsumptionLsmgo ?? null,
      // Bunker Supplies (43-47)
      reportData.supplyLsifo ?? null, reportData.supplyLsmgo ?? null, reportData.supplyCylOil ?? null, reportData.supplyMeOil ?? null, reportData.supplyAeOil ?? null,
      // Calculated Bunkers (48-57)
      totalConsumptionLsifo, totalConsumptionLsmgo, totalConsumptionCylOil, totalConsumptionMeOil, totalConsumptionAeOil,
      currentRobLsifo, currentRobLsmgo, currentRobCylOil, currentRobMeOil, currentRobAeOil,
      // Bunker Consumptions (34-42)
      reportData.meConsumptionLsifo ?? null, reportData.meConsumptionLsmgo ?? null, reportData.meConsumptionCylOil ?? null, reportData.meConsumptionMeOil ?? null, reportData.meConsumptionAeOil ?? null,
      reportData.boilerConsumptionLsifo ?? null, reportData.boilerConsumptionLsmgo ?? null, reportData.auxConsumptionLsifo ?? null, reportData.auxConsumptionLsmgo ?? null,
      // Bunker Supplies (43-47)
      reportData.supplyLsifo ?? null, reportData.supplyLsmgo ?? null, reportData.supplyCylOil ?? null, reportData.supplyMeOil ?? null, reportData.supplyAeOil ?? null,
      // Calculated Bunkers (48-57)
      totalConsumptionLsifo, totalConsumptionLsmgo, totalConsumptionCylOil, totalConsumptionMeOil, totalConsumptionAeOil,
      currentRobLsifo, currentRobLsmgo, currentRobCylOil, currentRobMeOil, currentRobAeOil,
      // ME Params (58-68)
      reportData.meFoPressure ?? null, reportData.meLubOilPressure ?? null, reportData.meFwInletTemp ?? null, reportData.meLoInletTemp ?? null, reportData.meScavengeAirTemp ?? null,
      reportData.meTcRpm1 ?? null, reportData.meTcRpm2 ?? null, reportData.meTcExhaustTempIn ?? null, reportData.meTcExhaustTempOut ?? null, reportData.meThrustBearingTemp ?? null, reportData.meDailyRunHours ?? null,
      // Timestamps (71-72)
      now, now
      );

      // Insert Engine Units if provided
      if (reportData.engineUnits && reportData.engineUnits.length > 0) {
        const unitsSuccess = ReportEngineUnitModel.createMany(id, reportData.engineUnits);
        if (!unitsSuccess) {
          // Error is logged in createMany, transaction will roll back
          throw new Error(`Failed to create engine units for report ${id}`); 
        }
      }

      // Insert Aux Engines if provided
      if (reportData.auxEngines && reportData.auxEngines.length > 0) {
        const auxSuccess = ReportAuxEngineModel.createMany(id, reportData.auxEngines);
         if (!auxSuccess) {
          // Error is logged in createMany, transaction will roll back
          throw new Error(`Failed to create aux engines for report ${id}`);
        }
      }
      // If we reach here, all insertions were successful
    }); // End of transaction definition

    try {
      createReportTransaction(); // Execute the transaction
      // Fetch the complete report data including related units/engines
      return this.findById(id) as Report; 
    } catch (error) {
       console.error(`Transaction failed for creating report ${id}:`, error);
       // Re-throw or handle as appropriate for the controller
       throw error; 
    }
  },
  
  // Find report by ID (ensure all columns are selected)
  findById(id: string): Report | null {
    const stmt = db.prepare(`SELECT * FROM reports WHERE id = ?`); 
    const report = stmt.get(id) as Report | undefined;

    if (report) {
      // Fetch and attach related machinery data
      report.engineUnits = ReportEngineUnitModel.findByReportId(id);
      report.auxEngines = ReportAuxEngineModel.findByReportId(id);
    }
    
    return report || null;
  },
  
  // Get pending reports
  // Get pending reports (ensure all columns are selected)
  getPendingReports(): Report[] {
    const stmt = db.prepare(`SELECT * FROM reports WHERE status = ? ORDER BY createdAt DESC`);
    return stmt.all('pending') as Report[];
  },
  
  // Review a report (approve or reject)
  reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Report | null {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE reports
      SET status = ?, reviewerId = ?, reviewDate = ?, reviewComments = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      reviewData.status,
      reviewerId,
      now,
      reviewData.reviewComments || '',
      now,
      id
    );
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.findById(id);
  },
  
  // Check if captain has pending reports for a vessel
  hasPendingReports(captainId: string, vesselId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reports 
      WHERE captainId = ? AND vesselId = ? AND status = ?
    `);
    
    const result = stmt.get(captainId, vesselId, 'pending') as { count: number };
    return result.count > 0;
  },
  
  // Get most recent report for a voyage
  // Get most recent report for a voyage (ensure all columns are selected)
  getLatestReportForVoyage(voyageId: string): Report | null {
    const stmt = db.prepare(`
      SELECT * FROM reports 
      WHERE voyageId = ? 
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
      LIMIT 1
    `);
    
    const report = stmt.get(voyageId) as Report | undefined;

    // Note: We might not need the full machinery details for the *previous* report
    // when calculating ROBs. If performance becomes an issue, we could optimize 
    // this to only select necessary fields (like currentRob...). 
    // For now, fetching the full previous report is simpler.
    if (report) {
      report.engineUnits = ReportEngineUnitModel.findByReportId(report.id);
      report.auxEngines = ReportAuxEngineModel.findByReportId(report.id);
    }

    return report || null;
  },

  // Get most recent report for a specific vessel (across all voyages)
  // Useful for checking if it's the vessel's first report ever
  // Get most recent report for a specific vessel (across all voyages)
  // Useful for checking if it's the vessel's first report ever
  // Note: This probably doesn't need the full machinery details attached.
  getLatestReportForVessel(vesselId: string): Report | null {
     const stmt = db.prepare(`
      SELECT * FROM reports -- Select only necessary fields if optimizing later
      WHERE vesselId = ? 
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
      LIMIT 1
    `);
    const report = stmt.get(vesselId) as Report | undefined;
    // Intentionally not fetching units/aux engines here unless needed
    return report || null;
  }

};

export default ReportModel;
