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
export type ReportRecordData = { // Added export
    id: string;
    voyageId: string | null; // Allow null
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
    faspLatDeg?: number | null;
    faspLatMin?: number | null;
    faspLatDir?: 'N' | 'S' | null;
    faspLonDeg?: number | null;
    faspLonMin?: number | null;
    faspLonDir?: 'E' | 'W' | null;
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
    mePresentRpm?: number | null; // Added Present RPM
    meCurrentSpeed?: number | null; // Added Current Speed
    // Calculated Performance Metrics
    sailingTimeVoyage?: number | null;
    avgSpeedVoyage?: number | null;
    // Noon Report Specific Fields (align with schema and BaseReport)
    passageState?: 'NOON' | 'SOSP' | 'ROSP' | null; // Use literal type or import PassageState
    noonDate?: string | null;
    noonTime?: string | null;
    noonLatDeg?: number | null;
    noonLatMin?: number | null;
    noonLatDir?: 'N' | 'S' | null;
    noonLonDeg?: number | null;
    noonLonMin?: number | null;
    noonLonDir?: 'E' | 'W' | null;
    noonCourse?: number | null; // Added noonCourse
    sospDate?: string | null;
    sospTime?: string | null;
    sospLatDeg?: number | null;
    sospLatMin?: number | null;
    sospLatDir?: 'N' | 'S' | null;
    sospLonDeg?: number | null;
    sospLonMin?: number | null;
    sospLonDir?: 'E' | 'W' | null;
    sospCourse?: number | null; // Added sospCourse
    rospDate?: string | null;
    rospTime?: string | null;
    rospLatDeg?: number | null;
    rospLatMin?: number | null;
    rospLatDir?: 'N' | 'S' | null;
    rospLonDeg?: number | null;
    rospLonMin?: number | null;
    rospLonDir?: 'E' | 'W' | null;
    rospCourse?: number | null; // Added rospCourse
    // Arrival Report Specific Fields
    eospDate?: string | null;
    eospTime?: string | null;
    eospLatDeg?: number | null;
    eospLatMin?: number | null;
    eospLatDir?: 'N' | 'S' | null;
    eospLonDeg?: number | null;
    eospLonMin?: number | null;
    eospLonDir?: 'E' | 'W' | null;
    eospCourse?: number | null;
    estimatedBerthingDate?: string | null;
    estimatedBerthingTime?: string | null;
    // Berth Report Specific Fields
    berthDate?: string | null;
    berthTime?: string | null;
    berthLatDeg?: number | null;
    berthLatMin?: number | null;
    berthLatDir?: 'N' | 'S' | null;
    berthLonDeg?: number | null;
    berthLonMin?: number | null;
    berthLonDir?: 'E' | 'W' | null;
    cargoLoaded?: number | null;
    cargoUnloaded?: number | null;
    cargoOpsStartDate?: string | null;
    cargoOpsStartTime?: string | null;
    cargoOpsEndDate?: string | null;
    cargoOpsEndTime?: string | null;
    berthNumber?: string | null; // Added Berth Number
    // Timestamps (already handled by _createReportRecord)
    // createdAt: string;
    // updatedAt: string;
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

  // Get pending reports - Joins with vessels and users to get names
  // Returns array of Partial<Report> enhanced with vesselName and captainName
  getPendingReports(vesselId?: string): (Partial<Report> & { vesselName?: string; captainName?: string })[] {
    let sql = `
      SELECT 
        r.*, 
        v.name AS vesselName, 
        u.name AS captainName 
      FROM reports r
      LEFT JOIN vessels v ON r.vesselId = v.id
      LEFT JOIN users u ON r.captainId = u.id
      WHERE r.status IN ('pending', 'changes_requested')
    `;
    const params: any[] = []; // No longer need 'pending' here as it's in the IN clause

    if (vesselId) {
      sql += ` AND r.vesselId = ?`;
      params.push(vesselId);
    }

    sql += ` ORDER BY r.createdAt DESC`;
    
    const stmt = db.prepare(sql);
    // Cast the result to include the joined names
    return stmt.all(...params) as (Partial<Report> & { vesselName?: string; captainName?: string })[];
  },

  // Review a report (approve or reject) - Updates the 'reports' table
  reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): boolean {
    const now = new Date().toISOString();
    
    let sql = `UPDATE reports SET status = ?, reviewerId = ?, reviewDate = ?, reviewComments = ?, updatedAt = ?`;
    const params: any[] = [
      reviewData.status,
      reviewerId,
      now,
      reviewData.reviewComments || null, // Store null if empty/undefined
      now
    ];

    if (reviewData.status === 'changes_requested') {
      sql += `, modification_checklist = ?, requested_changes_comment = ?`;
      // Assuming modification_checklist is an array of strings, store as JSON
      params.push(reviewData.modification_checklist ? JSON.stringify(reviewData.modification_checklist) : null);
      params.push(reviewData.requested_changes_comment || null);
    } else {
      // If not 'changes_requested', ensure these fields are cleared (or set to null)
      // This is important if a report was previously 'changes_requested' and is now being approved/rejected.
      sql += `, modification_checklist = NULL, requested_changes_comment = NULL`;
    }

    sql += ` WHERE id = ? AND status = 'pending'`; // Ensure we only review pending reports
    params.push(id);

    const stmt = db.prepare(sql);

    try {
        const result = stmt.run(...params);
        return result.changes > 0; // Return true if a row was updated
    } catch (error) {
        console.error(`Error reviewing report ${id}:`, error);
        console.error("SQL:", sql);
        console.error("Params:", params);
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

  // Get latest *approved* report for a vessel (needed for voyage state check)
  getLatestApprovedReportForVessel(vesselId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ? AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(vesselId) as Partial<Report> | undefined;
    return report || null;
  },

  // Find the report immediately preceding a given report ID for the same vessel
  findPreviousReport(reportId: string, vesselId: string): Partial<Report> | null {
    // First get the timestamp of the current report
    const currentReport = this.findById(reportId);
    if (!currentReport || !currentReport.createdAt) {
        console.warn(`Could not find current report ${reportId} or its createdAt timestamp to find previous report.`);
        return null;
    }
    const currentTimestamp = currentReport.createdAt; // Use ISO string for comparison

    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ? AND createdAt < ?
      ORDER BY createdAt DESC -- Order by newest first among those older than current
      LIMIT 1
    `);
    const report = stmt.get(vesselId, currentTimestamp) as Partial<Report> | undefined;
    return report || null;
  },

  // Get latest *approved* report for a voyage
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

  // Get the latest Noon report for a voyage (needed for SOSP/ROSP logic)
  getLatestNoonReportForVoyage(voyageId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ? AND reportType = 'noon'
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
  },

  // Update the voyageId for a specific report
  updateVoyageId(reportId: string, voyageId: string): boolean {
    const stmt = db.prepare(`
      UPDATE reports
      SET voyageId = ?
      WHERE id = ?
    `);
    try {
      const result = stmt.run(voyageId, reportId);
      console.log(`Linking report ${reportId} to voyage ${voyageId}. Changes: ${result.changes}`); // Added logging
      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating voyageId for report ${reportId}:`, error);
      return false;
    }
  },

  // Find all reports submitted by a specific captain
  findByCaptainId(captainId: string): Partial<Report>[] {
    const stmt = db.prepare(`
      SELECT * FROM reports
      WHERE captainId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
    `);
    return stmt.all(captainId) as Partial<Report>[];
  },

  // Find all reports (for admin/office history) - Joins with vessels and users
  findAll(vesselId?: string): (Partial<Report> & { vesselName?: string; captainName?: string })[] {
    // TODO: Add pagination (LIMIT/OFFSET) and filtering later
    let sql = `
      SELECT 
        r.*, 
        v.name AS vesselName, 
        u.name AS captainName 
      FROM reports r
      LEFT JOIN vessels v ON r.vesselId = v.id
      LEFT JOIN users u ON r.captainId = u.id
      WHERE r.status = 'approved'
    `;
    const params: any[] = [];

    if (vesselId) {
      sql += ` AND r.vesselId = ?`;
      params.push(vesselId);
    }

    sql += ` ORDER BY r.reportDate DESC, r.reportTime DESC, r.createdAt DESC`;

    const stmt = db.prepare(sql);
    // Cast the result to include the joined names
    return stmt.all(...params) as (Partial<Report> & { vesselName?: string; captainName?: string })[];
  },

  // Find the latest approved departure report for a specific vessel
  findLatestApprovedDepartureReport(vesselId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT * 
      FROM reports 
      WHERE vesselId = ? AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
      LIMIT 1
    `);
    const report = stmt.get(vesselId) as Partial<Report> | undefined;
    return report || null;
  },

  // Find the latest approved departure report for a specific voyage
  findLatestApprovedDepartureReportForVoyage(voyageId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT *
      FROM reports
      WHERE voyageId = ? AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(voyageId) as Partial<Report> | undefined;
    return report || null;
  },

  // Get latest *approved* 'Arrival' or 'Berth' report for a vessel
  getLatestApprovedArrivalOrBerthReport(vesselId: string): Partial<Report> | null {
    const stmt = db.prepare(`
      SELECT *
      FROM reports
      WHERE vesselId = ?
        AND status = 'approved'
        AND reportType IN ('arrival', 'berth')
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
    const report = stmt.get(vesselId) as Partial<Report> | undefined;
    return report || null;
  },

  // Update an existing report
  update(id: string, data: Partial<ReportRecordData>): boolean {
    console.log(`[Model.update] Called for reportId: ${id}`);
    console.log(`[Model.update] Incoming 'data' payload:`, JSON.stringify(data, null, 2));
    const now = new Date().toISOString();
    const updateData = { ...data, updatedAt: now }; // This is the object whose properties will be checked
    console.log(`[Model.update] 'updateData' (data + new updatedAt) for SQL generation:`, JSON.stringify(updateData, null, 2));

    const DYNAMIC_FIELDS = [
        // General Info
        'reportDate', 'reportTime', 'timeZone', 'status', 'reviewerId', 'reviewDate', 'reviewComments',
        'modification_checklist', 'requested_changes_comment',
        // Voyage Details
        'departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime',
        // Drafts & Cargo
        'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
        // FASP
        'faspDate', 'faspTime', 'faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir', 'faspCourse',
        // Distance
        'harbourDistance', 'harbourTime', 'distanceSinceLastReport', 'totalDistanceTravelled', 'distanceToGo',
        // Weather
        'windDirection', 'seaDirection', 'swellDirection', 'windForce', 'seaState', 'swellHeight',
        // Bunker Consumptions
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        // Bunker Supplies
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        // Calculated Bunkers
        'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil',
        'currentRobLsifo', 'currentRobLsmgo', 'currentRobCylOil', 'currentRobMeOil', 'currentRobAeOil',
        // Initial ROBs (should generally not be updated after first submission, but included for completeness if needed)
        'initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil',
        // Machinery ME Params
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
        'mePresentRpm', 'meCurrentSpeed',
        // Performance Metrics
        'sailingTimeVoyage', 'avgSpeedVoyage',
        // Noon Report Specific
        'passageState', 'noonDate', 'noonTime', 'noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse',
        'sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse',
        'rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse',
        // Arrival Report Specific
        'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir', 'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse',
        'estimatedBerthingDate', 'estimatedBerthingTime',
        // Berth Report Specific
        'berthDate', 'berthTime', 'berthLatDeg', 'berthLatMin', 'berthLatDir', 'berthLonDeg', 'berthLonMin', 'berthLonDir',
        'cargoLoaded', 'cargoUnloaded', 'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime', 'berthNumber',
        // voyageId can also be updated (e.g., when linking a departure report)
        'voyageId'
    ];

    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    for (const key of DYNAMIC_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
            setClauses.push(`${key} = ?`);
            params.push(updateData[key as keyof typeof updateData] ?? null);
        }
    }
    
    // Always update 'updatedAt'
    setClauses.push('updatedAt = ?');
    params.push(now);

    if (setClauses.length === 1) { // Only updatedAt is being set
      console.warn(`ReportModel.update called for report ${id} with no data fields to update.`);
      return true; // Or false, depending on desired behavior for no-op updates
    }

    params.push(id); // For WHERE id = ?

    const sql = `UPDATE reports SET ${setClauses.join(', ')} WHERE id = ?`;
    console.log(`[Model.update] Generated SQL: ${sql}`);
    console.log(`[Model.update] SQL Params:`, JSON.stringify(params, null, 2));
    
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating report ${id}:`, error);
      console.error("SQL:", sql);
      console.error("Params:", params);
      return false;
    }
  },
};

export default ReportModel;
