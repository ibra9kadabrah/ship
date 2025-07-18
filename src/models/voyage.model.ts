// src/models/voyage.model.ts
import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import pool from '../db/connection';
import { Voyage, CreateVoyageDTO, VoyageStatus, VoyageWithCargo } from '../types/voyage';
import ReportModel, { ReportRecordData } from './report.model'; // Import ReportRecordData
import { CargoStatus } from '../types/report';

export const VoyageModel = {
  // Create a new voyage
  async create(voyageData: CreateVoyageDTO, client: PoolClient | import('pg').Pool = pool): Promise<Voyage> {
    const id = uuidv4();
    
    // Generate voyage number (format: nn/yyyy)
    const year = new Date().getFullYear();
    const res = await client.query("SELECT COUNT(*) as count FROM voyages WHERE voyageNumber LIKE $1", [`%/${year}`]);
    const voyageNumber = `${(parseInt(res.rows[0].count, 10) + 1).toString().padStart(2, '0')}/${year}`;
    
    await client.query(
      `INSERT INTO voyages (id, vesselId, voyageNumber, departurePort, destinationPort, voyageDistance, startDate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [id, voyageData.vesselId, voyageNumber, voyageData.departurePort, voyageData.destinationPort, voyageData.voyageDistance, voyageData.startDate]
    );
    
    return (await this.findById(id, client)) as Voyage;
  },
  
  // Find voyage by ID
  async findById(id: string, client: PoolClient | import('pg').Pool = pool): Promise<Voyage | null> {
    const res = await client.query('SELECT * FROM voyages WHERE id = $1', [id]);
    return (res.rows[0] as Voyage) || null;
  },
  
  // Find active voyage by vessel ID
  async findActiveByVesselId(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Voyage | null> {
    const res = await client.query('SELECT * FROM voyages WHERE vesselId = $1 AND status = $2 ORDER BY createdAt DESC LIMIT 1', [vesselId, 'active']);
    return (res.rows[0] as Voyage) || null;
  },

  // Find all voyages by vessel ID
  async findAllByVesselId(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Voyage[]> {
    const res = await client.query('SELECT * FROM voyages WHERE vesselId = $1 ORDER BY createdAt ASC', [vesselId]);
    return res.rows as Voyage[];
  },
  
  // Complete voyage
  async completeVoyage(id: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const res = await client.query("UPDATE voyages SET status = 'completed', updatedAt = NOW() WHERE id = $1", [id]);
    return res.rowCount! > 0;
  },
  
  // Get latest voyage number for a vessel
  async getLatestVoyageNumber(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<string | null> {
    const res = await client.query('SELECT voyageNumber FROM voyages WHERE vesselId = $1 ORDER BY createdAt DESC LIMIT 1', [vesselId]);
    return res.rows[0] ? res.rows[0].voyageNumber : null;
  },

  // Find the latest completed voyage for a specific vessel
  async findLatestCompletedByVesselId(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Voyage | null> {
    const res = await client.query("SELECT * FROM voyages WHERE vesselId = $1 AND status = 'completed' ORDER BY createdAt DESC LIMIT 1", [vesselId]);
    return (res.rows[0] as Voyage) || null;
  },

  // Find the latest completed voyage for a specific vessel, including its last cargo state
  async findLatestCompletedWithCargoByVesselId(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<VoyageWithCargo | null> {
    const voyageRes = await client.query("SELECT * FROM voyages WHERE vesselId = $1 AND status = 'completed' ORDER BY createdAt DESC LIMIT 1", [vesselId]);
    const voyage = voyageRes.rows[0] as Voyage | undefined;

    if (!voyage) {
      return null;
    }

    // Get the last approved report for this completed voyage
    const lastReportData = await ReportModel.getLatestApprovedReportForVoyage(voyage.id, client);

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
            const firstReportData = await ReportModel.getFirstReportForVoyage(voyage.id, client);
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
