// src/models/voyage.model.ts
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { Voyage, CreateVoyageDTO, VoyageStatus, VoyageWithCargo } from '../types/voyage';
import ReportModel, { ReportRecordData } from './report.model'; // Import ReportRecordData
import { CargoStatus } from '../types/report';

export const VoyageModel = {
  // Create a new voyage
  create(voyageData: CreateVoyageDTO): Voyage {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Generate voyage number (format: nn/yyyy)
    const year = new Date().getFullYear();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM voyages WHERE voyageNumber LIKE ?');
    const result = stmt.get(`%/${year}`) as { count: number };
    const voyageNumber = `${(result.count + 1).toString().padStart(2, '0')}/${year}`;
    
    const insertStmt = db.prepare(`
      INSERT INTO voyages (
        id, vesselId, voyageNumber, departurePort, destinationPort, 
        voyageDistance, startDate, status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertStmt.run(
      id,
      voyageData.vesselId,
      voyageNumber,
      voyageData.departurePort,
      voyageData.destinationPort,
      voyageData.voyageDistance,
      voyageData.startDate,
      'active' as VoyageStatus,
      now,
      now
    );
    
    return this.findById(id) as Voyage;
  },
  
  // Find voyage by ID
  findById(id: string): Voyage | null {
    const stmt = db.prepare('SELECT * FROM voyages WHERE id = ?');
    const voyage = stmt.get(id) as Voyage | undefined;
    
    return voyage || null;
  },
  
  // Find active voyage by vessel ID
  findActiveByVesselId(vesselId: string): Voyage | null {
    const stmt = db.prepare('SELECT * FROM voyages WHERE vesselId = ? AND status = ? ORDER BY createdAt DESC LIMIT 1');
    const voyage = stmt.get(vesselId, 'active') as Voyage | undefined;
    
    return voyage || null;
  },

  // Find all voyages by vessel ID
  findAllByVesselId(vesselId: string): Voyage[] {
    const stmt = db.prepare('SELECT * FROM voyages WHERE vesselId = ? ORDER BY createdAt ASC');
    const voyages = stmt.all(vesselId) as Voyage[];
    return voyages || [];
  },
  
  // Complete voyage
  completeVoyage(id: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE voyages
      SET status = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run('completed', now, id);
    return result.changes > 0;
  },
  
  // Get latest voyage number for a vessel
  getLatestVoyageNumber(vesselId: string): string | null {
    const stmt = db.prepare(`
      SELECT voyageNumber 
      FROM voyages 
      WHERE vesselId = ? 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    
    const result = stmt.get(vesselId) as { voyageNumber: string } | undefined;
    return result ? result.voyageNumber : null;
  },

  // Find the latest completed voyage for a specific vessel
  findLatestCompletedByVesselId(vesselId: string): Voyage | null {
    const stmt = db.prepare(`
      SELECT * 
      FROM voyages 
      WHERE vesselId = ? AND status = 'completed' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    const voyage = stmt.get(vesselId) as Voyage | undefined;
    return voyage || null;
  },

  // Find the latest completed voyage for a specific vessel, including its last cargo state
  findLatestCompletedWithCargoByVesselId(vesselId: string): VoyageWithCargo | null {
    const stmt = db.prepare(`
      SELECT *
      FROM voyages
      WHERE vesselId = ? AND status = 'completed'
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    const voyage = stmt.get(vesselId) as Voyage | undefined;

    if (!voyage) {
      return null;
    }

    // Get the last approved report for this completed voyage
    const lastReportData = ReportModel.getLatestApprovedReportForVoyage(voyage.id);

    if (!lastReportData) {
      // If no last report, assume no cargo carried over from this voyage
      return { ...voyage, lastCargoQuantity: 0, lastCargoStatus: 'Empty', lastCargoType: null };
    }
    
    let cargoQuantity: number = 0;
    let cargoType: string | null = null;
    let determinedCargoStatus: CargoStatus | null = 'Empty';

    if (lastReportData) {
        const lastReport = lastReportData as ReportRecordData; // Cast to access all table columns

        if (lastReport.cargoQuantity !== undefined && lastReport.cargoQuantity !== null) {
            cargoQuantity = lastReport.cargoQuantity;
        }

        if (cargoQuantity > 0) {
            determinedCargoStatus = 'Loaded'; // Default if quantity > 0
            if (lastReport.cargoStatus) { // If a specific status is on the last report, use it
                determinedCargoStatus = lastReport.cargoStatus;
            }
        } else {
            determinedCargoStatus = 'Empty';
        }
        
        if (lastReport.cargoType) {
            cargoType = lastReport.cargoType;
        } else {
            // Attempt to get from the first report of the voyage if not on the last one
            const firstReportData = ReportModel.getFirstReportForVoyage(voyage.id);
            if (firstReportData) {
                const firstReport = firstReportData as ReportRecordData;
                if (firstReport.cargoType) {
                    cargoType = firstReport.cargoType;
                }
            }
        }
    }

    return {
      ...voyage,
      lastCargoQuantity: cargoQuantity,
      lastCargoStatus: determinedCargoStatus,
      lastCargoType: cargoType,
    };
  }
};

export default VoyageModel;
