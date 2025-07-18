// src/models/report.model.ts
import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import pool from '../db/connection';
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
  async _createReportRecord(data: ReportRecordData, client: PoolClient | import('pg').Pool = pool): Promise<string> {
    const id = data.id || uuidv4(); // Allow passing ID or generate new one

    const columns: string[] = ['id'];
    const placeholders: string[] = ['$1'];
    const values: (string | number | null | boolean)[] = [id];

    let placeholderIndex = 2;
    for (const key in data) {
        const typedKey = key as keyof ReportRecordData; 
        if (typedKey !== 'id' && data[typedKey] !== undefined) {
            columns.push(typedKey);
            placeholders.push(`$${placeholderIndex++}`);
            values.push(data[typedKey] ?? null); 
        }
    }

    const sql = `
      INSERT INTO reports (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    try {
        await client.query(sql, values);
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
  async findById(id: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Get pending reports - Joins with vessels and users to get names
  // Returns array of Partial<Report> enhanced with vesselName and captainName
  async getPendingReports(vesselId?: string, client: PoolClient | import('pg').Pool = pool): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
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
    const params: any[] = [];

    if (vesselId) {
      sql += ` AND r.vesselId = $1`;
      params.push(vesselId);
    }

    sql += ` ORDER BY r.createdAt DESC`;
    
    const res = await client.query(sql, params);
    return res.rows as (Partial<Report> & { vesselName?: string; captainName?: string })[];
  },

  // Review a report (approve or reject) - Updates the 'reports' table
  async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    let sql = `UPDATE reports SET status = $1, reviewerId = $2, reviewDate = NOW(), reviewComments = $3, updatedAt = NOW()`;
    const params: any[] = [
      reviewData.status,
      reviewerId,
      reviewData.reviewComments || null,
    ];
    let placeholderIndex = 4;

    if (reviewData.status === 'changes_requested') {
      sql += `, modification_checklist = $${placeholderIndex++}, requested_changes_comment = $${placeholderIndex++}`;
      params.push(reviewData.modification_checklist ? JSON.stringify(reviewData.modification_checklist) : null);
      params.push(reviewData.requested_changes_comment || null);
    } else {
      sql += `, modification_checklist = NULL, requested_changes_comment = NULL`;
    }

    sql += ` WHERE id = $${placeholderIndex++} AND status = 'pending'`;
    params.push(id);

    try {
        const res = await client.query(sql, params);
        return res.rowCount! > 0;
    } catch (error) {
        console.error(`Error reviewing report ${id}:`, error);
        console.error("SQL:", sql);
        console.error("Params:", params);
        return false;
    }
  },

  // Check if captain has pending reports for a vessel
  async hasPendingReports(captainId: string, vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const res = await client.query(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE captainId = $1 AND vesselId = $2 AND status = 'pending'
    `, [captainId, vesselId]);
    return (res.rows[0].count as number) > 0;
  },

  // Get most recent report for a voyage - Fetches ONLY from the 'reports' table
  // Returns Partial<Report> because related arrays are not fetched here.
  async getLatestReportForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE voyageId = $1
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Get most recent report for a specific vessel (across all voyages) - Fetches ONLY from the 'reports' table
  // Returns Partial<Report> because related arrays are not fetched here.
  async getLatestReportForVessel(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
     const res = await client.query(`
      SELECT * FROM reports
      WHERE vesselId = $1
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [vesselId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Get latest *approved* report for a vessel (needed for voyage state check)
  async getLatestApprovedReportForVessel(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE vesselId = $1 AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [vesselId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Find the report immediately preceding a given report ID for the same vessel
  async findPreviousReport(reportId: string, vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    // First get the timestamp of the current report
    const currentReport = await this.findById(reportId, client);
    if (!currentReport || !currentReport.createdAt) {
        console.warn(`Could not find current report ${reportId} or its createdAt timestamp to find previous report.`);
        return null;
    }
    const currentTimestamp = currentReport.createdAt;

    const res = await client.query(`
      SELECT * FROM reports
      WHERE vesselId = $1 AND createdAt < $2
      ORDER BY createdAt DESC
      LIMIT 1
    `, [vesselId, currentTimestamp]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Get latest *approved* report for a voyage
  async getLatestApprovedReportForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE voyageId = $1 AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Get the first report for a voyage (typically the departure report)
  async getFirstReportForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE voyageId = $1
      ORDER BY reportDate ASC, reportTime ASC, createdAt ASC
      LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Helper to get all reports for a voyage (needed for getLatestReportForVoyageByType)
  async _getAllReportsForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report>[]> {
     const res = await client.query(`
      SELECT * FROM reports
      WHERE voyageId = $1
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
    `, [voyageId]);
    return res.rows as Partial<Report>[];
  },

  // Get the latest report of a specific type for a voyage
  async getLatestReportForVoyageByType(voyageId: string, reportType: ReportType, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const reports = await this._getAllReportsForVoyage(voyageId, client);
    const filteredReports = reports.filter(report => report.reportType === reportType);
    return filteredReports[0] || null; 
  },

  // Get the latest Noon report for a voyage (needed for SOSP/ROSP logic)
  async getLatestNoonReportForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE voyageId = $1 AND reportType = 'noon'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Check if a captain has pending reports for a specific voyage
  async hasPendingReportsForVoyage(captainId: string, voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const res = await client.query(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE captainId = $1 AND voyageId = $2 AND status = 'pending'
    `, [captainId, voyageId]);
    return (res.rows[0].count as number) > 0;
  },

  // Update the voyageId for a specific report
  async updateVoyageId(reportId: string, voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    try {
      const res = await client.query(`
        UPDATE reports
        SET voyageId = $1
        WHERE id = $2
      `, [voyageId, reportId]);
      console.log(`Linking report ${reportId} to voyage ${voyageId}. Changes: ${res.rowCount}`);
      return res.rowCount! > 0;
    } catch (error) {
      console.error(`Error updating voyageId for report ${reportId}:`, error);
      return false;
    }
  },

  // Find all reports submitted by a specific captain
  async findByCaptainId(captainId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report>[]> {
    const res = await client.query(`
      SELECT * FROM reports
      WHERE captainId = $1
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
    `, [captainId]);
    return res.rows as Partial<Report>[];
  },

  // Find all reports (for admin/office history) - Joins with vessels and users
  async findAll(vesselId?: string, client: PoolClient | import('pg').Pool = pool): Promise<(Partial<Report> & { vesselName?: string; captainName?: string })[]> {
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
      sql += ` AND r.vesselId = $1`;
      params.push(vesselId);
    }

    sql += ` ORDER BY r.reportDate DESC, r.reportTime DESC, r.createdAt DESC`;

    const res = await client.query(sql, params);
    return res.rows as (Partial<Report> & { vesselName?: string; captainName?: string })[];
  },

  // Find the latest approved departure report for a specific vessel
  async findLatestApprovedDepartureReport(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT * 
      FROM reports 
      WHERE vesselId = $1 AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
      LIMIT 1
    `, [vesselId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Find the latest approved departure report for a specific voyage
  async findLatestApprovedDepartureReportForVoyage(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT *
      FROM reports
      WHERE voyageId = $1 AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Find approved departure report for a specific voyage
  async findApprovedDepartureReportByVoyageId(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Report | null> {
    const res = await client.query(`
        SELECT * FROM reports
        WHERE voyageId = $1 AND reportType = 'departure' AND status = 'approved'
        ORDER BY createdAt DESC
        LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Report) || null;
  },

  // Find pending departure report for a specific voyage
  async findPendingDepartureReportByVoyageId(voyageId: string, client: PoolClient | import('pg').Pool = pool): Promise<Report | null> {
    const res = await client.query(`
        SELECT * FROM reports
        WHERE voyageId = $1 AND reportType = 'departure' AND status IN ('pending', 'changes_requested')
        ORDER BY createdAt DESC
        LIMIT 1
    `, [voyageId]);
    return (res.rows[0] as Report) || null;
  },

  // Get latest *approved* 'Arrival' or 'Berth' report for a vessel
  async getLatestApprovedArrivalOrBerthReport(vesselId: string, client: PoolClient | import('pg').Pool = pool): Promise<Partial<Report> | null> {
    const res = await client.query(`
      SELECT *
      FROM reports
      WHERE vesselId = $1
        AND status = 'approved'
        AND reportType IN ('arrival', 'berth')
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `, [vesselId]);
    return (res.rows[0] as Partial<Report>) || null;
  },

  // Update an existing report
  async update(id: string, data: Partial<ReportRecordData>, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const updateData = { ...data };

    const DYNAMIC_FIELDS = [
        'reportDate', 'reportTime', 'timeZone', 'status', 'reviewerId', 'reviewDate', 'reviewComments',
        'modification_checklist', 'requested_changes_comment',
        'departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime',
        'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
        'faspDate', 'faspTime', 'faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir', 'faspCourse',
        'harbourDistance', 'harbourTime', 'distanceSinceLastReport', 'totalDistanceTravelled', 'distanceToGo',
        'windDirection', 'seaDirection', 'swellDirection', 'windForce', 'seaState', 'swellHeight',
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil',
        'currentRobLsifo', 'currentRobLsmgo', 'currentRobCylOil', 'currentRobMeOil', 'currentRobAeOil',
        'initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
        'mePresentRpm', 'meCurrentSpeed',
        'sailingTimeVoyage', 'avgSpeedVoyage',
        'passageState', 'noonDate', 'noonTime', 'noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse',
        'sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse',
        'rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse',
        'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir', 'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse',
        'estimatedBerthingDate', 'estimatedBerthingTime',
        'berthDate', 'berthTime', 'berthLatDeg', 'berthLatMin', 'berthLatDir', 'berthLonDeg', 'berthLonMin', 'berthLonDir',
        'cargoLoaded', 'cargoUnloaded', 'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime', 'berthNumber',
        'voyageId'
    ];

    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];
    let placeholderIndex = 1;

    for (const key of DYNAMIC_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
            setClauses.push(`${key} = $${placeholderIndex++}`);
            params.push(updateData[key as keyof typeof updateData] ?? null);
        }
    }
    
    setClauses.push(`updatedAt = NOW()`);

    if (setClauses.length === 1) {
      console.warn(`ReportModel.update called for report ${id} with no data fields to update.`);
      return true;
    }

    params.push(id);

    const sql = `UPDATE reports SET ${setClauses.join(', ')} WHERE id = $${placeholderIndex++}`;
    
    try {
      const res = await client.query(sql, params);
      return res.rowCount! > 0;
    } catch (error) {
      console.error(`Error updating report ${id}:`, error);
      console.error("SQL:", sql);
      console.error("Params:", params);
      return false;
    }
  },
};

export default ReportModel;
