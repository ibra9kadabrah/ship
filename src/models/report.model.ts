// src/models/report.model.ts
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
// Import necessary types, including those used in ReportRecordData
import { 
    Report, 
    ReportStatus, 
    ReviewReportDTO, 
    ReportType, 
    CargoStatus, 
    CardinalDirection 
} from '../types/report'; 
// Models needed for service layer composition, not directly here anymore
// import ReportEngineUnitModel from './report_engine_unit.model'; 
// import ReportAuxEngineModel from './report_aux_engine.model';   

// Define a type for the flat data structure used for insertion by _createReportRecord
// This should align EXACTLY with the columns defined in the 'reports' table schema
type ReportRecordData = {
    id: string;
    voyageId: string;
    vesselId: string;
    reportType: ReportType;
    status: ReportStatus;
    captainId: string;
    reviewerId?: string | null; 
    reviewDate?: string | null;
    reviewComments?: string | null;
    reportDate: string;
    reportTime: string;
    timeZone: string;
    departurePort?: string | null;
    destinationPort?: string | null;
    voyageDistance?: number | null;
    etaDate?: string | null;
    etaTime?: string | null;
    fwdDraft?: number | null;
    aftDraft?: number | null;
    cargoQuantity?: number | null;
    cargoType?: string | null;
    cargoStatus?: CargoStatus | null;
    faspDate?: string | null;
    faspTime?: string | null;
    faspLatitude?: number | null;
    faspLongitude?: number | null;
    faspCourse?: number | null;
    harbourDistance?: number | null;
    harbourTime?: string | null;
    distanceSinceLastReport?: number | null;
    totalDistanceTravelled?: number | null; // Calculated field stored
    distanceToGo?: number | null; // Calculated field stored
    windDirection?: CardinalDirection | null;
    seaDirection?: CardinalDirection | null;
    swellDirection?: CardinalDirection | null;
    windForce?: number | null;
    seaState?: number | null;
    swellHeight?: number | null;
    meConsumptionLsifo?: number | null;
    meConsumptionLsmgo?: number | null;
    meConsumptionCylOil?: number | null;
    meConsumptionMeOil?: number | null;
    meConsumptionAeOil?: number | null;
    boilerConsumptionLsifo?: number | null;
    boilerConsumptionLsmgo?: number | null;
    auxConsumptionLsifo?: number | null;
    auxConsumptionLsmgo?: number | null;
    supplyLsifo?: number | null;
    supplyLsmgo?: number | null;
    supplyCylOil?: number | null;
    supplyMeOil?: number | null;
    supplyAeOil?: number | null;
    totalConsumptionLsifo?: number | null; // Calculated field stored
    totalConsumptionLsmgo?: number | null; // Calculated field stored
    totalConsumptionCylOil?: number | null; // Calculated field stored
    totalConsumptionMeOil?: number | null; // Calculated field stored
    totalConsumptionAeOil?: number | null; // Calculated field stored
    currentRobLsifo?: number | null; // Calculated field stored
    currentRobLsmgo?: number | null; // Calculated field stored
    currentRobCylOil?: number | null; // Calculated field stored
    currentRobMeOil?: number | null; // Calculated field stored
    currentRobAeOil?: number | null; // Calculated field stored
    meFoPressure?: number | null;
    meLubOilPressure?: number | null;
    meFwInletTemp?: number | null;
    meLoInletTemp?: number | null;
    meScavengeAirTemp?: number | null;
    meTcRpm1?: number | null;
    meTcRpm2?: number | null;
    meTcExhaustTempIn?: number | null;
    meTcExhaustTempOut?: number | null;
    meThrustBearingTemp?: number | null;
    meDailyRunHours?: number | null;
    // Noon Report Specific Fields (align with schema and BaseReport)
    passageState?: 'NOON' | 'SOSP' | 'ROSP' | null; // Use literal type or import PassageState
    noonDate?: string | null;
    noonTime?: string | null;
    noonLatitude?: number | null;
    noonLongitude?: number | null;
    sospDate?: string | null;
    sospTime?: string | null;
    sospLatitude?: number | null;
    sospLongitude?: number | null;
    rospDate?: string | null;
    rospTime?: string | null;
    rospLatitude?: number | null;
    rospLongitude?: number | null;
};


export const ReportModel = {

  // Private helper to insert a record into the reports table
  // Assumes 'data' contains all necessary fields, including calculated ones
  _createReportRecord(data: ReportRecordData): string {
    const id = data.id || uuidv4(); // Allow passing ID or generate new one
    const now = new Date().toISOString();

    // Dynamically build columns and placeholders based on provided data keys
    // This is more robust than hardcoding 72 placeholders
    const columns: string[] = ['id', 'createdAt', 'updatedAt'];
    const placeholders: string[] = ['?', '?', '?'];
    const values: (string | number | null)[] = [id, now, now];

    // Iterate over keys in ReportRecordData (excluding id, createdAt, updatedAt)
    for (const key in data) {
        // Type assertion needed as keys are generic strings
        const typedKey = key as keyof ReportRecordData; 
        if (typedKey !== 'id' && data[typedKey] !== undefined) {
            columns.push(typedKey);
            placeholders.push('?');
            // Use nullish coalescing to ensure null is inserted if value is undefined
            values.push(data[typedKey] ?? null); 
        }
    }

    const sql = `
      INSERT INTO reports (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    try {
        const stmt = db.prepare(sql);
        stmt.run(...values);
        return id; // Return the ID used for the insertion
    } catch (error) {
        console.error(`Error inserting report record:`, error);
        console.error(`SQL: ${sql}`);
        console.error(`Values: ${JSON.stringify(values)}`);
        throw new Error(`Failed to create report record: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

    // Find report by ID - Fetches ONLY from the 'reports' table
  // Returns Partial<Report> because related arrays are not fetched here.
  findById(id: string): Partial<Report> | null {
    const stmt = db.prepare(`SELECT * FROM reports WHERE id = ?`);
    const report = stmt.get(id) as Partial<Report> | undefined;
    return report || null;
  },

  // Get pending reports - Fetches ONLY from the 'reports' table
  // Returns array of Partial<Report> because related arrays are not fetched here.
  getPendingReports(): Partial<Report>[] {
    const stmt = db.prepare(`SELECT * FROM reports WHERE status = ? ORDER BY createdAt DESC`);
    return stmt.all('pending') as Partial<Report>[];
  },

  // Review a report (approve or reject) - Updates the 'reports' table
  reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE reports
      SET status = ?, reviewerId = ?, reviewDate = ?, reviewComments = ?, updatedAt = ?
      WHERE id = ? AND status = 'pending' -- Ensure we only review pending reports
    `);

    try {
        const result = stmt.run(
          reviewData.status,
          reviewerId,
          now,
          reviewData.reviewComments || '', // Use empty string if null/undefined
          now,
          id
        );
        return result.changes > 0; // Return true if a row was updated
    } catch (error) {
        console.error(`Error reviewing report ${id}:`, error);
        return false;
    }
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

  // Get most recent report for a voyage - Fetches ONLY from the 'reports' table
  // Returns Partial<Report> because related arrays are not fetched here.
  getLatestReportForVoyage(voyageId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(voyageId) as Partial<Report> | undefined;
    return report || null;
  },

  // Get most recent report for a specific vessel (across all voyages) - Fetches ONLY from the 'reports' table
  // Returns Partial<Report> because related arrays are not fetched here.
  getLatestReportForVessel(vesselId: string): Partial<Report> | null {
     const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(vesselId) as Partial<Report> | undefined; // Corrected cast
    return report || null;
  },

  // Get the first report for a voyage (typically the departure report)
  getFirstReportForVoyage(voyageId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate ASC, reportTime ASC, createdAt ASC
      LIMIT 1
    `);
    const report = stmt.get(voyageId) as Partial<Report> | undefined;
    return report || null;
  },

  // Helper to get all reports for a voyage (needed for getLatestReportForVoyageByType)
  _getAllReportsForVoyage(voyageId: string): Partial<Report>[] {
     const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
    `);
    return stmt.all(voyageId) as Partial<Report>[];
  },

  // Get the latest report of a specific type for a voyage
  getLatestReportForVoyageByType(voyageId: string, reportType: ReportType): Partial<Report> | null {
    const reports = this._getAllReportsForVoyage(voyageId);
    const filteredReports = reports.filter(report => report.reportType === reportType);
    // The sorting is already newest first from _getAllReportsForVoyage
    return filteredReports[0] || null;
  },

  // Get the latest APPROVED report for a voyage
  getLatestApprovedReportForVoyage(voyageId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ? AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(voyageId) as Partial<Report> | undefined;
    return report || null;
  },

  // Check if a captain has pending reports for a specific voyage
  hasPendingReportsForVoyage(captainId: string, voyageId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE captainId = ? AND voyageId = ? AND status = 'pending'
    `);
    const result = stmt.get(captainId, voyageId) as { count: number };
    return result.count > 0;
  }
};

export default ReportModel;
