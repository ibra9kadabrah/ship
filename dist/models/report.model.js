"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportModel = void 0;
// src/models/report.model.ts
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
exports.ReportModel = {
    // Private helper to insert a record into the reports table
    // Assumes 'data' contains all necessary fields, including calculated ones
    _createReportRecord(data) {
        const id = data.id || (0, uuid_1.v4)(); // Allow passing ID or generate new one
        const now = new Date().toISOString();
        // Dynamically build columns and placeholders based on provided data keys
        // This is more robust than hardcoding 72 placeholders
        const columns = ['id', 'createdAt', 'updatedAt'];
        const placeholders = ['?', '?', '?'];
        const values = [id, now, now];
        // Iterate over keys in ReportRecordData (excluding id, createdAt, updatedAt)
        for (const key in data) {
            // Type assertion needed as keys are generic strings
            const typedKey = key;
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
            const stmt = connection_1.default.prepare(sql);
            stmt.run(...values);
            return id; // Return the ID used for the insertion
        }
        catch (error) {
            console.error(`Error inserting report record:`, error);
            console.error(`SQL: ${sql}`);
            console.error(`Values: ${JSON.stringify(values)}`);
            throw new Error(`Failed to create report record: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
    // Find report by ID - Fetches ONLY from the 'reports' table
    // Returns Partial<Report> because related arrays are not fetched here.
    findById(id) {
        const stmt = connection_1.default.prepare(`SELECT * FROM reports WHERE id = ?`);
        const report = stmt.get(id);
        return report || null;
    },
    // Get pending reports - Joins with vessels and users to get names
    // Returns array of Partial<Report> enhanced with vesselName and captainName
    getPendingReports(vesselId) {
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
        const params = []; // No longer need 'pending' here as it's in the IN clause
        if (vesselId) {
            sql += ` AND r.vesselId = ?`;
            params.push(vesselId);
        }
        sql += ` ORDER BY r.createdAt DESC`;
        const stmt = connection_1.default.prepare(sql);
        // Cast the result to include the joined names
        return stmt.all(...params);
    },
    // Review a report (approve or reject) - Updates the 'reports' table
    reviewReport(id, reviewData, reviewerId) {
        const now = new Date().toISOString();
        let sql = `UPDATE reports SET status = ?, reviewerId = ?, reviewDate = ?, reviewComments = ?, updatedAt = ?`;
        const params = [
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
        }
        else {
            // If not 'changes_requested', ensure these fields are cleared (or set to null)
            // This is important if a report was previously 'changes_requested' and is now being approved/rejected.
            sql += `, modification_checklist = NULL, requested_changes_comment = NULL`;
        }
        sql += ` WHERE id = ? AND status = 'pending'`; // Ensure we only review pending reports
        params.push(id);
        const stmt = connection_1.default.prepare(sql);
        try {
            const result = stmt.run(...params);
            return result.changes > 0; // Return true if a row was updated
        }
        catch (error) {
            console.error(`Error reviewing report ${id}:`, error);
            console.error("SQL:", sql);
            console.error("Params:", params);
            return false;
        }
    },
    // Check if captain has pending reports for a vessel
    hasPendingReports(captainId, vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE captainId = ? AND vesselId = ? AND status = ?
    `);
        const result = stmt.get(captainId, vesselId, 'pending');
        return result.count > 0;
    },
    // Get most recent report for a voyage - Fetches ONLY from the 'reports' table
    // Returns Partial<Report> because related arrays are not fetched here.
    getLatestReportForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Get most recent report for a specific vessel (across all voyages) - Fetches ONLY from the 'reports' table
    // Returns Partial<Report> because related arrays are not fetched here.
    getLatestReportForVessel(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(vesselId); // Corrected cast
        return report || null;
    },
    // Get latest *approved* report for a vessel (needed for voyage state check)
    getLatestApprovedReportForVessel(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ? AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(vesselId);
        return report || null;
    },
    // Find the report immediately preceding a given report ID for the same vessel
    findPreviousReport(reportId, vesselId) {
        // First get the timestamp of the current report
        const currentReport = this.findById(reportId);
        if (!currentReport || !currentReport.createdAt) {
            console.warn(`Could not find current report ${reportId} or its createdAt timestamp to find previous report.`);
            return null;
        }
        const currentTimestamp = currentReport.createdAt; // Use ISO string for comparison
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE vesselId = ? AND createdAt < ?
      ORDER BY createdAt DESC -- Order by newest first among those older than current
      LIMIT 1
    `);
        const report = stmt.get(vesselId, currentTimestamp);
        return report || null;
    },
    // Get latest *approved* report for a voyage
    getLatestApprovedReportForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ? AND status = 'approved'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Get the first report for a voyage (typically the departure report)
    getFirstReportForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate ASC, reportTime ASC, createdAt ASC
      LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Helper to get all reports for a voyage (needed for getLatestReportForVoyageByType)
    _getAllReportsForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
    `);
        return stmt.all(voyageId);
    },
    // Get the latest report of a specific type for a voyage
    getLatestReportForVoyageByType(voyageId, reportType) {
        const reports = this._getAllReportsForVoyage(voyageId);
        const filteredReports = reports.filter(report => report.reportType === reportType);
        // The sorting is already newest first from _getAllReportsForVoyage
        return filteredReports[0] || null;
    },
    // Get the latest Noon report for a voyage (needed for SOSP/ROSP logic)
    getLatestNoonReportForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE voyageId = ? AND reportType = 'noon'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Check if a captain has pending reports for a specific voyage
    hasPendingReportsForVoyage(captainId, voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE captainId = ? AND voyageId = ? AND status = 'pending'
    `);
        const result = stmt.get(captainId, voyageId);
        return result.count > 0;
    },
    // Update the voyageId for a specific report
    updateVoyageId(reportId, voyageId) {
        const stmt = connection_1.default.prepare(`
      UPDATE reports
      SET voyageId = ?
      WHERE id = ?
    `);
        try {
            const result = stmt.run(voyageId, reportId);
            console.log(`Linking report ${reportId} to voyage ${voyageId}. Changes: ${result.changes}`); // Added logging
            return result.changes > 0;
        }
        catch (error) {
            console.error(`Error updating voyageId for report ${reportId}:`, error);
            return false;
        }
    },
    // Find all reports submitted by a specific captain
    findByCaptainId(captainId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM reports
      WHERE captainId = ?
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
    `);
        return stmt.all(captainId);
    },
    // Find all reports (for admin/office history) - Joins with vessels and users
    findAll(vesselId) {
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
        const params = [];
        if (vesselId) {
            sql += ` AND r.vesselId = ?`;
            params.push(vesselId);
        }
        sql += ` ORDER BY r.reportDate DESC, r.reportTime DESC, r.createdAt DESC`;
        const stmt = connection_1.default.prepare(sql);
        // Cast the result to include the joined names
        return stmt.all(...params);
    },
    // Find the latest approved departure report for a specific vessel
    findLatestApprovedDepartureReport(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT * 
      FROM reports 
      WHERE vesselId = ? AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC 
      LIMIT 1
    `);
        const report = stmt.get(vesselId);
        return report || null;
    },
    // Find the latest approved departure report for a specific voyage
    findLatestApprovedDepartureReportForVoyage(voyageId) {
        const stmt = connection_1.default.prepare(`
      SELECT *
      FROM reports
      WHERE voyageId = ? AND status = 'approved' AND reportType = 'departure'
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Find approved departure report for a specific voyage
    findApprovedDepartureReportByVoyageId(voyageId) {
        const stmt = connection_1.default.prepare(`
        SELECT * FROM reports
        WHERE voyageId = ? AND reportType = 'departure' AND status = 'approved'
        ORDER BY createdAt DESC
        LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Find pending departure report for a specific voyage
    findPendingDepartureReportByVoyageId(voyageId) {
        const stmt = connection_1.default.prepare(`
        SELECT * FROM reports
        WHERE voyageId = ? AND reportType = 'departure' AND status IN ('pending', 'changes_requested')
        ORDER BY createdAt DESC
        LIMIT 1
    `);
        const report = stmt.get(voyageId);
        return report || null;
    },
    // Get latest *approved* 'Arrival' or 'Berth' report for a vessel
    getLatestApprovedArrivalOrBerthReport(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT *
      FROM reports
      WHERE vesselId = ?
        AND status = 'approved'
        AND reportType IN ('arrival', 'berth')
      ORDER BY reportDate DESC, reportTime DESC, createdAt DESC
      LIMIT 1
    `);
        const report = stmt.get(vesselId);
        return report || null;
    },
    // Update an existing report
    update(id, data) {
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
        const setClauses = [];
        const params = [];
        for (const key of DYNAMIC_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(updateData, key)) {
                setClauses.push(`${key} = ?`);
                params.push(updateData[key] ?? null);
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
            const stmt = connection_1.default.prepare(sql);
            const result = stmt.run(...params);
            return result.changes > 0;
        }
        catch (error) {
            console.error(`Error updating report ${id}:`, error);
            console.error("SQL:", sql);
            console.error("Params:", params);
            return false;
        }
    },
};
exports.default = exports.ReportModel;
